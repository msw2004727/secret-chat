import fs from 'node:fs';
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
assert.match(droop, /ANGLE_DEG: 60/);
assert.match(droop, /SOFTNESS: 1/);
assert.match(droop, /CURVE_POW: 1\.3/);
assert.match(droop, /DURATION_MS: 1150/);
assert.match(droop, /WOBBLE: 0\.14/);
assert.match(droop, /RECOVER_MS: 2500/);
assert.match(droop, /RECOVER_OVERSHOOT: 0\.05/);
assert.match(droop, /MAX_BEND_PX: 230/);
assert.match(droop, /DOUBLE_TAP_MS: 320/);
assert.match(droop, /DOUBLE_TAP_PX: 26/);
assert.match(droop, /COLS: 40/);
assert.match(droop, /ROWS: 5/);
assert.match(droop, /overflow: hidden|#droopLayer|id = "droopLayer"/);
assert.match(pets, /BONK_MIN_V = 260/);
assert.match(pets, /BONK_CD = 2500/);
assert.match(pets, /classList\.contains\("droop"\)/);
assert.match(pets, /bub-droop/);
assert.match(cfg, /panicTaps: 0/);
assert.equal((app.match(/try \{ Shatter\.playAll\(\); \} catch \(err\) \{ console\.error\(err\); \}\n\s+resetList\(\);/g) || []).length, 2);

console.log('PASS: droop rules, synced flag, pets switch, bonk thresholds, panic taps stay off.');
