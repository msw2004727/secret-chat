/* 拿棍子的袋鼠。圖是裁過邊的 GIF 原畫，不重畫。
   原圖朝左。往右走時整張水平翻面。停下來停在第一格，走路才播動畫。
   只在這台瀏覽器裡跑，跟著「聊天室貓咪與趣味特效」。 */
import quokkaUrl from "./quokka.gif";
import { cssHeight, decodeQuokkaGif, quokkaFrame, quokkaMirror } from "./quokka-gif.js";

export function attachQuokka(api) {
  const url = quokkaUrl;
  const rand = (a, b) => a + Math.random() * (b - a);
  const wrap = document.createElement("div");
  wrap.className = "quokka";
  wrap.setAttribute("aria-hidden", "true");
  const cv = document.createElement("canvas");
  wrap.appendChild(cv);
  const shadow = document.createElement("i");
  shadow.className = "quokka-shadow";
  wrap.appendChild(shadow);
  api.layer.appendChild(wrap);
  wrap.hidden = true;

  const q = { x: 0, dir: -1, moving: false, until: 0, walkT0: 0, placed: false };
  let hold = null;
  let bitmaps = [];
  let gw = 54, gh = 78;
  let lastNow = 0;

  function height() { return cssHeight(api.S()); }
  function width() { return height() * (gw / gh); }
  function maxX() { return Math.max(0, api.areaW() - width()); }

  fetch(url).then((r) => r.arrayBuffer()).then((buf) => {
    const gif = decodeQuokkaGif(buf);
    gw = gif.width; gh = gif.height;
    bitmaps = gif.frames.map((rgba) => {
      const c = document.createElement("canvas");
      c.width = gif.width; c.height = gif.height;
      c.getContext("2d").putImageData(new ImageData(rgba, gif.width, gif.height), 0, 0);
      return c;
    });
  }).catch(() => {});

  function paint(now) {
    if (!bitmaps.length || !api.enabled()) { wrap.hidden = true; return; }
    wrap.hidden = false;
    if (!q.placed && api.areaW() > 40) { q.x = Math.min(maxX(), api.areaW() * 0.62); q.placed = true; }
    const moving = hold ? !!hold.moving : q.moving;
    const dir = hold && hold.dir ? hold.dir : q.dir;
    const x = hold && hold.x != null ? hold.x : q.x;
    const fi = quokkaFrame(moving, now, q.walkT0, bitmaps.length);
    const h = height(), w = width();
    wrap.style.width = w + "px";
    wrap.style.height = h + "px";
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, pw, ph);
    c.imageSmoothingEnabled = true;
    c.save();
    /* 鼻子在原圖右側。往左（dir < 0）才翻面，臉才對著速度方向。 */
    if (quokkaMirror(dir)) { c.translate(pw, 0); c.scale(-1, 1); }
    c.drawImage(bitmaps[fi] || bitmaps[0], 0, 0, pw, ph);
    c.restore();
    wrap.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
  }

  function step(now) {
    if (!api.enabled()) { wrap.hidden = true; return; }
    const dt = lastNow ? Math.min(0.05, Math.max(0, (now - lastNow) / 1000)) : 0;
    lastNow = now;
    if (!hold) {
      if (now >= q.until) {
        if (Math.random() < 0.35) {
          q.moving = false;
          q.until = now + rand(800, 2000);
        } else {
          q.moving = true;
          if (q.x < 8) q.dir = 1;
          else if (q.x > maxX() - 8) q.dir = -1;
          else if (Math.random() < 0.35) q.dir = q.dir > 0 ? -1 : 1;
          q.walkT0 = now;
          q.until = now + rand(900, 2400);
        }
      }
      if (q.moving) {
        q.x += (q.dir > 0 ? 1 : -1) * 22 * dt;
        if (q.x < 0) { q.x = 0; q.dir = 1; }
        if (q.x > maxX()) { q.x = maxX(); q.dir = -1; }
      }
    }
    paint(now);
  }

  return {
    step,
    shift() {},
    hide() { wrap.hidden = true; },
    demo(opts) { hold = opts || null; if (hold && hold.moving) q.walkT0 = performance.now(); },
    get q() { return q; },
  };
}
