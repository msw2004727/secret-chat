/* 黑羽土雞公雞：跟擬真貓同一套座標（32×20 格，朝右畫，地板 y=20）。
   身體大約是貓的一半；雞冠和鐮刀尾會再往外多一點。 */
const Rooster = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  const W = 32, H = 20, FY = 20;

  /* 貓站姿大約：身體長 9.8、身厚 6.2、腳到耳尖約 17。
     公雞身體取一半：軀幹長 5.0、身厚 3.15、腳到頭頂（不含冠）約 8.2，腳到冠尖約 10.2。 */
  const STATS = {
    catGrid: { w: 32, h: 20 },
    catBody: { length: 9.8, thickness: 6.2, heightToEar: 17.2 },
    roosterBody: { length: 5.6, thickness: 3.5, heightToCrown: 9.2, heightToComb: 11.4, tailExtra: 9.0, drawScale: 1.12 },
    note: "body ≈ 60% of the cat’s standing height (about half, slightly larger so comb and tail stay readable); sickle tail and comb extend beyond the body box"
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = (x, y) => ({ x, y });
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  const C = {
    black: "#121014",
    base: "#1a171c",
    soft: "#2a2730",
    hi: "#3d3a46",
    breast: "#1c191e",
    rim: "rgba(200,205,220,.62)",
    edge: "rgba(6,5,8,.7)",
    feather: "#2e2b34",
    featherD: "#232028",
    irG: "#164a32",
    irG2: "#2a9a62",
    irB: "#16344e",
    irB2: "#3a7ca0",
    irP: "#3a2150",
    irP2: "#7a4a98",
    comb: "#ef2432",
    combD: "#9a1018",
    combH: "#ff7578",
    combX: "#6c0b12",
    wattle: "#d01826",
    beak: "#f0bc28",
    beakD: "#a87a0c",
    beakH: "#ffe56a",
    leg: "#f0bc28",
    legD: "#9a7210",
    claw: "#c9a01c",
    eye: "#140e0a",
    eyeR: "#fff6d8",
    face: "#b3121c"
  };

  function iridColor(t, i, a) {
    const u = (Math.sin((t || 0) * 0.0016 + i * 0.7) + 1) * 0.5;
    const stops = [C.irG, C.irB, C.irP, C.irG];
    const x = u * (stops.length - 1);
    const k = Math.floor(x);
    const hex = shadeLerp(stops[k], stops[k + 1] || stops[k], x - k);
    return a == null ? hex : rgbaFromRgb(hex, a);
  }
  function shadeLerp(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const f = (s, k) => ((s >> k) & 255);
    const r = Math.round(lerp(f(pa, 16), f(pb, 16), t));
    const g = Math.round(lerp(f(pa, 8), f(pb, 8), t));
    const bl = Math.round(lerp(f(pa, 0), f(pb, 0), t));
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function rgbaFromRgb(rgb, a) {
    const m = rgb.match(/\d+/g);
    return "rgba(" + m[0] + "," + m[1] + "," + m[2] + "," + a + ")";
  }

  function smoothPath(ctx, pts, close) {
    const n = pts.length;
    if (n < 2) return;
    ctx.beginPath();
    if (close !== false && n > 2) {
      const m0 = P((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
      ctx.moveTo(m0.x, m0.y);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < n - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
    }
  }

  function hull(pts) {
    pts = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  function blobPts(circles, n) {
    const pts = [];
    for (const c of circles) {
      const rx = c.rx || c.r, ry = c.ry || c.r, rot = c.rot || 0;
      const N = n || 26;
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        pts.push(P(c.x + x * Math.cos(rot) - y * Math.sin(rot), c.y + x * Math.sin(rot) + y * Math.cos(rot)));
      }
    }
    return hull(pts);
  }

  function featherEdge(ctx, pts, col, len) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 0.09; ctx.lineCap = "round"; ctx.globalAlpha = 0.7;
    const n = pts.length;
    let cx = 0, cy = 0; for (const p of pts) { cx += p.x; cy += p.y; } cx /= n; cy /= n;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      const k = Math.max(1, Math.round(d / 0.32));
      for (let j = 0; j < k; j++) {
        const t = j / k, x = lerp(p.x, q.x, t), y = lerp(p.y, q.y, t);
        if (y > FY - 0.15) continue;
        let nx = q.y - p.y, ny = -(q.x - p.x); const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        if ((x - cx) * nx + (y - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const r = h - Math.floor(h);
        const l = len * (0.3 + r * 0.5);
        ctx.moveTo(x, y);
        ctx.lineTo(x + nx * l + ny * l * 0.25, y + ny * l - nx * l * 0.25);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ----- 鐮刀尾：從尻部往後上方拱出去再微微垂下來 ----- */
  function sicklePts(base, len, rise, drop, spread, sway, thick) {
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      /* 先往上拱，再往後、最後才微微垂下來，才是公雞的鐮刀尾 */
      const x = base.x - Math.pow(u, 0.85) * len * (0.95 + spread * 0.25) - Math.sin(u * 0.9) * 0.4;
      const y = base.y - Math.sin(u * Math.PI * 0.78) * rise + Math.pow(Math.max(0, u - 0.55) / 0.45, 2) * drop
        + Math.sin(u * 2.0 + sway) * 0.16 * u;
      pts.push(P(x, y));
    }
    void thick;
    return pts;
  }
  function strokeFeather(ctx, pts, w0, w1, fill, edge, sheen, t, idx) {
    const n = pts.length;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = lerp(w0, w1, i / (n - 1)) / 2;
      L.push(P(pts[i].x - ty * w, pts[i].y + tx * w));
      R.push(P(pts[i].x + ty * w, pts[i].y - tx * w));
    }
    const out = L.concat(R.slice().reverse());
    ctx.save();
    smoothPath(ctx, out, true);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 0.08;
    ctx.stroke();
    /* 虹彩：沿著羽根上一道會隨時間變色的細亮線 */
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = lerp(w0, w1, i / (n - 1)) * 0.22;
      const x = pts[i].x - ty * w, y = pts[i].y + tx * w - 0.05;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = sheen || iridColor(t, idx, 0.42);
    ctx.lineWidth = 0.16;
    ctx.lineCap = "round";
    ctx.stroke();
    /* 外緣一道淺灰，深色背景才看得到尾巴輪廓 */
    ctx.strokeStyle = C.rim;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.1;
    smoothPath(ctx, out, true);
    ctx.stroke();
    ctx.globalAlpha = 1;
    /* 尾尖只留很淡的綠光，不要彩虹光斑 */
    const tip = pts[n - 1];
    const g = ctx.createRadialGradient(tip.x, tip.y, 0.02, tip.x, tip.y, 0.45);
    g.addColorStop(0, iridColor(t, idx + 1, 0.28));
    g.addColorStop(1, iridColor(t, idx + 1, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawTail(ctx, p, t, layer) {
    const farLayer = layer === "far";
    const base = P(p.rump.x - 0.15, p.rump.y - 0.55);
    const sway = p.tailSway || 0;
    const fan = p.tailFan || 0;
    const lift = p.tailLift || 0;
    const feathers = [
      { len: 7.6, rise: 4.6 + lift, drop: 1.6, spread: -0.25, w0: 0.85, w1: 0.18, far: true },
      { len: 8.4, rise: 5.2 + lift, drop: 1.5, spread: 0.0, w0: 0.95, w1: 0.18, far: true },
      { len: 9.2, rise: 5.8 + lift * 1.15, drop: 1.4, spread: 0.18 + fan * 0.35, w0: 1.05, w1: 0.16, far: false },
      { len: 8.0, rise: 4.8 + lift, drop: 1.1, spread: 0.48 + fan * 0.4, w0: 0.8, w1: 0.16, far: false },
      { len: 6.4, rise: 3.6 + lift * 0.8, drop: 0.7, spread: 0.78 + fan * 0.35, w0: 0.7, w1: 0.16, far: false }
    ];
    const coverts = [
      { len: 3.6, rise: 2.4 + lift * 0.5, drop: 0.25, spread: 0.12, w0: 1.15, w1: 0.35 },
      { len: 2.8, rise: 1.8 + lift * 0.4, drop: 0.15, spread: 0.4, w0: 1.0, w1: 0.3 }
    ];
    feathers.forEach((f, i) => {
      if (f.far !== farLayer) return;
      const pts = sicklePts(base, f.len, f.rise, f.drop, f.spread, sway + i * 0.4, f.w0);
      const fill = f.far ? C.featherD : C.feather;
      strokeFeather(ctx, pts, f.w0, f.w1, fill, C.edge, null, t, i);
    });
    if (!farLayer) {
      coverts.forEach((f, i) => {
        const pts = sicklePts(base, f.len, f.rise, f.drop, f.spread, sway * 0.5, f.w0);
        strokeFeather(ctx, pts, f.w0, f.w1, C.hi, C.edge, iridColor(t, i + 3, 0.4), t, i + 6);
      });
    }
  }

  /* ----- 腳：細黃色脛、鱗片、三趾朝前一趾朝後，公雞有距 ----- */
  function drawFoot(ctx, x, y, dir, lift, scratch) {
    ctx.save();
    ctx.translate(x, y);
    const splay = 0.15 + (scratch || 0) * 0.2;
    const toes = [
      { a: -0.55 - splay, l: 1.05 },
      { a: -0.08, l: 1.2 },
      { a: 0.42 + splay, l: 1.0 },
      { a: 2.7, l: 0.55 } /* 後趾 */
    ];
    ctx.strokeStyle = C.legD;
    ctx.fillStyle = C.leg;
    ctx.lineWidth = 0.16;
    ctx.lineCap = "round";
    toes.forEach((toe) => {
      const a = toe.a + (dir < 0 ? 0 : 0) + (scratch || 0) * -0.35;
      const tx = Math.cos(a) * toe.l, ty = Math.sin(a) * 0.32 + 0.08;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      /* 爪尖 */
      ctx.fillStyle = C.claw;
      ctx.beginPath();
      ctx.ellipse(tx + Math.cos(a) * 0.12, ty + 0.04, 0.14, 0.08, a, 0, TAU);
      ctx.fill();
    });
    /* 距（公雞特徵）：脛後方一小截 */
    if (!lift) {
      ctx.fillStyle = shade(C.leg, -0.15);
      ctx.beginPath();
      ctx.ellipse(-0.15, -0.55, 0.16, 0.28, 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    void dir;
  }
  function drawLeg(ctx, hip, foot, far, lift, scratch) {
    const mid = P(lerp(hip.x, foot.x, 0.45) + 0.05, lerp(hip.y, foot.y, 0.5));
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    /* 被身體遮住的大腿只露出一點深色 */
    ctx.strokeStyle = far ? shade(C.base, -0.15) : C.soft;
    ctx.lineWidth = far ? 0.7 : 0.82;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(mid.x, mid.y - 0.15);
    ctx.stroke();
    /* 露出的脛 */
    const shank = ctx.createLinearGradient(mid.x, mid.y, foot.x, foot.y);
    shank.addColorStop(0, far ? shade(C.leg, -0.22) : C.leg);
    shank.addColorStop(1, far ? shade(C.legD, -0.05) : C.legD);
    ctx.strokeStyle = shank;
    ctx.lineWidth = far ? 0.42 : 0.5;
    ctx.beginPath();
    ctx.moveTo(mid.x, mid.y - 0.1);
    ctx.lineTo(foot.x, foot.y - 0.05);
    ctx.stroke();
    /* 鱗片 */
    ctx.strokeStyle = rgba(C.legD, far ? 0.35 : 0.55);
    ctx.lineWidth = 0.07;
    const n = 4;
    for (let i = 1; i <= n; i++) {
      const u = i / (n + 1);
      const x = lerp(mid.x, foot.x, u), y = lerp(mid.y, foot.y, u);
      ctx.beginPath();
      ctx.arc(x, y, 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    if (foot.y >= FY - 0.85 - (lift || 0)) drawFoot(ctx, foot.x, Math.min(FY - 0.05, foot.y), 1, lift, scratch);
    ctx.restore();
  }

  /* ----- 翅膀：收起來貼在身側；拍翅時張開成扇形 ----- */
  function drawWingFolded(ctx, p, far, t) {
    const sh = p.shoulder;
    const tip = P(sh.x - 2.6 + (p.wingFold || 0), sh.y + 1.15 + (p.wingDrop || 0));
    const pts = blobPts([
      { x: sh.x - 0.15, y: sh.y - 0.15, rx: 0.7, ry: 0.55 },
      { x: lerp(sh.x, tip.x, 0.5), y: lerp(sh.y, tip.y, 0.45) + 0.15, rx: 1.15, ry: 0.7 },
      { x: tip.x, y: tip.y, rx: 0.55, ry: 0.35 }
    ], 20);
    ctx.save();
    const g = ctx.createLinearGradient(sh.x, sh.y - 0.8, tip.x, tip.y + 0.6);
    g.addColorStop(0, far ? C.black : C.soft);
    g.addColorStop(0.7, far ? C.base : C.hi);
    g.addColorStop(1, C.base);
    smoothPath(ctx, pts);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    /* 飛羽尖端與一點虹彩 */
    ctx.strokeStyle = iridColor(t, far ? 8 : 2, 0.45);
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(sh.x - 0.8, sh.y + 0.3);
    ctx.quadraticCurveTo(tip.x + 0.4, tip.y - 0.4, tip.x, tip.y);
    ctx.stroke();
    featherEdge(ctx, pts, C.hi, 0.22);
    ctx.restore();
  }
  function drawWingOpen(ctx, p, far, t) {
    const sh = p.shoulder;
    const phase = p.wingPhase || 0; /* 0 放下、1 舉高 */
    const baseA = far ? -0.15 : 0.05;
    const a0 = baseA - lerp(0.4, 1.55, phase) + (p.wingDrop || 0) * 0.2;
    const n = 7;
    for (let i = n - 1; i >= 0; i--) {
      const u = i / (n - 1);
      const a = a0 + u * 1.35 + (far ? -0.08 : 0);
      const len = 4.2 + u * 1.15 - (i === 0 ? 0.5 : 0);
      const w0 = 0.95, w1 = 0.28;
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const s = k / 7;
        pts.push(P(
          sh.x + Math.cos(a) * len * s + Math.sin(a) * Math.sin(s * Math.PI) * 0.15,
          sh.y + Math.sin(a) * len * s - Math.cos(a) * Math.sin(s * Math.PI) * 0.2
        ));
      }
      strokeFeather(ctx, pts, w0, w1, i % 2 ? C.featherD : C.feather, C.edge, iridColor(t, i + 4, 0.4), t, i + 10);
    }
    /* 覆羽小團 */
    ctx.save();
    ctx.fillStyle = C.hi;
    ctx.beginPath();
    ctx.ellipse(sh.x + 0.15, sh.y + 0.1, 0.85, 0.6, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ----- 身體與頸羽 ----- */
  function drawBody(ctx, p, t) {
    const breast = p.breast, mid = p.mid, rump = p.rump;
    const pts = blobPts([
      { x: breast.x, y: breast.y, rx: 1.75, ry: 1.62, rot: p.bodyTilt * 0.4 },
      { x: mid.x, y: mid.y, rx: 2.05, ry: 1.55 },
      { x: rump.x, y: rump.y, rx: 1.5, ry: 1.4, rot: -0.15 }
    ], 28);
    const g = ctx.createLinearGradient(mid.x, mid.y - 2.2, mid.x, mid.y + 2.0);
    g.addColorStop(0, C.soft);
    g.addColorStop(0.35, C.base);
    g.addColorStop(0.7, C.breast);
    g.addColorStop(1, C.black);
    smoothPath(ctx, pts);
    ctx.fillStyle = g;
    ctx.fill();
    /* 背上一點光、胸前更圓更亮一點 */
    ctx.save();
    smoothPath(ctx, pts);
    ctx.clip();
    const hl = ctx.createRadialGradient(mid.x + 0.3, mid.y - 1.0, 0.2, mid.x, mid.y, 3.2);
    hl.addColorStop(0, "rgba(90,75,65,.45)");
    hl.addColorStop(1, "rgba(90,75,65,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(rump.x - 3, mid.y - 4, 10, 8);
    const br = ctx.createRadialGradient(breast.x + 0.2, breast.y + 0.2, 0.2, breast.x, breast.y, 2.2);
    br.addColorStop(0, "rgba(55,40,32,.4)");
    br.addColorStop(1, "rgba(55,40,32,0)");
    ctx.fillStyle = br;
    ctx.beginPath();
    ctx.arc(breast.x, breast.y, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 0.11;
    smoothPath(ctx, pts);
    ctx.stroke();
    /* 背上淺緣：深色聊天室背景才分得出身體 */
    ctx.save();
    ctx.strokeStyle = C.rim;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rump.x + 0.2, rump.y - 1.25);
    ctx.quadraticCurveTo(mid.x, mid.y - 1.7, breast.x - 0.2, breast.y - 1.2);
    ctx.stroke();
    ctx.restore();
    featherEdge(ctx, pts, C.hi, 0.16);
    void t;
  }

  function drawNeck(ctx, p, t) {
    const base = P(p.breast.x - 0.15, p.breast.y - 0.85);
    const head = p.head;
    /* 頸部主幹 */
    const n = 8, pts = [], ws = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = lerp(base.x, head.x - 0.35, u) + Math.sin(u * Math.PI) * (p.neckBend || 0);
      const y = lerp(base.y, head.y + 0.35, u);
      pts.push(P(x, y));
      ws.push(lerp(1.55, 0.95, u));
    }
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      L.push(P(pts[i].x - ty * ws[i] / 2, pts[i].y + tx * ws[i] / 2));
      R.push(P(pts[i].x + ty * ws[i] / 2, pts[i].y - tx * ws[i] / 2));
    }
    const out = L.concat(R.slice().reverse());
    ctx.save();
    const g = ctx.createLinearGradient(base.x, base.y, head.x, head.y);
    g.addColorStop(0, C.base);
    g.addColorStop(1, C.soft);
    smoothPath(ctx, out, true);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    /* 蓑羽：頸後一排尖羽，帶綠紫光 */
    const hackles = 6;
    for (let i = 0; i < hackles; i++) {
      const u = 0.2 + i / hackles * 0.7;
      const q = P(lerp(base.x, head.x, u) - 0.45 - (1 - u) * 0.15, lerp(base.y, head.y, u) - 0.05);
      const a = -2.35 - u * 0.3 + Math.sin((t || 0) * 0.003 + i) * 0.04;
      const len = 1.05 + (1 - u) * 0.55;
      const tip = P(q.x + Math.cos(a) * len, q.y + Math.sin(a) * len);
      ctx.beginPath();
      ctx.moveTo(q.x + 0.08, q.y - 0.16);
      ctx.quadraticCurveTo(lerp(q.x, tip.x, 0.5) + 0.18, lerp(q.y, tip.y, 0.5), tip.x, tip.y);
      ctx.quadraticCurveTo(lerp(q.x, tip.x, 0.5) - 0.08, lerp(q.y, tip.y, 0.5) + 0.14, q.x - 0.06, q.y + 0.14);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? C.feather : C.featherD;
      ctx.fill();
      ctx.strokeStyle = iridColor(t, i + 12, 0.28);
      ctx.lineWidth = 0.08;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ----- 頭、單冠、肉垂、黃喙、眼睛 ----- */
  function drawComb(ctx, head, tilt, wobble) {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(tilt || 0);
    /* 冠座沿著頭頂 */
    const pts = [
      P(1.15, -0.55),
      P(1.28, -1.45 + wobble * 0.05),
      P(0.72, -1.0),
      P(0.62, -2.05 + wobble),
      P(0.08, -1.15),
      P(-0.02, -2.45 + wobble * 0.6),
      P(-0.55, -1.2),
      P(-0.85, -1.95 + wobble * 0.3),
      P(-1.15, -1.05),
      P(-1.55, -1.55),
      P(-1.35, -0.45),
      P(-0.3, -0.32)
    ];
    const g = ctx.createLinearGradient(0, -1.9, 0.2, -0.2);
    g.addColorStop(0, C.combH);
    g.addColorStop(0.35, C.comb);
    g.addColorStop(1, C.combD);
    smoothPath(ctx, pts, true);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.combX;
    ctx.lineWidth = 0.08;
    ctx.stroke();
    /* 冠上的亮點 */
    ctx.fillStyle = "rgba(255,200,200,.4)";
    ctx.beginPath();
    ctx.ellipse(-0.02, -1.7, 0.18, 0.26, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function drawWattles(ctx, head, tilt) {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(tilt || 0);
    const one = (ox, oy, sx, sy) => {
      const g = ctx.createLinearGradient(ox, oy, ox, oy + sy);
      g.addColorStop(0, C.combH);
      g.addColorStop(0.4, C.wattle);
      g.addColorStop(1, C.combD);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.bezierCurveTo(ox + sx, oy + 0.15, ox + sx * 0.7, oy + sy, ox, oy + sy);
      ctx.bezierCurveTo(ox - sx * 0.55, oy + sy * 0.7, ox - sx * 0.3, oy + 0.1, ox, oy);
      ctx.fill();
      ctx.strokeStyle = C.combX;
      ctx.lineWidth = 0.07;
      ctx.stroke();
    };
    one(0.62, 0.38, 0.28, 1.25); /* 近側較大 */
    one(0.28, 0.42, 0.2, 0.95);  /* 遠側露出一點 */
    ctx.restore();
  }
  function drawBeak(ctx, head, tilt, open) {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(tilt || 0);
    const tip = 1.65;
    /* 上喙 */
    ctx.beginPath();
    ctx.moveTo(0.7, -0.08);
    ctx.quadraticCurveTo(1.15, -0.28, tip, 0.08);
    ctx.quadraticCurveTo(1.15, 0.18, 0.7, 0.18);
    ctx.closePath();
    const g = ctx.createLinearGradient(0.7, -0.25, tip, 0.15);
    g.addColorStop(0, C.beakH);
    g.addColorStop(0.55, C.beak);
    g.addColorStop(1, C.beakD);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(C.beakD, -0.1);
    ctx.lineWidth = 0.07;
    ctx.stroke();
    /* 鼻孔 */
    ctx.fillStyle = C.beakD;
    ctx.beginPath();
    ctx.ellipse(0.95, 0.0, 0.08, 0.05, 0, 0, TAU);
    ctx.fill();
    /* 下喙（張開時往下轉開） */
    ctx.beginPath();
    ctx.moveTo(0.7, 0.16);
    ctx.quadraticCurveTo(1.1, 0.22 + open * 0.55, tip - 0.15, 0.2 + open * 0.7);
    ctx.quadraticCurveTo(1.0, 0.32 + open * 0.45, 0.68, 0.28 + open * 0.15);
    ctx.closePath();
    ctx.fillStyle = shade(C.beak, -0.12);
    ctx.fill();
    ctx.stroke();
    if (open > 0.35) {
      /* 嘴裡一點舌頭／喉 */
      ctx.fillStyle = "#8a2030";
      ctx.beginPath();
      ctx.ellipse(0.95, 0.22 + open * 0.25, 0.22, 0.1 + open * 0.12, 0.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawHead(ctx, p) {
    const h = p.head, tilt = p.headTilt || 0;
    ctx.save();
    /* 遠側肉垂先畫 */
    drawWattles(ctx, h, tilt);
    /* 頭本體 */
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(tilt);
    const pts = blobPts([{ x: 0.05, y: 0.05, rx: 1.15, ry: 0.95 }], 22);
    const g = ctx.createLinearGradient(-0.6, -0.7, 0.5, 0.6);
    g.addColorStop(0, C.soft);
    g.addColorStop(0.6, C.base);
    g.addColorStop(1, C.black);
    smoothPath(ctx, pts);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    ctx.strokeStyle = C.rim;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    /* 臉頰一點紅 */
    ctx.fillStyle = "rgba(179,18,28,.35)";
    ctx.beginPath();
    ctx.ellipse(0.45, 0.15, 0.45, 0.35, 0.2, 0, TAU);
    ctx.fill();
    /* 眼睛 */
    if (p.blink > 0.55) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = 0.16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0.35, -0.08);
      ctx.lineTo(0.72, -0.02);
      ctx.stroke();
    } else {
      ctx.fillStyle = C.eye;
      ctx.beginPath();
      ctx.ellipse(0.55, -0.05, 0.22, 0.2, -0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.eyeR;
      ctx.beginPath();
      ctx.arc(0.62, -0.12, 0.07, 0, TAU);
      ctx.fill();
      /* 眼圈一點橘紅 */
      ctx.strokeStyle = "rgba(160,40,30,.45)";
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.ellipse(0.55, -0.05, 0.26, 0.24, -0.15, 0, TAU);
      ctx.stroke();
    }
    /* 耳葉（土雞多為紅，側臉只露一小塊） */
    ctx.fillStyle = C.face;
    ctx.beginPath();
    ctx.ellipse(-0.15, 0.05, 0.22, 0.16, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
    drawComb(ctx, h, tilt, p.combWobble || 0);
    drawBeak(ctx, h, tilt, p.beakOpen || 0);
    ctx.restore();
  }

  /* ----- 姿勢 ----- */
  function baseIdle() {
    return {
      dir: 1,
      lift: 0,
      bodyTilt: -0.04,
      breast: P(21.7, 15.95),
      mid: P(19.6, 16.2),
      rump: P(17.45, 16.1),
      shoulder: P(20.15, 15.5),
      head: P(23.35, 11.85),
      headTilt: -0.12,
      neckBend: 0.22,
      beakOpen: 0,
      blink: 0,
      combWobble: 0,
      tailSway: 0,
      tailFan: 0,
      tailLift: 0,
      wingPhase: 0,
      wingFold: 0,
      wingDrop: 0,
      wingOpen: 0,
      farFoot: P(17.85, FY),
      nearFoot: P(21.25, FY),
      farLift: 0,
      nearLift: 0,
      scratch: 0,
      farHip: P(18.15, 17.45),
      nearHip: P(20.85, 17.4)
    };
  }

  function applyBob(p, bob, headHoldX) {
    const dy = bob;
    p.breast.y += dy; p.mid.y += dy; p.rump.y += dy;
    p.shoulder.y += dy; p.farHip.y += dy; p.nearHip.y += dy;
    if (headHoldX != null) p.head.x += headHoldX;
    else p.head.y += dy * 0.35;
    return p;
  }

  function makePose(action, local, opts) {
    const p = baseIdle();
    const t = (opts && opts.time) || 0;
    const dir = (opts && opts.dir) != null ? opts.dir : 1;
    p.dir = dir;
    p.blink = (opts && opts.blink) || 0;
    p.combWobble = Math.sin(t * 0.006) * 0.08;
    p.tailSway = Math.sin(t * 0.0035) * 0.35;

    if (action === "idle" || action === "roam-idle") {
      const bob = Math.sin(t * 0.007) * 0.22;
      applyBob(p, bob);
      p.head.y += Math.sin(t * 0.011 + 0.4) * 0.28;
      p.headTilt = -0.08 + Math.sin(t * 0.008) * 0.06;
      /* 偶爾自動啄一下由上層切到 peck，這裡只做晃頭 */
    }

    if (action === "walk") {
      const ph = (local || 0) * TAU; /* 一步 = 1 週期 */
      const step = Math.sin(ph);
      const upN = Math.max(0, Math.sin(ph)) * 1.15;
      const upF = Math.max(0, Math.sin(ph + Math.PI)) * 1.15;
      p.nearFoot = P(21.25 + step * 1.05, FY - upN);
      p.farFoot = P(17.85 - step * 1.05, FY - upF);
      p.nearLift = upN; p.farLift = upF;
      const bob = Math.abs(Math.sin(ph)) * 0.18;
      applyBob(p, -bob * 0.15 + 0.05);
      /* 雞走路：身體往前時，頭會先停住再突然伸出去，不會倒退走 */
      const hold = Math.cos(ph) * 0.55;
      p.head.x += hold;
      p.head.y += Math.sin(ph * 2) * 0.12;
      p.headTilt = -0.06 + Math.sin(ph) * 0.08;
      p.bodyTilt = -0.02 + Math.sin(ph) * 0.04;
      p.tailSway += Math.sin(ph) * 0.25;
    }

    if (action === "peck") {
      const u = clamp(local, 0, 1);
      /* 0-0.18 俯身、0.18-0.55 連啄兩下、0.55-1 抬回來 */
      let down = 0;
      if (u < 0.18) down = u / 0.18;
      else if (u < 0.55) {
        const v = (u - 0.18) / 0.37;
        const pecks = Math.sin(v * Math.PI * 2.2);
        down = 0.85 + pecks * 0.18;
      } else down = 1 - (u - 0.55) / 0.45;
      down = clamp(down, 0, 1);
      p.bodyTilt = -0.04 + down * 0.42;
      p.breast = P(21.7 + down * 0.55, 16.05 + down * 0.55);
      p.mid = P(19.7 + down * 0.25, 16.15 + down * 0.4);
      p.rump = P(17.55 + down * 0.1, 16.05 + down * 0.2);
      p.shoulder = P(20.3 + down * 0.4, 15.55 + down * 0.5);
      p.nearHip = P(20.9, 17.5 + down * 0.15);
      p.farHip = P(18.2, 17.55 + down * 0.15);
      p.head = P(22.4 + down * 1.45, 11.85 + down * 6.5);
      p.headTilt = -0.08 + down * 0.85;
      p.neckBend = 0.15 - down * 0.4;
      p.beakOpen = (u > 0.18 && u < 0.55) ? 0.25 + Math.abs(Math.sin(u * 40)) * 0.2 : 0;
      p.tailLift = -down * 0.3;
    }

    if (action === "crow") {
      const u = clamp(local, 0, 1);
      let stretch = 0;
      if (u < 0.16) stretch = -0.15 * (u / 0.16);           /* 先收一下氣 */
      else if (u < 0.32) stretch = lerp(-0.15, 1, (u - 0.16) / 0.16);
      else if (u < 0.78) stretch = 1;
      else stretch = 1 - (u - 0.78) / 0.22;
      p.bodyTilt = -0.04 - stretch * 0.18;
      p.breast = P(21.55, 16.05 + (stretch < 0 ? -stretch * 0.4 : -stretch * 0.15));
      p.mid.y += stretch < 0 ? -stretch * 0.3 : -stretch * 0.1;
      p.rump.y += stretch * 0.05;
      p.shoulder.y -= stretch * 0.2;
      p.head = P(23.35 + stretch * 0.55, 11.85 - stretch * 2.7);
      p.headTilt = -0.08 - stretch * 0.35;
      p.neckBend = 0.15 + stretch * 0.35;
      p.beakOpen = stretch > 0.3 ? clamp((stretch - 0.3) * 1.4, 0, 1) * 0.95 : 0;
      p.tailLift = stretch * 0.9;
      p.tailFan = stretch * 0.35;
      p.wingDrop = stretch * 0.25;
      p.combWobble += stretch * Math.sin(t * 0.08) * 0.12;
    }

    if (action === "flap") {
      const u = clamp(local, 0, 1);
      let hop = 0, wing = 0, crouch = 0;
      if (u < 0.12) { crouch = u / 0.12; }
      else if (u < 0.72) {
        const v = (u - 0.12) / 0.6;
        hop = Math.sin(v * Math.PI);
        wing = 0.5 + 0.5 * Math.sin(v * Math.PI * 6);
      } else {
        const v = (u - 0.72) / 0.28;
        crouch = (1 - v) * 0.25;
      }
      p.lift = hop * 4.6;
      p.bodyTilt = -0.04 - hop * 0.08 + crouch * 0.2;
      p.breast.y += crouch * 0.7 - hop * 0.1;
      p.mid.y += crouch * 0.65;
      p.rump.y += crouch * 0.5;
      p.head.y += crouch * 0.5 - hop * 0.25;
      p.wingOpen = hop > 0.02 || (u > 0.1 && u < 0.8) ? 1 : 0;
      p.wingPhase = wing;
      p.tailFan = hop * 0.5;
      p.tailLift = hop * 0.4;
      if (hop > 0.05) {
        p.nearFoot = P(21.25, FY - 0.4 - hop * 0.2);
        p.farFoot = P(17.85, FY - 0.3 - hop * 0.2);
        p.nearLift = 1; p.farLift = 1;
      } else if (crouch > 0) {
        p.nearFoot = P(21.1, FY);
        p.farFoot = P(18.0, FY);
      }
    }

    if (action === "scratch") {
      const u = clamp(local, 0, 1);
      const rakes = Math.sin(u * Math.PI * 4.2);
      const lean = Math.sin(clamp(u, 0, 1) * Math.PI) * 0.7;
      p.bodyTilt = -0.04 + lean * 0.28;
      p.breast = P(21.7 + lean * 0.45, 16.1 + lean * 0.25);
      p.mid.x += lean * 0.15; p.mid.y += lean * 0.2;
      p.head = P(22.7 + lean * 1.1, 12.5 + lean * 2.2);
      p.headTilt = -0.08 + lean * 0.45;
      p.neckBend = 0.1 - lean * 0.2;
      const rake = Math.max(0, rakes);
      p.nearFoot = P(21.25 + 0.3 - rake * 1.4, FY - 0.15 - rake * 1.35);
      p.nearLift = 0.3 + rake * 1.2;
      p.scratch = rakes;
      p.nearHip = P(20.9 + lean * 0.2, 17.45);
    }

    if (action === "tap") {
      const u = clamp(local, 0, 1);
      const pop = u < 0.22 ? u / 0.22 : (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
      p.lift = Math.sin(clamp(u * 1.4, 0, 1) * Math.PI) * 1.15;
      p.headTilt = -0.08 - pop * 0.15;
      p.head.y -= pop * 0.25;
      p.tailFan = pop * 0.7;
      p.tailLift = pop * 0.5;
      p.wingDrop = pop * 0.35;
      p.ruffle = pop;
    }

    return p;
  }

  function draw(ctx, p, t) {
    ctx.save();
    if (p.dir < 0) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.translate(0, -(p.lift || 0));
    /* 以腳底為錨，稍微放大一點：身體仍明顯比貓小，雞冠和尾巴才看得清楚 */
    const RS = 1.12;
    ctx.translate(20, FY);
    ctx.scale(RS, RS);
    ctx.translate(-20, -FY);

    /* 遠側尾、遠側腳、遠側翅 → 身體 → 近側腳、頸、頭、近側翅、近側尾 */
    drawTail(ctx, p, t, "far");
    if (p.wingOpen) drawWingOpen(ctx, p, true, t);
    else drawWingFolded(ctx, p, true, t);
    drawLeg(ctx, p.farHip, p.farFoot, true, p.farLift, 0);
    drawBody(ctx, p, t);
    if (!p.wingOpen) drawWingFolded(ctx, p, false, t);
    drawLeg(ctx, p.nearHip, p.nearFoot, false, p.nearLift, p.scratch || 0);
    drawNeck(ctx, p, t);
    drawHead(ctx, p);
    if (p.wingOpen) drawWingOpen(ctx, p, false, t);
    drawTail(ctx, p, t, "near");

    ctx.restore();
  }

  /* 點擊範圍：身體＋頭＋尾巴大概的框（朝右畫布座標） */
  function hitLocal(p) {
    return { x0: 8.2, y0: 9.2 - (p.lift || 0), x1: 25.4, y1: 20.2 - (p.lift || 0) };
  }

  return { W, H, FY, STATS, makePose, draw, hitLocal, shade, iridColor };
})();

export { Rooster };
