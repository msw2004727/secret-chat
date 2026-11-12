/* Bobo：白色圓滾玩偶，跟貓和公雞站在同一層地板上。只在這台瀏覽器裡跑。
   跟著「聊天室貓咪與趣味特效」開關。配件畫法留在 bobo.js，預設不戴。 */
import { Bobo } from "./bobo.js";
import { Rooster } from "./rooster.js";

export function attachBobo(api) {
  const BW = Bobo.W, BH = Bobo.H;
  const layer = api.layer;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DUR = { wave: 1600, jump: 1150, sit: 700, blink: 380, tap: 900 };

  function scale() {
    const stand = Rooster.STATS.roosterBody.heightToComb * Rooster.STATS.roosterBody.drawScale;
    return (stand * api.S() * (2 / 3)) / Bobo.STATS.standH;
  }

  const wrap = document.createElement("div");
  wrap.className = "bobo";
  wrap.setAttribute("aria-hidden", "true");
  const cv = document.createElement("canvas");
  wrap.appendChild(cv);
  const shadow = document.createElement("i");
  shadow.className = "bobo-shadow";
  wrap.appendChild(shadow);
  layer.appendChild(wrap);

  const bobo = {
    x: 0, dir: 1, action: "idle", local: 0, acc: "none",
    actionT0: 0, actionDur: 0, walkUntil: 0, nextThink: 0,
    blink: 0, blinkUntil: 0, roam: true, holdSit: false,
  };
  let lastPose = Bobo.makePose("idle", 0, { time: 0, dir: 1, acc: "none" });
  let placed = false;

  function maxX() { return Math.max(0, api.areaW() - BW * scale()); }
  function place() {
    if (placed || api.areaW() < 40) return;
    bobo.x = Math.min(maxX(), api.areaW() * 0.28);
    placed = true;
  }

  function setAction(name, keepRoam) {
    bobo.action = name;
    bobo.local = 0;
    bobo.actionT0 = performance.now();
    bobo.actionDur = DUR[name] || 0;
    bobo.holdSit = name === "sit";
    if (!keepRoam && name !== "idle") bobo.roam = false;
    if (name === "tap") hearts();
  }

  function hearts() {
    const s = scale();
    for (let i = 0; i < 4; i++) {
      const h = document.createElement("i");
      h.className = "bobo-heart";
      h.style.left = (bobo.x + 12 * s + (Math.random() - 0.5) * 16) + "px";
      h.style.bottom = ((BH - 6) * s + Math.random() * 14) + "px";
      layer.appendChild(h);
      setTimeout(() => h.remove(), 1100);
    }
  }

  function think(now) {
    if (!bobo.roam) return;
    if (bobo.actionDur && now - bobo.actionT0 < bobo.actionDur) return;
    if (now < bobo.nextThink) return;
    const roll = Math.random();
    if (roll < 0.30) {
      bobo.action = "idle"; bobo.actionDur = 0; bobo.holdSit = false;
      bobo.nextThink = now + rand(900, 2200);
    } else if (roll < 0.62) {
      if (bobo.x <= 8) bobo.dir = 1;
      else if (bobo.x >= maxX() - 8) bobo.dir = -1;
      else bobo.dir = Math.random() < 0.5 ? -1 : 1;
      bobo.action = "walk"; bobo.actionDur = 0; bobo.holdSit = false;
      bobo.walkUntil = now + rand(900, 2400);
      bobo.nextThink = bobo.walkUntil + 80;
    } else if (roll < 0.74) { setAction("wave", true); bobo.nextThink = now + DUR.wave + rand(300, 800); }
    else if (roll < 0.86) { setAction("jump", true); bobo.nextThink = now + DUR.jump + rand(400, 900); }
    else if (roll < 0.94) { setAction("sit", true); bobo.nextThink = now + DUR.sit + rand(1200, 2200); }
    else { setAction("blink", true); bobo.nextThink = now + DUR.blink + rand(200, 500); }
  }

  let lastNow = performance.now();
  function step(now) {
    if (!api.enabled()) { wrap.hidden = true; return; }
    wrap.hidden = false;
    place();
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (now > bobo.blinkUntil) {
      if (bobo.blink > 0) { bobo.blink = 0; bobo.blinkUntil = now + rand(1800, 4200); }
      else { bobo.blink = 1; bobo.blinkUntil = now + 130; }
    }
    think(now);
    if (bobo.actionDur && now - bobo.actionT0 >= bobo.actionDur) {
      bobo.actionDur = 0;
      if (bobo.action === "sit" && (bobo.holdSit || bobo.roam)) bobo.local = 1;
      else if (bobo.roam) { bobo.action = "idle"; bobo.holdSit = false; bobo.local = 0; bobo.nextThink = now + rand(200, 600); }
      else if (bobo.action !== "walk" && bobo.action !== "idle" && bobo.action !== "sit") bobo.action = "idle";
    }
    if (bobo.action === "walk") {
      bobo.x += bobo.dir * 32 * dt;
      if (bobo.x <= 0) { bobo.x = 0; bobo.dir = 1; }
      if (bobo.x >= maxX()) { bobo.x = maxX(); bobo.dir = -1; }
      bobo.local = (bobo.local + dt / 0.48) % 1;
      if (!bobo.roam && now >= (bobo.walkUntil || 0)) bobo.action = "idle";
    } else if (bobo.actionDur) bobo.local = clamp((now - bobo.actionT0) / bobo.actionDur, 0, 1);
    else if (bobo.action !== "sit") bobo.local = 0;

    const pose = Bobo.makePose(bobo.action || "idle", bobo.local, {
      time: now, dir: bobo.dir, blink: bobo.action === "blink" ? bobo.local : bobo.blink, acc: bobo.acc || "none",
    });
    lastPose = pose;
    paint(pose);
  }

  function paint(pose) {
    const s = scale();
    const cssW = BW * s, cssH = BH * s;
    wrap.style.width = cssW + "px";
    wrap.style.height = cssH + "px";
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const pw = Math.max(1, Math.round(cssW * dpr)), ph = Math.max(1, Math.round(cssH * dpr));
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const c = cv.getContext("2d");
    c.setTransform(pw / BW, 0, 0, ph / BH, 0, 0);
    c.clearRect(0, 0, BW, BH);
    Bobo.draw(c, pose);
    wrap.style.transform = "translate3d(" + bobo.x.toFixed(1) + "px,0,0)";
    shadow.style.opacity = String(pose.lift > 0.4 ? 0.28 : 0.4);
  }

  function hit(clientX, clientY) {
    const chatR = api.chatR();
    if (!chatR || wrap.hidden) return false;
    const box = Bobo.hitLocal(lastPose);
    const s = scale();
    const x = clientX - chatR.left, y = clientY - chatR.top;
    const t = api.floorY() - BH * s;
    return x >= bobo.x + box.x0 * s && x <= bobo.x + box.x1 * s && y >= t + box.y0 * s && y <= t + box.y1 * s;
  }

  api.scrollEl.addEventListener("pointerdown", (e) => {
    if (!api.enabled()) return;
    if (e.target.closest("button, a, input, textarea, .c-input")) return;
    if (hit(e.clientX, e.clientY)) setAction("tap", true);
  });

  return {
    step,
    shift() {},
    setAction,
    hide() { wrap.hidden = true; },
    get bobo() { return bobo; },
  };
}
