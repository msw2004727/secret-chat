/* 黃球雙向同步。最後摸到球的那台是裁判，負責物理並寫進 rooms/<房>/ballLive。
   另一台只平滑跟上。兩人同時摸，伺服器先收到的交易勝出。
   房間裡有別人、而且黃球開著時，傾斜不推球；只剩自己時維持原本的傾斜。 */

export const BALL_SYNC_HZ = 12;
export const BALL_SYNC_INTERVAL_MS = 1000 / BALL_SYNC_HZ;
export const BALL_HOLD_MS = 2500;
export const BALL_SMOOTH = 12;
export const BALL_PREDICT_MAX = 0.18;
export const BALL_SNAP = 0.35;

const POSE_KEYS = ["x", "y", "vx", "vy", "spin", "g"];

function num(v, lo, hi, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export function wrapSpin(spin) {
  const turn = Math.PI * 2;
  let s = Number(spin);
  if (!Number.isFinite(s)) return 0;
  s %= turn;
  if (s > Math.PI) s -= turn;
  if (s < -Math.PI) s += turn;
  return s;
}

export function ballSyncActive(peerCount, ballOn) {
  return (Number(peerCount) || 0) > 0 && ballOn === true;
}

/* 1＝沿用傾斜加速度，0＝同步中不推球。 */
export function ballTiltScale(syncing) {
  return syncing ? 0 : 1;
}

export function ballSyncRole(auth, me, peerIds, active) {
  if (!active) return "solo";
  const id = String(me || "");
  const peers = (Array.isArray(peerIds) ? peerIds : []).filter((p) => p && p !== id);
  if (!peers.length) return "solo";
  if (auth && auth.by === id && Number.isFinite(+auth.seq) && +auth.seq > 0) return "authority";
  if (auth && typeof auth.by === "string" && peers.includes(auth.by)) return "follow";
  return "open";
}

export function packBallPose(ball, frame) {
  const w = Math.max(1, Number(frame && frame.w) || 1);
  const span = Math.max(1, Number(frame && frame.span) || 1);
  const top = Number(frame && frame.top) || 0;
  const src = ball || {};
  return {
    x: num(src.x / w, -0.2, 1.2, 0.5),
    y: num((src.y - top) / span, -0.2, 1.2, 0.2),
    vx: num(src.vx / w, -40, 40, 0),
    vy: num(src.vy / span, -40, 40, 0),
    spin: wrapSpin(src.spin),
    g: num(1500 / span, 0, 80, 3),
  };
}

export function viewBallState(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.by !== "string" || !raw.by || raw.by.length > 64) return null;
  const seq = Number(raw.seq);
  const t = Number(raw.t);
  if (!Number.isInteger(seq) || seq < 1 || seq > 1000000000) return null;
  if (!Number.isFinite(t) || t <= 0) return null;
  const pose = {};
  for (const key of POSE_KEYS) {
    const lo = key === "g" ? 0 : key === "spin" ? -4 : key === "vx" || key === "vy" ? -40 : -0.2;
    const hi = key === "g" ? 80 : key === "spin" ? 4 : key === "vx" || key === "vy" ? 40 : 1.2;
    const n = Number(raw[key]);
    if (!Number.isFinite(n) || n < lo || n > hi) return null;
    pose[key] = key === "spin" ? wrapSpin(n) : n;
  }
  return { by: raw.by, seq, t, hold: raw.hold === true, ...pose };
}

export function mapBallToLocal(norm, frame) {
  const w = Math.max(1, Number(frame && frame.w) || 1);
  const span = Math.max(1, Number(frame && frame.span) || 1);
  const top = Number(frame && frame.top) || 0;
  const src = norm || {};
  return {
    x: num(src.x, -0.2, 1.2, 0.5) * w,
    y: top + num(src.y, -0.2, 1.2, 0.2) * span,
    vx: num(src.vx, -40, 40, 0) * w,
    vy: num(src.vy, -40, 40, 0) * span,
    spin: wrapSpin(src.spin),
  };
}

function poseOf(src, fallback) {
  const p = src && typeof src === "object" ? src : {};
  const f = fallback && typeof fallback === "object" ? fallback : {};
  return {
    x: num(p.x, -0.2, 1.2, num(f.x, -0.2, 1.2, 0.5)),
    y: num(p.y, -0.2, 1.2, num(f.y, -0.2, 1.2, 0.2)),
    vx: num(p.vx, -40, 40, num(f.vx, -40, 40, 0)),
    vy: num(p.vy, -40, 40, num(f.vy, -40, 40, 0)),
    spin: wrapSpin(p.spin != null ? p.spin : f.spin),
    g: num(p.g, 0, 80, num(f.g, 0, 80, 3)),
  };
}

function freshHold(cur, now) {
  if (!cur || cur.hold !== true || typeof cur.by !== "string" || !cur.by) return false;
  const t = Number(cur.t);
  return Number.isFinite(t) && now - t < BALL_HOLD_MS;
}

/* 回傳下一筆；undefined 表示放棄這次交易（對方的手已經先被伺服器收下）。 */
export function claimBallAuth(cur, me, now, pose) {
  const id = String(me || "").slice(0, 64);
  const at = Math.round(Number(now));
  if (!id || !Number.isFinite(at) || at <= 0) return undefined;
  if (freshHold(cur, at) && cur.by === id) return cur;
  if (freshHold(cur, at) && cur.by !== id) return undefined;
  const prev = Math.round(Number(cur && cur.seq) || 0);
  const seq = Math.max(1, Math.min(1000000000, (prev > 0 ? prev : 0) + 1));
  return { by: id, seq, hold: true, t: at, ...poseOf(pose, cur) };
}

export function releaseBallAuth(cur, me, seq, pose, now) {
  const id = String(me || "").slice(0, 64);
  const at = Math.round(Number(now));
  const want = Math.round(Number(seq));
  if (!cur || cur.by !== id || Math.round(Number(cur.seq)) !== want) return undefined;
  if (!Number.isFinite(at) || at <= 0 || want < 1) return undefined;
  return { by: id, seq: want, hold: false, t: at, ...poseOf(pose, cur) };
}

export function publishBallAuth(cur, me, seq, pose, now) {
  const id = String(me || "").slice(0, 64);
  const at = Math.round(Number(now));
  const want = Math.round(Number(seq));
  if (!cur || cur.by !== id || Math.round(Number(cur.seq)) !== want) return undefined;
  if (!Number.isFinite(at) || at <= 0 || want < 1) return undefined;
  return { by: id, seq: want, hold: cur.hold === true, t: at, ...poseOf(pose, cur) };
}

function spinGap(a, b) {
  return Math.abs(wrapSpin(wrapSpin(b) - wrapSpin(a)));
}

export function poseMoving(prevPose, pose, hold) {
  if (hold) return true;
  const speed = Math.hypot(Number(pose && pose.vx) || 0, Number(pose && pose.vy) || 0);
  if (speed > 0.02) return true;
  if (!prevPose) return false;
  if (Math.hypot(pose.x - prevPose.x, pose.y - prevPose.y) > 0.003) return true;
  return spinGap(prevPose.spin, pose.spin) > 0.04;
}

/* 移動中大約 12Hz 寫一次。停下來再補一筆靜止，之後不再寫。 */
export function ballPublishDecision(prev, nowMs, pose, hold, interval = BALL_SYNC_INTERVAL_MS) {
  const lastAt = prev && Number.isFinite(prev.lastAt) ? prev.lastAt : -1e9;
  const settled = !!(prev && prev.settled);
  const moving = poseMoving(prev && prev.pose, pose, hold);
  if (moving) {
    if (nowMs - lastAt < interval) return { write: false, lastAt, settled: false, pose: prev && prev.pose };
    return { write: true, lastAt: nowMs, settled: false, pose };
  }
  if (!settled) return { write: true, lastAt: nowMs, settled: true, pose };
  return { write: false, lastAt, settled: true, pose: prev && prev.pose };
}

export function predictBallNorm(state, seconds) {
  const cap = Math.max(0, Math.min(BALL_PREDICT_MAX, Number(seconds) || 0));
  let x = num(state && state.x, -0.2, 1.2, 0.5);
  let y = num(state && state.y, -0.2, 1.2, 0.2);
  let vx = num(state && state.vx, -40, 40, 0);
  let vy = num(state && state.vy, -40, 40, 0);
  const g = num(state && state.g, 0, 80, 0);
  const r = 0.02;
  let left = cap;
  const slice = 1 / 60;
  while (left > 0) {
    const h = Math.min(slice, left);
    vy += g * h;
    x += vx * h;
    y += vy * h;
    if (x < r) { x = r; if (vx < 0) vx *= -0.8; }
    if (x > 1 - r) { x = 1 - r; if (vx > 0) vx *= -0.8; }
    if (y < r) { y = r; if (vy < 0) vy *= -0.75; }
    if (y > 1 - r) {
      y = 1 - r;
      if (vy > 0) { vy = vy > 0.15 ? -vy * 0.72 : 0; vx *= 0.93; }
    }
    left -= h;
  }
  return { x, y, vx, vy, spin: wrapSpin(state && state.spin), g };
}

export function smoothToward(shown, target, dt, rate = BALL_SMOOTH) {
  const k = 1 - Math.exp(-rate * Math.max(0, Number(dt) || 0));
  const src = shown || target;
  const dst = target || src;
  return {
    x: src.x + (dst.x - src.x) * k,
    y: src.y + (dst.y - src.y) * k,
    vx: src.vx + (dst.vx - src.vx) * k,
    vy: src.vy + (dst.vy - src.vy) * k,
    spin: wrapSpin(src.spin + wrapSpin(dst.spin - src.spin) * k),
  };
}

export function followBall(shown, target, dt) {
  if (!shown) return { ...target, snapped: true };
  const dist = Math.hypot(target.x - shown.x, target.y - shown.y);
  if (dist > BALL_SNAP) return { ...target, snapped: true };
  return { ...smoothToward(shown, target, dt), snapped: false };
}
