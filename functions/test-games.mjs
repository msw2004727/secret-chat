import fs from "node:fs";
import assert from "node:assert/strict";
import {
  pointedSelf, personAt, planSpin, winnerOf, applyMove, addWin, viewWins,
  createOoxx, acceptInvite, needsOoxxPlan, withOoxxPlan,
  askRematch, agreeRematch, rebuffRematch, dismissRebuff,
  createWheel, withWheelPlan, canReplace, enterPlay, finishWheel, forceEnd, otherSide, wedgeLabel,
  resultKey, revealEnded, readSeen, writeSeen, mountGames, sealNudge,
  pendingAsk, pendingRebuff, spinFrame, SPIN_MS, WIND_MS, fateResult,
} from "../games.js";

assert.deepEqual(sealNudge(10, 20, 1), { x: 0, y: 0 });
const one = sealNudge(10.4, 20.8, 1);
assert.ok(Math.abs(one.x + 0.4) < 1e-9);
assert.ok(Math.abs(one.y - 0.2) < 1e-9);
const hi = sealNudge(10.3, 8.2, 2);
assert.ok(Math.abs((10.3 + hi.x) * 2 - Math.round((10.3 + hi.x) * 2)) < 1e-9);
assert.ok(Math.abs((8.2 + hi.y) * 2 - Math.round((8.2 + hi.y) * 2)) < 1e-9);
const d3 = sealNudge(4.2, 9.1, 3);
assert.ok(Math.abs((4.2 + d3.x) * 3 - Math.round((4.2 + d3.x) * 3)) < 1e-9);
assert.equal(pointedSelf(0), true);
assert.equal(pointedSelf(180), false);
assert.equal(personAt(1800, "m"), "m");
assert.equal(personAt(1812, "m"), "f");
assert.equal(personAt(1788, "m"), "m");

const edge = planSpin(() => 0.01);
assert.equal(edge.mode, "edge");
assert.equal(Math.abs((edge.final - edge.base) % 360), 12);
const wind = planSpin(() => 0.1);
assert.equal(wind.mode, "wind");
assert.ok(wind.final > wind.base);
const calm = planSpin(() => 0.5);
assert.equal(calm.mode, "none");
assert.equal(calm.final, calm.base);

assert.equal(winnerOf("mmm......"), "m");
assert.equal(winnerOf("fff......"), "f");
assert.equal(winnerOf("mfmffmmmf"), "");

const invite = createOoxx("m", "g1", 1000);
assert.equal(invite.phase, "invite");
assert.equal(acceptInvite(invite, "m"), undefined);
const accepted = acceptInvite(invite, "f");
assert.equal(accepted.ok, true);
assert.equal(needsOoxxPlan(accepted, "m"), true);
const planned = withOoxxPlan(accepted, { mode: "none", base: 1800, final: 1800 });
assert.equal(planned.phase, "wheel");
assert.equal(planned.first, "m");
assert.equal(planned.turn, "m");

let board = applyMove(planned, "m", 0);
board = applyMove(board, "f", 3);
board = applyMove(board, "m", 1);
board = applyMove(board, "f", 4);
board = applyMove(board, "m", 2);
assert.equal(board.phase, "over");
assert.equal(board.winner, "m");
assert.equal(applyMove(board, "f", 5), undefined);

const drawCells = applyMove({
  ...planned, phase: "play", turn: "f", cells: "mfmffmmm.",
}, "f", 8);
assert.equal(drawCells.cells, "mfmffmmmf");
assert.equal(drawCells.winner, "");
assert.equal(drawCells.draw, true);
assert.equal(drawCells.phase, "over");

assert.deepEqual(addWin(null, "m"), { m: 1, f: 0 });
assert.deepEqual(addWin({ m: 1, f: 2 }, "f"), { m: 1, f: 3 });
assert.equal(addWin({ m: 1, f: 0, id: "g1" }, "m", "g1"), undefined);
assert.deepEqual(addWin({ m: 1, f: 0, id: "g1" }, "f", "g2"), { m: 1, f: 1, id: "g2" });
const windPlan = { spin: 1800, fin: 2500, mode: "wind" };
const at = spinFrame(windPlan, 5000, 5000 + SPIN_MS + 400);
assert.equal(spinFrame(windPlan, 5000, 5000 + SPIN_MS + 400).angle, at.angle);
assert.equal(at.gust, true);
assert.equal(at.done, false);
assert.equal(spinFrame(windPlan, 5000, 5000 + SPIN_MS + WIND_MS).done, true);
assert.equal(pendingAsk({ phase: "rematch", rematchBy: "m" }, { phase: "rematch", rematchBy: "m" }, "f"), "ooxx");
assert.equal(pendingAsk({ phase: "play", rematchBy: "" }, { phase: "rematch", rematchBy: "m" }, "f"), "wheel");
assert.equal(pendingRebuff({ phase: "rebuff", rematchBy: "f" }, { phase: "rebuff", rematchBy: "m" }, "f"), "ooxx");
const landed = { self: "小麥", other: "小辛", fin: 1800 };
assert.equal(fateResult(landed).custom, true);
assert.equal(fateResult(landed).text, "小麥");
assert.equal(fateResult({ ...landed, fin: 180 }).text, "小辛");
assert.equal(fateResult({ self: "自己", other: "對方", fin: 1800 }).custom, false);
assert.equal(fateResult({ fin: 180 }).text, "");
assert.deepEqual(viewWins(null), { m: 0, f: 0 });

const asked = askRematch(board, "f", "ooxx");
assert.equal(asked.phase, "rematch");
assert.equal(agreeRematch(asked, "f", "ooxx"), undefined);
const ready = agreeRematch(asked, "m", "ooxx", 5000);
assert.equal(ready.phase, "ready");
assert.equal(ready.spin, 0);
assert.equal(ready.cells, ".........");
assert.equal(ready.winner, "");
const again = withOoxxPlan(ready, { mode: "none", base: 2100, final: 2140 }, 5000);
assert.equal(again.phase, "wheel");
assert.equal(again.cells, ".........");
assert.equal(again.winner, "");
assert.equal(again.turn, again.first);
assert.equal(again.first, personAt(2140, "f"));
const playing = enterPlay(again);
assert.equal(playing.phase, "play");
assert.equal(playing.winner, "");
assert.equal(enterPlay(playing), undefined);
const moved = applyMove(playing, playing.turn, 0);
assert.equal(moved.phase, "play");
const second = withOoxxPlan(agreeRematch(askRematch({ ...moved, phase: "over", winner: moved.turn }, otherSide(moved.turn), "ooxx"), moved.turn, "ooxx"), { mode: "wind", base: 1800, final: 2500 }, 9000);
assert.equal(second.phase, "wheel");
assert.equal(second.cells, ".........");
assert.notEqual(second.spin, again.spin);
assert.equal(forceEnd(playing, "ooxx"), null);
assert.equal(forceEnd(again, "ooxx"), null);
assert.equal(forceEnd({ ...playing, phase: "over", winner: "m" }, "ooxx"), undefined);
assert.equal(canReplace(null, "", 0), true);
assert.equal(canReplace(playing, "", playing.t + 1000), false);
assert.equal(canReplace({ ...playing, phase: "over" }, "", playing.t), true);
assert.equal(canReplace(playing, playing.id, playing.t), true);
assert.equal(canReplace(playing, "", playing.t + 31 * 60 * 1000), true);
const no = rebuffRematch(asked, "m", "ooxx");
assert.equal(no.phase, "rebuff");
assert.equal(dismissRebuff(no, "f", "ooxx").phase, "over");

assert.equal(wedgeLabel("  ", "自己"), "自己");
assert.equal(wedgeLabel("一二三四五六七", "自己"), "一二三四五六");
assert.equal(wedgeLabel(null, "對方"), "對方");
const topic = createWheel("m", "w1", "誰是笨蛋", 1000, "小麥", "  ");
assert.equal(topic.self, "小麥");
assert.equal(topic.other, "對方");
const named = createWheel("m", "w1", "誰是笨蛋", 1000, "小麥", "小辛");
const spun = withWheelPlan({ ...named, ok: true }, { mode: "edge", base: 1980, final: 1992 });
assert.equal(spun.target, personAt(1992, "m"));
assert.equal(spun.topic, "誰是笨蛋");
assert.equal(spun.self, "小麥");
assert.equal(spun.other, "小辛");
const fateReady = agreeRematch(askRematch({ ...spun, phase: "over" }, "m", "wheel"), "f", "wheel", 8000);
assert.equal(fateReady.phase, "ready");
assert.equal(fateReady.topic, "誰是笨蛋");
assert.equal(fateReady.self, "小麥");
assert.equal(fateReady.other, "小辛");
const fateAgain = withWheelPlan(fateReady, { mode: "none", base: 1800, final: 1800 }, 8000);
assert.equal(fateAgain.phase, "wheel");
assert.equal(fateAgain.self, "小麥");
assert.equal(fateAgain.other, "小辛");
assert.equal(finishWheel(fateAgain).self, "小麥");
assert.equal(finishWheel(fateAgain).phase, "over");
assert.equal(forceEnd(fateAgain, "wheel"), null);

const ended = finishWheel(fateAgain);
const watching = { ...fateAgain };
assert.equal(revealEnded(null, ended, false, ""), false);
assert.equal(revealEnded(watching, ended, false, ""), true);
assert.equal(revealEnded(ended, ended, false, ""), false);
assert.equal(revealEnded(watching, ended, true, ""), false);
assert.equal(revealEnded(ended, ended, false, resultKey(ended)), true);
assert.equal(revealEnded({ ...watching, stale: true }, ended, false, ""), false);
const replay = withWheelPlan(fateReady, { mode: "none", base: 1900, final: 1900 }, 12000);
assert.notEqual(resultKey(finishWheel(replay)), resultKey(ended));
const ooxxOver = { ...playing, phase: "over", winner: "m" };
assert.equal(revealEnded(null, ooxxOver, false, ""), false);
assert.equal(revealEnded(playing, ooxxOver, false, ""), true);
const mem = {
  m: new Map(),
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; },
  setItem(k, v) { this.m.set(k, v); },
};
writeSeen(mem, "room", new Set([resultKey(ended), resultKey(ooxxOver)]));
const saved = readSeen(mem, "room");
assert.equal(saved.has(resultKey(ended)), true);
assert.equal(saved.has(resultKey(ooxxOver)), true);
assert.equal(readSeen(mem, "other").size, 0);

const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
const room = rules.rules.rooms.$roomId;
assert.equal(room.games.$other[".validate"], false);
assert.equal(room.games[".read"], room.games[".write"]);
assert.match(room.games[".read"], /acl\/' \+ \$roomId \+ '\/ok\//);
assert.equal(room.ooxxWins.$other[".validate"], false);
assert.match(room.games.ooxx.cells[".validate"], /\[mf\.\]/);
assert.match(room.games.wheel.topic[".validate"], /length <= 24/);
assert.match(room.games.wheel[".validate"], /hasChildren\(\['id','by','phase','topic','t','self','other'\]\)/);
assert.match(room.games.wheel.self[".validate"], /isString\(\) && newData\.val\(\)\.length > 0 && newData\.val\(\)\.length <= 6/);
assert.match(room.games.wheel.other[".validate"], /isString\(\) && newData\.val\(\)\.length > 0 && newData\.val\(\)\.length <= 6/);
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
assert.equal((html.match(/敬請期待/g) || []).length, 0);
assert.match(html, /id="zooOoxx"/);
assert.match(html, /id="zooFate"/);
assert.match(html, /id="winsM">0/);
assert.match(html, /id="winsF">0/);
assert.doesNotMatch(html, /強制起風|強制邊緣抖動|對方自動|以麥視角/);
const games = fs.readFileSync(new URL("../games.js", import.meta.url), "utf8");
assert.match(games, /rooms\/\$\{roomId\}\/games\/ooxx/);
assert.match(games, /rooms\/\$\{roomId\}\/ooxxWins/);
assert.match(app, /mountGames/);
assert.match(app, /const APP_VERSION = "v61\.99"/);
assert.match(html, /id="gxAskClose"/);
assert.match(css, /\.c-gx-x \{[^}]*width:\s*44px/);
assert.match(css, /\.c-gx-x \{[^}]*top:\s*8px/);
assert.match(css, /\.c-gx \{[^}]*z-index:\s*80/);
assert.match(css, /\.c-love-card \{[^}]*z-index:\s*40/);
const askClose = games.slice(games.indexOf('gxAskClose'), games.indexOf('gxAskClose') + 220);
assert.match(askClose, /veil\(ask, false\)/);
assert.doesNotMatch(askClose, /createWheel|tx\(/);
const pair = html.slice(html.indexOf('id="pairLoc"'), html.indexOf('id="btnHeart"'));
const sealAt = (id) => pair.indexOf(id);
assert.ok(sealAt('id="sealM"') < sealAt('id="pairM"') && sealAt('id="pairM"') < sealAt('id="pairF"') && sealAt('id="pairF"') < sealAt('id="sealF"'));
assert.match(pair.slice(sealAt('id="sealM"'), sealAt('id="pairM"')), /<b>×<em id="winsM">0<\/em><\/b><i>勝<\/i>/);
assert.match(pair.slice(sealAt('id="sealF"')), /<i>勝<\/i><b>×<em id="winsF">0<\/em>/);
assert.match(games, /classList\.remove\("is-done"/);
assert.match(games, /busy = false/);
assert.equal((html.match(/id="gxFateClose"/g) || []).length, 1);
assert.equal((html.match(/id="gxClose"/g) || []).length, 1);
assert.equal((html.match(/id="gxAgain"/g) || []).length, 1);
assert.equal((html.match(/id="gxFateAgain"/g) || []).length, 1);
assert.doesNotMatch(css, /\.c-gx-card \{[^}]*translateY/);
assert.match(games, /sc-gx-seen:/);
assert.match(html, /id="gxSelf"/);
assert.match(html, /id="gxOther"/);
assert.match(html, /maxlength="6"/);
assert.match(games, /wedgeLabel/);
assert.match(css, /#sealM \{ margin-right: 4px; \}/);
assert.match(css, /#sealF \{ margin-left: 4px; \}/);
assert.match(css, /\.c-pair-slot \{[^}]*z-index:\s*2/);
assert.match(css, /\.c-seal i \{[^}]*font-weight:\s*400/);
assert.match(css, /\.c-seal i \{[^}]*rotate\(-11deg\)/);
assert.doesNotMatch(css, /\.c-seal i \{[^}]*will-change/);
assert.match(css, /\.c-seal b \{[^}]*font-weight:\s*400/);
assert.match(css, /\.c-seal em \{[^}]*font-weight:\s*400/);
assert.match(css, /\.c-bar \{[^}]*height: calc\(54px \+ env\(safe-area-inset-top\)\)/);
assert.match(css, /\.c-pair \{[^}]*left:\s*50%/);
assert.match(css, /html\[data-theme="light"\] #chat \.c-seal[\s\S]*#1c2430/);
assert.match(html, /id="gxAbort"/);
assert.match(html, /id="gxWheelAbort"/);
assert.match(html, /id="gxFateAbort"/);
assert.match(css, /html\[data-theme="light"\] #chat \.c-seal/);
assert.doesNotMatch(css, /\.c-seal i \{[^}]*border-radius:\s*50%/);

function fakeDoc() {
  const els = new Map();
  function make(id) {
    const classes = new Set();
    const node = {
      id, hidden: true, textContent: "", innerHTML: "", className: "", value: "",
      dataset: {},
      style: { setProperty() {} },
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); },
        toggle(c, on) { if (on) classes.add(c); else classes.delete(c); },
      },
      _ev: {},
      addEventListener(type, fn) { (node._ev[type] ||= []).push(fn); },
      querySelector(sel) {
        if (sel === ".self" || sel === ".other" || sel === ".c-gx-card") return make(id + sel);
        return null;
      },
      replaceChildren() {},
      append() {},
      focus() {},
    };
    els.set(id, node);
    return node;
  }
  return {
    body: make("body"),
    getElementById(id) { return els.get(id) || make(id); },
    els,
  };
}
function fakeDb() {
  const listeners = new Map();
  return {
    db: {},
    ref(_db, path) { return path; },
    onValue(path, cb) {
      const list = listeners.get(path) || [];
      list.push(cb);
      listeners.set(path, list);
      return () => {};
    },
    runTransaction: async () => {},
    emit(path, val) {
      for (const cb of listeners.get(path) || []) cb({ val: () => val });
    },
  };
}
const jobs = [];
globalThis.requestAnimationFrame = (fn) => { jobs.push(fn); return jobs.length; };
const store = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, v); } };
const doc = fakeDoc();
const db = fakeDb();
const ui = mountGames(doc, { toast() {}, getSide: () => "f", storage: store });
ui.open(db, "room-a", [], () => true);
const fresh = withWheelPlan({ ...createWheel("m", "w1", "誰比較可愛", Date.now(), "自己", "對方"), ok: true }, { mode: "none", base: 1800, final: 1800 }, Date.now());
const done = finishWheel(fresh);
db.emit("rooms/room-a/games/wheel", done);
assert.equal(doc.getElementById("gxFateWheel").hidden, true, "already ended wheel stays closed");
assert.equal(readSeen(store, "room-a").has(resultKey(done)), true);
const liveBase = withWheelPlan({ ...createWheel("m", "w2", "下一題", Date.now(), "自己", "對方"), ok: true }, { mode: "none", base: 1800, final: 1800 }, Date.now());
db.emit("rooms/room-a/games/wheel", { ...liveBase, phase: "ready", spin: 0, fin: 0 });
db.emit("rooms/room-a/games/wheel", finishWheel(liveBase));
assert.equal(doc.getElementById("gxFateWheel").hidden, false, "result shows when it ends while we are here");
assert.equal((doc.getElementById("gxFateClose")._ev.click || []).length, 1);
mountGames(doc, { toast() {}, getSide: () => "f", storage: store });
assert.equal((doc.getElementById("gxFateClose")._ev.click || []).length, 1, "listeners are not added twice");
const ooxxLive = withOoxxPlan(acceptInvite(createOoxx("m", "g9", Date.now()), "f"), { mode: "none", base: 1800, final: 1800 }, Date.now());
db.emit("rooms/room-a/games/ooxx", { ...ooxxLive, phase: "over", winner: "m" });
assert.equal(doc.getElementById("gxGame").hidden, true, "already ended OOXX stays closed");
