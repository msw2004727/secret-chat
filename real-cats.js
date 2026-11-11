/* ===== 擬真貓繪製（全部用程式畫：漸層毛色、柔和陰影、眼睛反光；不使用任何外部圖片） =====
   座標單位＝原本像素格（32×20，朝右畫，地板 y=20）。呼叫前先 ctx.scale(每格幾個裝置像素)。 */
export const REAL = (() => {
  const TAU = Math.PI * 2;
  const PAL = {
    brown: { base: "#c58a52", top: "#9c6332", light: "#e3bb8a", belly: "#f4e3cc", dark: "#6e4019", stripe: "rgba(96,52,18,.62)", stripeSoft: "rgba(110,62,24,.30)",
      ear: "#e3a497", earDeep: "#c7786f", nose: "#d98b84", noseDark: "#a8564f", iris: "#d9a62c", irisIn: "#f2cf5a", irisOut: "#9a6d10", pad: "#c77f78", whisker: "rgba(255,250,240,.9)", edge: "rgba(70,38,14,.38)", tabby: true },
    gray: { base: "#8d9095", top: "#6d7076", light: "#b6b9bd", belly: "#dadbdd", dark: "#4b4e53", stripe: "rgba(70,72,78,.26)", stripeSoft: "rgba(70,72,78,.12)",
      ear: "#d3a39f", earDeep: "#a9706c", nose: "#9e7a7c", noseDark: "#6f4e50", iris: "#9fc33c", irisIn: "#d6e86a", irisOut: "#5f8a1c", pad: "#8f6c6e", whisker: "rgba(250,250,252,.9)", edge: "rgba(35,37,42,.38)", tabby: false }
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const P = (x, y) => ({ x, y });

  /* 凸包（把幾顆圓的取樣點包起來，做出平順的身體／頭外形） */
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  function blobPts(circles, n) {
    const pts = [];
    for (const c of circles) {
      const rx = c.rx || c.r, ry = c.ry || c.r, rot = c.rot || 0;
      for (let i = 0; i < (n || 28); i++) {
        const a = i / (n || 28) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        pts.push(P(c.x + x * Math.cos(rot) - y * Math.sin(rot), c.y + x * Math.sin(rot) + y * Math.cos(rot)));
      }
    }
    return hull(pts);
  }
  /* 平滑封閉路徑（中點二次曲線） */
  function smoothPath(ctx, pts) {
    const n = pts.length;
    ctx.beginPath();
    const m0 = P((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
    ctx.moveTo(m0.x, m0.y);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    ctx.closePath();
  }
  /* 毛邊：沿著外形畫細短毛，讓邊緣毛茸茸、不是硬邊 */
  function furEdge(ctx, pts, col, len, skipBelow) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 0.11; ctx.lineCap = "round"; ctx.globalAlpha = 0.75;
    const n = pts.length;
    let cx = 0, cy = 0; for (const p of pts) { cx += p.x; cy += p.y; } cx /= n; cy /= n;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      const k = Math.max(1, Math.round(d / 0.42));
      for (let j = 0; j < k; j++) {
        const t = j / k, x = lerp(p.x, q.x, t), y = lerp(p.y, q.y, t);
        if (skipBelow != null && y > skipBelow) continue;
        let nx = q.y - p.y, ny = -(q.x - p.x); const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        if ((x - cx) * nx + (y - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const r = h - Math.floor(h);
        const l = len * (0.25 + r * 0.45);
        ctx.moveTo(x - nx * 0.18, y - ny * 0.18);
        ctx.lineTo(x + nx * l + ny * l * 0.35, y + ny * l - nx * l * 0.35);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
  /* 淡淡的輪廓線：在淺色泡泡前面也看得清楚 */
  function contour(ctx, pts, pal) {
    ctx.save(); smoothPath(ctx, pts); ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.13; ctx.stroke(); ctx.restore();
  }
  /* 有粗細變化的腳／尾巴：外形（兩側＋圓頭），用平滑路徑畫 */
  function outline(pts, ws) {
    const L = [], R = [], n = pts.length;
    const nor = (i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      return { tx, ty, nx: -ty, ny: tx };
    };
    for (let i = 0; i < n; i++) {
      const { nx, ny } = nor(i), w = ws[i] / 2;
      L.push(P(pts[i].x + nx * w, pts[i].y + ny * w)); R.push(P(pts[i].x - nx * w, pts[i].y - ny * w));
    }
    const out = L.slice();
    { const e = pts[n - 1], { tx, ty, nx, ny } = nor(n - 1), w = ws[n - 1] / 2;
      for (let k = 1; k < 6; k++) { const th = k / 6 * Math.PI; out.push(P(e.x + w * (nx * Math.cos(th) + tx * Math.sin(th)), e.y + w * (ny * Math.cos(th) + ty * Math.sin(th)))); } }
    for (let i = n - 1; i >= 0; i--) out.push(R[i]);
    { const e = pts[0], { tx, ty, nx, ny } = nor(0), w = ws[0] / 2;
      for (let k = 1; k < 6; k++) { const th = k / 6 * Math.PI; out.push(P(e.x + w * (-nx * Math.cos(th) - tx * Math.sin(th)), e.y + w * (-ny * Math.cos(th) - ty * Math.sin(th)))); } }
    return out;
  }
  function limbPath(ctx, pts, ws) { smoothPath(ctx, outline(pts, ws)); }

  /* 腳：上粗下細，前腳直、後腳有大腿和腳踝的折角；遠側的腳比較暗 */
  function leg(ctx, pal, pts, ws, far, hind, noPaw) {
    ctx.save();
    const top = pts[0], bot = pts[pts.length - 1];
    const g = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
    g.addColorStop(0, far ? pal.top : pal.base);
    g.addColorStop(0.75, far ? shade(pal.base, -0.18) : pal.light);
    g.addColorStop(1, far ? shade(pal.light, -0.15) : pal.belly);
    ctx.fillStyle = g;
    limbPath(ctx, pts, ws); ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.11; ctx.stroke();
    if (pal.tabby && !far) { /* 腳上的虎斑 */
      ctx.save(); limbPath(ctx, pts, ws); ctx.clip();
      ctx.strokeStyle = pal.stripeSoft; ctx.lineWidth = 0.42;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        for (const t of [0.35, 0.75]) {
          const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
          ctx.beginPath(); ctx.moveTo(x - 1.4, y - 0.15); ctx.lineTo(x + 1.4, y + 0.15); ctx.stroke();
        }
      }
      ctx.restore();
    }
    /* 腳掌：小小橢圓，底下有一點陰影 */
    if (noPaw) { ctx.restore(); return; }
    ctx.fillStyle = far ? shade(pal.light, -0.15) : pal.belly;
    ctx.beginPath(); ctx.ellipse(bot.x + 0.35, bot.y - 0.05, ws[ws.length - 1] * 0.62, ws[ws.length - 1] * 0.42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 0.12;
    ctx.beginPath(); ctx.moveTo(bot.x + 0.1, bot.y + 0.2); ctx.lineTo(bot.x + 0.3, bot.y - 0.3); ctx.stroke();
    ctx.restore();
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }

  /* ---------- 尾巴（每次重畫都會輕輕擺動） ---------- */
  function tailPts(t, sway) {
    const n = 14, pts = [];
    let x = t.x, y = t.y, a = t.a;
    const step = t.len / n;
    pts.push(P(x, y));
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      a += (t.curve || 0) * step + (sway || 0) * Math.sin((t.ph || 0) - u * 2.2) * 0.11 * (0.3 + u);
      if (t.tipCurl && u > 0.6) a += t.tipCurl * step;
      x += Math.cos(a) * step; y += Math.sin(a) * step;
      if (t.floor != null && y > t.floor) y = t.floor;
      pts.push(P(x, y));
    }
    return pts;
  }
  function drawTail(ctx, name, t, sway) {
    if (!t) return;
    const pal = PAL[name];
    const pts = tailPts(t, sway);
    const ws = pts.map((_, i) => lerp(t.w || 1.55, (t.w || 1.55) * 0.55, i / (pts.length - 1)));
    ctx.save();
    const a = pts[0], b = pts[pts.length - 1];
    const g = ctx.createLinearGradient(a.x, a.y - 1, a.x, a.y + 1);
    ctx.fillStyle = pal.base;
    limbPath(ctx, pts, ws); ctx.fill();
    ctx.save(); limbPath(ctx, pts, ws); ctx.clip();
    /* 上側比較暗、下側比較亮：沿著尾巴畫偏移的線 */
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const off = (k, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => {
        const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
        let nx = -(q.y - o.y), ny = q.x - o.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (ny > 0) { nx = -nx; ny = -ny; } /* 朝上的那一側 */
        const x = p.x + nx * ws[i] * k, y = p.y + ny * ws[i] * k;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    };
    off(0.42, pal.top, 0.7);
    off(-0.45, pal.light, 0.55);
    if (pal.tabby) {
      /* 虎斑環＋深色尾巴尖 */
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.55;
      for (let i = 2; i < pts.length - 1; i += 2) {
        const p = pts[i], q = pts[i + 1];
        let nx = -(q.y - p.y), ny = q.x - p.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        ctx.beginPath(); ctx.moveTo(p.x + nx * 1.2, p.y + ny * 1.2); ctx.lineTo(p.x - nx * 1.2, p.y - ny * 1.2); ctx.stroke();
      }
    }
    ctx.fillStyle = pal.tabby ? pal.dark : pal.top;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(b.x, b.y, ws[ws.length - 1] * 0.75, 0, TAU); ctx.fill();
    ctx.restore();
    if (t.puff) puffSpikes(ctx, outline(pts, ws), pal, t.puff);
    furEdge(ctx, outline(pts, ws), pal.base, 0.32 + (t.puff || 0) * 0.5);
    ctx.restore();
    void g;
  }
  /* ---------- 眼睛 ---------- */
  function eye(ctx, pal, e, state, bonkDir) {
    const { x, y, rx, ry } = e;
    ctx.save();
    if (state === "bonk") {
      ctx.strokeStyle = "#1b1410"; ctx.lineWidth = 0.38; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const d = bonkDir || 1;
      ctx.beginPath(); ctx.moveTo(x - d * rx, y - ry * 1.05); ctx.lineTo(x + d * rx * 0.8, y); ctx.lineTo(x - d * rx, y + ry * 1.05); ctx.stroke();
      ctx.restore(); return;
    }
    if (state === "x") { /* 嚇昏：x_x */
      ctx.strokeStyle = "#1b1410"; ctx.lineWidth = 0.32; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - rx * 0.8, y - ry * 0.85); ctx.lineTo(x + rx * 0.8, y + ry * 0.85); ctx.moveTo(x + rx * 0.8, y - ry * 0.85); ctx.lineTo(x - rx * 0.8, y + ry * 0.85); ctx.stroke();
      ctx.restore(); return;
    }
    if (state === "closed" || state === "happy") {
      ctx.strokeStyle = "#241a12"; ctx.lineWidth = 0.3; ctx.lineCap = "round";
      ctx.beginPath();
      if (state === "happy") { ctx.moveTo(x - rx, y + ry * 0.35); ctx.quadraticCurveTo(x, y - ry * 1.1, x + rx, y + ry * 0.35); }
      else { ctx.moveTo(x - rx, y); ctx.quadraticCurveTo(x, y + ry * 0.9, x + rx, y); }
      ctx.stroke();
      ctx.restore(); return;
    }
    /* 眼眶（深色描邊），裡面是虹膜漸層、直立的瞳孔和反光 */
    const almond = () => {
      ctx.beginPath();
      ctx.moveTo(x - rx, y + ry * 0.1);
      ctx.bezierCurveTo(x - rx * 0.6, y - ry * 1.15, x + rx * 0.6, y - ry * 1.2, x + rx, y - ry * 0.05);
      ctx.bezierCurveTo(x + rx * 0.6, y + ry * 1.15, x - rx * 0.6, y + ry * 1.1, x - rx, y + ry * 0.1);
      ctx.closePath();
    };
    almond();
    ctx.fillStyle = "#1d150e"; ctx.fill();
    ctx.save();
    ctx.translate(x, y); ctx.scale(0.86, 0.84); ctx.translate(-x, -y);
    almond(); ctx.clip();
    const g = ctx.createRadialGradient(x - rx * 0.1, y + ry * 0.15, 0.05, x, y, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, pal.irisIn); g.addColorStop(0.55, pal.iris); g.addColorStop(1, pal.irisOut);
    ctx.fillStyle = g; ctx.fillRect(x - rx * 1.2, y - ry * 1.3, rx * 2.4, ry * 2.6);
    ctx.fillStyle = "#0d0906";
    ctx.beginPath(); ctx.ellipse(x + (e.px || 0), y + (e.py || 0), rx * (e.pw || 0.26), ry * (e.ph || 0.92), 0, 0, TAU); ctx.fill();
    /* 上眼皮的陰影 */
    const sg = ctx.createLinearGradient(x, y - ry, x, y);
    sg.addColorStop(0, "rgba(0,0,0,.45)"); sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg; ctx.fillRect(x - rx * 1.2, y - ry * 1.3, rx * 2.4, ry * 1.2);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath(); ctx.arc(x - rx * 0.3 + (e.px || 0) * 0.3, y - ry * 0.38 + (e.py || 0) * 0.4, Math.max(0.16, rx * 0.24), 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(x + rx * 0.32, y + ry * 0.38, Math.max(0.08, rx * 0.1), 0, TAU); ctx.fill();
    if (e.squint) { /* 用力時眼睛瞇一點：上眼皮往下蓋 */
      ctx.fillStyle = e.lid; ctx.beginPath(); ctx.ellipse(x, y - ry * (1.5 - e.squint), rx * 1.2, ry * 0.95, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(30,20,12,.85)"; ctx.lineWidth = 0.16; ctx.beginPath(); ctx.ellipse(x, y - ry * (1.5 - e.squint), rx * 1.12, ry * 0.95, 0, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    }
    if (state === "half") { /* 想睡：上眼皮蓋一半 */
      ctx.fillStyle = e.lid; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.55, rx * 1.15, ry * 0.75, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#241a12"; ctx.lineWidth = 0.22; ctx.beginPath(); ctx.moveTo(x - rx, y + ry * 0.05); ctx.quadraticCurveTo(x, y + ry * 0.35, x + rx, y); ctx.stroke();
    }
    ctx.restore();
  }
  /* 眨眼：在已經畫好的眼睛上蓋眼皮（每格重畫時用，很便宜） */
  function blinkLids(ctx, eyes, amt) {
    if (!eyes || amt <= 0) return;
    for (const e of eyes) {
      ctx.save();
      ctx.fillStyle = e.lid;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - e.ry * (1 - amt) * 1.1, e.rx * 1.2, e.ry * 1.18 * Math.min(1, amt + 0.1), 0, 0, TAU); ctx.fill();
      if (amt > 0.7) {
        ctx.strokeStyle = "#241a12"; ctx.lineWidth = 0.28; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(e.x - e.rx, e.y); ctx.quadraticCurveTo(e.x, e.y + e.ry * 0.7, e.x + e.rx, e.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* 咬住時露出來的上下尖牙（側臉座標） */
  function biteFangs(ctx, mo) {
        const ly = 1.7 + mo * 1.2;
        ctx.fillStyle = "#fffaf2";
        ctx.beginPath(); ctx.moveTo(2.95, 1.4); ctx.lineTo(3.3, 1.42); ctx.lineTo(3.1, 2.05); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2.3, 1.55); ctx.lineTo(2.6, 1.5); ctx.lineTo(2.48, 2.0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2.95, ly + 0.02); ctx.lineTo(3.28, ly - 0.02); ctx.lineTo(3.08, ly - 0.6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2.25, ly + 0.12); ctx.lineTo(2.55, ly + 0.12); ctx.lineTo(2.38, ly - 0.42); ctx.closePath(); ctx.fill();
  }
  /* 咬住時的嘴巴開口（側臉座標）：前面那張畫布把這塊挖空，看得到被咬進嘴裡的泡泡 */
  function mouthGap(ctx, mo) {
    ctx.beginPath(); ctx.moveTo(3.35, 1.35); ctx.lineTo(1.9, 1.7); ctx.quadraticCurveTo(2.6, 1.9 + mo * 1.4, 3.4, 1.7 + mo * 1.2); ctx.closePath();
  }
  /* ---------- 側臉（3/4 側，朝右） ---------- */
  function sideHead(ctx, pal, h, out) {
    const { x, y } = h, s = h.s || 1;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(h.tilt || 0); ctx.scale(s, s);
    const by = h.bk ? 0.35 : 0;
    ctx.translate(0, by);
    /* 耳朵（後面那隻先畫） */
    const earF = (ex, ey, rot, sz, far) => {
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot);
      ctx.fillStyle = far ? pal.top : pal.base;
      ctx.beginPath(); ctx.moveTo(-1.25 * sz, 0.6); ctx.quadraticCurveTo(-0.55 * sz, -1.6 * sz, 0.05 * sz, -2.55 * sz); ctx.quadraticCurveTo(0.75 * sz, -1.3 * sz, 1.2 * sz, 0.6); ctx.closePath(); ctx.fill();
      if (!far) {
        const g = ctx.createLinearGradient(0, -2.2 * sz, 0, 0.4);
        g.addColorStop(0, pal.earDeep); g.addColorStop(1, pal.ear);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-0.7 * sz, 0.4); ctx.quadraticCurveTo(-0.3 * sz, -1.2 * sz, 0.05 * sz, -1.95 * sz); ctx.quadraticCurveTo(0.45 * sz, -1.0 * sz, 0.75 * sz, 0.4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(-0.3, 0.2); ctx.lineTo(-0.05, -1.2); ctx.moveTo(0.2, 0.2); ctx.lineTo(0.1, -1.0); ctx.stroke();
      }
      ctx.restore();
    };
    const eb = h.earBack || 0;
    earF(-1.15, -2.2, -0.42 - eb, 1.0, true);
    earF(1.05, -2.45, 0.08 - eb * 0.6, 1.05, false);
    /* 頭形：頭殼＋臉頰＋口鼻 */
    const pts = blobPts([{ x: 0, y: 0, rx: 3.25, ry: 2.85 }, { x: -1.1, y: 1.0, rx: 2.4, ry: 2.2 }, { x: 2.35, y: 1.15, rx: 1.45, ry: 1.25 }], 22);
    const g = ctx.createLinearGradient(0, -3, 0, 3.2);
    g.addColorStop(0, pal.top); g.addColorStop(0.45, pal.base); g.addColorStop(1, pal.light);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    /* 臉頰和口鼻比較淺 */
    const mg = ctx.createRadialGradient(2.3, 1.5, 0.2, 2.3, 1.5, 2.2);
    mg.addColorStop(0, pal.belly); mg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mg; ctx.fillRect(-4, -4, 9, 9);
    const cg = ctx.createRadialGradient(-0.6, 2.4, 0.2, -0.6, 2.4, 2.4);
    cg.addColorStop(0, pal.light); cg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cg; ctx.fillRect(-4, -4, 9, 9);
    if (pal.tabby) {
      /* 額頭 M 字紋、臉頰的條紋 */
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.32; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0.1, -2.75); ctx.lineTo(0.35, -1.6);
      ctx.moveTo(-0.7, -2.6); ctx.lineTo(-0.35, -1.5);
      ctx.moveTo(0.9, -2.55); ctx.lineTo(0.95, -1.65);
      ctx.moveTo(-1.6, 0.6); ctx.quadraticCurveTo(-0.8, 0.4, -0.2, 0.75);
      ctx.moveTo(-1.8, 1.4); ctx.quadraticCurveTo(-1.0, 1.25, -0.4, 1.55);
      ctx.moveTo(-2.6, -1.2); ctx.lineTo(-1.6, -0.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,.07)";
      ctx.beginPath(); ctx.ellipse(0.4, -1.4, 1.6, 0.9, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    contour(ctx, pts, pal);
    furEdge(ctx, pts, pal.base, 0.3, 2.2);
    /* 眼睛：近的那隻大、遠的那隻小一點 */
    const st = h.eyes || "open";
    const E = [
      { x: 0.55, y: -0.25, rx: 0.78, ry: 0.62, px: 0.12, pw: h.pupil || 0.26 },
      { x: 2.5, y: -0.35, rx: 0.5, ry: 0.55, px: 0.1, pw: (h.pupil || 0.26) * 1.05 }
    ];
    if (h.wide) for (const e of E) { e.rx *= 1.3; e.ry *= 1.6; e.y -= 0.15; e.pw = 0.18; e.ph = 0.24; } /* 嚇到：眼睛瞪圓、瞳孔縮成小點 */
    for (const e of E) eye(ctx, pal, e, h.bk ? "bonk" : st, 1);
    /* 鼻子、嘴 */
    ctx.fillStyle = pal.nose;
    ctx.beginPath(); ctx.moveTo(3.15, 0.55); ctx.quadraticCurveTo(3.75, 0.35, 3.8, 0.72); ctx.quadraticCurveTo(3.55, 1.15, 3.4, 1.2); ctx.quadraticCurveTo(3.15, 0.95, 3.15, 0.55); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(3.42, 0.62, 0.12, 0, TAU); ctx.fill();
    const mo = h.mouth || 0;
    if (mo > 0) {
      /* 張嘴：下巴往下，看得到粉紅色舌頭和一顆小白牙 */
      ctx.fillStyle = "#4a1f1f";
      mouthGap(ctx, mo); ctx.fill();
      ctx.fillStyle = "#d77a7d"; ctx.beginPath(); ctx.ellipse(2.6, 1.9 + mo * 0.75, 0.6, 0.3, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fffaf2"; ctx.beginPath(); ctx.moveTo(3.05, 1.42); ctx.lineTo(3.25, 1.45); ctx.lineTo(3.15, 1.85); ctx.closePath(); ctx.fill();
      if (h.bite) biteFangs(ctx, mo);
      ctx.fillStyle = pal.light; ctx.beginPath(); ctx.ellipse(2.4, 2.0 + mo * 1.25, 1.05, 0.38, 0.15, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = pal.noseDark; ctx.lineWidth = 0.14; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(3.38, 1.2); ctx.lineTo(3.3, 1.55); ctx.quadraticCurveTo(2.95, 1.85, 2.6, 1.6); ctx.stroke();
    }
    if (h.tongue) {
      ctx.fillStyle = "#e58a8f";
      ctx.beginPath(); ctx.ellipse(3.55, 1.85, 0.42, 0.62, -0.35, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(160,60,70,.6)"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(3.5, 1.5); ctx.lineTo(3.62, 2.2); ctx.stroke();
    }
    /* 鬍鬚 */
    ctx.strokeStyle = pal.whisker; ctx.lineWidth = 0.075;
    ctx.beginPath();
    if (h.bite) for (const [dy, ex, ey] of [[0, 4.3, 2.2], [0.25, 3.9, 2.8], [0.5, 3.3, 3.2]]) { ctx.moveTo(2.6, 1.25 + dy); ctx.quadraticCurveTo(3.4, 1.7 + dy, ex, ey); }
    else for (const [dy, ex, ey] of [[0, 6.1, 0.4], [0.25, 6.0, 1.5], [0.5, 5.6, 2.5]]) { ctx.moveTo(2.8, 1.25 + dy); ctx.quadraticCurveTo(4.4, 1.0 + dy, ex, ey); }
    ctx.stroke();
    ctx.restore();
    if (out) {
      const c = Math.cos(h.tilt || 0), sn = Math.sin(h.tilt || 0);
      out.eyes = E.map((e) => ({ x: x + (e.x * c - (e.y + by) * sn) * s, y: y + (e.x * sn + (e.y + by) * c) * s, rx: e.rx * s, ry: e.ry * s, lid: pal.base }));
      out.open = !h.bk && st === "open";
    }
  }

  /* ---------- 正面的頭 ---------- */
  function frontHead(ctx, pal, h, out) {
    const { x, y } = h, s = h.s || 1;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(h.tilt || 0); ctx.scale(s, s);
    const by = h.bk ? 0.35 : 0;
    ctx.translate(0, by);
    const ear = (sx) => {
      ctx.save(); ctx.translate(sx * 1.85, -2.0); ctx.rotate(sx * 0.32); if (sx < 0) ctx.scale(-1, 1);
      ctx.fillStyle = pal.base;
      ctx.beginPath(); ctx.moveTo(-1.2, 0.7); ctx.quadraticCurveTo(-0.6, -1.5, 0.15, -2.5); ctx.quadraticCurveTo(0.9, -1.2, 1.25, 0.7); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, -2.2, 0, 0.4); g.addColorStop(0, pal.earDeep); g.addColorStop(1, pal.ear);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-0.7, 0.5); ctx.quadraticCurveTo(-0.3, -1.1, 0.12, -1.9); ctx.quadraticCurveTo(0.6, -0.9, 0.8, 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(-0.35, 0.3); ctx.lineTo(-0.05, -1.1); ctx.moveTo(0.25, 0.3); ctx.lineTo(0.15, -0.9); ctx.stroke();
      ctx.restore();
    };
    ear(-1); ear(1);
    const pts = blobPts([{ x: 0, y: -0.2, rx: 3.25, ry: 2.8 }, { x: 0, y: 1.0, rx: 3.55, ry: 2.15 }, { x: 0, y: 1.6, rx: 1.7, ry: 1.3 }], 22);
    const g = ctx.createLinearGradient(0, -3, 0, 3.2);
    g.addColorStop(0, pal.top); g.addColorStop(0.5, pal.base); g.addColorStop(1, pal.light);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    const mg = ctx.createRadialGradient(0, 1.75, 0.2, 0, 1.75, 2.1);
    mg.addColorStop(0, pal.belly); mg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mg; ctx.fillRect(-4, -4, 8, 8);
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.32; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -2.85); ctx.lineTo(0, -1.7);
      ctx.moveTo(-0.75, -2.7); ctx.lineTo(-0.5, -1.65);
      ctx.moveTo(0.75, -2.7); ctx.lineTo(0.5, -1.65);
      for (const sx of [-1, 1]) {
        ctx.moveTo(sx * 3.3, 0.4); ctx.quadraticCurveTo(sx * 2.6, 0.3, sx * 2.0, 0.6);
        ctx.moveTo(sx * 3.3, 1.2); ctx.quadraticCurveTo(sx * 2.7, 1.1, sx * 2.2, 1.35);
        ctx.moveTo(sx * 1.55, -0.95); ctx.quadraticCurveTo(sx * 2.4, -0.55, sx * 2.8, 0.0);
      }
      ctx.stroke();
    }
    ctx.restore();
    contour(ctx, pts, pal);
    furEdge(ctx, pts, pal.base, 0.3, 2.6);
    const st = h.eyes || "open";
    const E = [{ x: -1.3, y: -0.15, rx: 0.78, ry: 0.66, px: 0.06, pw: h.pupil || 0.26 }, { x: 1.3, y: -0.15, rx: 0.78, ry: 0.66, px: -0.06, pw: h.pupil || 0.26 }];
    E.forEach((e, i) => eye(ctx, pal, e, h.bk ? "bonk" : st, i === 0 ? 1 : -1));
    /* 鼻子（倒三角）、人中、嘴 */
    ctx.fillStyle = pal.nose;
    ctx.beginPath(); ctx.moveTo(-0.45, 0.85); ctx.quadraticCurveTo(0, 0.7, 0.45, 0.85); ctx.quadraticCurveTo(0.1, 1.35, 0, 1.38); ctx.quadraticCurveTo(-0.1, 1.35, -0.45, 0.85); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(-0.12, 0.88, 0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.noseDark; ctx.lineWidth = 0.13; ctx.lineCap = "round";
    if (h.bite) {
      /* 咬住東西：嘴巴張開一點，看得到上排兩顆小尖牙咬著 */
      ctx.beginPath(); ctx.moveTo(0, 1.38); ctx.lineTo(0, 1.6); ctx.stroke();
      ctx.fillStyle = "#3b1718";
      ctx.beginPath(); ctx.moveTo(-0.95, 1.72); ctx.quadraticCurveTo(0, 1.45, 0.95, 1.72); ctx.quadraticCurveTo(0.55, 2.5, 0, 2.55); ctx.quadraticCurveTo(-0.55, 2.5, -0.95, 1.72); ctx.fill();
      ctx.fillStyle = "#d77a7d"; ctx.beginPath(); ctx.ellipse(0, 2.3, 0.45, 0.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fffaf2";
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 0.62, 1.66); ctx.lineTo(sx * 0.3, 1.6); ctx.lineTo(sx * 0.47, 2.1); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = pal.light; ctx.beginPath(); ctx.ellipse(0, 2.75, 0.85, 0.3, 0, 0, TAU); ctx.fill();
    } else {
    ctx.beginPath(); ctx.moveTo(0, 1.38); ctx.lineTo(0, 1.7); ctx.quadraticCurveTo(-0.35, 2.0, -0.7, 1.75); ctx.moveTo(0, 1.7); ctx.quadraticCurveTo(0.35, 2.0, 0.7, 1.75); ctx.stroke();
    }
    if (h.tongue) {
      ctx.fillStyle = "#e58a8f"; ctx.beginPath(); ctx.ellipse(0, 2.1, 0.42, 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(160,60,70,.6)"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, 1.8); ctx.lineTo(0, 2.45); ctx.stroke();
    }
    ctx.strokeStyle = pal.whisker; ctx.lineWidth = 0.075;
    ctx.beginPath();
    for (const sx of [-1, 1]) for (const [dy, ex, ey] of [[0, 5.6, 0.7], [0.25, 5.7, 1.6], [0.5, 5.2, 2.6]]) { ctx.moveTo(sx * 0.9, 1.45 + dy); ctx.quadraticCurveTo(sx * 3, 1.25 + dy, sx * ex, ey); }
    ctx.stroke();
    ctx.restore();
    if (out) {
      const c = Math.cos(h.tilt || 0), sn = Math.sin(h.tilt || 0);
      out.eyes = E.map((e) => ({ x: x + (e.x * c - (e.y + by) * sn) * s, y: y + (e.x * sn + (e.y + by) * c) * s, rx: e.rx * s, ry: e.ry * s, lid: pal.base }));
      out.open = !h.bk && st === "open";
    }
  }

  /* ---------- 側面身體 ---------- */
  function sideBody(ctx, pal, p) {
    const hip = p.hip, ch = p.chest;
    const circles = [{ x: hip.x, y: hip.y, r: p.rh }, { x: ch.x, y: ch.y, r: p.rc }];
    if (p.mid) circles.push({ x: (hip.x + ch.x) / 2 + (p.mid.dx || 0), y: (hip.y + ch.y) / 2 + (p.mid.dy || 0), rx: p.mid.rx, ry: p.mid.ry });
    let pts = blobPts(circles, 30);
    /* 肚子稍微下垂 */
    if (p.sag) {
      const ax = ch.x - hip.x, ay = ch.y - hip.y, L2 = ax * ax + ay * ay;
      pts = pts.map((q) => {
        const t = ((q.x - hip.x) * ax + (q.y - hip.y) * ay) / L2;
        const side = (q.x - hip.x) * ay - (q.y - hip.y) * ax; /* 正：在下面 */
        if (t > 0 && t < 1 && side < 0) return P(q.x, q.y + p.sag * Math.sin(Math.PI * t));
        return q;
      });
    }
    const ang = Math.atan2(ch.y - hip.y, ch.x - hip.x);
    const nx = Math.sin(ang), ny = -Math.cos(ang); /* 朝背的方向 */
    const mx = (hip.x + ch.x) / 2, my = (hip.y + ch.y) / 2, R = Math.max(p.rh, p.rc);
    const g = ctx.createLinearGradient(mx + nx * R, my + ny * R, mx - nx * R * 1.05, my - ny * R * 1.05);
    g.addColorStop(0, pal.top); g.addColorStop(0.4, pal.base); g.addColorStop(0.78, pal.light); g.addColorStop(1, pal.belly);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    /* 背上的光 */
    const hl = ctx.createRadialGradient(mx + nx * R * 0.55, my + ny * R * 0.55, 0.2, mx + nx * R * 0.55, my + ny * R * 0.55, R * 1.6);
    hl.addColorStop(0, "rgba(255,255,255,.16)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.fillRect(-2, -2, 40, 30);
    if (pal.tabby) {
      /* 身體的虎斑：從背往肚子的弧形條紋 */
      ctx.strokeStyle = pal.stripe; ctx.lineCap = "round";
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = 0.08 + i / (n - 1) * 0.84;
        const bx = lerp(hip.x, ch.x, t), byy = lerp(hip.y, ch.y, t);
        const r = lerp(p.rh, p.rc, t);
        ctx.lineWidth = i % 2 ? 0.5 : 0.62;
        ctx.beginPath();
        ctx.moveTo(bx + nx * r * 1.1 - 0.3, byy + ny * r * 1.1);
        ctx.quadraticCurveTo(bx + nx * r * 0.2 + 0.45, byy + ny * r * 0.2, bx - nx * r * 0.35 - 0.1, byy - ny * r * 0.35);
        ctx.stroke();
      }
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(hip.x + nx * p.rh * 0.95, hip.y + ny * p.rh * 0.95); ctx.lineTo(ch.x + nx * p.rc * 0.95, ch.y + ny * p.rc * 0.95); ctx.stroke();
    } else {
      ctx.fillStyle = pal.stripeSoft;
      for (let i = 0; i < 5; i++) {
        const t = 0.15 + i * 0.17, bx = lerp(hip.x, ch.x, t), byy = lerp(hip.y, ch.y, t), r = lerp(p.rh, p.rc, t);
        ctx.beginPath(); ctx.ellipse(bx + nx * r * 0.55, byy + ny * r * 0.55, 0.35, r * 0.5, ang, 0, TAU); ctx.fill();
      }
    }
    /* 肚子下緣的陰影 */
    ctx.fillStyle = "rgba(0,0,0,.10)";
    ctx.beginPath(); ctx.ellipse(mx - nx * R * 1.15, my - ny * R * 1.15, Math.hypot(ch.x - hip.x, ch.y - hip.y) * 0.55, R * 0.45, ang, 0, TAU); ctx.fill();
    ctx.restore();
    contour(ctx, pts, pal);
    if (p.puff) { puffSpikes(ctx, pts, pal, p.puff); furEdge(ctx, pts, pal.base, 0.3 + p.puff * 0.5); } /* 炸毛 */
    else furEdge(ctx, pts, pal.base, 0.34);
    return pts;
  }
  /* 胸前的淺色毛（脖子到胸口） */
  function chestBib(ctx, pal, x, y, rx, ry, rot) {
    const g = ctx.createRadialGradient(x, y, 0.1, x, y, Math.max(rx, ry));
    g.addColorStop(0, pal.belly); g.addColorStop(0.55, pal.light); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  /* 後腿大腿（肌肉）：邊緣柔和地融進身體，只有一點立體的亮面和陰影 */
  function thigh(ctx, pal, x, y, rx, ry, rot, far) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = far ? pal.top : pal.base;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    if (!far) {
      const g = ctx.createRadialGradient(-rx * 0.25, -ry * 0.35, 0.1, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, "rgba(255,255,255,.14)"); g.addColorStop(0.6, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.07)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
      if (pal.tabby) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
        ctx.strokeStyle = pal.stripeSoft; ctx.lineWidth = 0.5; ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-rx * 0.9, -ry * 0.5 + i * ry * 0.5); ctx.quadraticCurveTo(0, -ry * 0.25 + i * ry * 0.5, rx * 0.6, -ry * 0.55 + i * ry * 0.55); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* 腳的骨架：給髖/肩位置、腳掌位置，算出膝蓋 */
  function frontLeg(sh, paw, bend) {
    const mx = (sh.x + paw.x) / 2 + (bend || 0), my = (sh.y + paw.y) / 2;
    return [sh, P(mx, my), P(paw.x, paw.y - 0.4), paw];
  }
  function hindLeg(hp, paw, knee, hock) {
    return [hp, knee, hock, paw];
  }

  /* ===== 側面姿勢（站、走、跑、跳、咬、吊、側坐） ===== */
  function drawSide(ctx, name, p, out, bk) {
    const pal = PAL[name];
    const W1 = 1.5, W2 = 1.02;
    /* 遠側的腳 */
    for (const L of p.legs.filter((l) => l.far)) {
      leg(ctx, pal, L.pts, L.ws || (L.hind ? [1.9, 1.2, 0.95, 1.0] : [W1 * 1.1, W1, W2, W2]), true, L.hind);
      if (L.hind) thigh(ctx, pal, L.pts[0].x + 0.3, L.pts[0].y + 0.4, p.rh * 0.72, p.rh * 0.82, -0.3, true);
    }
    sideBody(ctx, pal, p);
    /* 近側的腳 */
    for (const L of p.legs.filter((l) => !l.far)) {
      /* 後腳：先畫小腿，再蓋上大腿，看起來是從大腿下面長出來 */
      if (L.hind) {
        leg(ctx, pal, L.pts.slice(1), L.ws ? L.ws.slice(1) : [1.4, 1.05, 1.08], false, true);
        const k = L.pts[1], h = L.pts[0];
        thigh(ctx, pal, lerp(h.x, k.x, 0.42), lerp(h.y, k.y, 0.42) - 0.2, p.thighRx || p.rh * 0.82, p.thighRy || p.rh * 0.98, Math.atan2(k.y - h.y, k.x - h.x) - Math.PI / 2, false);
      } else leg(ctx, pal, L.pts, L.ws || [W1 * 1.15, W1 * 1.02, W2, W2 * 1.05], false, false);
    }
    /* 脖子：胸口連到頭 */
    const hd = p.head, ch = p.chest;
    const nk = P(lerp(ch.x, hd.x, 0.45), lerp(ch.y, hd.y, 0.5) + 0.4);
    ctx.fillStyle = pal.base;
    const neck = blobPts([{ x: ch.x + 0.2, y: ch.y - 0.1, r: p.rc * 0.92 }, { x: nk.x, y: nk.y, r: 2.0 }, { x: hd.x - 0.7, y: hd.y + 0.9, r: 1.9 }], 18);
    const ng = ctx.createLinearGradient(nk.x - 1.5, nk.y - 2.5, nk.x + 0.5, nk.y + 2.5);
    ng.addColorStop(0, pal.top); ng.addColorStop(0.45, pal.base); ng.addColorStop(1, pal.light);
    smoothPath(ctx, neck); ctx.fillStyle = ng; ctx.fill();
    ctx.save(); smoothPath(ctx, neck); ctx.clip();
    chestBib(ctx, pal, lerp(ch.x, hd.x, 0.5) + 1.6, lerp(ch.y, hd.y, 0.3) + 1.6, 1.4, 2.6, -0.35);
    ctx.restore();
    furEdge(ctx, neck, pal.base, 0.3, nk.y + 0.5);
    sideHead(ctx, pal, Object.assign({}, hd, { bk }), out);
  }

  /* ===== 正面坐姿（坐、舔爪、抓牆、抬腿舔毛、談戀愛最後一段） ===== */
  /* 正面坐著的前腳：肩膀（藏在胸毛裡）→ 手肘微微往外 → 手腕變細 → 圓圓的腳掌和腳趾 */
  function frontLegF(ctx, pal, cx, fy, sx) {
    const pts = [P(cx + sx * 1.45, fy - 7.0), P(cx + sx * 1.75, fy - 4.6), P(cx + sx * 1.38, fy - 1.7), P(cx + sx * 1.36, fy - 0.85)];
    const ws = [1.75, 1.42, 0.98, 1.02];
    ctx.save();
    const g = ctx.createLinearGradient(cx + sx * 0.4, 0, cx + sx * 2.5, 0); /* 內側亮、外側暗：看起來是圓的 */
    g.addColorStop(0, shade(pal.base, 0.06)); g.addColorStop(0.5, pal.base); g.addColorStop(1, pal.top);
    limbPath(ctx, pts, ws); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.2; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); limbPath(ctx, pts, ws); ctx.clip();
    /* 內側邊緣一道陰影：跟胸口分開，看得出是兩隻腳 */
    ctx.strokeStyle = "rgba(40,20,5,.3)"; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(pts[0].x - sx * 0.85, pts[0].y); ctx.quadraticCurveTo(pts[1].x - sx * 0.72, pts[1].y, pts[2].x - sx * 0.5, pts[2].y); ctx.stroke();
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripeSoft; ctx.lineWidth = 0.38; ctx.lineCap = "round";
      for (const y of [fy - 5.2, fy - 3.9, fy - 2.7]) { ctx.beginPath(); ctx.moveTo(cx + sx * 2.5, y - 0.2); ctx.quadraticCurveTo(cx + sx * 1.6, y + 0.15, cx + sx * 0.9, y + 0.05); ctx.stroke(); }
    }
    /* 腳腕下面變白（手套） */
    const gg = ctx.createLinearGradient(0, fy - 2.3, 0, fy - 1.0); gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(1, pal.belly);
    ctx.fillStyle = gg; ctx.fillRect(cx + sx * 1.4 - 1.5, fy - 2.3, 3.0, 2.3);
    ctx.restore();
    /* 腳掌：比手腕寬一點的扁圓，三條腳趾縫 */
    const px = cx + sx * 1.42, py = fy - 0.55;
    ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(px, py, 0.92, 0.55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.strokeStyle = "rgba(60,35,15,.35)"; ctx.lineWidth = 0.08;
    ctx.beginPath();
    for (const k of [-0.4, 0, 0.4]) { ctx.moveTo(px + k, py + 0.5); ctx.lineTo(px + k * 0.9, py - 0.08); }
    ctx.stroke();
    /* 手肘外側的陰影 */
    ctx.strokeStyle = "rgba(40,20,5,.22)"; ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(cx + sx * 2.1, fy - 6.4); ctx.quadraticCurveTo(cx + sx * 2.45, fy - 4.7, cx + sx * 1.9, fy - 3.4); ctx.stroke();
    ctx.restore();
  }
  function drawFront(ctx, name, p, out, bk) {
    const pal = PAL[name];
    const cx = p.cx, fy = 20 - (p.lift || 0);
    /* 後腿（兩側鼓起來的大腿） */
    for (const sx of [-1, 1]) {
      if (p.legUp && sx < 0) continue;
      thigh(ctx, pal, cx + sx * 2.85, fy - 2.2, 2.0, 2.15, sx * 0.2, false);
      ctx.fillStyle = pal.light;
      ctx.beginPath(); ctx.ellipse(cx + sx * 3.6, fy - 0.45, 1.25, 0.55, 0, 0, TAU); ctx.fill();
    }
    /* 身體（梨形） */
    const st = p.stretch || 0; /* 站高高（抓牆）：身體往上拉長 */
    const blobs = [{ x: cx, y: fy - 3.0, rx: 3.6, ry: 3.0 }, { x: cx, y: fy - 6.0 - st * 0.5, rx: 3.0, ry: 2.6 + st * 0.3 },
      { x: cx + (p.shX || 0), y: fy - 7.6 - st * 0.85 + (p.shY || 0), rx: 2.95, ry: 1.9 }]; /* 肩膀：頭坐在肩膀上，不是坐在一根棍子上 */
    if (st) blobs.push({ x: cx + 0.3, y: fy - 6.4 - st, rx: 2.5, ry: 2.4 });
    const pts = blobPts(blobs, 26);
    const g = ctx.createLinearGradient(cx - 3.5, 0, cx + 3.5, 0);
    g.addColorStop(0, pal.top); g.addColorStop(0.35, pal.base); g.addColorStop(0.7, pal.base); g.addColorStop(1, pal.top);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.5; ctx.lineCap = "round";
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(cx + sx * 3.7, fy - 6 + i * 1.6); ctx.quadraticCurveTo(cx + sx * 2.6, fy - 5.4 + i * 1.6, cx + sx * 2.1, fy - 4.6 + i * 1.6); ctx.stroke();
      }
    }
    chestBib(ctx, pal, cx, fy - 4.6 - st * 0.6, 2.1, 3.4 + st * 0.4, 0);
    ctx.restore();
    furEdge(ctx, pts, pal.base, 0.34, fy - 1);
    /* 前腳 */
    const noLegs = p.raise === "wall" || p.raise === "claw";
    if (!noLegs) { /* 兩腳中間的陰影 */
      const sg = ctx.createLinearGradient(0, fy - 5.0, 0, fy); sg.addColorStop(0, "rgba(40,20,5,0)"); sg.addColorStop(0.5, "rgba(40,20,5,.3)"); sg.addColorStop(1, "rgba(40,20,5,.5)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, fy - 2.4, 0.75, 2.6, 0, 0, TAU); ctx.fill();
    }
    [-1, 1].forEach((sx) => {
      if (noLegs || (p.raise && sx === 1)) return;
      frontLegF(ctx, pal, cx, fy, sx);
    });
    if (!noLegs) { /* 胸前的長毛蓋住腳的上端 */
      const bg = ctx.createRadialGradient(cx, fy - 7.0, 0.2, cx, fy - 6.8, 2.3);
      bg.addColorStop(0, pal.belly); bg.addColorStop(0.55, pal.light); bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, fy - 6.9, 2.4, 1.7, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (p.legUp) {
      /* 抬起一隻後腿舔（理毛的姿勢） */
      /* 大腿從屁股側面鼓出來，小腿斜斜往上、腳踝折一下，腳掌朝前（腳底肉球看得到） */
      thigh(ctx, pal, cx - 3.0, fy - 3.0, 2.3, 2.6, -0.5, false);
      const kn = P(cx - 4.6, fy - 5.6), an = P(cx - 5.9, fy - 10.4), toe = P(cx - 5.2, fy - 12.9);
      leg(ctx, pal, [P(cx - 3.0, fy - 3.2), kn, an, toe], [2.3, 1.45, 1.0, 1.05], false, true);
      ctx.save(); ctx.translate(toe.x, toe.y); ctx.rotate(0.3);
      ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 1.05, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.fillStyle = pal.pad; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, 0.2, 0.36, 0.3, 0, 0, TAU); ctx.fill();
      for (const k of [-0.42, -0.14, 0.14, 0.42]) { ctx.beginPath(); ctx.arc(k, -0.45 - (Math.abs(k) < 0.2 ? 0.12 : 0), 0.13, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    const hd = Object.assign({}, p.head, { bk });
    frontHead(ctx, pal, hd, out);
    if (p.raise === "mouth") {
      /* 舉起前腳到嘴邊舔 */
      /* 手肘彎起來：上臂往前下、前臂直直往上，腳掌翻過來湊到嘴邊（舌頭舔在肉球上） */
      const sh = P(cx + 1.5, fy - 6.6), el = P(cx + 2.5, fy - 3.7), pw = P(hd.x + 1.0, hd.y + 2.5);
      leg(ctx, pal, [sh, P(lerp(sh.x, el.x, 0.5), lerp(sh.y, el.y, 0.5)), el], [1.75, 1.55, 1.4], false, false, true);
      leg(ctx, pal, [el, P(lerp(el.x, pw.x, 0.5), lerp(el.y, pw.y, 0.5)), pw], [1.4, 1.15, 1.0], false, false, true);
      ctx.fillStyle = "rgba(40,20,5,.2)"; ctx.beginPath(); ctx.ellipse(el.x + 0.35, el.y + 0.2, 0.55, 0.35, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(pw.x, pw.y); ctx.rotate(-0.35);
      ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(0, -0.1, 0.85, 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.fillStyle = pal.pad; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(-0.1, 0.05, 0.34, 0.26, 0, 0, TAU); ctx.fill();
      for (const k of [-0.45, -0.15, 0.15, 0.45]) { ctx.beginPath(); ctx.arc(k, -0.45, 0.12, 0, TAU); ctx.fill(); }
      ctx.restore();
    } else if (p.raise === "wall") {
      /* 伸長前腳去抓牆（兩隻爪子往右上） */
      const up = p.wallUp || 0, sy = fy - 6.4 - st;
      const wx = p.wallX || 27.6;
      /* 兩隻前腳：肩膀→手肘（往下垂一點）→ 爪子扣在牆上；兩格輪流一高一低，扒的那隻肩膀跟著抬 */
      const arm = (sh, el, pw, far) => {
        leg(ctx, pal, [sh, P(lerp(sh.x, el.x, 0.5), lerp(sh.y, el.y, 0.5) + 0.1), el], [1.6, 1.45, 1.3], far, false, true);
        leg(ctx, pal, [el, P(lerp(el.x, pw.x, 0.5), lerp(el.y, pw.y, 0.5) + 0.1), pw], [1.3, 1.1, 1.0], far, false, true);
        ctx.save(); ctx.translate(pw.x, pw.y); ctx.rotate(-1.2);
        ctx.fillStyle = far ? shade(pal.belly, -0.12) : pal.belly; ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 0.62, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.strokeStyle = "rgba(250,250,246,.9)"; ctx.lineWidth = 0.11; ctx.lineCap = "round"; ctx.beginPath();
        for (const k of [-0.45, -0.15, 0.15, 0.45]) { ctx.moveTo(k, -0.55); ctx.lineTo(k * 1.1, -0.95); }
        ctx.stroke(); ctx.restore();
      };
      const lo = 1 - up, hi = up;
      const elOf = (sh, pw, sag) => P(lerp(sh.x, pw.x, 0.45), lerp(sh.y, pw.y, 0.45) + sag);
      { const sh = P(cx + 0.9, sy + 0.9 + lo * 0.25), pw = P(wx - 0.9, sy - 2.2 - hi * 3.2); arm(sh, elOf(sh, pw, 1.25), pw, true); }
      { const sh = P(cx + 1.3, sy - 0.1 - lo * 0.35), pw = P(wx - 0.9, sy - 5.4 + hi * 3.0); arm(sh, elOf(sh, pw, 1.05), pw, false); }
    }
  }

  /* ===== 睡覺（縮成一團的麵包，頭靠在前面，尾巴繞到前面） ===== */
  function drawCurl(ctx, name, p, out, bk) {
    const pal = PAL[name];
    const fy = 20, b = p.breath || 0;
    const pts = blobPts([{ x: 9.5, y: fy - 2.9 - b, rx: 6.0, ry: 2.9 + b }, { x: 15.5, y: fy - 2.5, rx: 4.5, ry: 2.5 }], 28);
    const g = ctx.createLinearGradient(0, fy - 6.5, 0, fy);
    g.addColorStop(0, pal.top); g.addColorStop(0.5, pal.base); g.addColorStop(1, pal.light);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    const hl = ctx.createRadialGradient(9, fy - 5.2, 0.2, 9, fy - 5.2, 5);
    hl.addColorStop(0, "rgba(255,255,255,.16)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.fillRect(0, 10, 30, 10);
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) { ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(5 + i * 2, fy - 6); ctx.quadraticCurveTo(5.8 + i * 2, fy - 4, 5.3 + i * 2, fy - 2.2); ctx.stroke(); }
    }
    ctx.restore();
    furEdge(ctx, pts, pal.base, 0.34, fy - 0.8);
    /* 前腳收在胸前 */
    ctx.fillStyle = pal.light;
    ctx.beginPath(); ctx.ellipse(19.2, fy - 0.75, 1.6, 0.7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(21.2, fy - 0.7, 1.3, 0.62, 0, 0, TAU); ctx.fill();
    const hd = Object.assign({ x: 20.6, y: fy - 4.0, s: 0.92, eyes: "closed", tilt: 0.12 }, p.head, { bk });
    frontHead(ctx, pal, hd, out);
  }

  /* ===== 側坐（側面坐著：屁股著地、前腳直直的） ===== */
  function drawSideSit(ctx, name, p, out, bk) {
    const pal = PAL[name];
    const fy = 20, tall = p.tall || 0;
    /* 遠側前腳 */
    leg(ctx, pal, [P(19.6, fy - 6.5), P(19.9, fy - 3.4), P(20.1, fy - 0.9), P(20.3, fy - 0.5)], [1.2, 1.05, 0.9, 0.95], true, false);
    /* 身體：大大的屁股＋往上斜的胸口 */
    const pts = sideBody(ctx, pal, { hip: P(13.2, fy - 3.4), rh: 3.4, chest: P(18.6, fy - 7.6 - tall * 0.6), rc: 2.75, mid: { rx: 3.0, ry: 3.2, dx: 0.6, dy: 0.4 } });
    void pts;
    /* 大腿（近側）和後腳掌 */
    thigh(ctx, pal, 13.6, fy - 3.0, 3.0, 2.85, -0.2, false);
    ctx.fillStyle = pal.light;
    ctx.beginPath(); ctx.ellipse(15.6, fy - 0.55, 2.0, 0.6, 0, 0, TAU); ctx.fill();
    /* 近側前腳 */
    leg(ctx, pal, [P(19.0, fy - 6.8), P(19.3, fy - 3.4), P(19.2, fy - 0.9), P(19.4, fy - 0.45)], [1.4, 1.15, 1.0, 1.05], false, false);
    const hd = Object.assign({ x: 21.0, y: 7.2 - tall, s: 1 }, p.head);
    const ch = P(18.8, fy - 8.0 - tall * 0.6);
    const neck = blobPts([{ x: ch.x, y: ch.y, r: 2.5 }, { x: hd.x - 0.6, y: hd.y + 1.0, r: 2.3 }], 18);
    const ng = ctx.createLinearGradient(ch.x, hd.y - 2, ch.x, ch.y + 2);
    ng.addColorStop(0, pal.top); ng.addColorStop(0.5, pal.base); ng.addColorStop(1, pal.light);
    smoothPath(ctx, neck); ctx.fillStyle = ng; ctx.fill();
    chestBib(ctx, pal, 20.0, fy - 8.3 - tall * 0.6, 1.5, 2.4, -0.2);
    furEdge(ctx, neck, pal.base, 0.3, ch.y);
    sideHead(ctx, pal, Object.assign({}, hd, { bk }), out);
  }

  /* ===== 吊著：仰頭朝上咬住泡泡底邊（頭往後仰、口鼻朝上、張嘴咬住），身體垂在下面
     座標＝20×32 吊掛格；pt＝咬住點（嘴裡），頭用 3/4 側臉轉成朝上 ===== */
  const HF = (() => {
    const pt = { x: 10, y: 2.9 }, s = 1.05, G = { x: 0, y: -1.5 }; /* G＝頭的座標裡嘴巴開口（咬住點） */
    return { th: 0, s, pt, G, hx: pt.x - G.x * s, hy: pt.y - G.y * s, cx: 10, sh: 10.7, hip: 17.4 };
  })();
  /* 仰起來的頭（正面看）：口鼻朝上頂進泡泡，嘴巴張開往上咬；看得到下巴、喉嚨的淺色底面，耳朵往後倒向兩側 */
  function upHead(ctx, pal, h, out) {
    const { x, y } = h, s = h.s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const by = h.bk ? 0.3 : 0; ctx.translate(0, by);
    /* 耳朵：用力時往後貼（「飛機耳」），三角形朝兩側斜上，看得到內側粉紅和耳毛 */
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(sx * 2.35, -1.55); ctx.rotate(sx * 1.12); if (sx < 0) ctx.scale(-1, 1);
      ctx.scale(1.05, 0.95);
      ctx.fillStyle = pal.base;
      ctx.beginPath(); ctx.moveTo(-1.25, 0.75); ctx.quadraticCurveTo(-0.75, -1.3, 0.1, -2.55); ctx.quadraticCurveTo(0.85, -1.25, 1.3, 0.75); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.1; ctx.stroke();
      const g = ctx.createLinearGradient(0, -2.2, 0, 0.5); g.addColorStop(0, pal.earDeep); g.addColorStop(1, pal.ear);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-0.72, 0.55); ctx.quadraticCurveTo(-0.38, -1.05, 0.1, -1.95); ctx.quadraticCurveTo(0.55, -0.95, 0.8, 0.55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 0.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-0.35, 0.35); ctx.lineTo(-0.1, -1.15); ctx.moveTo(0.2, 0.35); ctx.lineTo(0.12, -0.95); ctx.moveTo(0.5, 0.4); ctx.lineTo(0.35, -0.6); ctx.stroke();
      ctx.restore();
    }
    /* 頭形：頭殼＋寬寬的下巴兩頰＋往上的口鼻 */
    const pts = blobPts([{ x: 0, y: -0.7, rx: 3.05, ry: 2.5 }, { x: 0, y: 0.9, rx: 3.25, ry: 2.2 }, { x: 0, y: -2.55, rx: 1.6, ry: 1.25 }], 24);
    const g = ctx.createLinearGradient(0, -3.8, 0, 3.2);
    g.addColorStop(0, pal.base); g.addColorStop(0.4, pal.base); g.addColorStop(1, pal.light);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    /* 兩側比較暗（頭殼側面），中間下巴、喉嚨是淺色的底面 */
    const sg = ctx.createLinearGradient(-3.3, 0, 3.3, 0);
    sg.addColorStop(0, "rgba(0,0,0,.20)"); sg.addColorStop(0.3, "rgba(0,0,0,0)"); sg.addColorStop(0.7, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,.20)");
    ctx.fillStyle = sg; ctx.fillRect(-4, -4, 8, 8);
    const cg = ctx.createRadialGradient(0, 1.3, 0.2, 0, 1.3, 2.0);
    cg.addColorStop(0, pal.belly); cg.addColorStop(0.65, pal.light); cg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cg; ctx.globalAlpha = 0.4; ctx.fillRect(-4, -2, 8, 6); ctx.globalAlpha = 1;
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.32; ctx.lineCap = "round";
      ctx.beginPath();
      for (const sx of [-1, 1]) {
        ctx.moveTo(sx * 3.0, -1.6); ctx.quadraticCurveTo(sx * 2.4, -1.2, sx * 2.25, -0.5);
        ctx.moveTo(sx * 3.2, -0.4); ctx.quadraticCurveTo(sx * 2.6, -0.1, sx * 2.5, 0.6);
      }
      ctx.stroke();
    }
    ctx.restore();
    contour(ctx, pts, pal);
    furEdge(ctx, pts, pal.base, 0.28);
    /* 眼睛：在口鼻兩側、往上看（被頭往後仰壓扁一點） */
    const st = h.eyes || "open";
    /* 往上看：瞳孔偏上，上眼皮稍微蓋下來（用力、有點矇） */
    const E = [{ x: -1.55, y: -1.7, rx: 0.7, ry: 0.55, px: 0.08, py: -0.2, pw: h.pupil || 0.45, squint: h.squint || 0.3, lid: pal.base }, { x: 1.55, y: -1.7, rx: 0.7, ry: 0.55, px: -0.08, py: -0.2, pw: h.pupil || 0.45, squint: h.squint || 0.3, lid: pal.base }];
    E.forEach((e, i) => eye(ctx, pal, e, h.bk ? "bonk" : st, i === 0 ? 1 : -1));
    /* 口鼻（白色鬍鬚墊）、鼻子在最上面 */
    ctx.fillStyle = pal.belly;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 0.62, -2.75, 0.75, 0.6, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = pal.nose;
    ctx.beginPath(); ctx.moveTo(-0.45, -3.45); ctx.quadraticCurveTo(0, -3.62, 0.45, -3.45); ctx.quadraticCurveTo(0.12, -3.0, 0, -2.98); ctx.quadraticCurveTo(-0.12, -3.0, -0.45, -3.45); ctx.fill();
    /* 張開的嘴（往上咬住）：深色開口、粉紅舌頭、上下尖牙 */
    upMouth(ctx);
    ctx.fillStyle = "#d77a7d"; ctx.beginPath(); ctx.ellipse(0, -1.15, 0.6, 0.26, 0, 0, TAU); ctx.fill();
    upFangs(ctx);
    /* 下巴：張嘴時往下 */
    ctx.fillStyle = pal.light; ctx.beginPath(); ctx.ellipse(0, -0.55, 0.95, 0.38, 0, 0, TAU); ctx.fill();
    /* 鬍鬚：往兩側斜上 */
    ctx.strokeStyle = pal.whisker; ctx.lineWidth = 0.075; ctx.lineCap = "round";
    ctx.beginPath();
    for (const sx of [-1, 1]) for (const [dy, ex, ey] of [[0, 4.6, -3.9], [0.25, 4.9, -2.9], [0.5, 4.5, -1.9]]) { ctx.moveTo(sx * 1.0, -2.75 + dy); ctx.quadraticCurveTo(sx * 2.8, -3.0 + dy, sx * ex, ey); }
    ctx.stroke();
    ctx.restore();
    if (out) { out.eyes = null; out.open = false; }
  }
  function upMouth(ctx, cut) {
    ctx.fillStyle = "#3a1617";
    ctx.beginPath(); ctx.moveTo(-1.05, -2.15); ctx.quadraticCurveTo(0, -2.55, 1.05, -2.15); ctx.quadraticCurveTo(1.0, -1.0, 0, -0.85); ctx.quadraticCurveTo(-1.0, -1.0, -1.05, -2.15); ctx.closePath();
    if (!cut) ctx.fill();
  }
  function upFangs(ctx) {
    ctx.fillStyle = "#fffaf2";
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * 0.85, -2.2); ctx.lineTo(sx * 0.45, -2.3); ctx.lineTo(sx * 0.62, -1.62); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx * 0.8, -1.02); ctx.lineTo(sx * 0.42, -0.95); ctx.lineTo(sx * 0.6, -1.52); ctx.closePath(); ctx.fill();
    }
  }
  function drawHangUp(ctx, name, p, out, bk) {
    const pal = PAL[name], cx = HF.cx;
    if (p.part !== "head") {
      /* 脖子：從頭的下面接到胸口，看得到喉嚨／下巴底下的淺色毛 */
      const nk = blobPts([{ x: cx, y: HF.hy + 2.0, rx: 2.6, ry: 1.8 }, { x: cx, y: 8.4, r: 2.6 }, { x: cx, y: 10.4, r: 2.8 }], 20);
      const ng = ctx.createLinearGradient(cx - 3, 0, cx + 3, 0);
      ng.addColorStop(0, pal.top); ng.addColorStop(0.45, pal.base); ng.addColorStop(1, pal.light);
      smoothPath(ctx, nk); ctx.fillStyle = ng; ctx.fill();
      ctx.save(); smoothPath(ctx, nk); ctx.clip();
      chestBib(ctx, pal, cx, HF.hy + 3.6, 1.8, 3.0, 0);
      ctx.restore();
      furEdge(ctx, nk, pal.base, 0.3);
      /* 身體：有重量地垂著，肚子往前（右邊）微微鼓出來，不要太細長 */
      const pts = blobPts([{ x: cx, y: 10.5, rx: 3.2, ry: 2.4 }, { x: cx + 0.5, y: 13.5, rx: 3.9, ry: 3.2 }, { x: cx, y: 16.4, rx: 3.9, ry: 2.6 }], 26);
      const g = ctx.createLinearGradient(cx - 3.8, 0, cx + 4, 0);
      g.addColorStop(0, pal.top); g.addColorStop(0.35, pal.base); g.addColorStop(0.75, pal.base); g.addColorStop(1, pal.light);
      smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
      ctx.save(); smoothPath(ctx, pts); ctx.clip();
      if (pal.tabby) {
        ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.55; ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
          const y = 10.4 + i * 1.75;
          ctx.beginPath(); ctx.moveTo(cx - 3.9, y - 0.6); ctx.quadraticCurveTo(cx - 2.6, y, cx - 1.6, y + 0.7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + 4.0, y - 0.4); ctx.quadraticCurveTo(cx + 3.2, y + 0.1, cx + 2.6, y + 0.7); ctx.stroke();
        }
      }
      chestBib(ctx, pal, cx + 0.5, 12.4, 2.3, 4.0, 0.05);
      const bg = ctx.createRadialGradient(cx + 0.8, 14.6, 0.2, cx + 0.8, 14.6, 2.9);
      bg.addColorStop(0, pal.belly); bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bg; ctx.globalAlpha = 0.65; ctx.fillRect(cx - 4, 11, 9, 9); ctx.globalAlpha = 1;
      ctx.restore();
      contour(ctx, pts, pal);
      furEdge(ctx, pts, pal.base, 0.34);
    }
    if (p.part !== "torso") {
      /* 仰起來的頭：3/4 側臉轉到口鼻朝上、耳朵往後倒，嘴巴張開咬住 */
      upHead(ctx, pal, { x: HF.hx, y: HF.hy, s: HF.s, pupil: 0.45, bk }, out);
    }
  }
  const HANG_MO = 0.95;
  /* 前面那張畫布（蓋在泡泡上的頭）：把嘴巴開口挖空，再補畫牙齒 → 看起來泡泡邊被咬進嘴裡 */
  /* 嘴裡咬住的泡泡邊：用泡泡本身的顏色畫一小片被拉進嘴裡的「泡泡邊」，邊緣有一條亮線（深色泡泡也看得出來），
     上排牙咬在它前面、下排牙從下面頂住 */
  function hangMouthCut(ctx, bk, col) {
    ctx.save();
    ctx.translate(HF.hx, HF.hy); ctx.scale(HF.s, HF.s); ctx.translate(0, bk ? 0.3 : 0);
    ctx.save(); upMouth(ctx, true); ctx.clip();
    ctx.fillStyle = col || "#2b3140";
    ctx.beginPath(); ctx.moveTo(-0.95, -2.6); ctx.lineTo(0.95, -2.6); ctx.lineTo(0.85, -1.75); ctx.quadraticCurveTo(0, -1.25, -0.85, -1.75); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, -2.6, 0, -1.4);
    g.addColorStop(0, "rgba(0,0,0,.25)"); g.addColorStop(0.7, "rgba(255,255,255,.06)"); g.addColorStop(1, "rgba(255,255,255,.18)");
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    /* 泡泡邊緣的亮線＋下面一點點陰影 */
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(-0.8, -1.66); ctx.quadraticCurveTo(0, -1.12, 0.8, -1.66); ctx.stroke();
    ctx.strokeStyle = "rgba(235,242,255,.75)"; ctx.lineWidth = 0.1;
    ctx.beginPath(); ctx.moveTo(-0.82, -1.8); ctx.quadraticCurveTo(0, -1.3, 0.82, -1.8); ctx.stroke();
    upFangs(ctx);
    ctx.restore();
  }
  /* 掙扎的節奏：每隔 1.2–1.9 秒（不規則）用力一次——前腳往上扒、後腳猛蹬、身體往上縮；之後鬆下來甩腳。
     回傳這一瞬間四肢和身體的狀態（t＝秒） */
  const frac = (v) => v - Math.floor(v);
  const hash = (n) => frac(Math.sin(n * 12.9898 + 7.1) * 43758.5453);
  function hangState(t, seed) {
    const s = seed || 0;
    /* 不規則的週期：用慢慢變的時間扭曲 */
    const u = t / 1.55 + 0.22 * Math.sin(t * 0.83 + s) + 0.1 * Math.sin(t * 2.1 + s * 2);
    const k = Math.floor(u), f = u - k, j = hash(k + s * 31);
    const power = 0.65 + 0.35 * j;
    /* 用力：0.12 秒內縮上去，撐一下，慢慢放 */
    let heave = f < 0.14 ? f / 0.14 : f < 0.32 ? 1 : f < 0.7 ? 1 - (f - 0.32) / 0.38 : 0;
    heave = heave * heave * (3 - 2 * heave) * power;
    /* 後腳：快速蹬直、慢慢收回（蹬的感覺），左右錯開；用力時兩腳一起猛蹬 */
    const kick = (ph) => {
      const g = frac(t / 0.58 + ph + 0.15 * Math.sin(t * 1.9 + ph * 5));
      const e = g < 0.16 ? g / 0.16 : Math.max(0, 1 - (g - 0.16) / 0.5);
      return e * e * (3 - 2 * e);
    };
    const legs = [-1, 1].map((sx, i) => {
      const kk = kick(i * 0.47 + s * 0.13);
      return Math.min(1, kk * (0.75 + 0.25 * j) + heave * 0.55);
    });
    /* 前腳：用力時往上扒到下巴兩側（左右輪流扒）；鬆的時候往外亂揮 */
    const arms = [-1, 1].map((sx, i) => {
      const paw = 0.5 + 0.5 * Math.sin(t * 13 + i * Math.PI + s);       /* 扒的小動作 */
      const fl = Math.sin(t * (i ? 7.1 : 8.3) + i * 2.2 + s) * 0.45 + Math.sin(t * 15.7 + i) * 0.15;
      const up = lerp(0.15 + fl, 1.12 + paw * 0.16, heave);
      const curl = lerp(0.3 + 0.25 * Math.sin(t * 9.7 + i * 1.3), -0.05 + paw * 0.3, heave);
      return { up, curl };
    });
    const twist = 0.55 * Math.sin(t * 1.9 + s * 1.7) * (0.4 + 0.6 * (1 - heave)) + (legs[0] - legs[1]) * 0.25;
    const rot = 0.07 * Math.sin(t * 2.0 + s) + 0.04 * Math.sin(t * 5.3 + 1 + s) + twist * 0.05;
    return { heave, legs, arms, twist, rot };
  }
  function hangLimbs(ctx, name, t, seed, st, which) {
    st = st || hangState(t, seed);
    const pal = PAL[name], cx = HF.cx;
    const pad = (pw, a2, r) => {
      ctx.save(); ctx.translate(pw.x, pw.y); ctx.rotate(a2 - Math.PI / 2);
      ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(0, 0.05, r * 1.25, r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.fillStyle = pal.pad; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, -0.12, r * 0.5, r * 0.38, 0, 0, TAU); ctx.fill();
      for (const k of [-1, -0.35, 0.35, 1]) { ctx.beginPath(); ctx.arc(k * r * 0.68, r * 0.55 - Math.abs(k) * r * 0.12, r * 0.2, 0, TAU); ctx.fill(); }
      ctx.restore();
    };
    const limb = (sh, ang, l1, l2, bend, ws, hind) => {
      const el = P(sh.x + Math.cos(ang) * l1, sh.y + Math.sin(ang) * l1);
      const a2 = ang + bend;
      const pw = P(el.x + Math.cos(a2) * l2, el.y + Math.sin(a2) * l2);
      leg(ctx, pal, [sh, el, P(lerp(el.x, pw.x, 0.82), lerp(el.y, pw.y, 0.82)), pw], ws, false, hind);
      pad(pw, a2, hind ? 0.62 : 0.56);
    };
    /* 後腳：k＝伸直程度（0 縮起來膝蓋往外、1 用力蹬直往下） */
    if (which !== "front") [-1, 1].forEach((sx, i) => {
      const k = st.legs[i];
      const ang = Math.PI / 2 - sx * lerp(1.15, 0.22, k);
      const bend = sx * lerp(1.45, 0.02, k);
      limb(P(cx + sx * 2.3, HF.hip - 0.6), ang, 3.3, lerp(2.7, 3.7, k), bend, [2.75, 1.75, 1.15, 1.15], true);
    });
    /* 前腳：up＝往上抬多少（0 水平往外、1.3 往上扒），curl＝手腕往內彎 */
    if (which !== "hind") [-1, 1].forEach((sx, i) => {
      const A = st.arms[i];
      const ang = sx < 0 ? Math.PI + A.up : -A.up;
      limb(P(cx + sx * 2.0, HF.sh), ang, 3.0, 2.8, -sx * A.curl, [1.9, 1.5, 1.15, 1.15], false);
    });
  }
  /* 吊著時的尾巴：從屁股往下垂，用力甩（跟著蹬腳和扭身體） */
  function hangTail(t, st) {
    const tw = st ? st.twist : 0, kk = st ? st.legs[0] - st.legs[1] : 0;
    return { x: HF.cx + 0.4, y: HF.hip + 1.0, a: Math.PI / 2 + 0.3 * Math.sin(t * 3.1) + 0.12 * Math.sin(t * 7.7) - tw * 0.5 + kk * 0.2, curve: 0.04 * Math.sin(t * 2.3) + tw * 0.03, len: 8.2, w: 1.45, tipCurl: 0.6 };
  }
  /* 身體部分（尾巴＋四肢＋身體）的變形：用力時整個往上縮、身體左右扭 */
  function hangBodyXf(ctx, st) {
    const tw = st.twist, up = st.heave * 1.1;
    ctx.translate(HF.cx, 10.0 - up);
    ctx.transform(1 - Math.abs(tw) * 0.18, 0, tw * 0.12, 1, tw * 0.6, 0);
    ctx.translate(-HF.cx, -10.0);
  }
  /* 磨爪：站高高面向畫面，兩隻前腳輪流往下抓；paws＝[{x（離中心）, y, press}] */
  function clawArms(ctx, name, p, paws) {
    const pal = PAL[name], cx = p.cx, sy = 20 - 6.4 - (p.stretch || 0) + 1.0;
    paws.forEach((q, i) => {
      const sx = i ? 1 : -1;
      /* 肩膀跟著出力：往下拉的那隻肩膀沉下去、往上抬的那隻聳起來 */
      const sh = P(cx + sx * (1.6 - Math.max(0, 6 - q.y) * 0.05), sy + (q.y - 6) * 0.11 + (q.press || 0) * 0.15);
      const pw = P(cx + sx * q.x, q.y);
      const L = Math.hypot(pw.x - sh.x, pw.y - sh.y);
      const out = Math.max(0.3, 2.6 - L * 0.32); /* 腳收短時手肘往外凸 */
      const el = P(lerp(sh.x, pw.x, 0.5) + sx * out, lerp(sh.y, pw.y, 0.5) + 0.35);
      leg(ctx, pal, [sh, el, P(lerp(el.x, pw.x, 0.7), lerp(el.y, pw.y, 0.7)), pw], [1.5, 1.3, 1.12, 1.15], false, false);
      /* 爪子壓在畫面上：肉球變大一點、看得到伸出來的小白爪 */
      const pr = q.press || 0, r = 0.7 + pr * 0.08;
      ctx.save(); ctx.translate(pw.x, pw.y);
      ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.fillStyle = pal.pad; ctx.globalAlpha = 0.55 + pr * 0.4;
      ctx.beginPath(); ctx.ellipse(0, r * 0.28, r * 0.52, r * 0.4, 0, 0, TAU); ctx.fill();
      for (const k of [-1, -0.34, 0.34, 1]) { ctx.beginPath(); ctx.arc(k * r * 0.72, -r * 0.42 + Math.abs(k) * r * 0.16, r * 0.2, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (pr > 0.2) {
        ctx.strokeStyle = "rgba(250,250,246," + (0.6 + pr * 0.4) + ")"; ctx.lineWidth = 0.13; ctx.lineCap = "round";
        ctx.beginPath();
        for (const k of [-1, -0.34, 0.34, 1]) { const x0 = k * r * 0.72, y0 = -r * 0.62 + Math.abs(k) * r * 0.16; ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + k * 0.05, y0 - 0.35 * pr, x0 + k * 0.1, y0 - 0.55 * pr); }
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  /* ---------- 每張影格的姿勢 ---------- */
  const fy = 20;
  function std(o) { /* 站姿的預設值 */
    return Object.assign({ kind: "side", hip: P(8.6, 12.6), rh: 3.15, chest: P(18.4, 12.3), rc: 3.1, sag: 0.25, mid: { rx: 4.2, ry: 2.75, dx: 0.3, dy: -0.15 } }, o);
  }
  /* 走路 4 格：對角的兩隻腳一起往前（交替步態） */
  function walkLegs(ph, lift) {
    const sw = (k) => Math.cos(ph + k); /* +1 往前、-1 往後 */
    const up = (k) => Math.max(0, Math.sin(ph + k)) * (lift || 0.9); /* 往前擺的那隻腳抬起來 */
    const front = (bx, k, far) => { const s = sw(k) * 1.6; return { far, pts: frontLeg(P(bx, 13.8), P(bx + 0.3 + s, fy - 0.5 - up(k)), -0.1 - s * 0.1) }; };
    const hind = (bx, k, far) => {
      const s = sw(k) * 1.6, u = up(k);
      return { far, hind: true, pts: [P(bx, 13.2), P(bx + 1.1 + s * 0.35, 15.4 - u * 0.3), P(bx - 0.9 + s * 0.75, 17.6 - u * 0.8), P(bx - 0.3 + s, fy - 0.5 - u)] };
    };
    /* 對角線的兩隻腳一起動：近前＋遠後、近後＋遠前 */
    return [hind(8.0, 0, true), front(18.2, Math.PI, true), hind(8.8, Math.PI, false), front(19.2, 0, false)];
  }
  function walkPose(i, extra) {
    const ph = i * Math.PI / 2;
    const bob = Math.abs(Math.sin(ph)) * 0.3;
    return std(Object.assign({
      hip: P(8.6, 12.6 + bob), chest: P(18.4, 12.3 + bob * 0.8),
      legs: walkLegs(ph),
      head: { x: 23.4, y: 7.6 + bob * 0.7, tilt: -0.04 },
      tail: { x: 5.6, y: 11.6 + bob, a: -2.2, curve: 0.2, len: 8.5, w: 1.45, tipCurl: 0.35 }
    }, extra || {}));
  }
  /* 跑步 4 格：收、伸 */
  function runPose(i, mouth) {
    const KF = [
      { hip: P(9.6, 12.4), chest: P(18.4, 12.0), fl: [P(19.6, 18.8), P(20.6, 18.6)], hl: [P(12.4, 18.8), P(11.4, 18.6)], head: P(23.6, 7.6) },
      { hip: P(8.6, 11.4), chest: P(18.8, 10.8), fl: [P(23.6, 16.2), P(24.6, 15.6)], hl: [P(2.4, 16.8), P(1.6, 16.2)], head: P(24.0, 6.6) },
      { hip: P(9.0, 12.4), chest: P(18.6, 12.0), fl: [P(20.4, 19.4), P(19.0, 19.5)], hl: [P(6.2, 19.4), P(7.6, 19.5)], head: P(23.7, 7.6) },
      { hip: P(10.2, 12.8), chest: P(18.0, 12.4), fl: [P(15.6, 18.9), P(16.4, 18.6)], hl: [P(13.8, 18.6), P(14.8, 18.9)], head: P(23.2, 8.0) }
    ];
    /* 中間格：前後兩格之間內插；在空中擺動的腳抬高一點，不會拖地 */
    const i0 = Math.floor(i) % 4, i1 = (i0 + 1) % 4, u = i - Math.floor(i);
    const A = KF[i0], B = KF[i1], L = (p, q, k) => P(lerp(p.x, q.x, u), lerp(p.y, q.y, u) - (k || 0) * Math.sin(u * Math.PI));
    const R = u ? { hip: L(A.hip, B.hip), chest: L(A.chest, B.chest), head: L(A.head, B.head),
      fl: [L(A.fl[0], B.fl[0], 1.2), L(A.fl[1], B.fl[1], 1.2)], hl: [L(A.hl[0], B.hl[0], 1.2), L(A.hl[1], B.hl[1], 1.2)] } : A;
    i = i0 + (u >= 0.5 ? 1 : 0);
    const legs = [
      { far: true, hind: true, pts: hindLeg(P(R.hip.x - 0.4, R.hip.y + 0.5), R.hl[1], P(lerp(R.hip.x, R.hl[1].x, 0.35) + 1.3, lerp(R.hip.y, R.hl[1].y, 0.45) + 0.3), P(lerp(R.hip.x, R.hl[1].x, 0.75) - 0.6, lerp(R.hip.y, R.hl[1].y, 0.8))) },
      { far: true, pts: frontLeg(P(R.chest.x + 0.2, R.chest.y + 1.3), R.fl[1], 0.4) },
      { hind: true, pts: hindLeg(P(R.hip.x, R.hip.y + 0.6), R.hl[0], P(lerp(R.hip.x, R.hl[0].x, 0.35) + 1.3, lerp(R.hip.y, R.hl[0].y, 0.45) + 0.3), P(lerp(R.hip.x, R.hl[0].x, 0.75) - 0.6, lerp(R.hip.y, R.hl[0].y, 0.8))) },
      { pts: frontLeg(P(R.chest.x + 0.6, R.chest.y + 1.3), R.fl[0], 0.4) }
    ];
    return std({ hip: R.hip, chest: R.chest, rh: 3.0, rc: 2.95, sag: 0.25, legs, head: { x: R.head.x, y: R.head.y, tilt: -0.06, mouth: mouth || 0, earBack: 0.25 },
      tail: { x: R.hip.x - 2.7, y: R.hip.y - 0.6, a: -2.9 - (i === 1 ? 0.2 : 0), curve: 0.04, len: 9, w: 1.4 } });
  }
  function jumpPose(i) {
    if (i === 0) { /* 蹲低準備跳 */
      return std({ hip: P(8.6, 15.4), chest: P(18.4, 15.4), rh: 3.2, rc: 3.0, sag: 0.1,
        legs: [
          { far: true, hind: true, pts: hindLeg(P(8.4, 16.2), P(10.4, fy - 0.45), P(11.6, 17.4), P(8.2, fy - 1.3)) },
          { far: true, pts: frontLeg(P(18.8, 16.6), P(21.0, fy - 0.45), 0.6) },
          { hind: true, pts: hindLeg(P(8.8, 16.2), P(11.2, fy - 0.45), P(12.4, 17.2), P(8.8, fy - 1.3)) },
          { pts: frontLeg(P(19.2, 16.6), P(21.8, fy - 0.45), 0.6) }
        ], head: { x: 23.6, y: 10.6, tilt: -0.02, pupil: 0.45 }, tail: { x: 5.4, y: 15, a: -3.0, curve: 0.05, len: 8.5, w: 1.45, floor: 19.2 } });
    }
    if (i === 1) { /* 飛出去：身體拉長，後腳往後蹬 */
      return std({ hip: P(8.4, 11.6), chest: P(18.6, 10.8), rh: 2.9, rc: 2.95, sag: 0.1,
        legs: [
          { far: true, hind: true, pts: hindLeg(P(8.0, 12.2), P(0.6, 17.4), P(5.6, 14.6), P(2.6, 16.2)) },
          { far: true, pts: frontLeg(P(19.2, 12.0), P(21.6, 14.6), 0.6) },
          { hind: true, pts: hindLeg(P(8.4, 12.4), P(1.4, 18.0), P(6.2, 15.0), P(3.4, 16.8)) },
          { pts: frontLeg(P(19.6, 12.2), P(22.6, 14.0), 0.8) }
        ], head: { x: 23.8, y: 6.9, tilt: -0.1, pupil: 0.5 }, tail: { x: 5.6, y: 10.9, a: -3.2, curve: 0.04, len: 9, w: 1.4 } });
    }
    return std({ hip: P(9.2, 11.6), chest: P(18.6, 12.2), rh: 3.0, rc: 3.0, sag: 0.2, /* 落地：前腳先伸下來 */
      legs: [
        { far: true, hind: true, pts: hindLeg(P(9.0, 12.4), P(7.0, 17.4), P(11.0, 14.4), P(8.0, 16.4)) },
        { far: true, pts: frontLeg(P(18.8, 13.6), P(16.4, 17.2), -0.3) },
        { hind: true, pts: hindLeg(P(9.4, 12.6), P(7.6, 17.6), P(11.4, 14.6), P(8.4, 16.6)) },
        { pts: frontLeg(P(19.2, 13.6), P(17.4, 17.3), -0.3) }
      ], head: { x: 23.4, y: 7.0, tilt: 0.08, pupil: 0.45 }, tail: { x: 6.2, y: 10.4, a: -2.5, curve: 0.1, len: 8.5, w: 1.4 } });
  }
  /* 咬泡泡：嘴對準咬住點 */
  function bitePose(i, pt) {
    const base = walkPose(0);
    const open = i === 0 ? 0.55 : 0.2;
    const hx = pt.x - 3.55, hy = pt.y - 1.75;
    const back = [0, 0, 0.8, 1.8][i];
    base.chest = P(18.4 - back * 0.5, 12.3 - back * 0.2);
    base.head = { x: hx, y: hy, tilt: [0.1, 0.1, -0.05, -0.15][i], mouth: open, earBack: i >= 2 ? 0.35 : 0.1 };
    base.tail.a = -2.0 + back * 0.15;
    return base;
  }
  /* 吊在泡泡上：身體往下（原本座標的左邊）垂，四隻腳亂踢、尾巴下垂 */
  function hangPose(i, pt) {
    const k = [0, 1, 2, 3][i];
    const sw = (a) => Math.sin(k * 1.7 + a);
    const hx = pt.x - 3.55, hy = pt.y - 1.75;
    const legs = [
      { far: true, hind: true, pts: [P(8.2, 12.4), P(5.2 + sw(0) * 0.8, 14.4), P(3.2 + sw(0) * 1.2, 16.0), P(1.6 + sw(0) * 1.4, 16.4)], ws: [1.5, 1.05, 0.9, 0.9] },
      { far: true, pts: [P(18.2, 12.4), P(16.6 + sw(1) * 0.8, 15.2), P(15.2 + sw(1) * 1.2, 17.0), P(14.6 + sw(1) * 1.4, 17.4)] },
      { hind: true, pts: [P(8.8, 12.8), P(6.0 + sw(2) * 0.8, 15.0), P(4.0 + sw(2) * 1.2, 16.8), P(2.6 + sw(2) * 1.4, 17.4)], ws: [1.6, 1.1, 0.9, 0.9] },
      { pts: [P(18.6, 12.6), P(17.2 + sw(3) * 0.8, 15.6), P(16.2 + sw(3) * 1.2, 17.6), P(15.6 + sw(3) * 1.4, 18.0)] }
    ];
    return std({ hip: P(8.8, 11.2), chest: P(18.6, 10.8), rh: 2.9, rc: 2.9, sag: 0.2, legs,
      head: { x: hx, y: hy, tilt: 0.05, mouth: 0.2, earBack: 0.3 }, tail: { x: 6.0, y: 10.6, a: Math.PI, curve: -0.02, len: 9, w: 1.4 } });
  }
  /* 便便（可愛、不寫實）：0＝蹲下專注、1/2＝轉身低頭聞、3/4＝背對便便用後腳扒砂 */
  function poopPose(i) {
    if (i === 0) {
      return std({ hip: P(8.8, 15.3), chest: P(17.8, 12.9), rh: 3.25, rc: 3.0, sag: 0.05,
        mid: { rx: 4.3, ry: 2.85, dx: 0.1, dy: 0.3 },
        legs: [
          { far: true, hind: true, pts: hindLeg(P(8.6, 16.0), P(11.0, fy - 0.45), P(12.2, 17.3), P(8.6, fy - 1.3)) },
          { far: true, pts: frontLeg(P(18.0, 14.0), P(18.6, fy - 0.45), 0.1) },
          { hind: true, pts: hindLeg(P(9.0, 16.0), P(11.8, fy - 0.45), P(13.0, 17.1), P(9.2, fy - 1.3)) },
          { pts: frontLeg(P(18.6, 14.0), P(19.6, fy - 0.45), 0.1) }
        ],
        head: { x: 22.8, y: 8.6, tilt: 0.06, eyes: "half", earBack: 0.55 },
        tail: { x: 5.9, y: 13.4, a: -1.95, curve: 0.12, len: 8.6, w: 1.5, tipCurl: 0.45 } });
    }
    if (i === 1 || i === 2) {
      const b = walkPose(0), d = i === 2 ? 0.55 : 0;
      b.chest = P(18.6, 13.0 + d * 0.3);
      b.head = { x: 23.9, y: 13.2 + d, tilt: 0.42, earBack: 0.1, pupil: 0.5 };
      b.tail = { x: 5.6, y: 11.4, a: -2.35, curve: 0.25, len: 8.5, w: 1.45, tipCurl: 0.5 };
      return b;
    }
    const kickNear = i === 3;
    const kick = (bx) => ({ hind: true, pts: hindLeg(P(bx, 13.0), P(1.2, 18.3), P(6.4, 15.0), P(3.4, 17.4)) });
    const tuck = (bx) => ({ hind: true, pts: hindLeg(P(bx, 13.0), P(bx + 1.6, fy - 0.45), P(bx + 2.6, 15.6), P(bx - 0.2, 17.8)) });
    const kn = kickNear ? kick(8.9) : tuck(8.9), kf = kickNear ? tuck(8.1) : kick(8.1);
    kf.far = true;
    return std({ hip: P(8.8, 12.4), chest: P(18.6, 12.7), rh: 3.1, rc: 3.05, sag: 0.2,
      legs: [kf, { far: true, pts: frontLeg(P(18.2, 13.8), P(19.4, fy - 0.45), -0.05) }, kn, { pts: frontLeg(P(19.2, 13.8), P(20.6, fy - 0.45), -0.05) }],
      head: { x: 23.4, y: 8.4, tilt: -0.05, earBack: 0.3, eyes: kickNear ? "half" : "open" },
      tail: { x: 5.6, y: 11.2, a: -2.6, curve: 0.1, len: 8.5, w: 1.45, tipCurl: 0.3 } });
  }
  function frontPose(o) {
    return Object.assign({ kind: "front", cx: 12.4, head: { x: 12.5, y: 7.9 }, tail: { x: 15.2, y: fy - 0.9, a: -0.15, curve: -0.1, len: 8.5, w: 1.4, tipCurl: -0.55, floor: 19.6, front: false } }, o);
  }

  /* 點貓選單的反應：餵魚（低頭吃、舔嘴、滿足）、摸肚子（翻肚、被摸、抓住手）、打頭（生氣） */
  const PET_KEYS = ["eat0", "eat1", "lick", "content", "belly0", "belly1", "trap0", "trap1", "angry0", "angry1", "bonkHit",
    "rub0", "rub1", "rub2", "rub3", "rub4", "rub5", "rub6", "rub7", "rubT0", "rubT1"];
  /* 揉肚子：手繞圈揉，第 i 格手按在肚子的哪裡（格子座標）＋往哪個方向推 */
  const RUB_N = 8, RUB_C = { x: 14.4, y: 15.5, rx: 1.5, ry: 0.85 };
  function rubPress(th) { return { x: RUB_C.x + Math.cos(th) * RUB_C.rx, y: RUB_C.y + Math.sin(th) * RUB_C.ry, vx: -Math.sin(th), vy: Math.cos(th), k: 1 }; }
  function petPose(k) {
    if (k === "eat0" || k === "eat1") {
      const b = poopPose(k === "eat0" ? 1 : 2);
      b.head = Object.assign({}, b.head, { y: b.head.y + 0.6, mouth: k === "eat0" ? 0.55 : 0.05, eyes: k === "eat1" ? "closed" : "open", earBack: 0.05 });
      b.tail = Object.assign({}, b.tail, { a: k === "eat0" ? -2.15 : -2.45 });
      return b;
    }
    if (k === "lick") return frontPose({ head: { x: 12.4, y: 7.9, tilt: 0.06, eyes: "happy", tongue: 1 } });
    if (k === "content") return frontPose({ head: { x: 12.5, y: 8.1, tilt: -0.1, eyes: "half", pupil: 0.3 }, tail: { x: 15.2, y: fy - 0.9, a: -0.35, curve: -0.12, len: 8.5, w: 1.4, tipCurl: -0.7, floor: 19.6, front: false } });
    if (k === "belly0" || k === "belly1") {
      const w = k === "belly1" ? 0.5 : 0;
      return { kind: "flop", tailA: Math.PI + 0.3 + w * 0.3, tailCurve: 0.05,
        paws: [[9.6 + w * 0.4, fy - 9.2], [18.0, fy - 9.0 - w * 0.4], [12.6, fy - 10.0 + w * 0.3], [15.6 - w * 0.3, fy - 9.8]],
        head: { eyes: "happy", mouth: 0.08, tongue: 0 } };
    }
    if (k === "trap0" || k === "trap1") { /* 肚子陷阱：前腳抱住手、後腳亂蹬 */
      const t = k === "trap1" ? 1 : 0;
      return { kind: "flop", tailA: Math.PI - 0.2 + t * 0.5, tailCurve: 0.1,
        paws: [[t ? 12.6 : 10.4, t ? fy - 8.6 : fy - 11.4], [16.4, fy - 9.6], [t ? 10.6 : 13.2, t ? fy - 11.6 : fy - 8.8], [15.2, fy - 10.2]],
        head: { eyes: "open", wide: true, mouth: 0.45, tongue: 0 } };
    }
    if (k === "angry0" || k === "angry1") {
      const t = k === "angry1" ? 1 : 0;
      return frontPose({ head: { x: 12.4, y: 8.2, tilt: t ? 0.1 : -0.1, eyes: "closed", angry: true, earBack: 0.9 },
        tail: { x: 15.2, y: fy - 0.9, a: t ? 0.55 : -0.55, curve: t ? 0.12 : -0.12, len: 8.5, w: 1.45, tipCurl: t ? 0.6 : -0.6, floor: 19.6, front: false } });
    }
    if (k === "bonkHit") return frontPose({ head: { x: 12.4, y: 8.6, tilt: 0, bk: 1, earBack: 0.7 } });
    if (/^rub\d$/.test(k)) { /* 正面仰躺被揉肚子：手繞圈、肚子被按的地方凹一點，腳掌一開一合（踩奶），身體、尾巴輕輕晃 */
      const i = +k.slice(3), th = i / RUB_N * Math.PI * 2;
      return { kind: "supine", cx: 14.6, press: rubPress(th), open: (i % 4) < 2, sway: Math.sin(th) * 0.035,
        tailA: -0.25 + Math.sin(th) * 0.28, tailCurl: -0.35 + Math.cos(th) * 0.15,
        head: { tilt: 0.95 + Math.sin(th) * 0.07, eyes: "happy", mouth: 0.06, tongue: 0 } };
    }
    if (k === "rubT0" || k === "rubT1") { /* 肚子陷阱：四腳抱住手、後腳亂蹬 */
      const t = k === "rubT1" ? 1 : 0;
      return { kind: "supine", cx: 14.6, trap: true, kick: t, press: { x: 14.6, y: 14.2, vx: 0, vy: 1, k: 0.8 }, open: !!t, sway: t ? 0.05 : -0.05,
        tailA: t ? -0.7 : 0.1, tailCurl: t ? 0.4 : -0.5,
        head: { tilt: t ? 0.5 : 0.62, eyes: "open", wide: true, mouth: 0.45, tongue: 0, earBack: 0.35 } };
    }
    return frontPose({});
  }
  function poseFor(anim, i, extra) {
    extra = extra || {};
    switch (anim) {
      case "sit": return frontPose({});
      case "walk": return walkPose(i);
      case "run": return runPose(i);
      case "jump": return jumpPose(i);
      case "bite": return bitePose(i, extra.pt);
      case "hang": return hangPose(i, extra.pt);
      case "sleep": return { kind: "curl", breath: i ? 0.25 : 0, head: { x: 20.6, y: 16.0 + (i ? -0.2 : 0) }, tail: { x: 5.0, y: fy - 1.2, a: 0.3, curve: -0.02, len: 13, w: 1.35, floor: 19.4, front: true } };
      case "scratch": return frontPose({ cx: 16.4, stretch: 3.6, head: { x: 16.9, y: 5.2, tilt: 0.12, pupil: 0.4 }, raise: "wall", wallUp: i ? 1.0 : 0, shY: i ? -0.2 : 0.15, shX: i ? 0.2 : -0.1, tail: { x: 12.0, y: fy - 0.8, a: Math.PI + 0.1, curve: 0.12, len: 7.5, w: 1.35, floor: 19.6, tipCurl: 0.5 } });
      case "lick1": return frontPose({ head: { x: 11.8, y: 7.9, tilt: -0.12, eyes: "closed", tongue: i ? 1 : 0 }, raise: "mouth" });
      case "lick2": return frontPose({ head: { x: 12.4, y: 10.6 - (i ? -0.3 : 0), tilt: 0.3, eyes: "closed", tongue: 1 } });
      case "lick3": return frontPose({ cx: 13.4, head: { x: 14.6, y: 9.4 - (i ? 0.25 : 0), tilt: -0.35, eyes: "closed", tongue: 1 }, legUp: true, tail: { x: 16.4, y: fy - 0.9, a: -0.1, curve: -0.05, len: 8, w: 1.35, floor: 19.6, tipCurl: -0.5 } });
      case "love": return lovePose(extra.key);
      case "hangFront": return { kind: "hangFront", part: extra.part || "torso", head: { x: HF.hx, y: HF.hy } };
      case "funny": return i === 0 ? { kind: "flop", tail: null } : std({ hip: P(9.0, 10.6), chest: P(18.2, 10.9), rh: 2.95, rc: 2.85, sag: 0, puff: 1.0,
        mid: { rx: 4.7, ry: 3.1, dx: 0, dy: -2.5 },
        legs: [
          { far: true, hind: true, pts: [P(8.2, 11.6), P(7.8, 14.6), P(7.7, 18.2), P(7.7, 19.5)] },
          { far: true, pts: [P(18.4, 12.4), P(18.6, 15.5), P(18.7, 18.6), P(18.8, 19.5)] },
          { hind: true, pts: [P(9.6, 11.9), P(10.0, 15.0), P(9.9, 18.4), P(10.0, 19.6)] },
          { pts: [P(19.5, 12.6), P(19.9, 15.7), P(20.1, 18.7), P(20.2, 19.6)] }
        ],
        head: { x: 22.8, y: 7.4, tilt: -0.12, wide: true, mouth: 0.6, earBack: 0.75 },
        tail: { x: 6.6, y: 9.8, a: -Math.PI / 2 - 0.3, curve: 0.03, len: 8.0, w: 2.1, puff: 0.9 } });
      case "poop": return poopPose(i);
      case "pet": return petPose(PET_KEYS[i]);
      case "claw": return frontPose({ cx: 16, stretch: 3.4, head: { x: 16, y: 5.7, tilt: 0, pupil: 0.36 }, raise: "claw", tail: { x: 18.6, y: fy - 0.9, a: -0.25, curve: -0.12, len: 8.0, w: 1.35, tipCurl: -0.5, floor: 19.6, front: false } });
    }
    return frontPose({});
  }
  function sideSitTail() { return { x: 10.2, y: fy - 1.0, a: Math.PI - 0.05, curve: -0.03, len: 9.5, w: 1.4, floor: 19.5, tipCurl: 0.45 }; }
  function lovePose(key) {
    switch (key) {
      case "sideSit": return { kind: "sideSit", head: {}, tail: sideSitTail() };
      case "sideSitHappy": return { kind: "sideSit", head: { eyes: "happy" }, tail: sideSitTail() };
      case "sideSitLick": return { kind: "sideSit", head: { eyes: "happy", tongue: 1 }, tail: sideSitTail() };
      case "sideSitTall": return { kind: "sideSit", tall: 1.5, head: { eyes: "open", tilt: 0.1 }, tail: sideSitTail() };
      case "sideSitLickTall": return { kind: "sideSit", tall: 1.5, head: { eyes: "closed", tongue: 1, tilt: 0.25, x: 21.6 }, tail: sideSitTail() };
      case "sideSitBow": return { kind: "sideSit", head: { eyes: "closed", y: 10.2, x: 21.4, tilt: 0.35 }, tail: sideSitTail() };
      case "nuzzle": return walkPose(0, { head: { x: 23.8, y: 9.0, tilt: 0.3, eyes: "closed" } });
      case "walkEagerHappy": return walkPose(0, { head: { x: 23.8, y: 8.4, tilt: 0.18, eyes: "happy" } });
      case "walkEager": return walkPose(0, { head: { x: 23.5, y: 7.4, tilt: -0.04 } });
      case "sitHappyNoTail": return frontPose({ head: { x: 12.5, y: 7.9, eyes: "happy" }, tail: null });
    }
    return frontPose({});
  }
  /* 畫一隻貓（不含尾巴）；out 會拿到眼睛位置（眨眼用） */
  /* 炸毛：沿著外形畫一圈尖尖的毛束（每束是細長三角形） */
  function puffSpikes(ctx, pts, pal, amt) {
    ctx.save();
    const n = pts.length;
    let cx = 0, cy = 0; for (const q of pts) { cx += q.x; cy += q.y; } cx /= n; cy /= n;
    for (const [col, k0] of [[pal.top, 1], [pal.base, 0.7]]) {
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n], d = Math.hypot(q.x - p.x, q.y - p.y), m = Math.max(1, Math.round(d / 0.55));
        let nx = q.y - p.y, ny = -(q.x - p.x); const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        for (let j = 0; j < m; j++) {
          const t = (j + 0.5) / m, x = lerp(p.x, q.x, t), y = lerp(p.y, q.y, t);
          if (y > 18.8) continue;
          let ax = nx, ay = ny; if ((x - cx) * ax + (y - cy) * ay < 0) { ax = -ax; ay = -ay; }
          const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, r = h - Math.floor(h);
          const l = amt * k0 * (0.55 + r * 0.6), w = 0.26, tx = -ay, ty = ax;
          ctx.moveTo(x + tx * w - ax * 0.3, y + ty * w - ay * 0.3);
          ctx.lineTo(x + ax * l + tx * (r - 0.5) * 0.5, y + ay * l + ty * (r - 0.5) * 0.5);
          ctx.lineTo(x - tx * w - ax * 0.3, y - ty * w - ay * 0.3);
        }
      }
      ctx.fill();
    }
    ctx.restore();
  }
  /* ===== 搞笑僵住 1：四腳朝天翻肚、x_x、舌頭吐出來 ===== */
  function drawFlop(ctx, name, p, out, bk) {
    const pal = PAL[name], fy = 20;
    drawTail(ctx, name, { x: 7.8, y: fy - 2.4, a: Math.PI + 0.12, curve: -0.015, len: 7.2, w: 1.35 }, 0);
    const up = (x0, y0, x1, y1, far, hind) => {
      leg(ctx, pal, [P(x0, y0), P(lerp(x0, x1, 0.45), lerp(y0, y1, 0.45)), P(lerp(x0, x1, 0.85), lerp(y0, y1, 0.85)), P(x1, y1)], hind ? [2.2, 1.45, 1.05, 1.1] : [1.6, 1.3, 1.0, 1.05], far, hind, true);
      /* 腳底朝天：肉球看得到 */
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2);
      ctx.fillStyle = far ? shade(pal.belly, -0.12) : pal.belly; ctx.beginPath(); ctx.ellipse(0, 0, 0.8, 0.62, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.fillStyle = pal.pad; ctx.globalAlpha = far ? 0.55 : 0.85;
      ctx.beginPath(); ctx.ellipse(0, 0.05, 0.34, 0.25, 0, 0, TAU); ctx.fill();
      for (const k of [-0.48, -0.16, 0.16, 0.48]) { ctx.beginPath(); ctx.arc(k, -0.42 - (Math.abs(k) < 0.3 ? 0.08 : 0), 0.12, 0, TAU); ctx.fill(); }
      ctx.restore();
    };
    up(9.4, fy - 4.2, 8.4, fy - 11.0, true, true);
    up(18.6, fy - 4.4, 19.8, fy - 10.6, true, false);
    /* 身體：背貼地、肚子朝上（上面是白肚子，下面是背） */
    const pts = blobPts([{ x: 10.6, y: fy - 3.0, r: 2.9 }, { x: 18.2, y: fy - 3.1, r: 2.8 }, { x: 14.4, y: fy - 3.3, rx: 4.6, ry: 2.85 }], 30);
    const g = ctx.createLinearGradient(0, fy - 6.3, 0, fy);
    g.addColorStop(0, pal.belly); g.addColorStop(0.35, pal.light); g.addColorStop(0.62, pal.base); g.addColorStop(1, pal.top);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.55; ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) { const x = 9 + i * 1.75; ctx.beginPath(); ctx.moveTo(x - 0.3, fy + 0.2); ctx.quadraticCurveTo(x + 0.25, fy - 1.6, x - 0.1, fy - 2.6); ctx.stroke(); }
    }
    const bg = ctx.createRadialGradient(14.2, fy - 5.0, 0.3, 14.2, fy - 5.0, 3.6);
    bg.addColorStop(0, "rgba(255,255,255,.55)"); bg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bg; ctx.fillRect(8, fy - 8, 13, 6);
    ctx.restore();
    contour(ctx, pts, pal);
    furEdge(ctx, pts, pal.belly, 0.4, fy - 1.2);
    up(11.6, fy - 4.6, 11.0, fy - 12.0, false, true);
    thigh(ctx, pal, 11.5, fy - 5.6, 1.55, 2.5, 0.08, false);
    up(16.9, fy - 4.8, 16.2, fy - 11.4, false, false);
    /* 頭：後腦勺貼地、下巴朝天，舌頭吐一點出來 */
    ctx.save(); ctx.translate(22.7, fy - 4.0); ctx.rotate(Math.PI / 2 + 0.25); ctx.scale(-1.1, 1.1);
    sideHead(ctx, pal, Object.assign({ x: 0, y: 0, eyes: "x", mouth: 0.3, tongue: 1, bk: 0 }, p.head || {}), null);
    ctx.restore();
    out.eyes = null; out.open = false;
  }
  /* 朝上的腳掌（肉球朝鏡頭）；open＝腳趾張開（踩奶張開那一下） */
  function pawUp(ctx, pal, x, y, rot, open, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s || 1, s || 1);
    const w = open ? 0.98 : 0.8, h = open ? 0.8 : 0.7;
    ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.fillStyle = pal.pad; ctx.globalAlpha = 0.88;
    ctx.beginPath(); ctx.ellipse(0, 0.14, 0.38, 0.28, 0, 0, TAU); ctx.fill();
    const sp = open ? 1.28 : 0.86;
    for (const k of [-0.48, -0.16, 0.16, 0.48]) { ctx.beginPath(); ctx.arc(k * sp, -0.42 - (Math.abs(k) < 0.3 ? 0.1 : 0) - (open ? 0.1 : 0), open ? 0.15 : 0.12, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  /* ===== 正面仰躺（揉肚子）：背貼地、整片淡色肚皮朝鏡頭、頭在上面歪一邊享受，四腳彎著朝上 ===== */
  function drawSupine(ctx, name, p, out, bk) {
    const pal = PAL[name], fy = 20, cx = p.cx || 14.6;
    ctx.save();
    ctx.translate(cx, fy - 1); ctx.rotate(p.sway || 0); ctx.translate(-cx, -(fy - 1));
    drawTail(ctx, name, { x: cx + 2.4, y: fy - 1.5, a: p.tailA != null ? p.tailA : -0.25, curve: 0.05, len: 7.4, w: 1.4, tipCurl: p.tailCurl || -0.3, floor: 19.6 }, 0);
    /* 後腳：青蛙腿張開，膝蓋往外、腳掌朝天 */
    const kick = p.kick || 0, op = !!p.open;
    const hind = (sx) => {
      let knee, paw;
      if (p.trap) { const up = (sx > 0) === !!kick; knee = P(cx + sx * (up ? 5.4 : 6.0), fy - (up ? 5.4 : 3.6)); paw = up ? P(cx + sx * 4.0, fy - 8.8) : P(cx + sx * 7.7, fy - 6.4); }
      else { knee = P(cx + sx * 6.4, fy - 3.1); paw = P(cx + sx * (op ? 6.1 : 5.6), fy - (op ? 7.6 : 7.0)); }
      const hip = P(cx + sx * 2.7, fy - 3.3);
      thigh(ctx, pal, cx + sx * 3.5, fy - 3.4, 2.3, 2.5, sx * 0.6, false);
      leg(ctx, pal, [hip, knee, P(lerp(knee.x, paw.x, 0.55), lerp(knee.y, paw.y, 0.55)), paw], [2.2, 1.45, 1.1, 1.05], false, true, true);
      pawUp(ctx, pal, paw.x, paw.y, Math.atan2(paw.y - knee.y, paw.x - knee.x) + Math.PI / 2, op, 1.05);
    };
    hind(-1); hind(1);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(cx, fy - 0.45, 6.0, 0.7, 0, 0, TAU); ctx.fill(); /* 背貼在地上 */
    /* 身體：下面（肚子）比較寬、上面是胸口；手按的地方外形被推開一點點 */
    const pr = p.press, sq = pr ? pr.k || 0 : 0;
    let pts = blobPts([{ x: cx, y: fy - 3.9, rx: 4.7 + sq * 0.12, ry: 3.3 - sq * 0.08 }, { x: cx, y: fy - 7.1, rx: 3.8, ry: 2.7 }, { x: cx, y: fy - 9.0, rx: 3.1, ry: 1.7 }], 28);
    if (pr) pts = pts.map((q) => { const d = Math.hypot(q.x - pr.x, q.y - pr.y); if (d > 3.4) return q; const f = (1 - d / 3.4) * 0.5 * sq; return P(q.x + (q.x - pr.x) / (d || 1) * f, q.y + (q.y - pr.y) / (d || 1) * f); });
    const g = ctx.createLinearGradient(cx - 4.6, 0, cx + 4.6, 0);
    g.addColorStop(0, pal.top); g.addColorStop(0.28, pal.base); g.addColorStop(0.72, pal.base); g.addColorStop(1, pal.top);
    smoothPath(ctx, pts); ctx.fillStyle = g; ctx.fill();
    ctx.save(); smoothPath(ctx, pts); ctx.clip();
    if (pal.tabby) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.5; ctx.lineCap = "round";
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const y = fy - 9 + i * 1.8; ctx.beginPath(); ctx.moveTo(cx + sx * 4.8, y); ctx.quadraticCurveTo(cx + sx * 3.7, y + 0.5, cx + sx * 3.1, y + 1.1); ctx.stroke(); }
    }
    /* 整片淡色肚皮 */
    const bx = cx, by = fy - 5.6, brx = 3.25, bry = 4.6;
    ctx.save(); ctx.translate(bx, by); ctx.scale(1, bry / brx);
    const bg = ctx.createRadialGradient(0, 0, 0.2, 0, 0, brx);
    bg.addColorStop(0, pal.belly); bg.addColorStop(0.62, pal.belly); bg.addColorStop(0.86, pal.light); bg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, brx, 0, TAU); ctx.fill(); ctx.restore();
    /* 肚子上的細毛（軟軟的） */
    ctx.strokeStyle = shade(pal.belly, -0.1); ctx.lineWidth = 0.09; ctx.globalAlpha = 0.7;
    for (let i = 0; i < 9; i++) { const x = bx - 2 + (i % 3) * 2 + (i > 5 ? 0.6 : 0), y = by - 2.6 + Math.floor(i / 3) * 2.2; ctx.beginPath(); ctx.moveTo(x - 0.3, y); ctx.quadraticCurveTo(x, y + 0.35, x + 0.3, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (pr && sq > 0) {
      /* 被手按下去：中間凹（陰影）、往推的方向那邊皮膚擠起來（亮面）、旁邊的毛跟著倒 */
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(1, 0.78);
      const dg = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 2.1);
      dg.addColorStop(0, "rgba(120,70,35," + (0.42 * sq).toFixed(3) + ")"); dg.addColorStop(0.6, "rgba(120,70,35," + (0.18 * sq).toFixed(3) + ")"); dg.addColorStop(1, "rgba(120,70,35,0)");
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, 2.1, 0, TAU); ctx.fill();
      ctx.restore();
      const hx = pr.x + (pr.vx || 0) * 1.55, hy = pr.y + (pr.vy || 0) * 1.2;
      const hg = ctx.createRadialGradient(hx, hy, 0.1, hx, hy, 1.2);
      hg.addColorStop(0, "rgba(255,255,255," + (0.5 * sq).toFixed(3) + ")"); hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(hx, hy, 1.25, 0.9, Math.atan2(pr.vy || 0, pr.vx || 1), 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(120,75,40," + (0.35 * sq).toFixed(3) + ")"; ctx.lineWidth = 0.09;
      for (let k = 0; k < 6; k++) { const an = k / 6 * TAU, r0 = 1.25, r1 = 1.85; ctx.beginPath(); ctx.moveTo(pr.x + Math.cos(an) * r0, pr.y + Math.sin(an) * r0 * 0.78); ctx.lineTo(pr.x + Math.cos(an + 0.25) * r1, pr.y + Math.sin(an + 0.25) * r1 * 0.78); ctx.stroke(); }
    }
    ctx.restore();
    contour(ctx, pts, pal);
    furEdge(ctx, pts, pal.base, 0.36, fy - 0.8);
    /* 頭：在上面、歪一邊，瞇眼享受 */
    const hd = Object.assign({ x: cx + 1.3, y: fy - 11.0, s: 0.98, tilt: 0.95, eyes: "happy" }, p.head || {}, { bk: bk || 0 });
    frontHead(ctx, pal, hd, {});
    /* 前腳：縮在胸前（兔子手），一開一合踩奶；陷阱時往中間抱住手 */
    for (const sx of [-1, 1]) {
      const sh = P(cx + sx * 2.2, fy - 7.4);
      let el, pw;
      if (p.trap) { el = P(cx + sx * 3.9, fy - 7.6); pw = P(cx + sx * 1.7, fy - 6.0 + (kick && sx > 0 ? -0.35 : 0)); }
      else { el = P(cx + sx * 3.7, fy - (op ? 8.4 : 8.0)); pw = P(cx + 0.4 + sx * (op ? 2.5 : 2.0), fy - (op ? 9.3 : 8.7)); }
      leg(ctx, pal, [sh, P(lerp(sh.x, el.x, 0.5), lerp(sh.y, el.y, 0.5)), el], [1.7, 1.5, 1.35], false, false, true);
      leg(ctx, pal, [el, P(lerp(el.x, pw.x, 0.5), lerp(el.y, pw.y, 0.5)), pw], [1.35, 1.15, 1.0], false, false, true);
      pawUp(ctx, pal, pw.x, pw.y, Math.atan2(pw.y - el.y, pw.x - el.x) + Math.PI / 2, op, 0.95);
    }
    ctx.restore();
    out.eyes = null; out.open = false;
  }
  function drawBody(ctx, name, pose, bk) {
    const out = {};
    if (pose.kind === "flop") { drawFlop(ctx, name, pose, out, bk); return out; }
    if (pose.kind === "supine") { drawSupine(ctx, name, pose, out, bk); return out; }
    if (pose.kind === "side") drawSide(ctx, name, pose, out, bk);
    else if (pose.kind === "front") drawFront(ctx, name, pose, out, bk);
    else if (pose.kind === "curl") drawCurl(ctx, name, pose, out, bk);
    else if (pose.kind === "sideSit") drawSideSit(ctx, name, pose, out, bk);
    else if (pose.kind === "hangFront") drawHangUp(ctx, name, pose, out, bk);
    return out;
  }
  /* 兩條尾巴繞成的愛心（談戀愛最後一段；座標＝34×21 格） */
  function drawTailHeart(ctx) {
    const one = (name, sx) => {
      const pal = PAL[name];
      const pts = [];
      /* 沿著地板從身體那邊過來，到中間再沿著愛心曲線往上繞到頂端凹處 */
      for (let i = 0; i <= 7; i++) { const u = i / 7; pts.push(P(17 - sx * lerp(16.5, 0.8, u), lerp(18.2, 17.4, u) - Math.sin(u * Math.PI) * 0.4)); }
      for (let i = 1; i <= 22; i++) {
        const t = Math.PI - i / 22 * (Math.PI - 0.12);
        const hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push(P(17 - sx * hx * 0.5, 7.9 - hy * 0.52));
      }
      const ws = pts.map((_, i) => lerp(1.55, 0.95, i / (pts.length - 1)));
      ctx.fillStyle = pal.base; limbPath(ctx, pts, ws); ctx.fill();
      ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.save(); limbPath(ctx, pts, ws); ctx.clip();
      ctx.strokeStyle = pal.top; ctx.lineWidth = 0.6; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x + sx * 0.35, p.y - 0.4) : ctx.moveTo(p.x, p.y - 0.45)); ctx.stroke();
      ctx.strokeStyle = pal.light; ctx.lineWidth = 0.45; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x - sx * 0.35, p.y + 0.4) : ctx.moveTo(p.x, p.y + 0.45)); ctx.stroke();
      if (pal.tabby) { ctx.strokeStyle = pal.stripe; ctx.lineWidth = 0.55; for (let i = 2; i < pts.length - 1; i += 2) { const p = pts[i], q = pts[i + 1]; let nx = -(q.y - p.y), ny = q.x - p.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; ctx.beginPath(); ctx.moveTo(p.x + nx * 1.2, p.y + ny * 1.2); ctx.lineTo(p.x - nx * 1.2, p.y - ny * 1.2); ctx.stroke(); } }
      const e = pts[pts.length - 1]; ctx.fillStyle = pal.tabby ? pal.dark : pal.top; ctx.beginPath(); ctx.arc(e.x, e.y, 0.7, 0, TAU); ctx.fill();
      ctx.restore();
      furEdge(ctx, outline(pts, ws), pal.base, 0.3);
    };
    one("gray", 1); one("brown", -1);
  }
  /* 打架煙霧團裡伸出來的腳／尾巴 */
  function furLimb(ctx, name, pts, ws, kind) {
    const pal = PAL[name];
    ctx.fillStyle = pal.base; limbPath(ctx, pts, ws); ctx.fill();
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.12; ctx.stroke();
    const e = pts[pts.length - 1];
    if (kind === "tail") { ctx.fillStyle = pal.tabby ? pal.dark : pal.top; ctx.beginPath(); ctx.arc(e.x, e.y, ws[ws.length - 1] * 0.45, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.arc(e.x, e.y, ws[ws.length - 1] * 0.5, 0, TAU); ctx.fill();
      if (kind === "paw") { ctx.fillStyle = pal.pad; for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 0.35, e.y + Math.sin(a) * 0.35, 0.14, 0, TAU); ctx.fill(); } } }
  }
  return { PAL, PET_KEYS, RUB_N, RUB_C, rubPress, poseFor, drawBody, drawTail, blinkLids, drawTailHeart, furLimb, shade, HF, hangLimbs, hangTail, hangMouthCut, hangState, hangBodyXf, clawArms };
})();
