/* ============================================================
 *  functions 的處理函式冒煙測試
 *
 *  ⚠️ 這支測試存在的理由：
 *     v24 那次只驗了「觸發器有沒有註冊對」（region / instance / ref / eventType），
 *     全部綠燈、部署成功、觸發也成功 —— 但**每一次真的收到訊息都當場炸掉**：
 *
 *       TypeError: Cannot read properties of undefined (reading 'length')
 *       TypeError: admin.database is not a function
 *
 *     原因是 firebase-admin 13 版起拿掉了 admin.xxx() 命名空間 API，
 *     而我把 12 升到 14 卻沒改寫法。這種 bug 只有「真的跑一次處理函式」才抓得到。
 *
 *  做法：在 require index.js 之前，先把 firebase-admin 的兩個子模組與 web-push
 *  塞進 require 快取換成假的，然後用 firebase-functions v2 的 .run() 直接跑處理函式。
 * ============================================================ */

import { createRequire } from "module";
import assert from "assert";

const require = createRequire(import.meta.url);
const Module = require("module");

let pass = 0, fail = 0;
const check = (n, ok, extra = "") => {
  console.log(`${ok ? "✅" : "❌"} ${n}${extra && !ok ? "  →  " + extra : ""}`);
  ok ? pass++ : fail++;
};

/* ---------- 假的資料庫 ---------- */
const DB = {
  "rooms/RID/push": {
    ME:   { ep: "https://push.example/ME",   k: "k".repeat(87), a: "a".repeat(22) },
    PEER: { ep: "https://push.example/PEER", k: "k".repeat(87), a: "a".repeat(22) },
    GONE: { ep: "https://push.example/GONE", k: "k".repeat(87), a: "a".repeat(22) },
  },
  "rooms/RID/p": {
    ME:   { at: Date.now() },                 // 人就在房裡 → 不該推
    PEER: { at: Date.now() - 5 * 60 * 1000 }, // 五分鐘沒更新 → 該推
    GONE: { at: Date.now() - 5 * 60 * 1000 },
  },
  /* 位置推播的訂閱（v42）。locpush/<用 admin 密碼推導的位址>/<裝置代號>。
     ⚠️ 刻意放兩個不同的「位址」—— 函式應該不管位址是什麼，全部都送。 */
  "locpush": {
    SECRET1: {
      PHONE: { ep: "https://push.example/PHONE", k: "k".repeat(87), a: "a".repeat(22), on: true },
      OFF:   { ep: "https://push.example/OFF",   k: "k".repeat(87), a: "a".repeat(22), on: false },
    },
    SECRET2: {
      LAPTOP: { ep: "https://push.example/LAPTOP", k: "k".repeat(87), a: "a".repeat(22) },
      DEAD:   { ep: "https://push.example/GONE",   k: "k".repeat(87), a: "a".repeat(22), on: true },
    },
  },
};

/* 假的 DataSnapshot。
   ⚠️ forEach 一定要照真的 Firebase 來：**回呼回傳真值就中止列舉**。
      模擬層比真實環境寬鬆，是這個專案的第 2 號坑 —— 寫成 Array.forEach 的話，
      index.js 裡 `snap.forEach((c) => raw.push(c))` 這種寫法在測試會一路綠燈、
      上線卻只拿得到第一筆。 */
const snapOf = (key, val) => ({
  key,
  val: () => (val === undefined ? null : val),
  exists: () => val !== null && val !== undefined,
  forEach(cb) {
    if (!val || typeof val !== "object") return false;
    for (const k of Object.keys(val)) if (cb(snapOf(k, val[k]))) return true;
    return false;
  },
});
const removed = [];
const cooldownWrites = [];
let lastCooldownWrite = null;
const fakeDb = {
  ref: (path) => ({
    get: async () => snapOf(path.split("/").pop(), path in DB ? DB[path] : null),
    /* ⚠️ remove 一定要「真的刪掉」，不能只記一筆（v29 改）。
          只記不刪的話，被判定失效而移除的訂閱下一輪還在清單裡，
          「殭屍節點」與「冷卻」兩件事就都測不出真正的行為。 */
    remove: async () => {
      removed.push(path);
      const m = path.match(/^(rooms\/\w+\/push)\/(\w+)$/);
      if (m && DB[m[1]]) delete DB[m[1]][m[2]];
      // 位置推播的訂閱是 locpush/<位址>/<裝置>，一樣要真的刪掉
      const L = path.match(/^locpush\/(\w+)\/(\w+)$/);
      if (L && DB.locpush && DB.locpush[L[1]]) delete DB.locpush[L[1]][L[2]];
    },
    /* 冷卻時間戳是寫在 push/<裝置>/lo 這個子路徑上的，
       假資料庫要把它寫回 DB，不然「冷卻中不要再送」那條測不出來。 */
    set: async (v) => {
      cooldownWrites.push(path);
      lastCooldownWrite = { path, v };
      const m = path.match(/^(rooms\/\w+\/push)\/(\w+)\/(\w+)$/);
      if (m && DB[m[1]] && DB[m[1]][m[2]]) DB[m[1]][m[2]][m[3]] = v;
      const L = path.match(/^locpush\/(\w+)\/(\w+)\/(\w+)$/);
      if (L && DB.locpush && DB.locpush[L[1]] && DB.locpush[L[1]][L[2]]) {
        DB.locpush[L[1]][L[2]][L[3]] = v;
      }
    },
  }),
};

/* ---------- 假的 web-push ---------- */
const sent = [];
let vapidSet = null;
const fakeWebPush = {
  setVapidDetails: (sub, pub, priv) => { vapidSet = { sub, pub, priv }; },
  sendNotification: async (sub, payload) => {
    sent.push({ endpoint: sub.endpoint, payload, keys: sub.keys });
    if (sub.endpoint.endsWith("/GONE")) {
      const e = new Error("gone"); e.statusCode = 410; throw e;
    }
    return { statusCode: 201 };
  },
};

/* ---------- 把假的塞進 require 快取 ---------- */
let initCalls = 0;
const stub = (id, exports) => {
  const resolved = (() => { try { return require.resolve(id); } catch (_) { return id; } })();
  const m = new Module(resolved);
  m.exports = exports;
  m.loaded = true;
  require.cache[resolved] = m;
  return resolved;
};
/* ⚠️ firebase-admin **不可以整包換成假的**。
   第一版就是把 app／database 兩個模組都 stub 掉，結果測試全綠、雲端照樣炸：
     Error: The default Firebase app does not exist.
   假的登錄表永遠找得到 app，真的那張表才會出問題 —— 這是本專案的第 2 號坑（模擬層比真實環境寬鬆）。
   → 只把 `getDatabase` 這一個函式換掉（讓它不要真的連線），
     `initializeApp` / `getApps` 一律用真的，這樣「app 到底註冊成功了沒」才測得到。 */
const realApp = require("firebase-admin/app");
const realDbMod = require("firebase-admin/database");
const origGetDatabase = realDbMod.getDatabase;
let getDatabaseArgs = null;
realDbMod.getDatabase = (app) => { getDatabaseArgs = app; initCalls++; return fakeDb; };
stub("web-push", fakeWebPush);

/* 雲端會由執行環境注入這個變數，本機要自己給，不然 initializeApp 會缺 databaseURL */
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "daily-notes-7bb64",
  databaseURL: "https://daily-notes-7bb64-default-rtdb.asia-southeast1.firebasedatabase.app",
});
process.env.GCLOUD_PROJECT = "daily-notes-7bb64";

process.env.VAPID_PUBLIC = "PUB";
process.env.VAPID_PRIVATE = "PRIV";
process.env.VAPID_SUBJECT = "mailto:test@example.com";

const fn = require("./index.js");

/* ══════════ A. 匯出與觸發器 ══════════ */
check("匯出 notifyNewMessage", typeof fn.notifyNewMessage === "function");
const ep = fn.notifyNewMessage.__endpoint;
check("是背景觸發器不是 HTTPS", !!ep.eventTrigger && !ep.httpsTrigger);
check("區域是 asia-southeast1", JSON.stringify(ep.region) === '["asia-southeast1"]');

/* ══════════ B. ★ 真的把處理函式跑一次 ══════════ */
const event = {
  params: { roomId: "RID", msgId: "MID" },
  data: { val: () => ({ s: "ME", t: Date.now(), iv: "iv", c: "cipher" }) },
};

let threw = null;
try {
  await fn.notifyNewMessage.run(event);
} catch (err) {
  threw = err;
}
check("★ 處理函式跑得完，沒有丟例外", !threw, threw && `${threw.name}: ${threw.message}`);
check("★ 有取得資料庫（真的走過 initializeApp / getApps）", initCalls >= 1, String(initCalls));
/* ★ 這一項是這次 bug 的核心：一定要「把 app 明確傳進去」，
   不可以靠 getDatabase() 自己去查預設 app —— 雲端查不到就整支掛掉。 */
check("★ getDatabase 有拿到明確的 app 物件（不是靠預設 app 查表）",
      !!getDatabaseArgs && typeof getDatabaseArgs === "object" && "name" in getDatabaseArgs,
      getDatabaseArgs === null ? "沒有傳 app 進去" : typeof getDatabaseArgs);
check("★ 真的註冊了一個 app（用真的 getApps 查）", realApp.getApps().length >= 1,
      String(realApp.getApps().length));
check("有設定 VAPID", !!vapidSet && vapidSet.pub === "PUB");

/* ══════════ C. 推給誰、不推給誰 ══════════ */
const eps = sent.map((s) => s.endpoint.split("/").pop()).sort();
check("★ 不推給發訊者自己（ME）", !eps.includes("ME"), JSON.stringify(eps));
check("★ 推給不在房裡的人（PEER）", eps.includes("PEER"), JSON.stringify(eps));
check("★ 失效的訂閱（410）會被就地刪掉",
      removed.includes("rooms/RID/push/GONE"), JSON.stringify(removed));
/* ★★★ v29：刪掉之後**不可以**再把冷卻時間戳寫回去。
   舊版是 .catch(...).then(...) 串起來的 —— catch 正常結束＝promise fulfilled，
   於是 then 照跑，把 push/<裝置>/lm 寫回去，那個節點就復活成一個只有 lm 的殘骸。
   ⚠️ 原本的註解說「規則會擋下來」，但 Cloud Function 走 Admin SDK，
      **完全不受資料庫規則約束** —— 它真的會被寫出來，而且永遠清不掉
      （沒有 ep/k/a → 下一輪直接跳過 → lm 也不再更新）。 */
check("★★★ 刪掉的訂閱不會被冷卻時間戳「寫回去」變成殭屍節點",
      !cooldownWrites.includes("rooms/RID/push/GONE/lm"), JSON.stringify(cooldownWrites));

/* ══════════ D. 通知內容裡不可以有房號或訊息 ══════════ */
const payload = sent[0] ? sent[0].payload : "";
check("★ payload 裡沒有房號", !payload.includes("RID"), payload);
check("★ payload 裡沒有密文", !payload.includes("cipher"), payload);
check("payload 是固定文字", payload.includes("Google") && payload.includes("新動態"), payload);

/* ══════════ D2. 新訊息推播的三分鐘冷卻（v28）══════════
   ⚠️ 這是使用者要的「不要一直跳通知」。通知文字固定是「有 1 項新動態」、
      不講幾則，所以少推幾次不會漏資訊 —— 打開 App 該看到的一則都不會少。 */
{
  check("★ 送出後有寫下訊息冷卻時間戳",
        typeof DB["rooms/RID/push"].PEER.lm === "number",
        JSON.stringify(cooldownWrites));

  // 剛剛才通知過 → 再來一則訊息不可以再吵
  sent.length = 0;
  await fn.notifyNewMessage.run(event);
  check("★★ 三分鐘內的第二則訊息不會再推（使用者要的：不要一直跳）",
        sent.length === 0, JSON.stringify(sent.map((x) => x.endpoint.split("/").pop())));

  // 才過一分鐘 → 還在冷卻
  DB["rooms/RID/push"].PEER.lm = Date.now() - 60 * 1000;
  sent.length = 0;
  await fn.notifyNewMessage.run(event);
  check("★ 才過 1 分鐘 → 還在冷卻，不送", sent.length === 0, String(sent.length));

  /* 冷卻過了 → 又會通知。
     ⚠️ 故意用 4 分鐘：有人把冷卻偷偷調長，這條就會變紅。 */
  DB["rooms/RID/push"].PEER.lm = Date.now() - 4 * 60 * 1000;
  sent.length = 0;
  await fn.notifyNewMessage.run(event);
  check("★★ 過了 4 分鐘 → 又會通知（等於釘死冷卻是 3 分鐘）",
        sent.map((x) => x.endpoint.split("/").pop()).includes("PEER"),
        JSON.stringify(sent.map((x) => x.endpoint.split("/").pop())));

  /* ⚠️ 訊息冷卻與上線冷卻一定要是「兩個欄位」——
        共用的話，剛收到「對方上線」就會把接下來三分鐘的訊息通知一起吃掉。 */
  const src0 = require("fs").readFileSync(new URL("./index.js", import.meta.url), "utf8");
  check("★★ 訊息冷卻用 lm，上線冷卻用 lo（兩個欄位，不共用）",
        /\/lm`\)/.test(src0) && /\/lo`\)/.test(src0));
  check("★ 冷卻設定是 3 分鐘",
        /MSG_COOLDOWN_MS\s*=\s*3 \* 60 \* 1000/.test(src0));

  DB["rooms/RID/push"].PEER.lm = 0;    // 還原，後面幾節不受影響
}

/* ══════════ E. 這間房沒人開推播時要早早收工 ══════════ */
{
  sent.length = 0;
  const saved = DB["rooms/RID/push"];
  DB["rooms/RID/push"] = null;
  await fn.notifyNewMessage.run(event);
  check("★ 沒人訂閱就不送任何東西", sent.length === 0, String(sent.length));
  DB["rooms/RID/push"] = saved;
}

/* ══════════ F. 原始碼不可以再出現 v12 的命名空間寫法 ══════════ */
{
  const src = require("fs").readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  check("★ 沒有 admin.database()（13 版起已移除）", !/admin\.database\s*\(/.test(code));
  check("★ 沒有 admin.apps（13 版起已移除）", !/admin\.apps/.test(code));
  check("★ 沒有無參數的 getDatabase()（雲端查不到預設 app）",
        !/getDatabase\(\s*\)/.test(code));
  check("★ 用的是 firebase-admin/database 子路徑",
        /require\(["']firebase-admin\/database["']\)/.test(code));
}

/* ══════════ G. 對方上線通知（v25）══════════
   ⚠️ 這一支的重點全在「不要轟炸」：
      在線狀態是進房建立、離開刪掉的，而手機切 App 就會退回偽裝首頁 ——
      沒有冷卻的話對方滑個手機你就收到十幾則。 */
{
  check("匯出 notifyPeerOnline", typeof fn.notifyPeerOnline === "function");
  const ep2 = fn.notifyPeerOnline.__endpoint;
  check("★ 監看的是在線狀態的「建立」",
        ep2.eventTrigger.eventFilterPathPatterns.ref === "rooms/{roomId}/p/{clientId}" &&
        ep2.eventTrigger.eventType.endsWith(".created"),
        JSON.stringify(ep2.eventTrigger.eventFilterPathPatterns));

  const onlineEvent = { params: { roomId: "RID", clientId: "PEER" } };
  const run = async () => {
    sent.length = 0;
    let e = null;
    try { await fn.notifyPeerOnline.run(onlineEvent); } catch (err) { e = err; }
    return { e, eps: sent.map((s) => s.endpoint.split("/").pop()).sort() };
  };

  // 沒人開這個開關 → 什麼都不送
  let r = await run();
  check("★ 沒開上線開關就不送", !r.e && r.eps.length === 0, JSON.stringify(r.eps));

  // ME 開了開關，但 ME 此刻人就在房裡（presence 新鮮）→ 不送
  DB["rooms/RID/push"].ME.on = true;
  r = await run();
  check("★ 自己也在房裡就不送（畫面上看得到綠點）", r.eps.length === 0, JSON.stringify(r.eps));

  // ME 離開房間（presence 變舊）→ 這次要送
  DB["rooms/RID/p"].ME = { at: Date.now() - 10 * 60 * 1000 };
  r = await run();
  check("★ 自己不在房裡 → 收到通知", r.eps.includes("ME"), JSON.stringify(r.eps));
  check("★ 不會通知剛上線的那台自己（PEER）", !r.eps.includes("PEER"), JSON.stringify(r.eps));
  check("★ 送出後有寫下冷卻時間戳",
        typeof DB["rooms/RID/push"].ME.lo === "number" || lastCooldownWrite !== null,
        JSON.stringify(cooldownWrites));

  // ★ 核心：冷卻期間內再上線一次，不可以再送
  DB["rooms/RID/push"].ME.lo = Date.now();
  r = await run();
  check("★★ 冷卻期間內再上線 → 不會再吵你（防轟炸）", r.eps.length === 0, JSON.stringify(r.eps));

  // 冷卻只過一半（5 分鐘前通知過）→ 還是不能送
  DB["rooms/RID/push"].ME.lo = Date.now() - 5 * 60 * 1000;
  r = await run();
  check("★ 才過 5 分鐘 → 還在冷卻，不送", r.eps.length === 0, JSON.stringify(r.eps));

  /* 冷卻過了 → 又會通知。
     ⚠️ 這裡故意用 11 分鐘：只要有人把冷卻偷偷調回 30 分鐘，這條就會變紅。 */
  DB["rooms/RID/push"].ME.lo = Date.now() - 11 * 60 * 1000;
  r = await run();
  check("★★ 過了 11 分鐘 → 又會通知（等於釘死冷卻是 10 分鐘）", r.eps.includes("ME"), JSON.stringify(r.eps));

  // 通知內容跟新訊息一模一樣（使用者選的：鎖定畫面上分不出差別）
  check("★ 上線通知的文字跟新訊息完全一樣",
        sent[0] && sent[0].payload.includes("有 1 項新動態"), sent[0] && sent[0].payload);
  check("★ payload 一樣沒有房號", !(sent[0] || {}).payload?.includes("RID"));

  // 冷卻時間必須是 10 分鐘，而且要從程式碼讀得出來
  const src2 = require("fs").readFileSync(new URL("./index.js", import.meta.url), "utf8");
  check("★ 冷卻設定是 10 分鐘", /ONLINE_COOLDOWN_MS\s*=\s*10 \* 60 \* 1000/.test(src2));
  // 註解裡的分鐘數不可以跟程式碼對不上（v22.2 的教訓：說明文字落後於實作）
  check("★ 註解沒有殘留舊的 30 分鐘", !/30 分鐘/.test(src2));
}

/* ══════════ E. 位置回報推播（v42）══════════ */
{
  check("匯出 notifyLocation", typeof fn.notifyLocation === "function");
  const lep = fn.notifyLocation.__endpoint;
  check("★ 觸發器掛在 loc/{locId} 上",
        (lep.eventTrigger?.eventFilterPathPatterns || {}).ref === "loc/{locId}",
        JSON.stringify(lep.eventTrigger));
  check("★ 是「新增」觸發，不是「更新」",
        String(lep.eventTrigger?.eventType || "").endsWith(".created"),
        String(lep.eventTrigger?.eventType));
  check("★ 跟資料庫同一區（asia-southeast1）", JSON.stringify(lep.region) === '["asia-southeast1"]');

  sent.length = 0; removed.length = 0; cooldownWrites.length = 0;

  let lthrew = null;
  try {
    await fn.notifyLocation.run({ params: { locId: "LID" }, data: { val: () => ({ t: 1, ek: "e", iv: "i", c: "c" }) } });
  } catch (err) { lthrew = err; }
  check("★★★ 處理函式跑得完，沒有丟例外", !lthrew, lthrew && `${lthrew.name}: ${lthrew.message}`);

  const eps = sent.map((x) => x.endpoint);
  check("★★★ 兩個不同位址底下的裝置都送到了（函式不管位址是什麼）",
        eps.some((e) => e.endsWith("/PHONE")) && eps.some((e) => e.endsWith("/LAPTOP")),
        JSON.stringify(eps));
  check("★★★ on: false 的裝置沒有被送（開關關著就是關著）",
        !eps.some((e) => e.endsWith("/OFF")), JSON.stringify(eps));

  /* ⚠️ 這是 sw.js 用來分辨「聊天 vs 位置」的唯一依據。
        欄位名改掉的話位置通知會安靜地退回聊天的文字 —— 不會壞，但功能等於沒生效。 */
  check("★★★ payload 就是 {\"k\":\"loc\"}，一個字都不多",
        sent[0] && sent[0].payload === JSON.stringify({ k: "loc" }), sent[0] && sent[0].payload);
  check("★★★ payload 裡沒有座標、沒有位址、沒有裝置代號",
        !sent.some((x) => /lat|lng|SECRET|PHONE|LAPTOP|LID/.test(x.payload)),
        JSON.stringify(sent.map((x) => x.payload)));

  check("★★★ 送不出去的（410）順手刪掉了",
        removed.some((p2) => p2 === "locpush/SECRET2/DEAD"), JSON.stringify(removed));
  check("★★ 而且真的從資料庫裡不見了", !(DB.locpush.SECRET2 || {}).DEAD);

  /* 使用者明確要求「不要冷卻」——寫了時間戳就等於偷偷加了冷卻 */
  check("★★★ 沒有寫任何冷卻時間戳（使用者要求不加冷卻）",
        !cooldownWrites.some((p2) => p2.startsWith("locpush/")), JSON.stringify(cooldownWrites));

  /* 連按兩次要響兩次 —— 這條是「不加冷卻」真正的驗收 */
  sent.length = 0;
  await fn.notifyLocation.run({ params: { locId: "LID2" }, data: { val: () => ({ t: 2 }) } });
  check("★★★ 連續兩筆回報 → 第二筆照樣送（沒有冷卻）", sent.length >= 2, String(sent.length));

  const src3 = require("fs").readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const locSection = src3.slice(src3.indexOf("exports.notifyLocation"));
  check("★★ 位置那一段沒有用到任何冷卻常數",
        !/COOLDOWN_MS/.test(locSection));
  check("★★ 記錄檔不寫位址或裝置代號（那個位址是密碼推導出來的）",
        !/logger\.[a-z]+\(`?[^`)]*\$\{?(idNode|devNode|t\.path)/.test(locSection));
}

console.log(`\n──────── ${pass} 過 / ${fail} 失敗 ────────`);
process.exit(fail ? 1 : 0);
