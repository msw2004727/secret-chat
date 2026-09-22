/* ============================================================
 *  秘密聊天 — 新訊息推播
 *
 *  只做一件事：rooms/<房號>/m 有新訊息時，通知「此刻不在房裡」的裝置。
 *
 *  ⚠️ 這支程式「看不到訊息內容」。
 *     訊息是端對端加密的，這裡拿到的只有密文，所以通知永遠是同一句固定文字。
 *     這不是偷懶，是設計上的必然 —— 伺服器能讀懂內容的話，端對端就不成立了。
 *
 *  ⚠️ 一定要跟資料庫同一個區域（asia-southeast1）。
 *     不同區的話每一則訊息都要跨區跑一趟，延遲會多好幾百毫秒。
 * ============================================================ */

const { onValueCreated } = require("firebase-functions/v2/database");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

/* ⚠️ firebase-admin 與 web-push 刻意「不在這裡 require」。
 *
 *    部署的時候，CLI 會先把這個檔案整個載入一次，只為了讀出「有哪些函式、
 *    各自是什麼觸發器」（畫面上那句 Serving at port ....）。這個步驟**只有 10 秒**，
 *    超過就是 `Cannot determine backend specification. Timeout after 10000`。
 *
 *    node_modules 剛裝好還沒進作業系統快取時（Windows 有防毒即時掃描更明顯），
 *    光是載入這兩包就可能吃掉大半時間。搬進函式裡之後，
 *    部署掃描階段只需要載入 firebase-functions 本身，順便讓冷啟動也快一點。
 *
 *    ⚠️ 但逾時最常見的兇手其實不在這個檔案裡：CLI 在掃描的同時會另外開一支
 *       cmd.exe 去問 npm「firebase-functions 有沒有新版」，那支卡住的話
 *       一樣會拖垮整個掃描（firebase-tools #9502，Windows 上特別容易）。
 *       所以逾時的時候先確認 `npm view firebase-functions version` 秒回，
 *       再加大掃描時限重跑：
 *         PowerShell:  $env:FUNCTIONS_DISCOVERY_TIMEOUT=120
 */
/* ⚠️ firebase-admin 從 13 版起「拿掉了 admin.xxx() 這種命名空間 API」。
 *    v12 的寫法（admin.apps / admin.database()）在 14 版上會直接丟：
 *      TypeError: Cannot read properties of undefined (reading 'length')
 *      TypeError: admin.database is not a function
 *    而且**部署得起來、觸發得到、只有真的收到訊息時才炸**——
 *    所以只驗「觸發器有沒有註冊對」是抓不到的，一定要真的跑一次處理函式。
 *    正確寫法是模組化的子路徑匯入： */
let webpush = null;

/* ⚠️ 這裡刻意「每次都重新查一次 app」，不做快取。
 *
 *    快取版（appReady 旗標 + getDatabase()）在雲端會炸：
 *      Error: The default Firebase app does not exist.
 *              Make sure you call initializeApp() before using any of the Firebase services.
 *
 *    原因是「預設 app」是存在模組層的登錄表裡的，而那張表在雲端不一定跟我們想的一樣 ——
 *    同一個容器重複使用時，前一次呼叫設好的旗標可能已經對不上現在的登錄表。
 *
 *    所以改成兩件事：
 *      ① `getApps()[0] || initializeApp()` —— 冪等而且會自己修好
 *      ② **把 app 明確傳進 getDatabase(app)**，完全不靠「預設 app」查表
 *    require 本身有快取，每次呼叫的成本可以忽略。 */
function getDb() {
  const { initializeApp, getApps } = require("firebase-admin/app");
  const { getDatabase } = require("firebase-admin/database");
  const app = getApps()[0] || initializeApp();
  return getDatabase(app);
}

function loadDeps() {
  if (!webpush) webpush = require("web-push");
}

const REGION = "asia-southeast1";
const INSTANCE = "daily-notes-7bb64-default-rtdb";

setGlobalOptions({
  region: REGION,
  maxInstances: 3,        // 兩個人聊天不需要更多，順便當帳單保險
  memory: "256MiB",
  timeoutSeconds: 30,
});

/* 通知文字。
   ⚠️ 標題在 iPhone 上其實會被 App 名稱蓋掉（主畫面圖示底下那個名字），
      所以真正有自由度的只有 body。 */
const TITLE = "Google";
const BODY = "有 1 項新動態";

/* 在線判定要比「有沒有 p/<裝置>」再寬一點：
   presence 是靠 onDisconnect 清的，網路斷得不乾淨時會留下殘影。
   超過這個秒數沒更新就當作人不在，該推還是要推。
   ⚠️ 這個數字必須跟 app.js 的同名常數一致。
      不一致的話畫面說「不在線」、這裡卻認為「人在房裡」而不推播，
      或是反過來明明在看螢幕還一直收到通知 —— 而且不會有任何錯誤訊息。
      test-v25 會直接比對兩份原始碼，對不上就變紅。 */
const PRESENCE_FRESH_MS = 90 * 1000;

/* 新訊息推播的冷卻時間（v28）。
   ⚠️ 這是「每台收件裝置最多每 3 分鐘被通知一次」，不是「合併訊息」——
      通知文字本來就是固定的「有 1 項新動態」，不講幾則，
      所以少推幾次不會漏資訊，打開 App 該看到的一則都不會少。
   ⚠️ 記在 push/<裝置>/lm，跟上線通知的 lo 分開。
      共用一個欄位的話，剛收到「對方上線」就會把接下來三分鐘的訊息通知一起吃掉。
   ⚠️ 人在房裡而被跳過時「不可以」寫這個時間戳 ——
      在房裡本來就不該推，不該因此吃掉冷卻額度。 */
const MSG_COOLDOWN_MS = 3 * 60 * 1000;

/* 「對方上線」通知的冷卻時間。
   ⚠️ 這個東西沒有冷卻就是災難：在線狀態是「進房建立、離開刪掉」的，
      而手機切 App 會退回偽裝首頁（那是刻意的偽裝設計）——
      對方在捷運上滑個十分鐘，節點會被建立十幾次。
      照字面實作＝十幾則通知，不只煩，還會讓鎖定畫面一直冒東西，反而傷偽裝。
   ⚠️ 實作方式是「每台收件裝置最多每 10 分鐘被通知一次」（記在 push/<裝置>/lo），
      不是「對方離線滿 10 分鐘」—— 後者要在斷線時多寫一筆時間戳，
      而 onDisconnect 的時機本來就不可靠。前者簡單、而且防轟炸的效果一樣。 */
const ONLINE_COOLDOWN_MS = 10 * 60 * 1000;

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  const sub = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) {
    logger.error("functions/.env 少了 VAPID_PUBLIC 或 VAPID_PRIVATE，推播不會送出");
    return false;
  }
  webpush.setVapidDetails(sub, pub, priv);
  vapidReady = true;
  return true;
}

exports.notifyNewMessage = onValueCreated(
  { ref: "/rooms/{roomId}/m/{msgId}", instance: INSTANCE },
  async (event) => {
    loadDeps();                       // ⚠️ 一定要在 ensureVapid 之前 —— 它會用到 webpush
    if (!ensureVapid()) return;

    const roomId = event.params.roomId;
    const msg = event.data.val() || {};
    const sender = typeof msg.s === "string" ? msg.s : "";

    let db;
    try {
      db = getDb();
    } catch (err) {
      // 講清楚是哪一關掛掉，不要只留一段看不懂的堆疊
      logger.error("firebase-admin 初始化失敗，推播無法送出", err);
      return;
    }
    const base = `rooms/${roomId}`;

    let subsSnap, presSnap;
    try {
      [subsSnap, presSnap] = await Promise.all([
        db.ref(`${base}/push`).get(),
        db.ref(`${base}/p`).get(),
      ]);
    } catch (err) {
      logger.error("讀取訂閱或在線狀態失敗", err);
      return;
    }

    const subs = subsSnap.val() || {};
    const ids = Object.keys(subs);

    const presence = presSnap.val() || {};
    const now = Date.now();

    /* 為什麼沒推出去，一定要看得出來。
       ⚠️ 這兩條路徑本來都是「安靜 return」，結果就是雲端一片乾淨、
          使用者說收不到、而我完全沒有線索。沉默的失敗最難查。
       ⚠️ 但**絕對不可以記房號**：房號是密碼推導出來的位址，
          規則只要求 auth != null，位址等於半把鑰匙。只記數量與原因。 */
    let skipSelf = 0, skipHere = 0, skipCool = 0, skipOff = 0;
    const targets = ids.filter((cid) => {
      // ① 不要推給發訊者自己
      if (cid === sender) { skipSelf++; return false; }
      /* ② 這台裝置把「新訊息推播」關掉了（v52）。
         ⚠️⚠️ 一定要寫成 `!== false`，不可以寫成 `=== true`。
            v52 之前「這筆記錄存在」本身就代表新訊息推播是開的，所以
            **既有的訂閱通通沒有 nm 這個欄位**。寫成 `=== true` 的話，
            升級的那一刻全世界的舊訂閱會一起變成「關著」——
            使用者什麼都沒動，推播就整個停掉，而且雲端一片乾淨查不出原因。
         ⚠️ 上線通知（notifyPeerOnline）讀的是另一個旗標 `on`，兩者互不影響：
            v52 起只要兩個旗標有一個開著，這筆記錄就會留著。 */
      if (subs[cid] && subs[cid].nm === false) { skipOff++; return false; }
      // ③ 人此刻就在房裡就不推 —— 不然聊天聊到一半通知會一直跳
      const at = presence[cid] && presence[cid].at;
      if (typeof at === "number" && now - at < PRESENCE_FRESH_MS) { skipHere++; return false; }
      // ④ 三分鐘內已經通知過這台裝置就不再吵（v28）
      const last = subs[cid] && subs[cid].lm;
      if (typeof last === "number" && now - last < MSG_COOLDOWN_MS) { skipCool++; return false; }
      return true;
    });

    logger.info(
      `訂閱 ${ids.length} 筆 · 在線紀錄 ${Object.keys(presence).length} 筆 · ` +
      `跳過(自己) ${skipSelf} · 跳過(沒開新訊息) ${skipOff} · ` +
      `跳過(人在房裡) ${skipHere} · ` +
      `跳過(冷卻中) ${skipCool} · 實際要推 ${targets.length}`
    );

    if (!ids.length) {
      logger.info("這間房沒有任何裝置開推播 —— 檢查設定面板的開關是不是真的開著");
      return;
    }
    if (!targets.length) return;

    /* payload 刻意「什麼都不放」。
       ⚠️ 絕對不要把房號放進去 —— payload 雖然是加密傳輸的，
          但它會落在對方裝置的 Service Worker 裡，多一份不必要的痕跡。
          通知文字寫死在 sw.js，這裡只負責觸發。 */
    const payload = JSON.stringify({ t: TITLE, b: BODY });

    let gone = 0;
    const results = await Promise.allSettled(targets.map(async (cid) => {
      const s = subs[cid];
      if (!s || !s.ep || !s.k || !s.a) return "skip";
      try {
        await webpush.sendNotification(
          { endpoint: s.ep, keys: { p256dh: s.k, auth: s.a } },
          payload,
          { TTL: 3600, urgency: "high" }
        );
      } catch (err) {
        const code = err && err.statusCode;
        /* 404 / 410 = 這個訂閱已經死了（使用者移除了主畫面圖示、清了瀏覽器資料…）。
           ⚠️ 一定要順手刪掉，不然死掉的訂閱會永遠留在資料庫裡，每則訊息都白試一次。
           ⚠️ 刪完一定要**直接結束**，不可以往下走到寫 lm 那一步（v29 修）。
              舊版是 .catch(...).then(...) 串起來的，catch 正常結束＝promise 變成
              fulfilled，於是 then 照跑，把 push/<裝置>/lm 寫回去 ——
              那個節點就復活成一個只有 lm 的殘骸。原本的註解說「規則會擋下來」，
              但 Cloud Function 走的是 Admin SDK，**完全不受資料庫規則約束**，
              所以它真的會被寫出來，而且永遠不會再被清掉
              （沒有 ep/k/a → 下一輪直接跳過 → lm 也不再更新），
              還會讓「成功送出 N 則」從此多算一台。
           ⚠️ 記錄檔不寫 cid ——「只記數量與原因」，裝置代號是跨房間共用的識別碼。 */
        if (code === 404 || code === 410) { gone++; await db.ref(`${base}/push/${cid}`).remove().catch(() => {}); return "gone"; }
        throw err;
      }
      /* ⚠️ 冷卻時間戳一定要「送出之後」才寫。
            先寫的話，送失敗也會被記成已通知，等於白白吃掉三分鐘。 */
      await db.ref(`${base}/push/${cid}/lm`).set(now).catch(() => {});
      return "sent";
    }));

    if (gone) logger.info(`清掉 ${gone} 筆失效訂閱`);
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = results.filter((r) => r.status === "fulfilled" && r.value === "sent").length;
    if (failed) {
      const why = results.filter((r) => r.status === "rejected")
        .map((r) => `${r.reason && r.reason.statusCode || "?"} ${r.reason && r.reason.message || r.reason}`)
        .slice(0, 3).join(" | ");
      logger.warn(`${targets.length} 台裝置中有 ${failed} 台推播失敗：${why}`);
    }
    if (ok) logger.info(`成功送出 ${ok} 則推播`);
  }
);


/* ============================================================
 *  對方上線通知（v25）
 *
 *  觸發點是 rooms/<房號>/p/<裝置> 被「建立」的那一刻。
 *
 *  ⚠️ 只在「建立」時觸發，不是每次更新 —— 這一點剛好跟前端的
 *     45 秒在線心跳相容：心跳是 set 既有節點（更新），不會再觸發一次。
 *     哪天有人把心跳改成先刪再寫，這裡就會變成每 45 秒一則通知。
 *
 *  ⚠️ 通知文字跟新訊息「完全一樣」（使用者的選擇）。
 *     鎖定畫面上分不出差別 = 偽裝最安全，代價是你得點進去才知道是哪一種。
 * ============================================================ */
exports.notifyPeerOnline = onValueCreated(
  { ref: "/rooms/{roomId}/p/{clientId}", instance: INSTANCE },
  async (event) => {
    loadDeps();
    if (!ensureVapid()) return;

    const roomId = event.params.roomId;
    const who = event.params.clientId;        // 剛上線的是這台

    let db;
    try {
      db = getDb();
    } catch (err) {
      logger.error("firebase-admin 初始化失敗，上線通知無法送出", err);
      return;
    }
    const base = `rooms/${roomId}`;

    let subsSnap, presSnap;
    try {
      [subsSnap, presSnap] = await Promise.all([
        db.ref(`${base}/push`).get(),
        db.ref(`${base}/p`).get(),
      ]);
    } catch (err) {
      logger.error("讀取訂閱或在線狀態失敗（上線通知）", err);
      return;
    }

    const subs = subsSnap.val() || {};
    const presence = presSnap.val() || {};
    const now = Date.now();

    let skipSelf = 0, skipOff = 0, skipHere = 0, skipCool = 0;
    const targets = Object.keys(subs).filter((cid) => {
      // ① 不要通知剛上線的那台自己
      if (cid === who) { skipSelf++; return false; }
      // ② 沒開這個開關的不要吵
      if (subs[cid].on !== true) { skipOff++; return false; }
      // ③ 自己也在房裡的話，畫面上就看得到綠點了，不用推
      const at = presence[cid] && presence[cid].at;
      if (typeof at === "number" && now - at < PRESENCE_FRESH_MS) { skipHere++; return false; }
      // ④ 冷卻中
      const last = Number(subs[cid].lo) || 0;
      if (now - last < ONLINE_COOLDOWN_MS) { skipCool++; return false; }
      return true;
    });

    logger.info(
      `[上線] 訂閱 ${Object.keys(subs).length} 筆 · 跳過(自己) ${skipSelf} · ` +
      `跳過(沒開) ${skipOff} · 跳過(人在房裡) ${skipHere} · 跳過(冷卻中) ${skipCool} · ` +
      `實際要推 ${targets.length}`
    );
    if (!targets.length) return;

    const payload = JSON.stringify({ t: TITLE, b: BODY });

    const results = await Promise.allSettled(targets.map(async (cid) => {
      const s = subs[cid];
      if (!s || !s.ep || !s.k || !s.a) return;
      try {
        await webpush.sendNotification(
          { endpoint: s.ep, keys: { p256dh: s.k, auth: s.a } },
          payload,
          { TTL: 1800, urgency: "normal" }
        );
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          await db.ref(`${base}/push/${cid}`).remove().catch(() => {});
          logger.info("清掉 1 筆失效訂閱");
          return;
        }
        throw err;
      }
      /* ⚠️ 冷卻時間戳一定要「送出之後」才寫。
            先寫的話，送失敗也會被記成已通知，等於白白吃掉一整個冷卻期。 */
      await db.ref(`${base}/push/${cid}/lo`).set(now).catch(() => {});
    }));

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) logger.warn(`[上線] ${targets.length} 台中有 ${failed} 台失敗`);
    else logger.info(`[上線] 成功送出 ${targets.length} 則`);
  }
);


/* ══════════════════════════════════════════════════════════════
 *  位置回報推播（v42）
 *
 *  loc/ 底下多一筆就通知「訂了位置推播的裝置」。
 *
 *  ⚠️ 跟訊息推播的差別，三個都是使用者明確要求的：
 *      ‧ 通知文字不同 → payload 帶 k:"loc"，文字本身還是寫死在 sw.js
 *      ‧ tag 不同     → 兩則並排，不互相覆蓋
 *      ‧ **沒有冷卻** → 對方按幾次就響幾次
 *
 *  ⚠️ 沒有冷卻的代價：站上沒有 App Check，任何匿名登入的人都寫得進 loc，
 *     也就能讓收件裝置一直響。使用者已知悉並選擇不加保險 ——
 *     煞車是他自己把儀表板的開關關掉。要加回來的話，
 *     就是比照 MSG_COOLDOWN_MS 在 locpush/<id>/<裝置>/lm 記時間戳。
 *
 *  ⚠️ 這裡「完全不解密」，也解不開 —— 私鑰只在使用者的瀏覽器裡。
 *     所以通知永遠說不出座標，只能說「有一筆新的」。這是設計上的必然。
 *
 *  ⚠️ 訂閱放在 locpush/<用 admin 密碼推導的 32 字位址>/<裝置代號>。
 *     這支函式走 Admin SDK，不受資料庫規則約束，所以直接讀整個 locpush 就好，
 *     不需要知道那個位址是什麼（也不應該知道）。
 *  ⚠️ 記錄檔一樣「只記數量」——那個位址是密碼推導出來的，等於半把鑰匙。
 * ══════════════════════════════════════════════════════════════ */
/* 推給「管理者自己的裝置」（locpush/<位址>/<裝置>）。
   位置回報（v42）與 LINE 申請通知（v61）共用這一段：
   ⚠️ 兩種都尊重 locpush 的 on 開關 —— 那是儀表板上「位置回報推播」那一顆，
      從 v61 起它的意思是「儀表板相關的通知」（位置回報、有人申請進房）。
   ⚠️ 記錄檔只記數量與標籤，不寫位址、裝置代號、房號、uid。 */
async function pushToAdminDevices(tag, kind) {
  loadDeps();                       // ⚠️ 一定要在 ensureVapid 之前
  if (!ensureVapid()) return;

  let db;
  try {
    db = getDb();
  } catch (err) {
    logger.error(`firebase-admin 初始化失敗，${tag}推播無法送出`, err);
    return;
  }

  let snap;
  try {
    snap = await db.ref("locpush").get();
  } catch (err) {
    logger.error(`讀取${tag}推播訂閱失敗`, err);
    return;
  }

  /* locpush/<位址>/<裝置> —— 攤平成一張「路徑 → 訂閱」的表。
     ⚠️ 用 forEach 而不是 Object.entries(snap.val())：資料量很小，
        但保持跟其他地方一致的讀法，也不必把整包展開成物件。 */
  const targets = [];
  snap.forEach((idNode) => {
    idNode.forEach((devNode) => {
      const s = devNode.val() || {};
      if (!s.ep || !s.k || !s.a) return;
      if (s.on === false) return;             // 開關關著
      targets.push({ path: `locpush/${idNode.key}/${devNode.key}`, s });
    });
  });

  if (!targets.length) {
    logger.info(`[${tag}] 沒有任何裝置訂閱推播`);
    return;
  }

  /* payload 只帶類型，不帶任何內容 —— 文字在 sw.js。
     ⚠️ k 這個欄位就是 sw.js 用來分辨「聊天 / 位置 / 申請」的唯一依據。
        改名的話兩邊要一起改，否則會退回聊天那一組文字
        （不會壞，但使用者會以為功能沒生效）。 */
  const payload = JSON.stringify({ k: kind });

  let gone = 0;
  const results = await Promise.allSettled(targets.map(async (t) => {
    try {
      await webpush.sendNotification(
        { endpoint: t.s.ep, keys: { p256dh: t.s.k, auth: t.s.a } },
        payload,
        { TTL: 3600, urgency: "high" }
      );
    } catch (err) {
      const code = err && err.statusCode;
      /* 404 / 410 = 訂閱死了（移除主畫面圖示、清了瀏覽器資料…）。
         ⚠️ 一定要順手刪掉，不然每一筆都白試一次。
         ⚠️ 刪完直接結束，不可以再往下寫任何東西（v29 那個坑：
            catch 正常結束＝promise fulfilled，後面的 then 照跑，
            會把節點寫成只剩殘骸）。 */
      if (code === 404 || code === 410) {
        gone++;
        await db.ref(t.path).remove().catch(() => {});
        return "gone";
      }
      throw err;
    }
    return "sent";
  }));

  if (gone) logger.info(`[${tag}] 清掉 ${gone} 筆失效訂閱`);
  const failed = results.filter((r) => r.status === "rejected").length;
  const ok = results.filter((r) => r.status === "fulfilled" && r.value === "sent").length;
  if (failed) {
    const why = results.filter((r) => r.status === "rejected")
      .map((r) => `${(r.reason && r.reason.statusCode) || "?"} ${(r.reason && r.reason.message) || r.reason}`)
      .slice(0, 3).join(" | ");
    logger.warn(`[${tag}] ${targets.length} 台中有 ${failed} 台失敗：${why}`);
  } else {
    logger.info(`[${tag}] 成功送出 ${ok} 則`);
  }
}

exports.notifyLocation = onValueCreated(
  { ref: "/loc/{locId}", instance: INSTANCE },
  () => pushToAdminDevices("位置", "loc")
);

/* ────────────────────────── v61：LINE 審核 ────────────────────────── */

/* 有人用 LINE 身分申請進房（acl/<房號>/req/<uid> 被**建立**）→ 通知管理者。
   ⚠️ 只在建立時觸發：同一個人再申請只是 l / c 更新，不會再通知一次。 */
exports.notifyAclRequest = onValueCreated(
  { ref: "/acl/{roomId}/req/{uid}", instance: INSTANCE },
  () => pushToAdminDevices("申請", "acl")
);

/* LINE 換票：前端拿 LINE 的 code 來，這裡換成 Firebase 的 custom token。
 *
 *  ⚠️ 這支是「唯一」寫 acl/<房號>/req 的地方（前端規則寫死不能寫）。
 *     名字、大頭貼都是 LINE 驗證過的 ID token 裡拿出來的，前端偽造不了。
 *  ⚠️ 記錄檔規矩跟其他函式一樣：不寫房號、uid、名字、IP、code —— 只記結果與數量。
 *  ⚠️ 失敗一律回同一種錯（400 {error:"denied"}），前端一律走「跟打錯密碼一樣」那條路。
 *
 *  兩種用法：
 *    { code, verifier, redirect, rid }  → 第一次：跟 LINE 換票、登記申請、回 custom token
 *    { knock: true, rid }               → 已有 LINE 身分：只登記一次申請（帶 Firebase ID token）
 */
const LINE_TOKEN_URL = process.env.LINE_TOKEN_URL || "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY_URL = process.env.LINE_VERIFY_URL || "https://api.line.me/oauth2/v2.1/verify";
const LINE_ORIGINS = (process.env.LINE_ORIGINS || "https://sb.02251121.com").split(",").map((s) => s.trim()).filter(Boolean);
const ADMIN_LINE_UIDS = (process.env.ADMIN_LINE_UID || "").split(",").map((s) => s.trim()).filter(Boolean);

function getAdminAuth() {
  const { initializeApp, getApps } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  const app = getApps()[0] || initializeApp();
  return getAuth(app);
}
const isRid = (s) => typeof s === "string" && /^[0-9a-f]{32}$/.test(s);
const isLineUid = (s) => typeof s === "string" && /^U[0-9a-f]{32}$/.test(s);

async function lineForm(url, form) {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error("line " + res.status); e.line = json; throw e; }
  return json;
}

async function handleLineAuth(req, res) {
  const deny = (why) => { logger.info(`[LINE] 拒絕：${why}`); res.status(400).json({ error: "denied" }); };
  if (req.method !== "POST") { res.status(405).json({ error: "method" }); return; }
  const channelId = process.env.LINE_CHANNEL_ID, secret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !secret) { logger.error("functions/.env 少了 LINE_CHANNEL_ID 或 LINE_CHANNEL_SECRET"); return deny("未設定"); }

  /* ① 呼叫者必須是 Firebase 使用者（匿名也算）—— 擋掉路人亂打這支 API */
  const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
  if (!m) return deny("沒有 ID token");
  let caller;
  try { caller = await getAdminAuth().verifyIdToken(m[1]); } catch (_) { return deny("ID token 驗不過"); }

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  if (body.homeAction) return handleHomeSettings(body, caller, res, deny);
  if (body.profile === true) {
    if (caller.lp !== true || !isLineUid(caller.uid)) return deny("需要 LINE 身分");
    try {
      const profile = (await getDb().ref(`lineProfiles/${caller.uid}`).get()).val();
      return res.status(200).json({ name: profile?.n || "", picture: profile?.p || "" });
    } catch (_) { return deny("讀取個人資料失敗"); }
  }
  const loginOnly = body.loginOnly === true && body.knock !== true;
  const rid = body.rid;
  if (!loginOnly && !isRid(rid)) return deny("房號格式");

  let uid, name = "", picture = "";
  if (body.knock === true) {
    /* ② 已有 LINE 身分：只登記申請 */
    if (!caller.lp || !isLineUid(caller.uid)) return deny("knock 但不是 LINE 身分");
    uid = caller.uid;
    // 名字及頭像只能來自伺服器保存的 LINE 驗證結果，不能信任前端欄位。
    let profile;
    try { profile = (await getDb().ref(`lineProfiles/${uid}`).get()).val(); }
    catch (_) { return deny("讀取 LINE 資料失敗"); }
    if (!profile || typeof profile.n !== "string" || !profile.n.trim() ||
        typeof profile.verifiedAt !== "number" || Date.now() - profile.verifiedAt > 24 * 60 * 60 * 1000) {
      res.status(200).json({ refreshProfile: true }); return;
    }
    name = profile.n.slice(0, 80);
    picture = typeof profile.p === "string" && /^https:\/\//.test(profile.p) ? profile.p.slice(0, 400) : "";
  } else {
    /* ② 跟 LINE 換憑證 */
    const { code, verifier, redirect } = body;
    if (typeof code !== "string" || !code || code.length > 512) return deny("code 格式");
    if (typeof verifier !== "string" || verifier.length < 43 || verifier.length > 128) return deny("verifier 格式");
    if (typeof redirect !== "string" || !/^https?:\/\//.test(redirect) || redirect.length > 300) return deny("redirect 格式");
    let tok;
    try {
      tok = await lineForm(LINE_TOKEN_URL, {
        grant_type: "authorization_code", code, redirect_uri: redirect,
        client_id: channelId, client_secret: secret, code_verifier: verifier,
      });
    } catch (err) { return deny("換票失敗 " + (err.line && err.line.error || err.message)); }
    if (!tok || typeof tok.id_token !== "string") return deny("沒有 id_token");
    /* ③ 驗 ID token（LINE 的 verify 端點會檢查簽章與 aud） */
    let prof;
    try { prof = await lineForm(LINE_VERIFY_URL, { id_token: tok.id_token, client_id: channelId }); }
    catch (err) { return deny("驗證失敗 " + (err.line && err.line.error || err.message)); }
    if (!prof || String(prof.aud) !== String(channelId)) return deny("aud 不符");
    if (!isLineUid(prof.sub)) return deny("sub 格式");
    uid = prof.sub;
    name = typeof prof.name === "string" ? prof.name.slice(0, 80) : "";
    picture = (typeof prof.picture === "string" && /^https:\/\//.test(prof.picture)) ? prof.picture.slice(0, 400) : "";
    // 補取 LINE 的公開個人資料，並核對與已驗證 ID token 是同一帳號。
    if ((!name.trim() || !picture) && typeof tok.access_token === "string") {
      try {
        const response = await fetch("https://api.line.me/v2/profile", {
          headers: { authorization: "Bearer " + tok.access_token },
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          const info = await response.json();
          if (info.userId !== uid) return deny("個人資料帳號不符");
          if (typeof info.displayName === "string") name = info.displayName.trim().slice(0, 80);
          picture = typeof info.pictureUrl === "string" && /^https:\/\//.test(info.pictureUrl) ? info.pictureUrl.slice(0, 400) : "";
        }
      } catch (_) { /* LINE 暫時無法提供 profile 時，沿用已驗證的 ID token 資料。 */ }
    }
    if (!name.trim()) return deny("LINE 未提供顯示名稱，請重新授權 profile");
    try { await getDb().ref(`lineProfiles/${uid}`).set({ n: name, p: picture, verifiedAt: Date.now() }); }
    catch (_) { return deny("保存 LINE 資料失敗"); }
  }

  /* ④ 管理員：.env 裡列的 uid 第一次登入時寫進 admin/，之後規則全通、不用核准 */
  const db = getDb();
  const isAdmin = ADMIN_LINE_UIDS.includes(uid);
  if (isAdmin) {
    try { await db.ref(`admin/${uid}`).set(true); } catch (err) { logger.error("寫 admin/ 失敗", err); return deny("admin 寫入失敗"); }
  }

  /* ⑤ 核准狀態 + 登記申請（管理員不登記） */
  let ok = isAdmin;
  if (!isAdmin && !loginOnly) {
    let okSnap = null;
    try { okSnap = await db.ref(`acl/${rid}/ok/${uid}`).get(); } catch (_) {}
    ok = !!(okSnap && okSnap.val() === true);
    try {
      const reqRef = db.ref(`acl/${rid}/req/${uid}`);
      const cur = (await reqRef.get()).val() || {};
      const { ServerValue } = require("firebase-admin/database");
      const patch = { l: ServerValue.TIMESTAMP, c: (typeof cur.c === "number" ? cur.c : 0) + 1 };
      if (typeof cur.f !== "number") patch.f = ServerValue.TIMESTAMP;
      patch.n = name;
      patch.p = picture; // LINE 使用者移除頭像時，也要清除舊圖。
      await reqRef.update(patch);
    } catch (err) { logger.warn("登記申請失敗", err && err.message); return deny("登記申請失敗"); }
  }

  /* ⑥ 發票（knock 不需要，前端本來就有身分） */
  let token = null;
  if (body.knock !== true) {
    try { token = await getAdminAuth().createCustomToken(uid, { lp: true }); }
    catch (err) { logger.error("createCustomToken 失敗（IAM 少了 Service Account Token Creator？）", err && err.message); return deny("發票失敗"); }
  }
  logger.info(`[LINE] ${body.knock === true ? "knock" : "換票"}成功 · ${isAdmin ? "管理員" : (ok ? "已核准" : "待審核")}`);
  res.status(200).json({ token, ok, admin: isAdmin });
}
exports.__handleLineAuth = handleLineAuth;   // 給測試直接跑處理函式用

async function handleHomeSettings(body, caller, res, deny) {
  const db = getDb();
  const { scryptSync, randomBytes, timingSafeEqual } = require("node:crypto");
  const password = typeof body.password === "string" ? body.password : "";
  if (body.homeAction === "unlock") {
    if (!/^\d{4,16}$/.test(password)) return deny("首頁密碼格式");
    try {
      const saved = (await db.ref("homeSwitchSecret").get()).val();
      const valid = saved
        ? timingSafeEqual(scryptSync(password, saved.salt, 32), Buffer.from(saved.hash, "hex"))
        : !!process.env.HOME_DEFAULT_PASSWORD && password === process.env.HOME_DEFAULT_PASSWORD;
      res.status(200).json({ unlocked: valid });
    } catch (_) { return deny("首頁密碼驗證失敗"); }
    return;
  }
  // 關閉保護與修改密碼都由伺服器驗證管理員，前端不可直接寫設定。
  let admin = false;
  try { admin = caller.lp === true && (await db.ref(`admin/${caller.uid}`).get()).val() === true; } catch (_) {}
  if (!admin) return deny("首頁設定需要管理員");
  try {
    if (body.homeAction === "password") {
      if (!/^\d{4,16}$/.test(password)) return deny("首頁密碼格式");
      const salt = randomBytes(16).toString("hex");
      await db.ref("homeSwitchSecret").set({ salt, hash: scryptSync(password, salt, 32).toString("hex") });
    } else if (body.homeAction === "toggle") {
      if (typeof body.enabled !== "boolean") return deny("首頁開關格式");
      if (!body.enabled && (!process.env.HOME_DISABLE_PASSWORD || password !== process.env.HOME_DISABLE_PASSWORD)) return deny("關閉首頁保護密碼錯誤");
      await db.ref("settings/homeSwitch").set(body.enabled);
    } else { return deny("首頁設定操作"); }
    res.status(200).json({ ok: true });
  } catch (_) { return deny("首頁設定儲存失敗"); }
}

const { onRequest } = require("firebase-functions/v2/https");
exports.lineAuth = onRequest({ cors: LINE_ORIGINS, region: REGION, maxInstances: 3, memory: "256MiB", timeoutSeconds: 30 }, handleLineAuth);
