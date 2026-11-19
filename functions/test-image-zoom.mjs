import fs from "node:fs";
import assert from "node:assert/strict";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  clampPan,
  clampScale,
  wheelFactor,
  zoomAround,
} from "../image-zoom.mjs";

assert.equal(clampScale(Number.NaN), ZOOM_MIN);
assert.equal(clampScale(0.2), ZOOM_MIN);
assert.equal(clampScale(99), ZOOM_MAX);
assert.deepEqual(clampPan(1, 40, -30, { w: 800, h: 600, iw: 400, ih: 300 }), { scale: 1, x: 0, y: 0 });
assert.deepEqual(clampPan(0.4, 10, 10, { w: 800, h: 600, iw: 400, ih: 300 }), { scale: 1, x: 0, y: 0 });

const wide = { w: 1000, h: 800, iw: 900, ih: 700, ox: 0, oy: 0 };
assert.deepEqual(zoomAround({ scale: 1, x: 0, y: 0 }, 0, 0, 2, wide), { scale: 2, x: 0, y: 0 });
const shoved = clampPan(2, 1e9, -1e9, wide);
assert.equal(shoved.x, (900 * 2 - 1000) / 2);
assert.equal(shoved.y, -((700 * 2 - 800) / 2));

const inset = { w: 1000, h: 800, iw: 200, ih: 100, ox: 20, oy: -10 };
const edge = clampPan(2, 9999, 9999, inset);
assert.equal(edge.x, (1000 - 400) / 2 - 20);
assert.equal(edge.y, (800 - 200) / 2 - (-10));
assert.equal(clampPan(2, 0, 0, inset).x, 0);

const fit = { w: 400, h: 300, iw: 400, ih: 300, ox: 0, oy: 0 };
let state = { scale: 1, x: 0, y: 0 };
const fx = 80;
const fy = -30;
const localX = fx;
const localY = fy;
for (let i = 0; i < 6; i++) {
  state = zoomAround(state, fx, fy, Math.min(ZOOM_MAX, state.scale * 1.15), fit);
  assert.ok(Math.abs(state.x + localX * state.scale - fx) < 0.02, `x ${state.x}`);
  assert.ok(Math.abs(state.y + localY * state.scale - fy) < 0.02, `y ${state.y}`);
}
assert.ok(state.scale > 2);

assert.ok(wheelFactor(-100, 0) > 1);
assert.ok(wheelFactor(100, 0) < 1);
assert.ok(Math.abs(wheelFactor(-100, 0) - wheelFactor(-100 / 16, 1)) < 1e-9);
assert.ok(wheelFactor(-10000, 0) < 1.4);

function overlaps(s, view) {
  const left = s.x - (view.iw * s.scale) / 2;
  const right = s.x + (view.iw * s.scale) / 2;
  const top = s.y - (view.ih * s.scale) / 2;
  const bottom = s.y + (view.ih * s.scale) / 2;
  return {
    overlapW: Math.min(right, view.w / 2) - Math.max(left, -view.w / 2),
    overlapH: Math.min(bottom, view.h / 2) - Math.max(top, -view.h / 2),
    visW: view.iw * s.scale,
    visH: view.ih * s.scale,
  };
}
const small = { w: 900, h: 700, iw: 200, ih: 120 };
for (const [sample, view] of [
  [clampPan(4, 99999, -99999, wide), wide],
  [clampPan(1.2, -99999, 99999, small), small],
  [zoomAround({ scale: 1, x: 0, y: 0 }, 480, 360, 5, wide), wide],
]) {
  const hit = overlaps(sample, view);
  assert.ok(hit.overlapW >= Math.min(hit.visW, view.w) - 0.6, JSON.stringify(sample));
  assert.ok(hit.overlapH >= Math.min(hit.visH, view.h) - 0.6, JSON.stringify(sample));
}

const root = new URL("..", import.meta.url);
const app = fs.readFileSync(new URL("app.js", root), "utf8");
const html = fs.readFileSync(new URL("index.html", root), "utf8");
const css = fs.readFileSync(new URL("style.css", root), "utf8");
const sw = fs.readFileSync(new URL("sw.js", root), "utf8");
const zoom = fs.readFileSync(new URL("image-zoom.mjs", root), "utf8");
const preview = fs.readFileSync(new URL("preview/image-zoom-preview.html", root), "utf8");
assert.equal(app.match(/const APP_VERSION = "([^"]+)"/)[1], "v62.08");
assert.match(html, /content="v62\.08"/);
assert.match(sw, /const VERSION = "sc-v62\.08"/);
assert.match(app, /attachImageZoom/);
assert.match(app, /imageZoom\?\.isZoomed\(\)/);
assert.match(app, /swallowClick\(\)/);
assert.match(app, /tapClosesImage\(\)/);
assert.match(html, /id="lbZoomIn"/);
assert.match(html, /id="lbZoomOut"/);
assert.match(html, /id="lbZoomReset"/);
assert.match(html, /id="lbClose"/);
assert.match(css, /\.lightbox\.lb-zoomed img \{ cursor: grab; \}/);
assert.match(css, /cursor: grabbing;/);
assert.match(zoom, /translate3d\(/);
assert.doesNotMatch(zoom, /transition:/);
assert.match(css, /\.lightbox:not\(\.isvideo\) \{ touch-action: none; \}/);
assert.match(css, /html \{[^}]*touch-action: pan-y;/);
const start = preview.indexOf("/* __ZOOM_SRC_START__ */");
const end = preview.indexOf("/* __ZOOM_SRC_END__ */");
assert.equal(preview.slice(start + "/* __ZOOM_SRC_START__ */".length, end).trim(), zoom.trim());
assert.doesNotMatch(preview, /<script\b[^>]*\bsrc=/i);
assert.doesNotMatch(preview, /<link\b[^>]*stylesheet/i);
assert.match(preview, /toDataURL\(/);
assert.match(preview, /id="lbZoomIn"/);
assert.doesNotMatch(fs.readFileSync(new URL("firebase.json", root), "utf8"), /image-zoom-preview/);

console.log("PASS: image zoom stays on screen, wheels around the pointer, and the preview matches.");
