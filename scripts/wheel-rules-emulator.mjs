import fs from "node:fs";
import assert from "node:assert/strict";
import { createWheel } from "../games.js";

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000";
const ns = "demo-secret-chat";
const room = "0123456789abcdef0123456789abcdef";

function userQuery(uid, claims = {}) {
  const auth = JSON.stringify({ uid, token: { ...claims } });
  return `auth_variable_override=${encodeURIComponent(auth)}`;
}

async function req(method, path, body, authQuery, asUser) {
  const url = `http://${host}${path}.json?ns=${encodeURIComponent(ns)}${authQuery ? "&" + authQuery : ""}`;
  const headers = { "Content-Type": "application/json" };
  if (authQuery === "owner" || asUser) headers.Authorization = "Bearer owner";
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const base = createWheel("m", "w1", "誰是笨蛋", Date.now(), "小麥", "小辛");
const wheelPath = `/rooms/${room}/games/wheel`;

const rulesBody = fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8");
const loaded = await fetch(`http://${host}/.settings/rules.json?ns=${encodeURIComponent(ns)}`, {
  method: "PUT",
  headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
  body: rulesBody,
});
assert.equal(loaded.status, 200, await loaded.text());
const seeded = await req("PUT", `/acl/${room}/on`, false, "owner");
assert.equal(seeded.status, 200, seeded.text);
const alice = userQuery("alice");

const ok = await req("PUT", wheelPath, base, alice, true);
assert.equal(ok.status, 200, ok.text);

const six = { ...base, self: "一二三四五六" };
assert.equal((await req("PUT", wheelPath, six, alice, true)).status, 200);

async function rejected(body, label) {
  const res = await req("PUT", wheelPath, body, alice, true);
  assert.notEqual(res.status, 200, label + " " + res.text);
}
await rejected({ ...base, self: "一二三四五六七" }, "self too long");
await rejected({ ...base, other: "一二三四五六七" }, "other too long");
await rejected({ ...base, self: "" }, "self empty");
await rejected({ ...base, other: 1 }, "other not string");
const { self, ...noSelf } = base;
await rejected(noSelf, "self missing");

const anon = await req("PUT", wheelPath, base, "");
assert.notEqual(anon.status, 200, anon.text);

const kept = await req("GET", wheelPath, undefined, alice, true);
assert.equal(kept.status, 200, kept.text);
const stored = JSON.parse(kept.text);
assert.equal(stored.self, "一二三四五六");
assert.equal(stored.other, "小辛");
assert.equal(stored.topic, "誰是笨蛋");

console.log("PASS: wheel label rules accept 1–6 character strings and reject the rest.");

const adminUid = "adm1";
const anonUid = "anon1";
assert.equal((await req("PUT", "/admin/adm1", true, "owner")).status, 200);

const locBody = { t: { ".sv": "timestamp" }, ek: "abc", iv: "iviviviviviv", c: "cipher" };
const created = await req("PUT", "/loc/loc1", locBody, userQuery(anonUid), true);
assert.equal(created.status, 200, created.text);
const anonRead = await req("GET", "/loc", undefined, userQuery(anonUid), true);
assert.notEqual(anonRead.status, 200, "anonymous must not read loc " + anonRead.text);
const adminRead = await req("GET", "/loc", undefined, userQuery(adminUid), true);
assert.equal(adminRead.status, 200, adminRead.text);
assert.match(adminRead.text, /cipher/);
const queried = await fetch(`http://${host}/loc.json?ns=${encodeURIComponent(ns)}&${userQuery(adminUid)}&orderBy=%22%24key%22&limitToLast=1`, {
  headers: { Authorization: "Bearer owner" },
});
assert.equal(queried.status, 200, await queried.text());
const shallow = await fetch(`http://${host}/loc.json?ns=${encodeURIComponent(ns)}&${userQuery(adminUid)}&shallow=true`, {
  headers: { Authorization: "Bearer owner" },
});
assert.equal(shallow.status, 200, await shallow.text());
assert.notEqual((await req("PUT", "/loc/loc1", { ...locBody, c: "changed" }, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("DELETE", "/loc/loc1", undefined, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("PUT", "/loc/loc2", { t: { ".sv": "timestamp" }, ek: "", iv: "iv", c: "c" }, userQuery(anonUid), true)).status, 200);
assert.equal((await req("DELETE", "/loc/loc1", undefined, userQuery(adminUid), true)).status, 200);

const secret = "a".repeat(32);
const note = { t: 1, iv: "1234567890123456", c: "note" };
assert.notEqual((await req("PUT", `/devnote/${secret}/room1/dev1`, note, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("PUT", `/devnote/${"Z".repeat(32)}/room1/dev1`, note, userQuery(adminUid), true)).status, 200);
assert.equal((await req("PUT", `/devnote/${secret}/room1/dev1`, note, userQuery(adminUid), true)).status, 200);
assert.notEqual((await req("GET", `/devnote/${secret}`, undefined, userQuery(anonUid), true)).status, 200);
const pushSub = { ep: "https://push.example/a", k: "kk", a: "aa", t: 1, on: true };
assert.notEqual((await req("PUT", `/locpush/${secret}/phone`, pushSub, userQuery(anonUid), true)).status, 200);
assert.equal((await req("PUT", `/locpush/${secret}/phone`, pushSub, userQuery(adminUid), true)).status, 200);

const msg = { s: "device", t: 1, iv: "iviviviviviv", c: "cipher" };
assert.equal((await req("PUT", `/rooms/${room}/m/m1`, msg, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("PUT", `/rooms/${room}/m/m1`, { ...msg, c: "changed" }, userQuery(anonUid), true)).status, 200);
assert.equal((await req("DELETE", `/rooms/${room}/m/m1`, undefined, userQuery("bob"), true)).status, 200);
const ownPush = { ep: "https://push.example/a", k: "kk", a: "aa", uid: anonUid };
assert.equal((await req("PUT", `/rooms/${room}/push/device1`, ownPush, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("PUT", `/rooms/${room}/push/device1`, { ...ownPush, ep: "https://push.example/evil", uid: "bob" }, userQuery("bob"), true)).status, 200);
assert.equal((await req("PUT", `/rooms/${room}/push/device1`, { ...ownPush, ep: "https://push.example/new" }, userQuery(anonUid), true)).status, 200);
assert.notEqual((await req("PUT", "/locNotify/win", 1, userQuery(adminUid), true)).status, 200);

console.log("PASS: loc, devnote, locpush, message and push rules.");
