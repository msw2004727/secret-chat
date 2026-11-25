import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';

/* 選單裡的「設定」「記事本」「互動」「清除對話」在手機上的版面與按鍵（v62.17）。
   ① 鍵盤開著（看得到的高度只剩 330px）時，選單捲得到最底下的「清除對話」，
      設定、貼圖、相簿面板打開也不會把輸入列擠出畫面。
   ② 兩段式確認（清除對話、刪除記事）手指一抖點成兩下，不會直接執行。
   ⚠️ 全程離線假資料；清除與刪除都是假的函式，不碰任何真的資料庫。 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const between = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  assert.ok(i >= 0 && j > i, 'missing source block ' + a);
  return src.slice(i, j);
};
const gear = between('  const closeGearMenu = () => {', '  wipeBtn?.addEventListener');
assert.match(gear, /classList\.remove\("gear-open"\)/, 'closing the menu drops the header lift');
assert.match(gear, /classList\.add\("gear-open"\)/, 'opening the menu lifts the header above the input bar');
const guard = Number(src.match(/const ARM_GUARD_MS = (\d+);/)[1]);
assert.ok(guard >= 350 && guard <= 800, 'guard ' + guard);

/* ---------- ② 清除對話：第二下要隔夠久 ---------- */
{
  let now = 1000, wiped = 0;
  const el = (id) => ({ id, hidden: id === 'wipeYes' || id === 'gearMenu', on: {}, cls: new Set(), classList: { add(c) { this.o.cls.add(c); }, remove(c) { this.o.cls.delete(c); } }, addEventListener(k, f) { this.on[k] = f; }, setAttribute() {} });
  const nodes = new Map();
  const $ = (id) => { if (!nodes.has(id)) { const n = el(id); n.classList.o = n; nodes.set(id, n); } return nodes.get(id); };
  const S = { wipe: async () => { wiped++; } };
  const ctx = vm.createContext({ $, S, Date: { now: () => now }, ARM_GUARD_MS: guard, toast() {}, console,
    setTimeout: () => 1, clearTimeout() {}, document: { addEventListener() {} } });
  vm.runInContext(between('  const wipeBtn = $("btnWipe")', '  /* --- 回到最新 --- */'), ctx);
  const ev = { preventDefault() {}, stopPropagation() {} };
  const tap = async (id) => { await $(id).on.click(ev); };
  await tap('btnWipe');
  assert.equal($('wipeYes').hidden, false);
  now += 120; await tap('wipeYes');
  assert.equal(wiped, 0, 'a double tap must not wipe');
  assert.equal($('wipeYes').hidden, false, 'confirm stays armed after the ignored tap');
  now += 600; await tap('wipeYes');
  assert.equal(wiped, 1, 'a deliberate second tap wipes');
  assert.equal($('wipeYes').hidden, true);
}

/* ---------- ② 刪除記事：同一條規矩 ---------- */
{
  let now = 1000;
  const deleted = [];
  const hint = { innerHTML: '', textContent: '' };
  const ctx = vm.createContext({ $: () => hint, Date: { now: () => now }, ARM_GUARD_MS: guard, console,
    S: { delNote: async (k) => { deleted.push(k); } }, toast() {}, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext('globalThis.N = {editing: "k1", delArmed: false, dirty: false, showList(){},\n'
    + between('  armDelete() {', '\n};') + '};', ctx);
  const N = ctx.N;
  N.armDelete();
  assert.equal(N.delArmed, true);
  now += 150; N.armDelete();
  assert.deepEqual(deleted, [], 'a double tap must not delete the note');
  now += 600; N.armDelete();
  assert.deepEqual(deleted, ['k1']);
}

/* ---------- ① 鍵盤開著時的版面（WebKit iPhone 13） ---------- */
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('missing ' + rel); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const initVV = () => {
  const listeners = { resize: new Set(), scroll: new Set() };
  const state = { offsetLeft: 0, offsetTop: 0, width: 390, height: 664, scale: 1 };
  const vv = {
    get offsetLeft() { return state.offsetLeft; }, get offsetTop() { return state.offsetTop; },
    get width() { return state.width; }, get height() { return state.height; }, get scale() { return state.scale; },
    get pageLeft() { return state.offsetLeft; }, get pageTop() { return state.offsetTop; },
    addEventListener(type, fn) { listeners[type]?.add(fn); }, removeEventListener(type, fn) { listeners[type]?.delete(fn); },
  };
  window.__vvSet = (next) => {
    Object.assign(state, next);
    for (const fn of listeners.resize) fn();
    for (const fn of listeners.scroll) fn();
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
};

const browser = await webkit.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
await context.addInitScript(initVV);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err).slice(0, 180)));

try {
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#gearMenu', { state: 'attached' });
  await page.evaluate(() => {
    document.documentElement.dataset.errorCover = 'hidden';
    const chat = document.querySelector('#chat');
    chat.hidden = false;
    chat.inert = false;
    for (const id of ['btnNotes', 'zooPanel']) document.getElementById(id).hidden = false;
  });
  const KB = 330;   // 鍵盤開著時看得到的高度
  await page.evaluate((h) => window.__vvSet({ height: h }), KB);
  await page.waitForFunction((h) => getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() === h + 'px', KB);

  // 選單：本身不超出看得到的範圍，捲到底點得到「清除對話」
  const menu = await page.evaluate(() => {
    const m = document.getElementById('gearMenu');
    m.hidden = false;
    document.getElementById('chat').classList.add('gear-open');   // 跟 S.toggleGear 一樣
    m.scrollTop = m.scrollHeight;
    const r = m.getBoundingClientRect();
    const w = document.getElementById('btnWipe').getBoundingClientRect();
    const hit = document.elementFromPoint(w.x + w.width / 2, w.y + w.height / 2);
    return { bottom: r.bottom, wipeBottom: w.bottom, hit: hit && hit.id, scrollable: m.scrollHeight > m.clientHeight };
  });
  assert.ok(menu.bottom <= KB + 1, 'menu runs under the keyboard: ' + JSON.stringify(menu));
  assert.equal(menu.hit, 'btnWipe', 'clear-chat unreachable with the keyboard open: ' + JSON.stringify(menu));
  await page.evaluate(() => { document.getElementById('gearMenu').hidden = true; document.getElementById('chat').classList.remove('gear-open'); });

  // 設定、貼圖、相簿面板：輸入列跟標題列都還在看得到的範圍內
  for (const id of ['settingsPanel', 'stickerPanel', 'albumPanel']) {
    const box = await page.evaluate((pid) => {
      const p = document.getElementById(pid);
      p.hidden = false;
      const bar = document.getElementById('sendForm').getBoundingClientRect();
      const head = document.querySelector('#chat .c-bar, #chat header')?.getBoundingClientRect();
      const out = { barTop: bar.top, barBottom: bar.bottom, headTop: head ? head.top : 0, panel: p.getBoundingClientRect().height };
      p.hidden = true;
      return out;
    }, id);
    assert.ok(box.barBottom <= KB + 1 && box.barTop >= 0, id + ' pushes the input bar off screen: ' + JSON.stringify(box));
    assert.ok(box.headTop >= -1, id + ' pushes the header off screen: ' + JSON.stringify(box));
  }

  // 鍵盤收起來之後面板照舊有原本的高度（沒有被改小）
  await page.evaluate(() => window.__vvSet({ height: 664 }));
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() === '664px');
  const full = await page.evaluate(() => {
    const p = document.getElementById('settingsPanel');
    p.hidden = false;
    const v = getComputedStyle(p).maxHeight;
    p.hidden = true;
    return v;
  });
  assert.ok(Math.abs(parseFloat(full) - 664 * 0.6) < 0.5, 'settings max-height with the keyboard closed: ' + full);

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: with the keyboard open the menu scrolls to clear-chat and settings / sticker / album panels keep the input bar on screen; clear-chat and note delete ignore a double tap.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
