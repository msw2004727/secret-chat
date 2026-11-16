/* 魚塘共用量條。一間房一條，藍魚把交界往左推、粉魚往右推。
   雲端只存交界位置、上一隻吃到的魚、連續吃了幾顆。
   寫入用 transaction，兩個人同時餵會各算各的一顆，不會互相蓋掉。 */

export const SHARE_BLUE = "#6ad4ff";
export const SHARE_PINK = "#ffb3ce";
const FLAT = "M1.8 7h8.4";

export function viewShare(raw) {
  if (!raw || typeof raw !== "object") return { pos: 50, last: null, streak: 0 };
  const pos = Number.isFinite(raw.pos) ? Math.max(0, Math.min(100, raw.pos)) : 50;
  const last = raw.lastEater === "b" || raw.lastEater === "p" ? raw.lastEater : null;
  const streak = Number.isFinite(raw.streak) ? Math.max(0, Math.min(3, Math.round(raw.streak))) : 0;
  if (!last || streak < 1) return { pos, last: null, streak: 0 };
  return { pos, last, streak };
}

/* side 是 "b" 或 "p"。回傳要寫進雲端的整筆；吃到邊界仍會重算連吃層數。 */
export function nextShare(cur, side) {
  if (side !== "b" && side !== "p") return null;
  const view = viewShare(cur);
  const pos = side === "b" ? Math.max(0, view.pos - 1) : Math.min(100, view.pos + 1);
  const streak = view.last === side ? Math.min(3, view.streak + 1) : 1;
  return { pos, lastEater: side, streak };
}

function clampStop(n) { return Math.max(0, Math.min(100, n)); }

export function shareGradient(p) {
  const pos = Math.max(0, Math.min(100, p));
  if (pos <= 0) return SHARE_PINK;
  if (pos >= 100) return SHARE_BLUE;
  const stops = [
    [0, SHARE_BLUE],
    [clampStop(pos - 18), SHARE_BLUE],
    [clampStop(pos - 8), "#9ecff2"],
    [pos, "#e4c0e2"],
    [clampStop(pos + 8), "#f6bdd8"],
    [clampStop(pos + 18), SHARE_PINK],
    [100, SHARE_PINK],
  ];
  let at = 0;
  const parts = stops.map(([raw, color]) => {
    const next = Math.max(at, raw);
    at = next;
    return color + " " + next + "%";
  });
  return "linear-gradient(90deg," + parts.join(",") + ")";
}

export function shareChevrons(dir, n) {
  const count = Math.max(1, Math.min(3, n));
  const gap = 3.15;
  const rise = 3.05;
  const total = rise + (count - 1) * gap;
  const start = (14 - total) / 2;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const y = start + i * gap;
    parts.push(dir === "up"
      ? "M1.7 " + (y + rise) + " L6 " + (y + 0.35) + " L10.3 " + (y + rise)
      : "M1.7 " + (y + 0.35) + " L6 " + (y + rise) + " L10.3 " + (y + 0.35));
  }
  return parts.join(" ");
}

export function paintShare(root, raw) {
  if (!root) return;
  const view = viewShare(raw);
  const blend = root.querySelector(".c-share-blend");
  if (blend) blend.style.background = shareGradient(view.pos);
  const blue = root.querySelector(".c-share-trend.is-blue path");
  const pink = root.querySelector(".c-share-trend.is-pink path");
  const n = view.last ? view.streak : 0;
  const mark = (path, dir) => {
    if (!path) return;
    path.setAttribute("d", dir === "flat" ? FLAT : shareChevrons(dir, n));
  };
  if (!view.last) {
    mark(blue, "flat");
    mark(pink, "flat");
    return;
  }
  if (view.last === "b") {
    mark(blue, "up");
    mark(pink, "down");
  } else {
    mark(pink, "up");
    mark(blue, "down");
  }
}

/* 訂閱 rooms/<房>/pondShare。吃到飼料才寫，離開房間時跟其他監聽一起拆。 */
export function mountPondShare(root) {
  let queued = [];
  let session = null;

  function open(f, roomId, subs, alive) {
    const pending = queued.splice(0);
    close();
    queued = pending;
    const { db, ref, onValue, runTransaction } = f;
    const still = typeof alive === "function" ? alive : () => true;
    let disposed = false;
    let tail = Promise.resolve();
    const node = ref(db, `rooms/${roomId}/pondShare`);

    function enqueue(side) {
      tail = tail.then(async () => {
        if (disposed || !still()) return;
        await runTransaction(node, (cur) => {
          if (disposed || !still()) return;
          return nextShare(cur, side);
        });
      }).catch((err) => {
        console.warn("魚塘共用量條寫入失敗", (err && (err.code || err.message)) || err);
      });
    }

    const off = onValue(node, (snap) => {
      if (disposed) return;
      paintShare(root, snap.val());
    });
    subs.push(off);
    session = {
      feed(side) { enqueue(side); },
      dispose() { disposed = true; },
    };
    const waiting = queued.splice(0);
    for (const side of waiting) session.feed(side);
    paintShare(root, null);
  }

  function eat(id) {
    const side = id === 1 ? "p" : "b";
    if (!session) { queued.push(side); return; }
    session.feed(side);
  }

  function close() {
    if (session) session.dispose();
    session = null;
    queued = [];
    paintShare(root, null);
  }

  return { open, eat, close };
}
