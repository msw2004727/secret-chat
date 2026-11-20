import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { webkit, devices } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

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
    get offsetLeft() { return state.offsetLeft; },
    get offsetTop() { return state.offsetTop; },
    get width() { return state.width; },
    get height() { return state.height; },
    get scale() { return state.scale; },
    get pageLeft() { return state.offsetLeft; },
    get pageTop() { return state.offsetTop; },
    addEventListener(type, fn) { listeners[type]?.add(fn); },
    removeEventListener(type, fn) { listeners[type]?.delete(fn); },
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
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 180)); });
page.on('response', (res) => { if (res.status() >= 400) errors.push(res.status() + ' ' + res.url()); });

try {
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#photoInput', { state: 'attached' });
  await page.evaluate(() => {
    document.documentElement.dataset.errorCover = 'hidden';
    const chat = document.querySelector('#chat');
    chat.hidden = false;
    chat.inert = false;
  });

  const showPlus = () => page.evaluate(() => { document.querySelector('#plusMenu').hidden = false; });
  const showSticker = () => page.evaluate(() => {
    document.querySelector('#stickerPanel').hidden = false;
    document.querySelector('#btnAddSticker').hidden = false;
  });
  const point = (sel) => page.evaluate((selector) => {
    const el = document.querySelector(selector);
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width * 0.45, r.y + r.height / 2);
    return {
      x: r.x + r.width * 0.45,
      y: r.y + r.height / 2,
      w: r.width,
      h: r.height,
      hit: hit && (hit.id || hit.tagName),
    };
  }, sel);
  async function tapOpens(sel, expectedId) {
    const pt = await point(sel);
    assert.ok(pt.w > 24 && pt.h > 24, sel + ' has no size');
    assert.equal(pt.hit, expectedId, sel + ' tap misses ' + expectedId);
    const chooser = page.waitForEvent('filechooser', { timeout: 4000 });
    await page.touchscreen.tap(pt.x, pt.y);
    const dialog = await chooser;
    await dialog.setFiles({ name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  }

  await showPlus();
  await tapOpens('#plusPhoto', 'photoInput');
  await showPlus();
  await tapOpens('#plusVideo', 'videoInput');
  await showSticker();
  await tapOpens('#btnAddSticker', 'fileInput');
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 700)));

  const shifted = await page.evaluate(() => {
    window.__vvSet({ offsetLeft: 28, offsetTop: 0, width: 362, height: 400 });
    return {
      offset: window.visualViewport.offsetLeft,
      left: getComputedStyle(document.documentElement).getPropertyValue('--app-left'),
      css: document.documentElement.style.cssText,
      width: window.visualViewport.width,
    };
  });
  assert.equal(shifted.offset, 28, JSON.stringify(shifted) + ' ' + errors.join(' | '));
  assert.match(shifted.left, /28px/, JSON.stringify(shifted) + ' ' + errors.join(' | '));
  await showPlus();
  await tapOpens('#plusPhoto', 'photoInput');
  await showPlus();
  await tapOpens('#plusVideo', 'videoInput');

  await page.evaluate(() => {
    window.__vvSet({ offsetLeft: 0, offsetTop: 0, width: 390, height: 664 });
    document.querySelector('#msgInput').focus();
    const shift = () => window.__vvSet({ offsetLeft: 36, offsetTop: 24, width: 354, height: 320 });
    for (const id of ['photoInput', 'videoInput', 'fileInput']) {
      document.querySelector('#' + id).addEventListener('pointerdown', shift, true);
    }
  });
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--app-left').trim() === '0px');
  await showPlus();
  await tapOpens('#plusPhoto', 'photoInput');
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--app-left').includes('36'));
  await page.evaluate(() => window.__vvSet({ offsetLeft: 0, offsetTop: 0, width: 390, height: 664 }));
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--app-left').trim() === '0px');
  await showPlus();
  await tapOpens('#plusVideo', 'videoInput');
  await showSticker();
  await tapOpens('#btnAddSticker', 'fileInput');

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: iPhone taps open the photo, video and sticker file choosers with the keyboard closed, already open, and closing.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
