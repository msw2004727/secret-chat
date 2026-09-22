/* ============================================================
 *  Service Worker — 只做一件事：讓偽裝首頁瞬間開、沒網路也開得起來
 *
 *  ⚠️ 策略刻意選「網路優先」而不是「快取優先」。
 *     快取優先會出現「改了程式重新部署卻沒生效」的鬼故事，
 *     而這個專案改版很頻繁，那個坑踩下去很難查。
 *     網路優先＝有網路一定拿到最新的，沒網路才用快取墊底。
 *
 *  ⚠️ 只碰同源的靜態檔。Firebase 的 SDK 與資料庫連線完全不攔截 ——
 *     攔了會讓即時訂閱出問題，而且沒有任何好處。
 * ============================================================ */

const VERSION = "sc-v61.15";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())          // 新版本立刻接手，不要等所有分頁關掉
      .catch(() => self.skipWaiting())         // 有任何一個檔案抓不到也不要卡住安裝
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // 只處理同源的 GET。Firebase、CDN 一律放行不碰。
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // OAuth 回傳含一次性 code/state，不可寫入離線快取。
  if (url.searchParams.has("code") || url.searchParams.has("state") || url.searchParams.has("error")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 只快取成功的同源回應，順手更新墊底用的副本
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        // 導覽請求（重新整理、從主畫面開啟）沒網路時墊上偽裝首頁
        if (req.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});

/* 頁面可以主動叫新版本立刻上工 */
self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

/* ══════════════════════════════════════════════════════════════
 *  新訊息推播（v22 起）
 *
 *  ⚠️ 通知文字寫死在這裡，不是從 payload 拿的。
 *     payload 會落在裝置上，多帶一個字就多一份痕跡。
 *     伺服器那邊只負責「觸發」，內容由這裡決定。
 *
 *  ⚠️ 每一次 push 都「必須」顯示一則通知。
 *     iOS 規定如此；Chrome 不顯示的話會自己補一句
 *     「此網站在背景更新了」，那反而更顯眼。所以不要嘗試靜默處理。
 * ══════════════════════════════════════════════════════════════ */

const PUSH_TITLE = "Google";
const PUSH_BODY = "有 1 項新動態";
const PUSH_TAG = "sc";          // 同一個 tag → 新的通知蓋掉舊的，不會疊一整排

/* 位置回報的通知（v42）。
   ⚠️ 文字一律寫死在這裡，payload 只帶一個字母的類型標記 ——
      payload 會落在裝置的 Service Worker 裡，內容越少痕跡越少。
   ⚠️ tag 刻意「跟聊天分開」（使用者要求兩則並排）。
      共用 tag 的話，位置通知一來就會把還沒看的聊天通知蓋掉。 */
const LOC_BODY = "你有一個位置分享通知";
const LOC_TAG = "sc-loc";

/* 有人用 LINE 申請進房（v61）。文字一樣寫死、一樣不帶任何內容；
   tag 分開，才不會蓋掉還沒看的聊天／位置通知。 */
const ACL_BODY = "你有一則新的通知";
const ACL_TAG = "sc-acl";

/* 從 payload 判斷這是哪一種通知。
   ⚠️⚠️ 這個函式「絕對不可以往外丟例外」。
      push 事件裡只要有任何一步丟出去，showNotification 就不會被呼叫 ——
      那就是 silent push，WebKit 累積約三次會把整台裝置的訂閱作廢，
      使用者看到的症狀是「推播開關自己被關掉」（v35 的根本原因）。
      所以：解析失敗、沒有 payload、payload 不是 JSON —— 一律回聊天那一組，
      寧可通知的文字不對，也不可以不顯示。 */
function pickNotice(e) {
  let kind = "";
  try { kind = ((e.data && e.data.json()) || {}).k || ""; } catch (_) { kind = ""; }
  if (kind === "loc") return { body: LOC_BODY, tag: LOC_TAG };
  if (kind === "acl") return { body: ACL_BODY, tag: ACL_TAG };
  return { body: PUSH_BODY, tag: PUSH_TAG };
}

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    /* ⚠️⚠️ 收到 push 就「一定」要顯示通知，一次例外都不能有。 ⚠️⚠️
     *
     * v35 之前這裡有一段「畫面開著就不吵他」的捷徑：抓到任何可見的視窗就
     * 直接 return，不顯示通知。那一段是 iPhone 推播三不五時整個失效的**根本原因**。
     *
     * WebKit 把「收到 push 卻沒有顯示通知」視為 silent push，
     * 大約累積三次就會把**整台裝置的推播訂閱作廢**（不是這間房，是整個訂閱）。
     * 使用者看到的症狀是「推播開關自己被關掉，要重新打開」，
     * 而且雲端完全沒有錯誤 —— 因為送出那一刻位址還是好的。
     *
     * 實測佐證：資料庫裡同一台 iPhone 在三間房留下**三個不同的推播位址**
     * （8/21 06:13、8/21 10:33、8/22 11:39），
     * 同一時期的 Android／桌機位址則從頭到尾一個字都沒變。
     * 只有 Apple 那一台一直被換掉。
     *
     * ⚠️ Chrome 也會罰，只是罰法不同：不顯示的話它會自己補一則
     *    「這個網站在背景更新了」，那比我們自己的通知更顯眼。
     *
     * 「人正在看就不要吵」這件事**移到伺服器那一端**做（它會看在線狀態），
     * 那裡跳過是「根本不送 push」，不會產生 silent push。 */
    /* ⚠️ 先算好內容再進 showNotification —— pickNotice() 保證不丟例外（見上面）。
          標題兩種通知都一樣：iPhone 上它本來就會被主畫面的 App 名稱蓋掉，
          圖示也一樣（iOS 忽略 icon，一律用 manifest 那顆）。
          在你的手機上，真正分得出來的只有 body 這一句。 */
    const n = pickNotice(e);
    await self.registration.showNotification(PUSH_TITLE, {
      body: n.body,
      tag: n.tag,
      renotify: false,
      icon: "./icon-192.png",
      badge: "./favicon-32.png",
      silent: false,
      /* ⚠️ 不要放 data / actions。
         通知上出現「回覆」之類的按鈕，等於在鎖定畫面上宣告這是通訊軟體。 */
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    /* 已經有視窗就把它叫到前面 —— 不要開第二個分頁。
       ⚠️ 一律停在偽裝首頁，不會直接帶進聊天室：
          點通知的人不一定是你，密碼還是要重打一次。 */
    for (const w of wins) {
      if (w.url.includes(self.registration.scope)) return w.focus();
    }
    return self.clients.openWindow("./");
  })());
});
