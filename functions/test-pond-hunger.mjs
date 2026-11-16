import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createPond, stepPond, spine } from '../pond-shark.js';
import {
  HUNGER_MS, DEAD_MS, FEED, FULL_AT, MID_AT, WARM,
  project, seedRecord, feedRecord, deathRecord, clockText, phaseOf, tone,
} from '../pond-hunger.js';

const t0 = 1_700_000_000_000;
assert.equal(HUNGER_MS, 24 * 3600 * 1000);
assert.equal(DEAD_MS, 6 * 3600 * 1000);
assert.equal(FEED, 10);
assert.equal(FULL_AT, 80);
assert.equal(MID_AT, 20);

const fresh = project(null, t0);
assert.equal(fresh.dead, false);
assert.equal(fresh.sat, 100);
assert.equal(fresh.phase, "吃飽");

const full = project({ sat: 100, t: t0, deadUntil: 0 }, t0 + 0.2 * HUNGER_MS);
assert.equal(full.phase, "吃飽");
assert.ok(Math.abs(full.sat - 80) < 0.002, full.sat);
const mid = project({ sat: 100, t: t0, deadUntil: 0 }, t0 + 0.2 * HUNGER_MS + 2000);
assert.equal(mid.phase, "普通");
assert.ok(mid.sat < 80 && mid.sat > 20, mid.sat);
const lowEdge = project({ sat: 100, t: t0, deadUntil: 0 }, t0 + 0.8 * HUNGER_MS);
assert.equal(lowEdge.phase, "普通");
assert.ok(Math.abs(lowEdge.sat - 20) < 0.002, lowEdge.sat);
const hungry = project({ sat: 100, t: t0, deadUntil: 0 }, t0 + 0.8 * HUNGER_MS + 2000);
assert.equal(hungry.phase, "飢餓");
assert.equal(tone("blue", hungry.sat), WARM.blue.low);
assert.equal(tone("pink", full.sat), WARM.pink.full);
assert.equal(tone("blue", mid.sat), WARM.blue.mid);
assert.equal(tone("pink", mid.sat), WARM.pink.mid);

const gone = project({ sat: 100, t: t0, deadUntil: 0 }, t0 + HUNGER_MS);
assert.equal(gone.dead, true);
assert.equal(gone.sat, 0);
assert.equal(clockText(gone.left), "6:00:00");
assert.equal(clockText(gone.left - 1000), "5:59:59");
assert.equal(phaseOf(0), "");

const dead = deathRecord({ sat: 100, t: t0, deadUntil: 0 }, t0 + HUNGER_MS);
assert.equal(dead.sat, 0);
assert.equal(dead.deadUntil - dead.t, DEAD_MS);
assert.equal(deathRecord(dead, t0 + HUNGER_MS + 1000), null);
assert.equal(feedRecord(dead, t0 + HUNGER_MS + 1000), null);

const revivedAt = dead.deadUntil;
const back = project(dead, revivedAt);
assert.equal(back.dead, false);
assert.equal(back.sat, 100);
assert.equal(back.phase, "吃飽");
const fedAfter = feedRecord(dead, revivedAt);
assert.equal(fedAfter.sat, 100);
assert.equal(fedAfter.deadUntil, 0);

const again = project(dead, revivedAt + HUNGER_MS);
assert.equal(again.dead, true);
const rec2 = deathRecord(dead, revivedAt + HUNGER_MS);
assert.ok(rec2 && rec2.deadUntil !== dead.deadUntil);
assert.equal(deathRecord(rec2, revivedAt + HUNGER_MS + 500), null);

let cur = { sat: 40, t: t0, deadUntil: 0 };
const first = feedRecord(cur, t0);
const second = feedRecord(first, t0);
assert.equal(first.sat, 50);
assert.equal(second.sat, 60);
assert.equal(feedRecord({ sat: 95, t: t0, deadUntil: 0 }, t0).sat, 100);
assert.equal(feedRecord({ sat: 15, t: t0, deadUntil: 0 }, t0).sat, 25);
assert.deepEqual(seedRecord(t0), { sat: 100, t: t0, deadUntil: 0 });

const pond = createPond(400, 400);
pond.fish[0].x = 80; pond.fish[0].y = 80; pond.fish[0].a = 0; pond.fish[0].turn = 0;
pond.fish[1].x = 360; pond.fish[1].y = 360; pond.fish[1].a = 0;
const [hx, hy] = spine(pond.fish[0], 0);
pond.foods.push({ x: hx, y: hy, age: 0 });
const frozen = pond.fish[0].x;
stepPond(pond, 0.05, [false, true]);
assert.equal(pond.foods.length, 1, 'a dead fish cannot eat');
assert.equal(pond.fish[0].x, frozen);
assert.equal(pond.fish[0].gulp, 0);
stepPond(pond, 0.05, [true, true]);
assert.equal(pond.foods.length, 0, 'the same fish eats once it is alive');
pond.reset();
assert.deepEqual(pond.alive, [true, true]);

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const node = rules.rules.rooms.$roomId.pondHunger;
assert.equal(node.$other['.validate'], false);
const room = "a".repeat(32);
const gate = (expr, ctx) => vm.runInNewContext(expr, ctx);
function rootOf({ on, admin, ok }) {
  return {
    child(path) {
      return {
        val() {
          if (path === `admin/adminUid`) return !!admin && path.endsWith("adminUid");
          if (path === `acl/${room}/on`) return on;
          if (path === `acl/${room}/ok/member`) return !!ok;
          return null;
        },
      };
    },
  };
}
const read = node['.read'];
assert.equal(gate(read, { auth: null, $roomId: room, root: rootOf({ on: false }) }), false);
assert.equal(gate(read, { auth: { uid: "member", token: {} }, $roomId: room, root: rootOf({ on: false }) }), true);
assert.equal(gate(read, { auth: { uid: "member", token: { lp: true } }, $roomId: room, root: rootOf({ on: true, ok: false }) }), false);
assert.equal(gate(read, { auth: { uid: "member", token: { lp: true } }, $roomId: room, root: rootOf({ on: true, ok: true }) }), true);
assert.equal(gate(read, { auth: { uid: "adminUid", token: {} }, $roomId: room, root: rootOf({ on: true, admin: true }) }), true);
assert.equal(gate(read, { auth: { uid: "member", token: {} }, $roomId: "short", root: rootOf({ on: false }) }), false);
assert.equal(node['.read'], node['.write']);

function val(n, extra = {}) {
  return { exists: () => true, isNumber: () => typeof n === "number", val: () => n, ...extra };
}
const childOk = { exists: () => true, hasChildren: (keys) => keys.every((k) => ["sat", "t", "deadUntil"].includes(k)) };
assert.equal(gate(node.b['.validate'], { newData: childOk }), true);
assert.equal(gate(node.b['.validate'], { newData: { exists: () => false, hasChildren: () => false } }), true);
assert.equal(gate(node.b['.validate'], { newData: { exists: () => true, hasChildren: () => false } }), false);
const now = t0;
assert.equal(gate(node.b.sat['.validate'], { newData: val(0) }), true);
assert.equal(gate(node.b.sat['.validate'], { newData: val(100) }), true);
assert.equal(gate(node.b.sat['.validate'], { newData: val(80.5) }), true);
assert.equal(gate(node.p.sat['.validate'], { newData: val(101) }), false);
assert.equal(gate(node.p.sat['.validate'], { newData: val(-1) }), false);
assert.equal(gate(node.b.t['.validate'], { now, newData: val(now) }), true);
assert.equal(gate(node.b.t['.validate'], { now, newData: val(now - 6 * 3600 * 1000) }), true);
assert.equal(gate(node.b.t['.validate'], { now, newData: val(now - 7 * 3600 * 1000) }), false);
assert.equal(gate(node.b.t['.validate'], { now, newData: val(now + 130000) }), false);
assert.equal(gate(node.b.deadUntil['.validate'], { now, newData: val(0) }), true);
assert.equal(gate(node.b.deadUntil['.validate'], { now, newData: val(now + DEAD_MS) }), true);
assert.equal(gate(node.p.deadUntil['.validate'], { now, newData: val(now + 8 * 3600 * 1000) }), false);
assert.equal(gate(node.b.deadUntil['.validate'], { now, newData: val(-1) }), false);
assert.equal(node.b.$other['.validate'], false);
assert.equal(node.p.$other['.validate'], false);
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
assert.doesNotMatch(app, /mountPondHunger|pondHunger/);
assert.match(app, /mountPondShare/);

console.log('PASS: old pond hunger records stay valid, and the chat no longer runs them.');
