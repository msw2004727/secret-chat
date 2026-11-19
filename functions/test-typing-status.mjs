import assert from "node:assert/strict";
import fs from "node:fs";
import { TYPING_LABELS, typingCode, fitTypingText, createTypingSense } from "../typing-status.js";

const emoji = /\p{Extended_Pictographic}/u;
for (const [code, list] of Object.entries(TYPING_LABELS)) {
  assert.equal(list.length, 3, code);
  for (const text of list) assert.equal(emoji.test(text), false, text);
}
assert.deepEqual(TYPING_LABELS.f, ["瘋狂輸入中", "狂打中", "狂打"]);
assert.deepEqual(TYPING_LABELS.p, ["邊想邊打中", "邊想中", "邊想"]);
assert.deepEqual(TYPING_LABELS.d, ["打了又刪中", "又刪中", "又刪"]);
assert.deepEqual(TYPING_LABELS.l, ["認真寫長文中", "寫長文", "長文"]);
assert.deepEqual(TYPING_LABELS.n, ["正在輸入中…", "輸入中…", "輸入…"]);
assert.deepEqual(TYPING_LABELS.b, ["醞釀好久終於開口中", "終於開口", "開口"]);
assert.equal(typingCode("f"), "f");
assert.equal(typingCode("nope"), "n");
assert.equal(typingCode(""), "n");

assert.equal(fitTypingText(TYPING_LABELS.b, (text) => text.length <= 4), "終於開口");
assert.equal(fitTypingText(TYPING_LABELS.b, (text) => text.length <= 2), "開口");
assert.equal(fitTypingText(TYPING_LABELS.f, () => true), "瘋狂輸入中");

const at = (sense, t, kind, n, draft) => sense.edit({ t, kind, n, draft });

{
  const sense = createTypingSense(0);
  at(sense, 1000, "add", 1, 1);
  assert.equal(sense.code(1000), "n");
  assert.equal(sense.code(7000), "");
}

{
  const sense = createTypingSense(0);
  for (let i = 0; i < 8; i++) at(sense, 1000 + i * 100, "add", 1, i + 1);
  assert.equal(sense.code(1800), "f");
}

{
  const sense = createTypingSense(0);
  at(sense, 1000, "paste", 12, 12);
  assert.equal(sense.code(1000), "n");
  at(sense, 1100, "paste", 40, 40);
  assert.equal(sense.code(1100), "l");
}

{
  const sense = createTypingSense(0);
  at(sense, 0, "del", 1, 3);
  at(sense, 100, "del", 1, 2);
  at(sense, 200, "del", 1, 1);
  at(sense, 300, "add", 1, 2);
  assert.equal(sense.code(300), "n");
  at(sense, 400, "del", 1, 1);
  assert.equal(sense.code(400), "d");
}

{
  const sense = createTypingSense(0);
  at(sense, 0, "add", 1, 1);
  at(sense, 2000, "add", 1, 2);
  assert.equal(sense.code(2000), "p");
}

{
  const sense = createTypingSense(0);
  at(sense, 60000, "add", 1, 1);
  assert.equal(sense.code(60000), "b");
  for (let t = 60800; t <= 66000; t += 800) at(sense, t, "add", 1, 1 + (t - 60000) / 800);
  assert.equal(sense.code(66000), "n");
}

{
  const sense = createTypingSense(0);
  for (let i = 0; i < 8; i++) at(sense, 60000 + i * 40, "add", 1, i + 1);
  assert.equal(sense.code(60320), "f");
}

{
  const sense = createTypingSense(0);
  at(sense, 0, "add", 1, 1);
  for (let t = 3000; t <= 18000; t += 3000) at(sense, t, "add", 2, 1 + t / 1500);
  assert.equal(sense.code(18000), "l");
  const once = createTypingSense(0);
  at(once, 1000, "add", 36, 36);
  assert.equal(once.code(1000), "l");
}

{
  const sense = createTypingSense(0);
  for (let i = 0; i < 8; i++) at(sense, i * 80, "add", 1, i + 1);
  assert.equal(sense.code(700), "f");
  assert.equal(sense.code(2000), "f");
  assert.equal(sense.code(2600), "f");
  assert.equal(sense.code(4000), "n");
}

{
  const sense = createTypingSense(0);
  at(sense, 0, "compose", 0, 0);
  at(sense, 400, "compose", 0, 3);
  assert.equal(sense.code(400), "n");
  at(sense, 70000, "compose", 0, 1);
  assert.equal(sense.code(70000), "b");
  sense.reset(80000);
  at(sense, 140000, "add", 1, 1);
  assert.equal(sense.code(140000), "b");
}

const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
const typingS = rules.rules.rooms.$roomId.typingS;
assert.equal(typeof typingS.$clientId[".validate"], "string");
assert.match(typingS.$clientId[".validate"], /newData\.isString\(\)/);
assert.match(typingS.$clientId[".validate"], /\[dfblpn\]/);
assert.equal(rules.rules.rooms.$roomId.typing.$clientId[".validate"], "newData.isNumber()");

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert.match(app, /typingS\/\$\{S\.clientId\}/);
assert.match(app, /onDisconnect\(myStyleRef\)\.remove\(\)/);
assert.match(app, /remove\(ref\(db, `\$\{base\}\/typingS`\)\)/);

console.log("PASS: typing status codes, thresholds, label fit and typingS rules.");
