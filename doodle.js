/* 房間塗鴉板。
   畫布是固定的直式邏輯尺寸。筆畫、形狀、筆尖都存 0–1 相對座標，
   各端只把這張畫布等比縮放，不裁切、不變形。存檔也輸出同一張尺寸。 */

export const DOODLE_W = 900;
export const DOODLE_H = 1200;
export const DOODLE_RATIO = DOODLE_W / DOODLE_H;
export const Q = 10000;
export const MAX_STROKES = 240;
export const MAX_POINTS = 180;
export const MAX_GALLERY = 20;
export const MAX_JPEG = 140000;
const SIZE = { s: 0.012, m: 0.022, l: 0.038 };
const SHAPE = { circle: 1, line: 1, rect: 1 };
const TOOLS = ["pen", "marker", "high", "brush", "water", "circle", "line", "rect"];
const SWATCHES = ["#1a1a1a", "#ffffff", "#e23b3b", "#f08a24", "#f2c14e", "#2f9e57", "#2f6fed", "#7a4de0", "#e56aaa", "#8a5a3b"];

export function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}
export function quantize(n) {
  return Math.round(clamp01(n) * Q);
}
export function dequant(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n / Q));
}
export function fitBox(boxW, boxH) {
  const w0 = Math.max(0, Number(boxW) || 0);
  const h0 = Math.max(0, Number(boxH) || 0);
  if (w0 < 1 || h0 < 1) return { w: 0, h: 0, x: 0, y: 0 };
  let w = w0;
  let h = w / DOODLE_RATIO;
  if (h > h0) {
    h = h0;
    w = h * DOODLE_RATIO;
  }
  return {
    w, h,
    x: (w0 - w) / 2,
    y: (h0 - h) / 2,
  };
}
export function clientToUnit(clientX, clientY, rect) {
  const w = rect && rect.width ? rect.width : 1;
  const h = rect && rect.height ? rect.height : 1;
  return {
    x: clamp01((clientX - (rect ? rect.left : 0)) / w),
    y: clamp01((clientY - (rect ? rect.top : 0)) / h),
  };
}
export function unitToPx(x, y, w, h) {
  return { x: clamp01(x) * w, y: clamp01(y) * h };
}
export function sideCode(side) {
  return side === "m" || side === "f" ? side : "n";
}
export function toneOf(side) {
  const s = side === "n" ? "" : side;
  if (s === "m") return "mai";
  if (s === "f") return "xin";
  return "plain";
}
export function ringOf(side) {
  const s = side === "n" ? "" : side;
  if (s === "m") return "blue";
  if (s === "f") return "pink";
  return "gray";
}
export function encodeXY(p) {
  return quantize(p.x) + "," + quantize(p.y);
}
export function decodeXY(raw) {
  const m = String(raw || "").match(/^(\d{1,5}),(\d{1,5})$/);
  if (!m) return null;
  return { x: dequant(m[1]), y: dequant(m[2]) };
}
export function simplifyPts(pts, max = MAX_POINTS) {
  const list = Array.isArray(pts) ? pts.filter((p) => p && Number.isFinite(Number(p.x))) : [];
  if (list.length <= max) return list;
  if (max < 2) return list.slice(0, Math.max(0, max));
  const out = [];
  for (let i = 0; i < max; i++) out.push(list[Math.round(i * (list.length - 1) / (max - 1))]);
  return out;
}
export function encodePts(pts) {
  return simplifyPts(pts).map((p) => quantize(p.x) + "," + quantize(p.y) + "," + quantize(p.r)).join(";");
}
export function strokeToken(s) {
  if (!s) return "";
  if (s.tool === "circle" || s.tool === "line" || s.tool === "rect") {
    const a = s.a || {}, b = s.b || {};
    return [s.tool, s.by, s.t, s.color, quantize(a.x), quantize(a.y), quantize(b.x), quantize(b.y)].join(":");
  }
  const pts = s.pts || [];
  const last = pts[pts.length - 1] || { x: 0, y: 0 };
  return [s.tool, s.by, s.t, s.color, pts.length, quantize(last.x), quantize(last.y)].join(":");
}
/* 筆畫編號從 1 起。Firebase 的 val() 會把這種整數鍵收成「第 0 格是洞」的陣列。
   用 map 再 for...of 會在那個洞上丟例外，整包快照因此套不進去，
   雙方就只剩自己還沒被伺服器確認的筆。Object.entries 會跳過洞。 */
function strokeEntries(node) {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node);
}
export function flattenStrokes(val) {
  const out = [];
  for (const [key, node] of strokeEntries(val)) {
    if (!node || typeof node !== "object") continue;
    if (node.tool) {
      const s = decodeStroke(key, node);
      if (s) out.push(s);
      continue;
    }
    for (const [slot, raw] of strokeEntries(node)) {
      if (!raw || typeof raw !== "object") continue;
      const s = decodeStroke(key + "/" + slot, raw);
      if (s) out.push(s);
    }
  }
  return out;
}
export function mergeStrokes(remote, pending) {
  const remoteById = new Map((remote || []).map((s) => [String(s.id), s]));
  const keep = [];
  for (const p of pending || []) {
    if (!p) continue;
    const r = remoteById.get(String(p.id));
    if (!r || strokeToken(r) !== strokeToken(p)) keep.push(p);
  }
  const hide = new Set(keep.map((s) => String(s.id)));
  return (remote || []).filter((s) => !hide.has(String(s.id))).concat(keep);
}
const INVITE_MS = 120000;
export function inviteEffect(rec, me, now, seenId) {
  if (!rec || !rec.id || rec.phase == null) return { dialog: false, open: false, tell: "" };
  const fresh = now - Number(rec.t || 0) < INVITE_MS;
  if (!fresh) return { dialog: false, open: false, tell: "" };
  if (rec.phase === "yes") return { dialog: false, open: true, tell: "" };
  if (rec.phase === "no" && rec.by === me) return { dialog: false, open: false, tell: "對方這次先不畫" };
  if (rec.phase === "ask" && rec.by !== me && rec.id !== seenId) return { dialog: true, open: false, tell: "" };
  return { dialog: false, open: false, tell: "" };
}
/* 存檔與清除都要對方點頭。人在房裡就會看到詢問，白板開沒開不算。
   yes 只讓提出的人動手；no 只通知提出的人，筆畫與作品集都不動。 */
export function consentEffect(rec, me, seenKey, refuseTell) {
  if (!rec || !rec.id || rec.phase == null) return { dialog: false, act: false, tell: "" };
  const key = String(rec.id) + ":" + rec.phase;
  if (rec.phase === "yes" && rec.by === me) return { dialog: false, act: true, tell: "" };
  if (rec.phase === "no" && rec.by === me && key !== seenKey) return { dialog: false, act: false, tell: refuseTell || "" };
  if (rec.phase === "ask" && rec.by !== me && key !== seenKey) return { dialog: true, act: false, tell: "" };
  return { dialog: false, act: false, tell: "" };
}
/* 毛筆只存取樣點。快拖時兩點距離會大於筆尖，直接蓋圓印就變成一顆顆點。
   畫的時候沿線補點，間距是筆尖半徑的一小段，半徑也跟著兩端漸變。
   存檔和對方都走這條，精簡過的點也一樣連續。 */
export function brushStamps(pts) {
  const list = (Array.isArray(pts) ? pts : []).filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)));
  if (!list.length) return [];
  const out = [{ x: Number(list[0].x), y: Number(list[0].y), r: Number(list[0].r) || 0 }];
  const minSide = Math.min(DOODLE_W, DOODLE_H);
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1];
    const b = list[i];
    const dist = Math.hypot((b.x - a.x) * DOODLE_W, (b.y - a.y) * DOODLE_H);
    const ra = Math.max(0.4, (Number(a.r) || 0) * minSide);
    const rb = Math.max(0.4, (Number(b.r) || 0) * minSide);
    const step = Math.max(0.5, Math.min(ra, rb) * 0.42);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        r: (Number(a.r) || 0) + ((Number(b.r) || 0) - (Number(a.r) || 0)) * t,
      });
    }
  }
  return out;
}
export function decodePts(raw) {
  if (!raw) return [];
  return String(raw).split(";").slice(0, MAX_POINTS).map((part) => {
    const m = part.match(/^(\d{1,5}),(\d{1,5}),(\d{1,5})$/);
    if (!m) return null;
    return { x: dequant(m[1]), y: dequant(m[2]), r: dequant(m[3]) };
  }).filter(Boolean);
}
export function encodeStroke(s) {
  const out = { by: String(s.by || ""), tool: s.tool, color: String(s.color || "#1a1a1a").toLowerCase(), z: s.z === "s" || s.z === "l" ? s.z : "m", t: Number(s.t) || 0 };
  if (SHAPE[s.tool]) {
    out.a = encodeXY(s.a || { x: 0, y: 0 });
    out.b = encodeXY(s.b || { x: 0, y: 0 });
  } else {
    out.pts = encodePts(s.pts || []);
  }
  return out;
}
export function decodeStroke(id, raw) {
  if (!raw || typeof raw !== "object" || !TOOLS.includes(raw.tool)) return null;
  const stroke = { id, by: String(raw.by || ""), tool: raw.tool, color: String(raw.color || "#1a1a1a"), z: raw.z === "s" || raw.z === "l" ? raw.z : "m", t: Number(raw.t) || 0 };
  if (SHAPE[raw.tool]) {
    stroke.a = decodeXY(raw.a) || { x: 0, y: 0 };
    stroke.b = decodeXY(raw.b) || { x: 0, y: 0 };
  } else {
    stroke.pts = decodePts(raw.pts);
    if (!stroke.pts.length) return null;
  }
  return stroke;
}
export function peerOpen(openMap, me) {
  return Object.keys(openMap || {}).some((id) => id !== me && openMap[id] === true);
}
export function ownUndoId(strokes, me) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokes[i] && strokes[i].by === me) return strokes[i].id;
  }
  return "";
}
export function formatStamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "/" + p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
export function allocSlot(ids, max) {
  const used = new Set((ids || []).map((id) => String(id)));
  for (let i = 1; i <= max; i++) if (!used.has(String(i))) return String(i);
  return "";
}
export function jpegWithin(canvas, maxLen = MAX_JPEG) {
  if (!canvas || typeof canvas.toDataURL !== "function") return "";
  let q = 0.72;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > maxLen && q > 0.4) {
    q = Math.round((q - 0.08) * 100) / 100;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url.length <= maxLen ? url : "";
}

function $(doc, id) { return doc.getElementById(id); }

export function mountDoodle(doc, hooks) {
  const sheet = $(doc, "doodleSheet");
  const stage = $(doc, "doodleStage");
  const cv = $(doc, "doodleCv");
  if (!sheet || !stage || !cv) return { open() {}, note() {}, setSide() {}, close() {} };
  const ctx = cv.getContext("2d");
  const nibs = $(doc, "doodleNibs");
  let me = "";
  let mySide = "n";
  let mode = "draw";
  let tool = "pen";
  let size = "m";
  let color = "#1a1a1a";
  let hsv = { h: 0, s: 0, v: 0.1 };
  let draft = "#1a1a1a";
  let boardOn = false;
  let api = null;
  let room = "";
  let alive = () => false;
  let server = [];
  let pending = new Map();
  let drawing = null;
  let shape = null;
  let openMap = {};
  let sideMap = {};
  let nibMap = {};
  let gallery = {};
  let saveRec = null;
  let inviteRec = null;
  let seenInvite = "";
  let clearRec = null;
  let seenSave = "";
  let seenClear = "";
  let committing = false;
  let clearing = false;
  let writeTimer = 0;
  let nibTimer = 0;

  function toast(text) { try { hooks.toast?.(text); } catch (_) {} }
  function strokes() {
    return mergeStrokes(server, [...pending.values()]).sort((a, b) => (a.t || 0) - (b.t || 0) || String(a.id).localeCompare(String(b.id)));
  }
  function strokePath(s) {
    const slot = s.slot || String(s.id).split("/").pop();
    return `rooms/${room}/doodle/strokes/${s.by}/${slot}`;
  }
  function layout() {
    const paper = $(doc, "doodlePaper");
    if (!paper) return;
    const box = paper.getBoundingClientRect();
    const fit = fitBox(box.width, box.height);
    stage.style.width = fit.w + "px";
    stage.style.height = fit.h + "px";
    const dpr = Math.min(2, doc.defaultView?.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(fit.w * dpr));
    const h = Math.max(1, Math.round(fit.h * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    paint();
  }
  function paint() {
    const w = cv.width, h = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, w, h);
    for (const s of strokes()) drawStroke(ctx, w, h, s);
    if (shape) drawStroke(ctx, w, h, shape);
    if (drawing && drawing.pts.length) drawStroke(ctx, w, h, drawing);
  }
  function exportCanvas() {
    const c = doc.createElement("canvas");
    c.width = DOODLE_W;
    c.height = DOODLE_H;
    const x = c.getContext("2d");
    x.fillStyle = "#fffdf8";
    x.fillRect(0, 0, DOODLE_W, DOODLE_H);
    for (const s of strokes()) drawStroke(x, DOODLE_W, DOODLE_H, s);
    return c;
  }
  function setBoard(on) {
    boardOn = !!on;
    sheet.classList.toggle("on", boardOn);
    $(doc, "chat")?.classList.toggle("doodle-on", boardOn);
    const btn = $(doc, "doodleBoard");
    if (btn) {
      btn.textContent = boardOn ? "關" : "開";
      btn.classList.toggle("on", boardOn);
      btn.setAttribute("aria-label", boardOn ? "關閉塗鴉板" : "打開塗鴉板");
    }
    const input = $(doc, "sendForm");
    if (input) doc.documentElement.style.setProperty("--doodle-in", Math.ceil(input.getBoundingClientRect().height) + "px");
    if (boardOn) requestAnimationFrame(layout);
    if (api && me) {
      const ref = api.ref(api.db, `rooms/${room}/doodle/open/${me}`);
      if (boardOn) {
        api.set(ref, true).catch(() => {});
        try { api.onDisconnect(ref).remove(); } catch (_) {}
      } else {
        api.remove(ref).catch(() => {});
        const nib = api.ref(api.db, `rooms/${room}/doodle/nib/${me}`);
        api.remove(nib).catch(() => {});
      }
    }
    paintRings();
  }
  function publishSide(side) {
    mySide = sideCode(side);
    if (!api || !me || !room) return;
    api.set(api.ref(api.db, `rooms/${room}/doodle/side/${me}`), mySide).catch(() => {});
  }
  function paintRings() {
    const box = $(doc, "doodleRings");
    if (!box) return;
    box.replaceChildren();
    const ids = Object.keys(openMap).filter((id) => openMap[id] === true);
    ids.sort((a, b) => (a === me ? -1 : b === me ? 1 : a < b ? -1 : 1));
    for (const id of ids) {
      const i = doc.createElement("i");
      const side = id === me ? mySide : sideMap[id];
      i.className = "c-doodle-dot " + ringOf(side);
      box.appendChild(i);
    }
  }
  function paintNibs() {
    if (!nibs) return;
    nibs.replaceChildren();
    for (const id of Object.keys(nibMap)) {
      if (id === me) continue;
      const n = nibMap[id];
      if (!n || !n.on) continue;
      const dot = doc.createElement("i");
      dot.className = "c-doodle-nib " + ringOf(sideMap[id]);
      dot.style.left = (dequant(n.x) * 100) + "%";
      dot.style.top = (dequant(n.y) * 100) + "%";
      nibs.appendChild(dot);
    }
  }
  function syncMode() {
    doc.querySelectorAll("[data-doodle-mode]").forEach((el) => {
      el.classList.toggle("on", el.dataset.doodleMode === (mode === "draw" ? "draw" : mode));
    });
  }
  function radius(speed) {
    let k = 1;
    if (tool === "brush") k = Math.max(0.28, Math.min(1.25, 1.05 - speed * 0.9));
    if (tool === "marker") k = 1.15;
    if (tool === "high") k = 1.35;
    if (tool === "water") k = 1.05;
    if (tool === "pen") k = 0.55;
    return (SIZE[size] || SIZE.m) * k;
  }
  function pointerUnit(e) {
    return clientToUnit(e.clientX, e.clientY, cv.getBoundingClientRect());
  }
  function queueNib(p, on) {
    if (!api || !me) return;
    clearTimeout(nibTimer);
    nibTimer = setTimeout(() => {
      api.set(api.ref(api.db, `rooms/${room}/doodle/nib/${me}`), {
        x: quantize(p.x), y: quantize(p.y), on: !!on,
      }).catch(() => {});
    }, 40);
  }
  function flushStroke(final) {
    if (!drawing || !api) return;
    const packed = encodeStroke(drawing);
    if (!packed.pts) return;
    pending.set(drawing.id, { ...drawing, pts: drawing.pts.slice() });
    api.set(api.ref(api.db, strokePath(drawing)), packed).catch(() => {});
    if (final) drawing = null;
  }
  function down(e) {
    if (!boardOn || (e.button && e.button !== 0)) return;
    try { e.preventDefault(); } catch (_) {}
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = pointerUnit(e);
    queueNib(p, true);
    if (SHAPE[mode]) {
      shape = { id: "", by: me, tool: mode, color, z: size, t: Date.now(), a: p, b: { ...p } };
      paint();
      return;
    }
    const slot = takeStrokeId();
    drawing = { id: me + "/" + slot, slot, by: me, tool, color, z: size, t: Date.now(), pts: [], last: null, at: performance.now() };
    pushPoint(p, drawing.at);
  }
  function move(e) {
    if (!boardOn) return;
    const p = pointerUnit(e);
    if (shape) { shape.b = p; queueNib(p, true); paint(); return; }
    if (!drawing) return;
    queueNib(p, true);
    pushPoint(p, performance.now());
  }
  function pushPoint(p, now) {
    const prev = drawing.last;
    const dt = prev ? Math.max(8, now - drawing.at) : 16;
    const dist = prev ? Math.hypot((p.x - prev.x) * DOODLE_W, (p.y - prev.y) * DOODLE_H) : 0;
    const pt = { x: p.x, y: p.y, r: radius(dist / dt) };
    if (drawing.pts.length >= MAX_POINTS) drawing.pts = simplifyPts(drawing.pts, MAX_POINTS - 1);
    drawing.pts.push(pt);
    drawing.last = p;
    drawing.at = now;
    paint();
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => flushStroke(false), 90);
  }
  function up() {
    queueNib(drawing ? drawing.last || { x: 0, y: 0 } : (shape ? shape.b : { x: 0, y: 0 }), false);
    if (shape) {
      const far = Math.hypot(shape.a.x - shape.b.x, shape.a.y - shape.b.y);
      if (far > 0.01) {
        const slot = takeStrokeId();
        shape.id = me + "/" + slot;
        shape.slot = slot;
        shape.by = me;
        shape.t = Date.now();
        pending.set(shape.id, shape);
        if (api) api.set(api.ref(api.db, strokePath(shape)), encodeStroke(shape)).catch(() => {});
      }
      shape = null;
      paint();
      return;
    }
    if (!drawing) return;
    clearTimeout(writeTimer);
    if (drawing.tool === "brush" && drawing.pts.length > 4) {
      const n = Math.min(6, Math.floor(drawing.pts.length / 3));
      for (let i = 0; i < n; i++) {
        drawing.pts[i].r *= 0.35 + 0.65 * (i / n);
        drawing.pts[drawing.pts.length - 1 - i].r *= 0.25 + 0.75 * (i / n);
      }
    }
    flushStroke(true);
    paint();
  }
  function takeStrokeId() {
    const mine = strokes().filter((s) => s.by === me);
    const used = mine.map((s) => String(s.id).split("/").pop());
    const free = allocSlot(used, MAX_STROKES);
    if (free) return free;
    const oldest = mine.slice().sort((a, b) => (a.t || 0) - (b.t || 0) || String(a.id).localeCompare(String(b.id)))[0];
    pending.delete(oldest.id);
    server = server.filter((s) => s.id !== oldest.id);
    return String(oldest.id).split("/").pop();
  }
  function undo() {
    const id = ownUndoId(strokes(), me);
    if (!id) { toast("沒有可收回的筆畫"); return; }
    pending.delete(id);
    server = server.filter((s) => s.id !== id);
    paint();
    const mine = id.startsWith(me + "/") ? id.slice(me.length + 1) : id;
    if (api) api.remove(api.ref(api.db, `rooms/${room}/doodle/strokes/${me}/${mine}`)).catch(() => {});
  }
  function show(el, on) {
    if (!el) return;
    el.hidden = !on;
    if (on) requestAnimationFrame(() => el.classList.add("is-in"));
    else el.classList.remove("is-in");
  }
  async function commitSave() {
    if (committing || !api) return;
    committing = true;
    try {
      const url = jpegWithin(exportCanvas(), MAX_JPEG);
      if (!url) { toast("這張圖太大，先少畫一點"); return; }
      const old = Object.keys(gallery);
      let id = allocSlot(old, MAX_GALLERY);
      if (!id) {
        old.sort((a, b) => (gallery[a].t || 0) - (gallery[b].t || 0));
        id = old[0];
        await api.remove(api.ref(api.db, `rooms/${room}/doodle/g/${id}`));
      }
      await api.set(api.ref(api.db, `rooms/${room}/doodle/g/${id}`), { by: me, t: Date.now(), jpg: url });
      await api.remove(api.ref(api.db, `rooms/${room}/doodle/strokes`));
      await api.remove(api.ref(api.db, `rooms/${room}/doodle/save`));
      server = [];
      pending.clear();
      paint();
      toast("已存進作品集");
    } catch (_) {
      toast("存檔沒寫上，請再試一次");
    } finally {
      committing = false;
    }
  }
  function fillSave(mode) {
    const peer = mode === "peer";
    const title = $(doc, "doodleConfirmTitle");
    const text = $(doc, "doodleConfirmText");
    const yes = $(doc, "doodleSaveYes");
    const no = $(doc, "doodleSaveNo");
    if (title) title.textContent = peer ? "同意存檔" : "存檔";
    if (text) text.textContent = "確定存檔並清空嗎？";
    if (yes) yes.textContent = peer ? "同意" : "送出請求";
    if (no) no.textContent = peer ? "拒絕" : "取消";
    sheet.dataset.save = peer ? "peer" : "ask";
  }
  function askSave() {
    fillSave("ask");
    show($(doc, "doodleConfirm"), true);
  }
  async function commitClear() {
    if (clearing || !api) return;
    clearing = true;
    try {
      await api.remove(api.ref(api.db, `rooms/${room}/doodle/strokes`));
      await api.remove(api.ref(api.db, `rooms/${room}/doodle/clear`));
      server = [];
      pending.clear();
      paint();
      toast("已清除");
    } catch (_) {
      toast("清除沒寫上，請再試一次");
    } finally {
      clearing = false;
    }
  }
  function fillClear(mode) {
    const peer = mode === "peer";
    const title = $(doc, "doodleClearTitle");
    const text = $(doc, "doodleClearText");
    const yes = $(doc, "doodleClearYes");
    const no = $(doc, "doodleClearNo");
    if (title) title.textContent = peer ? "同意清除" : "清除";
    if (text) text.textContent = "確定清除整張板嗎？不會存進作品集。";
    if (yes) yes.textContent = peer ? "同意" : "送出請求";
    if (no) no.textContent = peer ? "拒絕" : "取消";
    sheet.dataset.clear = peer ? "peer" : "ask";
  }
  function askClear() {
    if (clearRec && clearRec.by === me && clearRec.phase === "ask") {
      toast("已經在等對方");
      return;
    }
    fillClear("ask");
    show($(doc, "doodleClearAsk"), true);
  }
  function takeConsent(rec, seen, refuseTell) {
    const effect = consentEffect(rec, me, seen, refuseTell);
    const next = effect.dialog ? rec.id + ":ask" : effect.tell ? rec.id + ":no" : seen;
    return { effect, seen: next };
  }
  function renderGallery() {
    const grid = $(doc, "doodleGrid");
    if (!grid) return;
    grid.replaceChildren();
    const items = Object.keys(gallery).map((id) => ({ id, ...gallery[id] })).sort((a, b) => (b.t || 0) - (a.t || 0));
    if (!items.length) {
      const p = doc.createElement("p");
      p.className = "c-doodle-empty";
      p.textContent = "還沒有作品";
      grid.appendChild(p);
      return;
    }
    for (const g of items) {
      const b = doc.createElement("button");
      b.type = "button";
      b.className = "c-doodle-cell";
      b.innerHTML = "<img alt=''><small></small>";
      b.querySelector("img").src = g.jpg || "";
      b.querySelector("small").textContent = formatStamp(g.t || Date.now());
      b.addEventListener("click", () => openView(g.id));
      grid.appendChild(b);
    }
  }
  function openView(id) {
    const g = gallery[id];
    if (!g) return;
    $(doc, "doodleView").dataset.id = id;
    $(doc, "doodleViewImg").src = g.jpg || "";
    $(doc, "doodleViewTime").textContent = formatStamp(g.t || Date.now());
    show($(doc, "doodleView"), true);
  }
  function note(m) {
    if (!boardOn || !m || m.kind !== "tx") return;
    const text = String(m.body && m.body.d || "").trim();
    if (!text) return;
    const side = m.s === me ? mySide : sideMap[m.s];
    const el = doc.createElement("div");
    el.className = "c-doodle-floater " + toneOf(side);
    el.textContent = text;
    $(doc, "doodleFloats")?.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.add("out");
      const done = () => el.remove();
      el.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 700);
    }, 5000);
  }
  function bindUI() {
    $(doc, "doodleInvite")?.addEventListener("click", (e) => {
      e.stopPropagation();
      hooks.closeGear?.();
      if (!api) { toast("還在連線中，請稍候一下"); return; }
      const now = Date.now();
      if (inviteRec && inviteRec.by === me && inviteRec.phase === "ask" && now - Number(inviteRec.t || 0) < 120000) {
        toast("已經邀請了");
        return;
      }
      const id = now.toString(36);
      api.set(api.ref(api.db, `rooms/${room}/doodle/invite`), { id, by: me, phase: "ask", t: now }).catch(() => toast("邀請沒送出"));
      toast("已邀請對方一起塗鴉");
    });
    $(doc, "doodleBoard")?.addEventListener("click", (e) => {
      e.stopPropagation();
      hooks.closeGear?.();
      setBoard(!boardOn);
    });
    $(doc, "doodleClose")?.addEventListener("click", () => setBoard(false));
    $(doc, "doodleBrush")?.addEventListener("change", (e) => { tool = e.target.value; mode = "draw"; syncMode(); });
    $(doc, "doodleChip")?.addEventListener("click", () => openPicker());
    doc.querySelectorAll("[data-doodle-size]").forEach((b) => b.addEventListener("click", () => {
      size = b.dataset.doodleSize;
      doc.querySelectorAll("[data-doodle-size]").forEach((el) => el.classList.toggle("on", el === b));
    }));
    doc.querySelectorAll("[data-doodle-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.doodleMode === "draw" ? "draw" : b.dataset.doodleMode;
      syncMode();
    }));
    $(doc, "doodleUndo")?.addEventListener("click", undo);
    $(doc, "doodleSave")?.addEventListener("click", askSave);
    $(doc, "doodleClear")?.addEventListener("click", askClear);
    $(doc, "doodleSaveNo")?.addEventListener("click", () => {
      show($(doc, "doodleConfirm"), false);
      if (sheet.dataset.save === "peer" && saveRec && api) {
        api.update(api.ref(api.db, `rooms/${room}/doodle/save`), { phase: "no" }).catch(() => {});
      }
    });
    $(doc, "doodleSaveYes")?.addEventListener("click", () => {
      show($(doc, "doodleConfirm"), false);
      if (!api) { toast("還在連線中，請稍候一下"); return; }
      if (sheet.dataset.save === "peer") {
        if (saveRec && saveRec.phase === "ask") api.update(api.ref(api.db, `rooms/${room}/doodle/save`), { phase: "yes" }).catch(() => {});
        return;
      }
      const id = Date.now().toString(36);
      api.set(api.ref(api.db, `rooms/${room}/doodle/save`), { id, by: me, phase: "ask", t: Date.now() }).catch(() => toast("沒能請問對方"));
      toast("等對方同意");
    });
    $(doc, "doodleClearNo")?.addEventListener("click", () => {
      show($(doc, "doodleClearAsk"), false);
      if (sheet.dataset.clear === "peer" && clearRec && api) {
        api.update(api.ref(api.db, `rooms/${room}/doodle/clear`), { phase: "no" }).catch(() => {});
      }
    });
    $(doc, "doodleClearYes")?.addEventListener("click", () => {
      show($(doc, "doodleClearAsk"), false);
      if (!api) { toast("還在連線中，請稍候一下"); return; }
      if (sheet.dataset.clear === "peer") {
        if (clearRec && clearRec.phase === "ask") api.update(api.ref(api.db, `rooms/${room}/doodle/clear`), { phase: "yes" }).catch(() => {});
        return;
      }
      const id = Date.now().toString(36);
      api.set(api.ref(api.db, `rooms/${room}/doodle/clear`), { id, by: me, phase: "ask", t: Date.now() }).catch(() => toast("沒能請問對方"));
      toast("等對方同意");
    });
    $(doc, "doodleGallery")?.addEventListener("click", () => { renderGallery(); show($(doc, "doodleGal"), true); });
    $(doc, "doodleGalX")?.addEventListener("click", () => show($(doc, "doodleGal"), false));
    $(doc, "doodleViewX")?.addEventListener("click", () => show($(doc, "doodleView"), false));
    $(doc, "doodleViewDel")?.addEventListener("click", () => {
      const id = $(doc, "doodleView")?.dataset.id;
      show($(doc, "doodleView"), false);
      if (id && api) api.remove(api.ref(api.db, `rooms/${room}/doodle/g/${id}`)).catch(() => {});
    });
    $(doc, "doodleViewDown")?.addEventListener("click", () => {
      const g = gallery[$(doc, "doodleView")?.dataset.id];
      if (!g || !g.jpg) return;
      const a = doc.createElement("a");
      a.href = g.jpg;
      a.download = "doodle-" + formatStamp(g.t || Date.now()).replace(/[/: ]/g, "") + ".jpg";
      a.click();
    });
    $(doc, "doodleAskYes")?.addEventListener("click", () => {
      show($(doc, "doodleAsk"), false);
      if (api && inviteRec) api.update(api.ref(api.db, `rooms/${room}/doodle/invite`), { phase: "yes" }).catch(() => {});
      setBoard(true);
    });
    $(doc, "doodleAskNo")?.addEventListener("click", () => {
      show($(doc, "doodleAsk"), false);
      if (api && inviteRec) api.update(api.ref(api.db, `rooms/${room}/doodle/invite`), { phase: "no" }).catch(() => {});
    });
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    if (typeof ResizeObserver === "function") new ResizeObserver(() => { if (boardOn) layout(); }).observe($(doc, "doodlePaper"));
    bindPicker();
    const chip = $(doc, "doodleChip");
    if (chip) chip.style.background = color;
    syncMode();
  }
  function openPicker() {
    const rgb = hexRgb(color);
    hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    paintPicker();
    show($(doc, "doodlePicker"), true);
  }
  function paintPicker() {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    draft = hexOf(rgb[0], rgb[1], rgb[2]);
    const sv = $(doc, "doodleSv");
    if (sv) sv.style.background = "linear-gradient(to top,#000,transparent), linear-gradient(to right,#fff,hsl(" + hsv.h + ",100%,50%))";
    const dot = $(doc, "doodleSvDot");
    if (dot) { dot.style.left = (hsv.s * 100) + "%"; dot.style.top = ((1 - hsv.v) * 100) + "%"; dot.style.background = draft; }
    const hue = $(doc, "doodleHueDot");
    if (hue) { hue.style.left = (hsv.h / 360 * 100) + "%"; hue.style.top = "50%"; hue.style.background = "hsl(" + hsv.h + ",100%,50%)"; }
    doc.querySelectorAll("#doodleSwatches button").forEach((b) => b.classList.toggle("on", b.dataset.hex === draft));
  }
  function bindPicker() {
    const sw = $(doc, "doodleSwatches");
    if (sw && !sw.childElementCount) {
      for (const hex of SWATCHES) {
        const b = doc.createElement("button");
        b.type = "button";
        b.dataset.hex = hex;
        b.style.background = hex;
        b.setAttribute("aria-label", hex === "#ffffff" ? "白色" : hex);
        b.addEventListener("click", () => {
          const rgb = hexRgb(hex);
          hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
          paintPicker();
        });
        sw.appendChild(b);
      }
    }
    const drag = (el, move) => {
      if (!el) return;
      const go = (e) => {
        const r = el.getBoundingClientRect();
        move(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
        paintPicker();
      };
      el.addEventListener("pointerdown", (e) => { try { el.setPointerCapture(e.pointerId); } catch (_) {} go(e); });
      el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture?.(e.pointerId)) go(e); });
    };
    drag($(doc, "doodleSv"), (x, y) => { hsv.s = x; hsv.v = 1 - y; });
    drag($(doc, "doodleHue"), (x) => { hsv.h = x * 360; });
    $(doc, "doodlePickNo")?.addEventListener("click", () => show($(doc, "doodlePicker"), false));
    $(doc, "doodlePickYes")?.addEventListener("click", () => {
      color = draft || color;
      const chip = $(doc, "doodleChip");
      if (chip) chip.style.background = color;
      show($(doc, "doodlePicker"), false);
    });
  }
  function applyServer(val) {
    server = flattenStrokes(val);
    for (const [id, p] of [...pending.entries()]) {
      const remote = server.find((s) => s.id === id);
      if (remote && strokeToken(remote) === strokeToken(p)) pending.delete(id);
    }
    paint();
  }
  bindUI();

  return {
    note,
    setSide(side) { publishSide(side); paintRings(); paintNibs(); },
    close() {
      setBoard(false);
      boardOn = false;
      api = null;
      room = "";
      me = "";
    },
    open(fb, roomId, subs, isAlive, who) {
      api = fb;
      room = roomId;
      me = who && who.id ? who.id : "";
      alive = isAlive || (() => true);
      publishSide(who && who.side);
      const base = `rooms/${roomId}/doodle`;
      const watch = (path, fn) => {
        const off = api.onValue(api.ref(api.db, path), (snap) => {
          if (!alive()) return;
          fn(snap.val());
        });
        subs.push(off);
      };
      watch(base + "/strokes", applyServer);
      watch(base + "/open", (val) => {
        openMap = val && typeof val === "object" ? val : {};
        paintRings();
      });
      watch(base + "/side", (val) => { sideMap = val && typeof val === "object" ? val : {}; paintRings(); paintNibs(); });
      watch(base + "/nib", (val) => { nibMap = val && typeof val === "object" ? val : {}; paintNibs(); });
      watch(base + "/g", (val) => { gallery = val && typeof val === "object" ? val : {}; if (!$(doc, "doodleGal")?.hidden) renderGallery(); });
      let toldNo = "";
      watch(base + "/invite", (val) => {
        inviteRec = val && val.id ? val : null;
        const effect = inviteEffect(inviteRec, me, Date.now(), seenInvite);
        if (effect.dialog) {
          seenInvite = inviteRec.id;
          show($(doc, "doodleAsk"), true);
        }
        if (effect.open) setBoard(true);
        if (effect.tell && toldNo !== inviteRec.id) {
          toldNo = inviteRec.id;
          toast(effect.tell);
        }
      });
      watch(base + "/save", (val) => {
        saveRec = val && val.id ? val : null;
        const step = takeConsent(saveRec, seenSave, "對方先不要存");
        seenSave = step.seen;
        if (step.effect.dialog) {
          fillSave("peer");
          show($(doc, "doodleConfirm"), true);
        }
        if (step.effect.tell) {
          toast(step.effect.tell);
          api.remove(api.ref(api.db, base + "/save")).catch(() => {});
        }
        if (step.effect.act) commitSave();
      });
      watch(base + "/clear", (val) => {
        clearRec = val && val.id ? val : null;
        const step = takeConsent(clearRec, seenClear, "對方先不清除");
        seenClear = step.seen;
        if (step.effect.dialog) {
          fillClear("peer");
          show($(doc, "doodleClearAsk"), true);
        }
        if (step.effect.tell) {
          toast(step.effect.tell);
          api.remove(api.ref(api.db, base + "/clear")).catch(() => {});
        }
        if (step.effect.act) commitClear();
      });
      if (boardOn) setBoard(true);
    },
  };
}

function drawStroke(ctx, w, h, s) {
  if (SHAPE[s.tool]) return drawShape(ctx, w, h, s);
  const pts = s.pts || [];
  if (!pts.length) return;
  ctx.save();
  if (s.tool === "water") {
    for (const p of pts) blot(ctx, w, h, p, s.color);
  } else if (s.tool === "brush") {
    for (const p of brushStamps(pts)) stamp(ctx, unitToPx(p.x, p.y, w, h), p.r * Math.min(w, h), s.color, 0.9);
  } else {
    const alpha = s.tool === "high" ? 0.38 : 1;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = s.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, (pts[0].r || 0.01) * Math.min(w, h) * (s.tool === "marker" ? 2.4 : s.tool === "high" ? 3.2 : 1));
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = unitToPx(p.x, p.y, w, h);
      if (!i) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}
function stamp(ctx, q, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(q.x, q.y, Math.max(0.4, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function blot(ctx, w, h, p, color) {
  const q = unitToPx(p.x, p.y, w, h);
  const r = (p.r || 0.02) * Math.min(w, h) * 2.8;
  const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, Math.max(1, r));
  g.addColorStop(0, hexA(color, 0.22));
  g.addColorStop(1, hexA(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(q.x, q.y, Math.max(1, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawShape(ctx, w, h, s) {
  const a = unitToPx(s.a.x, s.a.y, w, h);
  const b = unitToPx(s.b.x, s.b.y, w, h);
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = Math.max(1.5, (SIZE[s.z] || SIZE.m) * Math.min(w, h) * 2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (s.tool === "line") { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  else if (s.tool === "rect") ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  else {
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(1, Math.abs(b.x - a.x) / 2), Math.max(1, Math.abs(b.y - a.y) / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
function hexA(hex, a) {
  const rgb = hexRgb(hex);
  return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
}
function hexRgb(hex) {
  const n = String(hex || "").replace("#", "");
  const v = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  if (!Number.isFinite(v)) return [26, 26, 26];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function hexOf(r, g, b) {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function hsvToRgb(h, s, v) {
  const c = v * s, hp = h / 60, x = c * (1 - Math.abs(hp % 2 - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
