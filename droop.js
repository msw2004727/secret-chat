/* 兩段手勢，都寫進 rooms/<房>/dr/<訊息鍵> {on,t,by}。
   還沒軟的泡泡：連點兩下（每下相隔 600ms 內）軟成 60 度，並讓黑貓去爬灰貓。
   同一串裡多出來的點不算第二次，也不會直接掉下去。
   已經軟的泡泡：另起一串。正好兩下，停 600ms 就挺回並同步關掉。
   第三下立刻掉出畫面（by 以 fall: 開頭），五秒後以普通形狀淡回，空位留著。
   這裡只負責畫。 */
export const DROOP = {
  SOFT_ANGLE_DEG: 60,
  SOFTNESS: 1,
  CURVE_POW: 1.3,
  MAX_BEND_PX: 230,
  SOFT_MS: 1150,
  SOFT_WOBBLE: 0.14,
  RECOVER_MS: 2500,
  RECOVER_OVERSHOOT: 0.05,
  ANGLE_DEG: 90,
  HINGE_POW: 0.07, /* 小於 1：彎折集中在釘住的那一側，泡泡本體垂成一直線 */
  SAG_MS: 1100,
  WOBBLE: 0.12,
  JELLY_PX: 6,
  TAP_COUNT: 3,
  TAP_GAP_MS: 600,
  FALL_BY: "fall:",
  GONE_MS: 5000,
  FADE_MS: 1000,
  REDUCE_OUT_MS: 400,
  GRAVITY: 1700, /* px/s^2，掉下去是加速度不是等速 */
  FALL_MAX_MS: 2500,
  FALL_MARGIN: 16,
  FALL_SPIN_DEG: 8,
  COLS: 40,
  ROWS: 5,
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/* 軟掉寫進房間後，全房正在看的人各播一次黑貓爬背。
   太舊的紀錄是進房時就在的，不重播。同一筆 t 只算一次。 */
export const DROOP_CLIMB_FRESH_MS = 12000;
export function droopClimbIds(val, now, seen, freshMs = DROOP_CLIMB_FRESH_MS) {
  const ids = [];
  if (!val || typeof val !== "object" || !Number.isFinite(+now)) return ids;
  const have = seen || new Set();
  for (const key of Object.keys(val)) {
    const rec = val[key];
    if (!rec || rec.on !== true || droopIsFall(rec.by)) continue;
    const t = Number(rec.t);
    if (!Number.isFinite(t) || Math.abs(+now - t) > freshMs) continue;
    const id = key + ":" + t;
    if (have.has(id)) continue;
    ids.push(id);
  }
  return ids;
}
function petsOff() {
  try { return localStorage.getItem("sc-pets") === "off"; } catch (_) { return false; }
}

/* 房間動物分組：rooms/<房>/pets/<cats|quokka|rooster> {on,t,by}。
   沒有這筆、或 on 不是 false，都當作開。晚進房只看目前狀態，不重播跑走。 */
export function petGroupsFromSnap(val) {
  const on = (rec) => !rec || rec.on !== false;
  const v = val && typeof val === "object" ? val : {};
  return { cats: on(v.cats), quokka: on(v.quokka), rooster: on(v.rooster) };
}

function reducedMotion() {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch (_) { return false; }
}
/* 連點計數。換了一則、或離上一點超過 TAP_GAP_MS，就從 1 重算。 */
export function droopTapCount(prev, sameRow, gapMs) {
  const n = Number(prev) || 0;
  if (!sameRow || !Number.isFinite(gapMs) || gapMs < 0 || gapMs > DROOP.TAP_GAP_MS) return 1;
  return n + 1;
}
export function droopIsFall(by) {
  return typeof by === "string" && by.startsWith(DROOP.FALL_BY);
}
/* on 為 true 且 by 不是 fall: → 停在軟掉。fall: 是掉出去那一次。 */
export function droopRecordKind(rec) {
  if (!rec || rec.on !== true) return "off";
  return droopIsFall(rec.by) ? "fall" : "soft";
}
/* mode 是這一串開始時泡泡的狀態，中途不變。
   普通泡泡只有第 2 下會軟，第 3 下之後這串不再做事。
   已經軟的泡泡，第 3 下立刻掉；正好 2 下要等這一串結束才挺回。單下一律不算。 */
export function droopTapAction(mode, count) {
  const n = Number(count) || 0;
  if (mode === "soft") {
    if (n === DROOP.TAP_COUNT) return "fall";
    if (n === 2) return "pending";
    return "none";
  }
  if (n === 2) return "soft";
  return "none";
}
export function droopBurstEndAction(mode, count) {
  const n = Number(count) || 0;
  if (mode === "soft" && n >= 2 && n < DROOP.TAP_COUNT) return "restore";
  return "none";
}
export function droopPlayBurst(mode, taps) {
  const actions = [];
  const n = Number(taps) || 0;
  for (let i = 1; i <= n; i++) {
    const act = droopTapAction(mode, i);
    if (act === "soft" || act === "fall") actions.push(act);
  }
  const end = droopBurstEndAction(mode, n);
  if (end !== "none") actions.push(end);
  return actions;
}
/* 從這次 t 起算的階段。reduced 時沒有下墜，淡出後直接進入「人不在畫面」的等待。 */
export function droopPhase(elapsedMs, fallMs, reduced) {
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < 0) return "done";
  const out = reduced ? DROOP.REDUCE_OUT_MS : DROOP.SAG_MS;
  const fall = reduced ? 0 : Math.max(0, Number(fallMs) || 0);
  const goneAt = out + fall + DROOP.GONE_MS;
  const fadeAt = goneAt + DROOP.FADE_MS;
  if (elapsed < out) return reduced ? "fadeout" : "sag";
  if (!reduced && elapsed < out + fall) return "fall";
  if (elapsed < goneAt) return "gone";
  if (elapsed < fadeAt) return "fade";
  return "done";
}
export function droopFallY(ms, g = DROOP.GRAVITY) {
  const t = Math.max(0, Number(ms) || 0) / 1000;
  return 0.5 * g * t * t;
}
export function droopFallMs(distancePx, g = DROOP.GRAVITY, maxMs = DROOP.FALL_MAX_MS) {
  if (!(distancePx > 0) || !(g > 0)) return 0;
  return Math.min(maxMs, Math.sqrt((2 * distancePx) / g) * 1000);
}
function springTo(ms, duration, wobble) {
  const D = duration;
  if (ms >= D) return 1;
  if (ms <= 0) return 0;
  const W = Math.max(0, Math.min(0.6, wobble));
  const t = ms / 1000;
  if (W < 0.002) { const w = 6 / (D / 1000); return 1 - (1 + w * t) * Math.exp(-w * t); }
  const L = Math.log(W);
  const z = -L / Math.sqrt(Math.PI * Math.PI + L * L);
  const w0 = 4.8 / (z * D / 1000), wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
}
export function droopSag(ms) {
  return springTo(ms, DROOP.SAG_MS, DROOP.WOBBLE);
}
export function droopSoftSag(ms) {
  return springTo(ms, DROOP.SOFT_MS, DROOP.SOFT_WOBBLE);
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
function softAmt(st, now) {
  const e = now - st.t;
  if (st.on) return (st.a0 || 0) + (1 - (st.a0 || 0)) * droopSoftSag(e);
  return (st.a0 == null ? 1 : st.a0) * riseCurve(e);
}
/* 軟掉是整條慢慢彎，不是垂成一直線。彎最多的地方在末端。 */
function softCenterline(L, theta) {
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
function softBend(cl, st, sx, sy) {
  const w = st.w, h = st.h;
  const s = st.right ? w - sx : sx;
  const f = Math.max(0, Math.min(cl.N, (s / cl.L) * cl.N));
  const i = Math.min(cl.N - 1, Math.floor(f)), k = f - i;
  const cx = cl.X[i] + (cl.X[i + 1] - cl.X[i]) * k;
  const cy = cl.Y[i] + (cl.Y[i + 1] - cl.Y[i]) * k;
  const ph = cl.A[i] + (cl.A[i + 1] - cl.A[i]) * k;
  const n = sy - h / 2;
  const x = cx - n * Math.sin(ph), y = h / 2 + cy + n * Math.cos(ph);
  return { x: st.right ? w - x : x, y };
}
export function droopSoftPose(length, theta) {
  const cl = softCenterline(length, theta);
  const mid = Math.max(1, Math.round(cl.N * 0.55));
  return { hinge: cl.A[0], mid: cl.A[mid], end: cl.A[cl.N] };
}
function centerline(L, theta) {
  const N = DROOP.COLS * 4;
  const X = new Float32Array(N + 1), Y = new Float32Array(N + 1), A = new Float32Array(N + 1);
  const pow = DROOP.HINGE_POW;
  for (let i = 1; i <= N; i++) {
    const u0 = (i - 1) / N;
    const u1 = i / N;
    const ph = theta * (Math.pow(u0, pow) + Math.pow(u1, pow)) / 2;
    X[i] = X[i - 1] + Math.cos(ph) * L / N;
    Y[i] = Y[i - 1] + Math.sin(ph) * L / N;
    A[i] = theta * Math.pow(u1, pow);
  }
  return { X, Y, A, N, L };
}
function bendPt(cl, st, sx, sy, jelly) {
  const w = st.w, h = st.h;
  const s = st.right ? w - sx : sx;
  const f = Math.max(0, Math.min(cl.N, s / cl.L * cl.N));
  const i = Math.min(cl.N - 1, Math.floor(f)), k = f - i;
  const cx = cl.X[i] + (cl.X[i + 1] - cl.X[i]) * k;
  const cy = cl.Y[i] + (cl.Y[i + 1] - cl.Y[i]) * k;
  const ph = cl.A[i] + (cl.A[i + 1] - cl.A[i]) * k;
  const n = sy - h / 2;
  const j = jelly || 0;
  const sn = Math.sin(ph), co = Math.cos(ph);
  /* 厚度往泡泡內側偏一個半高，垂下來才不會翻出釘住的那一側、裁到畫面外。
     角度是 0 時 sin 為 0，位置跟原本的泡泡重合。 */
  const x = cx - (n + j) * sn + (h / 2) * sn;
  const y = h / 2 + cy + (n + j) * co;
  return { x: st.right ? w - x : x, y };
}
/* 垂到 theta 時墨水的範圍。鉸鏈在起點、末端角度就是 theta，中段已經接近垂直。 */
export function droopHang(length, theta) {
  const cl = centerline(length, theta);
  const mid = Math.max(1, Math.round(cl.N * 0.55));
  return { hinge: cl.A[0], mid: cl.A[mid], end: cl.A[cl.N] };
}
export function droopInkSpan(length, height, theta) {
  const cl = centerline(Math.max(1, length), theta);
  const st = { w: length, h: height, right: false };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const C = DROOP.COLS, R = DROOP.ROWS;
  for (let r = 0; r <= R; r++) for (let q = 0; q <= C; q++) {
    const p = bendPt(cl, st, length * q / C, height * r / R, 0);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
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
    this.intent = new Map();
    this.raf = 0;
    this.taps = null;
    this.burstTimer = 0;
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
      if (!d || d.moved || performance.now() - d.t > 300) return;
      if (menu && !menu.hidden) return;
      const row = this.rowAt(e.clientX, e.clientY) || e.target.closest?.(".row");
      if (!row || !row.dataset.k || row.classList.contains("shattering") || !row.querySelector(".bub")) return;
      if (this.rowMode(row) === "fall") return;
      const now = performance.now();
      const prev = this.taps;
      const same = !!(prev && prev.row === row && now - prev.t <= DROOP.TAP_GAP_MS);
      if (prev && !same) this.endBurst();
      const mode = same ? prev.mode : this.rowMode(row);
      if (mode !== "soft" && mode !== "normal") return;
      const n = same ? prev.n + 1 : 1;
      this.taps = { row, n, t: now, mode };
      this.armBurst();
      const act = droopTapAction(mode, n);
      if (act === "soft") this.commit(row, true);
      else if (act === "fall") {
        if (this.burstTimer) { clearTimeout(this.burstTimer); this.burstTimer = 0; }
        this.taps = null;
        this.commit(row, true, "fall");
      }
    }, true);
    list.addEventListener("dblclick", (e) => e.preventDefault());
    /* 還垂著的時候跟著捲動。鬆開之後改在螢幕座標往下掉，不再跟著訊息走。 */
    scroller.addEventListener("scroll", () => {
      for (const [row, st] of [...this.map]) {
        if (!row.isConnected || !st.bub.isConnected) { this.clear(row); continue; }
        if (st.release || !st.cv) continue;
        try { this.place(st, 0, 0); } catch (_) {}
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
      if (!st.cv) continue;
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
    try { st.cv?.remove(); } catch (_) {}
    try {
      st.bub.classList.remove("droop");
      st.bub.style.opacity = "";
    } catch (_) {}
  },
  straighten(row) { if (row) this.clear(row); },
  clearAll() { for (const row of [...this.map.keys()]) this.clear(row); },
  rowMode(row) {
    const st = this.map.get(row);
    if (st && st.mode === "fall") return "fall";
    const intent = this.intent && this.intent.get(row);
    if (intent === "fall") return "fall";
    if ((st && st.mode === "soft" && st.on) || intent === "soft") return "soft";
    return "normal";
  },
  armBurst() {
    if (this.burstTimer) clearTimeout(this.burstTimer);
    this.burstTimer = setTimeout(() => this.endBurst(), DROOP.TAP_GAP_MS);
  },
  endBurst() {
    if (this.burstTimer) { clearTimeout(this.burstTimer); this.burstTimer = 0; }
    const b = this.taps;
    this.taps = null;
    if (!b) return;
    if (droopBurstEndAction(b.mode, b.n) === "restore") this.commit(b.row, false);
  },
  commit(row, on, kind) {
    if (petsOff() || !row || !row.dataset || !row.dataset.k) return;
    if (!this.intent) this.intent = new Map();
    this.intent.set(row, kind === "fall" ? "fall" : on ? "soft" : "normal");
    if (this.write) this.write(row.dataset.k, kind === "fall" ? true : !!on, kind === "fall" ? "fall" : undefined);
  },
  takeSnap(bub) {
    const had = bub.classList.contains("droop");
    if (had) bub.classList.remove("droop");
    let snap = null;
    try { snap = snapshotBubble(bub); } catch (_) { snap = null; }
    if (had) bub.classList.add("droop");
    return snap;
  },
  apply(row, on, t, by) {
    const bub = row && row.querySelector(".bub");
    if (!bub || row.classList.contains("shattering") || row.classList.contains("gone")) return;
    t = typeof t === "number" ? t : this.now();
    const kind = droopRecordKind({ on: !!on, by });
    if (kind === "fall") this.applyFall(row, bub, t);
    else if (kind === "off") this.applyOff(row, t);
    else this.applySoft(row, bub, t);
  },
  applyOff(row, t) {
    const st = this.map.get(row);
    if (this.intent) this.intent.set(row, "normal");
    if (!st) return;
    if (st.mode === "fall") { this.clear(row); return; }
    if (!st.on && st.t === t) return;
    st.a0 = Math.max(0, Math.min(1.2, softAmt(st, this.now())));
    st.on = false;
    st.t = t;
    st.drawnFinal = false;
    this.kick();
  },
  applySoft(row, bub, t) {
    let st = this.map.get(row);
    if (st && st.mode === "soft" && st.on && st.t === t) return;
    row.dataset.drooped = "1";
    if (!this.intent) this.intent = new Map();
    this.intent.set(row, "soft");
    bub.classList.remove("holding");
    if (st && st.mode !== "soft") {
      const snap = st.snap;
      try { st.cv?.remove(); } catch (_) {}
      this.map.delete(row);
      st = snap ? this.makeSoft(row, bub, t, snap) : null;
      if (st) this.kick();
      return;
    }
    if (st && st.mode === "soft") {
      st.a0 = Math.max(0, Math.min(1.2, softAmt(st, this.now())));
      st.on = true;
      st.t = t;
      st.drawnFinal = false;
      this.kick();
      return;
    }
    if (!this.makeSoft(row, bub, t, null)) return;
    try { bub.dispatchEvent(new CustomEvent("bub-droop", { bubbles: true })); } catch (_) {}
    this.kick();
  },
  makeSoft(row, bub, t, snap) {
    if (!snap) snap = this.takeSnap(bub);
    if (!snap) return null;
    const w = bub.offsetWidth, h = bub.offsetHeight;
    const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
    const maxA = DROOP.SOFT_ANGLE_DEG * Math.PI / 180 * (1 + Math.max(0, DROOP.SOFT_WOBBLE) + 0.05);
    const padX = 16;
    const padT = 14 + Math.ceil(w * Math.sin(DROOP.SOFT_ANGLE_DEG * Math.PI / 180 * 0.12));
    const bendL = Math.min(w * Math.max(0.05, Math.min(1, DROOP.SOFTNESS)), Math.max(40, DROOP.MAX_BEND_PX));
    const padB = 14 + Math.ceil(bendL * Math.sin(Math.min(Math.PI / 2, maxA)) + h * 0.5);
    const cv = this.makeCanvas(row, w, h, dpr, padX, padT, padB);
    const st = { mode: "soft", row, bub, cv, snap, dpr, w, h, padX, padT, padB, right: row.classList.contains("me"), on: true, t, a0: 0, drawnFinal: false };
    this.map.set(row, st);
    bub.classList.add("droop");
    this.draw(st, this.now());
    this.place(st, 0, 0);
    cv.style.visibility = "";
    return st;
  },
  applyFall(row, bub, t) {
    const reduced = reducedMotion();
    const elapsed = this.now() - t;
    const cap = (reduced ? DROOP.REDUCE_OUT_MS : DROOP.SAG_MS + DROOP.FALL_MAX_MS) + DROOP.GONE_MS + DROOP.FADE_MS;
    row.dataset.drooped = "1";
    if (!this.intent) this.intent = new Map();
    if (elapsed > cap) {
      this.intent.set(row, "normal");
      this.clear(row);
      return; /* 掉下去的那次已經播完，進來的人看到普通泡泡，不重播 */
    }
    this.intent.set(row, "fall");
    bub.classList.remove("holding");
    const prev = this.map.get(row);
    if (prev && prev.mode === "fall" && prev.t === t) return;
    let snap = prev && prev.snap;
    if (prev) { try { prev.cv?.remove(); } catch (_) {} this.map.delete(row); }
    if (!reduced) {
      if (!snap) snap = this.takeSnap(bub);
      if (!snap) return;
    }
    const w = bub.offsetWidth, h = bub.offsetHeight;
    const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
    const st = { mode: "fall", row, bub, cv: null, snap, dpr, w, h, padX: 0, padT: 0, padB: 0, right: row.classList.contains("me"), on: true, t, reduced, fallMs: 0, release: null, inkTop: 0 };
    if (!reduced) {
      const theta = DROOP.ANGLE_DEG * Math.PI / 180 * (1 + Math.max(0, DROOP.WOBBLE) + 0.04);
      const span = droopInkSpan(w, h, theta);
      const padX = Math.ceil(Math.max(18, -span.minX, span.maxX - w) + DROOP.JELLY_PX + 10);
      const padT = Math.ceil(Math.max(14, -span.minY) + DROOP.JELLY_PX + 8);
      const padB = Math.ceil(Math.max(14, span.maxY - h) + DROOP.JELLY_PX + 12);
      const hang = droopInkSpan(w, h, DROOP.ANGLE_DEG * Math.PI / 180);
      const cv = this.makeCanvas(row, w, h, dpr, padX, padT, padB);
      st.cv = cv;
      st.padX = padX;
      st.padT = padT;
      st.padB = padB;
      st.inkTop = padT + hang.minY;
      this.map.set(row, st);
      this.draw(st, t + Math.min(Math.max(0, elapsed), DROOP.SAG_MS));
      this.place(st, 0, 0);
      const visualTop = cv.getBoundingClientRect().top + st.inkTop;
      st.fallMs = droopFallMs(window.innerHeight - visualTop + DROOP.FALL_MARGIN);
      cv.style.visibility = "hidden";
    } else this.map.set(row, st);
    if (droopPhase(elapsed, st.fallMs, reduced) === "done") {
      this.intent.set(row, "normal");
      this.clear(row);
      return;
    }
    try { bub.dispatchEvent(new CustomEvent("bub-droop", { bubbles: true })); } catch (_) {}
    this.kick();
  },
  makeCanvas(row, w, h, dpr, padX, padT, padB) {
    const cv = document.createElement("canvas");
    cv.className = "bub-droop";
    cv.style.zIndex = String(1000 - [...this.list.querySelectorAll(".row")].indexOf(row));
    cv.width = Math.round((w + padX * 2) * dpr);
    cv.height = Math.round((h + padT + padB) * dpr);
    cv.style.width = (w + padX * 2) + "px";
    cv.style.height = (h + padT + padB) + "px";
    this.layer.appendChild(cv);
    return cv;
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
      const kind = droopRecordKind(rec);
      const st = this.map.get(row);
      const same = st && st.t === t && ((kind === "off" && st.mode === "soft" && !st.on) || (kind === "soft" && st.mode === "soft" && st.on) || (kind === "fall" && st.mode === "fall"));
      if (same) continue;
      this.apply(row, on, Number.isFinite(t) ? t : now, rec.by);
    }
    for (const row of [...this.map.keys()]) {
      if (!seen.has(row.dataset.k)) this.clear(row);
    }
    /* 剛被某人打開的軟掉：通知這台的貓去爬。舊資料進房時 t 已經超過新鮮時間，不會播。 */
    if (!this.climbSeen) this.climbSeen = new Set();
    for (const id of droopClimbIds(this.last, now, this.climbSeen)) {
      this.climbSeen.add(id);
      try { window.dispatchEvent(new CustomEvent("sc-droop-climb", { detail: { id } })); } catch (_) {}
    }
    void now;
  },
  draw(st, now) {
    if (st.mode === "soft") return this.drawSoft(st, now);
    if (!st.cv || !st.snap) return;
    const amt = droopSag(now - st.t);
    st.amt = amt;
    const theta = amt * DROOP.ANGLE_DEG * Math.PI / 180;
    const e = now - st.t;
    const env = e > 0 && e < DROOP.SAG_MS ? Math.sin(Math.PI * e / DROOP.SAG_MS) : 0;
    const jelly = Math.sin(e / 68) * DROOP.JELLY_PX * env;
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
        const u = (st.right ? C - q : q) / C;
        sr.push({ x: sx, y: sy });
        pr.push(bendPt(cl, st, sx, sy, jelly * Math.sin(u * Math.PI)));
      }
      P.push(pr); S.push(sr);
    }
    const img = st.snap.canvas;
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) {
      drawTri(c, img, sc, S[r][q], S[r][q + 1], S[r + 1][q], P[r][q], P[r][q + 1], P[r + 1][q]);
      drawTri(c, img, sc, S[r][q + 1], S[r + 1][q + 1], S[r + 1][q], P[r][q + 1], P[r + 1][q + 1], P[r + 1][q]);
    }
  },
  drawSoft(st, now) {
    if (!st.cv || !st.snap) return;
    const amt = softAmt(st, now);
    st.amt = amt;
    const theta = amt * DROOP.SOFT_ANGLE_DEG * Math.PI / 180;
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
    const cl = softCenterline(st.w, theta);
    const C = DROOP.COLS, R = DROOP.ROWS, P = [], S = [];
    for (let r = 0; r <= R; r++) {
      const pr = [], sr = [];
      for (let q = 0; q <= C; q++) {
        const sx = st.w * q / C, sy = st.h * r / R;
        sr.push({ x: sx, y: sy });
        pr.push(softBend(cl, st, sx, sy));
      }
      P.push(pr); S.push(sr);
    }
    const img = st.snap.canvas;
    for (let r = 0; r < R; r++) for (let q = 0; q < C; q++) {
      drawTri(c, img, sc, S[r][q], S[r][q + 1], S[r + 1][q], P[r][q], P[r][q + 1], P[r + 1][q]);
      drawTri(c, img, sc, S[r][q + 1], S[r + 1][q + 1], S[r + 1][q], P[r][q + 1], P[r + 1][q + 1], P[r + 1][q]);
    }
  },
  place(st, dy, spin) {
    if (!st.cv) return;
    const lr = this.layer.getBoundingClientRect();
    const br = st.bub.getBoundingClientRect();
    const x = br.left + br.width / 2 - st.w / 2 - lr.left - st.padX;
    const y = br.top + br.height / 2 - st.h / 2 - lr.top - st.padT;
    const rot = spin ? " rotate(" + spin.toFixed(2) + "deg)" : "";
    st.cv.style.transform = "translate3d(" + x.toFixed(1) + "px," + (y + (dy || 0)).toFixed(1) + "px,0)" + rot;
    return { x, y };
  },
  park(st, dy, spin) {
    if (!st.cv || !st.release) return;
    const rot = spin ? " rotate(" + spin.toFixed(2) + "deg)" : "";
    st.cv.style.transform = "translate3d(" + st.release.x.toFixed(1) + "px," + (st.release.y + dy).toFixed(1) + "px,0)" + rot;
  },
  /* 圖層釘在整個視窗（樣式 position:fixed），不再跟著捲動區的高度，掉下去才不會被列表裁掉。 */
  syncLayer() {},
  tick() {
    this.raf = 0;
    if (!this.map.size) return;
    const now = this.now();
    for (const [row, st] of [...this.map]) {
      if (!row.isConnected || !st.bub.isConnected) { this.clear(row); continue; }
      try {
        if (st.mode === "soft") { this.tickSoft(row, st, now); continue; }
        const elapsed = now - st.t;
        const phase = droopPhase(elapsed, st.fallMs, st.reduced);
        if (phase === "done") { if (this.intent) this.intent.set(row, "normal"); this.clear(row); continue; }
        if (st.reduced) {
          let opacity = 0;
          if (phase === "fadeout") opacity = 1 - clamp01(elapsed / DROOP.REDUCE_OUT_MS);
          else if (phase === "fade") opacity = clamp01((elapsed - DROOP.REDUCE_OUT_MS - DROOP.GONE_MS) / DROOP.FADE_MS);
          st.bub.classList.remove("droop");
          st.bub.style.opacity = String(opacity);
          continue;
        }
        if (phase === "sag") {
          st.bub.classList.add("droop");
          st.bub.style.opacity = "";
          if (st.cv) st.cv.style.visibility = "";
          this.draw(st, now);
          this.place(st, 0, 0);
          continue;
        }
        if (phase === "fall") {
          st.bub.classList.add("droop");
          st.bub.style.opacity = "";
          if (!st.release) {
            this.draw(st, st.t + DROOP.SAG_MS);
            const pos = this.place(st, 0, 0);
            st.release = pos || { x: 0, y: 0 };
            if (st.cv) {
              st.cv.style.visibility = "";
              const visualTop = st.cv.getBoundingClientRect().top + st.inkTop;
              st.fallMs = droopFallMs(window.innerHeight - visualTop + DROOP.FALL_MARGIN);
            }
          }
          const ft = elapsed - DROOP.SAG_MS;
          const spin = (st.right ? -1 : 1) * DROOP.FALL_SPIN_DEG * clamp01(ft / 900);
          this.park(st, droopFallY(ft), spin);
          continue;
        }
        if (phase === "gone") {
          st.bub.classList.add("droop");
          st.bub.style.opacity = "";
          try { st.cv?.remove(); st.cv = null; } catch (_) {}
          continue;
        }
        /* fade：原位從透明慢慢回來。空位一直都在（泡泡節點沒有拿掉）。 */
        try { st.cv?.remove(); st.cv = null; } catch (_) {}
        st.bub.classList.remove("droop");
        const p = (elapsed - DROOP.SAG_MS - st.fallMs - DROOP.GONE_MS) / DROOP.FADE_MS;
        st.bub.style.opacity = String(clamp01(p));
      } catch (err) {
        /* 畫壞了：收掉這一則的垂下畫布、泡泡恢復原狀，其他則照常（不讓整個 rAF 鏈斷掉） */
        try { console.warn("[droop] 已自動恢復：", err); } catch (_) {}
        this.clear(row);
      }
    }
    if (this.map.size) this.kick();
  },
  tickSoft(row, st, now) {
    const e = now - st.t;
    const settled = st.on ? e > DROOP.SOFT_MS + 40 : e > DROOP.RECOVER_MS;
    if (!st.on && settled) { this.clear(row); return; }
    st.bub.classList.add("droop");
    st.bub.style.opacity = "";
    if (!settled || !st.drawnFinal) { this.draw(st, now); st.drawnFinal = !!(settled && st.on); }
    this.place(st, 0, 0);
    if (st.cv) st.cv.style.visibility = "";
  },
  kick() { if (!this.raf) this.raf = requestAnimationFrame(() => this.tick()); },
};
try { if (typeof window !== "undefined") window.__droop = Droop; } catch (_) {}
