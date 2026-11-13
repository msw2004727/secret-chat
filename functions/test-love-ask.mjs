import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { loveAskPhase, loveAskView, loveAskBothAcked, loveAskSeconds } from '../bubble-fx.js';

const now = 1_000_000;
const ask = { id: 'a1', by: 'alice', t: now - 86_400_000 };
assert.equal(loveAskPhase(ask, 'alice'), 'caller');
assert.equal(loveAskPhase(ask, 'bob'), 'recipient');
assert.equal(loveAskPhase({ ...ask, t: now - 3_725_180 }, 'bob'), 'recipient');
const answered = { ...ask, answer: 'o', answeredAt: ask.t + 3_725_180, answeredBy: 'bob' };
assert.equal(loveAskPhase(answered, 'alice'), 'loved');
assert.equal(loveAskPhase(answered, 'bob'), 'mine');
assert.equal(loveAskPhase(answered, 'cara'), 'off');
assert.equal(loveAskPhase({ ...answered, ack: { alice: true } }, 'alice'), 'off');
assert.equal(loveAskPhase({ ...answered, ack: { alice: true } }, 'bob'), 'mine');
assert.equal(loveAskPhase({ ...answered, ack: { bob: true } }, 'alice'), 'loved');
assert.equal(loveAskPhase({ ...answered, ack: { alice: true, bob: true } }, 'bob'), 'off');
assert.equal(loveAskBothAcked({ ...answered, ack: { alice: true, bob: true } }), true);
assert.equal(loveAskBothAcked({ ...answered, ack: { alice: true } }), false);
assert.equal(loveAskView(answered, 'alice', false), 'play');
assert.equal(loveAskView(answered, 'bob', false), 'play');
assert.equal(loveAskView(answered, 'alice', true), 'final');
assert.equal(loveAskView(answered, 'bob', true), 'final');
assert.equal(loveAskView({ ...answered, ack: { alice: true } }, 'alice', false), 'off');
assert.equal(loveAskPhase(null, 'bob'), 'off');
assert.equal(loveAskSeconds({ t: 0, answeredAt: 3725180 }), "3725.18");
assert.equal(loveAskSeconds({ t: 1000, answeredAt: 4470, ms: 99999 }), "3.47");
assert.equal(loveAskSeconds({ t: 0, ms: 400 }), "0.40");
assert.equal(loveAskSeconds(0), "0.00");

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const node = rules.rules.rooms.$roomId.loveAsk;
assert.equal(node.$other['.validate'], false);
assert.match(node['.validate'], /!newData\.exists\(\)/);
assert.match(node['.validate'], /hasChildren\(\['id','by','t'\]\)/);
assert.match(node.t['.validate'], /now \+ 60000/);
assert.match(node.answer['.validate'], /=== 'o'/);
assert.match(node.ms['.validate'], /newData.isNumber\(\)/);
assert.match(node.answeredAt['.validate'], /newData.isNumber\(\)/);
assert.match(node.ack.$uid['.validate'], /=== true/);
const ctx = {
  now,
  newData: {
    exists: () => true,
    hasChildren: (keys) => keys.every((k) => ['id', 'by', 't'].includes(k)),
  },
};
assert.equal(vm.runInNewContext(node['.validate'], ctx), true);
ctx.newData = { exists: () => false, hasChildren: () => false };
assert.equal(vm.runInNewContext(node['.validate'], ctx), true);
const answer = { newData: { isString: () => true, val: () => 'o' } };
assert.equal(vm.runInNewContext(node.answer['.validate'], answer), true);
answer.newData.val = () => 'x';
assert.equal(vm.runInNewContext(node.answer['.validate'], answer), false);

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const callBtn = html.indexOf('id="zooCall"');
const loveBtn = html.indexOf('id="zooLove"');
assert.ok(callBtn > 0 && loveBtn > callBtn);
assert.equal((html.match(/敬請期待/g) || []).length, 2);
assert.match(html.slice(loveBtn, loveBtn + 400), /愛我嗎\?/);
assert.match(html, /id="loveCard"/);
assert.match(html, /你愛我嗎？/);
assert.match(app, /他" \+ sec \+ "秒說他愛你啦!!!/);
assert.match(app, /我" \+ sec \+ "秒才回覆他"/);
assert.match(app, /answeredAt: serverTimestamp\(\)/);
assert.match(app, /id="loveOk"|loveOk/);
assert.doesNotMatch(html, /他說他愛你!!!!/);
assert.match(html, /id="loveCapsule"/);
assert.match(html, /等待回答…/);
assert.doesNotMatch(html, /waltz|華爾滋/);
assert.match(css, /\.c-love-o \{[^}]*animation: none/);
assert.match(css, /\.c-love-x \{[^}]*#3d5afe/);
assert.match(css, /\.c-love-ok \{[^}]*#ff2d55/);
assert.match(html, /id="loveOk"/);
assert.match(app, /loveAsk/);
assert.doesNotMatch(app, /LOVE_ASK_MS/);
assert.match(app, /answer: "o"/);
assert.match(html, /<canvas class="c-love-hearts" id="loveHearts">/);
assert.match(app, /function loveHeartField/);
assert.match(app, /function drawLoveHeart/);
assert.doesNotMatch(app, /const goal = 220/);
assert.match(app, /function dodgeLoveX/);
assert.match(app, /function pickLoveSpot/);
assert.doesNotMatch(app, /waltz|o-jelly|classList\.add\("bounce"\)/);
const zoo = app.slice(app.indexOf("function bindZoo"), app.indexOf("\nbindZoo();"));
assert.match(zoo, /zooLove/);
assert.doesNotMatch(zoo, /localStorage\.setItem/);

console.log('PASS: love ask phase, rules, card, capsule, hearts text, fixed O.');
