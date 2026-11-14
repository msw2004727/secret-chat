import fs from 'node:fs';
import assert from 'node:assert/strict';
const {
  SHATTER_PIXEL, SHATTER_MAX, shatterBaseStep, planShatterStep,
  buildShatterParticles, shatterPoint, createShatterFx,
} = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(new URL('../chat-performance.js', import.meta.url))).toString('base64'));

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const perf = fs.readFileSync(new URL('../chat-performance.js', import.meta.url), 'utf8');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(1664525, a) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function fill(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = paint(x, y);
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
  }
  return data;
}

const scale = 2;
const width = 200, height = 80;
const step = planShatterStep([[width, height]], scale);
const coarse = 5 * scale;
assert.equal(step, shatterBaseStep(scale));
assert.equal(shatterBaseStep(scale), Math.max(2, Math.round(SHATTER_PIXEL * scale)));
const density = (coarse / step) ** 2;
assert.ok(density >= 8 && density <= 12, `grid density ${density}`);

const blue = fill(width, height, (x, y) => (x > 70 && x < 130 && y > 24 && y < 56) ? [255, 255, 255, 255] : [43, 108, 212, 255]);
const particles = buildShatterParticles({
  data: blue, width, height, scale, step,
  originX: 80, originY: 40, bubLeft: 30, bubTop: 20,
  now: 1000, random: rng(7), maxParticles: SHATTER_MAX,
});
const coarseCells = Math.ceil(width / coarse) * Math.ceil(height / coarse);
assert.ok(particles.length / coarseCells >= 8, `particle count ${particles.length} vs coarse ${coarseCells}`);
assert.ok(particles.some((p) => p.kind === 'chunk') && particles.some((p) => p.kind === 'dust'));
assert.ok(particles.every((p) => (p.kind === 'chunk' || p.kind === 'dust') && p.grow === 0 && p.gravity > 0));
const builder = perf.slice(perf.indexOf('export function buildShatterParticles'), perf.indexOf('export function createShatterFx'));
assert.doesNotMatch(builder, /smoke|fog|puff|radial|blur|shadow/i);

let outward = 0;
const seen = new Set();
for (const p of particles) {
  const m = p.color.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  assert.ok(m, p.color);
  const [r, g, b] = m.slice(1).map(Number);
  // 顏色只能是泡泡藍、白字，或兩者在格子裡混出來的中間色。
  assert.ok(r >= 30 && g >= 70 && b >= 150 && b + 40 >= r && b + 40 >= g, p.color);
  if (r > 200 && g > 200 && b > 200) seen.add('white');
  if (b > r + 40 && b > g + 40) seen.add('blue');
  const dx = p.x - 80, dy = p.y - 40;
  const dist = Math.hypot(dx, dy) || 1;
  if ((p.vx * dx + (p.vy + 70) * dy) / dist > 0) outward++;
  if (p.kind === 'chunk') assert.ok(p.sw > 0 && p.sh > 0);
}
assert.deepEqual([...seen].sort(), ['blue', 'white']);
assert.ok(outward / particles.length > 0.65, `outward ${outward}/${particles.length}`);

const sample = particles.find((p) => p.kind === 'dust');
const t0 = sample.born + 40;
const a = shatterPoint(sample, t0);
const b = shatterPoint(sample, t0 + 400);
const c = shatterPoint(sample, t0 + 800);
assert.ok(a && b && c && !a.pending);
const drop = (c.y - b.y) - (b.y - a.y);
assert.ok(Math.abs(drop - sample.gravity * 0.16) < 0.05, `fall ${drop}`);
assert.equal(shatterPoint(sample, sample.born + sample.life + 1), null);
assert.ok(shatterPoint(sample, sample.born - 5).pending);

const blank = buildShatterParticles({
  data: fill(8, 8, () => [0, 0, 0, 0]), width: 8, height: 8, scale, step: 2,
  originX: 0, originY: 0, bubLeft: 0, bubTop: 0, now: 0, random: rng(1),
});
assert.equal(blank.length, 0);

const many = Array.from({ length: 40 }, () => [400, 160]);
const cappedStep = planShatterStep(many, scale);
assert.ok(cappedStep > shatterBaseStep(scale));
let total = 0;
for (const [w, h] of many) {
  total += buildShatterParticles({
    data: fill(w, h, () => [43, 108, 212, 255]),
    width: w, height: h, scale, step: cappedStep,
    originX: w / scale / 2, originY: h / scale / 2, bubLeft: 0, bubTop: 0,
    now: 0, random: rng(3), maxParticles: SHATTER_MAX - total,
  }).length;
  if (total >= SHATTER_MAX) break;
}
assert.ok(total > 0 && total <= SHATTER_MAX, `capped ${total}`);

const quiet = {
  hidden: false,
  getElementById() { return null; },
  defaultView: { matchMedia: () => ({ matches: true }) },
};
const row = {
  isConnected: true,
  classList: { contains: () => false },
  querySelector: () => ({ getBoundingClientRect: () => ({ width: 40, height: 20, top: 0, left: 0, bottom: 20, right: 40 }) }),
};
assert.equal(createShatterFx(quiet).play(row), false);
assert.equal(createShatterFx(quiet).playAll(), false);

const open = {
  hidden: false,
  getElementById(id) {
    if (id === 'chat') return { hidden: false };
    if (id === 'scroller') return { getBoundingClientRect: () => ({ top: 0, left: 0, right: 120, bottom: 120, width: 120, height: 120 }) };
    return null;
  },
  defaultView: { matchMedia: () => ({ matches: false }) },
};
assert.equal(createShatterFx(open).play(null), false);
assert.equal(createShatterFx(open).play({ isConnected: false }), false);
assert.equal(createShatterFx(open).play({ isConnected: true, classList: { contains: () => false }, querySelector: () => null }), false);
assert.equal(createShatterFx(open).play({ isConnected: true, classList: { contains: (name) => name === 'shattering' } }), true);
const offscreen = {
  isConnected: true,
  classList: { contains: () => false },
  querySelector: () => ({ getBoundingClientRect: () => ({ top: 400, left: 0, bottom: 440, right: 80, width: 80, height: 40 }) }),
};
assert.equal(createShatterFx(open).play(offscreen), false);
const hiddenDoc = { ...open, hidden: true };
assert.equal(createShatterFx(hiddenDoc).play(row), false);
const closedChat = {
  ...open,
  getElementById(id) { return id === 'chat' ? { hidden: true } : null; },
};
assert.equal(createShatterFx(closedChat).playAll(), false);

assert.match(perf, /prefers-reduced-motion: reduce/);
assert.match(html, /id="shatterFx"/);
assert.match(css, /#shatterFx[\s\S]*pointer-events:\s*none/);
assert.match(css, /\.c-mm-danger/);
assert.equal((html.match(/id="shatterFx"/g) || []).length, 1);

const menu = source.slice(source.indexOf('function bindMsgMenu'), source.indexOf('async function sendSticker'));
assert.match(menu, /\}, 450\)/);
assert.match(menu, /S\.delMsg\(row\.dataset\.k\)/);
assert.doesNotMatch(menu, /Shatter/);
const hold = source.slice(source.indexOf('/* --- 一鍵清除：點一次露出確定，再點一次才真的清 --- */'), source.indexOf('/* --- 回到最新 --- */'));
assert.match(hold, /await S\.wipe\(\)/);
assert.match(hold, /wipeYes/);
assert.match(hold, /4000/);
assert.doesNotMatch(hold, /按住 2 秒才會清除/);
assert.doesNotMatch(hold, /Shatter/);
const del = source.slice(source.indexOf('S.delMsg = async (key) => {'), source.indexOf('const presence = new MessagePresence'));
assert.doesNotMatch(del, /Shatter/);
assert.match(source, /owns = !!Shatter\.play\(row\)/);
assert.match(source, /if \(!owns\) row\?\.remove\(\)/);
assert.equal(source.match(/try \{ Shatter\.playAll\(\); \} catch \(err\) \{ console\.error\(err\); \}\n\s+resetList\(\);/g).length, 2);
const entered = source.slice(source.indexOf('async function enterChat()'), source.indexOf('async function enterChat()') + 420);
assert.match(entered, /resetList\(\)/);
assert.doesNotMatch(entered, /playAll|Shatter/);
assert.match(source, /Shatter\.stop\(\)/);
assert.doesNotMatch(source + html + css + perf, /pixel-?cat|像素貓/i);

console.log('PASS: shatter density/colors/fall/cap/reduced-motion/missing bubble; delete and wipe keep the existing gestures and sync hooks.');
