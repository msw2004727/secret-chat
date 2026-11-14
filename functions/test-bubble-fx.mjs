import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { DROOP, droopSoftPose, droopTapAction, droopPlayBurst } from '../droop.js';
import {
  BUBBLE_RING, BUBBLE_FX_STATES, bubbleFxNormalize, bubbleFxResolve, bubbleRingShift, bubbleRingPoints, stiffClimbIds,
} from '../bubble-fx.js';

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const fx = rules.rules.rooms.$roomId.bubbleFx.$msgId;
assert.equal(fx.$other['.validate'], false);
assert.match(fx['.validate'], /!newData\.exists\(\)/);
assert.match(fx['.validate'], /m\/' \+ \$msgId/);
assert.match(fx.state['.validate'], /'stiff'/);
assert.match(fx.state['.validate'], /'soft'/);
assert.match(fx.state['.validate'], /'break'/);
assert.match(fx.state['.validate'], /'normal'/);
assert.match(fx.t['.validate'], /now \+ 60000/);
assert.match(fx.by['.validate'], /length <= 64/);

const room = 'a'.repeat(32);
function fxCtx(state, existsMsg = true) {
  return {
    now: 1_000_000,
    $roomId: room,
    $msgId: 'm1',
    newData: {
      exists: () => true,
      hasChildren: (keys) => keys.every((k) => ['state', 't', 'by'].includes(k)),
      isString: () => typeof state === 'string',
      isNumber: () => typeof state === 'number',
      val: () => state,
    },
    root: { child: (path) => ({ exists: () => existsMsg && path === `rooms/${room}/m/m1` }) },
  };
}
assert.equal(vm.runInNewContext(fx['.validate'], fxCtx('stiff')), true);
assert.equal(vm.runInNewContext(fx.state['.validate'], fxCtx('stiff')), true);
assert.equal(vm.runInNewContext(fx.state['.validate'], fxCtx('soft')), true);
assert.equal(vm.runInNewContext(fx.state['.validate'], fxCtx('break')), true);
assert.equal(vm.runInNewContext(fx.state['.validate'], fxCtx('normal')), true);
assert.equal(vm.runInNewContext(fx.state['.validate'], fxCtx('nope')), false);
assert.equal(vm.runInNewContext(fx['.validate'], fxCtx('soft', false)), false);
const gone = fxCtx('soft');
gone.newData = { exists: () => false, hasChildren: () => false, isString: () => false, isNumber: () => false, val: () => null };
assert.equal(vm.runInNewContext(fx['.validate'], gone), true, 'deleting a bubbleFx record is allowed');
assert.equal(vm.runInNewContext(fx.t['.validate'], fxCtx(1_000_000)), true);
assert.equal(vm.runInNewContext(fx.t['.validate'], fxCtx(1_000_000 + 60001)), false);

assert.deepEqual(BUBBLE_FX_STATES, ['stiff', 'soft', 'break', 'normal']);
assert.equal(bubbleFxNormalize('stiff'), 'stiff');
assert.equal(bubbleFxNormalize('fall'), null);
assert.equal(BUBBLE_RING.COUNT, 8);
assert.equal(BUBBLE_RING.DIAMETER, 48);
assert.equal(BUBBLE_RING.RADIUS, 96);

const soft = { on: true, t: 100, by: 'dev' };
const fxSoft = { state: 'soft', t: 100, by: 'dev' };
assert.equal(bubbleFxResolve(soft, fxSoft).state, 'soft');
assert.equal(bubbleFxResolve(soft, { state: 'stiff', t: 200, by: 'dev' }).state, 'stiff');
assert.equal(bubbleFxResolve({ on: true, t: 300, by: 'fall:dev' }, { state: 'stiff', t: 200, by: 'dev' }).state, 'break');
assert.equal(bubbleFxResolve({ on: false, t: 400, by: 'dev' }, { state: 'soft', t: 100, by: 'dev' }).state, 'normal');
assert.equal(bubbleFxResolve(null, { state: 'stiff', t: 5, by: 'dev' }).state, 'stiff');
assert.equal(bubbleFxResolve({ on: true, t: 5, by: 'fall:dev' }, null).state, 'break');

const bounds = { left: 0, top: 20, right: 320, bottom: 640 };
const center = bubbleRingShift(0, 0, BUBBLE_RING.RADIUS, BUBBLE_RING.DIAMETER, bounds);
const pts = bubbleRingPoints(BUBBLE_RING.COUNT, BUBBLE_RING.RADIUS, BUBBLE_RING.DIAMETER);
assert.equal(pts.length, 8);
assert.ok(pts[0].y < pts[4].y, 'first button sits above the opposite button');
for (const p of pts) {
  const dist = Math.hypot(p.x + BUBBLE_RING.DIAMETER / 2, p.y + BUBBLE_RING.DIAMETER / 2);
  assert.ok(Math.abs(dist - BUBBLE_RING.RADIUS) < 0.02, 'button centers sit on the ring');
  assert.ok(center.x + p.x >= bounds.left - 0.05);
  assert.ok(center.y + p.y >= bounds.top - 0.05);
  assert.ok(center.x + p.x + BUBBLE_RING.DIAMETER <= bounds.right + 0.05);
  assert.ok(center.y + p.y + BUBBLE_RING.DIAMETER <= bounds.bottom + 0.05);
}
const far = bubbleRingShift(9999, 9999, BUBBLE_RING.RADIUS, BUBBLE_RING.DIAMETER, bounds);
assert.ok(far.x + BUBBLE_RING.RADIUS + BUBBLE_RING.DIAMETER / 2 <= bounds.right + 0.05);
assert.ok(far.y + BUBBLE_RING.RADIUS + BUBBLE_RING.DIAMETER / 2 <= bounds.bottom + 0.05);
const phone = { left: 8, top: 62, right: 352, bottom: 640 };
const edge = bubbleRingShift(0, 0, BUBBLE_RING.RADIUS, BUBBLE_RING.DIAMETER, phone);
for (const p of pts) {
  assert.ok(edge.x + p.x >= phone.left - 0.05);
  assert.ok(edge.y + p.y >= phone.top - 0.05);
  assert.ok(edge.x + p.x + BUBBLE_RING.DIAMETER <= phone.right + 0.05);
  assert.ok(edge.y + p.y + BUBBLE_RING.DIAMETER <= phone.bottom + 0.05);
}

const theta = DROOP.SOFT_ANGLE_DEG * Math.PI / 180;
const down = droopSoftPose(180, theta);
const up = droopSoftPose(180, -theta);
assert.ok(down.end > 0.9 * theta);
assert.ok(up.end < -0.9 * theta, 'stiff curls upward, the opposite of droop');
assert.ok(Math.abs(up.end + down.end) < 0.05);

assert.deepEqual(droopPlayBurst('normal', 2), ['soft']);
assert.deepEqual(droopPlayBurst('soft', 3), ['fall']);
assert.equal(droopTapAction('normal', 2), 'soft');
assert.equal(droopTapAction('soft', 3), 'fall');

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const droop = fs.readFileSync(new URL('../droop.js', import.meta.url), 'utf8');
assert.match(app, /const APP_VERSION = "v61\.69"/);
assert.match(html, /content="v61\.69"/);
assert.match(sw, /const VERSION = "sc-v61\.69"/);
assert.match(html, /灰貓懷孕/);
assert.match(html, /召喚幼貓/);
assert.match(app, /kind === "fall" \? \("fall:" \+ S\.clientId\)/);
assert.match(app, /bubbleFx\/\$\{key\}/);
assert.match(app, /state: "stiff"/);
for (const label of ['堅挺', '軟掉', '斷掉', '復原', '回覆', '複製', '刪除', '公告']) {
  assert.match(html, new RegExp('>' + label + '<'));
}
assert.match(css, /\.c-ring-btn\s*\{[^}]*width:\s*48px/);
assert.match(css, /\.c-ring-btn\s*\{[^}]*height:\s*48px/);
assert.doesNotMatch(css, /\.c-ring-btn\s*\{[^}]*backdrop-filter/);
assert.doesNotMatch(css, /\.c-ring-btn\s*\{[^}]*radial-gradient/);
assert.match(css, /\.c-ring-btn\s*\{[^}]*background:\s*#6d28d9/);
assert.match(css, /html\[data-theme="light"\] #chat \.c-ring-btn \{[^}]*background:\s*#5b21b6/);
assert.match(css, /\.c-ring-btn\.c-mm-danger\s*\{[^}]*background:\s*#3a2426/);
assert.match(css, /\.c-ring-btn\.c-mm-ann\s*\{[^}]*background:\s*#8a5a12/);
assert.match(droop, /mode: up \? "stiff" : "soft"/);
assert.match(droop, /st\.sign < 0 \? -1 : 1/);
assert.doesNotMatch(droop, /droopTapAction\(mode, n\)/);
assert.doesNotMatch(droop, /scroller\.addEventListener\("pointerup"/);
assert.doesNotMatch(droop, /this\.commit\(/);
const fxSrc = fs.readFileSync(new URL('../bubble-fx.js', import.meta.url), 'utf8');
assert.match(fxSrc, /sc-droop-climb/);
assert.match(fxSrc, /rec\.state !== "stiff"/);
const climbNow = 1_700_000_000_000;
const stiffFresh = { m1: { state: 'stiff', t: climbNow - 800, by: 'a' }, soft: { state: 'soft', t: climbNow, by: 'b' }, old: { state: 'stiff', t: climbNow - 60000, by: 'c' } };
assert.deepEqual(stiffClimbIds(stiffFresh, climbNow, new Set()), ['m1:' + (climbNow - 800)]);
assert.deepEqual(stiffClimbIds({ m1: { state: 'soft', t: climbNow, by: 'a' } }, climbNow, new Set()), []);
assert.match(app, /runFx\("soft"\)|runFx\("break"\)|runFx\("normal"\)|runFx\("stiff"\)/);
const menu = app.slice(app.indexOf('function bindMsgMenu'), app.indexOf('async function sendSticker'));
assert.match(menu, /\}, 450\)/);
const guard = menu.indexOf('只能刪除自己的訊息');
const del = menu.indexOf('S.delMsg(row.dataset.k)');
assert.ok(guard > 0 && del > guard, 'open-room delete stays blocked before delMsg');
assert.match(menu, /S\.open && !row\.classList\.contains\("me"\)/);
assert.doesNotMatch(menu, /Shatter/);

console.log('PASS: bubble ring geometry, synced states, upward stiff pose; tap gestures do not trigger effects.');
