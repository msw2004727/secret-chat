import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fakeCallPhase, FAKE_CALL_MS } from '../bubble-fx.js';

assert.equal(FAKE_CALL_MS, 60000);
const now = 1_000_000;
const call = { id: 'c1', by: 'alice', t: now - 1000 };
assert.equal(fakeCallPhase(call, 'alice', now), 'caller');
assert.equal(fakeCallPhase(call, 'bob', now), 'recipient');
assert.equal(fakeCallPhase({ ...call, active: { bob: true } }, 'alice', now), 'off');
assert.equal(fakeCallPhase({ ...call, active: { bob: true } }, 'cara', now), 'recipient');
assert.equal(fakeCallPhase({ ...call, active: { bob: true } }, 'bob', now), 'off');
assert.equal(fakeCallPhase({ ...call, t: now - 60001 }, 'bob', now), 'off');
assert.equal(fakeCallPhase(null, 'bob', now), 'off');

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const fx = rules.rules.rooms.$roomId.fakeCall;
assert.equal(fx.$other['.validate'], false);
assert.match(fx['.validate'], /!newData\.exists\(\)/);
assert.match(fx['.validate'], /hasChildren\(\['id','by','t'\]\)/);
assert.match(fx.t['.validate'], /now \+ 60000/);
const ctx = {
  now,
  newData: {
    exists: () => true,
    hasChildren: (keys) => keys.every((k) => ['id', 'by', 't'].includes(k)),
  },
};
assert.equal(vm.runInNewContext(fx['.validate'], ctx), true);
ctx.newData = { exists: () => false, hasChildren: () => false };
assert.equal(vm.runInNewContext(fx['.validate'], ctx), true);
const active = { $uid: 'bob', newData: { isBoolean: () => true, val: () => true } };
assert.equal(vm.runInNewContext(fx.active.$uid['.validate'], active), true);
active.newData.val = () => false;
assert.equal(vm.runInNewContext(fx.active.$uid['.validate'], active), false);

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const soon = html.indexOf('敬請期待');
const callBtn = html.indexOf('id="zooCall"');
assert.ok(soon > 0 && callBtn > soon);
assert.equal((html.match(/敬請期待/g) || []).length, 2);
const ring = html.slice(html.indexOf('id="msgMenu"'), html.indexOf('id="rxPicker"'));
assert.equal((ring.match(/data-i="/g) || []).length, 8);
assert.doesNotMatch(ring, /呼叫/);
const overlay = html.slice(html.indexOf('id="fakeCall"'), html.indexOf('id="admin"'));
assert.match(overlay, /重要的人/);
assert.match(overlay, /LINE 語音…/);
assert.match(overlay, /拒絕/);
assert.match(overlay, /接受/);
assert.doesNotMatch(overlay, /fake-call-status|id="clock"/);
assert.match(app, /fakeCall/);
assert.match(app, /FAKE_CALL_MS/);
assert.match(app, /fadeCallCapsule/);

console.log('PASS: fake call sync phase, rules, caller capsule, recipient screen, ring stays at 8.');
