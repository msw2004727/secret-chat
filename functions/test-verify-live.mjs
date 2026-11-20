import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RETRY_WAITS_MS, verifyLive} from '../scripts/verify-live.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const budget = RETRY_WAITS_MS.reduce((sum, ms) => sum + ms, 0);
assert.deepEqual(RETRY_WAITS_MS, [2000, 5000, 10000, 20000, 30000, 60000]);
assert.equal(budget, 127000);
assert.ok(budget >= 120000 && budget <= 180000, 'retry waits stay inside about 2-3 minutes');

const COVER_URL = 'https://daily-notes-7bb64-default-rtdb.asia-southeast1.firebasedatabase.app/settings/errorCover.json';
const ROOT_URL = 'https://02251121.com/';

function manifestFor(bodies, immutable) {
  return {
    immutable,
    hashes: Object.fromEntries(Object.entries(bodies).map(([file, body]) => [file, hash(body)])),
  };
}

function textResponse(body, status = 200, headers = {}) {
  const bytes = Buffer.from(body);
  return {
    status,
    headers: {get: name => headers[String(name).toLowerCase()] ?? null},
    async arrayBuffer() { return bytes; },
  };
}

function jsonResponse(value, status = 200) {
  return {status, headers: {get: () => null}, async json() { return value; }};
}

function redirectResponse(location = 'https://jav101.com', status = 302) {
  return {status, headers: {get: name => String(name).toLowerCase() === 'location' ? location : null}};
}

function harness(route) {
  const calls = [];
  const sleeps = [];
  const logs = [];
  let clock = 1700000000000;
  return {
    calls,
    sleeps,
    logs,
    deps: {
      fetch: async (url, init) => {
        const href = String(url);
        calls.push({url: href, init});
        return route(href, init, calls);
      },
      sleep: async ms => { sleeps.push(ms); },
      log: message => logs.push(message),
      now: () => clock++,
    },
  };
}

function chatFile(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://sb.02251121.com') return null;
  return parsed.pathname === '/' ? 'index.html' : decodeURIComponent(parsed.pathname.slice(1));
}

function assertNoCache(call) {
  assert.match(call.init.headers['Cache-Control'], /no-cache/);
  assert.equal(call.init.headers.Pragma, 'no-cache');
  assert.equal(call.init.cache, 'no-store');
  const parsed = new URL(call.url);
  assert.ok(parsed.searchParams.get('cb'), call.url);
}

const fresh = {'index.html': '<html>new</html>', 'sw.js': 'sw-new', 'app-aaa.js': 'app-new'};
const manifest = manifestFor(fresh, ['app-aaa.js']);

const staleOnce = harness((url) => {
  const file = chatFile(url);
  if (file) {
    const body = file === 'index.html' && staleOnce.calls.filter(call => chatFile(call.url) === 'index.html').length === 1
      ? '<html>old</html>'
      : fresh[file];
    const headers = file === 'app-aaa.js'
      ? {'cache-control': 'public, max-age=31536000, immutable'}
      : {'cache-control': 'no-store, max-age=0'};
    return textResponse(body, 200, headers);
  }
  if (url === COVER_URL) return jsonResponse(null);
  if (url === ROOT_URL) return redirectResponse();
  throw new Error(`unexpected ${url}`);
});
await verifyLive(manifest, staleOnce.deps);
assert.deepEqual(staleOnce.sleeps, [2000], 'one stale index response waits 2s, not the whole budget');
assert.equal(staleOnce.calls.filter(call => chatFile(call.url) === 'index.html').length, 2);
assert.equal(staleOnce.calls.filter(call => chatFile(call.url) === 'sw.js').length, 1);
assert.equal(staleOnce.calls.filter(call => chatFile(call.url) === 'app-aaa.js').length, 1);
const chatCalls = staleOnce.calls.filter(call => chatFile(call.url));
for (const call of chatCalls) assertNoCache(call);
const tokens = chatCalls.map(call => new URL(call.url).searchParams.get('cb'));
assert.equal(new Set(tokens).size, tokens.length, 'each attempt uses a new cache-busting token');
assert.equal(staleOnce.calls.filter(call => call.url === ROOT_URL).length, 1);
assert.deepEqual(staleOnce.calls.find(call => call.url === ROOT_URL).init, {redirect: 'manual'});
assert.equal(staleOnce.calls.filter(call => call.url === COVER_URL).length, 1);
const failedAt = staleOnce.logs.findIndex(line => line.includes('attempt 1/7 index.html failed'));
const waitedAt = staleOnce.logs.findIndex(line => line.includes('waiting 2000ms before attempt 2/7'));
const matchedAt = staleOnce.logs.findIndex(line => line.includes('attempt 2/7 index.html matched'));
assert.ok(failedAt >= 0 && failedAt < waitedAt && waitedAt < matchedAt, staleOnce.logs.join('\n'));
assert.ok(staleOnce.logs.some(line => line.includes('got ') && line.includes('expected ')));
assert.ok(staleOnce.logs.at(-1).includes('PASS: chat content matches this commit and root redirect remains intact.'));

const alwaysStale = harness((url) => {
  const file = chatFile(url);
  if (!file) throw new Error(`content never matched, so ${url} must not be fetched`);
  const body = file === 'index.html' ? '<html>old</html>' : fresh[file];
  const headers = file === 'app-aaa.js' ? {'cache-control': 'public, max-age=31536000, immutable'} : {};
  return textResponse(body, 200, headers);
});
await assert.rejects(() => verifyLive(manifest, alwaysStale.deps), /index\.html deployed content/);
assert.deepEqual(alwaysStale.sleeps, RETRY_WAITS_MS, 'waits are shared across files and stop at the budget');
assert.equal(alwaysStale.calls.filter(call => chatFile(call.url) === 'index.html').length, RETRY_WAITS_MS.length + 1);
assert.equal(alwaysStale.calls.filter(call => chatFile(call.url) === 'sw.js').length, 1);
assert.equal(alwaysStale.calls.filter(call => call.url === ROOT_URL).length, 0);
assert.equal(alwaysStale.calls.filter(call => call.url === COVER_URL).length, 0);
assert.ok(alwaysStale.logs.at(-1).includes('giving up after 7 attempts; still failing: index.html'));

const badRedirect = harness((url) => {
  const file = chatFile(url);
  if (file) {
    const headers = file === 'app-aaa.js' ? {'cache-control': 'public, max-age=31536000, immutable'} : {};
    return textResponse(fresh[file], 200, headers);
  }
  if (url === COVER_URL) return jsonResponse(false);
  if (url === ROOT_URL) return redirectResponse('https://example.invalid');
  throw new Error(`unexpected ${url}`);
});
await assert.rejects(() => verifyLive(manifest, badRedirect.deps), /https:\/\/jav101\.com/);
assert.deepEqual(badRedirect.sleeps, []);
assert.equal(badRedirect.calls.filter(call => call.url === ROOT_URL).length, 1);
assert.equal(badRedirect.logs.some(line => line.includes('PASS:')), false);

const immutableRetry = harness((url) => {
  const file = chatFile(url);
  if (file === 'app-aaa.js') {
    const seen = immutableRetry.calls.filter(call => chatFile(call.url) === 'app-aaa.js').length;
    const headers = seen === 1 ? {'cache-control': 'max-age=3600'} : {'cache-control': 'public, max-age=31536000, immutable'};
    return textResponse(fresh[file], 200, headers);
  }
  if (file) return textResponse(fresh[file]);
  if (url === COVER_URL) return jsonResponse(true);
  if (url === ROOT_URL) return redirectResponse();
  throw new Error(`unexpected ${url}`);
});
await verifyLive(manifest, immutableRetry.deps);
assert.deepEqual(immutableRetry.sleeps, [2000]);
assert.equal(immutableRetry.calls.filter(call => chatFile(call.url) === 'app-aaa.js').length, 2);
assert.equal(immutableRetry.calls.filter(call => call.url === ROOT_URL).length, 1);

const blip = harness((url) => {
  const file = chatFile(url);
  if (file === 'index.html' && blip.calls.filter(call => chatFile(call.url) === 'index.html').length === 1) {
    throw new Error('socket hang up');
  }
  if (file) {
    const headers = file === 'app-aaa.js' ? {'cache-control': 'public, max-age=31536000, immutable'} : {};
    return textResponse(fresh[file], 200, headers);
  }
  if (url === COVER_URL) return jsonResponse(true);
  if (url === ROOT_URL) return redirectResponse();
  throw new Error(`unexpected ${url}`);
});
await verifyLive(manifest, blip.deps);
assert.deepEqual(blip.sleeps, [2000]);
assert.ok(blip.logs.some(line => line.includes('socket hang up')));

console.log('PASS: live verify retries a stale CDN response, then still requires the root redirect.');
