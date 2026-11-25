import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';

/* 貼圖面板在矮螢幕上（v62.22）。站長回報：手機高度低時，貼圖面板只剩分頁列跟出處那行，
   格子被擠到 0。根因是訊息區 flex 基準是 auto，訊息少時幾乎不縮，縮的全是貼圖面板。
   現在訊息區先讓，格子至少留一排；再矮就整個面板一起捲，分頁黏在上面、出處捲得到。
   ⚠️ 全程離線假資料（假格子），不碰資料庫。 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  const state = { offsetLeft: 0, offsetTop: 0, width: 320, height: 568, scale: 1 };
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
const context = await browser.newContext({ ...devices['iPhone SE'] });
await context.addInitScript(initVV);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err).slice(0, 180)));


const fill = () => {
  const g = document.getElementById('stickerGrid');
  if (!g.children.length) for (let i = 0; i < 16; i++) { const d = document.createElement('div'); d.className = 'cell'; g.appendChild(d); }
};

try {
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#stickerPanel', { state: 'attached' });
  await page.evaluate(() => { document.documentElement.dataset.errorCover = 'hidden'; const c = document.querySelector('#chat'); c.hidden = false; c.inert = false; });
  await page.evaluate(fill);
  const measure = async (H) => {
    await page.evaluate((h) => window.__vvSet({ height: h }), H);
    await page.waitForFunction((h) => getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() === h + 'px', H);
    return page.evaluate(() => {
      const p = document.getElementById('stickerPanel'); p.hidden = false; p.scrollTop = 0;
      const rect = (el) => el.getBoundingClientRect();
      const pr = rect(p), tabs = rect(document.getElementById('stkTabs')), grid = rect(document.getElementById('stickerGrid'));
      const bar = rect(document.getElementById('sendForm'));
      const cell = document.querySelector('#stickerGrid .cell').getBoundingClientRect();
      const hit = document.elementFromPoint(cell.x + cell.width / 2, Math.min(cell.y + 20, pr.bottom - 2));
      p.scrollTop = p.scrollHeight;
      const tip = rect(document.getElementById('stkTip'));
      const tabsAfter = rect(document.getElementById('stkTabs'));
      const out = { panelTop: pr.top, panelBottom: pr.bottom, panel: pr.height, tabsTop: tabs.top, grid: grid.height,
        cellHit: !!(hit && hit.classList && hit.classList.contains('cell')), tipBottom: tip.bottom, tabsAfterTop: tabsAfter.top,
        barTop: bar.top, barBottom: bar.bottom, scrollable: p.scrollHeight > p.clientHeight };
      p.hidden = true; p.scrollTop = 0;
      return out;
    });
  };
  for (const H of [568, 400, 330, 280, 250]) {
    const m = await measure(H);
    const tag = H + 'px: ' + JSON.stringify(m);
    assert.ok(m.grid >= 97, 'sticker grid keeps at least one row ' + tag);
    assert.ok(m.cellHit, 'the first sticker is visible and tappable ' + tag);
    assert.ok(m.barBottom <= H + 1 && m.barTop >= 0, 'input bar stays on screen ' + tag);
    assert.ok(m.tipBottom <= m.panelBottom + 1, 'the attribution line is reachable by scrolling ' + tag);
    assert.ok(Math.abs(m.tabsAfterTop - m.panelTop) < 2 || !m.scrollable, 'tabs stay pinned while the panel scrolls ' + tag);
  }
  const roomy = await measure(568);
  assert.equal(roomy.scrollable, false, 'with room to spare the panel itself does not scroll');

  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /\.c-scroll \{[^}]*flex: 1 1 0; min-height: 0;/, 'the message list gives way first');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: on short screens the sticker panel keeps a full row of stickers, pinned tabs, a reachable attribution line and the input bar on screen.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
