/* 房間裡的 OOXX 與命運輪盤。
   隨機結果由發起的那一側決定，寫進雲端後兩邊播同一段動畫。
   下棋與勝場用 transaction，避免兩台同時寫互相蓋掉。 */

export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const PHASE = ["invite", "ready", "wheel", "play", "over", "rematch", "rebuff", "nope"];
const MODE = ["none", "wind", "edge"];
const EMPTY = ".........";

export function otherSide(side) { return side === "m" ? "f" : side === "f" ? "m" : ""; }

export function pointedSelf(rot) {
  const norm = ((rot % 360) + 360) % 360;
  const fromTop = (360 - norm) % 360;
  return fromTop < 180;
}

export function personAt(rot, viewAt) {
  if (viewAt !== "m" && viewAt !== "f") return "";
  return pointedSelf(rot) ? viewAt : otherSide(viewAt);
}

/* 發起端呼叫一次。回傳整數角度。風與邊緣抖動互斥。 */
export function planSpin(random = Math.random) {
  const roll = random();
  let mode = "none";
  if (roll < 0.05) mode = "edge";
  else if (roll < 0.15) mode = "wind";
  const viewAt = "";
  if (mode === "edge") {
    const boundary = 360 * 5 + (random() < 0.5 ? 0 : 180);
    const cross = random() < 0.5;
    return { mode, base: boundary, final: boundary + (cross ? 12 : -12), viewAt };
  }
  const base = Math.round(360 * 5 + random() * 359);
  const extra = mode === "wind" ? Math.round(360 + 50 + random() * 260) : 0;
  return { mode, base, final: base + extra, viewAt };
}

export function winnerOf(cells) {
  if (typeof cells !== "string" || cells.length !== 9) return "";
  for (const line of LINES) {
    const a = cells[line[0]];
    if ((a === "m" || a === "f") && a === cells[line[1]] && a === cells[line[2]]) return a;
  }
  return "";
}

function sideOf(v) { return v === "m" || v === "f" ? v : ""; }
function modeOf(v) { return MODE.includes(v) ? v : "none"; }
function intOf(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 20000 ? n : 0;
}

export function viewOoxx(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!PHASE.includes(raw.phase) || !sideOf(raw.by) || typeof raw.id !== "string") return null;
  const cells = typeof raw.cells === "string" && /^[mf.]{9}$/.test(raw.cells) ? raw.cells : EMPTY;
  return {
    id: raw.id.slice(0, 64),
    by: raw.by,
    phase: raw.phase,
    ok: raw.ok === true,
    spin: intOf(raw.spin),
    fin: intOf(raw.fin),
    mode: modeOf(raw.mode),
    first: sideOf(raw.first),
    turn: sideOf(raw.turn),
    cells,
    winner: sideOf(raw.winner),
    draw: raw.draw === true,
    rematchBy: sideOf(raw.rematchBy),
    t: Number(raw.t) || 0,
  };
}

export function viewWheel(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!PHASE.includes(raw.phase) || !sideOf(raw.by) || typeof raw.id !== "string") return null;
  const topic = typeof raw.topic === "string" ? raw.topic.slice(0, 24) : "";
  return {
    id: raw.id.slice(0, 64),
    by: raw.by,
    phase: raw.phase,
    topic,
    ok: raw.ok === true,
    spin: intOf(raw.spin),
    fin: intOf(raw.fin),
    mode: modeOf(raw.mode),
    target: sideOf(raw.target),
    rematchBy: sideOf(raw.rematchBy),
    t: Number(raw.t) || 0,
  };
}

export function viewWins(raw) {
  const m = raw && Number.isInteger(raw.m) && raw.m >= 0 ? raw.m : 0;
  const f = raw && Number.isInteger(raw.f) && raw.f >= 0 ? raw.f : 0;
  return { m, f };
}

export function packOoxx(g) {
  return {
    id: g.id, by: g.by, phase: g.phase, ok: !!g.ok,
    spin: g.spin | 0, fin: g.fin | 0, mode: g.mode || "none",
    first: g.first || "", turn: g.turn || "",
    cells: g.cells || EMPTY, winner: g.winner || "", draw: !!g.draw,
    rematchBy: g.rematchBy || "", t: g.t,
  };
}

export function packWheel(g) {
  return {
    id: g.id, by: g.by, phase: g.phase, topic: g.topic || "", ok: !!g.ok,
    spin: g.spin | 0, fin: g.fin | 0, mode: g.mode || "none",
    target: g.target || "", rematchBy: g.rematchBy || "", t: g.t,
  };
}

export function createOoxx(side, id, now) {
  return packOoxx({ id, by: side, phase: "invite", t: now, cells: EMPTY });
}

export function createWheel(side, id, topic, now) {
  return packWheel({ id, by: side, phase: "invite", topic, t: now });
}

export function acceptInvite(cur, side) {
  const g = viewOoxx(cur);
  if (!g || g.phase !== "invite" || g.by === side) return;
  return packOoxx({ ...g, ok: true });
}

export function acceptWheel(cur, side) {
  const g = viewWheel(cur);
  if (!g || g.phase !== "invite" || g.by === side) return;
  return packWheel({ ...g, ok: true });
}

export function needsOoxxPlan(g, side) {
  if (!g || g.spin) return false;
  if (g.phase === "invite" && g.ok && g.by === side) return true;
  if (g.phase === "ready" && g.rematchBy === side) return true;
  return false;
}

export function needsWheelPlan(g, side) {
  if (!g || g.spin) return false;
  if (g.phase === "invite" && g.ok && g.by === side) return true;
  if (g.phase === "ready" && g.rematchBy === side) return true;
  return false;
}

export function withOoxxPlan(g, plan) {
  const first = personAt(plan.final, g.phase === "ready" ? g.rematchBy : g.by);
  return packOoxx({
    ...g, phase: "wheel", spin: plan.base, fin: plan.final, mode: plan.mode,
    first, turn: first, cells: EMPTY, winner: "", draw: false, ok: true,
  });
}

export function withWheelPlan(g, plan) {
  const roller = g.phase === "ready" ? g.rematchBy : g.by;
  return packWheel({
    ...g, phase: "wheel", spin: plan.base, fin: plan.final, mode: plan.mode,
    target: personAt(plan.final, roller), ok: true,
  });
}

export function applyMove(cur, side, index) {
  const g = viewOoxx(cur);
  if (!g || (g.phase !== "wheel" && g.phase !== "play")) return;
  if (g.turn !== side || index < 0 || index > 8) return;
  if (g.cells[index] !== ".") return;
  const cells = g.cells.split("");
  cells[index] = side;
  const next = cells.join("");
  const win = winnerOf(next);
  const draw = !win && !next.includes(".");
  return packOoxx({
    ...g,
    cells: next,
    phase: win || draw ? "over" : "play",
    winner: win,
    draw,
    turn: win || draw ? g.turn : otherSide(side),
  });
}

export function askRematch(cur, side, kind) {
  const g = kind === "wheel" ? viewWheel(cur) : viewOoxx(cur);
  if (!g || g.phase !== "over") return;
  const pack = kind === "wheel" ? packWheel : packOoxx;
  return pack({ ...g, phase: "rematch", rematchBy: side });
}

export function agreeRematch(cur, side, kind) {
  const g = kind === "wheel" ? viewWheel(cur) : viewOoxx(cur);
  if (!g || g.phase !== "rematch" || g.rematchBy === side) return;
  const pack = kind === "wheel" ? packWheel : packOoxx;
  return pack({
    ...g, phase: "ready", spin: 0, fin: 0, mode: "none",
    cells: EMPTY, winner: "", draw: false, first: "", turn: "", target: "",
  });
}

export function rebuffRematch(cur, side, kind) {
  const g = kind === "wheel" ? viewWheel(cur) : viewOoxx(cur);
  if (!g || g.phase !== "rematch" || g.rematchBy === side) return;
  const pack = kind === "wheel" ? packWheel : packOoxx;
  return pack({ ...g, phase: "rebuff" });
}

export function dismissRebuff(cur, side, kind) {
  const g = kind === "wheel" ? viewWheel(cur) : viewOoxx(cur);
  if (!g || g.phase !== "rebuff" || g.rematchBy !== side) return;
  const pack = kind === "wheel" ? packWheel : packOoxx;
  return pack({ ...g, phase: "over" });
}

export function addWin(cur, side) {
  const w = viewWins(cur);
  if (side === "m") return { m: w.m + 1, f: w.f };
  if (side === "f") return { m: w.m, f: w.f + 1 };
  return { m: w.m, f: w.f };
}

const HAND = {
  win: `<svg viewBox="0 0 250 150" aria-label="勝!"><text class="hand" x="125" y="118" text-anchor="middle">勝!</text></svg>`,
  lose: `<svg viewBox="0 0 360 150" aria-label="笨蛋!"><text class="hand" x="180" y="118" text-anchor="middle">笨蛋!</text></svg>`,
  draw: `<svg viewBox="0 0 270 150" aria-label="平手"><text class="hand" x="135" y="118" text-anchor="middle">平手</text></svg>`,
  you: `<svg viewBox="0 0 320 150" aria-label="是你！"><text class="hand" x="160" y="118" text-anchor="middle">是你！</text></svg>`,
  him: `<svg viewBox="0 0 320 150" aria-label="是他！"><text class="hand" x="160" y="118" text-anchor="middle">是他！</text></svg>`,
};

function markSvg(kind) {
  if (kind === "O") {
    return `<svg viewBox="0 0 100 100"><path class="ink o" d="M50 16C76 14 88 34 84 54C80 78 60 90 40 86C18 80 12 54 22 34C30 18 38 16 50 16"/></svg>`;
  }
  return `<svg viewBox="0 0 100 100"><path class="ink x" d="M24 22C40 38 58 58 78 80"/><path class="ink x x2" d="M76 20C58 40 42 60 22 82"/></svg>`;
}

let spinJob = 0;
function stopSpin() { spinJob += 1; }
function setSpin(el, deg) {
  if (!el) return;
  el.style.transition = "none";
  el.style.setProperty("--spin", deg.toFixed(3) + "deg");
}
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}
function tween(el, from, to, ms, ease, done) {
  const job = spinJob;
  const t0 = performance.now();
  function frame(now) {
    if (job !== spinJob) return;
    const t = Math.min(1, (now - t0) / ms);
    setSpin(el, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(frame);
    else if (done) done();
  }
  requestAnimationFrame(frame);
}
function wobble(el, edge, final, done) {
  const job = spinJob;
  const t0 = performance.now();
  const wobbleMs = 1500;
  const settleMs = 320;
  const total = wobbleMs + settleMs;
  function frame(now) {
    if (job !== spinJob) return;
    const sec = (now - t0) / 1000;
    const t = Math.min(1, (now - t0) / total);
    const enter = smoothstep(0, 0.05, sec);
    const settle = smoothstep(wobbleMs / total, 1, t);
    const amp = 14 * enter * Math.exp(-1.8 * sec) * (1 - settle);
    setSpin(el, edge + Math.sin(2 * Math.PI * 10 * sec) * amp + (final - edge) * settle);
    if (t < 1) requestAnimationFrame(frame);
    else { setSpin(el, final); if (done) done(); }
  }
  requestAnimationFrame(frame);
}

function gid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function mountGames(doc, opts) {
  const $ = (id) => doc.getElementById(id);
  const toast = opts.toast || (() => {});
  const getSide = opts.getSide || (() => "");
  let session = null;
  let played = { ooxx: "", wheel: "" };
  let closed = { ooxx: "", wheel: "" };
  let busy = false;
  let winsSeen = { m: 0, f: 0 };
  let arming = false;

  function veil(el, on) {
    if (!el) return;
    clearTimeout(el._hideTimer);
    if (on) {
      el.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
      return;
    }
    el.classList.remove("is-in");
    el._hideTimer = setTimeout(() => { if (!el.classList.contains("is-in")) el.hidden = true; }, 360);
  }
  function hideAll() {
    for (const id of ["gxInvite","gxWheel","gxGame","gxAsk","gxFateInvite","gxFateNope","gxFateWheel","gxRematch","gxRebuff"]) {
      veil($(id), false);
    }
  }
  function side() {
    const s = getSide();
    return s === "m" || s === "f" ? s : "";
  }
  function paintSeals(wins, hit) {
    const m = $("winsM"); const f = $("winsF");
    if (m) m.textContent = String(wins.m);
    if (f) f.textContent = String(wins.f);
    if (hit === "m" || hit === "f") {
      const el = $(hit === "m" ? "sealM" : "sealF");
      if (!el) return;
      el.classList.remove("hit");
      void el.offsetWidth;
      el.classList.add("hit");
    }
  }
  function showGust(kind, on) {
    const root = $(kind === "ooxx" ? "gxWheel" : "gxFateWheel");
    const wrap = $(kind === "ooxx" ? "gxOoxxWrap" : "gxFateWrap");
    const gust = $(kind === "ooxx" ? "gxOoxxGust" : "gxFateGust");
    root?.querySelector(".c-gx-card")?.classList.toggle("is-wind", on);
    wrap?.classList.toggle("is-gust", on);
    if (gust) { gust.hidden = !on; gust.classList.toggle("go", on); }
  }
  function playSpin(kind, plan, onDone) {
    const disc = $(kind === "ooxx" ? "gxDisc" : "gxFateDisc");
    const caption = $(kind === "ooxx" ? "gxWheelText" : "gxFateText");
    if (caption) { caption.hidden = false; caption.textContent = "輪盤轉動中…"; }
    stopSpin();
    setSpin(disc, 0);
    showGust(kind, false);
    requestAnimationFrame(() => {
      tween(disc, 0, plan.spin, 3200, easeInOutQuart, () => {
        if (plan.mode === "wind") {
          if (caption) caption.textContent = "一陣風…";
          showGust(kind, true);
          tween(disc, plan.spin, plan.fin, 1450, easeInOutCubic, () => { showGust(kind, false); onDone(); });
          return;
        }
        if (plan.mode === "edge") {
          if (caption) caption.textContent = "停在邊緣…";
          wobble(disc, plan.spin, plan.fin, onDone);
          return;
        }
        onDone();
      });
    });
  }

  function render() {
    if (!session || busy) return;
    const me = side();
    const o = session.ooxx;
    const w = session.wheel;
    hideAll();
    if (o && me) paintOoxx(o, me);
    if (w && me) paintWheel(w, me);
  }

  function paintOoxx(g, me) {
    if (g.phase === "invite") {
      if (g.by !== me && !g.ok) {
        $("gxInviteFrom").textContent = (g.by === "m" ? "麥" : "辛") + " 邀請你玩 OOXX";
        veil($("gxInvite"), true);
      }
      return;
    }
    if (g.phase === "wheel" || g.phase === "play" || g.phase === "over" || g.phase === "rematch" || g.phase === "rebuff" || g.phase === "ready") {
      const key = g.id + ":" + g.spin + ":" + g.fin + ":" + g.mode;
      if ((g.phase === "wheel" || g.phase === "play" || g.phase === "over") && g.spin && played.ooxx !== key && g.phase === "wheel") {
        played.ooxx = key;
        busy = true;
        veil($("gxWheel"), true);
        $("gxWheelText").textContent = "輪盤轉動中…";
        playSpin("ooxx", { spin: g.spin, fin: g.fin, mode: g.mode }, () => {
          busy = false;
          if (!session || !session.ooxx || session.ooxx.id !== g.id) return;
          const who = session.ooxx.first || personAt(session.ooxx.fin, session.ooxx.by);
          $("gxWheelText").textContent = (who === side() ? "自己" : "對方") + "先下";
          setTimeout(() => { if (session && session.ooxx && session.ooxx.id === g.id) render(); }, 700);
        });
        return;
      }
      const showBoard = g.phase === "play" || g.phase === "over" || (g.phase === "wheel" && played.ooxx === key) || g.phase === "rematch" || g.phase === "rebuff" || g.phase === "ready";
      if (showBoard && closed.ooxx !== g.id && g.phase !== "rematch") openBoard(g, me);
      if (g.phase === "rematch" && g.rematchBy === me && closed.ooxx !== g.id) openBoard(g, me);
      if (g.phase === "rematch" && g.rematchBy !== me) veil($("gxRematch"), true);
      if (g.phase === "rebuff" && g.rematchBy === me) veil($("gxRebuff"), true);
    }
  }

  function openBoard(g, me) {
    veil($("gxWheel"), false);
    veil($("gxGame"), true);
    const over = g.phase === "over" || g.phase === "rematch" || g.phase === "rebuff" || g.phase === "ready";
    $("gxTurn").textContent = over ? "" : (g.turn === me ? "輪到自己" : "輪到對方");
    const board = $("gxBoard");
    board.classList.toggle("is-over", over && g.phase !== "play");
    board.innerHTML = g.cells.split("").map((cell, i) => {
      const body = cell === "m" || cell === "f" ? markSvg(cell === g.first ? "O" : "X") : "";
      const open = !over && g.turn === me && cell === ".";
      return `<button type="button" class="c-gx-cell" data-i="${i}" ${open ? "" : "disabled"}>${body}</button>`;
    }).join("");
    const result = $("gxResult");
    const end = $("gxGameEnd");
    if (g.phase === "over" || g.phase === "rebuff") {
      board.classList.add("is-over");
      const kind = g.draw ? "draw" : g.winner === me ? "win" : "lose";
      result.hidden = false;
      result.className = "c-gx-result " + kind;
      result.innerHTML = HAND[kind];
      end.hidden = false;
    } else {
      result.hidden = true;
      result.innerHTML = "";
      end.hidden = true;
    }
  }

  function paintWheel(g, me) {
    if (g.phase === "invite" && g.by !== me && !g.ok) {
      $("gxFateTopicShow").textContent = g.topic;
      veil($("gxFateInvite"), true);
      return;
    }
    if (g.phase === "nope" && g.by === me) { veil($("gxFateNope"), true); return; }
    if (g.phase === "wheel" || g.phase === "over" || g.phase === "rematch" || g.phase === "rebuff" || g.phase === "ready") {
      const key = g.id + ":" + g.spin + ":" + g.fin + ":" + g.mode;
      if (g.phase === "wheel" && g.spin && played.wheel !== key) {
        played.wheel = key;
        busy = true;
        $("gxFateTopic").textContent = g.topic;
        veil($("gxFateWheel"), true);
        $("gxFateDim").hidden = true;
        $("gxFateEnd").hidden = true;
        playSpin("wheel", { spin: g.spin, fin: g.fin, mode: g.mode }, () => {
          busy = false;
          const meNow = side();
          if (meNow) tx(session.wheelRef, (cur) => {
            const live = viewWheel(cur);
            if (!live || live.phase !== "wheel" || live.id !== g.id) return;
            const roller = live.rematchBy || live.by;
            if (roller !== meNow) return;
            return packWheel({ ...live, phase: "over" });
          });
          if (session && session.wheel && session.wheel.id === g.id) render();
        });
        return;
      }
      if (g.spin && (played.wheel === key || g.phase === "over" || g.phase === "rematch" || g.phase === "rebuff" || g.phase === "ready")) {
        if (closed.wheel !== g.id) showFateResult(g, me);
      }
      if (g.phase === "rematch" && g.rematchBy !== me) veil($("gxRematch"), true);
      if (g.phase === "rebuff" && g.rematchBy === me) veil($("gxRebuff"), true);
    }
  }

  function showFateResult(g, me) {
    veil($("gxFateWheel"), true);
    $("gxFateTopic").textContent = g.topic;
    const disc = $("gxFateDisc");
    const who = g.target;
    const show = pointedSelf(g.fin) === (who === me) ? g.fin : g.fin + 180;
    setSpin(disc, show);
    $("gxFateWrap").classList.add("is-done");
    const you = who === me;
    const result = $("gxFateResult");
    $("gxFateDim").hidden = false;
    result.className = "c-gx-result fate " + (you ? "you" : "him");
    result.innerHTML = you ? HAND.you : HAND.him;
    $("gxFateText").hidden = true;
    $("gxFateEnd").hidden = g.phase === "wheel";
  }

  function tx(node, fn) {
    const { runTransaction } = session.f;
    return session.tail = session.tail.then(() => runTransaction(node, (cur) => {
      if (session.disposed) return;
      return fn(cur);
    })).catch((err) => {
      console.warn("遊戲寫入失敗", (err && (err.code || err.message)) || err);
    });
  }

  function open(f, roomId, subs, alive) {
    close();
    const { db, ref, onValue, runTransaction } = f;
    const still = typeof alive === "function" ? alive : () => true;
    const ooxxRef = ref(db, `rooms/${roomId}/games/ooxx`);
    const wheelRef = ref(db, `rooms/${roomId}/games/wheel`);
    const winsRef = ref(db, `rooms/${roomId}/ooxxWins`);
    session = { f, ooxx: null, wheel: null, disposed: false, tail: Promise.resolve(), ooxxRef, wheelRef, winsRef, alive: still };
    const off1 = onValue(ooxxRef, (snap) => {
      if (!session || session.disposed) return;
      session.ooxx = viewOoxx(snap.val());
      maybePlan("ooxx");
      render();
    });
    const off2 = onValue(wheelRef, (snap) => {
      if (!session || session.disposed) return;
      session.wheel = viewWheel(snap.val());
      maybePlan("wheel");
      render();
    });
    const off3 = onValue(winsRef, (snap) => {
      const wins = viewWins(snap.val());
      const hit = wins.m > winsSeen.m ? "m" : wins.f > winsSeen.f ? "f" : "";
      winsSeen = wins;
      paintSeals(wins, hit);
    });
    subs.push(off1, off2, off3);
    paintSeals(viewWins(null));
  }

  function maybePlan(kind) {
    const me = side();
    if (!session || !me || arming) return;
    const g = kind === "ooxx" ? session.ooxx : session.wheel;
    const need = kind === "ooxx" ? needsOoxxPlan(g, me) : needsWheelPlan(g, me);
    if (!need) return;
    arming = true;
    const plan = planSpin();
    const node = kind === "ooxx" ? session.ooxxRef : session.wheelRef;
    tx(node, (cur) => {
      const view = kind === "ooxx" ? viewOoxx(cur) : viewWheel(cur);
      if (!view || !(kind === "ooxx" ? needsOoxxPlan(view, me) : needsWheelPlan(view, me))) return;
      return kind === "ooxx" ? withOoxxPlan(view, plan) : withWheelPlan(view, plan);
    }).finally(() => { arming = false; });
  }

  function requireSide() {
    const me = side();
    if (!me) { toast("請先在標題列綁定麥或辛"); return ""; }
    return me;
  }

  function startOoxx() {
    const me = requireSide();
    if (!me || !session) return;
    if (session.ooxx && session.ooxx.phase !== "over" && session.ooxx.phase !== "rebuff" && session.ooxx.phase !== "nope") {
      toast("這一局還沒結束"); return;
    }
    const rec = createOoxx(me, gid(), Date.now());
    tx(session.ooxxRef, () => rec);
  }
  function startFate() {
    const me = requireSide();
    if (!me || !session) return;
    if (session.wheel && session.wheel.phase !== "over" && session.wheel.phase !== "rebuff" && session.wheel.phase !== "nope") {
      toast("這一輪還沒結束"); return;
    }
    veil($("gxAsk"), true);
    $("gxTopic").value = "";
    $("gxTopic").focus();
  }

  function bind() {
    $("zooOoxx")?.addEventListener("click", (e) => { e.stopPropagation(); startOoxx(); });
    $("zooFate")?.addEventListener("click", (e) => { e.stopPropagation(); startFate(); });
    $("gxReject")?.addEventListener("click", () => { if (session) tx(session.ooxxRef, () => null); });
    $("gxAccept")?.addEventListener("click", () => {
      const me = side(); if (!session || !me) return;
      tx(session.ooxxRef, (cur) => acceptInvite(cur, me));
    });
    $("gxTopicSend")?.addEventListener("click", sendTopic);
    $("gxTopic")?.addEventListener("keydown", (e) => { if (e.key === "Enter") sendTopic(); });
    $("gxFateNo")?.addEventListener("click", () => {
      if (!session) return;
      tx(session.wheelRef, (cur) => {
        const g = viewWheel(cur);
        if (!g || g.phase !== "invite") return;
        return packWheel({ ...g, phase: "nope" });
      });
    });
    $("gxFateYes")?.addEventListener("click", () => {
      const me = side(); if (!session || !me) return;
      tx(session.wheelRef, (cur) => acceptWheel(cur, me));
    });
    $("gxFateNopeOk")?.addEventListener("click", () => { if (session) tx(session.wheelRef, () => null); });
    $("gxBoard")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".c-gx-cell");
      if (!btn || btn.disabled || !session) return;
      const me = side();
      const index = Number(btn.dataset.i);
      let won = "";
      tx(session.ooxxRef, (cur) => {
        const next = applyMove(cur, me, index);
        if (next && next.phase === "over" && next.winner === me && (!cur || cur.phase !== "over")) won = me;
        return next;
      }).then(() => {
        if (won && session) tx(session.winsRef, (cur) => addWin(cur, won));
      });
    });
    $("gxAgain")?.addEventListener("click", () => ask("ooxx"));
    $("gxClose")?.addEventListener("click", () => {
      if (session && session.ooxx) closed.ooxx = session.ooxx.id;
      veil($("gxGame"), false);
    });
    $("gxFateAgain")?.addEventListener("click", () => ask("wheel"));
    $("gxFateClose")?.addEventListener("click", () => {
      if (session && session.wheel) closed.wheel = session.wheel.id;
      veil($("gxFateWheel"), false);
    });
    $("gxRematchYes")?.addEventListener("click", () => replyRematch(true));
    $("gxRematchNo")?.addEventListener("click", () => replyRematch(false));
    $("gxRebuffOk")?.addEventListener("click", () => {
      const me = side(); if (!session || !me) return;
      const kind = session.wheel && session.wheel.phase === "rebuff" && session.wheel.rematchBy === me ? "wheel" : "ooxx";
      const node = kind === "wheel" ? session.wheelRef : session.ooxxRef;
      tx(node, (cur) => dismissRebuff(cur, me, kind));
    });
  }

  function sendTopic() {
    const me = side();
    if (!session || !me) return;
    const topic = ($("gxTopic").value || "").trim();
    if (!topic) return;
    veil($("gxAsk"), false);
    tx(session.wheelRef, () => createWheel(me, gid(), topic, Date.now()));
  }
  function ask(kind) {
    const me = side(); if (!session || !me) return;
    const node = kind === "wheel" ? session.wheelRef : session.ooxxRef;
    tx(node, (cur) => askRematch(cur, me, kind));
  }
  function replyRematch(yes) {
    const me = side(); if (!session || !me) return;
    const kind = session.wheel && session.wheel.phase === "rematch" ? "wheel" : "ooxx";
    const node = kind === "wheel" ? session.wheelRef : session.ooxxRef;
    tx(node, (cur) => yes ? agreeRematch(cur, me, kind) : rebuffRematch(cur, me, kind));
  }

  function close() {
    stopSpin();
    if (session) session.disposed = true;
    session = null;
    hideAll();
    paintSeals(viewWins(null));
    winsSeen = { m: 0, f: 0 };
  }

  bind();
  return { open, close };
}
