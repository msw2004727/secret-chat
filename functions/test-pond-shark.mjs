import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createPond, stepPond, halfW, spine, PACE } from '../pond-shark.js';

assert.ok(halfW(2) < halfW(12), 'front of the shark is narrower than the middle');
const pond = createPond(400, 700);
const fish = pond.fish[0];
fish.x = 80; fish.y = 80; fish.a = 0; fish.turn = 0; fish.t = 0;
pond.foods.push({ x: 80, y: 280, age: 0 });
const before = fish.a;
stepPond(pond, 0.016);
assert.ok(Math.abs(fish.a - before) > 0 && Math.abs(fish.a - before) < 0.05, 'turn eases in, it does not snap');
assert.equal(pond.foods.length, 1);

const near = createPond(400, 700);
near.fish[1].x = 900; near.fish[1].y = 900;
near.fish[0].x = 100; near.fish[0].y = 100; near.fish[0].a = 0; near.fish[0].turn = 0; near.fish[0].t = 0;
const [hx, hy] = spine(near.fish[0], 0);
near.foods.push({ x: hx, y: hy, age: 0 });
stepPond(near, 0.05);
assert.equal(near.foods.length, 0, 'the fish that arrives first eats the food');
assert.ok(near.fish[0].gulp > 0);
assert.equal(near.fish[1].gulp, 0);

const cruise = 2.0 * 5.2 * 4.5 * PACE;
assert.equal(PACE, 0.75);
assert.ok(Math.abs(createPond(300, 500).fish[0].sp - cruise) < 1e-6);
assert.ok(Math.abs(createPond(300, 500).fish[0].beat - 3.6 * PACE) < 1e-6);

function untilEaten(setup, limit = 12) {
  const p = createPond(420, 640);
  setup(p);
  let t = 0;
  while (p.foods.length && t < limit) { stepPond(p, 0.05); t += 0.05; }
  return { left: p.foods.length, t, gulp: p.fish.some((f) => f.gulp > 0) };
}
const side = untilEaten((p) => {
  p.fish[0].x = 180; p.fish[0].y = 300; p.fish[0].a = 0; p.fish[0].turn = 0; p.fish[0].t = 0;
  p.fish[1].x = 40; p.fish[1].y = 40; p.fish[1].a = 0;
  p.foods.push({ x: 210, y: 300, age: 0 });
});
assert.equal(side.left, 0, 'a fish passing beside the pellet still eats it');
assert.ok(side.t < 6, 'side approach finishes within a few seconds, took ' + side.t);

const corner = untilEaten((p) => {
  p.fish[0].x = 200; p.fish[0].y = 320; p.fish[0].a = Math.PI; p.fish[0].turn = 0; p.fish[0].t = 0;
  p.fish[1].x = 200; p.fish[1].y = 80; p.fish[1].a = 0;
  p.drop(4, 630);
  p.drop(410, 8);
});
assert.equal(corner.left, 0, 'pellets in the corners are eaten');
assert.ok(corner.t < 12, 'corners clear, took ' + corner.t);
const arc = createPond(900, 900);
const leader = arc.fish[0];
leader.x = 450; leader.y = 450; leader.a = 0; leader.turn = 0; leader.t = 0; leader.trail = [];
const path = [];
for (let i = 0; i <= 70; i++) {
  const a = i / 70 * Math.PI / 2;
  path.push({ x: 450 + Math.sin(a) * 280, y: 450 - Math.cos(a) * 280 });
}
leader.x = path[path.length - 1].x;
leader.y = path[path.length - 1].y;
leader.trail = path.slice().reverse();
const mid = spine(leader, 20);
const along = path[path.length - 1 - 20];
assert.ok(Math.hypot(mid[0] - along.x, mid[1] - along.y) < 30, 'body lies on the head trail');

const fresh = createPond(400, 600);
fresh.drop(10, 10);
fresh.fish[0].a = 2;
fresh.reset();
assert.equal(fresh.foods.length, 0);
assert.ok(Math.abs(fresh.fish[0].a - 0.4) < 1e-9);
assert.equal(fresh.fish[0].turn, 0);
assert.ok(Math.abs(fresh.fish[0].sp - cruise) < 1e-6);

const src = fs.readFileSync(new URL('../pond-shark.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
assert.match(src, /marginLeft = \(-padL\)/);
assert.match(src, /marginRight = \(-padR\)/);
assert.match(src, /visibilitychange/);
assert.match(src, /prefers-reduced-motion: reduce/);
assert.match(src, /#0a0c0d/);
assert.match(src, /#ffffff/);
assert.match(src, /#3d5160/);
assert.match(src, /#5a4450/);
assert.match(src, /#b7cfe0/);
assert.match(src, /#e3c2ce/);
assert.match(app, /S\.pond\?\.reset\?\.\(\)/);
assert.match(css, /\.c-pond canvas \{[^}]*pointer-events: none/);
assert.match(css, /\.c-scroll > \*:not\(\.c-plantbg\):not\(\.c-pond\)/);
assert.match(html, /id="pondCanvas"/);
assert.match(app, /mountPondShark/);
assert.match(app, /S\.pond\?\.stop\(\)/);
assert.doesNotMatch(app.slice(app.indexOf('function bindZoo'), app.indexOf('\nbindZoo();')), /pond-shark|pondCanvas/);

console.log('PASS: ascii sharks swim, ease into food, and stay behind the chat.');
