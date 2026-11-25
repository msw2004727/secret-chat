import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createLife, nightness, moodPace, SCHOOL_N, BUBBLE_MAX, FLEE_R, IDLE_S, REST_PACE, NIGHT_PACE, SINK, CW, CH } from '../pond-life.js';
import { createPond, stepPond } from '../pond-shark.js';

/* 固定亂數，每次跑結果一樣。 */
function seeded(n = 7) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/* 日夜與休息節奏 */
assert.equal(nightness(new Date(2026, 10, 25, 12, 0)), 0, 'noon is day');
assert.equal(nightness(new Date(2026, 10, 25, 23, 0)), 1, 'late night');
assert.equal(nightness(new Date(2026, 10, 25, 3, 0)), 1, 'small hours');
const dusk = nightness(new Date(2026, 10, 25, 19, 30));
assert.ok(dusk > 0 && dusk < 1, 'dusk fades in, got ' + dusk);
assert.equal(moodPace(0, 0), 1);
assert.ok(Math.abs(moodPace(1, 0) - NIGHT_PACE) < 1e-9);
assert.equal(moodPace(0, IDLE_S), 1, 'no slowdown right at the idle mark');
assert.ok(Math.abs(moodPace(0, IDLE_S + 60) - REST_PACE) < 1e-9, 'rests after a long idle');
assert.ok(moodPace(0, IDLE_S + 10) < 1 && moodPace(0, IDLE_S + 10) > REST_PACE, 'rest eases in');

/* 鯊魚巡航跟著倍率放慢，搶飼料仍全速 */
const slow = createPond(400, 640);
slow.pace = 0.5;
for (let i = 0; i < 60; i++) stepPond(slow, 0.05);
const cruise = 2.0 * 5.2 * 4.5 * 0.75;
assert.ok(Math.abs(slow.fish[0].sp - cruise * 0.5) < cruise * 0.08, 'cruise slows with pace');
slow.foods.push({ x: 200, y: 300, age: 0 });
let fastest = 0;
for (let i = 0; i < 30; i++) { stepPond(slow, 0.05); for (const f of slow.fish) fastest = Math.max(fastest, f.sp); }
assert.ok(fastest > cruise * 4, 'racing ignores the slow pace, peak ' + (fastest / cruise).toFixed(2));

/* 丟下的飼料會沉到沙地上方停住，不會自己消失 */
const sink = createPond(400, 640);
sink.fish.forEach((f) => { f.x = -9999; f.y = -9999; f.trail = []; });
sink.alive = [false, false];
sink.drop(200, 100);
assert.equal(sink.foods[0].vy, SINK);
for (let i = 0; i < 400; i++) stepPond(sink, 0.1, sink.alive);
assert.equal(sink.foods.length, 1, 'uneaten pellet stays');
assert.ok(Math.abs(sink.foods[0].y - (640 - 22)) < 1e-6, 'pellet rests just above the sand');
const fixed = createPond(400, 640);
fixed.alive = [false, false];
fixed.foods.push({ x: 50, y: 50, age: 0 });
stepPond(fixed, 1, fixed.alive);
assert.equal(fixed.foods[0].y, 50, 'pellets without vy stay put (old tests and still mode)');

/* 小魚群：數量、待在畫面內、會閃鯊魚 */
const life = createLife(390, 640, { rand: seeded() });
assert.equal(life.school.length, SCHOOL_N);
for (let i = 0; i < 1200; i++) life.step(0.05, [], 1);
for (const f of life.school) {
  assert.ok(f.x >= 0 && f.x <= 390 && f.y >= 0 && f.y <= 640, 'small fish stay inside the pond');
}
const c = life.school.reduce((a, f) => ({ x: a.x + f.x / SCHOOL_N, y: a.y + f.y / SCHOOL_N }), { x: 0, y: 0 });
const spread = Math.max(...life.school.map((f) => Math.hypot(f.x - c.x, f.y - c.y)));
assert.ok(spread < 120, 'the school stays together, spread ' + spread.toFixed(1));

const flee = createLife(390, 640, { rand: seeded(3) });
flee.school.forEach((f, i) => { f.x = 190 + i; f.y = 300; f.vx = 0; f.vy = 0; });
const shark = [{ x: 200, y: 300, pts: [[200, 300]] }];
for (let i = 0; i < 20; i++) flee.step(0.05, shark, 1);
const minD = Math.min(...flee.school.map((f) => Math.hypot(f.x - 200, f.y - 300)));
assert.ok(minD > 30, 'small fish scatter away from a shark, closest ' + minD.toFixed(1));
assert.ok(FLEE_R > 50);

/* 點畫面：小魚好奇游過去 */
const cur = createLife(390, 640, { rand: seeded(5) });
cur.school.forEach((f) => { f.x = 60; f.y = 80; });
cur.tap(320, 500);
assert.ok(cur.curious && cur.ripples.length === 1, 'tap makes them curious and leaves a ripple');
const d0 = Math.hypot(60 - 320, 80 - 500);
for (let i = 0; i < 80; i++) cur.step(0.05, [], 1);
const cc = cur.school.reduce((a, f) => ({ x: a.x + f.x / SCHOOL_N, y: a.y + f.y / SCHOOL_N }), { x: 0, y: 0 });
assert.ok(Math.hypot(cc.x - 320, cc.y - 500) < d0 * 0.75, 'the school heads toward the tap');
for (let i = 0; i < 120; i++) cur.step(0.05, [], 1);
assert.equal(cur.curious, null, 'curiosity wears off');
assert.equal(cur.ripples.length, 0, 'ripples fade');

/* 先用 1×1 建立、再量到真正大小時，魚群要聚在一起，不是被放大撒滿畫面 */
const grown = createLife(1, 1, { rand: seeded(19) });
grown.resize(375, 812);
const gc = grown.school.reduce((a, f) => ({ x: a.x + f.x / SCHOOL_N, y: a.y + f.y / SCHOOL_N }), { x: 0, y: 0 });
assert.ok(Math.max(...grown.school.map((f) => Math.hypot(f.x - gc.x, f.y - gc.y))) < 40, 'school starts bunched after the first real measure');

/* 氣泡有上限，而且會往上冒、到頂就破 */
const bub = createLife(390, 640, { rand: seeded(9) });
let peak = 0;
for (let i = 0; i < 2000; i++) { bub.step(0.05, [], 1); peak = Math.max(peak, bub.bubbles.length); }
assert.ok(peak > 0 && peak <= BUBBLE_MAX, 'bubbles appear but stay capped, peak ' + peak);
const one = createLife(390, 640, { rand: seeded(11) });
for (let i = 0; i < 200 && !one.bubbles.length; i++) one.step(0.05, [], 1);
const b = one.bubbles[0], y0 = b.y;
one.step(0.5, [], 1);
assert.ok(!one.bubbles.includes(b) || b.y < y0, 'bubbles rise');

/* 稀有訪客：會來、會走，一次一隻 */
const vis = createLife(390, 640, { rand: seeded(13) });
let seen = new Set(), maxAge = 0;
for (let i = 0; i < 20 * 60 * 30; i++) {
  vis.step(0.05, [], 1);
  if (vis.visitor) { seen.add(vis.visitor.kind); maxAge = Math.max(maxAge, vis.visitor.age); }
}
assert.ok(seen.size >= 2, 'more than one kind of visitor shows up over 30 minutes: ' + [...seen]);
assert.ok(maxAge <= 90.1, 'visitors always leave');
for (const kind of ['turtle', 'jelly', 'octopus']) {
  const v = vis.spawnVisitor(kind);
  assert.equal(v.kind, kind);
}

/* 畫字：沙、水草、小魚、訪客都畫得出來；減少動效時不畫氣泡與訪客 */
const draw = createLife(390, 640, { rand: seeded(17) });
for (let i = 0; i < 200; i++) draw.step(0.05, [], 1);
draw.spawnVisitor('turtle').x = 150;
const got = { all: new Map(), still: new Map() };
const collect = (m) => (cx, cy, ch, layer) => { m.set(layer, (m.get(layer) || 0) + 1); assert.equal(typeof ch, 'string'); assert.equal(ch.length, 1); };
draw.render(collect(got.all), false);
draw.render(collect(got.still), true);
for (const k of ['sand', 'weed', 'school', 'turtle']) assert.ok(got.all.get(k) > 0, 'draws ' + k);
assert.ok(!got.still.has('turtle') && !got.still.has('bubble'), 'still mode skips moving extras');
assert.ok(got.still.get('school') === SCHOOL_N * 3, 'still mode still shows the school');
const total = [...got.all.values()].reduce((a, n) => a + n, 0);
assert.ok(total < 600, 'extras stay light, drew ' + total + ' cells');
assert.equal(CW, 6); assert.equal(CH, 9);

/* 接線：pond-shark 有用到配角，而且全部只在本機跑 */
const src = fs.readFileSync(new URL('../pond-shark.js', import.meta.url), 'utf8');
const lifeSrc = fs.readFileSync(new URL('../pond-life.js', import.meta.url), 'utf8');
assert.match(src, /from "\.\/pond-life\.js"/);
assert.match(src, /life\.render\(putLife, still\)/);
assert.match(src, /life\.tap\(/);
assert.match(src, /buf\[i\] > 0\.05\) continue/, 'sharks win overlapping cells');
assert.doesNotMatch(lifeSrc, /document|window|firebase|ref\(/, 'pond-life stays pure and local');
const check = fs.readFileSync(new URL('../scripts/check.mjs', import.meta.url), 'utf8');
assert.match(check, /'pond-life\.js'/);

console.log('PASS: pond life adds a school, bubbles, weeds, visitors and day/night rest, all local.');
