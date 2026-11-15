/* 魚塘飢餓度。藍魚 b、粉魚 p 兩隻，一間房共用一份。
   雲端只存「基準時間的飽足值、那個時間戳、死亡結束時間」。
   畫面上的長度是用伺服器時間減出來的，不靠前端倒數計時器。
   時間用 .info/serverTimeOffset 對齊伺服器，寫入用 transaction，
   兩個人同時餵到同一隻時後寫的那次會重算，不會蓋掉前一次的 +10。 */

export const HUNGER_MS = 24 * 3600 * 1000;
export const DEAD_MS = 6 * 3600 * 1000;
export const RATE = 100 / HUNGER_MS;
export const FEED = 10;
export const FULL_AT = 80;
export const MID_AT = 20;
export const FISH_KEYS = ["b", "p"];

export const WARM = {
  blue: { full: "#6ad4ff", mid: "#4a90d9", low: "#f0a050" },
  pink: { full: "#ffb3ce", mid: "#e07098", low: "#d4553a" },
};

export function phaseOf(sat) {
  if (sat >= FULL_AT) return "吃飽";
  if (sat >= MID_AT) return "普通";
  if (sat > 0) return "飢餓";
  return "";
}

export function tone(kind, sat) {
  const s = WARM[kind] || WARM.blue;
  if (sat >= FULL_AT) return s.full;
  if (sat >= MID_AT) return s.mid;
  if (sat > 0) return s.low;
  return "transparent";
}

function clampSat(n) {
  if (!Number.isFinite(n)) return 0;
  const x = Math.round(n * 1000) / 1000;
  if (x <= 0) return 0;
  if (x >= 100) return 100;
  return x;
}

/* 沒有紀錄時當成剛吃飽，時鐘從這一刻才開始，不會在寫入前自己往下掉。 */
export function project(raw, now) {
  const at = Number.isFinite(now) ? now : 0;
  let sat = 100;
  let t = at;
  let deadUntil = 0;
  if (raw && typeof raw === "object") {
    if (Number.isFinite(raw.sat)) sat = clampSat(raw.sat);
    if (Number.isFinite(raw.t) && raw.t > 0) t = raw.t;
    if (Number.isFinite(raw.deadUntil) && raw.deadUntil > 0) deadUntil = raw.deadUntil;
  } else {
    return { dead: false, left: 0, sat: 100, phase: "吃飽", t: at, deadUntil: 0 };
  }
  for (let i = 0; i < 12; i++) {
    if (deadUntil) {
      if (at < deadUntil) return { dead: true, left: deadUntil - at, sat: 0, phase: "", t, deadUntil };
      sat = 100;
      t = deadUntil;
      deadUntil = 0;
    }
    const cur = sat - (at - t) * RATE;
    if (cur > 0) {
      const s = clampSat(cur);
      return { dead: false, left: 0, sat: s, phase: phaseOf(s), t, deadUntil: 0 };
    }
    const deathAt = t + Math.max(0, sat) / RATE;
    deadUntil = deathAt + DEAD_MS;
    sat = 0;
    t = deathAt;
  }
  return { dead: false, left: 0, sat: 100, phase: "吃飽", t: at, deadUntil: 0 };
}

export function seedRecord(now) {
  return { sat: 100, t: Math.round(now), deadUntil: 0 };
}

/* 死了就回 null，呼叫端要中止 transaction，不能把飽足值寫回去。 */
export function feedRecord(raw, now) {
  const view = project(raw, now);
  if (view.dead) return null;
  return { sat: clampSat(view.sat + FEED), t: Math.round(now), deadUntil: 0 };
}

/* 只有「現在是死的、而且雲端還沒記下這一次的結束時間」才需要寫。 */
export function deathRecord(raw, now) {
  if (!raw || typeof raw !== "object") return null;
  const view = project(raw, now);
  if (!view.dead) return null;
  const storedUntil = Number.isFinite(raw.deadUntil) ? raw.deadUntil : 0;
  const storedSat = Number.isFinite(raw.sat) ? raw.sat : -1;
  if (storedUntil === Math.round(view.deadUntil) && storedSat === 0) return null;
  return { sat: 0, t: Math.round(view.t), deadUntil: Math.round(view.deadUntil) };
}

export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => (n < 10 ? "0" : "") + n;
  return h + ":" + p(m) + ":" + p(sec);
}

export function paintHunger(root, views) {
  if (!root) return;
  for (const key of FISH_KEYS) {
    const el = root.querySelector(`[data-fish="${key}"]`);
    const v = views && views[key];
    if (!el || !v) continue;
    const kind = key === "p" ? "pink" : "blue";
    el.classList.toggle("is-dead", !!v.dead);
    const liquid = el.querySelector(".c-hliquid");
    if (liquid) {
      liquid.style.width = v.dead ? "0" : Math.max(0, Math.min(100, v.sat)) + "%";
      liquid.style.background = v.dead ? "transparent" : tone(kind, v.sat);
    }
    el.querySelectorAll(".c-hunder span").forEach((s) => {
      s.classList.toggle("is-now", !v.dead && s.dataset.p === v.phase);
    });
    const tag = el.querySelector(".c-hdead");
    if (tag) tag.textContent = v.dead ? "💀 " + clockText(v.left) : "";
  }
}

/* 訂閱 rooms/<房>/pondHunger。subs 收解除函式，離開房間時跟其他監聽一起拆。 */
export function mountPondHunger(root, onAlive) {
  let queued = [];
  let session = null;
  let shown = [true, true];

  function paintNow(raw, now) {
    const views = {
      b: project(raw.b, now),
      p: project(raw.p, now),
    };
    paintHunger(root, views);
    const alive = [!views.b.dead, !views.p.dead];
    if (onAlive && (alive[0] !== shown[0] || alive[1] !== shown[1])) {
      shown = alive;
      onAlive(alive);
    }
    return views;
  }

  function open(f, roomId, subs, alive) {
    const pending = queued.splice(0);
    close();
    queued = pending;
    const { db, ref, onValue, runTransaction } = f;
    const still = typeof alive === "function" ? alive : () => true;
    let offset = 0;
    let offsetReady = false;
    const raw = { b: null, p: null };
    const seen = { b: false, p: false };
    const seedAt = { b: 0, p: 0 };
    const tail = { b: Promise.resolve(), p: Promise.resolve() };
    const waiters = [];
    let raf = 0;
    let lastFix = 0;
    let disposed = false;
    const serverNow = () => Date.now() + offset;
    function whenOffset() {
      if (offsetReady) return Promise.resolve();
      return new Promise((res) => {
        let done = false;
        const finish = () => { if (!done) { done = true; res(); } };
        waiters.push(finish);
        setTimeout(finish, 2000);
      });
    }

    function enqueue(key, build) {
      tail[key] = tail[key].then(async () => {
        await whenOffset();
        if (disposed || !still()) return;
        await runTransaction(ref(db, `rooms/${roomId}/pondHunger/${key}`), (cur) => {
          if (disposed || !still()) return;
          const next = build(cur, serverNow());
          if (!next) return;
          return next;
        });
      }).catch((err) => {
        console.warn("魚塘飢餓度寫入失敗", (err && (err.code || err.message)) || err);
      });
    }

    function fix(now) {
      if (!offsetReady || disposed || !still()) return;
      for (const key of FISH_KEYS) {
        if (!seen[key]) continue;
        if (!raw[key]) {
          if (now - seedAt[key] < 10000) continue;
          seedAt[key] = now;
          enqueue(key, (cur, at) => (cur ? null : seedRecord(at)));
          continue;
        }
        if (deathRecord(raw[key], now)) enqueue(key, (cur, at) => deathRecord(cur, at));
      }
    }

    function paintFrame() {
      if (disposed) return;
      const now = serverNow();
      paintNow(raw, now);
      if (now - lastFix > 1000) { lastFix = now; fix(now); }
      if (raf || disposed) return;
      if (typeof document !== "undefined" && document.hidden) return;
      raf = requestAnimationFrame(() => { raf = 0; paintFrame(); });
    }

    const stopFrame = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => { if (!disposed && !document.hidden) paintFrame(); };
    document.addEventListener("visibilitychange", onVis);
    const offVis = () => document.removeEventListener("visibilitychange", onVis);

    const offOffset = onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
      offset = Number(snap.val()) || 0;
      offsetReady = true;
      const pending = waiters.splice(0);
      for (const fn of pending) fn();
      paintFrame();
    });
    const offData = onValue(ref(db, `rooms/${roomId}/pondHunger`), (snap) => {
      const v = snap.val() || {};
      seen.b = seen.p = true;
      raw.b = v.b || null;
      raw.p = v.p || null;
      paintFrame();
    });
    subs.push(offOffset, offData, stopFrame, offVis);
    session = {
      feed(key) { enqueue(key, (cur, at) => feedRecord(cur, at)); },
      dispose() {
        disposed = true;
        stopFrame();
        offVis();
        const pending = waiters.splice(0);
        for (const fn of pending) fn();
      },
    };
    const waiting = queued.splice(0);
    for (const key of waiting) session.feed(key);
    paintFrame();
  }

  function eat(id) {
    const key = id === 1 ? "p" : "b";
    if (!session) { queued.push(key); return; }
    session.feed(key);
  }

  function close() {
    if (session) session.dispose();
    session = null;
    queued = [];
    shown = [false, false];
    paintNow({ b: null, p: null }, Date.now());
  }

  return { open, eat, close };
}
