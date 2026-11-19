/* 打字狀態。只在打字的那台計算，送出去的是一個字母。
   注音／拼音組字只算「還在打」，不計入速度；字數以送出或刪掉的文字為準。 */

export const TYPING_LABELS = {
  d: ["打了又刪中", "又刪中", "又刪"],
  f: ["瘋狂輸入中", "狂打中", "狂打"],
  b: ["醞釀好久終於開口中", "終於開口", "開口"],
  l: ["認真寫長文中", "寫長文", "長文"],
  p: ["邊想邊打中", "邊想中", "邊想"],
  n: ["正在輸入中…", "輸入中…", "輸入…"],
};

const RANK = { d: 6, f: 5, b: 4, l: 3, p: 2, n: 1 };
const QUIET_MS = 8000;
const FRESH_MS = 5000;
const HOLD_MS = 1200;

export function typingCode(code) {
  return Object.prototype.hasOwnProperty.call(TYPING_LABELS, code) ? code : "n";
}

/* 由長到短挑第一句放得進欄位的。最短仍放不下時交回最短那句，交給省略號。 */
export function fitTypingText(variants, fits) {
  const list = variants && variants.length ? variants : TYPING_LABELS.n;
  for (const text of list) {
    if (fits(text)) return text;
  }
  return list[list.length - 1];
}

export function createTypingSense(now = 0) {
  let events = [];
  let lastAt = null;
  let quietSince = now;
  let sessionStart = null;
  let idleGap = 0;
  let draftLen = 0;
  let held = { code: "n", at: 0 };

  const begin = (t) => {
    if (lastAt == null || t - lastAt >= QUIET_MS) {
      idleGap = t - (lastAt == null ? quietSince : lastAt);
      sessionStart = t;
    }
    lastAt = t;
  };

  const edit = (evt) => {
    const t = Number(evt && evt.t) || 0;
    const draft = Number(evt && evt.draft);
    if (Number.isFinite(draft) && draft >= 0) draftLen = Math.floor(draft);
    const kind = evt && evt.kind;
    if (kind === "draft") return;
    begin(t);
    if (kind === "compose") return;
    const n = Math.max(0, Math.floor(Number(evt.n) || 0));
    if (!n) return;
    if (kind === "del") events.push({ t, add: 0, del: n, paste: false });
    else events.push({ t, add: n, del: 0, paste: kind === "paste" });
    const cut = t - 12000;
    if (events.length > 80) events = events.filter((e) => e.t >= cut);
  };

  const code = (now) => {
    if (lastAt == null || now - lastAt >= FRESH_MS) return "";
    const within = (ms) => events.filter((e) => now - e.t <= ms && now - e.t >= 0);
    const sum = (list, key) => list.reduce((n, e) => n + e[key], 0);
    const w8 = within(8000);
    const deleting = sum(w8, "del") >= 4 && w8.filter((e) => e.del > 0).length >= 3 && sum(w8, "add") >= 1;
    const w25 = within(2500);
    const typed = w25.filter((e) => e.add > 0 && !e.paste);
    const fast = sum(w25, "add") >= 8 && typed.length >= 2 && sum(typed, "add") >= 8;
    const sessionAge = sessionStart == null ? 0 : now - sessionStart;
    const brew = idleGap >= 60000 && sessionAge <= 5000 && draftLen >= 1;
    const long = draftLen >= 36 || (sessionAge >= 18000 && draftLen >= 12);
    const adds = within(12000).filter((e) => e.add > 0).sort((a, b) => a.t - b.t);
    let bursts = 0;
    let last = null;
    let paused = false;
    for (const e of adds) {
      if (last == null || e.t - last >= 800) {
        if (last != null && e.t - last >= 1500 && e.t - last <= 10000) paused = true;
        bursts += 1;
      }
      last = e.t;
    }
    const pause = bursts >= 2 && paused && sum(adds, "add") >= 2;

    let next = "n";
    if (pause) next = "p";
    if (long) next = "l";
    if (brew) next = "b";
    if (fast) next = "f";
    if (deleting) next = "d";

    if (next === held.code) held.at = now;
    else if (RANK[next] < RANK[held.code] && now - held.at < HOLD_MS) return held.code;
    else held = { code: next, at: now };
    return next;
  };

  const reset = (now) => {
    events = [];
    lastAt = null;
    quietSince = Number(now) || 0;
    sessionStart = null;
    idleGap = 0;
    draftLen = 0;
    held = { code: "n", at: 0 };
  };

  return { edit, code, reset };
}
