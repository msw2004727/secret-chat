import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

// Mirror of checkUnread's "mine vs newest" decision (must stay in sync).
function unreadFromMarks(newest, server, local) {
  if (!newest) return false;
  const mine = [server, local]
    .filter((x) => typeof x === 'string' && x)
    .sort()
    .pop();
  return mine ? newest > mine : true;
}

// --- comparison ---
assert.equal(unreadFromMarks(null, 'a', 'a'), false, 'no message → no unread');
assert.equal(unreadFromMarks('-Nnewer', null, null), true, 'no read mark at all → unread (the fake red-dot case)');
assert.equal(unreadFromMarks('-Nnewer', '', 0), true, 'non-string marks are ignored, treated as never-read');
assert.equal(unreadFromMarks('-Nbbb', '-Naaa', null), true, 'cloud mark older than newest → unread');
assert.equal(unreadFromMarks('-Nbbb', '-Nbbb', null), false, 'cloud mark equals newest → read');
assert.equal(unreadFromMarks('-Naaa', '-Nbbb', null), false, 'cloud mark newer than remaining newest (e.g. after delete) → read');
assert.equal(unreadFromMarks('-Nccc', '-Naaa', '-Nccc'), false, 'local mark caught up even if cloud is stale');
assert.equal(unreadFromMarks('-Nccc', '-Nccc', '-Naaa'), false, 'cloud mark caught up even if local is stale');
assert.equal(unreadFromMarks('-Nddd', '-Naaa', '-Nbbb'), true, 'both marks older → unread');

// The decision in app.js must still be this exact shape.
const check = src.slice(src.indexOf('async function checkUnread() {'), src.indexOf('function initBell()'));
assert.match(check, /const local = ReadMark\.load\(rid\);/);
assert.match(check, /return mine \? newest > mine : true;/);
assert.match(check, /filter\(\(x\) => typeof x === "string" && x\)/);

// LocSeen is also counted, and neither clicking the bell nor entering a room
// updates sc-loc-seen — only the admin dashboard does. If a location report
// is newer than the last dashboard visit, the bell will light on every click
// even when chat messages are all read. Keep this documented; do not change
// it in this fix without the user asking.
assert.match(check, /if \(await LocSeen\.unread\(f\)\) n\+\+;/);
const enterHidesDot = src.includes('$("gBellDot").hidden = true;   // 進來看了就不算未讀，紅點先收掉');
assert.equal(enterHidesDot, true);
assert.equal(src.includes('LocSeen.mark') && !check.includes('LocSeen.mark') && !check.includes('LocSeen.set'), true);

// --- tryMarkRead now always writes the local mark ---
const tryFn = src.slice(src.indexOf('function tryMarkRead() {'), src.indexOf('function tryMarkRecv() {'));
assert.match(tryFn, /if \(S\.roomId\) ReadMark\.save\(S\.roomId, last\.k\);/);
assert.doesNotMatch(tryFn, /if \(local\) ReadMark\.save/);
assert.match(tryFn, /if \(send\) S\.markRead\(last\.k\);/);

// --- leaveChat flushes the mark before tearing the room down ---
const leave = src.slice(src.indexOf('function leaveChat() {'), src.indexOf('function initViewport() {'));
const head = leave.slice(0, 500);
assert.match(head, /tryMarkRead\(\)/);
assert.ok(head.indexOf('tryMarkRead()') < head.indexOf('FilePicker.pending'), 'flush must run before the room is torn down');

console.log('PASS: bell unread comparison, local ReadMark always saved, leaveChat flushes tryMarkRead, loc-seen loop documented.');
