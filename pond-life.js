/* 魚塘的配角：小魚群、氣泡、水草、沙地、水波紋、稀有訪客，以及日夜與休息節奏。
   這裡只算位置和要畫什麼字，不碰 DOM，方便離線測試；畫布由 pond-shark.js 負責。
   全部只在這台裝置上跑，不寫雲端。數量刻意壓低，舊手機也不該發燙。 */

export const CW = 6, CH = 9;

/* 小魚群 */
export const SCHOOL_N = 8;
const SCHOOL_SPEED = 34;
const FLEE_SPEED = 120;
export const FLEE_R = 95;
const CURIOUS_S = 4.5;

/* 氣泡 */
export const BUBBLE_MAX = 7;

/* 飼料下沉 */
export const SINK = 16;

/* 休息：多久沒人點畫面就慢慢放慢 */
export const IDLE_S = 60;
export const REST_PACE = 0.55;
/* 夜裡游得慢一點 */
export const NIGHT_PACE = 0.72;

/* 稀有訪客：第一次 40～90 秒後，之後每 2～4 分鐘可能來一隻 */
const VISIT_FIRST = [40, 90];
const VISIT_GAP = [120, 240];

export const SPRITES = {
  turtle: {
    r: [[" ___ ", "/___\\o", " ^ ^ "], [" ___ ", "/___\\o", "  ^ ^"]],
    l: [[" ___ ", "o/___\\", " ^ ^ "], [" ___ ", "o/___\\", "^ ^  "]],
  },
  jelly: [[" .-. ", "(   )", " ;:; "], [" .-. ", "(   )", " :;: "]],
  octopus: [[" ,-, ", "(o o)", "/|||\\"], [" ,-, ", "(o o)", "\\|||/"]],
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

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function between(rand, [a, b]) { return a + (b - a) * rand(); }

export function createLife(width, height, opts = {}) {
  const rand = typeof opts.rand === "function" ? opts.rand : Math.random;
  const life = {
    w: Math.max(1, width), h: Math.max(1, height), t: 0,
    school: [], goal: { x: 0, y: 0, t: 0 }, curious: null,
    bubbles: [], bubbleIn: 1.5,
    weeds: [], ripples: [],
    visitor: null, visitIn: between(rand, VISIT_FIRST),
    resting: 0,
  };

  function floor() { return life.h - 2 * CH; }

  function plantWeeds() {
    const n = Math.max(3, Math.min(7, Math.round(life.w / 90)));
    life.weeds = [];
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * life.w + (hash(i + 3) - 0.5) * 40;
      life.weeds.push({ x: Math.max(CW, Math.min(life.w - CW, x)), hgt: 4 + Math.floor(hash(i + 11) * 5), ph: hash(i + 21) * 6.28 });
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
    life.goal = { x: m + rand() * Math.max(1, life.w - 2 * m), y: m + rand() * Math.max(1, life.h * 0.7 - m), t: 6 + rand() * 6 };
  }

  life.resize = (w, h) => {
    const first = life.w < 40 || life.h < 40;
    const sx = Math.max(1, w) / life.w, sy = Math.max(1, h) / life.h;
    life.w = Math.max(1, w); life.h = Math.max(1, h);
    plantWeeds();
    /* 第一次量到真正大小時重新放魚，不然從 1×1 放大會把魚群撒滿整個畫面。 */
    if (first) { spawnSchool(); return; }
    for (const f of life.school) { f.x *= sx; f.y *= sy; }
  };

  /* 點畫面：小魚好奇游過去看一下（鯊魚另外會去追飼料），也濺一圈小水波。 */
  life.tap = (x, y) => {
    life.curious = { x, y, t: CURIOUS_S };
    life.resting = 0;
    life.ripple(x, y, 14);
  };

  life.ripple = (x, y, max = 30) => {
    if (life.ripples.length >= 4) life.ripples.shift();
    life.ripples.push({ x, y, r: 2, max, age: 0 });
  };

  /* sharks：[{ x, y, pts: [[x, y], ...] }]，用來讓小魚閃開。pace：日夜加休息的倍率。 */
  life.step = (dt, sharks = [], pace = 1) => {
    if (!(dt > 0)) return;
    life.t += dt;
    const p = Math.max(0.3, Math.min(1.2, pace || 1));
    stepSchool(dt, sharks, p);
    stepBubbles(dt);
    for (const r of life.ripples) { r.age += dt; r.r = 2 + (r.max - 2) * Math.min(1, r.age / 0.7); }
    life.ripples = life.ripples.filter((r) => r.age < 0.8);
    stepVisitor(dt);
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
    const target = life.curious || (resting ? { x: life.w * 0.18, y: floor() - 3 * CH } : life.goal);
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
      if (f.y > floor() - CH) fy -= (f.y - (floor() - CH)) * 8;
      f.vx += fx * dt; f.vy += fy * dt;
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > top) { f.vx = f.vx / sp * top; f.vy = f.vy / sp * top; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.x = Math.max(0, Math.min(life.w, f.x));
      f.y = Math.max(0, Math.min(life.h, f.y));
    }
  }

  function stepBubbles(dt) {
    life.bubbleIn -= dt;
    if (life.bubbleIn <= 0 && life.bubbles.length < BUBBLE_MAX && life.weeds.length) {
      const w = life.weeds[Math.floor(rand() * life.weeds.length)];
      life.bubbles.push({ x: w.x + (rand() - 0.5) * 10, y: floor() - w.hgt * CH, age: 0, vy: 18 + rand() * 12, ph: rand() * 6.28, top: life.h * (0.08 + rand() * 0.3) });
      life.bubbleIn = 1.5 + rand() * 2.5;
    }
    for (const b of life.bubbles) { b.age += dt; b.y -= b.vy * dt; }
    life.bubbles = life.bubbles.filter((b) => b.y > b.top);
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
    if (v.kind === "jelly") v.x += Math.sin(v.age * 0.9) * 6 * dt;
    else v.y = v.y0 + Math.sin(v.age * 1.3) * 4;
    const out = v.x < -60 || v.x > life.w + 60 || v.y < -40;
    if (out || v.age > 90) life.visitor = null;
  }

  function makeVisitor() {
    const r = rand();
    const fromLeft = rand() < 0.5;
    if (r < 0.4) {
      const y = life.h * (0.3 + rand() * 0.3);
      return { kind: "turtle", x: fromLeft ? -40 : life.w + 40, y, y0: y, vx: fromLeft ? 22 : -22, vy: 0, age: 0 };
    }
    if (r < 0.75) {
      return { kind: "jelly", x: life.w * (0.2 + rand() * 0.6), y: life.h + 20, y0: 0, vx: 0, vy: -10, age: 0 };
    }
    const y = floor() - 4 * CH;
    return { kind: "octopus", x: fromLeft ? -40 : life.w + 40, y, y0: y, vx: fromLeft ? 26 : -26, vy: 0, age: 0 };
  }

  life.spawnVisitor = (kind) => {
    let v = makeVisitor();
    for (let i = 0; i < 20 && kind && v.kind !== kind; i++) v = makeVisitor();
    life.visitor = v;
    return v;
  };

  /* 依格子輸出字元。put(cx, cy, ch, layer)，layer 是 THEMES 裡 life 顏色的鍵。
     still = 減少動效模式：只畫沙、水草和停住的小魚。 */
  life.render = (put, still = false) => {
    const cols = Math.ceil(life.w / CW), rows = Math.ceil(life.h / CH);
    const sandRow = rows - 2;
    const sand = ".,_.:_,.";
    for (let cx = 0; cx < cols; cx++) {
      put(cx, sandRow + 1, sand[Math.floor(hash(cx) * sand.length)], "sand");
      if (hash(cx + 99) < 0.35) put(cx, sandRow, hash(cx + 7) < 0.15 ? "o" : ".", "sand");
    }
    const t = still ? 0 : life.t;
    for (const w of life.weeds) {
      const base = Math.floor(w.x / CW);
      for (let k = 1; k <= w.hgt; k++) {
        const sway = Math.sin(t * 0.8 + w.ph + k * 0.45) * (k / w.hgt) * 1.6;
        const off = Math.round(sway);
        const ch = sway > 0.35 ? ")" : sway < -0.35 ? "(" : "|";
        put(base + off, sandRow - k, k === w.hgt ? "," : ch, "weed");
      }
    }
    if (!still) {
      for (const b of life.bubbles) {
        const wob = Math.sin(b.age * 2.4 + b.ph) * 4;
        const ch = b.age < 1.2 ? "." : b.age < 3 ? "o" : "O";
        put(Math.floor((b.x + wob) / CW), Math.floor(b.y / CH), ch, "bubble");
      }
    }
    for (const f of life.school) {
      const cx = Math.floor(f.x / CW), cy = Math.floor(f.y / CH);
      const glyph = f.vx < 0 ? "<><" : "><>";
      for (let i = 0; i < 3; i++) put(cx - 1 + i, cy, glyph[i], "school");
    }
    if (!still && life.visitor) {
      const v = life.visitor;
      const frame = Math.floor(v.age * 2) % 2;
      const rowsOf = v.kind === "turtle" ? SPRITES.turtle[v.vx < 0 ? "l" : "r"][frame] : SPRITES[v.kind][frame];
      const ox = Math.floor(v.x / CW) - 2, oy = Math.floor(v.y / CH) - 1;
      rowsOf.forEach((line, r) => {
        for (let i = 0; i < line.length; i++) if (line[i] !== " ") put(ox + i, oy + r, line[i], v.kind);
      });
    }
    if (!still) {
      for (const r of life.ripples) {
        const steps = Math.max(8, Math.round(r.r / 2.5));
        for (let i = 0; i < steps; i++) {
          const a = i / steps * 6.283;
          put(Math.floor((r.x + Math.cos(a) * r.r) / CW), Math.floor((r.y + Math.sin(a) * r.r * 0.6) / CH), r.age < 0.4 ? "o" : ".", "ripple");
        }
      }
    }
  };

  plantWeeds();
  spawnSchool();
  return life;
}
