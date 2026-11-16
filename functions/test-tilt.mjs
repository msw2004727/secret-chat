import fs from "node:fs";
import assert from "node:assert/strict";
import { tiltInput, tiltRoll, tiltHold, tiltAccelX, tiltSmooth, TILT_DEAD, TILT_G, TILT_MAX } from "../tilt.js";

assert.equal(tiltRoll(0, 0), 0);
assert.equal(tiltRoll(90, 0), 0);
assert.ok(Math.abs(tiltRoll(0, 90) - Math.PI / 2) < 1e-6);
assert.ok(Math.abs(tiltRoll(0, -90) + Math.PI / 2) < 1e-6);
assert.ok(Math.abs(tiltRoll(0, 45) - Math.PI / 4) < 1e-6);
assert.ok(Math.abs(tiltRoll(70, 5)) < 12 * Math.PI / 180);
assert.equal(tiltInput(0), 0);
assert.equal(tiltInput(TILT_DEAD * 0.5), 0);
const deg = (n) => n * Math.PI / 180;
const a20 = Math.abs(tiltInput(deg(20)));
const a80 = Math.abs(tiltInput(deg(80)));
const a90 = Math.abs(tiltInput(TILT_MAX));
assert.ok(a20 > deg(8));
assert.ok(a80 > a20 * 2);
assert.ok(Math.abs(a90 - TILT_MAX) < 1e-6);
assert.ok(Math.abs(tiltAccelX(TILT_MAX) - TILT_G) < 1e-6);
assert.equal(tiltAccelX(0), 0);
assert.ok(tiltAccelX(a20) < tiltAccelX(a80));
assert.equal(tiltHold(1.2, tiltRoll(180, 60)), TILT_MAX);
assert.equal(tiltHold(-1.2, tiltRoll(180, -60)), -TILT_MAX);
assert.equal(tiltRoll(0, Number.NaN), 0);
assert.equal(tiltInput(Number.NaN), 0);
const back = tiltSmooth(0, 0.2, 0.05);
assert.ok(back > 0 && back < 0.2);

let x = 180, y = 40, vx = 0, vy = 0;
const dt = 1 / 60;
for (let i = 0; i < 90; i++) {
  vx += tiltAccelX(0) * dt;
  vy += 1500 * dt;
  x += vx * dt;
  y += vy * dt;
  if (x < 7) { x = 7; vx = Math.abs(vx); }
  if (x > 353) { x = 353; vx = -Math.abs(vx); }
  if (y > 500) { y = 500; vy = 0; }
}
assert.ok(Number.isFinite(x) && Number.isFinite(y));
assert.ok(x > 20 && x < 340);
assert.equal(y, 500);

const pets = fs.readFileSync(new URL("../room-pets.js", import.meta.url), "utf8");
const rain = fs.readFileSync(new URL("../rain.js", import.meta.url), "utf8");
assert.match(pets, /ball\.vy \+= 1500 \* h/);
assert.match(pets, /tiltAccelX\(tiltAngle\(\)\)/);
assert.match(pets, /!Number\.isFinite\(ball\.x\)/);
assert.match(pets, /tiltAsk\(\)/);
assert.match(rain, /Y\[i\] \+= vy \+ G/);
assert.match(rain, /Math\.sin\(th\) \* G/);
assert.doesNotMatch(rain, /Math\.cos\(th\) \* G/);
