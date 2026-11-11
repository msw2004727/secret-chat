/* 雙擊訊息：泡泡像軟麵條一樣垂下去。畫在捲動區外面的一層，不改變捲動高度。
   狀態由呼叫端寫進 rooms/<房>/dr/<訊息鍵>，這裡只負責畫。 */
export const DROOP = {
  ANGLE_DEG: 60,
  SOFTNESS: 1,
  CURVE_POW: 1.3,
  MAX_BEND_PX: 230,
  DURATION_MS: 1150,
  WOBBLE: 0.14,
  RECOVER_MS: 2500,
  RECOVER_OVERSHOOT: 0.05,
  DOUBLE_TAP_MS: 320,
  DOUBLE_TAP_PX: 26,
  COLS: 40,
  ROWS: 5,
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
function petsOff() {
  try { return localStorage.getItem("sc-pets") === "off"; } catch (_) { return false; }
}

function sagCurve(ms) {
  const D = DROOP.DURATION_MS;
  if (ms >= D) return 1;
  if (ms <= 0) return 0;
  const W = Math.max(0, Math.min(0.6, DROOP.WOBBLE));
  const t = ms / 1000;
  if (W < 0.002) { const w = 6 / (D / 1000); return 1 - (1 + w * t) * Math.exp(-w * t); }
  const L = Math.log(W);
  const z = -L / Math.sqrt(Math.PI * Math.PI + L * L);
  const w0 = 4.8 / (z * D / 1000), wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
}
function riseCurve(ms) {
  const D = DROOP.RECOVER_MS;
  if (ms >= D) return 0;
  if (ms <= 0) return 1;
  const p = ms / D;
  const g = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(p / 0.82));
  const bump = p > 0.68 ? Math.sin(Math.PI * (p - 0.68) / 0.32) : 0;
  return (1 - g) - DROOP.RECOVER_OVERSHOOT * bump;
}
function droopAngle(st, now) {
  const e = now - st.t;
  if (st.on) return st.a0 + (1 - st.a0) * sagCurve(e);
  return st.a0 * riseCurve(e);
}
function centerline(L, theta) {
  const N = DROOP.COLS * 4;
  const soft = Math.max(0.05, Math.min(1, DROOP.SOFTNESS));
  const s0 = L - Math.min(L * soft, Math.max(40, DROOP.MAX_BEND_PX));
  const X = new Float32Array(N + 1), Y = new Float32Array(N + 1), A = new Float32Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const sm = L * (i - 0.5) / N;
    const u = clamp01((sm - s0) / (L - s0 || 1));
    const ph = theta * Math.pow(u, DROOP.CURVE_POW);
    X[i] = X[i - 1] + Math.cos(ph) * L / N;
    Y[i] = Y[i - 1] + Math.sin(ph) * L / N;
    A[i] = theta * Math.pow(clamp01((L * i / N - s0) / (L - s0 || 1)), DROOP.CURVE_POW);
  }
  return { X, Y, A, N, L };
}
function bendPt(cl, st, sx, sy) {
  const w = st.w, h = st.h;
  const s = st.right ? w - sx : sx;
  const f = Math.max(0, Math.min(cl.N, s / cl.L * cl.N));
  const i = Math.min(cl.N - 1, Math.floor(f)), k = f - i;
  const cx = cl.X[i] + (cl.X[i + 1] - cl.X[i]) * k;
  const cy = cl.Y[i] + (cl.Y[i + 1] - cl.Y[i]) * k;
  const ph = cl.A[i] + (cl.A[i + 1] - cl.A[i]) * k;
  const n = sy - h / 2;
  const x = cx - n * Math.sin(ph), y = h / 2 + cy + n * Math.cos(ph);
  return { x: st.right ? w - x : x, y };
}
function drawTri(c, img, sc, s0, s1, s2, d0, d1, d2) {
  const mx = (d0.x + d1.x + d2.x) / 3, my = (d0.y + d1.y + d2.y) / 3;
  const ex = (p) => { const dx = p.x - mx, dy = p.y - my, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx / l * 0.7, y: p.y + dy / l * 0.7 }; };
  const e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
  const x0 = s0.x * sc, y0 = s0.y * sc, x1 = s1.x * sc, y1 = s1.y * sc, x2 = s2.x * sc, y2 = s2.y * sc;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(den) < 1e-6) return;
  const a = ((d1.x - d0.x) * (y2 - y0) - (d2.x - d0.x) * (y1 - y0)) / den;
  const b = ((d1.y - d0.y) * (y2 - y0) - (d2.y - d0.y) * (y1 - y0)) / den;
  const cc = ((d2.x - d0.x) * (x1 - x0) - (d1.x - d0.x) * (x2 - x0)) / den;
  const d = ((d2.y - d0.y) * (x1 - x0) - (d1.y - d0.y) * (x2 - x0)) / den;
  const e = d0.x - a * x0 - cc * y0, f = d0.y - b * x0 - d * y0;
  c.save();
  c.beginPath(); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.lineTo(e2.x, e2.y); c.closePath(); c.clip();
  c.transform(a, b, cc, d, e, f);
  c.drawImage(img, 0, 0);
  c.restore();
}

function radiiFor(el) {
  const cs = getComputedStyle(el);
  const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  return { tl: n(cs.borderTopLeftRadius), tr: n(cs.borderTopRightRadius), br: n(cs.borderBottomRightRadius), bl: n(cs.borderBottomLeftRadius) };
}
function bubblePath(ctx, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(r.tl, 0);
  ctx.lineTo(w - r.tr, 0);
  ctx.quadraticCurveTo(w, 0, w, r.tr);
  ctx.lineTo(w, h - r.br);
  ctx.quadraticCurveTo(w, h, w - r.br, h);
  ctx.lineTo(r.bl, h);
  ctx.quadraticCurveTo(0, h, 0, h - r.bl);
  ctx.lineTo(0, r.tl);
  ctx.quadraticCurveTo(0, 0, r.tl, 0);
  ctx.closePath();
}
function paintText(ctx, el, origin) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue;
    if (!text) continue;
    const parent = node.parentElement;
    const cs = getComputedStyle(parent);
    ctx.save();
    ctx.fillStyle = cs.color;
    ctx.font = cs.font;
    ctx.textBaseline = "middle";
    const opacity = parseFloat(cs.opacity);
    ctx.globalAlpha = Math.max(0.001, Number.isFinite(opacity) ? opacity : 1);
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") continue;
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      if (box.width < 0.2 || box.height < 0.2) continue;
      ctx.fillText(text[i], box.left - origin.left, box.top - origin.top + box.height / 2);
    }
    ctx.restore();
  }
}
function snapshotBubble(el) {
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  const cs = getComputedStyle(el);
  const rad = radiiFor(el);
  bubblePath(ctx, rect.width, rect.height, rad);
  ctx.fillStyle = cs.backgroundColor || "transparent";
  ctx.fill();
  ctx.save();
  bubblePath(ctx, rect.width, rect.height, rad);
  ctx.clip();
  paintText(ctx, el, rect);
  ctx.restore();
  return { canvas, scale };
}

export const Droop = {
  now() { return Date.now(); },
  write: null,
  last: null,
  ready: false,
  mount() {
    if (this.ready) return;
    const list = document.getElementById("msgList");
    const scroller = document.getElementById("scroller");
    const menu = document.getElementById("msgMenu");
    if (!list || !scroller) return;
    this.ready = true;
    this.list = list;
    this.scroller = scroller;
    this.menu = menu;
    const layer = document.createElement("div");
    layer.id = "droopLayer";
    layer.setAttribute("aria-hidden", "true");
    scroller.insertAdjacentElement("afterend", layer);
    this.layer = layer;
    this.map = new Map();
    this.raf = 0;
    this.lastTap = null;
    this.tapDown = null;
    const MOVE = 12;
    scroller.addEventListener("pointerdown", (e) => {
      this.tapDown = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    }, true);
    scroller.addEventListener("pointermove", (e) => {
      const d = this.tapDown;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE) d.moved = true;
    }, { passive: true, capture: true });
    scroller.addEventListener("pointerup", (e) => {
      const d = this.tapDown;
      this.tapDown = null;
      if (!d || d.moved || performance.now() - d.t > 300) { this.lastTap = null; return; }
      if (menu && !menu.hidden) { this.lastTap = null; return; }
      const row = this.rowAt(e.clientX, e.clientY) || e.target.closest?.(".row");
      if (!row || !row.dataset.k || row.classList.contains("shattering") || !row.querySelector(".bub")) { this.lastTap = null; return; }
      const now = performance.now();
      if (this.lastTap && this.lastTap.row === row && now - this.lastTap.t < DROOP.DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < DROOP.DOUBLE_TAP_PX) {
        this.lastTap = null;
        if (petsOff()) return; /* 趣味特效關掉：不軟、也不寫資料庫 */
        const st = this.map.get(row);
        const on = !(st && st.on);
        if (this.write) this.write(row.dataset.k, on);
        return;
      }
      this.lastTap = { row, t: now, x: e.clientX, y: e.clientY };
    }, true);
    list.addEventListener("dblclick", (e) => e.preventDefault());
    /* 捲動時馬上跟上（不只靠 rAF；rAF 被節流或出錯時泡泡也不會卡在畫面上） */
    scroller.addEventListener("scroll", () => {
      for (const [row, st] of [...this.map]) {
        if (!row.isConnected || !st.bub.isConnected) { this.clear(row); continue; }
        try { this.place(st); } catch (_) {}
      }
    }, { passive: true });
    window.addEventListener("resize", () => { for (const st of this.map.values()) st.drawnFinal = false; this.kick(); });
    if (window.MutationObserver) {
      new MutationObserver(() => { if (this.last && !petsOff()) this.sync(this.last, this.now()); }).observe(list, { childList: true, subtree: true });
    }
    window.addEventListener("sc-pets", (e) => {
      const on = !!(e.detail && e.detail.on);
      if (!on) this.clearAll();
      else if (this.last) this.sync(this.last, this.now());
    });
  },
  rowAt(x, y) {
    for (const [row, st] of [...this.map].reverse()) {
      const r = st.cv.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const px = Math.floor((x - r.left) * st.dpr), py = Math.floor((y - r.top) * st.dpr);
      try { if (st.cv.getContext("2d").getImageData(px, py, 1, 1).data[3] > 40) return row; } catch (_) {}
    }
    return null;
  },
  clear(row) {
    const st = this.map.get(row);
    if (!st) return;
    this.map.delete(row);
    try { st.cv.remove(); } catch (_) {}
    try { st.bub.classList.remove("droop"); } catch (_) {}
  },
  straighten(row) { if (row) this.clear(row); },
  clearAll() { for (const row of [...this.map.keys()]) this.clear(row); },
  apply(row, on, t) {
    const bub = row && row.querySelector(".bub");
    if (!bub || row.classList.contains("shattering") || row.classList.contains("gone")) return;
    const now = this.now();
    t = typeof t === "number" ? t : now;
    let st = this.map.get(row);
    if (!st) {
      if (!on) return;
      row.dataset.drooped = "1";
      try { bub.dispatchEvent(new CustomEvent("bub-droop", { bubbles: true })); } catch (_) {}
      bub.classList.remove("holding");
      const w = bub.offsetWidth, h = bub.offsetHeight;
      let snap;
      try { snap = snapshotBubble(bub); } catch (_) { return; }
      if (!snap) return;
      const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
      const maxA = DROOP.ANGLE_DEG * Math.PI / 180 * (1 + Math.max(0, DROOP.WOBBLE) + 0.05);
      const padX = 16, padT = 14 + Math.ceil(w * Math.sin(DROOP.ANGLE_DEG * Math.PI / 180 * 0.12));
      const bendL = Math.min(w * Math.max(0.05, Math.min(1, DROOP.SOFTNESS)), Math.max(40, DROOP.MAX_BEND_PX));
      const padB = 14 + Math.ceil(bendL * Math.sin(Math.min(Math.PI / 2, maxA)) + h * 0.5);
      const cv = document.createElement("canvas");
      cv.className = "bub-droop";
      cv.style.zIndex = String(1000 - [...this.list.querySelectorAll(".row")].indexOf(row));
      cv.width = Math.round((w + padX * 2) * dpr);
      cv.height = Math.round((h + padT + padB) * dpr);
      cv.style.width = (w + padX * 2) + "px";
      cv.style.height = (h + padT + padB) + "px";
      this.layer.appendChild(cv);
      st = { row, bub, cv, snap, dpr, w, h, padX, padT, right: row.classList.contains("me"), on: true, t, a0: 0, amt: 0 };
      this.map.set(row, st);
      bub.classList.add("droop");
      this.draw(st, now);
      this.place(st);
      this.kick();
      return;
    }
    const cur = droopAngle(st, t);
    st.a0 = Math.max(0, Math.min(1.2, cur));
    st.on = !!on;
    st.t = t;
    st.drawnFinal = false;
    this.kick();
  },
  sync(val, serverNow) {
    this.mount();
    if (!this.ready) return;
    this.last = val || {};
    if (petsOff()) { this.clearAll(); return; } /* 關掉時照樣記住資料庫，畫面上全部挺直 */
    const now = typeof serverNow === "number" ? serverNow : this.now();
    const seen = new Set();
    for (const key of Object.keys(this.last)) {
      seen.add(key);
      const rec = this.last[key];
      const row = this.list.querySelector(`.row[data-k="${CSS.escape(key)}"]`);
      if (!row || !rec) continue;
      row.dataset.drooped = "1"; /* 垂過（包含已經挺回來的）：貓永遠不碰（room-pets.js 的 everDrooped） */
      const on = rec.on === true;
      const t = Number(rec.t);
      const st = this.map.get(row);
      if (st && st.on === on && st.t === t) continue;
      this.apply(row, on, Number.isFinite(t) ? t : now);
    }
    for (const row of [...this.map.keys()]) {
      if (!seen.has(row.dataset.k)) this.clear(row);
    }
    void now;
  },
  draw(st, now) {
    const amt = droopAngle(st, now);
    st.amt = amt;
    const theta = amt * DROOP.ANGLE_DEG * Math.PI / 180;
    const cv = st.cv, c = cv.getContext("2d"), sc = st.snap.scale, dpr = st.dpr;
    if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    if (Math.abs(theta) < 0.0015) {
      c.setTransform(dpr, 0, 0, dpr, st.padX * dpr, st.padT * dpr);
      c.drawImage(st.snap.canvas, 0, 0, st.w, st.h);
      return;
    }
    c.setTransform(dpr, 0, 0, dpr, st.padX * dpr, st.padT * dpr);
    c.imageSmoothingEnabled = true;
    const cl = centerline(st.w, theta);
    const C = DROOP.COLS, R = DROOP.ROWS, P = [], S = [];
    for (let r = 0; r <= R; r++) {
      const pr = [], sr = [];
      for (let q = 0; q <= C; q++) {
        const sx = st.w * q / C, sy = st.h * r / R;
        sr.push({ x: sx, y: sy });
        pr.push(bendPt(cl, st, sx, sy));
      }
      P.push(pr); S.push(sr);
    }
    const img = st.snap.canvas;
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) {
      drawTri(c, img, sc, S[r][q], S[r][q + 1], S[r + 1][q], P[r][q], P[r][q + 1], P[r + 1][q]);
      drawTri(c, img, sc, S[r][q + 1], S[r + 1][q + 1], S[r + 1][q], P[r][q + 1], P[r + 1][q + 1], P[r + 1][q]);
    }
  },
  place(st) {
    const lr = this.layer.getBoundingClientRect();
    const br = st.bub.getBoundingClientRect();
    const x = br.left + br.width / 2 - st.w / 2 - lr.left - st.padX;
    const y = br.top + br.height / 2 - st.h / 2 - lr.top - st.padT;
    st.cv.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
  },
  syncLayer() {
    this.layer.style.top = this.scroller.offsetTop + "px";
    this.layer.style.height = this.scroller.clientHeight + "px";
  },
  tick() {
    this.raf = 0;
    if (!this.map.size) return;
    const now = this.now();
    this.syncLayer();
    for (const [row, st] of [...this.map]) {
      if (!row.isConnected || !st.bub.isConnected) { this.clear(row); continue; }
      try {
        const e = now - st.t;
        const settled = st.on ? e > DROOP.DURATION_MS + 40 : e > DROOP.RECOVER_MS;
        if (!st.on && settled) { this.clear(row); continue; }
        if (!settled || !st.drawnFinal) { this.draw(st, now); st.drawnFinal = settled; }
        this.place(st);
      } catch (err) {
        /* 畫壞了：收掉這一則的垂下畫布、泡泡恢復原狀，其他則照常（不讓整個 rAF 鏈斷掉） */
        try { console.warn("[droop] 已自動恢復：", err); } catch (_) {}
        this.clear(row);
      }
    }
    if (this.map.size) this.kick();
  },
  kick() { if (!this.raf) this.raf = requestAnimationFrame(() => this.tick()); },
};
