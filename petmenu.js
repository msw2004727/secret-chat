/* ===== 點貓選單（扇形 3 顆圓鈕：餵魚／摸肚子／打頭）=====
   獨立模組，掛在 window.PetMenu。只管「選單畫面」和「動作事件」：
   - open({ x, y, id, sulky, onPick, onClose })：在 (x, y)（螢幕座標，貓頭上）往上扇形展開；靠邊自動轉向不超出畫面
   - close(reason)：依序收回（reason: "pick" | "outside" | "timeout" | "same" | "other" | "force"）
   - 動作事件走 act(ev) → write?（之後接同步）: apply(ev) → onAction(ev)
     之後要雙方同步：PetMenu.write = (ev) => set(ref(db, `${base}/pet`), ev)；onValue → PetMenu.sync(val)
   這個檔不碰貓的行為；貓那邊（聊天室貓咪模組）負責 onAction 播反應。 */
(function () {
  "use strict";
  const CFG = { R: 78, BTN: 56, SPREAD: 50, AUTO_MS: 4000, STAGGER: 55, MARGIN: 6, STALE_MS: 6000 };
  const ITEMS = [
    { id: "fish", label: "餵魚", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12c2.6-3.6 6.2-5.2 9.6-5.2 3.3 0 5.6 2.2 6.9 5.2-1.3 3-3.6 5.2-6.9 5.2-3.4 0-7-1.6-9.6-5.2z" fill="#8fd0ff"/><path d="M19.6 12l2.9-3.3v6.6z" fill="#5fb4ee"/><circle cx="8.2" cy="11" r="1.1" fill="#173045"/><path d="M11.5 9.2c1 1.8 1 3.8 0 5.6" stroke="#5fb4ee" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>' },
    { id: "belly", label: "摸肚子", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21c-2-1.6-3.2-4-3.2-6.6V9.6c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v2.2V5.4c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v5V3.9c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v6.5V5.2c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v8.6l1.3-1.6c.6-.7 1.6-.8 2.3-.2.6.5.7 1.4.3 2.1L17 20.4c-.4.4-1 .6-1.6.6H7z" fill="#f7c9a9"/><path d="M15.2 15.2c.6.2 1 .7 1.1 1.3" stroke="#d9987a" stroke-width=".9" fill="none" stroke-linecap="round"/></svg>' },
    { id: "bonk", label: "打頭", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="9" width="12.5" height="9.5" rx="4" fill="#f7c9a9"/><path d="M8.2 9.3v3M11.3 9.1v3.2M14.4 9.3v3" stroke="#d9987a" stroke-width="1" stroke-linecap="round"/><path d="M17.3 12.4c1.6-.2 2.6.9 2.4 2.2-.2 1.2-1.3 1.8-2.6 1.5" fill="#f7c9a9"/><path d="M18.5 3.2l.8 1.9 2 .3-1.5 1.4.4 2-1.7-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#ffd34d"/></svg>' }
  ];
  const PM = window.PetMenu = {
    CFG, ITEMS,
    get isOpen() { return !!cur; }, get forId() { return cur ? cur.id : null; },
    open, close, act, apply, sync,
    write: null,          /* 之後接同步：送到資料庫；沒設就只在自己畫面播 */
    onAction: null,       /* 貓模組註冊：收到動作事件就播反應 */
    me: "me-" + Math.random().toString(36).slice(2, 10),
    now: () => Date.now() /* 正式站可換成 nowServer */
  };
  let host = null, wrap = null, cur = null, autoT = 0, seen = new Set(), outsideOn = false;
  function mount() {
    if (wrap) return true;
    host = document.getElementById("chat") || document.body;
    if (!host) return false;
    wrap = document.createElement("div");
    wrap.className = "pet-menu";
    wrap.setAttribute("role", "menu");
    wrap.setAttribute("aria-hidden", "true");
    host.appendChild(wrap);
    const st = document.createElement("style");
    st.textContent = `
      .pet-menu { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: 9; pointer-events: none; }
      .pet-btn { position: absolute; left: 0; top: 0; width: ${CFG.BTN}px; height: ${CFG.BTN}px; margin: ${-CFG.BTN / 2}px 0 0 ${-CFG.BTN / 2}px; border-radius: 50%;
        border: 1px solid rgba(255,255,255,.16); background: radial-gradient(circle at 50% 30%, rgba(58,64,78,.97), rgba(30,34,43,.97));
        box-shadow: 0 6px 16px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08); color: #e9edf3; font: 600 11px/1.1 system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 0; cursor: pointer;
        pointer-events: auto; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
        opacity: 0; transform: translate(var(--x0), var(--y0)) scale(.3);
        transition: transform .32s cubic-bezier(.3,1.5,.5,1), opacity .2s ease; }
      .pet-btn svg { width: 24px; height: 24px; display: block; }
      .pet-btn.show { opacity: 1; transform: translate(var(--x), var(--y)) scale(1); }
      .pet-btn.hide { opacity: 0; transform: translate(var(--x0), var(--y0)) scale(.3); transition: transform .2s ease-in, opacity .18s ease-in; }
      .pet-btn:active { filter: brightness(1.25); }
      .pet-btn.dim { opacity: .45; }
      .pet-btn.show.dim { opacity: .45; }
      .pet-btn.press { transform: translate(var(--x), var(--y)) scale(.9); }
      .pet-chip { position: absolute; left: 0; top: 0; transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(.6); opacity: 0;
        padding: 4px 9px; border-radius: 999px; background: rgba(60,26,30,.92); border: 1px solid rgba(255,120,120,.35); color: #ffd6d6;
        font: 600 11px/1.2 system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif; white-space: nowrap; transition: transform .25s cubic-bezier(.3,1.5,.5,1), opacity .2s; }
      .pet-chip.show { opacity: 1; transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(1); }`;
    document.head.appendChild(st);
    window.addEventListener("sc-pets", (e) => { if (!(e.detail && e.detail.on)) close("force"); });
    return true;
  }
  function areaRect() {
    const r = host.getBoundingClientRect();
    const bar = document.querySelector(".c-bar"), inp = document.querySelector(".c-input") || document.getElementById("sendForm");
    const top = bar ? bar.getBoundingClientRect().bottom : r.top, bottom = inp ? inp.getBoundingClientRect().top : r.bottom;
    return { left: Math.max(0, r.left), right: Math.min(window.innerWidth, r.right), top, bottom, hostL: r.left, hostT: r.top };
  }
  /* 扇形位置：預設往上（-90°），靠邊或靠上就整個扇形轉向，直到三顆都在畫面內 */
  function layout(x, y, n, A) {
    const R = CFG.R, h = CFG.BTN / 2 + CFG.MARGIN, sp = CFG.SPREAD * Math.PI / 180;
    const ring = (c) => { const o = []; for (let i = 0; i < n; i++) { const a = c + (i - (n - 1) / 2) * sp; o.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R }); } return o; };
    /* 整組要平移多少才會全部進畫面（不會一顆一顆擠在一起） */
    const shift = (pts) => {
      const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
      const lo = Math.min(...xs), hi = Math.max(...xs), tp = Math.min(...ys), bt = Math.max(...ys);
      const dx = lo < A.left + h ? A.left + h - lo : hi > A.right - h ? A.right - h - hi : 0;
      const dy = tp < A.top + h ? A.top + h - tp : bt > A.bottom - h ? A.bottom - h - bt : 0;
      return { dx, dy };
    };
    const cands = [-90, -75, -105, -60, -120, -45, -135, -30, -150, -15, -165, 0, -180];
    let best = null;
    for (const d of cands) {
      const c = d * Math.PI / 180, pts = ring(c), m = shift(pts), cost = Math.hypot(m.dx, m.dy);
      if (cost === 0) { best = { c, pts, m }; break; }
      if (!best || cost < best.cost - 0.5) best = { c, pts, m, cost };
    }
    const out = best.pts.map((q) => ({ x: q.x + best.m.dx, y: q.y + best.m.dy }));
    /* 由左到右排（點的順序跟眼睛看的一樣） */
    out.sort((p, q) => p.x - q.x || p.y - q.y);
    return { pts: out, center: best.c };
  }
  function armOutside() {
    if (outsideOn) return;
    outsideOn = true;
    /* 比貓的點擊晚註冊，所以點在貓身上時先由貓決定收不收；點空白才關選單 */
    window.addEventListener("pointerdown", (e) => {
      if (!cur) return;
      if (e.target && e.target.closest && e.target.closest(".pet-btn")) return;
      close("outside");
    }, { capture: true });
  }
  function open(o) {
    if (!mount()) return false;
    armOutside();
    if (cur) close("other", true);
    const A = areaRect();
    const ax = Math.min(A.right - 4, Math.max(A.left + 4, o.x)), ay = Math.min(A.bottom - 4, Math.max(A.top + 4, o.y));
    const L = layout(ax, ay, ITEMS.length, A);
    const els = [];
    const lx = (v) => (v - A.hostL) + "px", ly = (v) => (v - A.hostT) + "px";
    ITEMS.forEach((it, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pet-btn"; b.dataset.id = it.id;
      b.setAttribute("role", "menuitem"); b.setAttribute("aria-label", it.label);
      b.innerHTML = it.icon + "<span>" + it.label + "</span>";
      const dim = o.sulky && it.id !== "fish";
      if (dim) b.classList.add("dim");
      b.style.setProperty("--x0", lx(ax)); b.style.setProperty("--y0", ly(ay));
      b.style.setProperty("--x", lx(L.pts[i].x)); b.style.setProperty("--y", ly(L.pts[i].y));
      b.style.transitionDelay = (i * CFG.STAGGER) + "ms";
      let down = false;
      b.addEventListener("pointerdown", (e) => { down = true; b.classList.add("press"); e.stopPropagation(); });
      b.addEventListener("pointerleave", () => { down = false; b.classList.remove("press"); });
      b.addEventListener("pointercancel", () => { down = false; b.classList.remove("press"); });
      b.addEventListener("pointerup", (e) => { if (!down) return; down = false; b.classList.remove("press"); e.stopPropagation(); pick(it.id, dim); });
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); }); /* 實際動作在 pointerup；鍵盤 Enter 也走這裡 */
      b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(it.id, dim); } });
      wrap.appendChild(b); els.push(b);
    });
    let chip = null;
    if (o.sulky) {
      chip = document.createElement("div"); chip.className = "pet-chip"; chip.textContent = "還在生氣…";
      chip.style.setProperty("--x", lx(ax)); chip.style.setProperty("--y", ly(Math.max(A.top + 14, ay - 6)));
      wrap.appendChild(chip); els.push(chip);
    }
    wrap.setAttribute("aria-hidden", "false");
    cur = { id: o.id, els, onPick: o.onPick, onClose: o.onClose, t0: performance.now(), center: L.center, pts: L.pts };
    void wrap.offsetWidth;
    requestAnimationFrame(() => { for (const b of els) b.classList.add("show"); });
    clearTimeout(autoT); autoT = setTimeout(() => close("timeout"), CFG.AUTO_MS);
    return true;
  }
  function pick(id, dim) {
    if (!cur) return;
    const c = cur;
    close("pick", false, id);
    try { if (c.onPick) c.onPick(id, !!dim); } catch (_) {}
  }
  function close(reason, quick, picked) {
    clearTimeout(autoT);
    if (!cur) return;
    const c = cur; cur = null;
    wrap.setAttribute("aria-hidden", "true");
    const n = c.els.length;
    c.els.forEach((b, i) => { b.style.transitionDelay = quick ? "0ms" : ((n - 1 - i) * 40) + "ms"; b.classList.remove("show", "press"); b.classList.add("hide"); if (picked && b.dataset.id === picked) b.style.transitionDelay = ((n) * 40) + "ms"; });
    setTimeout(() => { for (const b of c.els) b.remove(); }, quick ? 220 : 220 + n * 40 + 60);
    try { if (c.onClose) c.onClose(reason || "force", picked || null); } catch (_) {}
  }
  /* ----- 動作事件（現在只在自己畫面；結構留好之後接同步） ----- */
  function act(ev) {
    ev = Object.assign({ t: PM.now(), by: PM.me }, ev);
    ev.id = ev.id || ev.t + ":" + ev.by + ":" + ev.cat;
    if (PM.write) { try { PM.write(ev); return ev; } catch (_) {} }
    apply(ev);
    return ev;
  }
  function apply(ev) {
    if (!ev || seen.has(ev.id)) return false;
    seen.add(ev.id); if (seen.size > 50) seen = new Set([...seen].slice(-20));
    try { if (PM.onAction) PM.onAction(ev); } catch (_) {}
    return true;
  }
  function sync(v) { /* 之後：資料庫 onValue 收到的事件；太舊的不播 */
    if (!v || !v.cat || !v.act) return;
    if (PM.now() - (+v.t || 0) > CFG.STALE_MS) return;
    apply(v);
  }
})();

  
