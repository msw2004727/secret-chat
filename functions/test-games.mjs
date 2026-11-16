import fs from "node:fs";
import assert from "node:assert/strict";
import {
  pointedSelf, personAt, planSpin, winnerOf, applyMove, addWin, viewWins,
  createOoxx, acceptInvite, needsOoxxPlan, withOoxxPlan,
  askRematch, agreeRematch, rebuffRematch, dismissRebuff,
  createWheel, withWheelPlan, canReplace, enterPlay, finishWheel, forceEnd, otherSide, wedgeLabel,
} from "../games.js";

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
assert.match(app, /const APP_VERSION = "v61\.86"/);
assert.match(html, /id="gxSelf"/);
assert.match(html, /id="gxOther"/);
assert.match(html, /maxlength="6"/);
assert.match(games, /wedgeLabel/);
assert.match(css, /\.c-seal i \{[^}]*font-weight:\s*400/);
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
