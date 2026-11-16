/* 手機左右傾斜。沒有感應器、或使用者拒絕時，角度維持 0，球跟以前一樣只受垂直重力。 */

export const TILT_DEAD = 4 * Math.PI / 180;
export const TILT_MAX = Math.PI / 2;
export const TILT_SMOOTH = 9;
export const TILT_G = 1500;

/* 平放為 0，左右翻到直立為 ±90°。翻過 90° 就停在那一側的最大，不反向。 */
export function tiltRoll(betaDeg, gammaDeg) {
  if (!Number.isFinite(gammaDeg)) return 0;
  const b = (Number.isFinite(betaDeg) ? betaDeg : 0) * Math.PI / 180;
  const g = gammaDeg * Math.PI / 180;
  const gx = Math.cos(b) * Math.sin(g);
  const face = Math.cos(b) * Math.cos(g);
  if (Math.abs(gx) < 1e-8 && Math.abs(face) < 1e-8) return 0;
  return Math.atan2(gx, face);
}

export function tiltHold(prev, roll) {
  const max = TILT_MAX;
  if (!Number.isFinite(roll)) return 0;
  if (Math.abs(roll) > max) {
    const side = Number.isFinite(prev) && Math.abs(prev) > 0.15 ? Math.sign(prev) : Math.sign(roll);
    return side * max;
  }
  return Math.max(-max, Math.min(max, roll));
}

export function tiltInput(roll, dead = TILT_DEAD, max = TILT_MAX) {
  if (!Number.isFinite(roll)) return 0;
  const a = Math.max(-max, Math.min(max, roll));
  if (Math.abs(a) < dead) return 0;
  const span = Math.max(1e-6, max - dead);
  const mag = (Math.abs(a) - dead) / span * max;
  return Math.sign(a) * Math.min(max, mag);
}

export function tiltSmooth(prev, target, dt, rate = TILT_SMOOTH) {
  const k = 1 - Math.exp(-rate * Math.max(0, dt || 0));
  return prev + (target - prev) * k;
}

/* 只加左右加速度。垂直重力維持原本的常數，球才會一直落回地板。 */
export function tiltAccelX(roll, g = TILT_G) {
  const a = Number.isFinite(roll) ? roll : 0;
  return Math.sin(a) * g;
}

let raw = 0;
let held = 0;
let tilt = 0;
let users = 0;
let listening = false;
let permitted = false;
let denied = false;
let askPromise = null;
let raf = 0;
let last = 0;

export function tiltAngle() { return tilt; }

function onOrient(e) {
  if (!e || typeof e.gamma !== "number" || Number.isNaN(e.gamma)) return;
  const beta = typeof e.beta === "number" && !Number.isNaN(e.beta) ? e.beta : 0;
  held = tiltHold(held, tiltRoll(beta, e.gamma));
  raw = tiltInput(held);
}

function loop(now) {
  raf = 0;
  if (!listening) return;
  if ((typeof document !== "undefined" && document.hidden) || users <= 0) { pause(); return; }
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  tilt = tiltSmooth(tilt, raw, dt);
  raf = requestAnimationFrame(loop);
}

function pause() {
  listening = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (typeof window !== "undefined") window.removeEventListener("deviceorientation", onOrient);
}

function ensure() {
  if (users <= 0 || denied) return;
  if (typeof document !== "undefined" && document.hidden) return;
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return;
  if (typeof DeviceOrientationEvent.requestPermission === "function" && !permitted) return;
  if (listening) return;
  listening = true;
  last = 0;
  window.addEventListener("deviceorientation", onOrient);
  raf = requestAnimationFrame(loop);
}

export function tiltAcquire() {
  users += 1;
  ensure();
}

export function tiltRelease() {
  users = Math.max(0, users - 1);
  if (users === 0) {
    pause();
    raw = 0;
    held = 0;
    tilt = 0;
  }
}

/* 必須在使用者點擊當下呼叫。拒絕或失敗只記一次，之後不再問。 */
export function tiltAsk() {
  if (denied) return Promise.resolve(false);
  if (permitted) { ensure(); return Promise.resolve(true); }
  if (typeof DeviceOrientationEvent === "undefined") return Promise.resolve(false);
  if (typeof DeviceOrientationEvent.requestPermission !== "function") {
    permitted = true;
    ensure();
    return Promise.resolve(true);
  }
  if (askPromise) return askPromise;
  try {
    askPromise = DeviceOrientationEvent.requestPermission().then((state) => {
      if (state === "granted") { permitted = true; ensure(); return true; }
      denied = true;
      return false;
    }).catch(() => { denied = true; return false; });
  } catch (_) {
    denied = true;
    askPromise = Promise.resolve(false);
  }
  return askPromise;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else ensure();
  });
}
