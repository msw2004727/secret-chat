/* 黑羽土雞公雞。只在這台瀏覽器裡跑，跟貓共用 #cats 這一層，不上傳。
   預設跟著「聊天室貓咪與趣味特效」：那顆開關開著雞就在，關掉雞也收掉。
   現在沒有分貓種的開關，所以雞不另外做一顆。 */
import { Rooster } from "./rooster.js";

export function attachRooster(api) {
  const RW = Rooster.W, RH = Rooster.H;
  const layer = api.layer;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DUR = { peck: 1100, crow: 1800, flap: 1250, scratch: 1400, tap: 900 };

  const wrap = document.createElement("div");
  wrap.className = "rooster";
  wrap.setAttribute("aria-hidden", "true");
  const cv = document.createElement("canvas");
  wrap.appendChild(cv);
  const shadow = document.createElement("i");
  shadow.className = "rooster-shadow";
  wrap.appendChild(shadow);
  const say = document.createElement("span");
  say.className = "rooster-say";
  say.textContent = "咕咕";
  wrap.appendChild(say);
  layer.appendChild(wrap);

  const rooster = {
    x: 0, feetY: 0, dir: 1, action: "idle", local: 0,
    actionT0: 0, actionDur: 0, walkUntil: 0, nextThink: 0,
    vx: 0, blink: 0, blinkUntil: 0, roam: true,
    perch: null, perchUntil: 0, flight: null,
  };
  let lastPose = Rooster.makePose("idle", 0, { time: 0, dir: 1 });
  let lastDust = 0;

  function S() { return api.S(); }
  function floorY() { return api.floorY(); }
  function areaW() { return api.areaW(); }
  function maxX() { return Math.max(0, areaW() - RW * S()); }

  function shift(dy) {
    if (!dy || !rooster.flight) return;
    rooster.flight.fromY += dy;
    rooster.flight.toY += dy;
    rooster.feetY += dy;
  }

  function catBlock() {
    let hi = 0;
    for (const c of api.cats) {
      if (!c || c.hidden) continue;
      hi = Math.max(hi, (c.x || 0) + 32 * S());
    }
    return hi;
  }

  function walkBounds() {
    if (rooster.perch && !rooster.flight) {
      const p = rooster.perch;
      const pad = 4;
      const span = Math.max(0, p.width - RW * S());
      return { lo: p.left + pad, hi: p.left + Math.min(span, p.width - pad) - 2 };
    }
    return { lo: 8, hi: maxX() };
  }

  function measure(el) {
    if (!el || !el.isConnected || !api.chatR()) return null;
    const chatR = api.chatR();
    const r = el.getBoundingClientRect();
    const sr = api.scrollEl.getBoundingClientRect();
    const row = el.closest(".row");
    return {
      el,
      side: row && row.classList.contains("me") ? "right" : "left",
      top: r.top - chatR.top,
      left: r.left - chatR.left,
      width: r.width,
      height: r.height,
      visible: r.bottom > sr.top + 8 && r.top < sr.bottom - 8,
      gap: floorY() - (r.top - chatR.top),
    };
  }

  function listPerches() {
    return [...api.msgList.querySelectorAll(".bub")]
      .filter((el) => !api.everDrooped(el))
      .map(measure)
      .filter(Boolean);
  }

  function perchClear(p, all, landX) {
    const x0 = landX, x1 = landX + RW * S() * 0.72;
    for (const o of all) {
      if (o.el === p.el) continue;
      if (o.top + o.height < p.top - 4) continue;
      if (o.top > p.top + 18) continue;
      if (o.left < x1 && o.left + o.width > x0) return false;
    }
    return true;
  }

  function perchFootX(p, all) {
    const samples = [p.left + 10, p.left + p.width * 0.5 - RW * S() * 0.5, p.left + p.width - RW * S() - 8];
    const ok = samples.find((sx) => perchClear(p, all, sx));
    return ok != null ? ok : p.left + 8;
  }

  function syncPerch() {
    if (!rooster.perch || rooster.flight) return;
    const p = measure(rooster.perch.el);
    if (!p || p.gap < 8) { rooster.perch = null; rooster.feetY = floorY(); return; }
    rooster.perch = p;
    rooster.feetY = p.top + 1;
    const b = walkBounds();
    rooster.x = clamp(rooster.x, b.lo, Math.max(b.lo, b.hi));
  }

  function beginFlight(toX, toY, opts) {
    const now = performance.now();
    const fromX = rooster.x, fromY = rooster.feetY;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const dur = clamp(680 + dist * 1.15, 820, 1250);
    if (toX > fromX + 2) rooster.dir = 1;
    else if (toX < fromX - 2) rooster.dir = -1;
    rooster.flight = {
      fromX, fromY, toX, toY, t0: now, dur,
      arc: opts.arc != null ? opts.arc : clamp(Math.abs(toY - fromY) * 0.42 + 24, 28, 74),
      land: opts.land || "floor",
      perch: opts.perch || null,
      xEase: opts.xEase || 0,
      yDelay: opts.yDelay || 0,
    };
    rooster.action = "perchJump";
    rooster.local = 0;
    rooster.actionT0 = now;
    rooster.actionDur = dur;
  }

  function pickPerch() {
    const all = listPerches();
    let cands = all.filter((p) => p.width >= 44 && p.gap >= 26 && p.gap <= 260 && p.visible);
    if (!cands.length) return null;
    cands.sort((a, b) => Math.abs((a.left + a.width / 2) - (rooster.x + RW * S() / 2)) - Math.abs((b.left + b.width / 2) - (rooster.x + RW * S() / 2)));
    return cands[0];
  }

  function jumpOntoBubble() {
    if (rooster.flight) return false;
    if (rooster.perch) return hopDown();
    const p = pickPerch();
    if (!p) return false;
    const all = listPerches();
    beginFlight(perchFootX(p, all), p.top + 1, { perch: p, land: "bubble" });
    return true;
  }

  function hopDown() {
    if (rooster.flight || !rooster.perch) return false;
    const dest = clamp(rooster.x, Math.min(maxX(), catBlock() + 8), maxX());
    const drop = Math.max(24, floorY() - rooster.feetY);
    beginFlight(dest, floorY(), { land: "floor", arc: clamp(drop * 0.35 + 28, 34, 70), xEase: 0.7, yDelay: 0.22 });
    return true;
  }

  function landFlight() {
    const f = rooster.flight;
    rooster.flight = null;
    rooster.actionDur = 0;
    rooster.local = 0;
    if (f && f.land === "bubble" && f.perch && f.perch.el && f.perch.el.isConnected) {
      rooster.perch = f.perch;
      syncPerch();
      rooster.perchUntil = performance.now() + rand(2400, 4300);
    } else {
      rooster.perch = null;
      rooster.feetY = floorY();
    }
    rooster.action = "idle";
  }

  function burst(now) {
    say.hidden = false;
    say.classList.remove("show");
    void say.offsetWidth;
    say.classList.add("show");
    for (let i = 0; i < 2; i++) notes.push({ t0: now + i * 160 });
    for (let i = 0; i < 4; i++) {
      const h = document.createElement("i");
      h.className = "rooster-heart";
      h.style.left = (rooster.x + RW * S() * 0.7 + rand(-8, 10)) + "px";
      h.style.bottom = (floorY() - rooster.feetY + RH * S() * 0.55 + rand(0, 16)) + "px";
      layer.appendChild(h);
      setTimeout(() => h.remove(), 1100);
    }
  }

  function crow() {
    say.hidden = false;
    say.classList.add("show");
    for (let i = 0; i < 2; i++) {
      const n = document.createElement("i");
      n.className = "rooster-note";
      n.textContent = "♪";
      n.style.left = (rooster.x + RW * S() * 0.72 + i * 14) + "px";
      n.style.bottom = (floorY() - rooster.feetY + RH * S() * 0.82 + i * 10) + "px";
      layer.appendChild(n);
      setTimeout(() => n.remove(), 1100);
    }
    setTimeout(() => say.classList.remove("show"), 1300);
  }

  function setAction(name) {
    if (rooster.flight) return;
    if (name === "scratch" && rooster.perch) name = "peck";
    rooster.action = name;
    rooster.actionT0 = performance.now();
    rooster.actionDur = DUR[name] || 0;
    rooster.local = 0;
    rooster.vx = 0;
    if (name === "tap") burst(rooster.actionT0);
    if (name === "crow") crow();
  }

  function think(now) {
    if (!rooster.roam || rooster.flight) return;
    if (rooster.actionDur && now - rooster.actionT0 < rooster.actionDur) return;
    if (now < rooster.nextThink) return;
    const roll = Math.random();
    if (rooster.perch) {
      if (now >= rooster.perchUntil) { hopDown(); rooster.nextThink = now + rand(400, 900); return; }
      if (roll < 0.4) { rooster.dir = Math.random() < 0.5 ? -1 : 1; rooster.action = "walk"; rooster.walkUntil = now + rand(700, 1500); rooster.nextThink = rooster.walkUntil; }
      else if (roll < 0.7) { rooster.action = "idle"; rooster.vx = 0; rooster.nextThink = now + rand(700, 1400); }
      else if (roll < 0.88) setAction("peck");
      else setAction("crow");
      return;
    }
    if (roll < 0.34) { rooster.action = "idle"; rooster.vx = 0; rooster.nextThink = now + rand(800, 1800); if (Math.random() < 0.35) setAction("peck"); }
    else if (roll < 0.62) {
      const b = walkBounds();
      if (rooster.x < b.lo + 12) rooster.dir = 1;
      else if (rooster.x > b.hi - 12) rooster.dir = -1;
      else rooster.dir = Math.random() < 0.5 ? -1 : 1;
      rooster.action = "walk";
      rooster.walkUntil = now + rand(900, 2000);
      rooster.nextThink = rooster.walkUntil;
    } else if (roll < 0.74) setAction("scratch");
    else if (roll < 0.84) setAction("flap");
    else if (roll < 0.92) setAction("crow");
    else { if (!jumpOntoBubble()) rooster.nextThink = now + 800; else rooster.nextThink = now + 1200; }
  }

  let lastNow = performance.now();
  function step(now) {
    if (!api.enabled()) { wrap.hidden = true; return; }
    wrap.hidden = false;
    place();
    if (!rooster.feetY) rooster.feetY = floorY();
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (now > rooster.blinkUntil) {
      if (rooster.blink > 0) { rooster.blink = 0; rooster.blinkUntil = now + rand(1800, 4200); }
      else { rooster.blink = 1; rooster.blinkUntil = now + 120; }
    }
    if (rooster.flight) {
      const f = rooster.flight;
      const t = clamp((now - f.t0) / f.dur, 0, 1);
      const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
      const tX = f.xEase ? clamp(t / f.xEase, 0, 1) : t;
      const tY = f.yDelay ? clamp((t - f.yDelay) / (1 - f.yDelay), 0, 1) : t;
      const arc = Math.sin(Math.PI * t) * f.arc;
      rooster.x = f.fromX + (f.toX - f.fromX) * ease(tX);
      rooster.feetY = f.fromY + (f.toY - f.fromY) * ease(tY) - arc;
      rooster.local = t;
      if (t >= 1) landFlight();
    } else {
      syncPerch();
      if (!rooster.perch) rooster.feetY = floorY();
      think(now);
      if (rooster.actionDur && now - rooster.actionT0 >= rooster.actionDur) {
        rooster.actionDur = 0;
        rooster.local = 0;
        rooster.action = "idle";
        rooster.nextThink = now + rand(200, 600);
      }
      if (rooster.action === "walk") {
        rooster.x += rooster.dir * (rooster.perch ? 26 : 36) * dt;
        const b = walkBounds();
        if (rooster.x <= b.lo) { rooster.x = b.lo; rooster.dir = 1; }
        if (rooster.x >= b.hi) { rooster.x = b.hi; rooster.dir = -1; }
        rooster.local = (rooster.local + dt / 0.42) % 1;
        if (now >= (rooster.walkUntil || 0)) { rooster.action = "idle"; }
      } else if (rooster.actionDur) rooster.local = clamp((now - rooster.actionT0) / rooster.actionDur, 0, 1);
      else rooster.local = 0;
    }
    const visual = rooster.flight ? "flap" : (rooster.action === "perchJump" ? "idle" : rooster.action);
    const pose = Rooster.makePose(visual || "idle", rooster.local, { time: now, dir: rooster.dir, blink: rooster.blink });
    if (rooster.flight) pose.lift = 0;
    lastPose = pose;
    paint(pose, now);
    if (!rooster.flight && ((rooster.action === "peck" && rooster.local > 0.2 && rooster.local < 0.55) || (rooster.action === "scratch" && rooster.local > 0.15))) {
      if (now - lastDust > 120) { lastDust = now; dust(now); }
    }
  }

  function dust(now) {
    const d = document.createElement("i");
    d.className = "rooster-dust";
    d.style.left = (rooster.x + (rooster.dir < 0 ? 8 : 22) * S()) + "px";
    d.style.bottom = (floorY() - rooster.feetY + 2) + "px";
    layer.appendChild(d);
    setTimeout(() => d.remove(), 500);
    void now;
  }

  function paint(pose, now) {
    const s = S();
    const cssW = RW * s, cssH = RH * s;
    wrap.style.width = cssW + "px";
    wrap.style.height = cssH + "px";
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const pw = Math.max(1, Math.round(cssW * dpr)), ph = Math.max(1, Math.round(cssH * dpr));
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const c = cv.getContext("2d");
    c.setTransform(pw / RW, 0, 0, ph / RH, 0, 0);
    c.clearRect(0, 0, RW, RH);
    Rooster.draw(c, pose, now);
    const lift = floorY() - rooster.feetY;
    wrap.style.transform = "translate3d(" + rooster.x.toFixed(1) + "px," + (-lift).toFixed(1) + "px,0)";
    shadow.style.opacity = String(rooster.perch || rooster.flight ? 0.25 : 0.45);
  }

  function hit(clientX, clientY) {
    const chatR = api.chatR();
    if (!chatR || wrap.hidden) return false;
    const x = clientX - chatR.left, y = clientY - chatR.top;
    const box = Rooster.hitLocal(lastPose);
    let x0 = box.x0, x1 = box.x1;
    if (lastPose.dir < 0) { x0 = RW - box.x1; x1 = RW - box.x0; }
    const s = S();
    const l = rooster.x, t = rooster.feetY - RH * s;
    return x >= l + x0 * s && x <= l + x1 * s && y >= t + box.y0 * s && y <= t + box.y1 * s;
  }

  api.scrollEl.addEventListener("pointerdown", (e) => {
    if (!api.enabled()) return;
    if (e.target.closest("button, a, input, textarea, .c-input")) return;
    if (hit(e.clientX, e.clientY)) setAction("tap");
  });

  let placed = false;
  const place = () => {
    if (placed || areaW() < 40) return;
    rooster.x = Math.min(maxX(), areaW() * 0.46);
    placed = true;
  };
  return {
    step, shift, jumpOntoBubble, hopDown, setAction,
    hide() { wrap.hidden = true; },
    get rooster() { return rooster; },
  };
}
