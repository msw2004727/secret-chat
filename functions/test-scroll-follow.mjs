import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createFollowController, STICK_PX } from "../scroll-follow.js";

const queued = [];
globalThis.requestAnimationFrame = (fn) => { queued.push(fn); return queued.length; };
const flush = () => { const batch = queued.splice(0); for (const fn of batch) fn(); };

function scroller(height, top, client) {
  const listeners = new Map();
  const el = {
    scrollHeight: height,
    clientHeight: client,
    _top: top,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatch(type, ev) {
      for (const fn of listeners.get(type) || []) fn(ev);
    },
  };
  Object.defineProperty(el, "scrollTop", {
    get() { return this._top; },
    set(v) {
      const max = Math.max(0, this.scrollHeight - this.clientHeight);
      this._top = Math.min(max, Math.max(0, v));
    },
  });
  return el;
}

function boot() {
  const c = createFollowController();
  const sc = scroller(5000, 4300, 700); // gap 0
  c.arm(sc);
  return { c, sc };
}

{
  const { c, sc } = boot();
  assert.equal(c.shouldFollow(sc), true);
  assert.equal(c.isFollowing(), true);
}

{
  const { c, sc } = boot();
  sc.scrollTop = 4280; // 20px up — inside the old 90px trap
  sc.dispatch("scroll", {});
  assert.equal(c.isFollowing(), false);
  assert.equal(c.shouldFollow(sc), false);
  const before = sc.scrollTop;
  c.stickIfStill(sc);
  assert.equal(sc.scrollTop, before, "a follow-up frame must not yank a 20px upward scroll");
}

{
  const { c, sc } = boot();
  sc.dispatch("wheel", { deltaY: -12 });
  sc.scrollTop -= 12;
  sc.dispatch("scroll", {});
  flush();
  assert.equal(c.isFollowing(), false);
  assert.equal(c.shouldFollow(sc), false);
  c.stickIfStill(sc);
  assert.ok(c.gap(sc) > STICK_PX);
}

{
  const { c, sc } = boot();
  sc.dispatch("wheel", { deltaY: -3 });
  assert.equal(c.isFollowing(), false, "upward wheel releases before the scroll position updates");
  sc.scrollTop -= 3;
  sc.dispatch("scroll", {});
  flush();
  assert.equal(c.isFollowing(), false, "a 3px wheel stays released");
  c.stickIfStill(sc);
  assert.equal(Math.round(c.gap(sc)), 3);
}

{
  const { c, sc } = boot();
  sc.dispatch("wheel", { deltaY: -4 });
  flush();
  assert.equal(c.isFollowing(), true, "a wheel that does not move re-arms at the bottom");
  assert.equal(c.shouldFollow(sc), true);
}

{
  const { c, sc } = boot();
  sc.scrollHeight += 80; // content grew under the user; scrollTop unchanged
  assert.equal(c.shouldFollow(sc), false);
  assert.equal(c.stickIfStill(sc), true);
  assert.ok(c.gap(sc) <= 0.5);
  assert.equal(c.isFollowing(), true);
}

{
  const { c, sc } = boot();
  sc.scrollTop = 4000;
  sc.dispatch("scroll", {});
  assert.equal(c.isFollowing(), false);
  sc.scrollHeight += 80;
  assert.equal(c.stickIfStill(sc), false);
  assert.ok(c.gap(sc) > 80);
}

{
  const { c, sc } = boot();
  sc.scrollTop = 4100;
  sc.dispatch("scroll", {});
  sc.scrollTop = 4300;
  sc.dispatch("scroll", {});
  assert.equal(c.gap(sc) <= STICK_PX, true);
  assert.equal(c.isFollowing(), true);
  assert.equal(c.shouldFollow(sc), true);
}

{
  const { c, sc } = boot();
  const top = sc.scrollTop;
  c.stick(sc);
  sc.dispatch("scroll", {});
  assert.ok(c.gap(sc) <= 0.5);
  assert.equal(c.isFollowing(), true);
  assert.ok(sc.scrollTop >= top);
}

{
  const { c, sc } = boot();
  sc.dispatch("touchstart", { touches: [{ clientY: 400 }] });
  sc.dispatch("touchmove", { touches: [{ clientY: 430 }] });
  sc.scrollTop -= 28;
  sc.dispatch("scroll", {});
  flush();
  assert.equal(c.isFollowing(), false);
  c.stickIfStill(sc);
  assert.ok(c.gap(sc) > 20);
}

{
  const { c, sc } = boot();
  sc.dispatch("touchstart", { touches: [{ clientY: 400 }] });
  sc.dispatch("touchmove", { touches: [{ clientY: 406 }] });
  flush();
  assert.equal(c.isFollowing(), true, "a touch that does not scroll re-arms");
}

{
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /createFollowController/);
  assert.match(app, /follow\.arm\(sc\)/);
  assert.match(app, /follow\.shouldFollow\(sc\)/);
  assert.match(app, /follow\.stickIfStill\(sc\)/);
  assert.doesNotMatch(app, /scrollTop - sc\.clientHeight < 90/);
  assert.match(app, /const APP_VERSION = "v62\.07"/);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(html, /sc-shell" content="v62\.07"/);
  assert.match(sw, /const VERSION = "sc-v62\.07"/);
  assert.match(app, /scrollTo\(\{ top: sc\.scrollHeight, behavior: "smooth" \}\)/);
}

console.log("PASS: upward scroll releases stick-to-bottom immediately");
