/* ============================================================
 *  圖片燈箱的放大與平移
 *
 *  只動 transform（translate3d + scale）。
 *  ⚠️ 不要用 CSS transition：滾輪每個刻度都會把動畫切掉重來，畫面會頓。
 *     這裡用一個 requestAnimationFrame 把「目前」追向「目標」，
 *     時間常數固定，所以幀率忽高忽低也不會一下子跳、一下子黏。
 *  ⚠️ 靜止在一倍時要把 transform 清掉。留著 scale(1) 時，
 *     有些瀏覽器會多開一層合成，照片看起來發糊。
 *  ⚠️ 度量用燈箱內容區的中心，不要讀圖片的 getBoundingClientRect。
 *     那個矩形已經含目前的位移與縮放，拿來當原點會越算越漂。
 * ============================================================ */

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
export const ZOOM_STEP = 1.4;
export const ZOOM_DOUBLE = 2.5;
const TAU_MS = 80;

export function clampScale(scale) {
  if (!Number.isFinite(scale)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

function clampNum(v, min, max) {
  const n = Number.isFinite(v) ? v : 0;
  return Math.min(max, Math.max(min, n));
}

/* 圖片比視窗小：整張留在畫面裡。比視窗大：邊緣最多貼齊視窗，不能拖到完全離開。
   scale 回到 1 時強制回版面原點 (0,0) —— 那就是 CSS 置中的位置。 */
export function clampPan(scale, x, y, view) {
  const s = clampScale(scale);
  if (s <= ZOOM_MIN) return { scale: ZOOM_MIN, x: 0, y: 0 };
  const iw = Math.max(1, view?.iw || 1);
  const ih = Math.max(1, view?.ih || 1);
  const vw = Math.max(1, view?.w || 1);
  const vh = Math.max(1, view?.h || 1);
  const ox = view?.ox || 0;
  const oy = view?.oy || 0;
  const lim = (vis, box, origin) => {
    const half = Math.abs(vis - box) / 2;
    return { min: -half - origin, max: half - origin };
  };
  const lx = lim(iw * s, vw, ox);
  const ly = lim(ih * s, vh, oy);
  return { scale: s, x: clampNum(x, lx.min, lx.max), y: clampNum(y, ly.min, ly.max) };
}

/* focal 是相對於「未平移時的圖片中心」的座標。縮放後同一個圖上的點仍留在游標下。 */
export function zoomAround(state, focalX, focalY, nextScale, view) {
  const s0 = state && state.scale > 0 && Number.isFinite(state.scale) ? state.scale : 1;
  const x0 = state && Number.isFinite(state.x) ? state.x : 0;
  const y0 = state && Number.isFinite(state.y) ? state.y : 0;
  const fx = Number.isFinite(focalX) ? focalX : 0;
  const fy = Number.isFinite(focalY) ? focalY : 0;
  const s1 = clampScale(nextScale);
  const localX = (fx - x0) / s0;
  const localY = (fy - y0) / s0;
  return clampPan(s1, fx - localX * s1, fy - localY * s1, view);
}

/* 滾輪向上（deltaY 負）放大。觸控板的小增量與滑鼠一格都走同一條曲線，單次有上限。 */
export function wheelFactor(deltaY, deltaMode = 0) {
  let dy = Number(deltaY) || 0;
  if (deltaMode === 1) dy *= 16;
  else if (deltaMode === 2) dy *= 800;
  const capped = Math.max(-120, Math.min(120, dy));
  return Math.exp(-capped * 0.0024);
}

function prefersReduced() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch (_) { return false; }
}

export function attachImageZoom({ box, img, zoomIn, zoomOut, resetBtn }) {
  const state = { scale: 1, x: 0, y: 0 };
  const target = { scale: 1, x: 0, y: 0 };
  const view = { w: 1, h: 1, iw: 1, ih: 1, ox: 0, oy: 0, cx: 0, cy: 0 };
  const pointers = new Map();
  let raf = 0;
  let lastTs = 0;
  let dragging = false;
  let dragMoved = false;
  let gesture = false;
  let hold = false;
  let pinch = null;
  let activePointer = null;
  let dragOrigin = null;
  let swallowUntil = 0;
  let shownZoomed = false;
  let shownDrag = false;
  let shownAnim = false;
  let viewOk = false;
  /* 預設跟「有沒有滑鼠」走。真正的 pointerdown 再覆蓋：
     觸控點圖片要能關掉（手機原本就是點一下就收），滑鼠點圖片則留給雙擊放大。 */
  let imageTapCloses = true;
  try { imageTapCloses = !window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
  catch (_) { imageTapCloses = true; }
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let lastToggleAt = 0;

  function enabled() {
    return !!(box && img) && !box.hidden && !img.hidden && !box.classList.contains("isvideo");
  }

  function isZoomed() {
    return target.scale > 1.02 || state.scale > 1.02;
  }

  /* 滾輪會連續進來。每次都重算版面會強迫重排，放大時就頓。
     尺寸只在開圖、載入、視窗改變時失效。 */
  function measure() {
    if (viewOk) return true;
    const rect = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    view.w = Math.max(1, rect.width);
    view.h = Math.max(1, rect.height);
    view.ox = (padL - padR) / 2;
    view.oy = (padT - padB) / 2;
    view.cx = rect.left + rect.width / 2 + view.ox;
    view.cy = rect.top + rect.height / 2 + view.oy;
    view.iw = img.offsetWidth;
    view.ih = img.offsetHeight;
    viewOk = view.iw > 1 && view.ih > 1;
    return viewOk;
  }

  function syncButtons() {
    if (zoomOut) zoomOut.disabled = target.scale <= 1.02;
    if (zoomIn) zoomIn.disabled = target.scale >= ZOOM_MAX - 0.02;
    if (resetBtn) resetBtn.disabled = target.scale <= 1.02 && Math.abs(target.x) < 0.5 && Math.abs(target.y) < 0.5;
  }

  function paint() {
    const zoomed = isZoomed();
    const anim = raf !== 0;
    if (zoomed !== shownZoomed) { box.classList.toggle("lb-zoomed", zoomed); shownZoomed = zoomed; }
    if (dragging !== shownDrag) { box.classList.toggle("lb-dragging", dragging); shownDrag = dragging; }
    if (anim !== shownAnim) { box.classList.toggle("lb-anim", anim); shownAnim = anim; }
    if (state.scale <= 1.001 && Math.abs(state.x) < 0.2 && Math.abs(state.y) < 0.2) img.style.transform = "";
    else img.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
    syncButtons();
  }

  function cancelAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (shownAnim) { box.classList.remove("lb-anim"); shownAnim = false; }
  }

  function tick(ts) {
    if (hold) { raf = 0; if (shownAnim) { box.classList.remove("lb-anim"); shownAnim = false; } return; }
    const dt = lastTs ? Math.min(34, ts - lastTs) : 16;
    lastTs = ts;
    const alpha = 1 - Math.exp(-dt / TAU_MS);
    state.scale += (target.scale - state.scale) * alpha;
    state.x += (target.x - state.x) * alpha;
    state.y += (target.y - state.y) * alpha;
    const c = clampPan(state.scale, state.x, state.y, view);
    state.scale = c.scale;
    state.x = c.x;
    state.y = c.y;
    const done = Math.abs(target.scale - state.scale) < 0.0008
      && Math.abs(target.x - state.x) < 0.15
      && Math.abs(target.y - state.y) < 0.15;
    if (done) {
      const snapped = clampPan(target.scale, target.x, target.y, view);
      state.scale = target.scale = snapped.scale;
      state.x = target.x = snapped.x;
      state.y = target.y = snapped.y;
      raf = 0;
      paint();
      return;
    }
    paint();
    raf = requestAnimationFrame(tick);
  }

  function kick() {
    syncButtons();
    const zoomed = isZoomed();
    if (zoomed !== shownZoomed) { box.classList.toggle("lb-zoomed", zoomed); shownZoomed = zoomed; }
    if (raf) return;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
    if (!shownAnim) { box.classList.add("lb-anim"); shownAnim = true; }
  }

  function setTarget(next, animate) {
    target.scale = next.scale;
    target.x = next.x;
    target.y = next.y;
    if (!animate || prefersReduced()) {
      cancelAnim();
      state.scale = next.scale;
      state.x = next.x;
      state.y = next.y;
      paint();
      return;
    }
    kick();
  }

  function reset(animate = true) {
    pointers.clear();
    dragging = false;
    dragMoved = false;
    gesture = false;
    hold = false;
    pinch = null;
    activePointer = null;
    dragOrigin = null;
    if (box.hidden) viewOk = false;
    else if (animate) measure();
    setTarget({ scale: ZOOM_MIN, x: 0, y: 0 }, animate);
  }

  function zoomBy(factor) {
    if (!enabled() || !measure()) return;
    setTarget(zoomAround(target, 0, 0, target.scale * factor, view), true);
  }

  function zoomAt(clientX, clientY, scale) {
    if (!enabled() || !measure()) return;
    setTarget(zoomAround(target, clientX - view.cx, clientY - view.cy, scale, view), true);
  }

  function fromUi(targetEl) {
    const el = targetEl && targetEl.nodeType === 1 ? targetEl : targetEl?.parentElement;
    return !!(el && el.closest && el.closest(".lb-tools, #lightboxSave, #lightboxVideo, .lb-note"));
  }

  function beginDrag(e) {
    hold = true;
    cancelAnim();
    dragging = true;
    dragMoved = false;
    activePointer = e.pointerId;
    target.scale = state.scale;
    target.x = state.x;
    target.y = state.y;
    dragOrigin = { x: e.clientX, y: e.clientY, sx: state.x, sy: state.y };
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
    paint();
  }

  function onPointerDown(e) {
    if (e.pointerType) imageTapCloses = e.pointerType === "touch";
    if (!enabled() || fromUi(e.target)) return;
    if (e.button != null && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      dragging = false;
      activePointer = null;
      hold = true;
      cancelAnim();
      box.classList.remove("lb-dragging");
      shownDrag = false;
      if (!measure()) return;
      const pts = [...pointers.values()];
      pinch = {
        dist: Math.max(8, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
        scale: state.scale,
        x: state.x,
        y: state.y,
      };
      try { box.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    if (isZoomed()) beginDrag(e);
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2 && pinch && enabled()) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      if (Math.abs(d - pinch.dist) > 2 || Math.hypot(midX - pinch.midX, midY - pinch.midY) > 2) gesture = true;
      const zoomed = zoomAround(
        { scale: pinch.scale, x: pinch.x, y: pinch.y },
        pinch.midX - view.cx,
        pinch.midY - view.cy,
        pinch.scale * (Math.max(8, d) / pinch.dist),
        view
      );
      const moved = clampPan(zoomed.scale, zoomed.x + (midX - pinch.midX), zoomed.y + (midY - pinch.midY), view);
      state.scale = target.scale = moved.scale;
      state.x = target.x = moved.x;
      state.y = target.y = moved.y;
      paint();
      return;
    }
    if (!dragging || e.pointerId !== activePointer || !dragOrigin) return;
    if (e.pointerType === "mouse" && e.buttons === 0) { onPointerUp(e); return; }
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (dx * dx + dy * dy > 36) dragMoved = true;
    const next = clampPan(state.scale, dragOrigin.sx + dx, dragOrigin.sy + dy, view);
    state.x = target.x = next.x;
    state.y = target.y = next.y;
    paint();
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId) && e.pointerId !== activePointer) return;
    pointers.delete(e.pointerId);
    if (e.pointerId === activePointer) {
      dragging = false;
      activePointer = null;
      dragOrigin = null;
      box.classList.remove("lb-dragging");
      shownDrag = false;
    }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1 && isZoomed()) {
      const [id, p] = [...pointers.entries()][0];
      hold = true;
      dragging = true;
      dragMoved = true;
      activePointer = id;
      dragOrigin = { x: p.x, y: p.y, sx: state.x, sy: state.y };
      box.classList.add("lb-dragging");
      shownDrag = true;
      return;
    }
    if (pointers.size === 0) {
      hold = false;
      if (dragMoved || gesture) {
        swallowUntil = performance.now() + 400;
        dragMoved = false;
        gesture = false;
      } else if (enabled()) {
        const now = performance.now();
        const near = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 48;
        if (lastTapAt && now - lastTapAt < 650 && near && (target.scale > 1.02 || e.pointerType !== "touch")) {
          lastTapAt = 0;
          toggleAt(e.clientX, e.clientY);
        } else {
          lastTapAt = now;
          lastTapX = e.clientX;
          lastTapY = e.clientY;
        }
      }
    }
  }

  function onWheel(e) {
    if (!enabled()) return;
    e.preventDefault();
    if (hold || !measure()) return;
    const next = zoomAround(
      target,
      e.clientX - view.cx,
      e.clientY - view.cy,
      target.scale * wheelFactor(e.deltaY, e.deltaMode),
      view
    );
    setTarget(next, true);
  }

  /* 放大後會 setPointerCapture，雙擊事件的目標會變成燈箱而不是圖片。
     所以雙擊聽在燈箱上，並且用兩次 pointerup 自己再認一次。 */
  function toggleAt(x, y) {
    const now = performance.now();
    if (now - lastToggleAt < 450) return;
    lastToggleAt = now;
    if (target.scale > 1.02) reset(true);
    else zoomAt(x, y, ZOOM_DOUBLE);
  }

  function onDouble(e) {
    if (!enabled() || fromUi(e.target)) return;
    const onImage = e.target === img || (img.contains && img.contains(e.target));
    if (target.scale <= 1.02 && !onImage) return;
    e.preventDefault();
    toggleAt(e.clientX, e.clientY);
  }

  function bindPress(btn, fn) {
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  }

  bindPress(zoomIn, () => zoomBy(ZOOM_STEP));
  bindPress(zoomOut, () => zoomBy(1 / ZOOM_STEP));
  bindPress(resetBtn, () => reset(true));

  box.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  box.addEventListener("wheel", onWheel, { passive: false });
  box.addEventListener("dblclick", onDouble);
  img.addEventListener("dragstart", (e) => e.preventDefault());
  /* 全站在 document 上擋了雙指縮放。燈箱這層先攔下來，圖片自己的雙指才收得到。
     單指、以及影片模式，都讓事件繼續往上，外面的手勢維持原樣。 */
  box.addEventListener("touchmove", (e) => {
    if (!enabled()) return;
    if (e.touches.length > 1 || dragging) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  for (const type of ["gesturestart", "gesturechange"]) {
    box.addEventListener(type, (e) => {
      if (!enabled()) return;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }
  window.addEventListener("resize", () => {
    viewOk = false;
    if (box.hidden || !measure()) return;
    const next = clampPan(target.scale, target.x, target.y, view);
    state.scale = target.scale = next.scale;
    state.x = target.x = next.x;
    state.y = target.y = next.y;
    paint();
  });
  img.addEventListener("load", () => {
    if (box.hidden) return;
    const prevW = view.iw, prevH = view.ih;
    viewOk = false;
    if (!measure()) return;
    if (prevW === view.iw && prevH === view.ih) return;
    setTarget(clampPan(target.scale, target.x, target.y, view), false);
  });

  paint();

  return {
    reset,
    isZoomed,
    swallowClick() {
      if (performance.now() > swallowUntil) return false;
      swallowUntil = 0;
      return true;
    },
    tapClosesImage() { return imageTapCloses; },
  };
}
