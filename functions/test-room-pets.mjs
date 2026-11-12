import fs from 'node:fs';
import assert from 'node:assert/strict';
import { decodeQuokkaGif, quokkaFrame, quokkaMirror, QUOKKA_CSS_AT_REF } from '../quokka-gif.js';
import { Bobo } from '../bobo.js';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const pets = fs.readFileSync(new URL('../room-pets.js', import.meta.url), 'utf8');
const perf = fs.readFileSync(new URL('../chat-performance.js', import.meta.url), 'utf8');

const bub = css.slice(css.indexOf('/* --- 氣泡 --- */'), css.indexOf('.bub .time'));
assert.match(bub, /\.bub \{[\s\S]*border-radius: 18px;/);
assert.match(bub, /\.me\s+\.bub \{[^}]*border-bottom-right-radius: 6px;/);
assert.match(bub, /\.you \.bub \{[^}]*border-bottom-left-radius: 6px;/);
assert.doesNotMatch(bub, /border-radius:\s*50%/);
assert.doesNotMatch(bub, /ellipse|border-radius:\s*999px/);

const mood = css.slice(css.indexOf('.cat-bubble {'), css.indexOf('.cat-bubble.show'));
assert.match(mood, /width: 30px;/);
assert.match(mood, /height: 30px;/);
assert.match(mood, /border-radius: 50%;/);
assert.match(mood, /align-items: center;/);
assert.match(mood, /justify-content: center;/);
assert.match(css, /\.cat-bubble::after \{[\s\S]*bottom: -5px;/);
assert.equal((html.match(/id="cats"/g) || []).length, 1);
assert.equal((html.match(/id="shatterFx"/g) || []).length, 1);
assert.match(app, /import\("\.\/room-pets\.js"\)/);
assert.match(css, /\.bub > canvas\.bub-shade \{[\s\S]*pointer-events: none;/);
assert.match(css, /#cats \{[\s\S]*z-index: 0;/);
assert.match(css, /\.c-scroll \{[\s\S]*z-index: 1;/);

assert.match(pets, /FIGHT_COOLDOWN = 45000/);
assert.match(pets, /fight: fightOK\(now\) \? 3 : 0/);
assert.match(pets, /fight: s\.fromFight \|\| !fightOK\(now\) \? 0 : 7/);
assert.match(pets, /love: 12/);
assert.match(pets, /climb: grayDown \? 22 : 6/);
assert.match(pets, /function startClimb/);
assert.match(pets, /function climbStep/);
assert.match(pets, /climb: \(o\) =>/);
assert.match(pets, /kind: "climb"/);
const real = fs.readFileSync(new URL('../real-cats.js', import.meta.url), 'utf8');
assert.match(real, /case "lie": return liePose/);
assert.match(real, /case "rear": return rearPose/);
assert.match(real, /CLIMB = \{ backX/);
assert.match(real, /chestX/);
assert.match(real, /plantShift/);
assert.match(real, /hipAmp/);
assert.match(real, /hipHz/);
assert.match(real, /function hipSwayPose/);
assert.match(pets, /rearHipSway/);
assert.match(pets, /act.hipSway/);
assert.match(real, /restPaw/);

assert.match(pets, /nextSocialAt = now \+ rand\(7000, 14000\)/);
assert.match(pets, /nextBiteAt = now0 \+ rand\(7000, 12000\)/);
assert.match(pets, /Math\.random\(\) < 0\.45/);
assert.match(pets, /cats\.some\(\(o\) => o !== c && biteBusy\(o\)\)/);
assert.match(pets, /cat\.stillMs > 380/);
assert.match(pets, /function resetJelly/);
assert.match(pets, /j\.el\.classList\.remove\("jelly"\)/);
assert.doesNotMatch(pets.slice(pets.indexOf('function resetJelly'), pets.indexOf('function warpPt')), /style\.transform|style\.width|style\.height/);
assert.match(pets, /S = \(areaW >= 360 \? 3 : 2\) \* 0\.85/);
assert.match(pets, /f\.side = anim === "walk" \|\| anim === "run" \|\| anim === "jump"/);
assert.match(pets, /if \(cat\.dir !== d0 && MOVE_TYPES\[a\.type\]\) cat\.turnUntil = now \+ 150/);
assert.match(pets, /if \(underBubble\(cx, cy\)\) return false/);
assert.match(pets, /quadraticCurveTo/);
assert.doesNotMatch(pets.slice(pets.indexOf('function bubblePath'), pets.indexOf('function bubbleShapes')), /ellipse|arc\(/);
assert.match(pets, /borderTopLeftRadius/);
assert.match(pets, /Math\.abs\(cats\[0\]\.x - cats\[1\]\.x\) < W \* S \* 0\.7/);
assert.match(pets, /cats\[f\]\.el\.style\.zIndex = "3"/);
assert.match(pets, /function parkBall\(\)/);
assert.match(pets, /scrollEl\.scrollHeight - scrollEl\.scrollTop - scrollEl\.clientHeight/);
assert.match(pets, /sr\.bottom \+ slack/);
assert.match(pets, /import \{ attachRooster \} from "\.\/rooster-room\.js"/);
assert.match(pets, /roosterApi\.step\(now\)/);
assert.match(pets, /roosterApi\.shift\(dy\)/);
const rooster = fs.readFileSync(new URL('../rooster.js', import.meta.url), 'utf8');
const room = fs.readFileSync(new URL('../rooster-room.js', import.meta.url), 'utf8');
for (const act of ["idle", "walk", "peck", "crow", "flap", "scratch", "tap"]) {
  assert.match(rooster, new RegExp('action === "' + act + '"'));
}
assert.match(rooster, /黑羽土雞/);
assert.match(room, /咕咕/);
assert.match(room, /roam: true/);
assert.match(room, /enabled\(\)/);
assert.doesNotMatch(rooster + room, /firebase|database|websocket/i);
assert.match(pets, /import \{ attachBobo \} from "\.\/bobo-room\.js"/);
assert.match(pets, /boboApi\.step\(now\)/);
assert.match(pets, /boboApi\.shift\(dy\)/);
assert.match(pets, /if \(boboApi\) boboApi\.hide\(\)/);
const bobo = fs.readFileSync(new URL('../bobo.js', import.meta.url), 'utf8');
const boboRoom = fs.readFileSync(new URL('../bobo-room.js', import.meta.url), 'utf8');
for (const act of ["idle", "walk", "wave", "jump", "sit", "blink", "tap"]) {
  assert.match(bobo, new RegExp('action === "' + act + '"'));
}
assert.match(bobo, /standH: H/);
assert.match(bobo, /sizeRatio: 2 \/ 3/);
assert.match(bobo, /addBodyPath/);
assert.match(boboRoom, /acc: "none"/);
assert.match(boboRoom, /heightToComb \* Rooster\.STATS\.roosterBody\.drawScale/);
assert.match(boboRoom, /\(2 \/ 3\)/);
assert.match(boboRoom, /enabled\(\)/);
assert.match(boboRoom, /bobo-heart/);
assert.match(boboRoom, /roam: true/);
assert.doesNotMatch(bobo + boboRoom, /firebase|database|websocket/i);
assert.match(css, /\.bobo \{[\s\S]*bottom: 0;/);
assert.match(css, /\.bobo \{[\s\S]*pointer-events: none;/);
assert.match(css, /\.bobo \{[\s\S]*z-index: 2;/);
assert.match(bobo, /const W = 26, H = 24, FY = 24/);
assert.match(bobo, /acc: opts\.acc \|\| "none"/);
assert.match(rooster, /heightToComb: 11\.4/);
assert.match(rooster, /drawScale: 1\.12/);
const worldS = 3 * 0.85;
const roosterPx = 11.4 * 1.12 * worldS;
const boboPx = roosterPx * (2 / 3);
assert.ok(Math.abs(roosterPx - 32.6) < 0.15, String(roosterPx));
assert.ok(Math.abs(boboPx - 21.7) < 0.15, String(boboPx));
assert.match(pets, /import \{ attachQuokka \} from "\.\/quokka-room\.js"/);
assert.match(pets, /quokkaApi\.step\(now\)/);
assert.match(pets, /quokkaApi\.shift\(dy\)/);
assert.match(pets, /if \(quokkaApi\) quokkaApi\.hide\(\)/);
const quokkaRoom = fs.readFileSync(new URL('../quokka-room.js', import.meta.url), 'utf8');
const quokkaGif = fs.readFileSync(new URL('../quokka.gif', import.meta.url));
assert.ok(quokkaGif.length < 60 * 1024, "quokka.gif " + quokkaGif.length);
assert.match(quokkaRoom, /quokkaMirror\(dir\)/);
assert.match(quokkaRoom, /scale\(-1, 1\)/);
assert.equal(quokkaMirror(1), false);
assert.equal(quokkaMirror(-1), true);
assert.match(quokkaRoom, /enabled\(\)/);
assert.doesNotMatch(quokkaRoom, /firebase|database|websocket/i);
assert.match(css, /\.quokka \{[\s\S]*overflow: visible;/);
assert.match(css, /\.quokka \{[\s\S]*pointer-events: none;/);
assert.match(css, /\.quokka \{[\s\S]*z-index: 2;/);
const gif = decodeQuokkaGif(quokkaGif);
assert.equal(gif.frames.length, 7);
assert.equal(gif.width, 54);
assert.equal(gif.height, 78);
let clear = 0, brown = 0;
const px = gif.frames[0];
for (let i = 0; i < px.length; i += 4) {
  if (px[i + 3] === 0) clear++;
  else if (px[i] > 140 && px[i + 1] > 80 && px[i + 2] < 140) brown++;
}
assert.ok(clear > 100, "transparent pixels");
assert.ok(brown > 100, "quokka body pixels");
assert.equal(quokkaFrame(false, 5000, 0, 7), 0);
assert.equal(quokkaFrame(true, 250, 0, 7), 2);
let noseX = 0, noseN = 0, bodyMin = gif.width, bodyMax = 0;
for (let y = 18; y <= 34; y++) for (let x = 0; x < gif.width; x++) {
  const i = (y * gif.width + x) * 4;
  const a = px[i + 3], r = px[i], g = px[i + 1], b = px[i + 2];
  if (a > 40 && r < 90 && g < 80 && b < 80) { noseX += x; noseN++; }
}
for (let i = 0; i < px.length; i += 4) {
  if (px[i + 3] <= 40) continue;
  const x = (i / 4) % gif.width;
  if (x < bodyMin) bodyMin = x;
  if (x > bodyMax) bodyMax = x;
}
const noseMean = noseX / noseN;
const bodyCenter = (bodyMin + bodyMax) / 2;
assert.ok(noseMean > bodyCenter, "native snout is on the viewer's right");
assert.equal(quokkaMirror(1), noseMean < bodyCenter, "moving right keeps the native facing");
assert.equal(quokkaMirror(-1), noseMean > bodyCenter, "moving left mirrors so the snout leads");
assert.equal(QUOKKA_CSS_AT_REF, 26);
const quokkaPx = QUOKKA_CSS_AT_REF;
assert.ok(quokkaPx > boboPx && quokkaPx < roosterPx);
assert.match(bobo, /scale\(-1,\s*1\)/);
assert.match(boboRoom, /Bobo\.viewBox\(pose\)/);
const actions = ["idle", "walk", "wave", "jump", "sit", "blink", "tap"];
const accessories = ["none", "bucket", "santa"];
for (const action of actions) for (const acc of accessories) for (const dir of [-1, 1]) {
  for (let i = 0; i <= 8; i++) {
    const pose = Bobo.makePose(action, i / 8, { time: i * 500, dir, acc });
    const ink = Bobo.inkBox(pose);
    const view = Bobo.viewBox(pose);
    assert.ok(ink.x0 >= view.x0 - 1e-6 && ink.x1 <= view.x1 + 1e-6 && ink.y0 >= view.y0 - 1e-6 && ink.y1 <= view.y1 + 1e-6, action + " " + acc + " " + dir);
  }
}
const jumpInk = Bobo.inkBox(Bobo.makePose("jump", 0.44, { time: 0, dir: -1, acc: "none" }));
assert.ok(jumpInk.y0 < 0, "jump lifts the head out of the old 24-tall canvas");
assert.ok(Bobo.inkBox(Bobo.makePose("idle", 0, { time: 0, dir: -1, acc: "santa" })).y0 < 0);
assert.ok(Bobo.inkBox(Bobo.makePose("jump", 0.44, { time: 0, dir: 1, acc: "bucket" })).y0 < 0);
for (const action of ["idle", "walk", "wave", "jump", "sit", "blink", "tap"]) {
  for (const acc of accessories) {
    const left = Bobo.inkBox(Bobo.makePose(action, 0.3, { time: 1000, dir: -1, acc }));
    const right = Bobo.inkBox(Bobo.makePose(action, 0.3, { time: 1000, dir: 1, acc }));
    assert.ok(Math.abs(right.x0 - (Bobo.W - left.x1)) < 1e-4, action + " " + acc + " x0");
    assert.ok(Math.abs(right.x1 - (Bobo.W - left.x0)) < 1e-4, action + " " + acc + " x1");
    assert.ok(Math.abs(right.y0 - left.y0) < 1e-4 && Math.abs(right.y1 - left.y1) < 1e-4, action + " " + acc + " y");
  }
}
assert.match(pets, /ball\.state === "carried" && ball\.carrier \? ball\.carrier\.el : layer/);
assert.match(pets, /tx -= carrier\.x/);
assert.match(pets, /ty \+= H \* S/);
assert.match(css, /\.cat-front \{[\s\S]*z-index: 3;/);
assert.match(css, /\.c-bar \{[^}]*z-index: 8;/);
assert.match(css, /\.c-input \{[^}]*z-index: 8;/);
assert.match(css, /\.bub\.jelly \{[^}]*background: transparent/);
assert.match(css, /\.pet-warp \{[\s\S]*pointer-events: none;/);
assert.match(css, /\.bub-warp \{[^}]*position: absolute;/);
assert.match(pets, /warpLayer\.appendChild\(cv\)/);
assert.match(perf, /bub-shatter/);
assert.doesNotMatch(pets, /firebase|database|websocket/i);
assert.doesNotMatch(app + html + css + perf, /pixel-?cat|像素貓/i);
assert.match(perf, /function traceBubble/);
assert.match(app, /owns = !!Shatter\.play\(row\)/);
assert.match(pets, /gray: \["小麥我愛你~喵", "小麥摸摸我~喵", "肚子餓了~喵", "想睡覺了~喵"\]/);
assert.match(pets, /brown: \["辛巴我愛妳~喵", "辛巴抱抱~喵", "陪我玩球~喵", "今天也很可愛~喵"\]/);
assert.match(pets, /lines\.filter\(\(t\) => t !== cat\.lastTalk\)/);
assert.match(pets, /const TALK_MS = 3000/);
assert.doesNotMatch(pets, /小麥我愛妳/);

console.log('PASS: message bubbles stay 18/6 rounded rects; cat mood bubble is a 30px circle; pets stay local and behind bubbles.');
