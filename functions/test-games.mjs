import fs from "node:fs";
import assert from "node:assert/strict";
import {
  pointedSelf, personAt, planSpin, winnerOf, applyMove, addWin, viewWins,
  createOoxx, acceptInvite, needsOoxxPlan, withOoxxPlan,
  askRematch, agreeRematch, rebuffRematch, dismissRebuff,
  createWheel, withWheelPlan,
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
const ready = agreeRematch(asked, "m", "ooxx");
assert.equal(ready.phase, "ready");
assert.equal(ready.spin, 0);
const no = rebuffRematch(asked, "m", "ooxx");
assert.equal(no.phase, "rebuff");
assert.equal(dismissRebuff(no, "f", "ooxx").phase, "over");

const topic = createWheel("m", "w1", "誰是笨蛋", 1000);
const spun = withWheelPlan({ ...topic, ok: true }, { mode: "edge", base: 1980, final: 1992 });
assert.equal(spun.target, personAt(1992, "m"));
assert.equal(spun.topic, "誰是笨蛋");

const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
const room = rules.rules.rooms.$roomId;
assert.equal(room.games.$other[".validate"], false);
assert.equal(room.games[".read"], room.games[".write"]);
assert.match(room.games[".read"], /acl\/' \+ \$roomId \+ '\/ok\//);
assert.equal(room.ooxxWins.$other[".validate"], false);
assert.match(room.games.ooxx.cells[".validate"], /\[mf\.\]/);
assert.match(room.games.wheel.topic[".validate"], /length <= 24/);
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
assert.match(app, /const APP_VERSION = "v61\.83"/);
assert.match(css, /html\[data-theme="light"\] #chat \.c-seal/);
assert.doesNotMatch(css, /\.c-seal i \{[^}]*border-radius:\s*50%/);
