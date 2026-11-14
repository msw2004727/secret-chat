import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pairLocAgeSec, pairLocClock, pairLocDistance, PAIR_LOC_STALE_MS } from '../pair-loc.js';

assert.equal(PAIR_LOC_STALE_MS, 43200 * 1000);
const now = 2_000_000;
assert.equal(pairLocAgeSec(now - 5000, now), 5);
assert.equal(pairLocAgeSec(now - 99_000, now), 99);
assert.equal(pairLocAgeSec(now - 100_000, now), 100);
assert.equal(pairLocAgeSec(now - 43_199_000, now), 43199);
assert.equal(pairLocAgeSec(now - 43_200_000, now), 43200);
assert.equal(pairLocAgeSec('x', now), null);
assert.equal(pairLocClock(5), '5');
assert.equal(pairLocClock(99), '99');
assert.equal(pairLocClock(100), '1:40');
assert.equal(pairLocClock(3599), '59:59');
assert.equal(pairLocClock(3725), '1:02:05');
assert.equal(pairLocClock(43199), '11:59:59');
assert.equal(pairLocDistance(
  { lat: 25.03396, lng: 121.56447 },
  { lat: 25.04476, lng: 121.56447 },
), '1.2km');
assert.equal(pairLocDistance({ lat: 25, lng: 121 }, { lat: 25.003, lng: 121 }), '334m');
assert.equal(pairLocDistance(null, { lat: 1, lng: 2 }), '');

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const node = rules.rules.rooms.$roomId.pairLoc;
assert.equal(node.$other['.validate'], false);
for (const side of ['m', 'f']) {
  assert.match(node[side]['.validate'], /!newData\.exists\(\)/);
  assert.match(node[side]['.validate'], /hasChildren\(\['t','iv','c','by'\]\)/);
  assert.match(node[side].t['.validate'], /now \+ 60000/);
  assert.equal(node[side].$other['.validate'], false);
}
const ctx = {
  now,
  newData: {
    exists: () => true,
    hasChildren: (keys) => keys.every((k) => ['t', 'iv', 'c', 'by'].includes(k)),
  },
};
assert.equal(vm.runInNewContext(node.m['.validate'], ctx), true);
ctx.newData = { exists: () => false, hasChildren: () => false };
assert.equal(vm.runInNewContext(node.f['.validate'], ctx), true);

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const title = html.slice(html.indexOf('id="peerText"'), html.indexOf('id="btnHeart"'));
assert.match(title, /麥/);
assert.ok(title.indexOf('麥') < title.indexOf('辛'));
assert.match(html, /id="pairDist"/);
assert.match(css, /\.c-pair-tick \{[^}]*font-size: 7px/);
assert.match(css, /\.c-pair-tick \{[^}]*right: 0/);
assert.match(css, /html\[data-theme="light"\] #chat \.c-pair-who\.is-m\.set/);
assert.match(css, /#d6336c/);
assert.match(app, /pairLoc\/\$\{side\}/);
assert.match(app, /enableHighAccuracy: true/);
assert.match(app, /這台手機沒有開定位，無法更新/);
assert.match(app, /現在抓不到位置，請稍後再試/);
assert.match(app, /PAIR_LOC_STALE_MS/);
assert.doesNotMatch(app.slice(app.indexOf('function tapPair'), app.indexOf('function bindZoo')), /ref\(db, "loc"\)|ref\(db, `loc`\)/);
const zoo = app.slice(app.indexOf('function bindZoo'), app.indexOf('\nbindZoo();'));
assert.doesNotMatch(zoo, /localStorage\.setItem/);

console.log('PASS: pair distance clock, stale cutoff, encrypted room slots, header widget.');
