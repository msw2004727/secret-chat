// Room-scoped helpers. All plaintext and caches remain in memory and are reset on exit.
export class MessagePresence {
  constructor(listen, removed) {
    this.listen = listen;
    this.removed = removed;
    this.watches = new Map();
    this.active = true;
  }
  watch(key) {
    if (!this.active || this.watches.has(key)) return;
    const entry = { off: null };
    this.watches.set(key, entry);
    entry.off = this.listen(key, exists => {
      if (!this.active || this.watches.get(key) !== entry || exists) return;
      this.forget(key);
      this.removed(key);
    });
    // Also handle a synchronous initial callback in offline tests/local cache.
    if (this.watches.get(key) !== entry) entry.off();
  }
  forget(key) {
    const entry = this.watches.get(key);
    this.watches.delete(key);
    entry?.off?.();
  }
  clear() { for (const key of this.watches.keys()) this.forget(key); }
  close() { this.active = false; this.clear(); }
}

export class NoteFeed {
  constructor({ listen, decode, changed, failed = () => {} }) {
    Object.assign(this, { listen, decode, changed, failed });
    this.cache = new Map();
    this.off = null;
    this.active = false;
    this.revision = 0;
  }
  open() {
    if (this.active) return;
    this.active = true;
    this.off = this.listen(raw => this.receive(raw), error => this.failed(error));
  }
  async receive(raw) {
    const revision = ++this.revision;
    const out = [];
    const next = new Map();
    for (const [key, value] of Object.entries(raw || {})) {
      if (!value?.iv || !value?.c) continue;
      if (!this.active || revision !== this.revision) return;
      const old = this.cache.get(key);
      let note;
      if (old && old.iv === value.iv && old.c === value.c && old.t === value.t) note = old.note;
      else note = await this.decode(key, value);
      if (!this.active || revision !== this.revision) return;
      next.set(key, { iv: value.iv, c: value.c, t: value.t, note });
      out.push(note);
    }
    if (!this.active || revision !== this.revision) return;
    this.cache = next;
    out.sort((a, b) => b.t - a.t);
    this.changed(out);
  }
  close() {
    this.active = false;
    this.revision++;
    this.off?.(); this.off = null;
  }
  reset() { this.close(); this.cache.clear(); }
}

// Keep row placeholders for anchors/quotes/read receipts, release distant bubble DOM/images.
export class BubbleWindow {
  constructor({ root, makeRow, beforeHide, afterShow, observer = globalThis.IntersectionObserver }) {
    Object.assign(this, { makeRow, beforeHide, afterShow });
    this.rows = new Map();
    this.io = observer ? new observer(entries => {
      for (const entry of entries) {
        const item = this.rows.get(entry.target.dataset.k);
        if (!item || item.row !== entry.target) continue;
        if (item.restore) {
          this.afterShow(item.row, item.saved);
          item.saved = null;
          item.restore = false;
        }
        item.near = entry.isIntersecting;
        if (item.near) this.show(item); else this.hide(item);
      }
    }, { root, rootMargin: '1200px 0px' }) : null;
    // A width change invalidates measured heights (rotation, split screen). Re-measure
    // real rows before observing again; keyboard-only height changes need no rebuild.
    this.width = root?.clientWidth;
    if (root && globalThis.ResizeObserver) {
      this.resize = new ResizeObserver(() => {
        if (root.clientWidth === this.width) return;
        this.width = root.clientWidth;
        for (const item of this.rows.values()) {
          this.show(item);
          this.io?.unobserve(item.row);
          this.io?.observe(item.row);
        }
      });
      this.resize.observe(root);
    }
  }
  track(row) {
    if (!this.io) return;
    const previous = this.rows.get(row.dataset.k);
    const saved = previous ? (previous.hidden ? previous.saved : this.beforeHide(previous.row)) : null;
    if (previous) this.io.unobserve(previous.row);
    const item = { row, near: true, hidden: false, saved, restore: !!previous };
    this.rows.set(row.dataset.k, item);
    this.io.observe(row);
    if (this.rows.size === 121) for (const other of this.rows.values()) if (!other.near) this.hide(other);
  }
  hide(item) {
    if (this.rows.size <= 120 || item.hidden || !item.row.isConnected) return;
    const height = item.row.getBoundingClientRect().height;
    if (!height) return;
    item.saved = this.beforeHide(item.row);
    item.row.style.height = `${height}px`;
    item.row.style.boxSizing = 'border-box';
    item.row.replaceChildren();
    item.row.dataset.suspended = 'true';
    item.hidden = true;
  }
  show(item) {
    if (!item.hidden) return;
    const fresh = this.makeRow(item.row.dataset.k);
    if (!fresh) return;
    item.row.replaceChildren(...fresh.childNodes);
    delete item.row.dataset.state;
    delete item.row.dataset.suspended;
    item.row.dataset.resumed = 'true';
    item.row.style.height = '';
    item.row.style.boxSizing = '';
    item.hidden = false;
    this.afterShow(item.row, item.saved);
    item.saved = null;
  }
  reveal(key) { const item = this.rows.get(key); if (item) this.show(item); }
  forget(key) {
    const item = this.rows.get(key);
    if (!item) return;
    this.io?.unobserve(item.row);
    if (!item.hidden) this.beforeHide(item.row);
    this.rows.delete(key);
  }
  clear() { for (const key of this.rows.keys()) this.forget(key); }
  close() { this.clear(); this.io?.disconnect(); this.resize?.disconnect(); }
}

/* 刪除粉碎。粒子只活在這一輪動畫裡，結束就丟掉點陣圖，不寫入、不上傳。
   取樣間距沿用核准稿：約 1.7px，面積大約是 5px 粗格的 8–12 倍。
   一次炸太多泡泡時把格子放大，總粒子數封頂，避免長對話清空時把主執行緒卡住。 */
export const SHATTER_PIXEL = 1.7;
export const SHATTER_MAX = 22000;

export function shatterBaseStep(scale, pixel = SHATTER_PIXEL) {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 2;
  return Math.max(2, Math.round(pixel * s));
}

export function planShatterStep(sizes, scale, maxParticles = SHATTER_MAX) {
  const base = shatterBaseStep(scale);
  if (!sizes?.length) return base;
  const cells = (step) => sizes.reduce((n, pair) => {
    const w = Math.max(1, pair[0] || 0), h = Math.max(1, pair[1] || 0);
    return n + Math.ceil(w / step) * Math.ceil(h / step);
  }, 0);
  let step = base;
  while (cells(step) * 1.35 > maxParticles && step < 48) step += 1;
  return step;
}

export function shatterPoint(p, now) {
  const t = now - p.born;
  if (t < 0) return { pending: true, alpha: 0, x: p.x, y: p.y };
  if (t > p.life) return null;
  const u = t / 1000;
  const k = t / p.life;
  const fadeStart = 0.42;
  const fade = k < fadeStart ? 1 : 1 - (k - fadeStart) / (1 - fadeStart);
  return {
    pending: false,
    x: p.x + p.vx * u,
    y: p.y + p.vy * u + 0.5 * p.gravity * u * u,
    alpha: Math.max(0, fade * (p.alpha || 1)),
    kind: p.kind,
  };
}

export function buildShatterParticles({
  data, width, height, scale, step,
  originX, originY, bubLeft, bubTop,
  now = 0, random = Math.random, maxParticles = Infinity,
}) {
  const particles = [];
  const src = data;
  if (!src || width < 1 || height < 1 || !(step > 0) || !(scale > 0)) return particles;
  const pushOne = (kind, x, y, nx, ny, dist, sx, sy, sw, sh, r, g, b) => {
    if (particles.length >= maxParticles) return false;
    const jitter = (random() - 0.5) * 70;
    let blast, size, life, gravity, vr, alpha, delay;
    if (kind === "chunk") {
      blast = 320 + random() * 360;
      size = Math.max(sw, sh) / scale;
      life = 1000 + random() * 350;
      gravity = 980 + random() * 240;
      vr = (random() - 0.5) * 8;
      alpha = 1;
      delay = dist * 0.3;
    } else {
      blast = 480 + random() * 620;
      size = 0.9 + random() * 2.2;
      life = 1150 + random() * 500;
      gravity = 640 + random() * 280;
      vr = (random() - 0.5) * 4;
      alpha = 0.75 + random() * 0.25;
      delay = dist * 0.15 + random() * 40;
    }
    const shade = 0.85 + random() * 0.3;
    const channel = (n) => Math.max(0, Math.min(255, n * shade | 0));
    particles.push({
      kind, x, y,
      vx: nx * blast + jitter,
      vy: ny * blast - 70 + (random() - 0.5) * 50,
      w: sw / scale,
      h: sh / scale,
      sx, sy, sw, sh, size, grow: 0,
      color: "rgb(" + channel(r) + "," + channel(g) + "," + channel(b) + ")",
      vr, alpha,
      born: now + delay,
      life, gravity,
    });
    return true;
  };

  for (let sy = 0; sy < height; sy += step) {
    const sh = Math.min(step, height - sy);
    for (let sx = 0; sx < width; sx += step) {
      if (particles.length >= maxParticles) return particles;
      const sw = Math.min(step, width - sx);
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = 0; yy < sh; yy++) {
        let i = ((sy + yy) * width + sx) * 4;
        for (let xx = 0; xx < sw; xx++, i += 4) {
          const al = src[i + 3];
          if (al < 10) continue;
          r += src[i] * al;
          g += src[i + 1] * al;
          b += src[i + 2] * al;
          a += al;
          n++;
        }
      }
      if (!n || a / n < 14) continue;
      r /= a; g /= a; b /= a;
      const x = bubLeft + (sx + sw / 2) / scale;
      const y = bubTop + (sy + sh / 2) / scale;
      const dx = x - originX;
      const dy = y - originY;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const kind = random() < 0.22 ? "chunk" : "dust";
      if (!pushOne(kind, x, y, nx, ny, dist, sx, sy, sw, sh, r, g, b)) return particles;
      if (random() < 0.35) {
        const ang = random() * Math.PI * 2;
        if (!pushOne("dust", x, y, Math.cos(ang), Math.sin(ang), dist, sx, sy, sw, sh, r, g, b)) return particles;
      }
    }
  }
  return particles;
}

export function createShatterFx(doc, hooks = {}) {
  return new ShatterFx(doc, hooks);
}

class ShatterFx {
  constructor(doc, hooks) {
    this.doc = doc;
    this.hooks = hooks || {};
    this.layers = [];
    this.raf = 0;
    this.timers = new Set();
  }

  view() { return this.doc?.defaultView || globalThis; }

  reduced() {
    if (this.hooks.reduced) return !!this.hooks.reduced();
    try {
      return !!this.view().matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch (_) { return false; }
  }

  blocked() {
    if (this.reduced()) return true;
    if (this.doc?.hidden) return true;
    const chat = this.doc?.getElementById?.("chat");
    return !!chat?.hidden;
  }

  onScreen(el) {
    const r = el?.getBoundingClientRect?.();
    if (!r || r.width < 2 || r.height < 2) return false;
    const sc = this.doc.getElementById("scroller");
    const view = sc?.getBoundingClientRect?.();
    if (!view || view.width < 2 || view.height < 2) return true;
    return r.bottom > view.top && r.top < view.bottom && r.right > view.left && r.left < view.right;
  }

  dpr() {
    const n = this.view().devicePixelRatio || 2;
    return Math.min(3, Math.max(2, n));
  }

  play(row) {
    if (!row?.isConnected) return false;
    if (row.classList?.contains?.("shattering")) return true;
    if (this.blocked()) return false;
    const bub = row.querySelector?.(".bub");
    if (!bub || !this.onScreen(bub)) return false;
    try { return this.spawn([bub]) > 0; }
    catch (err) { console.error(err); return false; }
  }

  playAll() {
    if (this.blocked()) return false;
    const list = this.doc.getElementById("msgList");
    if (!list?.querySelectorAll) return false;
    const bubbles = [...list.querySelectorAll(".row:not(.shattering) .bub")].filter((b) => this.onScreen(b));
    if (!bubbles.length) return false;
    try { return this.spawn(bubbles) > 0; }
    catch (err) { console.error(err); return false; }
  }

  spawn(bubs) {
    const chat = this.doc.getElementById("chat");
    const fx = this.doc.getElementById("shatterFx");
    if (!chat || !fx || !bubs.length) return 0;
    const screen = chat.getBoundingClientRect();
    const scale = this.dpr();
    const prepared = [];
    for (const bub of bubs) {
      const row = bub.closest?.(".row");
      if (!row || row.classList.contains("shattering")) continue;
      let snap = null;
      try { snap = this.snapshot(bub, scale); }
      catch (err) { console.error(err); snap = null; }
      if (!snap) continue;
      prepared.push({ bub, row, snap, rect: bub.getBoundingClientRect() });
    }
    if (!prepared.length) return 0;
    const step = planShatterStep(prepared.map((p) => [p.snap.canvas.width, p.snap.canvas.height]), scale);
    const now = this.view().performance?.now?.() || 0;
    let room = SHATTER_MAX;
    let started = 0;
    for (const item of prepared) {
      if (room <= 0) break;
      const originX = item.rect.left - screen.left + item.rect.width / 2;
      const originY = item.rect.top - screen.top + item.rect.height / 2;
      const particles = buildShatterParticles({
        data: item.snap.data,
        width: item.snap.canvas.width,
        height: item.snap.canvas.height,
        scale: item.snap.scale,
        step,
        originX, originY,
        bubLeft: item.rect.left - screen.left,
        bubTop: item.rect.top - screen.top,
        now, maxParticles: room,
      });
      room -= particles.length;
      if (!particles.length) continue;
      item.row.classList.add("shattering");
      item.bub.classList.add("ghost");
      this.layers.push({ bitmap: item.snap.canvas, particles, row: item.row, closing: false });
      started++;
    }
    if (started) this.kick();
    return started;
  }

  snapshot(bub, fallbackScale) {
    const rect = bub.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    let scale = fallbackScale || this.dpr();
    if (width * height * scale * scale > 280000) {
      scale = Math.max(1, Math.sqrt(280000 / (width * height)));
    }
    const canvas = this.doc.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.scale(scale, scale);
    const cs = this.view().getComputedStyle(bub);
    const rad = radiiOf(cs);
    traceBubble(ctx, 0, 0, rect.width, rect.height, rad);
    ctx.fillStyle = cs.backgroundColor || "transparent";
    ctx.fill();
    ctx.save();
    traceBubble(ctx, 0, 0, rect.width, rect.height, rad);
    ctx.clip();
    paintImages(ctx, bub, rect);
    paintTextNodes(ctx, bub, rect, this.view());
    ctx.restore();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { canvas, scale, data: image.data };
  }

  kick() {
    if (this.raf) return;
    const raf = this.view().requestAnimationFrame?.bind(this.view());
    if (!raf) return;
    const loop = (now) => {
      this.raf = 0;
      let more = false;
      try { more = this.draw(now); }
      catch (err) { console.error(err); this.layers = []; }
      if (more) this.raf = raf(loop);
      else this.clearCanvas();
    };
    this.raf = raf(loop);
  }

  draw(now) {
    const fx = this.doc.getElementById("shatterFx");
    const chat = this.doc.getElementById("chat");
    if (!fx || !chat) { this.layers = []; return false; }
    const rect = chat.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return this.layers.length > 0;
    const dpr = this.dpr();
    const bw = Math.round(rect.width * dpr);
    const bh = Math.round(rect.height * dpr);
    if (fx.width !== bw || fx.height !== bh) { fx.width = bw; fx.height = bh; }
    const ctx = fx.getContext("2d");
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.imageSmoothingEnabled = false;
    this.layers = this.layers.filter((layer) => {
      let alive = 0;
      for (const p of layer.particles) {
        const pos = shatterPoint(p, now);
        if (!pos) continue;
        alive++;
        if (pos.pending || pos.alpha < 0.02) continue;
        const age = Math.max(0, now - p.born) / 1000;
        if (p.kind === "chunk") {
          ctx.save();
          ctx.globalAlpha = pos.alpha;
          ctx.translate(pos.x, pos.y);
          ctx.rotate(p.vr * age);
          ctx.drawImage(layer.bitmap, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else {
          ctx.globalAlpha = pos.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
      if (!alive && !layer.closing) {
        layer.closing = true;
        layer.bitmap = null;
        this.collapse(layer.row);
      }
      return alive > 0;
    });
    return this.layers.length > 0;
  }

  collapse(row) {
    const finish = () => {
      if (row?.isConnected) row.remove();
      try { this.hooks.onRowDone?.(); } catch (_) {}
    };
    if (!row?.isConnected) { finish(); return; }
    const h = row.offsetHeight || row.getBoundingClientRect().height || 0;
    row.style.maxHeight = h + "px";
    row.classList.add("gone");
    const raf = this.view().requestAnimationFrame?.bind(this.view());
    const shrink = () => {
      if (!row.isConnected) return;
      row.style.maxHeight = "0px";
      row.style.opacity = "0";
      row.style.marginTop = "0";
    };
    if (raf) raf(shrink); else shrink();
    const timer = setTimeout(() => { this.timers.delete(timer); finish(); }, 320);
    this.timers.add(timer);
  }

  clearCanvas() {
    const fx = this.doc.getElementById("shatterFx");
    const ctx = fx?.getContext?.("2d");
    if (!ctx || !fx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, fx.width, fx.height);
  }

  stop() {
    const cancel = this.view().cancelAnimationFrame?.bind(this.view());
    if (this.raf && cancel) cancel(this.raf);
    this.raf = 0;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.layers = [];
    this.clearCanvas();
  }
}

function radiiOf(cs) {
  const n = (v) => {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : 0;
  };
  return {
    tl: n(cs?.borderTopLeftRadius),
    tr: n(cs?.borderTopRightRadius),
    br: n(cs?.borderBottomRightRadius),
    bl: n(cs?.borderBottomLeftRadius),
  };
}

function traceBubble(ctx, x, y, w, h, r) {
  const tl = Math.max(0, r.tl || 0), tr = Math.max(0, r.tr || 0);
  const br = Math.max(0, r.br || 0), bl = Math.max(0, r.bl || 0);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function paintImages(ctx, el, origin) {
  const imgs = el.querySelectorAll?.("img") || [];
  for (const img of imgs) {
    const src = img.currentSrc || img.src || "";
    if (!img.complete || !img.naturalWidth) continue;
    if (!src.startsWith("data:") && !src.startsWith("blob:")) continue;
    const box = img.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const x = box.left - origin.left;
    const y = box.top - origin.top;
    try { drawCover(ctx, img, x, y, box.width, box.height); }
    catch (_) {}
  }
}

function drawCover(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const ir = iw / ih, r = w / h;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; }
  else { sw = iw; sh = sw / r; sy = (ih - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function paintTextNodes(ctx, el, origin, view) {
  const rootDoc = el.ownerDocument;
  if (!rootDoc?.createTreeWalker || !view?.getComputedStyle) return;
  const show = rootDoc.defaultView?.NodeFilter?.SHOW_TEXT || 4;
  const walk = rootDoc.createTreeWalker(el, show, null);
  while (walk.nextNode()) {
    const node = walk.currentNode;
    const text = node.nodeValue;
    if (!text) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const cs = view.getComputedStyle(parent);
    ctx.save();
    ctx.fillStyle = cs.color || "#fff";
    ctx.font = cs.font || "16px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const opacity = parseFloat(cs.opacity);
    ctx.globalAlpha = Math.max(0.001, Number.isFinite(opacity) ? opacity : 1);
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") continue;
      try {
        const range = rootDoc.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const box = range.getBoundingClientRect();
        if (box.width < 0.2 || box.height < 0.2) continue;
        ctx.fillText(text[i], box.left - origin.left, box.top - origin.top + box.height / 2);
      } catch (_) {}
    }
    ctx.restore();
  }
}
