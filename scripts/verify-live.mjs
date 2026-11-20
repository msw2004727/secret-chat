import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/* 發布後 CDN 仍可能短暫回舊的 index.html（例如 run 44478900698）。
   先立刻檢查；對不上就等 2s、5s、10s、20s、30s、60s 再查，合計約 2 分 7 秒。
   每次請求都換查詢參數並帶 no-cache。次數用完仍對不上就失敗。 */
export const RETRY_WAITS_MS = [2000, 5000, 10000, 20000, 30000, 60000];

const CHAT_ORIGIN = 'https://sb.02251121.com';
const COVER_URL = 'https://daily-notes-7bb64-default-rtdb.asia-southeast1.firebasedatabase.app/settings/errorCover.json';
const ROOT_URL = 'https://02251121.com/';
const ROOT_LOCATION = 'https://jav101.com';
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
  'Pragma': 'no-cache',
};

const hash = data => createHash('sha256').update(data).digest('hex');

function chatUrl(file, token) {
  const url = new URL(file === 'index.html' ? '' : file, `${CHAT_ORIGIN}/`);
  url.searchParams.set('cb', String(token));
  return url.toString();
}

function failureText(error) {
  if (error && error.actual !== undefined && error.expected !== undefined) {
    return `${error.message}: got ${error.actual} expected ${error.expected}`;
  }
  return error && error.message ? error.message : String(error);
}

async function checkFile(file, manifest, fetchImpl, token) {
  const url = chatUrl(file, token);
  const response = await fetchImpl(url, {
    headers: NO_CACHE_HEADERS,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, `${file} status`);
  const actual = hash(Buffer.from(await response.arrayBuffer()));
  assert.equal(actual, manifest.hashes[file], `${file} deployed content`);
  if (manifest.immutable.includes(file)) assert.match(response.headers.get('cache-control') || '', /immutable/, `${file} long cache`);
  return {url, actual};
}

export async function verifyLive(manifest, options = {}) {
  const fetchImpl = options.fetch;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const log = options.log || (message => console.log(message));
  const now = options.now || Date.now;
  const waits = options.waits || RETRY_WAITS_MS;
  const files = ['index.html', 'sw.js', ...manifest.immutable];
  const pending = new Set(files);
  const errors = new Map();
  const attempts = waits.length + 1;
  log(`verify-live: ${files.length} files, up to ${attempts} attempts, backoff ${waits.join(', ')}ms`);
  for (let attempt = 1; attempt <= attempts && pending.size; attempt += 1) {
    if (attempt > 1) {
      const wait = waits[attempt - 2];
      log(`verify-live: waiting ${wait}ms before attempt ${attempt}/${attempts}`);
      await sleep(wait);
    }
    for (const file of files) {
      if (!pending.has(file)) continue;
      const token = `${now()}-${attempt}`;
      try {
        const result = await checkFile(file, manifest, fetchImpl, token);
        log(`verify-live: attempt ${attempt}/${attempts} ${file} matched ${result.actual} ${result.url}`);
        pending.delete(file);
        errors.delete(file);
      } catch (error) {
        errors.set(file, error);
        log(`verify-live: attempt ${attempt}/${attempts} ${file} failed ${chatUrl(file, token)} ${failureText(error)}`);
      }
    }
  }
  if (pending.size) {
    log(`verify-live: giving up after ${attempts} attempts; still failing: ${[...pending].join(', ')}`);
    throw errors.get([...pending][0]);
  }
  const coverSetting = await fetchImpl(COVER_URL, {signal: AbortSignal.timeout(20000)});
  assert.equal(coverSetting.status, 200, 'error cover display setting is readable');
  const coverEnabled = await coverSetting.json();
  assert.ok(coverEnabled === null || typeof coverEnabled === 'boolean', 'error cover display setting is boolean or default');
  const root = await fetchImpl(ROOT_URL, {redirect: 'manual'});
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), ROOT_LOCATION);
  log('PASS: chat content matches this commit and root redirect remains intact.');
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const manifest = JSON.parse(readFileSync('.cloud-local/build-manifest.json', 'utf8'));
  await verifyLive(manifest, {fetch: globalThis.fetch});
}
