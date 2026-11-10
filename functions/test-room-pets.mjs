import fs from 'node:fs';
import assert from 'node:assert/strict';

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

assert.match(pets, /FIGHT_COOLDOWN = 25000/);
assert.match(pets, /fight: fightOK\(now\) \? 5 : 0/);
assert.match(pets, /fight: s\.fromFight \|\| !fightOK\(now\) \? 0 : 7/);
assert.match(pets, /S = \(areaW >= 360 \? 3 : 2\) \* 0\.85/);
assert.match(pets, /f\.side = anim === "walk" \|\| anim === "run" \|\| anim === "jump"/);
assert.match(pets, /if \(cat\.dir !== d0 && MOVE_TYPES\[a\.type\]\) cat\.turnUntil = now \+ 150/);
assert.match(pets, /if \(underBubble\(cx, cy\)\) return false/);
assert.match(pets, /quadraticCurveTo/);
assert.doesNotMatch(pets.slice(pets.indexOf('function bubblePath'), pets.indexOf('function bubbleShapes')), /ellipse|arc\(/);
assert.match(pets, /borderTopLeftRadius/);
assert.match(pets, /Math\.abs\(cats\[0\]\.x - cats\[1\]\.x\) < W \* S \* 0\.7/);
assert.match(pets, /cats\[f\]\.el\.style\.zIndex = "2"/);
assert.doesNotMatch(pets, /firebase|database|websocket/i);
assert.doesNotMatch(app + html + css + perf, /pixel-?cat|像素貓/i);
assert.match(perf, /function traceBubble/);
assert.match(app, /owns = !!Shatter\.play\(row\)/);
assert.match(app, /Shatter\.playAll\(\)/);

console.log('PASS: message bubbles stay 18/6 rounded rects; cat mood bubble is a 30px circle; pets stay local and behind bubbles.');
