import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createPond, stepPond, halfW, spine } from '../pond-shark.js';

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

const src = fs.readFileSync(new URL('../pond-shark.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
assert.match(src, /visibilitychange/);
assert.match(src, /prefers-reduced-motion: reduce/);
assert.match(src, /#0a0c0d/);
assert.match(src, /#ffffff/);
assert.match(css, /\.c-pond canvas \{[^}]*pointer-events: none/);
assert.match(css, /\.c-scroll > \*:not\(\.c-plantbg\):not\(\.c-pond\)/);
assert.match(html, /id="pondCanvas"/);
assert.match(app, /mountPondShark/);
assert.match(app, /S\.pond\?\.stop\(\)/);
assert.doesNotMatch(app.slice(app.indexOf('function bindZoo'), app.indexOf('\nbindZoo();')), /pond-shark|pondCanvas/);

console.log('PASS: ascii sharks swim, ease into food, and stay behind the chat.');
