import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = src.indexOf('async function restorePersistedUser');
const end = src.indexOf('/* 把 Firebase 的錯誤翻成');
assert.ok(start > 0 && end > start);
const connect = src.slice(src.indexOf('async function connectOnce()'), src.indexOf('async function restorePersistedUser'));
assert.doesNotMatch(connect, /setTimeout\(\(\) => fin\(auth\.currentUser\), 4000\)/);
assert.match(connect, /setPersistence\(auth, persistence\)/);
assert.match(connect, /browserLocalPersistence \|\| authMod\.indexedDBLocalPersistence/);
assert.match(connect, /restorePersistedUser\(auth, authMod\)/);
assert.match(connect, /ensureSignedIn\(auth, authMod, existing\)/);
assert.match(src.slice(start, end), /first\.code === "sc\/timeout"\) throw first/);

let wiped = 0;
const ctx = vm.createContext({
  console,
  Promise,
  setTimeout,
  indexedDB: {
    deleteDatabase() {
      wiped++;
      const req = {};
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
      return req;
    },
  },
});
vm.runInContext(src.slice(start, end) + '\nglobalThis.restorePersistedUser=restorePersistedUser;globalThis.ensureSignedIn=ensureSignedIn;', ctx);

const line = { uid: 'U' + 'ab'.repeat(16), isAnonymous: false };
let cb;
const authMod = {
  onAuthStateChanged(_auth, fn) { cb = fn; return () => {}; },
  async signInAnonymously() { throw new Error('should not sign in'); },
};
const slow = { currentUser: null };
const pending = ctx.restorePersistedUser(slow, authMod);
await Promise.resolve();
assert.equal(slow.currentUser, null);
slow.currentUser = line;
cb(line);
assert.equal(await pending, line);

let ready;
const viaReady = {
  currentUser: null,
  authStateReady() { return new Promise((res) => { ready = () => { this.currentUser = line; res(); }; }); },
};
const waited = ctx.restorePersistedUser(viaReady, { onAuthStateChanged() { throw new Error('ready path must not subscribe'); } });
await Promise.resolve();
ready();
assert.equal(await waited, line);

const empty = { currentUser: { uid: 'stale-should-be-ignored', isAnonymous: false } };
const none = ctx.restorePersistedUser(empty, authMod);
cb(null);
assert.equal(await none, null);

const auth = { currentUser: null };
let anon = 0;
const mod = {
  async signInAnonymously() {
    anon++;
    const err = new Error('timeout');
    err.code = 'sc/timeout';
    throw err;
  },
};
await assert.rejects(() => ctx.ensureSignedIn(auth, mod, null), (err) => err.code === 'sc/timeout');
assert.equal(anon, 1);
assert.equal(wiped, 0);
await ctx.ensureSignedIn(auth, mod, line);
assert.equal(anon, 1);

anon = 0;
mod.signInAnonymously = async () => {
  anon++;
  if (anon === 1) { const err = new Error('bad'); err.code = 'auth/network-request-failed'; throw err; }
  auth.currentUser = { uid: 'anon', isAnonymous: true };
};
await ctx.ensureSignedIn(auth, mod, null);
assert.equal(wiped, 3);
assert.equal(anon, 2);
assert.equal(auth.currentUser.isAnonymous, true);

console.log('PASS: slow auth restore keeps the LINE user, timeout does not wipe IndexedDB, anonymous sign-in only after a real empty session.');
