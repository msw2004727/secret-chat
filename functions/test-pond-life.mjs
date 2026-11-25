import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createLife, nightness, moodPace, tailOf, SCHOOL_N, BUBBLE_MAX, BUBBLE_LIFE, FLEE_R, IDLE_S, REST_PACE, NIGHT_PACE, FIREFLY_N, VISIT_ODDS, CW, CH } from '../pond-life.js';
import { createPond, stepPond } from '../pond-shark.js';

/* 魚池是從上往下鳥瞰的：沒有池底線、沒有直立水草，東西不往上飄也不往下沉。 */

/* 固定亂數，每次跑結果一樣。 */
function seeded(n = 7) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const center = (fish) => fish.reduce((a, f) => ({ x: a.x + f.x / fish.length, y: a.y + f.y / fish.length }), { x: 0, y: 0 });

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

/* 鳥瞰：丟下的飼料留在原地，不會在畫面上往下掉，也不會自己消失 */
const stay = createPond(400, 640);
stay.alive = [false, false];
stay.drop(200, 100);
for (let i = 0; i < 400; i++) stepPond(stay, 0.1, stay.alive);
assert.equal(stay.foods.length, 1, 'uneaten pellet stays');
assert.equal(stay.foods[0].y, 100, 'pellet does not move down the screen');
assert.equal(stay.foods[0].vy, undefined);

/* 小魚尾巴跟著游的方向 */
assert.deepEqual(tailOf(10, 0), { dx: -1, dy: 0, ch: '-' });
assert.deepEqual(tailOf(-10, 0), { dx: 1, dy: 0, ch: '-' });
assert.deepEqual(tailOf(0, 10), { dx: 0, dy: -1, ch: '|' });
assert.deepEqual(tailOf(10, 10), { dx: -1, dy: -1, ch: '\\' }, 'swimming down-right leaves a \\ tail up-left');
assert.deepEqual(tailOf(10, -10), { dx: -1, dy: 1, ch: '/' });

/* 小魚群：數量、待在畫面內、聚在一起、會閃鯊魚 */
const life = createLife(390, 640, { rand: seeded() });
assert.equal(life.school.length, SCHOOL_N);
for (let i = 0; i < 1200; i++) life.step(0.05, [], 1);
for (const f of life.school) assert.ok(f.x >= 0 && f.x <= 390 && f.y >= 0 && f.y <= 640, 'small fish stay inside the pond');
const c = center(life.school);
const spread = Math.max(...life.school.map((f) => Math.hypot(f.x - c.x, f.y - c.y)));
assert.ok(spread < 120, 'the school stays together, spread ' + spread.toFixed(1));

const flee = createLife(390, 640, { rand: seeded(3) });
flee.school.forEach((f, i) => { f.x = 190 + i; f.y = 300; f.vx = 0; f.vy = 0; });
for (let i = 0; i < 20; i++) flee.step(0.05, [{ x: 200, y: 300, pts: [[200, 300]] }], 1);
const minD = Math.min(...flee.school.map((f) => Math.hypot(f.x - 200, f.y - 300)));
assert.ok(minD > 30, 'small fish scatter away from a shark, closest ' + minD.toFixed(1));
assert.ok(FLEE_R > 50);

/* 第一次量到真正大小時，魚群要聚在一起，不是被放大撒滿畫面 */
const grown = createLife(1, 1, { rand: seeded(19) });
grown.resize(375, 812);
const gc = center(grown.school);
assert.ok(Math.max(...grown.school.map((f) => Math.hypot(f.x - gc.x, f.y - gc.y))) < 40, 'school starts bunched after the first real measure');

/* 點畫面：小魚好奇游過去，之後消退 */
const cur = createLife(390, 640, { rand: seeded(5) });
cur.school.forEach((f) => { f.x = 60; f.y = 80; });
cur.tap(320, 500);
assert.ok(cur.curious && cur.ripples.length === 1, 'tap makes them curious and leaves a ripple');
const d0 = Math.hypot(60 - 320, 80 - 500);
for (let i = 0; i < 80; i++) cur.step(0.05, [], 1);
const cc = center(cur.school);
assert.ok(Math.hypot(cc.x - 320, cc.y - 500) < d0 * 0.75, 'the school heads toward the tap');
for (let i = 0; i < 120; i++) cur.step(0.05, [], 1);
assert.equal(cur.curious, null, 'curiosity wears off');

/* 休息：魚群躲到大荷葉底下 */
const rest = createLife(390, 640, { rand: seeded(23) });
for (let i = 0; i < 600; i++) rest.step(0.05, [], REST_PACE);
const shade = rest.shade(), rc = center(rest.school);
assert.ok(Math.hypot(rc.x - shade.x, rc.y - shade.y) < 60, 'resting school hides under the big lily pad');

/* 荷葉：浮在原地附近慢慢漂，不會漂走；至少一片大的、一朵花 */
const pads = createLife(390, 640, { rand: seeded(29) });
assert.ok(pads.pads.length >= 3 && pads.pads.some((p) => p.big) && pads.pads.some((p) => p.flower));
const p0 = { x: pads.pads[0].x0, y: pads.pads[0].y0 };
for (let i = 0; i < 3000; i++) pads.step(0.05, [], 1);
assert.ok(Math.hypot(pads.pads[0].x - p0.x, pads.pads[0].y - p0.y) <= 12, 'lily pads drift in place');

/* 氣泡：在原地冒出、不移動，有上限，破掉時留一圈水波 */
const bub = createLife(390, 640, { rand: seeded(9) });
let peak = 0, sawPop = false;
for (let i = 0; i < 2000; i++) {
  const before = bub.bubbles.map((b) => [b, b.x, b.y]);
  bub.step(0.05, [], 1);
  for (const [b, x, y] of before) if (bub.bubbles.includes(b)) assert.ok(b.x === x && b.y === y, 'bubbles do not drift');
  peak = Math.max(peak, bub.bubbles.length);
  if (bub.ripples.some((r) => r.max === 10)) sawPop = true;
}
assert.ok(peak > 0 && peak <= BUBBLE_MAX, 'bubbles appear but stay capped, peak ' + peak);
assert.ok(sawPop, 'popping bubbles leave a small ripple');
assert.equal(BUBBLE_LIFE, 2);

/* 水波是正圓（鳥瞰沒有透視壓扁） */
const ring = createLife(390, 640, { rand: seeded(31) });
ring.bubbles.length = 0;
ring.bubbleIn = 99;
ring.ripples.length = 0;
ring.ripple(195, 320, 30);
for (let i = 0; i < 14; i++) ring.step(0.05, [], 1);
const cells = [];
ring.render((cx, cy, ch, layer) => { if (layer === 'ripple') cells.push([cx * CW, cy * CH]); }, false);
const xs = cells.map((p) => p[0]), ys = cells.map((p) => p[1]);
const wR = (Math.max(...xs) - Math.min(...xs)) / 2, hR = (Math.max(...ys) - Math.min(...ys)) / 2;
assert.ok(hR > wR * 0.75, 'ripples are round, not squashed: w ' + wR + ' h ' + hR);

/* 訪客：池塘動物，會來會走，一次一隻 */
assert.deepEqual(Object.keys(VISIT_ODDS).sort(), ['dragonfly', 'duck', 'leaf', 'turtle']);
assert.ok(Math.abs(Object.values(VISIT_ODDS).reduce((a, n) => a + n, 0) - 1) < 1e-9);
const vis = createLife(390, 640, { rand: seeded(13) });
const seen = new Set();
let maxAge = 0;
for (let i = 0; i < 20 * 60 * 40; i++) {
  vis.step(0.05, [], 1);
  if (vis.visitor) { seen.add(vis.visitor.kind); maxAge = Math.max(maxAge, vis.visitor.age); }
}
assert.ok(seen.size >= 2, 'more than one kind of visitor shows up: ' + [...seen]);
for (const k of seen) assert.ok(k in VISIT_ODDS, 'only pond animals: ' + k);
assert.ok(maxAge <= 90.1, 'visitors always leave');
const dfly = createLife(390, 640, { rand: seeded(37) });
const df = dfly.spawnVisitor('dragonfly');
for (let i = 0; i < 200 && dfly.visitor; i++) dfly.step(0.05, [], 1);
assert.ok(df.touched, 'the dragonfly dips the water once');
const duck = createLife(390, 640, { rand: seeded(41) });
duck.spawnVisitor('duck');
duck.bubbleIn = 99;
duck.ripples.length = 0;
const wakes = new Set();
for (let i = 0; i < 40; i++) { duck.step(0.05, [], 1); for (const r of duck.ripples) wakes.add(r); }
assert.ok(wakes.size >= 3, 'the duck leaves a wake, got ' + wakes.size);

/* 螢火蟲：夠暗才出來 */
const ff = createLife(390, 640, { rand: seeded(43) });
ff.step(0.05, [], 1, 0);
assert.equal(ff.flies.length, 0, 'no fireflies by day');
ff.step(0.05, [], 1, 1);
assert.equal(ff.flies.length, FIREFLY_N, 'fireflies come out at night');
ff.step(0.05, [], 1, 0.2);
assert.equal(ff.flies.length, 0, 'and leave at dawn');

/* 畫字：鳥瞰元素都畫得出來；沒有沙地、水草；減少動效時只剩石子、小魚、荷葉 */
const draw = createLife(390, 640, { rand: seeded(17) });
for (let i = 0; i < 200; i++) draw.step(0.05, [], 1, 1);
draw.spawnVisitor('turtle').x = 150;
const got = { all: new Map(), still: new Map() };
const collect = (m) => (cx, cy, ch, layer) => { m.set(layer, (m.get(layer) || 0) + 1); assert.equal(typeof ch, 'string'); assert.equal(ch.length, 1); };
draw.render(collect(got.all), false);
draw.render(collect(got.still), true);
for (const k of ['pebble', 'school', 'pad', 'flower', 'turtle', 'firefly']) assert.ok(got.all.get(k) > 0, 'draws ' + k);
for (const k of ['sand', 'weed', 'jelly', 'octopus']) assert.ok(!got.all.has(k), 'no side-view ' + k);
assert.deepEqual([...got.still.keys()].sort(), ['flower', 'pad', 'pebble', 'school'], 'still mode keeps only calm things');
assert.equal(got.still.get('school'), SCHOOL_N * 2, 'each small fish is a head and a tail');
const total = [...got.all.values()].reduce((a, n) => a + n, 0);
assert.ok(total < 600, 'extras stay light, drew ' + total + ' cells');

/* 接線：pond-shark 用到配角、荷葉蓋過鯊魚、全部只在本機跑 */
const src = fs.readFileSync(new URL('../pond-shark.js', import.meta.url), 'utf8');
const lifeSrc = fs.readFileSync(new URL('../pond-life.js', import.meta.url), 'utf8');
assert.match(src, /from "\.\/pond-life\.js"/);
assert.match(src, /life\.render\(putLife, still\)/);
assert.match(src, /life\.tap\(/);
assert.match(src, /const OVER = \["pad"/, 'lily pads sit on the surface');
assert.match(src, /lifeLy\[i\] >= overFrom\) continue/, 'surface things cover the sharks');
assert.doesNotMatch(src, /SINK|vy: /, 'pellets no longer fall down the screen');
assert.doesNotMatch(lifeSrc, /document|window|firebase|ref\(/, 'pond-life stays pure and local');
const check = fs.readFileSync(new URL('../scripts/check.mjs', import.meta.url), 'utf8');
assert.match(check, /'pond-life\.js'/);

console.log('PASS: top-down pond life — school, lily pads, bubbles, round ripples, pond visitors, fireflies, all local.');
