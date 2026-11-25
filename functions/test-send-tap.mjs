import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';

/* 手機送出鈕（v62.16）。
   症狀：送出偶爾按了沒反應、鍵盤開關時畫面跑位。
   這支在 iPhone 尺寸的 WebKit 上真的點，量的是：
   ① 鍵盤上的 Enter 鍵標示跟實際行為一致（手機上是換行，不能標「傳送」）
   ② 空白時點送出鈕，焦點留在輸入框（鍵盤不收、畫面不跳）
   ③ 按下那一刻輸入列被擠走，放開時仍送得出去
   ④ 手指微動、瀏覽器沒發 click 時仍送得出去；長按、取消、滑走不送
   ⑤ 一次觸控只送一次 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const between = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  assert.ok(i >= 0 && j > i, 'missing source block ' + a);
  return src.slice(i, j);
};
const helper = between('function enterSends()', 'function bindChatUI()');
const chatUI = between('function bindChatUI()', '  /* 輕點對話區的空白處');

/* 靜態：按鈕不用真的 disabled，送出走 bindSendButton */
const sendTag = html.slice(html.indexOf('id="btnSend"') - 60, html.indexOf('>', html.indexOf('id="btnSend"')) + 1);
assert.doesNotMatch(sendTag, /\sdisabled[\s>]/, 'btnSend must not use the disabled attribute');
assert.match(sendTag, /aria-disabled="true"/);
assert.doesNotMatch(src, /sendBtn\.disabled|\$\("btnSend"\)\.disabled/);
assert.match(chatUI, /sendBtn\.setAttribute\("aria-disabled"/);
assert.match(chatUI, /bindSendButton\(input, sendBtn, sendNow\)/);
assert.doesNotMatch(chatUI, /sendBtn\.addEventListener\("click"/);
const msgTag = html.slice(html.indexOf('id="msgInput"'), html.indexOf('</textarea>', html.indexOf('id="msgInput"')));
assert.doesNotMatch(msgTag, /enterkeyhint="send"/, 'touch Enter inserts a newline, so the key must not say send');
assert.match(css, /\.c-send\[aria-disabled="true"\]/);
assert.doesNotMatch(css, /\.c-send:disabled/);
assert.doesNotMatch(css, /^\.c-icon:hover/m, '.c-icon:hover must be limited to hover devices');
assert.match(css, /\.c-input \{[^}]*touch-action: none/);
assert.match(css, /\.c-text \{[^}]*touch-action: pan-y/);

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

/* 有沒有實體鍵盤由 matchMedia 決定，這裡固定成「純觸控」，可以切換 */
const initMedia = () => {
  window.__fine = false;
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => (q === '(hover: hover) and (pointer: fine)'
    ? { matches: window.__fine, media: q, addEventListener() {}, removeEventListener() {} }
    : real(q));
};

const browser = await webkit.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
await context.addInitScript(initMedia);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err).slice(0, 180)));

try {
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#btnSend', { state: 'attached' });
  await page.evaluate((code) => {
    document.documentElement.dataset.errorCover = 'hidden';
    const chat = document.querySelector('#chat');
    chat.hidden = false;
    chat.inert = false;
    const input = document.querySelector('#msgInput');
    const btn = document.querySelector('#btnSend');
    window.__fired = 0;
    window.__sent = [];
    // 跟 sendNow 一樣：空白就不送，送出後清空
    const fire = () => {
      window.__fired++;
      const t = input.value.trim();
      if (!t) return;
      window.__sent.push(t);
      input.value = '';
    };
    // eslint-disable-next-line no-new-func
    new Function('input', 'btn', 'fire', code + '\nbindSendButton(input, btn, fire);')(input, btn, fire);
  }, helper);

  const state = () => page.evaluate(() => ({
    fired: window.__fired,
    sent: window.__sent.slice(),
    active: document.activeElement && document.activeElement.id,
    hint: document.querySelector('#msgInput').getAttribute('enterkeyhint'),
  }));
  const center = () => page.evaluate(() => {
    const r = document.querySelector('#btnSend').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  const settle = () => page.evaluate(() => new Promise((r) => setTimeout(r, 900)));
  const reset = () => page.evaluate(() => { window.__fired = 0; window.__sent = []; });

  // 空白時仍是灰的（外觀靠 aria-disabled），輸入列不交給瀏覽器平移
  const look = await page.evaluate(() => ({
    op: getComputedStyle(document.querySelector('#btnSend')).opacity,
    bar: getComputedStyle(document.querySelector('#sendForm')).touchAction,
    text: getComputedStyle(document.querySelector('#msgInput')).touchAction,
  }));
  assert.equal(Number(look.op).toFixed(2), '0.35', JSON.stringify(look));
  assert.equal(look.bar, 'none', JSON.stringify(look));
  assert.equal(look.text, 'pan-y', JSON.stringify(look));

  // ① Enter 鍵標示
  assert.equal((await state()).hint, 'enter');
  await page.evaluate(() => { window.__fine = true; document.querySelector('#msgInput').blur(); document.querySelector('#msgInput').focus(); });
  assert.equal((await state()).hint, 'send');
  await page.evaluate(() => { window.__fine = false; document.querySelector('#msgInput').blur(); document.querySelector('#msgInput').focus(); });
  assert.equal((await state()).hint, 'enter');

  // ② 空白時點送出：焦點留在輸入框
  const pt = await center();
  assert.ok(pt.w >= 38 && pt.h >= 38, 'send button too small ' + JSON.stringify(pt));
  await page.focus('#msgInput');
  await page.touchscreen.tap(pt.x, pt.y);
  await settle();
  let st = await state();
  assert.equal(st.active, 'msgInput', 'empty tap stole focus from the textarea');
  assert.deepEqual(st.sent, []);

  // ⑤ 有字時一般點擊：送一次，焦點還在
  await reset();
  await page.fill('#msgInput', '早安');
  await page.touchscreen.tap(pt.x, pt.y);
  await settle();
  st = await state();
  assert.deepEqual(st.sent, ['早安']);
  assert.equal(st.fired, 1, 'one tap must fire exactly once, got ' + st.fired);
  assert.equal(st.active, 'msgInput');

  // 有字但沒收到 input 事件（某些輸入法、聽寫路徑）：鈕仍是 aria-disabled，點了照樣送
  await reset();
  await page.evaluate(() => {
    document.querySelector('#btnSend').setAttribute('aria-disabled', 'true');
    document.querySelector('#msgInput').value = '聽寫';
  });
  await page.touchscreen.tap(pt.x, pt.y);
  await settle();
  st = await state();
  assert.deepEqual(st.sent, ['聽寫'], 'stale disabled state must not swallow a send');

  // ③ 按下那一刻輸入列被擠走（鍵盤收起、提示列冒出來）
  await reset();
  await page.fill('#msgInput', '跑位');
  await page.evaluate(() => {
    const bar = document.querySelector('#sendForm');
    const shove = () => { bar.style.transform = 'translateY(-90px)'; };
    document.querySelector('#btnSend').addEventListener('pointerdown', shove, { once: true, capture: true });
  });
  await page.touchscreen.tap(pt.x, pt.y);
  await settle();
  await page.evaluate(() => { document.querySelector('#sendForm').style.transform = ''; });
  st = await state();
  assert.deepEqual(st.sent, ['跑位'], 'tap lost when the bar moved under the finger: ' + JSON.stringify(st));
  assert.equal(st.fired, 1);

  // ④ 瀏覽器沒有發 click 的觸控（手指微動、iOS 平移後取消點擊）
  //    觸控事件只有 touchstart／touchend，沒有 click —— 正是瀏覽器把點擊取消掉的樣子
  const synth = (steps) => page.evaluate((list) => {
    const btn = document.querySelector('#btnSend');
    const r = btn.getBoundingClientRect();
    const x0 = r.x + r.width / 2, y0 = r.y + r.height / 2;
    const fingers = new Map();
    return list.reduce((p, s) => p.then(() => new Promise((done) => setTimeout(() => {
      const id = s.id || 7;
      const touch = { identifier: id, clientX: x0 + (s.dx || 0), clientY: y0 + (s.dy || 0), target: btn };
      if (s.type === 'touchstart') fingers.set(id, touch); else fingers.delete(id);
      const ev = new Event(s.type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'changedTouches', { value: [touch] });
      Object.defineProperty(ev, 'touches', { value: [...fingers.values()] });
      btn.dispatchEvent(ev);
      done();
    }, s.wait || 0))), Promise.resolve());
  }, steps);

  await reset();
  await page.fill('#msgInput', '微動');
  await synth([{ type: 'touchstart' }, { type: 'touchend', dy: 14, wait: 120 }]);
  st = await state();
  assert.deepEqual(st.sent, ['微動'], 'jittery tap without click must still send');

  await reset();
  await page.fill('#msgInput', '長按');
  await synth([{ type: 'touchstart' }, { type: 'touchend', wait: 950 }]);
  await synth([{ type: 'touchstart' }, { type: 'touchcancel', wait: 50 }, { type: 'touchend', wait: 20 }]);
  await synth([{ type: 'touchstart' }, { type: 'touchend', dy: -60, wait: 80 }]);
  await synth([{ type: 'touchstart', id: 3 }, { type: 'touchend', id: 4, wait: 60 }]);
  await synth([{ type: 'touchstart', id: 3 }, { type: 'touchstart', id: 4, wait: 10 }, { type: 'touchend', id: 4, wait: 60 }, { type: 'touchend', id: 3, wait: 10 }]);
  st = await state();
  assert.deepEqual(st.sent, [], 'long press, cancel, swipe away, other finger and two-finger touches must not send');

  // 觸控送出後緊接的 click 被吞掉；之後的 click（滑鼠、螢幕閱讀器）照常送
  await reset();
  await page.fill('#msgInput', '一次');
  await synth([{ type: 'touchstart' }, { type: 'touchend', wait: 60 }]);
  await page.fill('#msgInput', '不該重送');
  await page.evaluate(() => document.querySelector('#btnSend').click());
  st = await state();
  assert.deepEqual(st.sent, ['一次'], 'the click that trails a touch send must be swallowed');
  await settle();
  await page.evaluate(() => document.querySelector('#btnSend').click());
  st = await state();
  assert.deepEqual(st.sent, ['一次', '不該重送'], 'a later click (mouse / screen reader) must send');

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: iPhone send button keeps focus when empty, sends once per tap, survives the bar moving and click-less jittery taps, ignores long press / cancel / swipe, and the Enter key says "enter" on touch.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
