import fs from 'node:fs';
import { droopClimbIds, DROOP_CLIMB_FRESH_MS, DROOP, droopTapCount, droopPhase, droopFallY, droopFallMs, droopSag, droopSoftSag, droopHang, droopInkSpan, droopSoftPose, droopTapAction, droopBurstEndAction, droopPlayBurst, droopRecordKind } from '../droop.js';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const dr = rules.rules.rooms.$roomId.dr.$msgId;
assert.equal(dr.$other['.validate'], false);
assert.match(dr['.validate'], /!newData\.exists\(\)/);
assert.match(dr['.validate'], /m\/' \+ \$msgId/);
assert.match(dr.t['.validate'], /now \+ 60000/);
assert.match(dr.on['.validate'], /isBoolean/);

const room = 'a'.repeat(32);
const ctx = {
  now: 1_000_000,
  $roomId: room,
  $msgId: 'm1',
  newData: {
    exists: () => true,
    hasChildren: (keys) => keys.every((k) => ['on', 't', 'by'].includes(k)),
  },
  root: { child: (path) => ({ exists: () => path === `rooms/${room}/m/m1` }) },
};
assert.equal(vm.runInNewContext(dr['.validate'], ctx), true);
ctx.root = { child: () => ({ exists: () => false }) };
assert.equal(vm.runInNewContext(dr['.validate'], ctx), false);
ctx.newData = { exists: () => false, hasChildren: () => false };
assert.equal(vm.runInNewContext(dr['.validate'], ctx), true, 'deleting a droop record is allowed');

const rain = rules.rules.rooms.$roomId.rain;
assert.equal(rain.$other['.validate'], false);
assert.match(rain['.validate'], /hasChildren\(\['t','by'\]\)/);
assert.match(rain.t['.validate'], /now \+ 60000/);
assert.match(rain.by['.validate'], /length <= 64/);
assert.match(rain.end['.validate'], /isNumber/);
const rainCtx = {
  now: 1_000_000,
  newData: {
    exists: () => true,
    hasChildren: (keys) => keys.every((k) => ['t', 'by'].includes(k)),
    isNumber: () => true,
    isString: () => true,
    val: () => 1,
  },
};
assert.equal(vm.runInNewContext(rain['.validate'], rainCtx), true);
rainCtx.newData = { exists: () => false, hasChildren: () => false };
assert.equal(vm.runInNewContext(rain['.validate'], rainCtx), true, 'deleting rain is allowed');

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pets = fs.readFileSync(new URL('../room-pets.js', import.meta.url), 'utf8');
const droop = fs.readFileSync(new URL('../droop.js', import.meta.url), 'utf8');
const cfg = fs.readFileSync(new URL('../config.js', import.meta.url), 'utf8');
assert.match(html, /id="setPets"/);
assert.match(app, /KEY: "sc-pets"/);
assert.match(app, /remove\(ref\(db, `\$\{base\}\/dr`\)\)/);
assert.match(app, /remove\(ref\(db, `\$\{base\}\/rain`\)\)/);
assert.match(app, /BallRain\.stop\(\)/);
assert.match(app, /remove\(ref\(db, `\$\{base\}\/dr\/\$\{key\}`\)\)/);
assert.match(app, /Droop\.straighten\(row\)/);
assert.match(app, /Droop\.clearAll\(\)/);
assert.equal(DROOP.ANGLE_DEG, 90);
assert.equal(DROOP.SOFT_ANGLE_DEG, 60);
assert.equal(DROOP.TAP_COUNT, 3);
assert.equal(DROOP.TAP_GAP_MS, 600);
assert.equal(DROOP.RECOVER_MS, 2500);
assert.equal(DROOP.GONE_MS, 5000);
assert.equal(DROOP.FADE_MS, 1000);
assert.ok(DROOP.HINGE_POW > 0 && DROOP.HINGE_POW < 1);
assert.match(droop, /TAP_COUNT: 3/);
assert.match(droop, /TAP_GAP_MS: 600/);
assert.match(droop, /prefers-reduced-motion: reduce/);
assert.match(droop, /id = "droopLayer"/);
assert.doesNotMatch(droop, /DOUBLE_TAP_MS/);
assert.doesNotMatch(droop, /const on = !\(st && st\.on\)/);
assert.match(droop, /petsOff\(\)/);
assert.match(droop, /FALL_BY: "fall:"/);
assert.match(app, /kind === "fall" \? \("fall:" \+ S\.clientId\)/);
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
assert.match(css, /#droopLayer\s*\{[^}]*position:\s*fixed/);
assert.match(css, /#droopLayer\s*\{[^}]*overflow:\s*visible/);
let taps = 0;
for (let i = 0; i < 4; i++) taps = droopTapCount(taps, true, i === 0 ? 0 : 200);
assert.equal(taps, 4);
taps = droopTapCount(taps, true, 600);
assert.equal(taps, 5);
assert.equal(droopTapCount(5, true, 601), 1);
assert.equal(droopTapCount(3, false, 100), 1);
assert.deepEqual(droopPlayBurst("normal", 2), ["soft"]);
assert.deepEqual(droopPlayBurst("normal", 5), ["soft"], "five taps on a normal bubble only soften once");
assert.deepEqual(droopPlayBurst("normal", 1), []);
assert.deepEqual(droopPlayBurst("soft", 1), []);
assert.deepEqual(droopPlayBurst("soft", 2), ["restore"]);
assert.deepEqual(droopPlayBurst("soft", 3), ["fall"]);
assert.deepEqual(droopPlayBurst("soft", 4), ["fall"], "taps after the third do not fall again");
assert.equal(droopTapAction("soft", 1), "none");
assert.equal(droopTapAction("soft", 2), "pending");
assert.equal(droopTapAction("soft", 3), "fall");
assert.equal(droopTapAction("normal", 2), "soft");
assert.equal(droopTapAction("normal", 4), "none");
assert.equal(droopBurstEndAction("soft", 2), "restore");
assert.equal(droopBurstEndAction("soft", 1), "none");
assert.equal(droopBurstEndAction("soft", 3), "none");
assert.equal(droopRecordKind({ on: true, by: "abc" }), "soft");
assert.equal(droopRecordKind({ on: true, by: "fall:abc" }), "fall");
assert.equal(droopRecordKind({ on: false, by: "fall:abc" }), "off");
const sag = DROOP.SAG_MS, gone = DROOP.GONE_MS, fade = DROOP.FADE_MS, fall = 800;
assert.equal(droopPhase(0, fall, false), "sag");
assert.equal(droopPhase(sag - 1, fall, false), "sag");
assert.equal(droopPhase(sag, fall, false), "fall");
assert.equal(droopPhase(sag + fall - 1, fall, false), "fall");
assert.equal(droopPhase(sag + fall, fall, false), "gone");
assert.equal(droopPhase(sag + fall + gone - 1, fall, false), "gone");
assert.equal(droopPhase(sag + fall + gone, fall, false), "fade");
assert.equal(droopPhase(sag + fall + gone + fade - 1, fall, false), "fade");
assert.equal(droopPhase(sag + fall + gone + fade, fall, false), "done");
assert.equal(droopPhase(DROOP.REDUCE_OUT_MS - 1, fall, true), "fadeout");
assert.equal(droopPhase(DROOP.REDUCE_OUT_MS, fall, true), "gone");
assert.equal(droopPhase(DROOP.REDUCE_OUT_MS + gone, fall, true), "fade");
assert.equal(droopFallY(1000, 2000), 1000);
assert.ok(droopFallY(400) > droopFallY(200) * 3);
assert.equal(droopFallMs(1000, 2000, 5000), 1000);
assert.equal(droopFallMs(0, 2000, 5000), 0);
assert.equal(droopSag(0), 0);
assert.equal(droopSag(DROOP.SAG_MS), 1);
assert.ok(droopSag(DROOP.SAG_MS / 2) > 0.2);
assert.equal(droopSoftSag(DROOP.SOFT_MS), 1);
const softTheta = DROOP.SOFT_ANGLE_DEG * Math.PI / 180;
const softPose = droopSoftPose(180, softTheta);
assert.ok(Math.abs(softPose.end - softTheta) < 0.02);
assert.ok(softPose.mid < softPose.end * 0.75, "the soft droop bends along the bubble instead of hanging straight");
const theta = 90 * Math.PI / 180;
const hang = droopHang(180, theta);
assert.ok(hang.hinge < 0.02);
assert.ok(hang.end > theta * 0.98);
assert.ok(hang.mid > 75 * Math.PI / 180, "past the hinge the body is already hanging down");
const span = droopInkSpan(180, 40, theta);
assert.ok(span.maxY > 180 * 0.75, "a 90 degree hang drops by most of the bubble width");
assert.ok(span.maxY - span.minY > span.maxX - span.minX, "the hung bubble is taller than it is wide");
assert.ok(span.minX > -4, "the hang stays on the inner side of the anchor");
assert.match(pets, /BONK_MIN_V = 260/);
assert.match(pets, /BONK_CD = 2500/);
assert.match(pets, /classList\.contains\("droop"\)/);
assert.match(pets, /bub-droop/);
assert.doesNotMatch(droop, /droopClimbIds\(this\.last/);
assert.doesNotMatch(droop, /sc-droop-climb/);
assert.match(pets, /sc-droop-climb/);
assert.match(pets, /把泡泡設成堅挺/);
assert.match(pets, /if \(petsOn === false\) return;/);
assert.match(pets, /if \(soc && soc\.kind === "climb"\) return;/);
assert.match(pets, /startClimb\(n\)/);
assert.match(pets, /climb: grayDown \? 22 : 6/);
const now = 1_700_000_000_000;
const fresh = { m1: { on: true, t: now - 800, by: "a" }, old: { on: true, t: now - 60000, by: "b" }, off: { on: false, t: now, by: "c" } };
const seen = new Set();
assert.deepEqual(droopClimbIds(fresh, now, seen), ["m1:" + (now - 800)]);
seen.add("m1:" + (now - 800));
assert.deepEqual(droopClimbIds(fresh, now, seen), []);
assert.deepEqual(droopClimbIds({ m1: { on: true, t: now } }, now, seen), ["m1:" + now]);
assert.deepEqual(droopClimbIds({ m1: { on: true, t: now, by: "fall:abc" } }, now, new Set()), [], "a fall does not climb again");
assert.equal(DROOP_CLIMB_FRESH_MS >= 8000 && DROOP_CLIMB_FRESH_MS <= 20000, true);
assert.deepEqual(droopClimbIds({ m1: { on: true } }, now, new Set()), []);
assert.match(cfg, /panicTaps: 0/);
assert.equal((app.match(/try \{ Shatter\.playAll\(\); \} catch \(err\) \{ console\.error\(err\); \}\n\s+resetList\(\);/g) || []).length, 2);

console.log('PASS: droop rules, synced flag, pets switch, bonk thresholds, panic taps stay off.');
