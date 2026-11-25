/* 魚塘的配角。⚠️ 魚池是「從上往下鳥瞰」的：沒有池底那條線、沒有直立的水草，
   東西不會往畫面上方飄或往下沉。這裡有池底小石子、浮在水面的荷葉、原地冒出的氣泡、
   鳥瞰的小魚群、圓形水波、池塘訪客（龜、落葉、蜻蜓、鴨子），晚上還有螢火蟲。
   只算位置和要畫什麼字，不碰 DOM，方便離線測試；畫布由 pond-shark.js 負責。
   全部只在這台裝置上跑，不寫雲端。數量刻意壓低，舊手機也不該發燙。 */

export const CW = 6, CH = 9;

/* 小魚群 */
export const SCHOOL_N = 8;
const SCHOOL_SPEED = 34;
const FLEE_SPEED = 120;
export const FLEE_R = 95;
const CURIOUS_S = 4.5;

/* 氣泡：在原地冒出水面再破掉 */
export const BUBBLE_MAX = 7;
export const BUBBLE_LIFE = 2;

/* 休息：多久沒人點畫面就慢慢放慢 */
export const IDLE_S = 60;
export const REST_PACE = 0.55;
/* 夜裡游得慢一點；夠暗才出螢火蟲 */
export const NIGHT_PACE = 0.72;
export const FIREFLY_N = 4;

/* 稀有訪客：第一次 40～90 秒後，之後每 2～4 分鐘可能來一隻 */
const VISIT_FIRST = [40, 90];
const VISIT_GAP = [120, 240];
export const VISIT_ODDS = { turtle: 0.35, leaf: 0.35, dragonfly: 0.2, duck: 0.1 };

/* 鳥瞰的樣子。r = 往右，l = 往左；兩格輪流當動畫。 */
export const SPRITES = {
  turtle: {
    r: [["\\  /", "(##)o", "/  \\"], ["/  \\", "(##)o", "\\  /"]],
    l: [[" \\  /", "o(##)", " /  \\"], [" /  \\", "o(##)", " \\  /"]],
  },
  leaf: [["<>"], ["()"]],
  dragonfly: [["\\ /", "-+-", "/ \\"], ["- -", " + ", "- -"]],
  duck: { r: [["((__)>"], ["((__)>"]], l: [["<(__))"], ["<(__))"]] },
};

/* 0 = 白天，1 = 深夜，清晨與傍晚漸變。 */
export function nightness(date) {
  const d = date instanceof Date ? date : new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 21 || h < 5) return 1;
  if (h >= 7 && h < 18) return 0;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return (h - 18) / 3;
}

/* 白天 1、深夜 0.72；閒置超過 IDLE_S 再乘上 0.55（20 秒內漸變）。 */
export function moodPace(night, idleSec) {
  const n = Math.max(0, Math.min(1, night || 0));
  const day = 1 - (1 - NIGHT_PACE) * n;
  const over = Math.max(0, (idleSec || 0) - IDLE_S);
  const rest = 1 - (1 - REST_PACE) * Math.min(1, over / 20);
  return day * rest;
}

/* 鳥瞰小魚的尾巴：頭一點，尾巴一撇跟著游的方向轉。螢幕的 y 往下。 */
export function tailOf(vx, vy) {
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 1e-6 && ay < 1e-6) return { dx: -1, dy: 0, ch: "-" };
  const dx = ax * 2 > ay ? -Math.sign(vx) : 0;
  const dy = ay * 2 > ax ? -Math.sign(vy) : 0;
  let ch = "-";
  if (dx === 0) ch = "|";
  else if (dy !== 0) ch = dx === dy ? "\\" : "/";
  return { dx, dy, ch };
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function between(rand, [a, b]) { return a + (b - a) * rand(); }

export function createLife(width, height, opts = {}) {
  const rand = typeof opts.rand === "function" ? opts.rand : Math.random;
  const life = {
    w: Math.max(1, width), h: Math.max(1, height), t: 0, night: 0,
    school: [], goal: { x: 0, y: 0, t: 0 }, curious: null,
    bubbles: [], bubbleIn: 1.5,
    pads: [], ripples: [], flies: [],
    visitor: null, visitIn: between(rand, VISIT_FIRST),
  };

  function placePads() {
    const n = Math.max(3, Math.min(5, Math.round(life.w * life.h / 70000)));
    life.pads = [];
    for (let i = 0; i < n; i++) {
      life.pads.push({
        x0: life.w * (0.12 + 0.76 * hash(i + 31)),
        y0: life.h * (0.12 + 0.76 * hash(i + 47)),
        x: 0, y: 0, big: i === 0 || hash(i + 5) < 0.4, flower: i === 0, ph: hash(i + 61) * 6.28,
      });
    }
    driftPads();
  }

  /* 荷葉跟著水流在原地附近慢慢漂，不會漂走。 */
  function driftPads() {
    for (const p of life.pads) {
      p.x = p.x0 + Math.sin(life.t * 0.11 + p.ph) * 10;
      p.y = p.y0 + Math.cos(life.t * 0.09 + p.ph) * 6;
    }
  }

  function spawnSchool() {
    life.school = [];
    const cx = life.w * (0.3 + rand() * 0.4), cy = life.h * (0.25 + rand() * 0.3);
    for (let i = 0; i < SCHOOL_N; i++) {
      const a = rand() * 6.28;
      life.school.push({ x: cx + Math.cos(a) * 20 * rand(), y: cy + Math.sin(a) * 14 * rand(), vx: SCHOOL_SPEED, vy: 0 });
    }
    newGoal();
  }

  function newGoal() {
    const m = 30;
    life.goal = { x: m + rand() * Math.max(1, life.w - 2 * m), y: m + rand() * Math.max(1, life.h - 2 * m), t: 6 + rand() * 6 };
  }

  life.resize = (w, h) => {
    const first = life.w < 40 || life.h < 40;
    const sx = Math.max(1, w) / life.w, sy = Math.max(1, h) / life.h;
    life.w = Math.max(1, w); life.h = Math.max(1, h);
    placePads();
    /* 第一次量到真正大小時重新放魚，不然從 1×1 放大會把魚群撒滿整個畫面。 */
    if (first) { spawnSchool(); return; }
    for (const f of life.school) { f.x *= sx; f.y *= sy; }
  };

  /* 休息時躲到最大那片荷葉底下。 */
  life.shade = () => {
    const p = life.pads.find((q) => q.big) || life.pads[0];
    return p ? { x: p.x, y: p.y } : { x: life.w * 0.2, y: life.h * 0.8 };
  };

  /* 點畫面：小魚好奇游過去看一下（鯊魚另外會去追飼料），也濺一圈小水波。 */
  life.tap = (x, y) => {
    life.curious = { x, y, t: CURIOUS_S };
    life.ripple(x, y, 14);
  };

  life.ripple = (x, y, max = 30) => {
    if (life.ripples.length >= 6) life.ripples.shift();
    life.ripples.push({ x, y, r: 2, max, age: 0 });
  };

  /* sharks：[{ x, y, pts: [[x, y], ...] }]，用來讓小魚閃開。pace：日夜加休息的倍率。night：0～1。 */
  life.step = (dt, sharks = [], pace = 1, night = 0) => {
    if (!(dt > 0)) return;
    life.t += dt;
    life.night = Math.max(0, Math.min(1, night || 0));
    const p = Math.max(0.3, Math.min(1.2, pace || 1));
    driftPads();
    stepSchool(dt, sharks, p);
    stepBubbles(dt);
    for (const r of life.ripples) { r.age += dt; r.r = 2 + (r.max - 2) * Math.min(1, r.age / 0.7); }
    life.ripples = life.ripples.filter((r) => r.age < 0.8);
    stepVisitor(dt);
    stepFlies(dt);
  };

  function nearestThreat(f, sharks) {
    let best = null, bd = FLEE_R;
    for (const s of sharks) {
      const pts = s.pts && s.pts.length ? s.pts : [[s.x, s.y]];
      for (const [px, py] of pts) {
        const d = Math.hypot(f.x - px, f.y - py);
        if (d < bd) { bd = d; best = [px, py]; }
      }
    }
    return best ? { x: best[0], y: best[1], d: bd } : null;
  }

  function stepSchool(dt, sharks, pace) {
    if (!life.school.length) return;
    life.goal.t -= dt;
    if (life.goal.t <= 0) newGoal();
    if (life.curious) { life.curious.t -= dt; if (life.curious.t <= 0) life.curious = null; }
    let cx = 0, cy = 0, ax = 0, ay = 0;
    for (const f of life.school) { cx += f.x; cy += f.y; ax += f.vx; ay += f.vy; }
    const n = life.school.length;
    cx /= n; cy /= n; ax /= n; ay /= n;
    const resting = pace < 0.8;
    const target = life.curious || (resting ? life.shade() : life.goal);
    for (const f of life.school) {
      let fx = 0, fy = 0;
      fx += (cx - f.x) * 0.6; fy += (cy - f.y) * 0.6;
      fx += (ax - f.vx) * 0.5; fy += (ay - f.vy) * 0.5;
      for (const o of life.school) {
        if (o === f) continue;
        const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < 22) { fx += dx / d * (22 - d) * 6; fy += dy / d * (22 - d) * 6; }
      }
      const gx = target.x - f.x, gy = target.y - f.y, gd = Math.hypot(gx, gy) || 1;
      const pull = life.curious ? 70 : 28;
      fx += gx / gd * pull; fy += gy / gd * pull;
      const th = nearestThreat(f, sharks);
      let top = (life.curious ? SCHOOL_SPEED * 1.6 : SCHOOL_SPEED) * pace;
      if (th) {
        const dx = f.x - th.x, dy = f.y - th.y, d = th.d || 1;
        const k = (FLEE_R - d) / FLEE_R;
        fx += dx / d * 900 * k; fy += dy / d * 900 * k;
        top = FLEE_SPEED;
      }
      const m = 16;
      if (f.x < m) fx += (m - f.x) * 8;
      if (f.x > life.w - m) fx -= (f.x - (life.w - m)) * 8;
      if (f.y < m) fy += (m - f.y) * 8;
      if (f.y > life.h - m) fy -= (f.y - (life.h - m)) * 8;
      f.vx += fx * dt; f.vy += fy * dt;
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > top) { f.vx = f.vx / sp * top; f.vy = f.vy / sp * top; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.x = Math.max(0, Math.min(life.w, f.x));
      f.y = Math.max(0, Math.min(life.h, f.y));
    }
  }

  /* 鳥瞰的氣泡不會往上走：在原地 . → o → O，然後破成一圈小水波。 */
  function stepBubbles(dt) {
    life.bubbleIn -= dt;
    if (life.bubbleIn <= 0 && life.bubbles.length < BUBBLE_MAX) {
      const m = 20;
      life.bubbles.push({ x: m + rand() * Math.max(1, life.w - 2 * m), y: m + rand() * Math.max(1, life.h - 2 * m), age: 0 });
      life.bubbleIn = 1.2 + rand() * 2.3;
    }
    for (const b of life.bubbles) {
      b.age += dt;
      if (b.age >= BUBBLE_LIFE && !b.popped) { b.popped = true; life.ripple(b.x, b.y, 10); }
    }
    life.bubbles = life.bubbles.filter((b) => !b.popped);
  }

  function stepVisitor(dt) {
    const v = life.visitor;
    if (!v) {
      life.visitIn -= dt;
      if (life.visitIn <= 0) {
        life.visitor = makeVisitor();
        life.visitIn = between(rand, VISIT_GAP);
      }
      return;
    }
    v.age += dt;
    v.x += v.vx * dt;
    v.y += v.vy * dt;
    if (v.kind === "leaf") v.y += Math.sin(v.age * 0.7) * 5 * dt;
    if (v.kind === "turtle") v.y = v.y0 + Math.sin(v.age * 0.8) * 6;
    if (v.kind === "dragonfly" && !v.touched && Math.abs(v.x - v.touchX) < 10) { v.touched = true; life.ripple(v.x, v.y, 22); }
    if (v.kind === "duck") {
      v.wake -= dt;
      if (v.wake <= 0) { v.wake = 0.6; life.ripple(v.x - Math.sign(v.vx) * 18, v.y + 4, 16); }
    }
    const out = v.x < -60 || v.x > life.w + 60 || v.y < -40 || v.y > life.h + 40;
    if (out || v.age > 90) life.visitor = null;
  }

  function pick(r) {
    let acc = 0;
    for (const [k, p] of Object.entries(VISIT_ODDS)) { acc += p; if (r < acc) return k; }
    return "turtle";
  }

  function makeVisitor(kind) {
    const k = kind || pick(rand());
    const fromLeft = rand() < 0.5;
    const sx = fromLeft ? -40 : life.w + 40, dir = fromLeft ? 1 : -1;
    const y = life.h * (0.2 + rand() * 0.6);
    if (k === "turtle") return { kind: k, x: sx, y, y0: y, vx: 20 * dir, vy: 0, age: 0 };
    if (k === "leaf") {
      /* 葉子是飄落到水面上的，落下那一刻濺一圈水波，之後慢慢漂走。 */
      const x = fromLeft ? 30 : life.w - 30;
      life.ripple(x, y, 18);
      return { kind: k, x, y, y0: y, vx: 9 * dir, vy: (rand() - 0.5) * 6, age: 0 };
    }
    if (k === "dragonfly") return { kind: k, x: sx, y, y0: y, vx: 70 * dir, vy: (rand() - 0.5) * 30, age: 0, touchX: life.w * (0.3 + rand() * 0.4), touched: false };
    return { kind: "duck", x: sx, y, y0: y, vx: 24 * dir, vy: 0, age: 0, wake: 0.3 };
  }

  life.spawnVisitor = (kind) => { life.visitor = makeVisitor(kind); return life.visitor; };

  /* 螢火蟲：夠暗才出來，在水面上慢慢飄、一閃一閃。 */
  function stepFlies(dt) {
    if (life.night < 0.5) { life.flies.length = 0; return; }
    while (life.flies.length < FIREFLY_N) {
      life.flies.push({ x: rand() * life.w, y: rand() * life.h, a: rand() * 6.28, ph: rand() * 6.28 });
    }
    for (const f of life.flies) {
      f.a += (rand() - 0.5) * 1.2 * dt;
      f.x += Math.cos(f.a) * 10 * dt; f.y += Math.sin(f.a) * 10 * dt;
      if (f.x < 0 || f.x > life.w) { f.a = Math.PI - f.a; f.x = Math.max(0, Math.min(life.w, f.x)); }
      if (f.y < 0 || f.y > life.h) { f.a = -f.a; f.y = Math.max(0, Math.min(life.h, f.y)); }
    }
  }

  /* 依格子輸出字元。put(cx, cy, ch, layer)，layer 是 THEMES 裡 life 顏色的鍵。
     still = 減少動效模式：只畫石子、荷葉和停住的小魚。 */
  life.render = (put, still = false) => {
    const cols = Math.ceil(life.w / CW), rows = Math.ceil(life.h / CH);
    /* 池底小石子：透過水看到的，很稀、很淡，位置固定。 */
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const hv = hash(cx * 7.3 + cy * 131.7);
      if (hv < 0.009) put(cx, cy, hv < 0.0015 ? ":" : ".", "pebble");
    }
    for (const f of life.school) {
      const cx = Math.floor(f.x / CW), cy = Math.floor(f.y / CH);
      const t = tailOf(f.vx, f.vy);
      put(cx, cy, "o", "school");
      put(cx + t.dx, cy + t.dy, t.ch, "school");
    }
    if (!still && life.visitor && life.visitor.kind === "turtle") drawVisitor(put, life.visitor);
    /* 荷葉浮在水面，蓋在小魚與龜上面。葉面用淡淡的點填滿，底下的魚才像被遮住。 */
    for (const p of life.pads) {
      const cx = Math.floor(p.x / CW), cy = Math.floor(p.y / CH);
      if (p.big) {
        ["(__)", "(..)"].forEach((line, r) => {
          for (let i = 0; i < line.length; i++) put(cx - 2 + i, cy - 1 + r, line[i], "pad");
        });
        if (p.flower) put(cx - 1, cy, "*", "flower");
      } else {
        put(cx - 1, cy, "(", "pad"); put(cx, cy, ".", "pad"); put(cx + 1, cy, ")", "pad");
      }
    }
    if (still) return;
    for (const b of life.bubbles) {
      const ch = b.age < BUBBLE_LIFE * 0.3 ? "." : b.age < BUBBLE_LIFE * 0.7 ? "o" : "O";
      put(Math.floor(b.x / CW), Math.floor(b.y / CH), ch, "bubble");
    }
    for (const r of life.ripples) {
      const steps = Math.max(8, Math.round(r.r / 2.5));
      for (let i = 0; i < steps; i++) {
        const a = i / steps * 6.283;
        put(Math.floor((r.x + Math.cos(a) * r.r) / CW), Math.floor((r.y + Math.sin(a) * r.r) / CH), r.age < 0.4 ? "o" : ".", "ripple");
      }
    }
    if (life.visitor && life.visitor.kind !== "turtle") drawVisitor(put, life.visitor);
    for (const f of life.flies) {
      const on = Math.sin(life.t * 2.2 + f.ph) > 0.2;
      put(Math.floor(f.x / CW), Math.floor(f.y / CH), on ? "*" : ".", "firefly");
    }
  };

  function drawVisitor(put, v) {
    const frame = Math.floor(v.age * (v.kind === "dragonfly" ? 6 : 2)) % 2;
    const set = SPRITES[v.kind];
    const rowsOf = Array.isArray(set) ? set[frame] : set[v.vx < 0 ? "l" : "r"][frame];
    const ox = Math.floor(v.x / CW) - 2, oy = Math.floor(v.y / CH) - Math.floor(rowsOf.length / 2);
    rowsOf.forEach((line, r) => {
      for (let i = 0; i < line.length; i++) if (line[i] !== " ") put(ox + i, oy + r, line[i], v.kind);
    });
  }

  placePads();
  spawnSchool();
  return life;
}
