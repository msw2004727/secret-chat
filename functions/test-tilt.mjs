import fs from "node:fs";
import assert from "node:assert/strict";
import { tiltInput, tiltSmooth, tiltAccel, TILT_DEAD, TILT_G } from "../tilt.js";

assert.equal(tiltInput(0), 0);
assert.equal(tiltInput(TILT_DEAD * 0.5), 0);
assert.ok(tiltInput(TILT_DEAD + 0.1) > 0);
assert.ok(tiltInput(-(TILT_DEAD + 0.1)) < 0);
assert.ok(Math.abs(tiltInput(2)) <= 0.42);
const flat = tiltAccel(0);
assert.equal(flat.x, 0);
assert.ok(Math.abs(flat.y - TILT_G) < 1e-6);
const lean = tiltAccel(0.2);
assert.ok(lean.x > 0);
assert.ok(lean.y < TILT_G);
const back = tiltSmooth(0, 0.2, 0.05);
assert.ok(back > 0 && back < 0.2);

const pets = fs.readFileSync(new URL("../room-pets.js", import.meta.url), "utf8");
const rain = fs.readFileSync(new URL("../rain.js", import.meta.url), "utf8");
assert.match(pets, /tiltAccel\(tiltAngle\(\)\)/);
assert.match(pets, /tiltAsk\(\)/);
assert.match(pets, /tiltRelease\(\)/);
assert.match(rain, /Math\.sin\(th\) \* G/);
assert.match(rain, /tiltAsk\(\)/);
assert.match(rain, /tiltRelease\(\)/);
const tilt = fs.readFileSync(new URL("../tilt.js", import.meta.url), "utf8");
assert.match(tilt, /requestPermission/);
assert.match(tilt, /document\.hidden/);
