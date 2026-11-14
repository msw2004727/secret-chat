/* 對話區背景：兩隻 ASCII 鯊魚。畫布不吃點擊。
   分頁切走或離開聊天室就停；系統要求減少動效時只畫一張靜止的。 */

const CW = 6, CH = 9;
const RAMP = " .,:;-=+*x#%@";
const THEMES = {
  dark: { bg: "#0a0c0d", food: "#6b604c", fish: ["#3c4548", "#45403a"] },
  light: { bg: "#ffffff", food: "#bfae8c", fish: ["#c3cacc", "#cdc6bc"] },
};
const L = 38, S = 5.2, STEP = 0.35;

export function halfW(i) {
  const k = i / L;
  if (k < 0.12) return 0.6 + k / 0.12 * 2.6;
  if (k < 0.35) return 3.2 + (k - 0.12) / 0.23 * 1.4;
  return Math.max(0.6, 4.6 * Math.pow(1 - (k - 0.35) / 0.65, 1.4));
}

function makeFish(x, y, a) {
  return { x, y, a, t: 0, turn: 0, gulp: 0, sp: 2.0 * S * 4.5, beat: 3.6 };
}

export function createPond(width, height) {
  const pond = {
    w: Math.max(1, width),
    h: Math.max(1, height),
    foods: [],
    fish: [],
  };
  pond.fish = [makeFish(pond.w * 0.35, pond.h * 0.32, 0.4), makeFish(pond.w * 0.62, pond.h * 0.7, 3.4)];
  pond.resize = (w, h) => { pond.w = Math.max(1, w); pond.h = Math.max(1, h); };
  pond.drop = (x, y) => { pond.foods.push({ x, y, age: 0 }); };
  pond.step = (dt) => stepPond(pond, dt);
  return pond;
}

export function spine(f, i) {
  const k = i / L;
  const r = Math.max(0, (k - 0.32) / 0.68);
  const amp = Math.pow(r, 1.6) * 6.2 - (k < 0.32 ? 0.35 * (1 - k / 0.32) : 0);
  const sw = Math.sin(f.t - k * 5.5) * amp + f.turn * Math.pow(k, 1.5) * 26;
  const ca = Math.cos(f.a), sa = Math.sin(f.a);
  return [f.x + (-ca * (i - 8) - sa * sw) * S, f.y + (-sa * (i - 8) + ca * sw) * S];
}

/* 轉向是慢慢加，不把角度直接掰過去。先碰到飼料的那隻吃掉。 */
export function stepPond(pond, dt) {
  const foods = pond.foods;
  for (const fd of foods) fd.age += dt;
  for (const f of pond.fish) {
    const [hx, hy] = spine(f, 0);
    let tgt = null, best = 1e9;
    for (const fd of foods) {
      const d = Math.hypot(fd.x - hx, fd.y - hy);
      if (d < best) { best = d; tgt = fd; }
    }
    let sp = 2.0 * S * 4.5, beat = 3.6;
    if (tgt) {
      const ta = Math.atan2(tgt.y - f.y, tgt.x - f.x);
      const d = Math.atan2(Math.sin(ta - f.a), Math.cos(ta - f.a));
      f.turn += (Math.max(-0.8, Math.min(0.8, d * 1.2)) - f.turn) * dt * 0.9;
      sp *= 1.5 * (0.55 + 0.45 * Math.max(0, Math.cos(d)));
      beat = 4.6;
      if (best < 3 * S) { foods.splice(foods.indexOf(tgt), 1); f.gulp = 0.4; }
    } else {
      f.turn += (Math.random() - 0.5) * dt * 0.35;
      f.turn *= 0.985;
      const m = 24 * S;
      if (f.x < m || f.x > pond.w - m || f.y < m || f.y > pond.h - m) {
        const ta = Math.atan2(pond.h / 2 - f.y, pond.w / 2 - f.x);
        const d = Math.atan2(Math.sin(ta - f.a), Math.cos(ta - f.a));
        f.turn += d * dt * 0.6;
      }
    }
    f.turn = Math.max(-0.8, Math.min(0.8, f.turn));
    f.sp += (sp - f.sp) * dt * 0.8;
    f.beat += (beat - f.beat) * dt * 0.8;
    f.a += f.turn * dt;
    f.t += dt * f.beat;
    f.gulp = Math.max(0, f.gulp - dt);
    f.x += Math.cos(f.a) * f.sp * dt;
    f.y += Math.sin(f.a) * f.sp * dt;
  }
}

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch (_) { return false; }
}

function themeName() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function mountPondShark(scroller, hooks) {
  const host = scroller && scroller.querySelector(".c-pond");
  const cv = host && host.querySelector("canvas");
  if (!host || !cv) return { start() {}, stop() {}, drop() {} };
  const ctx = cv.getContext("2d");
  const pond = createPond(1, 1);
  let cols = 1, rows = 1, buf = new Float32Array(1), own = new Int8Array(1);
  let raf = 0, running = false, last = 0, drawAcc = 0;
  const still = reducedMotion();

  function measure() {
    const cs = getComputedStyle(scroller);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    /* clientWidth 含左右內距。畫布從內容區左邊畫那麼寬會凸出去，捲動區就能左右滑。
       負的左右外距把它拉回內距裡，佔用的排版寬度仍等於內容區。 */
    const w = scroller.clientWidth || 1;
    const h = scroller.clientHeight || 1;
    host.style.marginLeft = (-padL) + "px";
    host.style.marginRight = (-padR) + "px";
    host.style.width = w + "px";
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    cv.style.left = "0";
    cv.style.top = (-padT) + "px";
    cv.style.width = "100%";
    cv.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pond.resize(w, h);
    cols = Math.ceil(w / CW);
    rows = Math.ceil(h / CH);
    buf = new Float32Array(cols * rows);
    own = new Int8Array(cols * rows);
  }

  function put(x, y, v, id) {
    const cx = Math.floor(x / CW), cy = Math.floor(y / CH);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const i = cy * cols + cx;
    if (v > buf[i]) { buf[i] = v; own[i] = id; }
  }

  function raster(f, id) {
    const [bx, by] = spine(f, 10), [cx2, cy2] = spine(f, 12);
    const dx = bx - cx2, dy = by - cy2, dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
    for (const s of [-1, 1]) for (let r = 0; r < 6; r += STEP) for (let w = 0; w <= (6 - r) * 0.45; w += STEP)
      put(bx + (nx * s * (4 + r) - ux * (r * 0.9 + w)) * S, by + (ny * s * (4 + r) - uy * (r * 0.9 + w)) * S, 0.45 - r * 0.03, id);
    for (let i = 0; i < L; i += STEP) {
      const [x, y] = spine(f, i);
      const [x2, y2] = spine(f, Math.min(L, i + 0.5));
      const tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1;
      const nX = ty / tl, nY = -tx / tl;
      let hw = halfW(i);
      if (i < 4 && f.gulp > 0) hw *= 1 + f.gulp * 0.6;
      for (let j = -hw; j <= hw; j += STEP) {
        const e = Math.abs(j) / hw;
        let v = 1 - e * 0.65;
        if (i > 30) v *= 0.85;
        put(x + nX * j * S, y + nY * j * S, v, id);
      }
    }
    const [ta, tb] = spine(f, L), [pa, pb] = spine(f, L - 3);
    const ex = ta - pa, ey = tb - pb, el = Math.hypot(ex, ey) || 1;
    const vx = ex / el, vy = ey / el, mx = -vy, my = vx;
    for (const s of [-1, 1]) for (let r = 0; r < 7; r += STEP) {
      const w = 1.6 * (1 - r / 7) + 0.4;
      for (let q = 0; q < w; q += STEP)
        put(ta + (mx * s * r + vx * (r * 0.55 + q)) * S, tb + (my * s * r + vy * (r * 0.55 + q)) * S, 0.5 - r * 0.03, id);
    }
  }

  function draw() {
    const T = THEMES[themeName()];
    buf.fill(0);
    pond.fish.forEach((f, i) => raster(f, i));
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, pond.w, pond.h);
    ctx.font = (CH + 1) + "px ui-monospace, Menlo, Consolas, monospace";
    ctx.textBaseline = "top";
    for (let id = 0; id < pond.fish.length; id++) {
      ctx.fillStyle = T.fish[id];
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        const v = buf[i];
        if (v <= 0.05 || own[i] !== id) continue;
        const ch = RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(v * (RAMP.length - 1))))];
        ctx.fillText(ch, cx * CW, cy * CH);
      }
    }
    ctx.fillStyle = T.food;
    for (const fd of pond.foods) {
      ctx.fillText(fd.age < 0.25 ? "*" : "o", Math.floor(fd.x / CW) * CW, Math.floor(fd.y / CH) * CH);
    }
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    if (document.hidden) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    pond.step(dt);
    drawAcc += dt;
    if (drawAcc >= 0.08) { drawAcc = 0; draw(); }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    measure();
    if (still) { draw(); return; }
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  let down = null, armed = false;
  const release = () => { if (armed && hooks && hooks.releaseTap) hooks.releaseTap(); armed = false; };
  const emptyTap = (e) => {
    if (e.button != null && e.button !== 0) return false;
    if (hooks && hooks.isMenuOpen && hooks.isMenuOpen()) return false;
    const el = e.target;
    if (!el || !el.closest) return false;
    if (el.closest(".bub, button, a, input, textarea, label, .rx-btn, .rx-chip, .q, .c-loadbtn, .c-loadend, .cell")) return false;
    return true;
  };
  scroller.addEventListener("pointerdown", (e) => {
    if (!emptyTap(e)) { down = null; return; }
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    if (hooks && hooks.suppressTap) hooks.suppressTap();
    armed = true;
  }, { passive: true });
  scroller.addEventListener("pointermove", (e) => {
    if (!down || down.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; release(); }
  }, { passive: true });
  scroller.addEventListener("pointerup", (e) => {
    if (!down || down.id !== e.pointerId) { release(); return; }
    const start = down;
    down = null;
    armed = false;
    if (performance.now() - start.t > 400) { release(); return; }
    const box = cv.getBoundingClientRect();
    pond.drop(start.x - box.left, start.y - box.top);
    if (still) draw();
  }, { passive: true });
  scroller.addEventListener("pointercancel", () => { down = null; release(); }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (hooks && hooks.isChatOpen && hooks.isChatOpen()) start();
  });
  const watch = new MutationObserver(() => { if (running || still) draw(); });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (typeof ResizeObserver === "function") new ResizeObserver(() => { if (running || still) { measure(); draw(); } }).observe(scroller);

  return { start, stop, drop: pond.drop };
}
