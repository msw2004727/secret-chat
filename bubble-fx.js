/* 泡泡四態：堅挺、軟掉、斷掉、復原。
   寫進 rooms/<房>/bubbleFx/<訊息鍵> {state,t,by}，進房與重整都靠這份紀錄畫回來。
   軟掉／斷掉／復原同時寫進既有的 dr，連點手勢才不會跟環形選單各講各的。
   堅挺是軟掉的反方向（往上捲），dr 沒有這個形狀，只放在 bubbleFx。
   環形選單：8 顆直徑 48px 的圓鈕，繞著按壓點、半徑 81px 排滿 360°。 */
import { Droop, droopRecordKind, DROOP_CLIMB_FRESH_MS } from "./droop.js";

export const BUBBLE_RING = { COUNT: 8, DIAMETER: 48, RADIUS: 81 };
export const BUBBLE_FX_STATES = ["stiff", "soft", "break", "normal"];

export function bubbleFxNormalize(state) {
  return BUBBLE_FX_STATES.includes(state) ? state : null;
}

function drStateOf(rec) {
  if (!rec || typeof rec !== "object") return null;
  const kind = droopRecordKind(rec);
  if (kind === "fall") return "break";
  if (kind === "soft") return "soft";
  if (kind === "off") return "normal";
  return null;
}

/* 同一則若 dr 與 bubbleFx 都在，時間較新的贏；時間相同以 bubbleFx 為準（堅挺只存在那裡）。 */
export function bubbleFxResolve(drRec, fxRec) {
  const fxState = bubbleFxNormalize(fxRec && fxRec.state);
  const fxT = Number(fxRec && fxRec.t);
  const fxOk = !!(fxState && Number.isFinite(fxT));
  const drState = drStateOf(drRec);
  const drT = Number(drRec && drRec.t);
  const drOk = !!(drState && Number.isFinite(drT));
  if (fxOk && (!drOk || fxT >= drT)) return { state: fxState, t: fxT, by: (fxRec && fxRec.by) || "" };
  if (drOk) return { state: drState, t: drT, by: (drRec && drRec.by) || "" };
  if (fxState) return { state: fxState, t: fxOk ? fxT : 0, by: (fxRec && fxRec.by) || "" };
  return null;
}

/* 整圈移進畫面。半徑與直徑不變，只挪中心。 */
export function bubbleRingShift(x, y, radius, diameter, bounds) {
  const reach = Number(radius) + Number(diameter) / 2;
  const left = Number(bounds && bounds.left) || 0;
  const top = Number(bounds && bounds.top) || 0;
  const right = Number(bounds && bounds.right);
  const bottom = Number(bounds && bounds.bottom);
  const minX = left + reach;
  const maxX = right - reach;
  const minY = top + reach;
  const maxY = bottom - reach;
  const cx = !(maxX >= minX) ? (left + right) / 2 : Math.min(maxX, Math.max(minX, Number(x) || 0));
  const cy = !(maxY >= minY) ? (top + bottom) / 2 : Math.min(maxY, Math.max(minY, Number(y) || 0));
  return { x: cx, y: cy };
}

/* 從正上方開始，順時針排滿一圈。座標是鈕的左上角，原點在圓心。 */
/* 堅挺寫進房間後，全房正在看的人各播一次黑貓爬灰貓。太舊的不重播。 */
export function stiffClimbIds(val, now, seen, freshMs = DROOP_CLIMB_FRESH_MS) {
  const ids = [];
  if (!val || typeof val !== "object" || !Number.isFinite(+now)) return ids;
  const have = seen || new Set();
  for (const key of Object.keys(val)) {
    const rec = val[key];
    if (!rec || rec.state !== "stiff") continue;
    const t = Number(rec.t);
    if (!Number.isFinite(t) || Math.abs(+now - t) > freshMs) continue;
    const id = key + ":" + t;
    if (have.has(id)) continue;
    ids.push(id);
  }
  return ids;
}

export function bubbleRingPoints(count, radius, diameter) {
  const n = Number(count) || 0;
  const r = Number(radius) || 0;
  const d = Number(diameter) || 0;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = (-90 + (i * 360) / n) * Math.PI / 180;
    pts.push({ i, x: Math.cos(ang) * r - d / 2, y: Math.sin(ang) * r - d / 2 });
  }
  return pts;
}

function petsHidden() {
  try { return localStorage.getItem("sc-pets") === "off"; } catch (_) { return false; }
}

function rowFor(key) {
  const list = Droop.list;
  if (!list || !key) return null;
  try { return list.querySelector(`.row[data-k="${CSS.escape(key)}"]`); }
  catch (_) { return null; }
}

export const BubbleFx = {
  last: null,
  climbSeen: null,
  sync(val) {
    this.last = val && typeof val === "object" ? val : {};
    this.paintAll();
    this.notifyStiffClimb();
  },
  notifyStiffClimb() {
    if (typeof window === "undefined") return;
    if (!this.climbSeen) this.climbSeen = new Set();
    const now = Droop.now();
    for (const id of stiffClimbIds(this.last, now, this.climbSeen)) {
      this.climbSeen.add(id);
      try { window.dispatchEvent(new CustomEvent("sc-droop-climb", { detail: { id } })); } catch (_) {}
    }
  },
  paintAll() {
    if (petsHidden()) return;
    if (!Droop.ready) Droop.mount();
    if (!Droop.ready || !Droop.list) return;
    const fxMap = this.last || {};
    const drMap = Droop.last || {};
    for (const key of Object.keys(fxMap)) {
      const fx = fxMap[key];
      const state = bubbleFxNormalize(fx && fx.state);
      if (!state) continue;
      const resolved = bubbleFxResolve(drMap[key], fx);
      if (!resolved || resolved.state !== state) continue;
      const row = rowFor(key);
      if (!row) continue;
      this.paint(row, state, resolved.t, fx.by);
    }
  },
  paint(row, state, t, by) {
    const bub = row && row.querySelector && row.querySelector(".bub");
    if (!bub || row.classList.contains("shattering") || row.classList.contains("gone")) return;
    const st = Droop.map && Droop.map.get(row);
    const sameT = !!(st && Number(st.t) === Number(t));
    if (sameT && state === "soft" && st.mode === "soft" && st.on) return;
    if (sameT && state === "stiff" && st.mode === "stiff" && st.on) return;
    if (sameT && state === "break" && st.mode === "fall") return;
    if (sameT && state === "normal" && st.mode !== "fall" && !st.on) return;
    if (state === "stiff") Droop.applyStiff(row, t);
    else if (state === "soft") Droop.apply(row, true, t, by);
    else if (state === "break") {
      const tag = typeof by === "string" && by.startsWith("fall:") ? by : ("fall:" + (by || ""));
      Droop.apply(row, true, t, tag);
    } else Droop.apply(row, false, t, by);
  },
};

/* dr 較舊、而且 bubbleFx 要的形狀不一樣時，不要讓 droop 的同步把堅挺蓋掉。 */
export function attachBubbleFx(droop) {
  droop.fxOwns = (key, drRec) => {
    const fx = BubbleFx.last && BubbleFx.last[key];
    if (!fx) return false;
    const resolved = bubbleFxResolve(drRec, fx);
    if (!resolved) return false;
    return resolved.state !== drStateOf(drRec);
  };
  droop.fxKeep = (key) => {
    const fx = BubbleFx.last && BubbleFx.last[key];
    const state = bubbleFxNormalize(fx && fx.state);
    return state === "stiff" || state === "soft" || state === "break";
  };
  droop.afterSync = () => { try { BubbleFx.paintAll(); } catch (_) {} };
}
