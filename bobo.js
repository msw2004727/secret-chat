/* Bobo：單一剪影（靈感來自 Dinotaeng 玩偶）。
   耳朵、手臂、腳和身體是同一條外輪廓，沒有接縫或內部描邊。
   座標：格為單位，腳底 y = FY。呼叫前先 ctx.scale。 */
const Bobo = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  /* 稍寬近正方形的剪影；站高 24 格（右耳尖到腳底） */
  const W = 26, H = 24, FY = 24;

  const C = {
    fur: "#ffffff",
    edge: "rgba(120,118,114,.55)",
    eye: "#141414",
    mouth: "#141414",
    hat: "#4e8f46",
    hatD: "#3a6d35",
    hatL: "#6aad5f",
    bag: "#d53636",
    bagD: "#a82828",
    bagL: "#ef5a55",
    strap: "#c43030",
    santa: "#e03a3a",
    santaD: "#b82828",
    santaL: "#f06060",
    trim: "#f4f4f2"
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = (x, y) => ({ x, y });

  function copyMarks(m) {
    const o = {};
    for (const k of Object.keys(m)) o[k] = P(m[k].x, m[k].y);
    return o;
  }

  /* 依參考照片描的單一剪影錨點（順時針，從兩耳中間凹處出發） */
  function baseMarks() {
    return {
      /* 兩耳之間是淺淺的 U 形凹，不要變成 V；耳朵更圓 */
      valley: P(12.35, 2.05),
      lEarInner: P(9.85, 1.95),
      lEarTipR: P(7.85, 1.25),
      lEarTip: P(6.25, 1.35),
      lEarTipL: P(4.65, 2.05),
      lEarLeft: P(3.8, 4.15),
      lEarLow: P(5.05, 6.55),
      headL: P(5.55, 8.15),
      /* 腋下要淺，手臂是厚圓的掌，略略朝上，不要細翅 */
      lArmpitTop: P(5.85, 8.85),
      lArmUp: P(3.55, 8.45),
      lArmTipU: P(1.65, 9.05),
      lArmTip: P(1.15, 10.55),
      lArmTipD: P(1.75, 12.15),
      lArmDn: P(3.85, 13.05),
      lArmpitDn: P(6.15, 13.45),
      lSide: P(6.15, 14.55),
      waistL: P(5.75, 16.45),
      lHip: P(5.45, 18.45),
      lFootOut: P(4.95, 20.55),
      lFootBotL: P(6.05, 23.35),
      lFootBot: P(8.35, 24.0),
      lFootBotR: P(10.85, 23.55),
      /* 腳底中間只是淺淺一道 U */
      notch: P(13.0, 22.95),
      rFootBotL: P(15.15, 23.55),
      rFootBot: P(17.75, 24.0),
      rFootBotR: P(20.05, 23.3),
      rFootOut: P(21.15, 20.4),
      rHip: P(20.6, 18.25),
      rArmpitDn: P(19.85, 13.25),
      rSide: P(19.9, 14.4),
      waistR: P(20.3, 16.3),
      rArmDn: P(22.25, 12.85),
      rArmTipD: P(24.25, 12.0),
      rArmTip: P(24.85, 10.35),
      rArmTipU: P(24.25, 8.75),
      rArmUp: P(22.45, 8.15),
      rArmpitTop: P(20.15, 8.55),
      headR: P(20.55, 7.35),
      rEarLow: P(20.85, 5.65),
      rEarRight: P(21.55, 3.25),
      rEarTipR: P(20.45, 0.85),
      rEarTip: P(18.25, 0.15),
      rEarTipL: P(16.15, 0.65),
      rEarInner: P(14.45, 1.95)
    };
  }

  const ORDER = [
    "valley", "lEarInner", "lEarTipR", "lEarTip", "lEarTipL", "lEarLeft", "lEarLow", "headL",
    "lArmpitTop", "lArmUp", "lArmTipU", "lArmTip", "lArmTipD", "lArmDn", "lArmpitDn",
    "lSide", "waistL", "lHip", "lFootOut", "lFootBotL", "lFootBot", "lFootBotR", "notch",
    "rFootBotL", "rFootBot", "rFootBotR", "rFootOut", "rHip", "waistR", "rSide",
    "rArmpitDn", "rArmDn", "rArmTipD", "rArmTip", "rArmTipU", "rArmUp", "rArmpitTop",
    "headR", "rEarLow", "rEarRight", "rEarTipR", "rEarTip", "rEarTipL", "rEarInner"
  ];

  const ARM_L = ["lArmUp", "lArmTipU", "lArmTip", "lArmTipD", "lArmDn"];
  const ARM_R = ["rArmDn", "rArmTipD", "rArmTip", "rArmTipU", "rArmUp"];
  const LEG_L = ["lHip", "lFootOut", "lFootBotL", "lFootBot", "lFootBotR"];
  const LEG_R = ["rFootBotL", "rFootBot", "rFootBotR", "rFootOut", "rHip"];

  function rotateAround(p, o, ang) {
    const dx = p.x - o.x, dy = p.y - o.y;
    const c = Math.cos(ang), s = Math.sin(ang);
    return P(o.x + dx * c - dy * s, o.y + dx * s + dy * c);
  }
  function shiftKeys(m, keys, dx, dy) {
    for (const k of keys) { m[k].x += dx; m[k].y += dy; }
  }
  function rotateKeys(m, keys, origin, ang) {
    for (const k of keys) m[k] = rotateAround(m[k], origin, ang);
  }
  function scaleKeys(m, keys, origin, sx, sy) {
    for (const k of keys) {
      m[k].x = origin.x + (m[k].x - origin.x) * sx;
      m[k].y = origin.y + (m[k].y - origin.y) * sy;
    }
  }

  function smoothPath(ctx, pts, close) {
    if (!pts.length) return;
    const n = pts.length;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
      if (!close && i === n - 2) break;
    }
    if (close) ctx.closePath();
  }

  function makePose(action, local, opts) {
    opts = opts || {};
    const u = clamp(local || 0, 0, 1);
    const t = opts.time || 0;
    const p = {
      action,
      local: u,
      acc: opts.acc || "none",
      dir: opts.dir == null ? 1 : opts.dir,
      blink: opts.blink || 0,
      tilt: 0,
      squashX: 1,
      squashY: 1,
      bob: 0,
      lift: 0,
      sit: 0,
      armL: 0,
      armR: 0,
      turn: 0
    };
    const breathe = Math.sin(t * 0.0032);

    if (action === "idle" || action === "blink") {
      p.squashY = 1 + breathe * 0.03;
      p.squashX = 1 - breathe * 0.025;
      p.bob = breathe * 0.08;
      p.tilt = Math.sin(t * 0.0021) * 0.03;
      p.armL = Math.sin(t * 0.0032 + 0.4) * 0.06;
      p.armR = Math.sin(t * 0.0032 - 0.4) * 0.06;
      if (action === "blink") {
        const k = u < 0.35 ? u / 0.35 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
        p.blink = k;
      }
    } else if (action === "walk") {
      const ph = u * TAU;
      const step = Math.sin(ph);
      const squash = Math.abs(Math.cos(ph));
      p.tilt = step * 0.16;
      p.squashY = 1 - squash * 0.05;
      p.squashX = 1 + squash * 0.045;
      p.bob = Math.abs(Math.sin(ph)) * -0.12;
      p.turn = p.dir * 0.12;
      p.armL = Math.sin(ph) * 0.22;
      p.armR = -Math.sin(ph) * 0.22;
      p._leg = step;
    } else if (action === "wave") {
      p.squashY = 1 + breathe * 0.02 + Math.sin(u * TAU * 2) * 0.015;
      p.bob = Math.sin(u * TAU * 2) * 0.1;
      p.tilt = -0.06 + Math.sin(u * TAU * 2) * 0.05;
      p.armL = 0.04;
      p.armR = -1.15 + Math.sin(u * TAU * 3.2) * 0.38;
    } else if (action === "jump") {
      if (u < 0.16) {
        const k = u / 0.16;
        p.squashY = 1 - 0.18 * k;
        p.squashX = 1 + 0.16 * k;
        p.bob = 0.12 * k;
        p.armL = 0.15 * k;
        p.armR = 0.15 * k;
      } else if (u < 0.72) {
        const k = (u - 0.16) / 0.56;
        const air = Math.sin(k * Math.PI);
        p.lift = air * 5.2;
        p.squashY = 1 + 0.12 * air;
        p.squashX = 1 - 0.1 * air;
        p.armL = -0.7 * air;
        p.armR = -0.7 * air;
        p.tilt = Math.sin(k * TAU) * 0.06;
      } else {
        const k = (u - 0.72) / 0.28;
        const land = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
        p.squashY = 1 - 0.2 * land;
        p.squashX = 1 + 0.18 * land;
        p.bob = 0.16 * land;
        p.armL = 0.2;
        p.armR = 0.2;
      }
    } else if (action === "sit") {
      const k = u < 1 ? (u < 0.55 ? (u / 0.55) * (u / 0.55) : 1) : 1;
      p.sit = k;
      p.squashY = 1 - 0.08 * k + breathe * 0.015 * k;
      p.squashX = 1 + 0.12 * k - breathe * 0.012 * k;
      p.bob = 0.1 * k;
      p.armL = 0.35 * k;
      p.armR = 0.35 * k;
      p.tilt = Math.sin(t * 0.0018) * 0.025 * k;
    } else if (action === "tap") {
      const bounce = Math.sin(u * Math.PI);
      const wiggle = Math.sin(u * TAU * 3) * (1 - u);
      p.squashY = 1 + bounce * 0.08;
      p.squashX = 1 - bounce * 0.06;
      p.lift = bounce * 1.4;
      p.tilt = wiggle * 0.14;
      p.armL = -0.4 * bounce;
      p.armR = -0.4 * bounce;
    } else {
      p.squashY = 1 + breathe * 0.03;
      p.squashX = 1 - breathe * 0.024;
      p.bob = breathe * 0.08;
    }
    return p;
  }

  function deformed(p) {
    const m = copyMarks(baseMarks());
    const sit = p.sit || 0;
    const leg = p._leg || 0;

    rotateKeys(m, ARM_L, m.lArmpitTop, p.armL || 0);
    rotateKeys(m, ARM_R, m.rArmpitTop, p.armR || 0);

    if (leg) {
      const upL = Math.max(0, leg) * -0.55;
      const upR = Math.max(0, -leg) * -0.55;
      shiftKeys(m, LEG_L, leg * 0.2, upL);
      shiftKeys(m, LEG_R, -leg * 0.2, upR);
    }

    if (sit > 0.01) {
      /* 坐下：腳往兩側攤、凹處變淺，整隻變矮——還是同一條輪廓 */
      const hip = P(13, 18);
      scaleKeys(m, LEG_L.concat(["waistL", "lSide", "lArmpitDn"]), hip, 1 + 0.28 * sit, 1 - 0.12 * sit);
      scaleKeys(m, LEG_R.concat(["waistR", "rSide", "rArmpitDn"]), hip, 1 + 0.28 * sit, 1 - 0.12 * sit);
      shiftKeys(m, LEG_L, -1.1 * sit, -0.2 * sit);
      shiftKeys(m, LEG_R, 1.1 * sit, -0.2 * sit);
      m.notch.y += 0.9 * sit;
      shiftKeys(m, ["valley", "lEarInner", "lEarTip", "lEarLeft", "lEarLow", "headL",
        "rEarInner", "rEarTip", "rEarRight", "rEarLow", "headR"], 0, 1.3 * sit);
    }

    if (p.turn) {
      /* 正面微側：左邊略收、右邊略放（或相反），仍是同一條線 */
      const mid = 13;
      const k = p.turn;
      for (const key of ORDER) {
        m[key].x = mid + (m[key].x - mid) * (1 - k * 0.12 * Math.sign(m[key].x - mid || 1) * Math.sign(k));
      }
    }
    return m;
  }

  function outlinePts(p) {
    const m = deformed(p);
    return ORDER.map((k) => m[k]);
  }

  function marks(p) { return deformed(p); }

  function faceOrigin(p) {
    const m = deformed(p);
    /* 臉在頭的左上：兩耳凹處下方偏左 */
    const fx = 11.15;
    const fy = 6.55 + (p.sit || 0) * 0.15;
    return { x: fx, y: fy, m };
  }

  /* 依照片嘴形描下的封閉輪廓（格為單位，原點在嘴的中心） */
  const MOUTH = [
    P(-0.173, -1.272), P(-0.520, -1.117), P(-0.944, -0.424),
    P(-1.869, 0.039), P(-2.061, 0.231), P(-2.061, 0.617),
    P(-1.869, 0.848), P(-1.599, 0.848), P(-0.828, 0.501),
    P(-0.713, 0.308), P(-0.559, 0.347), P(-0.058, 1.040),
    P(0.482, 1.272), P(0.944, 1.233), P(1.638, 0.925),
    P(2.023, 0.617), P(2.100, 0.347), P(1.753, 0.077),
    P(1.522, 0.077), P(0.944, 0.462), P(0.482, 0.462),
    P(0.096, -0.193), P(0.212, -1.117), P(-0.135, -1.272)
  ];

  function drawMouth(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    smoothPath(ctx, MOUTH.map((q) => P(q.x * s, q.y * s)), true);
    ctx.fillStyle = C.mouth;
    ctx.fill();
    ctx.restore();
  }

  function drawFace(ctx, p) {
    const f = faceOrigin(p);
    const s = 1;
    const eyeY = f.y;
    const gap = 2.62;
    const r = 0.92;
    const blink = clamp(p.blink || 0, 0, 1);

    function eye(ex, ey, rr) {
      if (blink > 0.85) {
        ctx.strokeStyle = C.eye;
        ctx.lineWidth = 0.38;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ex - 0.7, ey);
        ctx.quadraticCurveTo(ex, ey + 0.12, ex + 0.7, ey);
        ctx.stroke();
        return;
      }
      const ry = rr * (1 - blink * 0.92);
      ctx.fillStyle = C.eye;
      ctx.beginPath();
      ctx.ellipse(ex, ey, rr, ry, 0, 0, TAU);
      ctx.fill();
    }
    /* 左眼略低、略小；右眼略高、略圓，跟照片一樣 */
    eye(f.x - gap * 0.52, eyeY + 0.18, r * 0.92);
    eye(f.x + gap * 0.52, eyeY - 0.12, r);

    drawMouth(ctx, f.x + 0.35, f.y + 2.88, 1.12);
  }

  function outlineWidth(ctx) {
    const tr = ctx.getTransform();
    const sx = Math.hypot(tr.a, tr.b) || 1;
    /* 約 1.15 裝置像素，淺色背景也看得到，但又不會變粗黑框 */
    return 1.15 / sx;
  }

  function addBodyPath(ctx, p) {
    ctx.beginPath();
    smoothPath(ctx, outlinePts(p), true);
  }

  function drawBag(ctx, p) {
    const m = deformed(p);
    const bagX = m.rHip.x - 0.4;
    const bagY = m.rHip.y + 0.4;
    ctx.strokeStyle = C.strap;
    ctx.lineWidth = 0.38;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(m.lArmpitDn.x + 0.3, m.lArmpitDn.y + 0.2);
    ctx.quadraticCurveTo(13.0, m.lArmpitDn.y + 2.2, bagX - 0.4, bagY - 1.0);
    ctx.stroke();
    ctx.save();
    ctx.translate(bagX, bagY);
    ctx.rotate(0.16);
    roundRect(ctx, -1.35, -1.6, 2.7, 3.2, 0.45);
    ctx.fillStyle = C.bag;
    ctx.fill();
    ctx.strokeStyle = "rgba(80,20,20,.4)";
    ctx.lineWidth = 0.14;
    ctx.stroke();
    roundRect(ctx, -1.35, -1.6, 2.7, 1.15, 0.4);
    ctx.fillStyle = C.bagD;
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawBucketHat(ctx, p) {
    const m = deformed(p);
    const hx = (m.valley.x + m.rEarInner.x) * 0.5;
    const hy = m.valley.y + 0.35;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.beginPath();
    ctx.ellipse(0, -0.2, 4.6, 2.15, 0, 0, TAU);
    ctx.fillStyle = C.hat;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -1.65, 3.15, 1.15, 0, 0, TAU);
    ctx.fillStyle = C.hatL;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0.45, 5.7, 1.35, 0, 0, TAU);
    ctx.fillStyle = C.hat;
    ctx.fill();
    ctx.strokeStyle = "rgba(30,60,28,.35)";
    ctx.lineWidth = 0.16;
    ctx.stroke();
    ctx.restore();
  }

  function drawSantaHat(ctx, p) {
    const m = deformed(p);
    const hx = m.valley.x + 1.4;
    const hy = m.valley.y + 0.2;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-0.42);
    ctx.beginPath();
    ctx.moveTo(-3.2, 0.5);
    ctx.quadraticCurveTo(-2.4, -3.9, 1.0, -5.5);
    ctx.quadraticCurveTo(3.4, -2.7, 4.1, -0.3);
    ctx.quadraticCurveTo(1.0, 1.0, -3.2, 0.5);
    ctx.fillStyle = C.santa;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.1, 0.75, 3.7, 1.25, 0.02, 0, TAU);
    ctx.fillStyle = C.trim;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,90,90,.22)";
    ctx.lineWidth = 0.12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1.2, -5.65, 1.0, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /* 預設剪影朝左。dir > 0 是往右走，整隻（含帽子、袋子）以畫布中線翻過來。 */
  function faceRight(p) { return (p.dir || 0) > 0; }

  /* 跟 draw() 的變換同一套：先以腳底附近為軸擠壓旋轉，再依方向翻面，最後上移 lift。 */
  function xform(p, x, y) {
    const pivotY = FY - (p.sit || 0);
    const sx = p.squashX || 1, sy = p.squashY || 1;
    const tilt = p.tilt || 0;
    const dx = (x - W / 2) * sx, dy = (y - pivotY) * sy;
    const c = Math.cos(tilt), sn = Math.sin(tilt);
    let X = dx * c - dy * sn + W / 2;
    const Y = dx * sn + dy * c + pivotY - (p.lift || 0);
    if (faceRight(p)) X = W - X;
    return { x: X, y: Y };
  }

  function addEllipse(add, cx, cy, rx, ry, rot) {
    const c = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      add(cx + x * c - y * sn, cy + x * sn + y * c);
    }
  }

  function addBag(add, p) {
    const m = deformed(p);
    const bagX = m.rHip.x - 0.4, bagY = m.rHip.y + 0.4;
    const rot = 0.16, c = Math.cos(rot), sn = Math.sin(rot);
    const loc = (x, y) => add(bagX + x * c - y * sn, bagY + x * sn + y * c);
    for (const [x, y] of [[-1.35, -1.6], [1.35, -1.6], [1.35, 1.6], [-1.35, 1.6]]) loc(x, y);
    add(m.lArmpitDn.x + 0.3, m.lArmpitDn.y + 0.2);
    add(13, m.lArmpitDn.y + 2.2);
    add(bagX - 0.4, bagY - 1);
  }

  function addBucket(add, p) {
    const m = deformed(p);
    const hx = (m.valley.x + m.rEarInner.x) * 0.5;
    const hy = m.valley.y + 0.35;
    addEllipse(add, hx, hy - 0.2, 4.6, 2.15, 0);
    addEllipse(add, hx, hy - 1.65, 3.15, 1.15, 0);
    addEllipse(add, hx, hy + 0.45, 5.7, 1.35, 0);
    addBag(add, p);
  }

  function addSanta(add, p) {
    const m = deformed(p);
    const hx = m.valley.x + 1.4, hy = m.valley.y + 0.2;
    const rot = -0.42, c = Math.cos(rot), sn = Math.sin(rot);
    const loc = (x, y) => add(hx + x * c - y * sn, hy + x * sn + y * c);
    for (const [x, y] of [[-3.2, 0.5], [-2.4, -3.9], [1, -5.5], [3.4, -2.7], [4.1, -0.3], [1, 1], [-3.2, 0.5]]) loc(x, y);
    addEllipse(loc, 0.1, 0.75, 3.7, 1.25, 0.02);
    addEllipse(loc, 1.2, -5.65, 1, 1, 0);
  }

  /* 變換後的墨水範圍（還沒加描邊留白）。跳起來的 lift 會讓頭頂的 y 變成負的。 */
  function inkBox(p) {
    const pts = outlinePts(p);
    const n = pts.length;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => {
      const t = xform(p, x, y);
      if (t.x < x0) x0 = t.x;
      if (t.y < y0) y0 = t.y;
      if (t.x > x1) x1 = t.x;
      if (t.y > y1) y1 = t.y;
    };
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      add(p1.x, p1.y);
      add(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6);
      add(p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6);
    }
    if (p.acc === "bucket") addBucket(add, p);
    else if (p.acc === "santa") addSanta(add, p);
    return { x0, y0, x1, y1 };
  }

  /* 畫布要包住這塊，再留一點描邊。站立的 26×24 不夠：跳躍、擠壓和帽子都會超出上緣。 */
  function viewBox(p) {
    const b = inkBox(p);
    const pad = 0.9;
    /* 下緣至少留在腳底那一條線。跳起來時腳離開地板，中間是空的，不能把畫布底跟著腳抬上去。 */
    return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: Math.max(b.y1 + pad, FY) };
  }

  function draw(ctx, p) {
    ctx.save();
    ctx.translate(0, -(p.lift || 0));
    if (faceRight(p)) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    const pivotY = FY - (p.sit ? 1.0 : 0);
    ctx.translate(W / 2, pivotY);
    ctx.rotate(p.tilt || 0);
    ctx.scale(p.squashX || 1, p.squashY || 1);
    ctx.translate(-W / 2, -pivotY);

    /* 只填一次、只描外輪廓一次：接縫不會出現 */
    addBodyPath(ctx, p);
    ctx.fillStyle = C.fur;
    ctx.fill();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = outlineWidth(ctx);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    /* 坐下等姿勢若輪廓自交，再填一次把內部的描邊蓋掉，只留外輪廓 */
    ctx.fill();

    drawFace(ctx, p);
    if (p.acc === "bucket") {
      drawBag(ctx, p);
      drawBucketHat(ctx, p);
    } else if (p.acc === "santa") {
      drawSantaHat(ctx, p);
    }
    ctx.restore();
  }

  function hitLocal(p) {
    const lift = p.lift || 0;
    const sit = p.sit || 0;
    return { x0: 0.2, y0: 0.1 - lift + sit * 0.8, x1: W - 0.2, y1: FY + 0.2 - lift };
  }

  function bodyGeom(p) {
    return { x: W / 2, y: 13 + (p.sit || 0) * 1.2, rx: 10, ry: 9 };
  }

  const STATS = {
    grid: W + "×" + H,
    standH: H,
    roosterStandGrid: 11.4 * 1.12,
    sizeRatio: 2 / 3
  };

  return { W, H, FY, C, STATS, makePose, draw, hitLocal, bodyGeom, outlinePts, marks, inkBox, viewBox };
})();

export { Bobo };
