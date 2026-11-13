import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { loveAskPhase, loveAskSeconds, LOVE_ASK_MS } from '../bubble-fx.js';

assert.equal(LOVE_ASK_MS, 60000);
const now = 1_000_000;
const ask = { id: 'a1', by: 'alice', t: now - 1000 };
assert.equal(loveAskPhase(ask, 'alice', now), 'caller');
assert.equal(loveAskPhase(ask, 'bob', now), 'recipient');
assert.equal(loveAskPhase({ ...ask, answer: 'o' }, 'alice', now), 'loved');
assert.equal(loveAskPhase({ ...ask, answer: 'o' }, 'bob', now), 'hearts');
assert.equal(loveAskPhase({ ...ask, answer: 'o' }, 'cara', now), 'hearts');
assert.equal(loveAskPhase({ ...ask, t: now - 60001 }, 'bob', now), 'off');
assert.equal(loveAskPhase({ ...ask, answer: 'x' }, 'bob', now), 'recipient');
assert.equal(loveAskPhase(null, 'bob', now), 'off');
assert.equal(loveAskSeconds(400), 1);
assert.equal(loveAskSeconds(0), 1);
assert.equal(loveAskSeconds(1499), 1);
assert.equal(loveAskSeconds(1500), 2);
assert.equal(loveAskSeconds(12800), 13);

const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const node = rules.rules.rooms.$roomId.loveAsk;
assert.equal(node.$other['.validate'], false);
assert.match(node['.validate'], /!newData\.exists\(\)/);
assert.match(node['.validate'], /hasChildren\(\['id','by','t'\]\)/);
assert.match(node.t['.validate'], /now \+ 60000/);
assert.match(node.answer['.validate'], /=== 'o'/);
assert.match(node.ms['.validate'], /newData.isNumber\(\)/);
assert.match(node.ms['.validate'], /<= 120000/);
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
assert.match(app, /playLoveHearts\("mine", ms\)/);
assert.match(app, /answer: "o", ms: wait/);
assert.doesNotMatch(html, /他說他愛你!!!!/);
assert.match(html, /id="loveCapsule"/);
assert.match(html, /等待回答…/);
assert.doesNotMatch(html, /waltz|華爾滋/);
assert.match(css, /\.c-love-o \{[^}]*animation: none/);
assert.match(css, /\.c-love-x \{[^}]*#3d5afe/);
assert.match(css, /\.c-love-big[\s\S]*inset: 0/);
assert.match(app, /loveAsk/);
assert.match(app, /LOVE_ASK_MS/);
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
