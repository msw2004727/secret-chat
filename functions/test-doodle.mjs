import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DOODLE_W, DOODLE_H, DOODLE_RATIO, Q, MAX_STROKES, MAX_GALLERY, MAX_JPEG,
  fitBox, clientToUnit, unitToPx, quantize, dequant,
  encodePts, decodePts, encodeStroke, decodeStroke, allocSlot,
  toneOf, ringOf, sideCode, peerOpen, ownUndoId, formatStamp, jpegWithin,
} from "../doodle.js";

const wide = fitBox(360, 700);
const narrow = fitBox(200, 280);
assert.ok(Math.abs(wide.w / wide.h - DOODLE_RATIO) < 1e-9);
assert.ok(Math.abs(narrow.w / narrow.h - DOODLE_RATIO) < 1e-9);
assert.ok(wide.w <= 360 && wide.h <= 700);
assert.ok(narrow.w <= 200 && narrow.h <= 280);
assert.ok(Math.abs((wide.x * 2 + wide.w) - 360) < 1e-6);
assert.ok(Math.abs((narrow.y * 2 + narrow.h) - 280) < 1e-6);

const unit = { x: 0.25, y: 0.6 };
const pa = unitToPx(unit.x, unit.y, wide.w, wide.h);
const pb = unitToPx(unit.x, unit.y, narrow.w, narrow.h);
assert.ok(Math.abs(pa.x / wide.w - pb.x / narrow.w) < 1e-9);
assert.ok(Math.abs(pa.y / wide.h - pb.y / narrow.h) < 1e-9);

const rectA = { left: 12, top: 40, width: wide.w, height: wide.h };
const rectB = { left: 90, top: 8, width: narrow.w, height: narrow.h };
const ca = clientToUnit(rectA.left + wide.w * unit.x, rectA.top + wide.h * unit.y, rectA);
const cb = clientToUnit(rectB.left + narrow.w * unit.x, rectB.top + narrow.h * unit.y, rectB);
assert.ok(Math.abs(ca.x - unit.x) < 1e-9 && Math.abs(cb.x - unit.x) < 1e-9);
assert.ok(Math.abs(ca.y - unit.y) < 1e-9 && Math.abs(cb.y - unit.y) < 1e-9);
assert.ok(Math.abs(ca.x - cb.x) < 1e-9 && Math.abs(ca.y - cb.y) < 1e-9);

const saved = unitToPx(unit.x, unit.y, DOODLE_W, DOODLE_H);
assert.equal(DOODLE_W, 900);
assert.equal(DOODLE_H, 1200);
assert.ok(Math.abs(saved.x / DOODLE_W - pa.x / wide.w) < 1e-9);
assert.ok(Math.abs(saved.y / DOODLE_H - pa.y / wide.h) < 1e-9);

const back = decodePts(encodePts([{ x: unit.x, y: unit.y, r: 0.022 }]))[0];
assert.ok(Math.abs(back.x - quantize(unit.x) / Q) < 1e-12);
assert.ok(Math.abs(back.y - quantize(unit.y) / Q) < 1e-12);
assert.equal(dequant(quantize(0.3)), quantize(0.3) / Q);

const shape = decodeStroke("k1", encodeStroke({
  by: "device-a", tool: "circle", color: "#FFFFFF", z: "l", t: 10,
  a: { x: 0.1, y: 0.2 }, b: { x: 0.4, y: 0.8 },
}));
assert.equal(shape.tool, "circle");
assert.equal(shape.color, "#ffffff");
assert.equal(shape.z, "l");
assert.ok(Math.abs(shape.a.x - 0.1) < 1 / Q + 1e-9);
assert.ok(Math.abs(shape.b.y - 0.8) < 1 / Q + 1e-9);

assert.equal(toneOf("m"), "mai");
assert.equal(toneOf("f"), "xin");
assert.equal(toneOf("n"), "plain");
assert.equal(toneOf(""), "plain");
assert.equal(ringOf("m"), "blue");
assert.equal(ringOf("f"), "pink");
assert.equal(ringOf("n"), "gray");
assert.equal(sideCode(""), "n");
assert.equal(sideCode("m"), "m");

assert.equal(peerOpen({ a: true }, "a"), false);
assert.equal(peerOpen({ a: true, b: true }, "a"), true);
assert.equal(peerOpen({ a: true, b: false }, "a"), false);
assert.equal(ownUndoId([{ id: "1", by: "a" }, { id: "2", by: "b" }, { id: "3", by: "a" }], "a"), "3");
assert.equal(ownUndoId([{ id: "1", by: "b" }], "a"), "");

assert.equal(formatStamp(new Date(2026, 10, 18, 11, 22).getTime()), "2026/11/18 11:22");
const fake = { toDataURL(_t, q) { return "data:image/jpeg;base64," + "A".repeat(q > 0.5 ? MAX_JPEG : 20); } };
const jpg = jpegWithin(fake, MAX_JPEG);
assert.ok(jpg.startsWith("data:image/jpeg"));
assert.ok(jpg.length <= MAX_JPEG);

const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
const doodle = rules.rules.rooms.$roomId.doodle;
assert.match(doodle.strokes.$id[".validate"], /240/);
assert.match(doodle.g.$id[".validate"], /20/);
assert.equal(allocSlot(["1", "2"], 3), "3");
assert.equal(allocSlot(["1", "2", "3"], 3), "");
assert.match(doodle.g.$id.jpg[".validate"], /140000/);
assert.match(doodle[".read"], /acl\/' \+ \$roomId/);
assert.match(doodle[".write"], /auth\.token\.lp === true/);
assert.equal(doodle.$other[".validate"], false);

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const board = fs.readFileSync(new URL("../doodle.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
assert.match(app, /const APP_VERSION = "v61\.97"/);
assert.match(app, /S\.doodle\?\.open/);
assert.match(board, /rooms\/\$\{room\}\/doodle/);
assert.match(html, /塗鴉板/);
assert.match(html, /id="doodleInvite"/);
assert.match(html, /id="doodleBoard"/);
assert.match(css, /touch-action:\s*none/);
assert.match(css, /\.c-doodle-floats[\s\S]*pointer-events:\s*none/);
assert.match(css, /min\(90%/);

console.log("doodle ok");
