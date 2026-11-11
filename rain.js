/* ===== 彩蛋：連點 3 下「在線上」→ 螢光黃球雨（雙方同步）=====
   獨立區塊，不依賴貓咪程式：
   - 觸發／提早結束都是「聊天室事件」：BallRain.write(v) / BallRain.writeEnd() 交給呼叫端寫進資料庫，
     資料庫有變化時呼叫端再呼叫 BallRain.sync(v)（自己寫的也一樣走 sync，兩邊流程完全相同）。
     v = { t: 伺服器時間(毫秒), by: 誰觸發, end?: 伺服器時間 }；BallRain.now() 要回傳「伺服器時間的現在」。
   - 球的彈跳各端自己算；貓咪各端自己演（收到 window 事件 "sc-rain"）。
   - 「聊天室貓咪」關掉的人：自己畫面完全沒有球雨（對方觸發也不播、連點也不觸發）；播放中關掉就立刻清掉。 */
(() => {
  "use strict";
  const RAIN = {
    DUR_MS: 10000,     /* 觸發後多久開始淡出 */
    FADE_MS: 900,      /* 淡出時間 */
    SPAWN_MS: 2000,    /* 球在這段時間內陸續掉完 */
    TAP_GAP_MS: 450,   /* 連點：每下間隔 */
    TAPS: 3,
    R: 7,              /* 球半徑（跟貓玩的那顆一樣大） */
    DRAW_K: 0.86,      /* 畫出來的大小／碰撞大小：留一點球縫 */
    PILE: 1 / 3,       /* 堆到螢幕高度的幾分之一 */
    MAX_BALLS: 560,
    HIT_MS: 850,       /* 觸發後多久球砸到貓（貓開始僵住） */
    AFTER_MS: 5000,    /* 球淡出完成後，貓再僵住多久（整段：球雨中一直僵 + 這 5 秒） */
    FREEZE_CAP_MS: 20000, /* 保險：貓最長僵住多久 */
    SETTLE_MAX_MS: 6500, /* 最晚這時候一定停止計算（沉澱後不再抖） */
  };
  const chat = document.getElementById("chat");
  if (!chat) return;
  const title = chat.querySelector(".c-title");
  const head = chat.querySelector(".c-bar");
  const input = chat.querySelector(".c-input") || document.getElementById("sendForm");
  const cv = document.createElement("canvas");
  cv.className = "ball-rain";
  cv.setAttribute("aria-hidden", "true");
  chat.appendChild(cv);
  const ctx = cv.getContext("2d");
  const BR = {
    now: () => Date.now(), write: null, writeEnd: null, me: "me-" + Math.random().toString(36).slice(2, 10),
    get active() { return !!st; }, get info() { return st ? { id: st.id, n: st.n, total: st.N, fading: st.fading, settled: st.settled, frames: st.frames, simMs: st.simMs, drawMs: st.drawMs || 0 } : null; },
    sync, stop, setHoles, start: requestStart, end: requestEnd, CFG: RAIN,
  };
  window.BallRain = BR;
  /* 跟「聊天室貓咪」開關走（每台裝置各自記住，localStorage: sc-pets；切換時發 window 事件 "sc-pets"） */
  let enabled = true, lastV = null;
  try { enabled = localStorage.getItem("sc-pets") !== "off"; } catch (_) {}
  BR.isEnabled = () => enabled;
  window.addEventListener("sc-pets", (e) => {
    enabled = !!(e.detail && e.detail.on);
    if (!enabled) { taps = []; stop(); }
    else if (lastV) sync(lastV); /* 重新打開時，若對方的球雨還在 10 秒內就接著播 */
  });

  /* ----- 球的圖（跟貓玩的那顆螢光黃球同一個樣子），預先畫好 8 個轉角 ----- */
  let spr = [], sprSize = 0, dpr = 1;
  function buildSprites() {
    dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    const r = RAIN.R, pad = 3, sz = Math.ceil((r * 2 + pad * 2) * dpr);
    sprSize = sz / dpr;
    spr = [];
    for (let k = 0; k < 8; k++) {
      const c = document.createElement("canvas"); c.width = c.height = sz;
      const g = c.getContext("2d"); g.scale(dpr, dpr);
      const cx = r + pad, cy = r + pad;
      g.save(); g.shadowColor = "rgba(226,255,40,.55)"; g.shadowBlur = 3.5;
      const d = r * 2, gx = cx - r + d * 0.34, gy = cy - r + d * 0.3;
      const rg = g.createRadialGradient(gx, gy, 0, gx, gy, d * 0.96);
      rg.addColorStop(0, "#ffffe6"); rg.addColorStop(0.14, "#ffffe6"); rg.addColorStop(0.3, "#f6ff45"); rg.addColorStop(0.62, "#dcff00"); rg.addColorStop(1, "#a9cc00");
      g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.restore();
      /* 網球的縫線 */
      g.save(); g.translate(cx, cy); g.rotate(k * Math.PI / 8); g.scale(0.45, 1);
      g.strokeStyle = "rgba(120,150,0,.55)"; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, r - 1.75, Math.PI * 0.75, Math.PI * 1.25); g.stroke();
      g.beginPath(); g.arc(0, 0, r - 1.75, -Math.PI * 0.25, Math.PI * 0.25); g.stroke();
      g.restore();
      spr.push(c);
    }
  }

  /* ----- 版面：球雨畫布蓋住訊息區（頂部列下緣到輸入列上緣），不擋點擊 ----- */
  let AW = 360, AH = 600;
  function layout() {
    const cr = chat.getBoundingClientRect();
    const top = head ? head.getBoundingClientRect().bottom - cr.top : 0;
    const bot = input ? cr.bottom - input.getBoundingClientRect().top : 0;
    AW = Math.max(1, chat.clientWidth); AH = Math.max(1, Math.round(cr.height - top - bot));
    cv.style.top = Math.round(top) + "px"; cv.style.height = AH + "px"; cv.style.width = AW + "px";
    const w = Math.round(AW * dpr), h = Math.round(AH * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; if (st) st.dirty = true; }
  }

  /* ----- 狀態 ----- */
  let st = null, raf = 0;
  function freshState(t0, id) {
    buildSprites(); layout();
    const r = RAIN.R;
    const pileH = Math.min(AH * 0.62, window.innerHeight * RAIN.PILE);
    const N = Math.max(30, Math.min(RAIN.MAX_BALLS, Math.round(AW * pileH * 0.86 / (Math.PI * r * r))));
    const s = { id, t0, N, n: 0, r: new Float32Array(N), x: new Float32Array(N), y: new Float32Array(N), ox: new Float32Array(N), oy: new Float32Array(N), a: new Float32Array(N),
      spawnAt: new Float32Array(N), fading: false, settled: false, quiet: 0, hitSent: false, frames: 0, simMs: 0, acc: 0, last: 0, dirty: true };
    for (let i = 0; i < N; i++) s.spawnAt[i] = RAIN.SPAWN_MS * Math.pow(i / N, 0.85) + Math.random() * 60;
    return s;
  }
  function spawn(s, i) {
    const r = s.r[i] = RAIN.R * (0.88 + Math.random() * 0.24); /* 大小差一點點，堆起來才不會排成整齊的蜂巢 */
    s.x[i] = r + Math.random() * (AW - 2 * r);
    s.y[i] = -r - Math.random() * 30;
    const vx = (Math.random() - 0.5) * 4.5, vy = 1.5 + Math.random() * 3; /* 每步的位移（像素） */
    s.ox[i] = s.x[i] - vx; s.oy[i] = s.y[i] - vy; s.a[i] = Math.random() * 8;
  }

  /* ----- 物理：Verlet＋位置修正，網格找鄰居；牆壁、地板會彈 ----- */
  const H = 1 / 120, G = 1500 * H * H;
  let cellHead = new Int32Array(1), cellNext = new Int32Array(RAIN.MAX_BALLS);
  function step(s) {
    const D = 2 * RAIN.R * 1.12, n = s.n, X = s.x, Y = s.y, OX = s.ox, OY = s.oy, RR = s.r;
    for (let i = 0; i < n; i++) {
      let vx = (X[i] - OX[i]) * 0.996, vy = (Y[i] - OY[i]) * 0.996;
      if (vy > 9) vy = 9; if (vx > 9) vx = 9; else if (vx < -9) vx = -9;
      OX[i] = X[i]; OY[i] = Y[i];
      X[i] += vx; Y[i] += vy + G;
      s.a[i] += vx / RR[i];
    }
    const cw = D, cols = Math.max(1, Math.ceil(AW / cw)), rows = Math.max(1, Math.ceil((AH + 80) / cw)), nc = cols * rows;
    for (let pass = 0; pass < 2; pass++) {
      if (cellHead.length < nc) cellHead = new Int32Array(nc);
      cellHead.fill(-1, 0, nc);
      for (let i = 0; i < n; i++) {
        const cx = Math.min(cols - 1, Math.max(0, (X[i] / cw) | 0)), cy = Math.min(rows - 1, Math.max(0, ((Y[i] + 80) / cw) | 0));
        const c = cy * cols + cx; cellNext[i] = cellHead[c]; cellHead[c] = i;
      }
      for (let i = 0; i < n; i++) {
        const cx = Math.min(cols - 1, Math.max(0, (X[i] / cw) | 0)), cy = Math.min(rows - 1, Math.max(0, ((Y[i] + 80) / cw) | 0));
        for (let yy = cy - 1; yy <= cy + 1; yy++) {
          if (yy < 0 || yy >= rows) continue;
          for (let xx = cx - 1; xx <= cx + 1; xx++) {
            if (xx < 0 || xx >= cols) continue;
            for (let j = cellHead[yy * cols + xx]; j >= 0; j = cellNext[j]) {
              if (j <= i) continue;
              const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy, m = RR[i] + RR[j];
              if (d2 >= m * m || d2 < 1e-6) continue;
              const d = Math.sqrt(d2), k = (m - d) / d * 0.5;
              X[i] -= dx * k; Y[i] -= dy * k; X[j] += dx * k; Y[j] += dy * k;
            }
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const r = RR[i], L = r, Rr = AW - r, floor = AH - r;
        if (X[i] < L) { const v = X[i] - OX[i]; X[i] = L; OX[i] = L + v * 0.6; }
        else if (X[i] > Rr) { const v = X[i] - OX[i]; X[i] = Rr; OX[i] = Rr + v * 0.6; }
        if (Y[i] > floor) {
          const v = Y[i] - OY[i]; Y[i] = floor;
          OY[i] = v > 1.2 ? floor + v * 0.55 : floor;       /* 用力掉下來就彈，慢的就停 */
          OX[i] = X[i] - (X[i] - OX[i]) * 0.85;               /* 地板摩擦 */
        }
      }
    }
  }
  function draw(s) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, AW, AH);
    /* 畫的時候比碰撞範圍小一點：球跟球之間留縫，看得到被埋在下面的泡泡和貓 */
    const K = sprSize / RAIN.R * RAIN.DRAW_K;
    const hs = s.holes;
    for (let i = 0; i < s.n; i++) {
      if (s.y[i] < -RAIN.R) continue;
      const k = ((Math.floor(s.a[i] / (Math.PI / 8)) % 8) + 8) % 8, z = s.r[i] * K;
      /* 貓僵住的地方：蓋在貓身上的球變半透明（越靠中間越透），看得到底下搞笑的貓 */
      let al = 1;
      if (hs) for (const h of hs) { const dx = (s.x[i] - h.cx) / h.rx, dy = (s.y[i] - h.cy) / h.ry, d = dx * dx + dy * dy; if (d < 1) al = Math.min(al, 0.28 + 0.72 * d); }
      if (al < 1) ctx.globalAlpha = al;
      ctx.drawImage(spr[k], s.x[i] - z / 2, s.y[i] - z / 2, z, z);
      if (al < 1) ctx.globalAlpha = 1;
    }
  }
  function frame() {
    raf = 0;
    const s = st;
    if (!s) return;
    try {
      const now = BR.now(), e = now - s.t0;
      if (!s.fading && e >= RAIN.DUR_MS) fade();
      if (!s.hitSent && e >= RAIN.HIT_MS) {
        s.hitSent = true;
        /* 預計：球雨結束 + 淡出 + 再 5 秒；真正淡出完成時會再發 "gone" 校正 */
        const ms = Math.min(RAIN.FREEZE_CAP_MS, RAIN.DUR_MS + RAIN.FADE_MS + RAIN.AFTER_MS - e);
        if (ms > 800 && !s.fading) window.dispatchEvent(new CustomEvent("sc-rain", { detail: { phase: "hit", ms } }));
      }
      if (!s.settled) {
        const t = performance.now(), dt = s.last ? Math.min(50, t - s.last) : 16.7; s.last = t;
        while (s.n < s.N && s.spawnAt[s.n] <= e) spawn(s, s.n++);
        s.acc += dt;
        let k = 0;
        while (s.acc >= 1000 * H && k < 4) { step(s); s.acc -= 1000 * H; k++; }
        if (k === 4) s.acc = 0; /* 太慢的裝置：寧可慢動作，也不要越積越多 */
        s.simMs += performance.now() - t;
        /* 全部掉完、而且都不太動了 → 停止計算（不會一直抖） */
        if (s.n >= s.N) {
          let mx = 0;
          for (let i = 0; i < s.n; i++) { const vx = s.x[i] - s.ox[i], vy = s.y[i] - s.oy[i], v = vx * vx + vy * vy; if (v > mx) mx = v; }
          s.quiet = mx < 0.004 ? s.quiet + 1 : 0;
          if (s.quiet > 30 || e > RAIN.SETTLE_MAX_MS) s.settled = true;
        }
        s.dirty = true;
      }
      if (s.dirty) { const t1 = performance.now(); draw(s); s.drawMs = (s.drawMs || 0) + performance.now() - t1; s.dirty = false; s.frames++; }
    } catch (err) { stop(); return; }
    if (st) raf = requestAnimationFrame(frame);
  }
  function begin(t0, id) {
    stop();
    st = freshState(t0, id);
    cv.style.transition = "none"; cv.style.opacity = "1"; cv.style.display = "block";
    raf = requestAnimationFrame(frame);
    /* 備援：分頁在背景時畫面不更新，也要準時淡出 */
    const s0 = st;
    clearTimeout(durTimer);
    durTimer = setTimeout(() => { if (st === s0) fade(); }, Math.max(0, t0 + RAIN.DUR_MS - BR.now()));
  }
  let fadeTimer = 0, durTimer = 0;
  function fade() {
    const s = st;
    if (!s || s.fading) return;
    s.fading = true;
    cv.style.transition = "opacity " + RAIN.FADE_MS + "ms ease";
    void cv.offsetWidth;
    cv.style.opacity = "0";
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => { if (st === s) stop(); }, RAIN.FADE_MS + 60);
  }
  function stop() {
    clearTimeout(fadeTimer); clearTimeout(durTimer);
    if (raf) cancelAnimationFrame(raf); raf = 0;
    const was = st;
    st = null;
    /* 球完全消失：通知貓「再僵 5 秒就好」 */
    if (was && was.hitSent) { try { window.dispatchEvent(new CustomEvent("sc-rain", { detail: { phase: "gone", ms: RAIN.AFTER_MS } })); } catch (_) {} }
    cv.style.transition = "none"; cv.style.opacity = "0"; cv.style.display = "none";
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); } catch (_) {}
  }

  /* ----- 收到資料庫的球雨事件（自己觸發的也從這裡進來） ----- */
  function sync(v) {
    try {
      lastV = v;
      if (!enabled) { stop(); return; } /* 貓咪關掉：不播 */
      const now = BR.now();
      if (!v || !Number.isFinite(+v.t)) { if (st) fade(); return; }
      const t = +v.t, id = t + ":" + (v.by || "");
      if (st && st.id === id) { if (v.end && !st.fading) fade(); return; }
      if (v.end || now - t > RAIN.DUR_MS) { if (st && !st.fading && v.end) fade(); return; } /* 已經結束或太舊（進房時不播） */
      /* 兩個人幾乎同時觸發：不重來，直接改用最後寫進去的那一筆的時間 */
      if (st && !st.fading && Math.abs(t - st.t0) < 3000) { st.id = id; st.t0 = Math.min(st.t0, t); return; }
      begin(Math.min(t, now), id);
    } catch (_) { stop(); }
  }
  /* 讓貓的位置「透出來」：rects 是螢幕座標（getBoundingClientRect），ms 後恢復 */
  let holeTimer = 0;
  function setHoles(rects, ms) {
    const s = st;
    if (!s) return;
    try {
      const b = cv.getBoundingClientRect();
      s.holes = (rects || []).filter((r) => r && r.width > 0).map((r) => ({ cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2, rx: r.width * 0.55, ry: r.height * 0.6 }));
      s.dirty = true;
      clearTimeout(holeTimer);
      holeTimer = setTimeout(() => { if (st === s) { s.holes = null; s.dirty = true; } }, Math.max(0, ms || 0));
    } catch (_) {}
  }
  function requestStart() {
    if (!enabled) return;
    const v = { t: BR.now(), by: BR.me };
    if (BR.write) { try { BR.write(v); return; } catch (_) {} }
    sync(v);
  }
  function requestEnd() {
    if (!st || st.fading) return;
    if (BR.writeEnd) { try { BR.writeEnd(); fade(); return; } catch (_) {} }
    fade();
  }

  /* ----- 手勢：連點 3 下「在線上」；球雨中點一下就提早淡出 ----- */
  let taps = [];
  if (title) {
    title.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!enabled) return; /* 貓咪關掉：連點也不觸發 */
      const t = performance.now();
      if (st) { taps = []; requestEnd(); return; } /* 球雨中（含淡出中）：第一下就是提早淡出，不會疊第二波 */
      if (taps.length && t - taps[taps.length - 1] > RAIN.TAP_GAP_MS) taps = [];
      taps.push(t);
      if (taps.length >= RAIN.TAPS) { taps = []; requestStart(); }
    });
  }
  window.addEventListener("resize", () => { if (st) layout(); });
})();
