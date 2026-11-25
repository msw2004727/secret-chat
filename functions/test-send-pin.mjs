import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createFollowController } from '../scroll-follow.js';

/* 打字送出後畫面要貼著最底（v62.23）。
   站長回報：送出後自己的訊息沒有出現在最底。根因：打多行字時輸入框長高、把訊息區擠矮，
   變矮不會觸發 scroll 事件，送出那一刻離底部已經差了幾十 px，appendMsg 判成「不在底部」就不捲。
   ① 自己這台裝置剛送的訊息一律捲到最底；別台裝置送的、或人往上翻過時，照舊不拉人。
   ② 訊息區變矮時，本來跟著最新的人繼續貼底。
   ⚠️ 全部是假的捲動區與假訊息，不碰資料庫。 */

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const between = (a, b) => {
  const i = app.indexOf(a), j = app.indexOf(b, i);
  assert.ok(i >= 0 && j > i, 'missing source block ' + a);
  return app.slice(i, j);
};

/* 假的捲動區：scrollTop 會被夾在 0 ～ scrollHeight - clientHeight 之間，跟瀏覽器一樣。 */
function fakeScroller(contentH, viewH) {
  const sc = { _top: 0, scrollHeight: contentH, clientHeight: viewH };
  Object.defineProperty(sc, 'scrollTop', {
    get() { return this._top; },
    set(v) { this._top = Math.max(0, Math.min(v, this.scrollHeight - this.clientHeight)); },
  });
  sc.scrollTop = 1e9;
  return sc;
}
const gap = (sc) => sc.scrollHeight - sc.scrollTop - sc.clientHeight;

/* ---------- ① appendMsg ---------- */
const appendSrc = between('function appendMsg(m) {', '\n}\n') + '\n}';
function runAppend({ own, recent = true, scrolledUp = false }) {
  const sc = fakeScroller(2000, 500);
  const follow = createFollowController();
  follow.reset(sc);
  if (scrolledUp) { sc.scrollTop = 1200; follow.noteScroll(sc); }
  /* 輸入框打到第四行：訊息區變矮 60px，沒有 scroll 事件 */
  sc.clientHeight -= 60;
  const list = { appendChild() { sc.scrollHeight += 64; } };
  const nodes = { scroller: sc, msgList: list, emptyState: { hidden: false } };
  const S = { clientId: 'me', msgs: [{ k: 'a1' }], oldestKey: 'a1', pinOwnUntil: recent ? Date.now() + 5000 : 0 };
  const ctx = vm.createContext({
    $: (id) => nodes[id], follow, S, Date,
    rowEl: () => ({}), renderAll() {}, renderReadMark() {}, paintSendState() {}, paintJump() {}, paintLoadMore() {},
    paintReactions() {}, tryMarkRecv() {}, tryMarkRead() {}, Love: { maybeBurst() {} },
    requestAnimationFrame: (fn) => fn(),
  });
  vm.runInContext(appendSrc, ctx);
  ctx.appendMsg({ k: 'b2', s: own ? 'me' : 'other' });
  return { sc, follow };
}
{
  const { sc, follow } = runAppend({ own: true });
  assert.ok(gap(sc) <= 0.5, 'my own message lands at the very bottom, gap ' + gap(sc));
  assert.equal(follow.isFollowing(), true);
}
{
  const { sc } = runAppend({ own: true, scrolledUp: true });
  assert.ok(gap(sc) <= 0.5, 'sending jumps to the bottom even after reading history, gap ' + gap(sc));
}
{
  const { sc } = runAppend({ own: false, scrolledUp: true });
  assert.ok(gap(sc) > 100, 'someone else\'s message does not drag a reader down');
}
{
  const { sc } = runAppend({ own: true, recent: false, scrolledUp: true });
  assert.ok(gap(sc) > 100, 'an old message of mine sliding into the window does not drag me down');
}

/* ---------- ② 訊息區變矮時繼續貼底 ---------- */
const roSrc = between('  if (typeof ResizeObserver === "function") {\n    let lastH = sc.clientHeight;', '.observe(sc);\n  }') + '.observe(sc);\n  }';
function runResize({ scrolledUp }) {
  const sc = fakeScroller(2000, 500);
  const follow = createFollowController();
  follow.reset(sc);
  if (scrolledUp) { sc.scrollTop = 1200; follow.noteScroll(sc); }
  let cb = null;
  const ctx = vm.createContext({
    sc, follow, $: () => ({ hidden: false }),
    ResizeObserver: class { constructor(fn) { cb = fn; } observe() {} },
  });
  vm.runInContext(roSrc, ctx);
  sc.clientHeight -= 60;      // 輸入框長高
  cb();
  return sc;
}
assert.ok(gap(runResize({ scrolledUp: false })) <= 0.5, 'a growing input box keeps the newest message in view');
assert.ok(gap(runResize({ scrolledUp: true })) > 100, 'a reader scrolled up is left alone');

assert.match(app, /S\.pinOwnUntil = Date\.now\(\) \+ 8000;/, 'every send path marks the pin window');
console.log('PASS: after sending, my own message sits at the bottom; the list also stays pinned when the input box grows, without dragging readers down.');
