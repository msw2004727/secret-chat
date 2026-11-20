import fs from "node:fs";
import assert from "node:assert/strict";
import {
  BALL_HOLD_MS,
  BALL_PREDICT_MAX,
  BALL_SYNC_HZ,
  ballPublishDecision,
  ballSyncActive,
  ballSyncRole,
  ballTiltScale,
  claimBallAuth,
  followBall,
  mapBallToLocal,
  packBallPose,
  predictBallNorm,
  publishBallAuth,
  releaseBallAuth,
  smoothToward,
  viewBallState,
} from "../ball-sync.js";

const pose = { x: 0.25, y: 0.4, vx: 0.2, vy: -0.1, spin: 0.4, g: 3 };

function serve(node, update) {
  const next = update(node.val);
  if (next === undefined) return { committed: false, val: node.val };
  node.val = next;
  return { committed: true, val: next };
}

const room = { val: null };
const first = serve(room, (cur) => claimBallAuth(cur, "device-a", 5_000, pose));
const second = serve(room, (cur) => claimBallAuth(cur, "device-b", 5_010, { ...pose, x: 0.8 }));
assert.equal(first.committed, true);
assert.equal(first.val.by, "device-a");
assert.equal(first.val.hold, true);
assert.equal(first.val.seq, 1);
assert.equal(second.committed, false, "同時摸球時，伺服器先收下的那一方留下");
assert.equal(room.val.by, "device-a");

const again = serve(room, (cur) => claimBallAuth(cur, "device-a", 5_100, pose));
assert.equal(again.committed, true);
assert.equal(again.val.seq, 1, "同一隻手還按著，不另開一筆");

const stolen = serve(room, (cur) => releaseBallAuth(cur, "device-b", 1, pose, 5_200));
assert.equal(stolen.committed, false);
const letGo = serve(room, (cur) => releaseBallAuth(cur, "device-a", room.val.seq, { ...pose, vx: 0.4, vy: 0.1 }, 5_300));
assert.equal(letGo.committed, true);
assert.equal(letGo.val.hold, false);
assert.equal(letGo.val.by, "device-a", "鬆手後最後摸的人仍是裁判");
assert.equal(letGo.val.vx, 0.4);

const nextTouch = serve(room, (cur) => claimBallAuth(cur, "device-b", 5_400, { ...pose, x: 0.7 }));
assert.equal(nextTouch.val.by, "device-b");
assert.equal(nextTouch.val.hold, true);
assert.equal(nextTouch.val.seq, 2);
const staleWrite = serve(room, (cur) => publishBallAuth(cur, "device-a", 1, { ...pose, x: 0.1 }, 5_500));
assert.equal(staleWrite.committed, false);
const liveWrite = serve(room, (cur) => publishBallAuth(cur, "device-b", 2, { ...pose, x: 0.66, y: 0.5 }, 5_500));
assert.equal(liveWrite.committed, true);
assert.equal(liveWrite.val.hold, true);
assert.equal(liveWrite.val.x, 0.66);

room.val = { ...room.val, hold: true, t: 8_000, by: "device-b" };
const blocked = serve(room, (cur) => claimBallAuth(cur, "device-a", 8_000 + BALL_HOLD_MS - 50, pose));
assert.equal(blocked.committed, false);
const takeover = serve(room, (cur) => claimBallAuth(cur, "device-a", 8_000 + BALL_HOLD_MS + 5, pose));
assert.equal(takeover.val.by, "device-a");
assert.equal(takeover.val.hold, true);

assert.equal(claimBallAuth(null, "", 1000, pose), undefined);
assert.equal(claimBallAuth(null, "device-a", 0, pose), undefined);

assert.equal(ballSyncActive(0, true), false);
assert.equal(ballSyncActive(1, false), false);
assert.equal(ballSyncActive(1, true), true);
assert.equal(ballTiltScale(false), 1);
assert.equal(ballTiltScale(true), 0);
assert.equal(ballSyncRole({ by: "device-a", seq: 2 }, "device-a", ["device-b"], false), "solo");
assert.equal(ballSyncRole(null, "device-a", [], true), "solo");
assert.equal(ballSyncRole({ by: "device-a", seq: 2 }, "device-a", ["device-b"], true), "authority");
assert.equal(ballSyncRole({ by: "device-b", seq: 2 }, "device-a", ["device-b"], true), "follow");
assert.equal(ballSyncRole({ by: "gone-phone", seq: 4 }, "device-a", ["device-b"], true), "open");
assert.equal(ballSyncRole(null, "device-a", ["device-b"], true), "open");

const frame = { w: 400, span: 500, top: 80 };
const local = { x: 200, y: 80 + 250, vx: 80, vy: -40, spin: Math.PI * 4 + 0.2 };
const packed = packBallPose(local, frame);
assert.ok(Math.abs(packed.x - 0.5) < 1e-9);
assert.ok(Math.abs(packed.y - 0.5) < 1e-9);
assert.ok(Math.abs(packed.vx - 0.2) < 1e-9);
assert.ok(Math.abs(packed.vy + 0.08) < 1e-9);
assert.ok(Math.abs(packed.spin - 0.2) < 1e-9);
assert.ok(Math.abs(packed.g - 3) < 1e-9);
const back = mapBallToLocal(packed, frame);
assert.ok(Math.abs(back.x - local.x) < 1e-6);
assert.ok(Math.abs(back.y - local.y) < 1e-6);
assert.ok(Math.abs(back.vx - local.vx) < 1e-6);
assert.ok(Math.abs(back.vy - local.vy) < 1e-6);

const good = viewBallState({ by: "device-a", seq: 2, t: 5_500, hold: false, ...packed });
assert.equal(good.by, "device-a");
assert.equal(good.seq, 2);
assert.equal(viewBallState(null), null);
assert.equal(viewBallState({ by: "device-a", seq: 1.5, t: 10, ...packed }), null);
assert.equal(viewBallState({ by: "", seq: 1, t: 10, ...packed }), null);
assert.equal(viewBallState({ by: "device-a", seq: 1, t: 10, ...packed, x: 9 }), null);
assert.equal(viewBallState({ by: "x".repeat(65), seq: 1, t: 10, ...packed }), null);

const falling = { x: 0.5, y: 0.2, vx: 0, vy: 0, spin: 0, g: 10 };
const brief = predictBallNorm(falling, 0.18);
const late = predictBallNorm(falling, 4);
assert.equal(brief.y, late.y);
assert.equal(brief.vy, late.vy);
assert.ok(brief.vy > 0);
assert.ok(brief.y > falling.y);
const tiny = predictBallNorm(falling, BALL_PREDICT_MAX / 2);
assert.ok(tiny.y < brief.y);

const shown = { x: 0.2, y: 0.2, vx: 0, vy: 0, spin: 0 };
const step = smoothToward(shown, { x: 0.5, y: 0.2, vx: 1, vy: 0, spin: 0 }, 1 / 60);
assert.ok(step.x > shown.x && step.x < 0.5, "一格只追上一段，不瞬移");
const eased = followBall(shown, { x: 0.28, y: 0.22, vx: 0, vy: 0, spin: 0.2 }, 1 / 60);
assert.equal(eased.snapped, false);
assert.ok(eased.x > shown.x && eased.x < 0.28);
const jump = followBall(shown, { x: 0.9, y: 0.9, vx: 0, vy: 0, spin: 0 }, 1 / 60);
assert.equal(jump.snapped, true);
assert.equal(jump.x, 0.9);
const firstSight = followBall(null, { x: 0.4, y: 0.6, vx: 0, vy: 0, spin: 1 }, 1 / 60);
assert.equal(firstSight.snapped, true);
assert.equal(firstSight.x, 0.4);

let cursor = { lastAt: -1e9, settled: true, pose: null };
let movingWrites = 0;
const flight = { x: 0.2, y: 0.2, vx: 0.5, vy: 0.1, spin: 0, g: 3 };
for (let i = 0; i <= 60; i++) {
  const d = ballPublishDecision(cursor, i * (1000 / 60), flight, false);
  cursor = d;
  if (d.write) movingWrites++;
}
assert.ok(movingWrites >= 11 && movingWrites <= 13, "約 12Hz，實際 " + movingWrites);
assert.equal(BALL_SYNC_HZ, 12);

cursor = { lastAt: -1e9, settled: false, pose: null };
let restWrites = 0;
const rest = { x: 0.2, y: 0.9, vx: 0, vy: 0, spin: 0, g: 3 };
for (let i = 0; i < 40; i++) {
  const d = ballPublishDecision(cursor, 10_000 + i * 50, rest, false);
  cursor = d;
  if (d.write) restWrites++;
}
assert.equal(restWrites, 1, "停住只補一筆");

cursor = { lastAt: -1e9, settled: true, pose: rest };
let holdWrites = 0;
for (let i = 0; i <= 60; i++) {
  const d = ballPublishDecision(cursor, i * (1000 / 60), rest, true);
  cursor = d;
  if (d.write) holdWrites++;
}
assert.ok(holdWrites >= 11 && holdWrites <= 13, "按著的時候也要送，實際 " + holdWrites);

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const pets = fs.readFileSync(new URL("../room-pets.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
assert.match(app, /const APP_VERSION = "v62\.13"/);
assert.match(html, /content="v62\.13"/);
assert.match(sw, /const VERSION = "sc-v62\.13"/);
assert.doesNotMatch(app, /ball-sync/);
assert.doesNotMatch(app, /ballLive/);
assert.doesNotMatch(app, /BallSync/);
assert.doesNotMatch(app, /bindBallSync/);
assert.match(pets, /if \(!api \|\| !ballOn\(\)\) return "solo"/);
assert.match(pets, /showPetBall\(groupsReady, groups, ball\.state\)/);
assert.match(pets, /ballEl\.style\.display = "none"/);
assert.doesNotMatch(app + pets, /ball-sync-preview/);

const roomRules = rules.rules.rooms.$roomId;
assert.match(roomRules[".read"], /auth != null/);
assert.match(roomRules[".write"], /auth != null/);
const live = roomRules.ballLive;
assert.ok(live, "ballLive 規則要在房間底下");
assert.match(live[".validate"], /hasChildren\(\['by','seq','hold','t','x','y','vx','vy','spin','g'\]\)/);
assert.equal(live.$other[".validate"], false);
assert.equal(live.hold[".validate"], "newData.isBoolean()");
assert.match(live.by[".validate"], /length <= 64/);
assert.match(live.seq[".validate"], /% 1 == 0/);
assert.match(roomRules.pets.$kind[".validate"], /\$kind === 'ball'/);

console.log("PASS: ball sync");
