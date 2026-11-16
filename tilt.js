/* 手機左右傾斜。沒有感應器、或使用者拒絕時，角度維持 0，球跟以前一樣只受垂直重力。 */

export const TILT_DEAD = 4 * Math.PI / 180;
export const TILT_MAX = 0.42;
export const TILT_SMOOTH = 9;
export const TILT_G = 1500;

export function tiltInput(rad, dead = TILT_DEAD, max = TILT_MAX) {
  if (!Number.isFinite(rad)) return 0;
  const a = Math.abs(rad);
  if (a < dead) return 0;
  return Math.sign(rad) * Math.min(max, a - dead);
}

export function tiltSmooth(prev, target, dt, rate = TILT_SMOOTH) {
  const k = 1 - Math.exp(-rate * Math.max(0, dt || 0));
  return prev + (target - prev) * k;
}

export function tiltAccel(rad, g = TILT_G) {
  const a = Number.isFinite(rad) ? rad : 0;
  return { x: Math.sin(a) * g, y: Math.cos(a) * g };
}

let raw = 0;
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
  raw = tiltInput(e.gamma * Math.PI / 180);
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
