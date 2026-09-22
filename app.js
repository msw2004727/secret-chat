/* ============================================================
 *  秘密聊天 — 主程式
 *
 *  流程：
 *    偽裝首頁 → 輸入密碼 → 用密碼推導出「房間位址 + 加密金鑰」
 *    → 匿名登入 Firebase → 進入聊天室
 *
 *  重點：程式碼裡沒有明文密碼，只有密碼的「指紋」。
 *        訊息與貼圖都在瀏覽器端加密後才上傳，雲端只看得到亂碼。
 * ============================================================ */

const CFG = window.CONFIG;

/* 版號。發新版時這三個地方要一起改：
     ‧ 這裡的 APP_VERSION
     ‧ index.html 的 <meta name="sc-shell">
     ‧ sw.js 的 VERSION（"sc-" + 版號）
   儀表板上方會把三者印出來比對 —— 只要對不起來，就代表這台裝置
   還跑著舊的那一份，不是程式有問題。 */
const APP_VERSION = "v61.15";

/* 表情回應。五個就好 —— 再多會變成選單，失去「一秒回一個」的意義。
   雲端存的是這裡的單字母代號（h/u/l/c/p），不是表情符號本身。
   ⚠️ 這個代號是明文的。理由：訊息鍵本來就是明文，所以「誰對哪一則有反應」
      不管加不加密都看得到，加密只多藏「是五個裡的哪一個」，
      卻要在畫面渲染路徑上多一條非同步解密 —— 可靠性優先，不划算。
      想改成加密的話只有 setRx / paintReactions 兩個地方要動。 */
/* 沒送出的草稿。⚠️ 只存在記憶體 —— 不寫 localStorage、不寫雲端、不寫任何地方。
   關掉分頁就消失，緊急退出（連點／晃動／翻面／Esc）也會整份清掉。
   解決的是「打到一半鎖螢幕，回來字不見了」這個每天都會遇到的挫折。 */
const DRAFTS = new Map();

/* 多人房的暱稱與顏色：{ roomId → { nick, color } }（記憶體快取）。
   v26 起另外「加密後」存進 localStorage，重開瀏覽器不必再打一次。
   ⚠️ 原本不存的理由是「等於在裝置上留下你在哪一間房叫什麼」——
      加密之後這個理由消失：鍵名是房間位址（密碼推導出的 32 字亂碼），
      值是用房間金鑰封起來的密文，沒有房間密碼就是一團亂數。
      跟已經在硬碟上的貼圖庫（sc-stickers）、照片暫存（sc-media）同一個等級。
   ⚠️ 緊急退出要把 sc-n-* 一起清掉 —— 那是「手機被搶走」的情境。 */
const NICKS = new Map();
const NICK_MAX = 12;
/* 多人房的「上次讀到哪一則」。
   ⚠️ 私人房這一筆是寫在雲端的 read/ 節點（已讀回條），多人房刻意沒有已讀回條，
      所以改成只記在這台裝置 —— 這樣多人房也有「以下是新訊息」分隔線，
      而且不會多洩漏任何人的閱讀狀態給雲端或其他成員。
   ⚠️ 值是一則訊息的鍵（內含時間戳），等於在裝置上留下「你上次看到幾點」。
      跟思念的基準值（sc-h-*）同一個等級，緊急退出時要一起抹掉。 */
const ReadMark = {
  key: (rid) => `sc-r-${rid}`,
  save(rid, k) { try { localStorage.setItem(this.key(rid), String(k)); } catch (_) {} },
  load(rid) { try { return localStorage.getItem(this.key(rid)) || null; } catch (_) { return null; } },
  forget(rid) { try { localStorage.removeItem(this.key(rid)); } catch (_) {} },
  /* keep = 要留下來的房號清單（v36）。
     ⚠️ 有開鈴鐺的房間一定要留 —— 多人房的未讀是拿這一筆當基準算的，
        抹掉之後回到偽裝首頁，鈴鐺會一直亮著一顆永遠消不掉的假紅點。
        而且反正那些房間的位址本來就留在 sc-watch 裡了（使用者選擇保留），
        這時候再抹「上次讀到哪」並沒有多換到什麼。 */
  clearAll(keep) {
    const safe = new Set((Array.isArray(keep) ? keep : []).map((r) => this.key(r)));
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sc-r-") && !safe.has(k)) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  },
};

const MEM_KEY = (rid) => `sc-m-${rid}`;

/* 這台裝置記住的「我在這間房是誰」（v27）。
   存的是身分代號 + 暱稱 + 顏色，整包用房間金鑰加密。
   有這一份，同一台裝置就完全不用再打個人密碼；
   換裝置時打一次個人密碼就接回同一個身分。
   ⚠️ 刻意「不存個人密碼本身」—— 存了等於把它落地，
      而身分代號是單向推導出來的，拿到它也回推不出密碼。 */
const MemberStore = {
  async save(rid, key, rec) {
    try { localStorage.setItem(MEM_KEY(rid), JSON.stringify(await seal(key, rec))); }
    catch (_) {}
  },
  async load(rid, key) {
    try {
      const raw = localStorage.getItem(MEM_KEY(rid));
      if (!raw) return null;
      const body = await unseal(key, JSON.parse(raw));
      const nick = String(body.n || "").slice(0, NICK_MAX).trim();
      /* ⚠️ 欄位名一定要跟 save() 存進去的那一包對得上。
            存的是 askMember() 回傳的 { uid, n, c }，v27 這裡誤寫成 body.u，
            結果 uid 永遠是空字串、永遠過不了下面那個正規式 ——
            「這台裝置記住你的身分」整個功能從來沒有生效過（只有記憶體那層
            NICKS 擋著，所以不重整看不出來）。 */
      const uid = String(body.uid || "");
      return (nick && /^[0-9a-f]{32}$/.test(uid)) ? { uid, n: nick, c: body.c || "blue" } : null;
    } catch (_) {
      /* 解不開（換過密碼）或格式壞掉 —— 當作沒登入過，重新問一次就好。 */
      return null;
    }
  },
  forget(rid) { try { localStorage.removeItem(MEM_KEY(rid)); } catch (_) {} },
  /* 緊急退出用：一次清掉所有房間的身分。
     ⚠️ 要先收集再刪 —— 邊列舉邊 removeItem 會讓索引位移而漏掉一半。 */
  clearAll() {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sc-m-")) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  },
};

const REACTIONS = [
  { k: "h", e: "❤️", label: "愛心" },
  { k: "u", e: "👍", label: "讚" },
  { k: "l", e: "😂", label: "大笑" },
  { k: "c", e: "😢", label: "哭" },
  { k: "p", e: "🙏", label: "拜託／謝謝" },
];
const SHELL_VERSION =
  document.querySelector('meta[name="sc-shell"]')?.getAttribute("content") || "?";

const FB_VER = "12.17.1";
const CDN = `https://www.gstatic.com/firebasejs/${FB_VER}`;

/* ────────────────────────── 0. 小工具 ────────────────────────── */

const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) {
  const s = atob(str);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

let toastTimer;
function toast(msg, ms = 2200) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

/* 密碼輸入框是 contenteditable 的 div（不是 input，才不會被瀏覽器自動填入記住），
   所以讀寫要自己來 */
const readBox = (el) =>
  (el.textContent || "").replace(/[\r\n\t]/g, "").replace(/ /g, " ").trim();
const clearBox = (el) => { el.textContent = ""; };

/* 多行純文字貼上（管理儀表板用）。
   ⚠️ 不能用 bindPlainPaste —— 那支是給密碼框用的，會把換行整個吃掉，
      貼一份 8 行的密碼清單進去會變成一行亂碼。 */
function bindMultilinePaste(el) {
  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const src = e.clipboardData || window.clipboardData;
    const t = ((src && src.getData("text")) || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u3000/g, " ");
    if (!t) return;
    try { document.execCommand("insertText", false, t); }
    catch (_) { el.textContent = (el.textContent || "") + t; }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/* 貼上一律轉成單行純文字 */
function bindPlainPaste(el) {
  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const src = e.clipboardData || window.clipboardData;
    // 正規化規則要跟 readBox 一致，否則含空白的密碼會「手打進得去、貼上進不去」
    const t = ((src && src.getData("text")) || "").replace(/[\r\n\t]/g, "").replace(/ /g, " ");
    if (!t) return;
    try {
      document.execCommand("insertText", false, t);
    } catch (_) {
      el.textContent = readBox(el) + t;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const hhmm = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const dayKey = (ms) => {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};


/* ────────────────────────── 1. 加密模組 ──────────────────────────
 * 一次昂貴的 PBKDF2 推導出主金鑰，再用 HKDF 便宜地分出三把用途不同的鑰匙：
 *   fingerprint → 比對密碼對不對（不含密碼本身）
 *   roomId      → 房間在資料庫的位址（別人猜不到）
 *   aesKey      → 訊息 / 貼圖的加解密金鑰（永遠不離開瀏覽器）
 *   hk          → HKDF 的母金鑰本身，留著給「個人密碼」再分一把（v27）
 * ────────────────────────────────────────────────────────────── */

async function deriveKeys(password) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const master = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(CFG.appSalt), iterations: CFG.pbkdf2Iterations, hash: "SHA-256" },
    base, 256
  );
  const hk = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveBits", "deriveKey"]);
  const info = (label) => ({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode(label) });

  const [fpBits, roomBits] = await Promise.all([
    crypto.subtle.deriveBits(info("fingerprint"), hk, 256),
    crypto.subtle.deriveBits(info("room-id"), hk, 256),
  ]);
  const aesKey = await crypto.subtle.deriveKey(info("message-key"), hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

  /* ⚠️ hk 一起帶出去 —— 多人房的個人密碼要拿它再分一把身分代號出來。
        它是不可匯出的 CryptoKey，只活在記憶體，跟 aesKey 同一個等級。 */
  return { fingerprint: hex(fpBits), roomId: hex(roomBits).slice(0, 32), aesKey, hk };
}

/* ────────── 個人密碼 → 身分代號（v27，多人房專用）──────────
 *
 * 這是「輕量級登入」，不是驗證：
 *   身分代號 = HKDF(房間主金鑰, "member:" + 個人密碼)
 *
 * 進房時去查 mem/<身分代號> 在不在，就知道這組密碼建立過沒有。
 * ⚠️ 個人密碼從不離開這個瀏覽器 —— 雲端只看得到推導後的 32 字亂碼。
 *
 * ⚠️ 這道推導是「快的」（HKDF，不是 PBKDF2）。
 *    也就是說：同房的人手上有房間金鑰，把所有 4 碼組合全試一遍就能算出每個人的
 *    身分代號，進而冒充。使用者知道並接受 —— 這是自用的小眾工具，
 *    而且冒充能影響的只有暱稱與計數，**訊息本身還是安全的**（那把金鑰不同）。
 *    ⚠️ 哪天要開放給不認識的人用，這裡就要改成慢速推導並加長密碼，
 *       而且登入畫面那句警語不可以拿掉。
 *
 * ⚠️ 不要把個人密碼設成跟房間密碼一樣 —— 登入畫面有寫，但程式不強制擋
 *    （擋了就等於告訴旁邊的人「這兩組不一樣」）。 */
async function deriveMemberId(hk, pin) {
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode("member:" + pin) },
    hk, 256
  );
  return hex(bits).slice(0, 32);
}

/* ────────── 第二道密碼的指紋（v54）──────────
 *
 * 指紋 = HKDF(房間主金鑰, "gate2:" + 第二組密碼)，存在 rooms/<房號>/gate2/fp。
 *
 * ⚠️⚠️ **這是一道畫面，不是一把鎖。** 使用者是在知道這件事的前提下要的（他要的是嚇阻）：
 *    訊息還是用房間密碼那把金鑰加密的，第二組密碼**完全沒有參與加密**。
 *    拿到房間密碼的人可以直接讀資料庫，根本不會經過這個視窗；
 *    而且這道推導是快的（HKDF），4 碼一萬組離線全試只要幾毫秒。
 *    → 它真正的價值是：①嚇阻文字有地方放 ②多一層「保護措施」，
 *      刑法第 358 條的構成要件明文寫著「破解使用電腦之保護措施」。
 *    → 要有密碼學上的價值，得讓內容金鑰也由兩組密碼一起推導，而且第二組不能是 4 碼。
 *      那是另一個設計（既有訊息全部要重新加密），使用者選擇不做。
 *
 * ⚠️ 用 HKDF 不用 PBKDF2 是刻意的：反正擋不住離線爆破，多花 0.14 秒卡住畫面沒有意義。 */
async function deriveGate2Fp(hk, pin) {
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode("gate2:" + pin) },
    hk, 256
  );
  return hex(bits).slice(0, 32);
}

async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), c: b64(ct) };
}

async function unseal(key, rec) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(rec.iv) }, key, unb64(rec.c));
  return JSON.parse(dec.decode(pt));
}


/* ────────────────────────── 2. 本機貼圖庫（IndexedDB） ──────────────────────────
 * 貼圖存在你自己的裝置，不上雲端，換裝置不會同步（這是刻意的）。
 * ─────────────────────────────────────────────────────────────────────────── */

const Stickers = {
  db: null,

  open() {
    if (this.db) return Promise.resolve(this.db);
    const mk = (d) => { if (!d.objectStoreNames.contains("items")) d.createObjectStore("items", { keyPath: "id" }); };
    return new Promise((res, rej) => {
      const req = indexedDB.open("sc-stickers", 1);
      req.onupgradeneeded = () => mk(req.result);
      req.onsuccess = () => {
        const d = req.result;
        /* ⚠️ 資料庫在、但裡面的 objectStore 不見了（建立到一半被中斷就會這樣）。
           這種狀態下 onupgradeneeded 不會再觸發，之後每次操作都會丟例外，
           貼圖庫等於永久壞掉、只能清除網站資料才救得回來。→ 升一版重建。 */
        if (!d.objectStoreNames.contains("items")) {
          const v = d.version + 1;
          d.close();
          const up = indexedDB.open("sc-stickers", v);
          up.onupgradeneeded = () => mk(up.result);
          up.onsuccess = () => { this.db = up.result; res(this.db); };
          up.onerror = () => rej(up.error);
          return;
        }
        this.db = d;
        res(d);
      };
      req.onerror = () => rej(req.error);
    });
  },

  async all() {
    let d;
    try { d = await this.open(); } catch (_) { return []; }   // 貼圖庫壞掉不該連累聊天室
    return new Promise((res) => {
      const out = [];
      const cur = d.transaction("items").objectStore("items").openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); }
        // 最近用過的排前面；沒用過的就看加入時間
        else res(out.sort((a, b) => (b.used || b.at) - (a.used || a.at)));
      };
      cur.onerror = () => res(out);
    });
  },

  async put(dataUrl) {
    const d = await this.open();
    const item = { id: crypto.randomUUID(), dataUrl, at: Date.now() };
    d.transaction("items", "readwrite").objectStore("items").put(item);
    return item;
  },

  async del(id) {
    const d = await this.open();
    d.transaction("items", "readwrite").objectStore("items").delete(id);
  },

  /* 用過就往前排。純本機，不上雲端。 */
  async touch(id) {
    const d = await this.open();
    const st = d.transaction("items", "readwrite").objectStore("items");
    const req = st.get(id);
    req.onsuccess = () => {
      const it = req.result;
      if (it) { it.used = Date.now(); st.put(it); }
    };
  },
};

/* ────────────────────────── 2a. 內建圖庫（v48，延遲載入） ──────────────────────────
 * 喜／怒／哀／樂四頁的圖住在 assets.js 裡，隨網站出貨，不進 IndexedDB。
 *
 * ⚠️⚠️ 一定要用**動態** import()，而且只有在貼圖面板真的打開時才叫。
 *    改成靜態 import 的話，偽裝首頁在還沒登入之前就會先抓一份 600KB 的表情圖回來 ——
 *    第一幀變慢，而且打開網路面板一眼就看得出這不是搜尋首頁。
 *    同理，**不可以**把 assets.js 加進 sw.js 的 SHELL 清單。
 *
 * ⚠️ 載不到不可以連累聊天室。這裡把錯誤吞掉，當成「內建圖庫是空的」：
 *    四個分頁顯示一句話，其他一切照常 —— 跟貼圖庫壞掉時同一個原則。
 *
 * ⚠️ 送出時走的還是原本那條路（{ k:"st", d:"data:image/webp;base64,..." }），
 *    訊息格式一個字都沒改，舊版本的裝置照樣收得到、看得到。
 * ─────────────────────────────────────────────────────────────────────────── */

const Builtin = {
  mod: null,        // 載進來的模組；載失敗是 null
  tried: false,     // 試過了沒有（成功或失敗都算）
  pending: null,    // 正在載的那一次，避免連點兩下抓兩份

  load() {
    if (this.tried) return Promise.resolve(this.mod);
    if (!this.pending) {
      this.pending = import("./assets.js")
        .catch(() => null)
        .then((m) => {
          this.mod = m; this.tried = true; this.pending = null;
          return m;
        });
    }
    return this.pending;
  },

  ids(k) {
    const packs = (this.mod && this.mod.PACKS) || [];
    const p = packs.find((x) => x.k === k);
    return p ? p.ids : [];
  },

  src(id) {
    try { return (this.mod && this.mod.src(id)) || ""; } catch (_) { return ""; }
  },

  /* 對方送來的是不是就是內建的那一張。
     ⚠️ 沒載進來時一律回 false —— 不可以為了比對就去強拉那 600KB。
        那種情況下多存一張的代價，比多抓一次小得多。 */
  isOne(u) {
    try { return !!this.mod && this.mod.isBuiltin(u); } catch (_) { return false; }
  },
};

/* 貼圖面板停在哪一頁。純本機偏好，跟配色、搖晃開關同一個等級。 */
const STK_TABS = ["mine", "joy", "mad", "sad", "fun"];
const STK_TAB_KEY = "sc-stk-tab";
const StkTab = {
  cur: null,
  get() {
    if (this.cur) return this.cur;
    let v = null;
    try { v = localStorage.getItem(STK_TAB_KEY); } catch (_) {}
    this.cur = STK_TABS.includes(v) ? v : null;
    return this.cur;
  },
  set(k) {
    this.cur = k;
    try { localStorage.setItem(STK_TAB_KEY, k); } catch (_) {}
  },
};

/* ────────────────────────── 2b. 照片原圖的本機暫存（IndexedDB） ──────────────────────────
 * 看過的原圖留在這台裝置上，同一張再點就完全不連網 —— 這是省流量的第二層。
 * 第一層是「泡泡只放縮圖，原圖點了才抓」。
 *
 * ⚠️ 一定要跟貼圖庫分開兩個資料庫（sc-media / sc-stickers）。
 *    清快取只能清這一個，貼圖庫是使用者自己收藏的東西，絕對不能被連坐。
 * ─────────────────────────────────────────────────────────────────────────── */

const Media = {
  db: null,
  NAME: "sc-media",
  STORE: "blobs",

  open() {
    if (this.db) return Promise.resolve(this.db);
    const mk = (d) => {
      if (!d.objectStoreNames.contains(this.STORE)) {
        d.createObjectStore(this.STORE, { keyPath: "path" }).createIndex("used", "used");
      }
    };
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.NAME, 1);
      req.onupgradeneeded = () => mk(req.result);
      req.onsuccess = () => {
        const d = req.result;
        // 跟貼圖庫同一個坑：資料庫在但 objectStore 不見了 → 升一版重建
        if (!d.objectStoreNames.contains(this.STORE)) {
          const v = d.version + 1;
          d.close();
          const up = indexedDB.open(this.NAME, v);
          up.onupgradeneeded = () => mk(up.result);
          up.onsuccess = () => { this.db = up.result; res(this.db); };
          up.onerror = () => rej(up.error);
          return;
        }
        this.db = d;
        res(d);
      };
      req.onerror = () => rej(req.error);
    });
  },

  /* 拿不到就回 null。暫存壞掉頂多多下載一次，不該讓照片整個看不到。 */
  async get(path) {
    let d;
    try { d = await this.open(); } catch (_) { return null; }
    return new Promise((res) => {
      const tx = d.transaction(this.STORE, "readwrite");
      const st = tx.objectStore(this.STORE);
      const req = st.get(path);
      req.onsuccess = () => {
        const it = req.result;
        if (!it) return res(null);
        it.used = Date.now();          // 動過的往後排，淘汰時先丟最久沒看的
        try { st.put(it); } catch (_) {}
        res(it.blob);
      };
      req.onerror = () => res(null);
      /* ⚠️ 交易「中止」跟請求「出錯」是兩件事（v31）。
            這是 readwrite 交易（要回寫 used），而這個暫存最多會放到 150MB ——
            空間吃緊或瀏覽器回收儲存空間時，整筆交易會 abort，
            那時候 req.onsuccess / req.onerror **都不會**觸發。
            少了下面這兩行，這個 Promise 永遠不會有結果 ——
            fetchMedia 就卡在這裡，畫面上是一顆永遠轉不完的圈，
            而且連一句錯誤訊息都沒有。 */
      tx.onabort = () => res(null);
      tx.onerror = () => res(null);
    });
  },

  async put(path, blob) {
    let d;
    try { d = await this.open(); } catch (_) { return; }
    await new Promise((res) => {
      const tx = d.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).put({ path, blob, size: blob.size, used: Date.now() });
      tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
    });
    this.evict();                      // 放完再檢查上限，不要擋住呼叫端
  },

  async del(path) {
    let d;
    try { d = await this.open(); } catch (_) { return; }
    await new Promise((res) => {
      const tx = d.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).delete(path);
      tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
    });
  },

  /* 回傳 { n, bytes }，給設定面板顯示「媒體快取 12.4 MB」 */
  async stat() {
    let d;
    try { d = await this.open(); } catch (_) { return { n: 0, bytes: 0 }; }
    return new Promise((res) => {
      let n = 0, bytes = 0;
      const cur = d.transaction(this.STORE).objectStore(this.STORE).openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { n++; bytes += c.value.size || 0; c.continue(); }
        else res({ n, bytes });
      };
      cur.onerror = () => res({ n, bytes });
    });
  },

  async clear() {
    let d;
    try { d = await this.open(); } catch (_) { return; }
    await new Promise((res) => {
      const tx = d.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).clear();
      tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
    });
  },

  /* 超過上限就從「最久沒看的」開始丟。
     用 used 這個索引開游標，由小到大走，邊走邊扣。 */
  async evict() {
    const cap = (CFG.mediaCacheMaxMB || 150) * 1024 * 1024;
    const { bytes } = await this.stat();
    if (bytes <= cap) return;
    let over = bytes - cap;
    let d;
    try { d = await this.open(); } catch (_) { return; }
    await new Promise((res) => {
      const tx = d.transaction(this.STORE, "readwrite");
      const cur = tx.objectStore(this.STORE).index("used").openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (!c || over <= 0) return;
        over -= c.value.size || 0;
        c.delete();
        c.continue();
      };
      tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
    });
  },
};


/* 把圖片檔解成點陣圖。
   ⚠️ `imageOrientation: "from-image"` 一定要帶 ——
      少了它，iPhone 橫拍的照片會變成躺著的（EXIF 裡的旋轉資訊被忽略）。
      舊瀏覽器不認這個選項會直接丟例外，所以要退回沒有選項的版本。 */
async function decodeImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (_) { return await createImageBitmap(file); }
}

/* 等比縮圖 + 重新編碼。
   ⚠️ 比例永遠不動，而且「比上限小的圖不放大」—— 放大只會讓檔案變大、畫質變糊。
   ⚠️ 經過 canvas 重新編碼會自動丟掉 EXIF，所以 GPS、機型、拍攝時間都不會跟著送出去。
      這是附帶效果，但很重要，不要改成直接上傳原始檔。 */
async function scaleImage(file, { max, quality, alpha = false, wantBlob = false }) {
  const bmp = await decodeImage(file);
  const srcW = bmp.width, srcH = bmp.height;
  const scale = Math.min(1, max / Math.max(srcW, srcH));   // Math.min(1, …) 就是「不放大」
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { alpha });
  ctx.imageSmoothingQuality = "high";      // 縮圖用的取樣品質，預設是 "low"
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  /* 輸出格式優先 WebP（同樣畫質下檔案最小）。
     退路要分開想：貼圖可能有透明背景 → PNG；照片沒有透明 → JPEG（PNG 會大到離譜）。 */
  const fallback = alpha ? "image/png" : "image/jpeg";
  if (wantBlob) {
    let blob = await canvasBlob(cv, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await canvasBlob(cv, fallback, quality);
    return { blob, w, h, srcW, srcH };
  }
  let url = cv.toDataURL("image/webp", quality);
  if (!url.startsWith("data:image/webp")) url = cv.toDataURL(fallback, quality);
  return { url, w, h, srcW, srcH };
}

function canvasBlob(cv, type, quality) {
  return new Promise((res) => { try { cv.toBlob(res, type, quality); } catch (_) { res(null); } });
}

/* 貼圖：小、可能有透明背景、整張塞在訊息裡 */
async function compressImage(file) {
  const r = await scaleImage(file, {
    max: CFG.stickerMaxSize, quality: CFG.stickerQuality, alpha: true,
  });
  return r.url;
}


/* ────────────────────────── 3. 全域狀態 ────────────────────────── */

const S = {
  role: null,        // 目前只有 "main"
  password: null,    // 只存在記憶體 / sessionStorage，不會上傳
  roomId: null,
  key: null,
  clientId: null,    // 匿名身分，存 localStorage
  fb: null,          // Firebase 模組與參照
  msgs: [],          // { k, s, t, kind, body }
  keys: new Set(),
  oldestKey: null,
  loadingOlder: false,
  loadOlder: null,     // 手動「載入更早的訊息」用的把手，離開房間時清掉
  reachedTop: false,
  topCheckedAt: 0,   // 上次重新確認「是不是真的到頂」的時間（v37）
  wipeMark: null,
  peerReadKey: null,   // 對方「看到」哪一則
  peerRecvKey: null,   // 對方「收到」哪一則（人在房裡就算，遮罩蓋著也算）
  lastReadSent: null,  // 我方最後回報過的已讀位置，避免重複寫入
  lastRecvSent: null,  // 我方最後回報過的送達位置
  pending: new Set(),  // 已經顯示但還沒真的寫進伺服器的訊息 key
  failed: new Set(),   // 送出失敗的訊息 key
  replyTo: null,       // 正在回覆哪一則 { k, s, p }
  lightboxKey: null,   // 放大檢視中的是哪一則貼圖（那則被刪掉時要一起收掉）
  retryMedia: null,    // 原圖／影片抓失敗時，點一下燈箱要重試哪一則
  needsReload: false,  // 有新版本上線了，等離開聊天室時自動重整
  histUnlocked: false, // 這一輪有沒有解開「載入更早的訊息」的鎖（退回偽裝頁就重置）
  open: false,         // 這間是不是多人房（config 裡標了 open: true）
  notes: [],           // 這間房的記事（已解密），依更新時間新→舊
  notesUnlocked: false,// 這一輪有沒有解開記事本（跟歷史訊息鎖分開記）
  pushOn: false,     // 新訊息推播（v52 起就是 push/<裝置>/nm 這個旗標）
  onlineOn: false,   // 對方上線時通知我（v25；v52 起跟 pushOn 完全獨立）
  /* 雲端那一筆訂閱的快照。兩個旗標共用同一筆，改其中一個時要靠它把另一個帶回去 ——
     沒有它的話 savePush（整筆覆寫）會把使用者沒動到的那個開關默默關掉。 */
  pushRec: null,
  pushAskFor: null,  // 推播說明視窗是哪一顆開關叫出來的（"nm"／"on"）
  savePush: null,      // 寫入／刪除推播訂閱的把手，離開房間時清掉
  dropPush: null,
  saveNote: null,      // 寫入／刪除記事的把手，離開房間時清掉
  delNote: null,
  memberId: null,      // 多人房的個人身分代號（由個人密碼推導，私人房是 null）
  /* 隱身進房（v56）。密碼末尾多打一個記號就會是 true。
     ⚠️ 這是「**這次進房**」的狀態，不是設定 —— 本機不存任何東西。
        存了的話手機被拿走就看得出「這台裝置有隱身這個功能」，
        而且鍵名要嘛帶房號（等於把半把鑰匙留在硬碟上，見 Heart.clearAll 那段），
        要嘛得另外想辦法躲，兩條路都比「不存」差。
     ⚠️ 離房與緊急退出一定要歸 false —— 留著的話下一間房會頂著上一間的隱身。 */
  stealth: false,
  /* 個人密碼盤／暱稱視窗開著時，用來從外面把它關掉（緊急退出、Esc、閒置）。
     ⚠️ 那兩個畫面在 #chat 外面，但它們出現的時候房間金鑰已經在記憶體裡了。 */
  abortMember: null,
  abortNick: null,
  hk: null,            // 房間主金鑰的 HKDF 把手，用來推導身分代號
  nick: "",            // 多人房的暱稱（包在密文裡送出）
  nickColor: "blue",   // 多人房的暱稱顏色代號（ACCENTS 的 k）
  rx: {},              // 表情回應：{ 訊息鍵: { 裝置代號: 代號 } }
  entryReadKey: null,  // 進房當下「我上次讀到哪」，用來畫未讀分隔線
  setRx: null,         // 寫入表情的把手，離開房間時清掉
  offset: 0,           // 伺服器時間與本機時間的差
  marks: [],           // 「你不在的時候被想念 N 次」的標記 [{ a: 錨點訊息鍵, n: 次數 }]
  saveMarks: null,     // 寫入／刪除標記的把手，離開房間時清掉
  dropMarks: null,
  presence: {},        // 這間房的在線原始資料 { 裝置代號: { at } }，判斷時要自己看新鮮度
  presenceBeat: null,  // 每 45 秒更新自己 at 的心跳
  presenceDecay: null, // 每 20 秒重算一次在線（資料沒變也可能過期）
  peerTyping: 0,       // 對方最後一次回報「正在輸入」的伺服器時間
  gen: 0,              // 進房代號：只在進出房間時遞增，用來判斷訂閱是否還屬於這一輪
  epoch: 0,            // 列表代號：每次清空訊息時遞增，用來丟棄飛行中的解密／載入
  subs: [],            // 本輪的 Firebase 訂閱，離開時要全部解除
};

function myClientId() {
  let id = localStorage.getItem("sc-cid");
  if (!id) { id = crypto.randomUUID().slice(0, 12); localStorage.setItem("sc-cid", id); }
  return id;
}


/* ────────────────────────── 3.5 未讀提示的追蹤清單 ──────────────────────────
 * 只存房間位址，不存密碼、不存金鑰、也不存時間戳。
 *
 * 「我讀到哪一則」不放本機 —— 已讀回報本來就會把它寫進
 * rooms/<房間>/read/<裝置代號>，直接沿用那一筆就好。
 * 少存一個訊息鍵，就少洩漏一次「你上次看訊息的時間」（push key 內含時間戳）。
 *
 * 預設是空的：沒有任何房間開過提示的裝置，偽裝首頁一行連線都不會發。
 * ─────────────────────────────────────────────────────────────────────────── */

const Watch = {
  KEY: "sc-watch",

  list() {
    try {
      const v = JSON.parse(localStorage.getItem(this.KEY) || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string" && /^[0-9a-f]{32}$/.test(x)) : [];
    } catch (_) { return []; }
  },

  has(roomId) { return !!roomId && this.list().includes(roomId); },

  add(roomId) {
    if (!roomId) return;
    const l = this.list();
    if (!l.includes(roomId)) l.push(roomId);
    localStorage.setItem(this.KEY, JSON.stringify(l.slice(-8)));
  },

  remove(roomId) {
    const l = this.list().filter((x) => x !== roomId);
    if (l.length) localStorage.setItem(this.KEY, JSON.stringify(l));
    else localStorage.removeItem(this.KEY);
  },

  clear() { localStorage.removeItem(this.KEY); },
};


/* ────────────────────────── 4. 偽裝首頁 ────────────────────────── */

function paintLogo() {
  const palette = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
  const el = $("gLogo");
  el.innerHTML = "";
  [...CFG.logoText].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.style.color = palette[i % palette.length];
    el.appendChild(s);
  });
}

function realSearch(q) {
  // 密碼不對 → 就是一次普通的搜尋，偽裝完整閉環
  location.replace("https://www.google.com/search?q=" + encodeURIComponent(q));
}

// 首頁入口遮掩；實際身分與房間權限仍由 LINE / 資料庫規則驗證。
const HomeSwitch = {
  unlocked: false,
  async required() {
    const f = await connect();
    const snap = await withTimeout(f.get(f.ref(f.db, "settings/homeSwitch")), 8000);
    return snap.val() !== false;
  },
  paint() {
    for (const button of document.querySelectorAll("[data-home-switch]")) {
      button.setAttribute("aria-label", this.unlocked ? "首頁開關已開啟" : "關於");
      button.innerHTML = this.unlocked
        ? '<svg viewBox="0 0 48 28" width="42" height="26" aria-hidden="true"><path fill="#d85c7b" d="M13 25 3 15C-5 6 7-3 13 5 19-3 31 6 23 15Z"/><path fill="#ec98ad" d="M35 25 25 15C17 6 29-3 35 5 41-3 53 6 45 15Z"/></svg>'
        : "關於";
    }
  },
  async request(homeAction, fields = {}) {
    const f = await connect();
    const token = await f.auth.currentUser.getIdToken();
    const response = await withTimeout(fetch(Acl.cfg().api, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ homeAction, ...fields }),
    }), 20000);
    if (!response.ok) throw new Error("home-setting-failed");
    return response.json();
  },
  async unlock(password) {
    const result = await this.request("unlock", { password });
    if (result.unlocked !== true) return false;
    this.unlocked = true;
    this.paint();
    return true;
  },
  lock() {
    this.unlocked = false;
    this.paint();
    const dialog = $("homeSwitchDialog");
    if (dialog?.open) dialog.close();
    if ($("homeSwitchPassword")) $("homeSwitchPassword").value = "";
  },
  init() {
    const dialog = $("homeSwitchDialog"), input = $("homeSwitchPassword"), error = $("homeSwitchError");
    const close = () => { input.value = ""; error.textContent = ""; dialog.close(); };
    for (const button of document.querySelectorAll("[data-home-switch]")) button.addEventListener("click", () => {
      if (this.unlocked) { this.lock(); return; }
      input.value = ""; error.textContent = "";
      $("homeAutoLocation").checked = AutoLocation.enabled();
      dialog.showModal(); input.focus();
    });
    let busy = false;
    const confirm = async () => {
      if (busy) return;
      busy = true;
      $("homeSwitchConfirm").disabled = true;
      const password = input.value; input.value = "";
      try {
        if (await this.unlock(password)) {
          if (!dialog.open) { this.lock(); return; }
          AutoLocation.set($("homeAutoLocation").checked);
          AutoLocation.run();
          close(); $("gateInput").focus();
        } else { error.textContent = "密碼不正確"; input.focus(); }
      } catch (_) { error.textContent = "暫時無法驗證，請稍後再試"; }
      finally { busy = false; $("homeSwitchConfirm").disabled = false; }
    };
    $("homeSwitchConfirm").addEventListener("click", confirm);
    $("homeSwitchCancel").addEventListener("click", close);
    dialog.addEventListener("close", () => { input.value = ""; error.textContent = ""; });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); confirm(); }
      e.stopPropagation();
    });
    this.paint();
  },
};

function initGate() {
  paintLogo();
  HomeSwitch.init();
  AutoLocation.init();

  const box = $("gSearch"), input = $("gateInput"), clear = $("gClear"), divider = $("gDivider");

  input.addEventListener("focus", () => box.classList.add("is-focus"));
  input.addEventListener("blur", () => box.classList.remove("is-focus"));

  const syncClear = () => {
    const on = readBox(input).length > 0;
    clear.hidden = !on;
    divider.hidden = !on;
  };
  input.addEventListener("input", syncClear);
  clear.addEventListener("click", () => { clearBox(input); syncClear(); input.focus(); });
  bindPlainPaste(input);

  const go = async () => {
    const q = readBox(input);
    if (!q) return;
    clearBox(input);         // 送出後立刻清空，畫面上不留痕跡
    syncClear();
    await tryEnter(q, () => realSearch(q));
  };

  // Enter（含手機鍵盤的「搜尋」鍵）送出，並擋掉換行
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    go();
  });

  $("gSubmit").addEventListener("click", go);

  // 「好手氣」也走同一套驗證，否則按錯鍵就會把密碼送去 Google
  $("gLucky").addEventListener("click", async () => {
    const q = readBox(input);
    if (!q) { location.replace("https://www.google.com/doodles"); return; }
    clearBox(input);
    syncClear();
    await tryEnter(q, () => realSearch(q));
  });

  /* 邀請連結（#i=xxxx）在 v30 整組拿掉了 —— 產生端與讀取端都拿掉。
     ⚠️ 讀取端一定要一起拿掉：那條連結裡就是房間密碼，只拿掉「產生」的話，
        已經發出去的連結照樣進得來，等於功能還在、只是看不到入口。
     ⚠️ 網址上殘留的雜訊還是要抹掉（開頭那段內聯腳本負責 query，這裡負責 hash），
        不然舊連結會把密碼留在網址列與這一筆瀏覽紀錄上。 */
  if (location.hash) {
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  }

  /* 位置回報的大頭針。⚠️ 關掉（或沒設公鑰）時整顆不進 DOM，見 Loc.init()。 */
  Loc.init();

  input.focus();
}

/* ── 隱身記號（v56）──
 * 使用者的話：「有辦法私人房針對我自己個人登入不留已讀之類的痕跡給對方嗎?」
 *
 * 房間密碼末尾多打一個記號＝這一次隱身進房。`0606` 正常、`0606.` 隱身。
 *
 * ⚠️⚠️ 為什麼不能做成「另一組隱身密碼」：房號與金鑰**都是從密碼本身推導的**
 *    （PBKDF2 → HKDF），所以另一組密碼就是另一間房，看不到原本的訊息也解不開。
 *    要讓兩組密碼開同一間房，就得把房間金鑰寫進 config.js —— 而那個檔案是公開的。
 *    把記號拿掉再推導才是唯一可行的做法：同一間房、同一把金鑰、config 一個字都不用改。
 *
 * ⚠️ 預設值寫在**這裡**，不是只寫在 config.js。
 *    config.js 從來不進更新包（使用者的那一份才是真的），
 *    只放在 config.js 的話這個功能要等他手動改完設定檔才會活 ——
 *    那等於出貨了一個預設不會動的功能。config 只當覆寫用。
 * ⚠️ 只拿掉**一個**記號。`0606..` 拿掉一個之後是 `0606.`，對不上指紋，
 *    照原本的規矩送去 Google —— 跟密碼打錯是同一條路，不特別處理。
 * ⚠️ 記號不可以是空白：readBox() 會 .trim()，打了也留不住。 */
const STEALTH_MARK = (typeof CFG !== "undefined" && CFG.stealthMark) || ".";
/* v59：第二個記號 —— 「正常進入」。
 * ⚠️ 為什麼要兩個記號：v59 讓「沒打記號」變成假的（當成密碼打錯）。
 *    如果只留隱身那一個，那**唯一進得去的方式就是隱身** ——
 *    已讀、在線、正在輸入從此對雙方都消失。實測把整套回歸改成用隱身進房，
 *    63 支裡有 29 支不再是綠的，其中 test-v25（在線）與 test-read（已讀）
 *    是**功能層**真的沒了，不是測試寫壞。
 *    所以「正常進入」要有自己的記號，隱身維持原本的句點（肌肉記憶不動）。
 * ⚠️ 選逗號：就在句點旁邊，兩個人都好記，而且不會被 readBox() 的 trim 吃掉。 */
const ENTER_MARK = (typeof CFG !== "undefined" && CFG.enterMark) || ",";
/* 回傳 mode：
 *   "stealth" —— 打了隱身記號（`0606.`）
 *   "enter"   —— 打了正常進入記號（`0606,`）
 *   "plain"   —— 什麼都沒打（私人房＝當成密碼打錯，見 DECOY_PLAIN）
 * ⚠️ 一樣只剝**一個**記號。`0606..` 剝掉一個之後是 `0606.`，對不上指紋，
 *    照原本的規矩送去 Google —— 跟密碼打錯是同一條路。 */
function peelStealth(raw) {
  const s = String(raw || "");
  const ends = (m) => m && s.length > m.length && s.endsWith(m);
  if (ends(STEALTH_MARK)) return { pw: s.slice(0, -STEALTH_MARK.length), want: true, mode: "stealth" };
  if (ends(ENTER_MARK)) return { pw: s.slice(0, -ENTER_MARK.length), want: false, mode: "enter" };
  return { pw: s, want: false, mode: "plain" };
}

/* ── 私人房：沒打記號的一律當成密碼打錯（v59）────────────────
 *
 * 使用者的話：「輸入 0606 密碼進入就跳轉到故障畫面，但儀表仍要紀錄有設備進入
 *  與保持通知，輸入 0606. 依舊可以隱身正常進入」
 *
 * ⚠️ 使用者原本想要 404 畫面，看完分析後改成**跟打錯密碼一模一樣**（真的去 Google 搜尋）。
 *    理由：在一個 Google 首頁的搜尋框打字卻跳出 404，這件事本身就不正常 ——
 *    404 等於在告訴對方「你打對了，這裡有東西」。而「跳去 Google 搜尋結果」
 *    跟其他 9999 組打錯的四位數**完全沒有差別**，是這裡唯一真正閉環的偽裝。
 *
 * ⚠️⚠️ 這會**同時影響對方**：私人房的房間就是密碼推導出來的，沒有個人身分，
 *    兩個人打的是同一組。所以**兩個人都要改打帶記號的**。
 *    ⚠️ 第一版只留了隱身那一個記號，等於「唯一進得去的方式就是隱身」——
 *       實測把整套回歸改成用隱身進房，63 支裡有 29 支不再是綠的
 *       （test-v25 的在線、test-read 的已讀是**功能層**真的沒了）。
 *       所以 v59 定案是**三層**：
 *         `0606`   → 假的（當成密碼打錯）
 *         `0606,`  → 正常進入（已讀、在線、正在輸入全部照舊）
 *         `0606.`  → 隱身進入（跟 v56 一模一樣，肌肉記憶不動）
 *
 * ⚠️⚠️ **只套指定的房間**（使用者要的只有 0606 ＝ room-1）。
 *    我第一版做成「所有私人房一律套用」，理由是「有例外的規矩緊張時會記錯」——
 *    但那是我的判斷，不是他要的：其他三間私人房照原本打，什麼都沒變。
 *    ⚠️ 名單放在這裡而不是只放 config.js —— config.js 從來不進更新包，
 *       只寫在那裡等於出貨一個預設不會動的功能（跟 STEALTH_MARK 同一條規矩）。
 *       CFG.decoyRoles 可以覆寫。
 * ⚠️ 多人房與 admin 一律不套：多人房有別人在用，儀表板本來就不寫痕跡。
 *
 * ⚠️ 偽裝是**畫面上與行為上**的，不是網路層的：假的那條路會連一次資料庫
 *    （才寫得下紀錄），打錯密碼則完全不連。開著 DevTools 的人看得出差別 ——
 *    但那種人直接讀 app.js 就好了，這個功能本來就擋不住他。
 */
const DECOY_PLAIN = true;
const DECOY_ROLES = (typeof CFG !== "undefined" && Array.isArray(CFG.decoyRoles))
  ? CFG.decoyRoles : ["room-1"];
/* 這一間要不要套「沒打記號 = 假的」。
   ⚠️ 多人房永遠不套（hit.open）—— 那裡有別人在用，擋掉等於把他們鎖在外面。 */
function decoyOn(hit) {
  return DECOY_PLAIN && !hit.open && DECOY_ROLES.indexOf(hit.role) >= 0;
}

/* 假的那條路留下的那一筆。
 * ⚠️ 寫的是 dn／dl（擋下幾次、最後一次），**不碰 n／l** ——
 *    n 是「真的進來過幾次」。混在一起的話儀表板上分不出
 *    「他進來了」跟「他被擋在外面」，那這筆紀錄就沒有意義了。
 * ⚠️ 全新的裝置要補 f，不然儀表板上那一列沒有「首次」可寫。
 * ⚠️ 整段包在 try 裡而且**限時**：寫不進去、網路很慢，都不可以拖住偽裝。
 *    使用者等太久本身就是一個破綻。 */
async function decoyLog(roomId) {
  if (CFG.deviceHistoryEnabled === false) return;
  try {
    const { db, ref, get, set, update, increment, serverTimestamp } = await connect();
    const cid = myClientId();
    const r = ref(db, `rooms/${roomId}/seen/${cid}`);
    const snap = await get(r);
    const job = snap.exists()
      ? update(r, { dn: increment(1), dl: serverTimestamp() })
      : set(r, { f: serverTimestamp(), dn: 1, dl: serverTimestamp() });
    await Promise.race([job, new Promise((ok) => setTimeout(ok, 1200))]);
  } catch (_) { /* 記不下來就算了 —— 偽裝比紀錄重要 */ }
}

async function tryEnter(raw, onFail) {
  if (!HomeSwitch.unlocked) {
    try { if (await HomeSwitch.required()) return onFail(); }
    catch (_) { return onFail(); }
  }
  /* ⚠️ 先剝記號再推導。剝完的那一串才是「真正的密碼」——
        S.password 一定要存剝完的，閒置遮罩那個九宮格只打得出數字，
        存了帶記號的版本會變成「隱身進去之後遮罩永遠解不開」。 */
  const { pw: password, want, mode } = peelStealth(raw);

  let k;
  try { k = await deriveKeys(password); }
  catch (err) { console.error(err); return onFail(); }

  const hit = CFG.passwords.find((p) => p.fingerprint === k.fingerprint);
  /* ⚠️ 對不上就把**原始輸入**（含記號）送去搜尋，不是剝過的那一串。
        送剝過的等於幫使用者把打錯的密碼「修正」成另一個字串留在 Google 紀錄裡。 */
  if (!hit) return onFail();

  // admin 密碼進的是管理儀表板，不是聊天室
  /* ⚠️ k.aesKey 一起傳進去：儀表板的裝置備註要用它加密（v53）。
        在這裡順手帶走，才不用為了備註再跑一次 31 萬次 PBKDF2。 */
  if (hit.role === "admin") {
    /* ⚠️⚠️ v61：儀表板也要 LINE 身分，而且 uid 要在 admin/ 裡。
          admin 密碼負責算祕密路徑，LINE 身分負責過規則 —— 兩者都要。
          "redirected" = 整頁已經跳去 LINE 了，這裡什麼都不要再做。 */
    const ga = await Acl.gateAdmin(raw);
    if (ga === "redirected") return;
    if (ga === "denied") return Acl.deny();
    if (ga !== "ok") { toast("LINE 登入暫時無法完成，請稍後再試"); return; }
    S.role = "admin";
    /* ⚠️ 儀表板打了記號也要講一聲。它本來就不寫任何對方看得到的東西，
          所以「隱身」在這裡是空話 —— 但沉默會讓人以為記號生效了。 */
    if (want) toast("儀表板沒有隱身這回事");
    return enterAdmin(password, k.roomId, k.aesKey);
  }

  /* ⚠️⚠️ v59：私人房**什麼記號都沒打** → 記一筆，然後走跟密碼打錯完全一樣的那條路。
        ⚠️ 判斷用 `mode === "plain"` 不是 `!want` —— `!want` 會把
           「正常進入」（`0606,`）也一起擋掉，那就回到只能隱身的老問題了。
        ⚠️ decoyOn() 只認名單上的房間：其他三間私人房照原本打，什麼都沒變。
        判斷一定要在這裡（設 S.* 之前）：再往下就開始設狀態、進房、訂閱、
        種植物了，那些副作用一個都不可以發生。
     ⚠️ onFail 送的是**原始輸入**（realSearch(q) 用的是使用者打的那一串），
        所以搜尋列上看到的就是他打的東西 —— 跟打錯密碼一字不差。 */
  if (mode === "plain" && decoyOn(hit)) {
    await decoyLog(k.roomId);
    return onFail();
  }

  /* ⚠️⚠️ v61：LINE 審核 —— 一定要在這裡（設 S.* 之前、enterChat() 之前）。
        再往下就開始設狀態、進房、寫在線節點、寫足跡了；第二道密碼（v54）就是
        放在那些副作用之後，所以它只是一道畫面。這一道放對位置＋規則層守門，才是鎖。
        所有房間都必須核准，待審帳號導向等待頁
        "redirected" = 整頁已經跳去 LINE，什麼都別做
        "denied" = 有 LINE 身分但沒被核准（申請已登記）→ 跳指定頁
        "error" = 讀不到 acl / 設定不全 → 跟打錯密碼一樣 */
  const ga = await Acl.gate(k.roomId, raw);
  if (ga === "redirected") return;
  if (ga === "denied") return Acl.deny();
  if (ga !== "ok" && ga !== "skip") { toast("LINE 登入暫時無法完成，請稍後再試"); return; }

  S.role = hit.role;
  S.open = !!hit.open;
  S.password = password;
  S.roomId = k.roomId;
  S.key = k.aesKey;
  S.hk = k.hk;                  // 個人密碼要拿它推導身分代號（多人房）
  S.clientId = myClientId();
  // 刻意不寫進 sessionStorage / localStorage：密碼完全不落地，重整就要重打

  /* 隱身只有私人房有（v56）。
     ⚠️⚠️ 多人房打了記號**一定要明講**，不可以默默當成沒看到 ——
        「我以為我藏起來了，其實沒有」比沒有這個功能還糟。
        多人房本來就沒有已讀回條，但在線與正在輸入照樣看得到，
        而且 mem/ 一進去就記了你是誰，隱身在那裡沒有意義。 */
  S.stealth = want && !S.open;
  if (want && S.open) toast("這間房沒有隱身，已照常進入");

  /* ── 多人房的個人身分（v27）──
     房間密碼決定「進不進得來」，個人密碼決定「你是誰」。
     順序：記憶體 → 本機那份加密的 → 都沒有才問個人密碼。
     ⚠️ 三層都不通就是取消進房，要把已經設好的狀態全部收乾淨 ——
        留半套的話下一次進別間房會頂著這間的暱稱。 */
  if (S.open) {
    const bail = () => {
      S.role = null; S.password = null; S.roomId = null; S.key = null; S.hk = null;
      S.open = false; S.nick = ""; S.memberId = null; S.stealth = false;
      clearBox($("gateInput"));
    };

    const cached = NICKS.get(S.roomId) || await MemberStore.load(S.roomId, S.key);
    if (cached) {
      S.memberId = cached.uid;
      S.nick = cached.n;
      S.nickColor = cached.c;
      NICKS.set(S.roomId, cached);
    } else {
      const who = await askMember();          // 九宮格個人密碼 →（必要時）問暱稱
      if (!who) { bail(); return; }
      S.memberId = who.uid;
      S.nick = who.n;
      S.nickColor = who.c;
      NICKS.set(S.roomId, who);
      await MemberStore.save(S.roomId, S.key, who);
      if (who.returning) toast(`歡迎回來，${who.n}`);
    }
  }

  // 上次沒送出的字還在記憶體裡就還原（切 App、閒置退出回來最有感）
  const draft = DRAFTS.get(S.roomId);
  // 用 input 事件觸發，才會一併帶到自動長高與送出鍵的啟用（那兩個是綁在事件上的）
  if (draft) {
    const mi = $("msgInput");
    mi.value = draft;
    mi.dispatchEvent(new Event("input", { bubbles: true }));
  }

  await enterChat();

  /* 進房那一下再講一次「這次會做什麼／不會做什麼」（v56）。
     ⚠️ 上方那個小標記負責「長期提醒」，這一句負責「這一次的確認」——
        兩個都要。只有標記的話，第一次用的人不知道它到底擋掉了什麼；
        只有這一句的話，隔幾天再進來就忘了自己還開著。
     ⚠️ 說法要具體列出擋掉的四樣，不要只寫「已啟用隱身」——
        使用者要靠它判斷「那我按思念他會不會知道」。 */
  if (S.stealth) toast("隱身進房：不留在線、已讀、已送達、正在輸入", 3200);
}


/* ────────────────────────── 5. 連線 Firebase ────────────────────────── */

let connecting = null;
async function connect() {
  if (S.fb) return S.fb;
  if (!connecting) connecting = connectOnce().finally(() => { connecting = null; });
  return connecting;
}
async function connectOnce() {
  if (S.fb) return S.fb;

  /* 分兩段各自標記，失敗時才分得出是「程式庫載不到」還是「登入被拒」。
     舊版一律回「請確認 config.js」，但實務上九成不是設定檔的問題 ——
     最常見的是換了網址（例如多了 www.）沒有加進授權網域。 */
  let appMod, authMod, dbMod, stMod;
  try {
    [appMod, authMod, dbMod, stMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-database.js`),
      /* Cloud Storage：只有照片原圖會用到。
         ⚠️ 載不到不可以讓整個連線失敗 —— 沒有 Storage 只是不能傳照片，
            文字、貼圖、已讀這些都該照常運作。 */
      import(`${CDN}/firebase-storage.js`).catch(() => null),
    ]);
  } catch (err) {
    err.scStage = "sdk";
    throw err;
  }

  try {
    const app = appMod.initializeApp(CFG.firebase);
    const auth = authMod.getAuth(app);

    /* ⚠️⚠️ v61：先等 Firebase 把持久化的登入狀態讀回來，**有使用者就沿用**。
          真實 SDK 的 signInAnonymously 在「已經登入一個非匿名使用者」時，
          會**新建一個匿名使用者把現在的取代掉** —— 也就是把 LINE 身分洗掉。
          v60 以前無條件呼叫它沒事，因為當時只有匿名一種身分。 */
    const existing = await new Promise((res) => {
      let done = false;
      const fin = (u) => { if (!done) { done = true; res(u); } };
      try { const un = authMod.onAuthStateChanged(auth, (u) => { try { un(); } catch (_) {} fin(u); }); } catch (_) { fin(auth.currentUser); }
      setTimeout(() => fin(auth.currentUser), 4000);
    });
    /* ⚠️ 匿名登入要包逾時 —— 它「卡住不回」比「明確失敗」更常見，
       而卡住的話畫面會一直停在轉圈，看起來像整個 App 死掉。 */
    try {
      if (!existing) await withTimeout(authMod.signInAnonymously(auth), 12000);
    } catch (first) {
      /* Firebase 把匿名登入狀態存在它自己的 IndexedDB。那份東西壞掉或卡住時，
         登入會一直失敗，而且「換一台裝置」也救不了 —— 因為壞的是這個瀏覽器。
         實際遇過：手機 Chrome 一直連線失敗、同一台的 Safari 完全正常、
         清掉網站資料就好了。這裡自動做那件事，再試一次。
         ⚠️ 只砍 Firebase 自己那幾個資料庫，貼圖庫（sc-stickers）絕對不動。 */
      console.warn("匿名登入失敗，清掉 Firebase 的本機狀態後重試：", first);
      await wipeFirebaseLocalState();
      await withTimeout(authMod.signInAnonymously(auth), 12000);
    }

    const db = dbMod.getDatabase(app);
    /* Storage 的 ref / getBytes 跟 Database 的同名，**不可以**攤平進同一層 ——
       攤平的話 f.ref 會被後蓋掉，資料庫那邊整個壞掉而且很難查。
       所以整包放在 f.st 底下，用 f.st.ref(...) 呼叫。 */
    let st = null, storage = null;
    if (stMod && typeof stMod.getStorage === "function") {
      try {
        /* ⚠️ config.firebase 少了 storageBucket 的話，getStorage(app) 會丟
           storage/no-default-bucket —— 而且錯誤訊息完全看不出是設定檔的問題。
           這裡補一個推導值當保險：2024/10 之後開的專案都是 <專案ID>.firebasestorage.app。
           推導不一定對（更早的專案是 .appspot.com），所以正解永遠是把
           storageBucket 明確寫進 config.js。 */
        const bucket = CFG.firebase.storageBucket
          || (CFG.firebase.projectId ? `${CFG.firebase.projectId}.firebasestorage.app` : "");
        storage = bucket ? stMod.getStorage(app, `gs://${bucket}`) : stMod.getStorage(app);
        /* ⚠️ SDK 預設的重試預算大到沒有意義（下載 10 分鐘、其他操作 2 分鐘）。
              網路層一失敗它會安靜地重試到滿 —— 使用者看到的是一顆永遠轉不完的圈。
              而且我們自己的逾時先到的話，只會得到一個「等太久」，
              **拿不到 SDK 真正的錯誤碼**，等於把最有用的線索丟掉。
              調短之後它會自己放棄並回報 storage/retry-limit-exceeded，
              我們才分得出「傳輸卡住」與「檔案不見了」。 */
        try {
          storage.maxDownloadRetryTime = 20000;
          storage.maxOperationRetryTime = 15000;
          storage.maxUploadRetryTime = 60000;
        } catch (_) {}
        st = stMod;
      } catch (err) { console.warn("Cloud Storage 初始化失敗（照片功能會停用）：", err); }
    }
    S.fb = { db, auth, authMod, st, storage, ...dbMod };
    return S.fb;
  } catch (err) {
    err.scStage = "auth";
    throw err;
  }
}

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => {
      const e = new Error("timeout");
      e.code = "sc/timeout";
      rej(e);
    }, ms)),
  ]);
}

/* 砍掉 Firebase 自己的本機資料庫。
   ⚠️ 白名單寫死，不要改成「砍掉全部」—— 貼圖庫也在 IndexedDB 裡。
   刪除時如果還有連線開著會觸發 blocked，所以每個都給 2 秒逾時，
   刪不掉就算了（反正接下來那次登入本來就可能成功）。 */
async function wipeFirebaseLocalState() {
  const names = ["firebaseLocalStorageDb", "firebase-installations-database", "firebase-heartbeat-database"];
  await Promise.all(names.map((n) => new Promise((res) => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    setTimeout(finish, 2000);
    try {
      const req = indexedDB.deleteDatabase(n);
      req.onsuccess = finish;
      req.onerror = finish;
      req.onblocked = finish;
    } catch (_) { finish(); }
  })));
}

/* 把 Firebase 的錯誤翻成「看得懂而且知道要去改哪裡」的一句話。
   ⚠️ 一定要把實際的錯誤碼帶出來 —— 泛用訊息會讓人往錯的方向查（我們踩過）。 */
function connHint(err) {
  const code = err && err.code ? String(err.code) : "";
  const msg = String((err && err.message) || err || "");

  /* ⚠️ 這一句一定要把「清除網站資料」講出來。
        原本只寫「可能被網路、內容封鎖器或瀏覽器擴充功能擋掉」——
        使用者在 v56 出貨後真的中了一次：他去翻封鎖器設定、以為是新功能弄壞的，
        實際上是瀏覽器把 gstatic 那支模組的失敗結果快取住了，清掉就好。
        訊息只列了三個「別人的問題」，卻漏掉最常見、而且**他自己解得掉**的那一個，
        等於把人往錯的方向指（跟坑 #38 同一類：程式是對的，但它對使用者說錯話）。
     ⚠️ 順序也有意義：先講他能立刻試的那一個。 */
  if (err && err.scStage === "sdk")
    return "載入 Firebase 程式庫失敗 —— 先試清除這個網站的資料／快取；仍然不行的話，可能是內容封鎖器、瀏覽器擴充功能或這個網路擋掉了";

  if (code === "auth/unauthorized-domain")
    return `這個網址沒有被授權：${location.hostname}（要加進 Firebase 的授權網域）`;
  if (code === "auth/operation-not-allowed")
    return "Firebase 的「匿名登入」沒有啟用";
  if (code === "auth/network-request-failed")
    return "連不到 Firebase —— 網路不通，或這個網路擋掉了";
  if (code === "auth/too-many-requests")
    return "嘗試太頻繁，Firebase 暫時擋下了，等幾分鐘再試";
  if (code === "sc/timeout")
    return "連線逾時 —— 網路不通，或這個瀏覽器的本機狀態壞了（清除網站資料可解）";
  if (code === "auth/api-key-not-valid" || /api-key/i.test(code))
    return "Firebase 的 apiKey 不正確（這才是真的要改 config.js）";
  if (/indexedDB|storage|quota/i.test(msg))
    return "瀏覽器擋掉了本機儲存（無痕模式或防追蹤設定）";

  return `連線失敗${code ? "：" + code : ""}`;
}


/* ────────────────────────── 4a. 新訊息推播 ──────────────────────────
 *
 * ⚠️ 預設每一台裝置都是關的，而且「每間房各自開關」。
 *    不開的人完全不受影響，資料庫裡也不會有他這一筆。
 *
 * ⚠️ 系統的權限詢問「只問得到一次」。使用者按了不允許之後，
 *    瀏覽器會永久記住，App 再也叫不出那個視窗 —— 只能請他自己去設定改。
 *    所以按開關之前一定要先自己說明清楚，而且要準備一份「怎麼改回來」的指引。
 *
 * ⚠️ iPhone 必須先「加到主畫面」，而且主畫面版的儲存空間跟 Safari 是分開的。
 *    在 Safari 裡開的開關，主畫面版不算數，要在主畫面版裡再開一次。
 * ─────────────────────────────────────────────────────────────────── */


/* ══════════════════════════════════════════════════════════════
   4.5 LINE 審核（v61）
   ──────────────────────────────────────────────────────────────
   密碼對了還要看臉：這台裝置要有 LINE 身分（Firebase custom token，
   由 Cloud Function 跟 LINE 換來），而且那個 uid 要在 acl/<房號>/ok 裡被管理者核准過。

   ⚠️⚠️ 真正的鎖在 database.rules.json 的 rooms/$roomId：沒核准就讀不到也寫不進。
        這個模組只是「把使用者導去正確的路」，改前端繞不過規則。
   ⚠️ 位置：tryEnter() 裡、decoy 判完之後、設 S.* 之前。放到 enterChat() 之後
        就會變成第二道密碼那種「進房前就留痕」的畫面。
   ⚠️ 一台裝置只跳一次 LINE：身分由 Firebase 持久化（IndexedDB），之後每次進房
        直接查 ok。緊急退出預設不登出（panicSignOut 可改）。
   ⚠️ 跳走前把「使用者打的那一串」用 state 當金鑰加密後放 sessionStorage；
        state 只活在這一趟往返的網址上，撿到暫存的人沒有 state 打不開。
        回來的第一件事就是刪掉它。密碼從頭到尾不會明文落地。
   ══════════════════════════════════════════════════════════════ */
const ACL_STASH = "sc-line-x";
const Acl = {
  busy: false,
  cfg() {
    return {
      channel: String(CFG.lineChannelId || ""),
      redirect: String(CFG.lineRedirect || (location.origin + "/")),
      authorize: String(CFG.lineAuthorizeUrl || "https://access.line.me/oauth2/v2.1/authorize"),
      api: String(CFG.lineAuthUrl || ""),
      deny: String(CFG.lineDenyUrl || CFG.panicUrl || "https://www.google.com/"),
    };
  },
  /* 這台裝置現在的身分是不是 LINE 身分（custom token 上有 lp 宣告） */
  async lineUser(f) {
    const u = f.auth.currentUser;
    if (!u || u.isAnonymous) return null;
    try { const r = await u.getIdTokenResult(); return (r.claims && r.claims.lp === true) ? u : null; }
    catch (_) { return null; }
  },
  async isAdmin(f, uid) {
    try { const s = await withTimeout(f.get(f.ref(f.db, `admin/${uid}`)), 8000); return s.val() === true; }
    catch (_) { return false; }
  },
  /* 回 true / false / null（讀不到）。⚠️ 讀不到不可以猜 —— 猜「沒開」會讓沒核准的人直接進房
     （規則會擋，但畫面會噴一堆 permission_denied）；猜「有開」會把沒開審核的房間也送去 LINE。 */
  async isOn(f, rid) {
    try { const s = await withTimeout(f.get(f.ref(f.db, `acl/${rid}/on`)), 8000); return s.val() !== false; }
    catch (_) { return null; }
  },
  async isOk(f, rid, uid) {
    try { const s = await withTimeout(f.get(f.ref(f.db, `acl/${rid}/ok/${uid}`)), 8000); return s.val() === true; }
    catch (_) { return false; }
  },
  /* 進房前的守門：回 "ok" | "redirected" | "denied" | "error" */
  async gate(rid, raw) {
    let f;
    try { f = await connect(); } catch (_) { return "error"; }
    // 明確關閉審核時，使用 Firebase 匿名身分即可進房，不跳 LINE。
    const on = await this.isOn(f, rid);
    if (on === null) return "error";
    if (on === false) return "ok";
    const u = await this.lineUser(f);
    if (!u) return this.hop(raw);
    if (await this.isAdmin(f, u.uid)) return "ok";
    const registration = await this.knock(f, rid);
    if (registration === "refresh") return this.hop(raw);
    if (registration !== "ok") return "error";
    return (await this.isOk(f, rid, u.uid)) ? "ok" : "denied";
  },
  /* 儀表板：一律要 LINE 身分，而且要在 admin/ 裡（不看 acl/on）。 */
  async gateAdmin(raw) {
    let f;
    try { f = await connect(); } catch (_) { return "error"; }
    const u = await this.lineUser(f);
    if (!u) return this.hop(raw);
    return (await this.isAdmin(f, u.uid)) ? "ok" : "denied";
  },
  /* 已有 LINE 身分但沒核准：請 Function 把這一次申請記下來（req 只有它能寫） */
  async knock(f, rid) {
    const c = this.cfg();
    if (!c.api) return "error";
    try {
      const idt = await f.auth.currentUser.getIdToken();
      const response = await withTimeout(fetch(c.api, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + idt },
        body: JSON.stringify({ knock: true, rid }),
      }), 10000);
      if (!response.ok) return "error";
      const result = await response.json();
      return result.refreshProfile === true ? "refresh" : "ok";
    } catch (_) { return "error"; }
  },
  /* 整頁跳去 LINE */
  async hop(raw, loginOnly = false) {
    const c = this.cfg();
    if (!c.channel || !c.api) return "error";
    const state = randB64url(16), verifier = randB64url(32);
    let challenge, stash;
    try {
      challenge = await s256b64url(verifier);
      stash = await sealWithState(state, JSON.stringify({ raw, verifier, at: Date.now(), homeUnlocked: HomeSwitch.unlocked, loginOnly }));
      sessionStorage.setItem(ACL_STASH, stash);
      // 同瀏覽器的新分頁也能接回登入；只留密文，解密 state 不存在本機。
      try { localStorage.setItem(ACL_STASH, JSON.stringify({ stash, at: Date.now() })); } catch (_) {}
    } catch (_) { return "error"; }
    const u = new URL(c.authorize);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", c.channel);
    u.searchParams.set("redirect_uri", c.redirect);
    u.searchParams.set("state", state);
    u.searchParams.set("scope", "profile openid");
    u.searchParams.set("code_challenge", challenge);
    u.searchParams.set("code_challenge_method", "S256");
    this.busy = true;
    location.assign(u.toString());
    return "redirected";
  },
  /* 開頁時：從 LINE 跳回來的那一趟。回傳 true 表示這一趟被接手了。 */
  async resume() {
    this.busy = true;
    try { return await this.resumeFlow(); }
    finally { this.busy = false; }
  },
  async resumeFlow() {
    const sq = window.__sq; window.__sq = null;
    if (!sq) return false;
    const p = new URLSearchParams(sq);
    const code = p.get("code"), state = p.get("state"), err = p.get("error");
    const onFail = () => toast("LINE 登入未完成，請在原本的 Safari 分頁重新輸入房號再試");
    if (!state || (!code && !err)) { onFail(); return true; }
    let stash = null;
    try { stash = sessionStorage.getItem(ACL_STASH); } catch (_) {}
    let shared = null;
    try {
      const saved = JSON.parse(localStorage.getItem(ACL_STASH));
      if (saved && Date.now() - saved.at >= 0 && Date.now() - saved.at < 600000) shared = saved.stash;
    } catch (_) {}
    dropAclStash();
    let payload;
    for (const candidate of [stash, shared]) {
      if (!candidate) continue;
      try { payload = JSON.parse(await openWithState(state, candidate)); break; } catch (_) {}
    }
    if (!payload || (payload.at && (Date.now() - payload.at < 0 || Date.now() - payload.at >= 600000))) {
      onFail(); return true;
    }
    const raw = String(payload.raw || ""), verifier = String(payload.verifier || "");
    const loginOnly = payload.loginOnly === true;
    if (!raw && !loginOnly) { onFail(); return true; }
    // 只有通過 state 解密的這一次 LINE 往返能恢復首頁開關。
    if (!loginOnly && payload.homeUnlocked !== true) {
      try { if (await HomeSwitch.required()) { onFail(); return true; } }
      catch (_) { onFail(); return true; }
    }
    if (err || !code) { onFail(); return true; }          // 使用者在 LINE 那邊按了取消 → 跟打錯一樣
    const { pw } = peelStealth(raw);
    let k, hit;
    if (!loginOnly) {
      try { k = await deriveKeys(pw); } catch (_) { onFail(); return true; }
      hit = CFG.passwords.find((x) => x.fingerprint === k.fingerprint);
      if (!hit) { onFail(); return true; }
    }
    let f;
    try { f = await connect(); } catch (_) { onFail(); return true; }
    const c = this.cfg();
    let res = null;
    try {
      const idt = await f.auth.currentUser.getIdToken();
      const r = await withTimeout(fetch(c.api, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + idt },
        body: JSON.stringify({ code, verifier, redirect: c.redirect, ...(loginOnly ? { loginOnly: true } : { rid: k.roomId }) }),
      }), 20000);
      res = r.ok ? await r.json() : null;
    } catch (_) { res = null; }
    if (!res || typeof res.token !== "string") { onFail(); return true; }
    try { await withTimeout(f.authMod.signInWithCustomToken(f.auth, res.token), 12000); }
    catch (_) { onFail(); return true; }
    if (loginOnly) {
      HomeSwitch.unlocked = payload.homeUnlocked === true;
      HomeSwitch.paint();
      return true;
    }
    if (hit.role === "admin") {
      if (!res.admin) { this.deny(); return true; }
    }
    HomeSwitch.unlocked = payload.homeUnlocked === true;
    HomeSwitch.paint();
    await tryEnter(raw, onFail);       // 現在有身分了，走正常的進房流程（gate 會直接 ok）
    return true;
  },
  deny() { dropAclStash(); location.replace("/pending.html"); },
  /* 在房裡持續盯著核准狀態（撤銷要即時） */
  watch(f, rid) {
    const u = f.auth.currentUser;
    const kick = () => { if (S.roomId !== rid) return; leaveChat(); this.deny(); };
    if (!u) { kick(); return; }
    let on, ok = u.isAnonymous ? false : undefined;
    const check = async () => {
      if (on === undefined || ok === undefined || S.roomId !== rid) return;
      if (on === false || ok === true) return;
      if (await this.isAdmin(f, u.uid)) return;
      kick();
    };
    S.subs.push(f.onValue(f.ref(f.db, `acl/${rid}/on`), (snap) => {
      on = snap.val() !== false; return check();
    }, kick));
    if (!u.isAnonymous) S.subs.push(f.onValue(f.ref(f.db, `acl/${rid}/ok/${u.uid}`), (snap) => {
      ok = snap.val() === true; return check();
    }, kick));
  },
};
function dropAclStash() {
  try { sessionStorage.removeItem(ACL_STASH); } catch (_) {}
  try { localStorage.removeItem(ACL_STASH); } catch (_) {}
}
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randB64url(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }
async function s256b64url(str) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return b64url(new Uint8Array(d));
}
async function stateKey(state) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sc-line:" + state));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealWithState(state, text) {
  const key = await stateKey(state);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64url(out);
}
async function openWithState(state, blob) {
  const key = await stateKey(state);
  const s = blob.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - s.length % 4) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(pt);
}

const LineHeader = {
  revision: 0,
  async refresh(f) {
    const revision = ++this.revision;
    const user = await Acl.lineUser(f);
    if (revision !== this.revision) return;
    $("lineHeaderLogin").hidden = !!user;
    $("lineHeaderAccount").hidden = !user;
    const avatar = $("lineHeaderAvatar");
    avatar.replaceChildren();
    avatar.textContent = "L";
    avatar.title = "LINE 帳號";
    avatar.setAttribute("aria-label", "LINE 頭像");
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await withTimeout(fetch(Acl.cfg().api, {
        method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token },
        body: JSON.stringify({ profile: true }),
      }), 12000);
      if (!response.ok) return;
      const profile = await response.json();
      if (revision !== this.revision || f.auth.currentUser?.uid !== user.uid) return;
      const name = typeof profile.name === "string" ? profile.name : "";
      avatar.title = name || "LINE 帳號";
      avatar.setAttribute("aria-label", name ? name + "的 LINE 頭像" : "LINE 頭像");
      avatar.textContent = Array.from(name)[0] || "L";
      if (typeof profile.picture === "string" && profile.picture.startsWith("https://")) {
        const img = document.createElement("img");
        img.alt = name ? name + "的 LINE 頭像" : "LINE 頭像";
        img.referrerPolicy = "no-referrer";
        img.onload = () => { if (revision === this.revision) avatar.replaceChildren(img); };
        img.src = profile.picture;
      }
    } catch (_) { /* 暫時取不到頭像時顯示帳號圖示，仍可登出。 */ }
  },
  async init() {
    const logout = $("lineHeaderLogout");
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        const f = await connect();
        if (!$("admin").hidden) leaveAdmin();
        else if (!$("chat").hidden) leaveChat();
        HomeSwitch.lock(); dropAclStash();
        await f.authMod.signOut(f.auth);
        await this.refresh(f);
        // 恢復背景匿名身分，讓關閉 LINE 審核的房間仍可進入。
        await f.authMod.signInAnonymously(f.auth);
        toast("已登出此網站的 LINE 帳號");
      } catch (_) { toast("登出未完成，請稍後再試"); }
      finally { logout.disabled = false; }
    });
    try {
      const f = await connect();
      f.authMod.onAuthStateChanged(f.auth, () => { this.refresh(f).catch(() => {}); });
    } catch (_) { /* 首頁離線時仍顯示可重試的登入按鈕。 */ }
  },
};

const Push = {
  /* 這台裝置有沒有可能收推播（跟「有沒有開」是兩回事） */
  supported() {
    return !!(CFG.push && CFG.push.enabled && CFG.push.publicKey
      && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  },

  /* 是不是從主畫面圖示打開的（iOS 的必要條件） */
  standalone() {
    return !!(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone);
  },

  isIOS() {
    const ua = navigator.userAgent || "";
    // iPadOS 13 之後 UA 會偽裝成 Mac，用觸控點數補判
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  },

  /* iPhone 沒裝到主畫面就一定收不到 —— 這種情況要引導去裝，不是去按開關 */
  needsInstall() {
    return this.isIOS() && !this.standalone();
  },

  /* 「現在還不行，但裝到主畫面就會行」。
     ⚠️ iPhone 的 Safari 分頁裡，window.PushManager 和 Notification 根本不存在 ——
        Apple 只把推播 API 開放給加到主畫面的版本。所以 supported() 在那裡一定是 false。
     ⚠️ 這代表「那一列要不要顯示」絕對不能只看 supported()：
        會變成「教你怎麼開推播的說明，藏在你得先開好推播才看得到的地方」。
        iPhone 沒裝的時候照樣要把那一列畫出來，只是開關按不動、按了導去說明。 */
  installable() {
    return !!(CFG.push && CFG.push.enabled && CFG.push.publicKey) && this.needsInstall();
  },

  permission() {
    try { return Notification.permission; } catch (_) { return "denied"; }
  },

  async reg() {
    try { return await navigator.serviceWorker.ready; } catch (_) { return null; }
  },

  async current() {
    const r = await this.reg();
    if (!r) return null;
    try { return await r.pushManager.getSubscription(); } catch (_) { return null; }
  },

  /* 這間房、這台裝置，新訊息推播現在是開著的嗎？
     ⚠️ 要「瀏覽器真的有訂閱」而且「雲端那一筆的旗標是開的」才算開 ——
        只看其中一邊會出現「畫面說開著但根本收不到」。 */
  async isOn() {
    if (!this.supported() || this.permission() !== "granted") return false;
    if (!S.pushOn) return false;
    return !!(await this.current());
  },

  /* 上線通知現在是開著的嗎（v52）。跟 isOn() 同一套判斷，只是換另一個旗標。 */
  async onlineIsOn() {
    if (!this.supported() || this.permission() !== "granted") return false;
    if (!S.onlineOn) return false;
    return !!(await this.current());
  },

  /* base64url 的公鑰 → PushManager 要的 Uint8Array */
  key() {
    const raw = String(CFG.push.publicKey).replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (raw.length % 4)) % 4);
    const bin = atob(raw + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },

  /* 確保「這台裝置在這間房有一筆活的訂閱」，並把 flags 裡指定的旗標寫進去。
     回傳 "ok" / "denied" / "install" / "unsupported" / "failed"
   *
   * ⚠️⚠️ v52：新訊息推播與上線通知是**兩個獨立的開關**，但它們共用**同一筆訂閱** ——
   *    一台裝置在一個 Service Worker 底下只會有一個推播位址，這是規格層面的事實，
   *    不是我們的設計選擇。所以「兩個開關」的意思是兩個旗標（nm／on），
   *    不是兩筆訂閱。
   *
   * ⚠️ 也因此，兩者都躲不掉「要權限、要有訂閱」這件事 ——
   *    單獨開上線通知時一樣要走完 needsInstall → requestPermission → subscribe。
   *    v52 之前那句「要先開啟上面的新訊息推播」就是為了迴避這段流程，
   *    代價是兩個開關被綁死。現在兩邊都走這一支。 */
  async ensureSub(flags) {
    if (!this.supported()) return "unsupported";
    if (this.needsInstall()) return "install";

    let perm = this.permission();
    if (perm === "default") {
      /* ⚠️ 一定要在使用者的點擊事件裡呼叫，否則瀏覽器會直接拒絕。 */
      try { perm = await Notification.requestPermission(); } catch (_) { return "failed"; }
    }
    if (perm !== "granted") return "denied";

    const r = await this.reg();
    if (!r) return "failed";

    let sub;
    try {
      sub = await r.pushManager.getSubscription();
      if (!sub) {
        sub = await r.pushManager.subscribe({
          userVisibleOnly: true,          // ⚠️ 必填。靜默推播在網頁上不被允許
          applicationServerKey: this.key(),
        });
      }
    } catch (err) { console.error(err); return "failed"; }

    const j = sub.toJSON();
    if (!j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return "failed";
    if (!S.savePush) return "failed";

    /* ⚠️ savePush 是**整筆覆寫**，所以沒被 flags 指定的東西全部要自己帶回去：
          另一個開關的旗標（漏掉＝使用者沒動它卻被默默關掉）、
          以及兩個冷卻時間戳 lm／lo（漏掉＝冷卻歸零，會多推一次）。 */
    const old = S.pushRec || {};
    const f = flags || {};
    const nm = f.nm !== undefined ? !!f.nm : (old.nm !== false);
    const on = f.on !== undefined ? !!f.on : (old.on === true);
    const next = { ep: j.endpoint, k: j.keys.p256dh, a: j.keys.auth, t: Date.now(), nm };
    if (on) next.on = true;
    if (typeof old.lm === "number") next.lm = old.lm;
    if (typeof old.lo === "number") next.lo = old.lo;

    try { await S.savePush(next); } catch (err) { console.error(err); return "failed"; }

    S.pushRec = next;
    S.pushOn = nm;
    S.onlineOn = on;
    return "ok";
  },

  /* 兩個開關各自的入口。UI 只呼叫這兩支。 */
  async setNewMsg(want) { return want ? this.ensureSub({ nm: true }) : this.turnOff("nm"); },
  async setOnline(want) { return want ? this.ensureSub({ on: true }) : this.turnOff("on"); },

  /* 關掉其中一個。
     ⚠️ 另一個還開著的話**只改那一個旗標**，不可以整筆刪 ——
        整筆刪就是 v52 之前的行為，也正是兩個開關被綁在一起的原因。
     ⚠️ 兩個都關了才整筆刪：留一筆兩個旗標都關的訂閱沒有任何作用，
        而且伺服器每則訊息都要多讀一筆、多判一次。 */
  async turnOff(which) {
    const rec = S.pushRec || {};
    const otherStillOn = which === "nm" ? (rec.on === true) : (rec.nm !== false);
    if (!otherStillOn) { await this.disable(); return "ok"; }
    try {
      if (which === "nm") {
        if (!S.saveNewMsgAlert) return "failed";
        await S.saveNewMsgAlert(false);
        S.pushRec = { ...rec, nm: false };
        S.pushOn = false;
      } else {
        if (!S.saveOnlineAlert) return "failed";
        await S.saveOnlineAlert(false);
        const next = { ...rec }; delete next.on;
        S.pushRec = next;
        S.onlineOn = false;
      }
    } catch (err) { console.error(err); return "failed"; }
    return "ok";
  },

  /* 進房時「對帳」（v35）。回傳 "ok"（這間房確定收得到）或 "off"（真的沒開成）。
   *
   * ⚠️ 只問「瀏覽器有沒有訂閱」是不夠的 —— 那是 v35 之前的作法，
   *    也是「有時候收得到、有時候整間房都收不到」的來源。
   *
   *    iOS 會在背後把**整台裝置**的訂閱作廢，使用者重新打開開關時
   *    拿到的是一個**全新的位址**。可是那次只會寫回「你當下進的那一間房」，
   *    其他房間留著的還是舊位址 —— 開關看起來是開的，位址卻早就死了，
   *    伺服器每次都「送成功」，手機什麼都不會響。
   *    （實測：資料庫裡同一台 iPhone 在三間房有三個不同位址。）
   *
   *    所以這裡比對的是「雲端存的位址」跟「這台裝置現在真正的位址」。
   *
   * ⚠️ 瀏覽器那邊整個不見了（被 iOS 撤銷）而權限還在的話，直接重訂。
   *    permission 已經是 granted 時 subscribe() 不需要使用者手勢 ——
   *    不重訂的話使用者只會一直看到「開關又自己關掉了」。 */
  async reconcile(rec) {
    if (!this.supported()) return "gone";
    if (this.permission() !== "granted") return "gone";    // 權限被收回＝真的沒了

    const r = await this.reg();
    if (!r) return "unknown";                              // SW 還沒 ready，這次不算數

    let sub;
    try { sub = await r.pushManager.getSubscription(); } catch (_) { return "unknown"; }

    if (!sub) {
      /* 被 iOS 撤銷了。權限還在就直接重訂 —— granted 的時候
         subscribe() 不需要使用者手勢。 */
      try {
        sub = await r.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.key(),
        });
      } catch (_) { return "gone"; }
    }
    if (!sub) return "gone";

    const j = sub.toJSON();
    if (!j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return "gone";
    if (rec && rec.ep === j.endpoint) return "ok";         // 沒換過，什麼都不用做

    /* 位址換過了 → 寫回新的。
       ⚠️ savePush 是整筆覆寫，所以 nm／on／lm／lo 要自己帶回去：
          nm 掉了＝新訊息推播被默默關掉；on 掉了＝上線通知被默默關掉；
          lm／lo 掉了＝冷卻歸零，會多推一次。
       ⚠️ nm 要用 `!== false` 讀（舊訂閱沒有這個欄位，缺省＝開著），
          但寫回去時一律寫成明確的布林值 —— 對帳完的那一筆就不再是舊格式了。
       ⚠️ 寫不進去（離線、規則擋）只算 "unknown"，**不可以**當成 "gone" ——
          那會因為一次網路不順就把一筆好好的訂閱刪掉。 */
    if (!S.savePush) return "unknown";
    const next = {
      ep: j.endpoint, k: j.keys.p256dh, a: j.keys.auth, t: Date.now(),
      nm: !(rec && rec.nm === false),
    };
    if (rec && rec.on === true) next.on = true;
    if (rec && typeof rec.lm === "number") next.lm = rec.lm;
    if (rec && typeof rec.lo === "number") next.lo = rec.lo;
    try { await S.savePush(next); } catch (_) { return "unknown"; }
    S.pushRec = next;
    return "ok";
  },

  /* 關掉。
     ⚠️ 只刪這間房的那一筆，「不」退訂瀏覽器的訂閱 ——
        同一個訂閱可能被別間房共用，退掉會把其他房一起關掉。
        真的要整台裝置停掉，用下面的 killAll()。 */
  async disable() {
    S.pushOn = false;
    /* ⚠️ 整筆訂閱被刪掉，掛在上面的兩個旗標當然也不見了 ——
          記憶體裡的狀態要一起歸零，否則畫面會顯示「上線通知還開著」。
       ⚠️ v52 起這支是「兩個開關都關掉」的路徑（turnOff 判斷過了才會走到這裡），
          不再是「關掉新訊息推播」。只想關其中一個要走 setNewMsg／setOnline。 */
    S.onlineOn = false;
    S.pushRec = null;
    try { await S.dropPush?.(); } catch (err) { console.error(err); }
  },

  /* 整台裝置退訂（換手機、手機弄丟了、想徹底停掉）。
     這只影響這台裝置，不會動到別台。 */
  async killAll() {
    await this.disable();
    const sub = await this.current();
    if (sub) { try { await sub.unsubscribe(); } catch (_) {} }
  },
};


/* ────────────────────────── 4b. 記事本 ──────────────────────────
 *
 * 一間房一本，兩個人共用。存在 rooms/<房號>/nt/<id>，
 * 內容整包用**跟訊息同一把金鑰**加密 —— 房間密碼本來就是兩個人共有的，
 * 同一間房裡做不出「只有我看得到」的東西。這件事已經跟使用者確認過。
 *
 * ⚠️ 記事不會自動過期。訊息會（多人房 48 小時）、照片原圖會（7 天），
 *    但記事本的意義就是留著。只有手動刪、或儀表板遠端清空會動到它。
 * ⚠️ 只有私人房有。多人房人多、進出隨意、又沒有歷史訊息鎖，
 *    共用記事本等於「誰進來都能改能刪」。
 * ⚠️ 同時編輯：後存的蓋過先存的，不做合併。兩個人同時改同一則的機率極低。
 * ───────────────────────────────────────────────────────────── */

const Notes = {
  editing: null,          // 正在編輯哪一則的 key；新記事是 null
  dirty: false,
  saveT: null,
  delArmed: false,
  delT: null,

  /* 第一行當標題，其餘當預覽 —— 不另外做「標題欄位」，
     多一個欄位就多一個要填的東西，實際上大家都只想直接打字。 */
  title(body) {
    const t = String(body || "").split("\n")[0].trim();
    return t || "未命名記事";
  },
  preview(body) {
    const rest = String(body || "").split("\n").slice(1).join(" ").replace(/\s+/g, " ").trim();
    return rest || "（沒有其他內容）";
  },

  open() {
    $("notesPanel").hidden = false;
    $("stickerPanel").hidden = true;
    $("settingsPanel").hidden = true;
    Album.close();                 // v60
    this.showList();
  },

  close() {
    this.flush();                        // 離開前一定要把還沒存的存掉
    $("notesPanel").hidden = true;
    this.editing = null;
    this.disarmDelete();
  },

  showList() {
    this.flush();
    this.editing = null;
    this.disarmDelete();
    $("ntListHead").hidden = false;
    $("ntList").hidden = false;
    $("ntEditHead").hidden = true;
    $("ntEdit").hidden = true;
    this.paintMore();                    // 回到清單就把「下面還有」收掉
    this.paint();
  },

  showEdit(key) {
    this.editing = key || null;
    this.disarmDelete();
    const n = key ? S.notes.find((x) => x.k === key) : null;
    const body = n ? n.body : "";
    $("ntBody").value = body;
    $("ntTitle").textContent = n ? this.title(body) : "新記事";
    $("ntSaved").textContent = n ? "已儲存" : "開始打字就會自動儲存";
    $("ntListHead").hidden = true;
    $("ntList").hidden = true;
    $("ntEditHead").hidden = false;
    $("ntEdit").hidden = false;
    this.dirty = false;
    /* ⚠️ 一定要「先把游標放到最前面、再捲到最上面」（v47）。
          `textarea.value = ...` 之後 selection 會塌到**最後面**，
          接著 focus() 就會把畫面捲到底 —— 使用者點開一則長記事，
          看到的是結尾，很容易以為上面沒東西了。
          setSelectionRange(0,0) 只改游標位置，不會動到內容。
       ⚠️ scrollTop 要在 focus() 之後再設一次：focus() 本身會為了讓游標露出來
          而捲動，先設沒有用。 */
    const nb = $("ntBody");
    try { nb.setSelectionRange(0, 0); } catch (_) {}
    nb.scrollTop = 0;
    setTimeout(() => {
      try { nb.focus(); nb.setSelectionRange(0, 0); } catch (_) {}
      nb.scrollTop = 0;
      this.paintMore();
    }, 40);
    this.paintMore();
  },

  /* 「下面還有」的提示：只有真的還有看不到的內容時才出現。
     ⚠️ 門檻不能設 0 —— 捲到底時瀏覽器算出來常常會差個 0.5~1px，
        設 0 的話那顆提示會在最底部一直閃。 */
  paintMore() {
    const nb = $("ntBody"), tip = $("ntMore");
    if (!nb || !tip) return;
    const left = nb.scrollHeight - nb.scrollTop - nb.clientHeight;
    tip.hidden = $("ntEdit").hidden || left <= 8;
  },

  paint() {
    const list = $("ntList");
    if (!list) return;
    const cnt = $("ntCount");
    if (cnt) cnt.textContent = S.notes.length ? `${S.notes.length} 則` : "";
    list.replaceChildren();

    if (!S.notes.length) {
      const box = document.createElement("div");
      box.className = "nt-empty";
      box.innerHTML =
        '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">'
        + '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"'
        + ' d="M7 3.6h10a1.6 1.6 0 0 1 1.6 1.6v13.6a1.6 1.6 0 0 1-1.6 1.6H7A1.6 1.6 0 0 1 5.4 18.8V5.2A1.6 1.6 0 0 1 7 3.6Z"/>'
        + '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8.7 9h6.6M8.7 13h4"/></svg>';
      const p = document.createElement("div");
      p.textContent = "還沒有記事";
      const q = document.createElement("div");
      q.className = "nt-empty-sub";
      q.textContent = "按右上角的＋開始寫。這裡的內容只有知道房間密碼的人看得到。";
      box.append(p, q);
      list.appendChild(box);
      return;
    }

    for (const n of S.notes) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nt-item";
      b.dataset.k = n.k;
      const t = document.createElement("span");
      t.className = "nt-t";
      t.textContent = this.title(n.body);        // textContent，絕不用 innerHTML
      const p = document.createElement("span");
      p.className = "nt-p";
      p.textContent = this.preview(n.body);
      const w = document.createElement("span");
      w.className = "nt-w";
      /* 多人房要看得出是誰寫的 —— 一群人共用一本，沒有作者就完全查不出來。
         ⚠️ 暱稱是從密文裡解出來的，舊記事（或私人房）沒有就只顯示時間。
         ⚠️ 用 append 兩個節點而不是字串相接：暱稱是使用者輸入的，
            要靠 textContent 隔離，不能讓它有機會被當成標記解析。 */
      if (n.nick) {
        const who = document.createElement("b");
        who.className = "nt-who";
        who.textContent = n.nick;
        if (n.nc) who.style.color = nickColorOf(n.nc);
        w.append(who, document.createTextNode(" · " + whenText(n.t)));
      } else {
        w.textContent = whenText(n.t);
      }
      b.append(t, p, w);
      list.appendChild(b);
    }
  },

  /* 停手 0.8 秒就存一次。刻意不做「儲存」鈕 —— 記事本有存檔鈕就一定會有人忘記按。 */
  touch() {
    this.dirty = true;
    $("ntSaved").textContent = "編輯中…";
    $("ntTitle").textContent = this.title($("ntBody").value);
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => this.flush(), 800);
  },

  async flush() {
    clearTimeout(this.saveT);
    if (!this.dirty) return;
    this.dirty = false;
    const body = $("ntBody").value;

    // 全空的新記事不要存 —— 按了＋又反悔，不該留一則空白
    if (!body.trim() && !this.editing) { $("ntSaved").textContent = ""; return; }

    if (!S.saveNote) { $("ntSaved").textContent = "還在連線中，等一下再試"; this.dirty = true; return; }
    try {
      const key = await S.saveNote(this.editing, body);
      if (key && !this.editing) this.editing = key;      // 新記事存完就有 key 了，之後是更新
      $("ntSaved").textContent = "已儲存";
    } catch (err) {
      console.error(err);
      this.dirty = true;                                  // 沒存成功要留著，下次還會再試
      $("ntSaved").textContent = "儲存失敗，檢查網路";
    }
  },

  /* 刪除要按兩次。記事是拿來留的，手滑一次就沒了太糟。 */
  armDelete() {
    if (!this.editing) { this.showList(); return; }       // 還沒存過的新記事，直接退出就是丟掉
    if (!this.delArmed) {
      this.delArmed = true;
      $("ntDelHint").innerHTML = '<b class="nt-confirm">再按一次刪除</b>';
      clearTimeout(this.delT);
      this.delT = setTimeout(() => this.disarmDelete(), 3000);
      return;
    }
    const key = this.editing;
    this.disarmDelete();
    this.dirty = false;
    clearTimeout(this.saveT);
    this.editing = null;
    S.delNote?.(key).catch((err) => { console.error(err); toast("刪除失敗，請檢查網路"); });
    this.showList();
  },

  disarmDelete() {
    this.delArmed = false;
    clearTimeout(this.delT);
    const h = $("ntDelHint");
    if (h) h.textContent = "";
  },
};

/* 「今天 21:06 / 昨天 14:22 / 8月12日」—— 記事本用得到，訊息那邊不需要 */
function whenText(ts) {
  const d = new Date(ts || Date.now());
  const now = new Date();
  const day = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const hhmm2 = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (day(d) === day(now)) return `今天 ${hhmm2}`;
  const y = new Date(now.getTime() - 86400000);
  if (day(d) === day(y)) return `昨天 ${hhmm2}`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/* 思念按鈕。
   ‧ 輕點（放開時間 < 0.4 秒）→ +1
   ‧ 長按滿 5 秒 → 叫出九宮格，一次送出 1～999 次
   ‧ 0.4～5 秒之間放手 → **什麼都不做**（他明顯是在長按，不是在點）
 *
 * ⚠️ v52 之前長按 0.5 秒是「浮出你 19 · 對方 23」。使用者要求換成輸入次數，
 *    分解顯示整個拿掉。
 * ⚠️ 長按不能算 +1 —— 這個數字不可逆，「想開輸入盤卻多送了一次」收不回來。
 * ⚠️ 0.4 秒之後才顯示進度條，不然輕點也會閃一下。
 *    而且進度一定要看得見 —— 五秒對一個沒有回饋的按鈕來說跟當機沒兩樣。 */
const HOLD_MS = 5000;      // 按滿多久才叫出輸入盤
const HOLD_TAP_MS = 400;   // 比這個短就是輕點，會 +1

function bindHeart() {
  /* ⚠️ 兩顆按鈕都要綁。只綁當前那顆的話，換房型之後新的那顆是死的 ——
        而且 bindChatUI() 一輩子只跑一次（S.uiBound），沒有第二次機會補綁。 */
  const btns = [$("btnHeart"), $("btnFriend")].filter(Boolean);
  if (!btns.length) return;

  let raf = 0, t0 = 0, shown = false, held = false, cur = null;

  const paint = (p) => { if (cur) cur.style.setProperty("--hold-p", String(p)); };
  const stop = () => {
    cancelAnimationFrame(raf); raf = 0;
    if (cur) { cur.classList.remove("holding"); cur.style.setProperty("--hold-p", "0"); }
    cur = null; shown = false;
  };
  const frame = (t) => {
    if (!cur) return;
    const el = t - t0;
    if (!shown && el >= HOLD_TAP_MS) { shown = true; cur.classList.add("holding"); }
    paint(Math.min(1, el / HOLD_MS).toFixed(4));
    if (el >= HOLD_MS) {
      held = true;
      /* ⚠️ 震一下。五秒之後手指還壓著，畫面上的變化在手指底下看不到。 */
      if (navigator.vibrate) { try { navigator.vibrate(35); } catch (_) {} }
      const btn = cur;
      stop();
      HeartNum.open(btn);
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const start = (e) => {
    if (!S.bumpHeart) return;                  // 還沒連上線
    held = false;
    stop();
    cur = e.currentTarget;
    /* ⚠️ 一定要 setPointerCapture：手指在五秒內一定會晃出按鈕範圍幾像素，
          沒有捕獲的話 pointerup 會落在別的元素上，這一次長按就永遠不會結束。 */
    try { cur.setPointerCapture?.(e.pointerId); } catch (_) {}
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  };
  /* ⚠️ 0.4 秒內放手不算長按（held 維持 false），click 就會照常 +1；
        0.4 秒之後放手 held 也還是 false，但 shown 是 true ——
        用 shown 決定要不要吃掉這一次 click。 */
  const end = () => { if (shown) held = true; stop(); };

  for (const btn of btns) {
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", () => { stop(); held = false; });

    btn.addEventListener("click", () => {
      if (held) { held = false; return; }      // 剛剛在長按，不要順便 +1
      Heart.tap();
    });
  }

  /* ⚠️ 離開前一定要把還沒送出去的那幾下寫掉，不然「按了三下就退出」會整組不見。
        pagehide 比 beforeunload 可靠 —— iOS Safari 常常不觸發 beforeunload。 */
  addEventListener("pagehide", () => Heart.flush());
  document.addEventListener("visibilitychange", () => { if (document.hidden) Heart.flush(); });
}

/* 一次送出 N 次（v52）。長按 5 秒叫出來。
 *
 * ⚠️⚠️ 這個數字**不可逆**，沒有 undo，也沒有備份 —— 送出去就是送出去了。
 *    所以三件事一個都不能省：打的數字看得見、送出前先算給他看「會變成幾」、
 *    以及那句「送出後收不回來」。
 * ⚠️ 送出鍵本身就是確認。使用者是一個一個數字打進去的，不是誤觸，
 *    再多問一次「確定嗎」只會讓人習慣性按過去。
 * ⚠️ 上限 999 是**第四位直接不收**，不是打完才報錯 ——
 *    打了四位才被退回會讓人以為壞掉。 */
const HeartNum = {
  MAX: 999,
  buf: "",
  open(btn) {
    if (!S.bumpHeart) return;
    const gate = $("hnGate");
    if (!gate) return;
    const friend = !!S.open;
    gate.classList.toggle("friend", friend);
    const t = $("hnTitle");
    if (t) t.textContent = friend ? "一次送出幾次友誼" : "一次送出幾次思念";
    this.buf = "";
    this.paint();
    gate.hidden = false;
    /* ⚠️ 叫出輸入盤時把長按的填色收乾淨 —— 不收的話關掉盤子之後
          按鈕會留著一條填滿的底色，看起來像壞掉。 */
    btn?.classList.remove("holding");
    btn?.style.setProperty("--hold-p", "0");
  },
  close() {
    const gate = $("hnGate");
    if (gate) gate.hidden = true;
    this.buf = "";
  },
  paint() {
    const n = Number(this.buf || 0);
    const big = $("hnBig"), after = $("hnAfter"), warn = $("hnWarn"), go = $("hnGo");
    if (big) {
      big.textContent = this.buf === "" ? "0" : this.buf;
      big.classList.toggle("zero", n === 0);
    }
    if (after) {
      after.innerHTML = "";
      if (n > 0) {
        /* ⚠️ 用 textContent 拼，不要用字串組 innerHTML —— 這裡雖然全是數字，
              但「畫面上的字一律不走 innerHTML」是這個檔案的規矩。 */
        after.append(`目前 ${Heart.mine} → 送出後 `);
        const b = document.createElement("b");
        b.textContent = String(Heart.mine + n);
        after.append(b);
      } else {
        after.append(" ");
      }
    }
    if (warn) warn.textContent = n > 0 ? "送出後收不回來" : " ";
    if (go) go.disabled = n <= 0;
  },
  key(k) {
    if (k === "del") { this.buf = this.buf.slice(0, -1); this.paint(); return; }
    if (k === "go") { this.submit(); return; }
    if (this.buf.length >= String(this.MAX).length) return;   // 第四位直接不收
    if (this.buf === "" && k === "0") return;                 // 開頭不給 0
    this.buf += k;
    this.paint();
  },
  submit() {
    const n = Math.min(this.MAX, Number(this.buf || 0));
    if (!(n > 0)) return;
    this.close();
    Heart.bulk(n);
  },
};

function bindHeartNum() {
  $("hnGrid")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || b.disabled) return;
    HeartNum.key(b.dataset.k);
  });
  $("hnCancel")?.addEventListener("click", () => HeartNum.close());
}

function bindNotes() {
  $("btnNotes")?.addEventListener("click", () => {
    if (!S.password) { toast("還在連線中，請稍候一下"); return; }
    if (S.notesUnlocked) { Notes.open(); return; }
    NotePad.reset();
    $("ntGate").hidden = false;
  });

  $("ntBack")?.addEventListener("click", () => Notes.close());
  $("ntNew")?.addEventListener("click", () => Notes.showEdit(null));
  $("ntCloseEdit")?.addEventListener("click", () => Notes.showList());
  $("ntDel")?.addEventListener("click", () => Notes.armDelete());
  $("ntBody")?.addEventListener("input", () => { Notes.touch(); Notes.paintMore(); });
  $("ntBody")?.addEventListener("blur", () => Notes.flush());
  /* ⚠️ 捲動要用 passive：這是每一幀都會來的事件，
        不加的話瀏覽器得等我們決定要不要 preventDefault，捲起來會鈍。 */
  $("ntBody")?.addEventListener("scroll", () => Notes.paintMore(), { passive: true });
  /* 鍵盤彈出／收起、轉向都會改變看得到的高度 —— 那會直接改變「下面還有沒有東西」。 */
  window.visualViewport?.addEventListener("resize", () => Notes.paintMore());
  window.addEventListener("orientationchange", () => setTimeout(() => Notes.paintMore(), 320));

  $("ntList")?.addEventListener("click", (e) => {
    const b = e.target.closest(".nt-item");
    if (b) Notes.showEdit(b.dataset.k);
  });
}


/* ────────────────────────── 4c. 思念 ──────────────────────────
 *
 * 上方列狀態右邊的一顆粉色愛心。按一下 +1，愛心從按鈕周圍往上飄。
 * 只有私人房有（多人房沒有「對方」可言）。
 *
 * 資料：rooms/<房號>/heart/<裝置代號> = 數字
 *
 * ⚠️ 這個數字在雲端是「明文」的，而且沒辦法加密 ——
 *    要做到原子累加，伺服器就得看得懂它。它比其他明文中繼資料多透露一件事：
 *    這間房的兩個人關係很親近。使用者已知悉並同意。
 *
 * ⚠️ 寫入是「合併」的，不是一按一次。
 *    照字面一按寫一次的話，連按 10 下就是 10 次寫入。
 *    現在動畫立刻播（純本機），寫入延後 FLUSH_MS 合併成一次 increment(n)。
 *    數字一樣準，流量少九成。
 *
 * ⚠️ 動畫只動 transform 與 opacity —— 這兩個由合成器處理，
 *    不觸發版面計算與重繪。改成動 top/left 的話手機會直接掉幀。
 * ─────────────────────────────────────────────────────────── */

const Heart = {
  MAX_ALIVE: 18,      // 同時最多幾顆，超過就不生（保護低階手機）
  PER_TAP: 4,
  FLUSH_MS: 800,

  mine: 0,
  raw: {},             // v57：雲端那一包原始的 { 裝置代號: 次數 }
  peer: 0,
  alive: 0,
  pending: 0,
  timer: null,
  primed: false,      // 第一次 onValue 只是拿現況，不可以當成「對方剛按了」

  MAX_MARKS: 30,      // 標記存太多會讓那顆密文一直長大，也沒人會往上捲那麼遠
  pendingDiff: 0,     // 這一輪算出來、還沒放進標記清單的差額
  marked: false,      // 這一輪已經建立過標記了（一次進房只留一枚）
  /* 這一枚標記剛產生時要飄幾顆泡泡（v40）。
     ⚠️ 刻意「先記下來、等 placeMarks() 畫完才播」，不在 commitMark() 裡直接播 ——
        那時候提示還沒插進訊息清單，泡泡會比字先出來，看起來像兩件事。 */
  showerN: 0,
  /* ⚠️ 訊息載完了沒。計數從雲端回來與訊息載入是兩條獨立的非同步流程，
        計數幾乎一定比訊息快 —— 那時候 anchor() 會拿到空字串，
        標記就會被釘在「沒有錨點」的狀態，永遠漂在最下面而且下次還會合併進去。
        這是 v27 修掉的 bug：私人房因為有 entryReadKey 當備援才沒被發現，
        多人房沒有已讀回條，一進去就中。 */
  listed: false,

  reset() {
    this.mine = 0; this.peer = 0; this.pending = 0; this.primed = false;
    this.pendingDiff = 0; this.marked = false; this.listed = false;
    this.showerN = 0;
    Miss.stop();                            // 還在飄的泡泡不可以跟著進下一間房
    /* ⚠️ 「愛」的常駐愛心也要一起收：不收的話那個 IntersectionObserver
          與計時器會跨房間活下來，在下一間房繼續對著已經不存在的泡泡空轉。 */
    Love.reset();
    /* 即焚的引信也要一起收：不收的話觀察器與計時器會跨房間活下來，
       在下一間房對著已經不存在的泡泡繼續倒數。 */
    Burn.reset();
    clearTimeout(this.timer); this.timer = null;
    const f = $(Bond.cur().field);
    if (f) { f.replaceChildren(); this.alive = 0; }
    const list = $("msgList");
    if (list) list.querySelectorAll(".c-missed").forEach((el) => el.remove());
    this.paint();
  },

  /* 這一枚標記要釘在哪一則訊息後面。
     私人房有未讀分隔線就釘在它下面（使用者當初指定的位置）；
     多人房沒有已讀回條、也就沒有分隔線，那就釘在「我回來時最新的那一則」——
     意思一樣是「這裡之後才是新的」。 */
  anchor() {
    if (S.entryReadKey) return S.entryReadKey;
    return S.msgs.length ? S.msgs[S.msgs.length - 1].k : "";
  },

  /* 把這一輪算出來的差額變成一枚標記。
     ⚠️ 一定要等訊息載完才做 —— 計數回來和訊息載入是兩條獨立的非同步流程，
        先做的話 anchor() 會拿到空字串，標記就永遠釘不到正確的位置。 */
  commitMark() {
    if (!this.listed) return;          // ⚠️ 訊息還沒載完，這時候的錨點是錯的
    if (this.marked || this.pendingDiff <= 0) return;

    const a = this.anchor();
    /* ⚠️ 沒有錨點就不要建立這一枚（v29）。
          房裡一則訊息都沒有的時候 anchor() 只能回空字串，而空字串永遠對不上
          任何一則訊息 —— 那一枚會被 placeMarks() 釘在訊息區最下面、
          永遠不會跟後來的標記合併，變成一枚位置沒有意義又不會消失的殘骸
          （使用者截圖裡最底下那個「175 次」就是這樣來的）。
       ⚠️ 這裡「不標記」而不是「先放著等錨點」—— pendingDiff 留著，
          同一次進房裡等到有訊息了還是有機會補上；真的整場都沒訊息，
          那一次就不留標記，數字本來就在按鈕上看得到。 */
    if (!a) return;

    this.marked = true;
    const n = this.pendingDiff;
    this.pendingDiff = 0;

    const top = S.marks[S.marks.length - 1];
    /* 中間沒有新訊息（錨點一樣）就併進同一枚 ——
       不然開十次 App 就會在同一個位置冒出十行一模一樣的字。 */
    if (top && top.a === a) top.n += n;
    else S.marks.push({ a, n });
    if (S.marks.length > this.MAX_MARKS) S.marks.splice(0, S.marks.length - this.MAX_MARKS);
    if (S.saveMarks) S.saveMarks(S.marks).catch(() => {});

    /* 泡泡要飄的是「這一次被想念幾次」（n），不是併完之後的總數（top.n）。
       ⚠️ 併進舊的那一枚時 top.n 會把上一次的次數一起算進去 ——
          用它的話，第二次進房會把上一次已經飄過的份再飄一遍。 */
    this.showerN = n;
  },

  /* 把所有標記畫回訊息清單裡。
     ⚠️ resetList() 會對 #msgList 做 replaceChildren()，所以這些節點是「用完即丟」的——
        每次都整批清掉重生，不要試圖快取節點參考（那是 v24 的做法，
        改成多枚之後快取只會讓「哪一枚在哪裡」變成一筆爛帳）。
     ⚠️ 錨點不在目前這一頁的標記「不畫」，不要退而求其次塞在最上面 ——
        位置錯掉比暫時不出現更糟。往上捲載到那一則之後它自己會補上。 */
  placeMarks() {
    const list = $("msgList");
    if (!list) return;
    this.commitMark();
    list.querySelectorAll(".c-missed").forEach((el) => el.remove());

    /* 順手清掉舊版留下的「沒有錨點」殘骸（v29）。
       ⚠️ 只在真的有東西要丟的時候才回寫雲端 —— placeMarks() 跑得很勤，
          每次都寫的話等於每收一則訊息就多一次寫入。 */
    if (this.listed && S.marks.some((m) => !m.a)) {
      S.marks = S.marks.filter((m) => !!m.a);
      if (S.saveMarks) S.saveMarks(S.marks).catch(() => {});
    }
    if (!S.marks.length) return;

    const rows = new Map();
    list.querySelectorAll(".row[data-k]").forEach((r) => rows.set(r.dataset.k, r));
    const lastIdx = S.marks.length - 1;

    S.marks.forEach((m, i) => {
      const num = Number(m.n) || 0;
      if (num <= 0) return;
      const el = document.createElement("div");
      el.className = "c-missed" + (i === lastIdx ? "" : " old");
      el.append(`你不在的時候，${Bond.cur().them}想念了你 `);
      const b = document.createElement("b");
      b.textContent = String(num);
      el.append(b, " 次");

      if (!m.a) return;                  // 沒有錨點的一律不畫（上面已經濾掉，這裡是保險）
      const row = rows.get(m.a);
      if (!row) {
        /* 錨點那一則不在目前這一頁。
           ⚠️ 最新的那一枚一定要看得到 —— 它講的是「你剛剛不在的時候」，
              藏起來等於功能沒作用。錨點比整頁都舊，代表它屬於最上面。
           ⚠️ 舊的那幾枚就真的不畫：位置錯掉比暫時不出現更糟，
              往上捲載到那一則之後它們自己會回來。 */
        if (i === lastIdx) list.prepend(el);
        return;
      }
      /* ⚠️ 「以下是新訊息」的分隔線就插在錨點那一則的後面，
            所以直接 row.after() 會把標記塞到分隔線「上面」——
            使用者當初明確指定要在分隔線「下方」。有分隔線就跳過它再插。 */
      const line = row.nextElementSibling;
      if (line && line.classList.contains("newline")) line.after(el);
      else row.after(el);
    });

    this.fireShower();
  },

  /* 泡泡在這裡播（v40）。
     ⚠️ 一定要在 placeMarks() 把提示畫完之後 —— 泡泡跟那行字是同一件事，
        先飄後出字會看起來像兩件不相干的事情。
     ⚠️ showerN 用完立刻歸零：placeMarks() 每收到一則新訊息就會再跑一次，
        不歸零的話每一則訊息都會再炸一次畫面。
     ⚠️ 只有「剛算出來的那一次」會播。往上捲載到更早的訊息時 placeMarks()
        照樣會重畫所有標記，但那時候 showerN 是 0，不會再播。 */
  fireShower() {
    const n = this.showerN;
    if (n <= 0) return;
    this.showerN = 0;
    Miss.shower(n);
  },

  paint() {
    const n = $(Bond.cur().num);
    if (n) n.textContent = String(this.mine + this.peer);
  },

  /* 浮出一小段字（「+1」或「你 19 · 對方 23」）。
     ⚠️ 每次都要先移除再加回去，否則同一個動畫不會重播。 */
  pop(text) {
    const el = $(Bond.cur().pop);
    if (!el) return;
    el.textContent = text;
    el.hidden = true;
    void el.offsetWidth;
    el.hidden = false;
    clearTimeout(this._popT);
    this._popT = setTimeout(() => { el.hidden = true; }, 1150);
  },

  /* 生一顆飄浮的愛心。
     ⚠️ 所有隨機值都寫成 CSS 變數交給 keyframes ——
        JavaScript 只負責生出來與飄完刪掉，中間每一幀都不碰它。 */
  spawn() {
    if (this.alive >= this.MAX_ALIVE) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;              // 分頁在背景就不要浪費效能

    const mode = Bond.cur();
    const field = $(mode.field), btn = $(mode.btn);
    if (!field || !btn || btn.hidden) return;

    const r = btn.getBoundingClientRect();
    const b = field.getBoundingClientRect();
    if (!r.width) return;

    const rnd = (a, z) => a + Math.random() * (z - a);
    const size = rnd(9, 19);
    const el = document.createElement("span");
    el.className = "c-heart-bit";
    el.style.left = (r.left - b.left + r.width / 2 + rnd(-16, 16) - size / 2) + "px";
    el.style.top = (r.top - b.top + r.height / 2 + rnd(-5, 5) - size / 2) + "px";
    el.style.setProperty("--dx", rnd(-30, 30).toFixed(1) + "px");
    el.style.setProperty("--dy", rnd(-96, -58).toFixed(1) + "px");
    el.style.setProperty("--sc", rnd(0.75, 1.35).toFixed(2));
    el.style.setProperty("--rot", rnd(-55, 55).toFixed(0) + "deg");
    el.style.setProperty("--dur", rnd(1.05, 1.75).toFixed(2) + "s");
    el.style.setProperty("--peak", rnd(0.32, 0.62).toFixed(2));

    const c = mode.tints[(Math.random() * mode.tints.length) | 0];
    /* ⚠️ 飄浮的小圖案跟按鈕上那顆「不一定要是同一個」（v30）。
          按鈕是靜止的 17px，三個人看得清楚；但飄起來只有 9～19px、
          還一邊縮放一邊淡出 —— 側邊那兩個半透明的人會糊成一團，
          看起來就像「什麼都沒飄出來」。這正是模組註解裡那句
          「完整圓弧在 17px 下會糊成一團」再小一號的版本。
          → 飄浮版換成單人剪影：同樣的意思，但它是一個實心塊，
            在 9px 下還讀得出來，跟私人房的愛心一樣有份量。 */
    el.innerHTML = (mode.bit || mode.icon)(size.toFixed(0), c);

    this.alive++;
    el.addEventListener("animationend", () => { el.remove(); this.alive--; }, { once: true });
    field.appendChild(el);
  },

  burst() {
    const n = this.PER_TAP + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) setTimeout(() => this.spawn(), i * 55);
  },

  tap() {
    if (!S.bumpHeart) return;                 // 還沒連上線
    this.mine++;
    this.paint();
    this.burst();
    this.pop("+1");
    this.pending++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.FLUSH_MS);
  },

  /* 一次送出 N 次（v52，長按 5 秒輸入的那條路）。
     ⚠️ 動畫走 Miss.shower()，**不是**跑 N 次 burst() ——
        burst() 一次生 4～5 顆而且沒有上限，999 次會直接生出四千個節點把手機打死。
        Miss 那邊本來就有同時數、單次上限與逐幀預算（v40 做的），照用就好。
     ⚠️ 動畫上限 240 顆，但**數字是精確的** —— 看到的顆數跟送出的次數不一樣是刻意的，
        使用者知道自己打了幾。
     ⚠️ 一樣走 pending／flush 那條路，跟連點合併成同一次 increment。 */
  bulk(n) {
    const add = Math.max(1, Math.min(999, Math.floor(Number(n) || 0)));
    if (!S.bumpHeart) return;
    this.mine += add;
    this.paint();
    this.pop(`+${add}`);
    Miss.shower(add);
    this.pending += add;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.FLUSH_MS);
  },

  flush() {
    const n = this.pending;
    this.pending = 0;
    clearTimeout(this.timer); this.timer = null;
    if (!n || !S.bumpHeart) return;
    S.bumpHeart(n).catch((err) => console.error("計數寫入失敗", err));
  },

  /* 雲端來的新數字。mine 以雲端為準（換裝置也對得起來），
     peer 變大就代表對方剛按了。 */
  /* v57：把本機那個「只能往上」的基準降下來。
     ⚠️ 一定要在**送出寫入的同一刻**呼叫，不能等雲端回來再降 ——
        雲端回來的是較小的數字，而 onData 的 Math.max 會把它擋掉，
        畫面上的思念就永遠停在花費前的數字。 */
  spend(n) {
    const d = Number(n) || 0;
    this.mine = Math.max(0, this.mine - d);
    this.paint();
  },

  onData(map) {
    const all = map || {};
    this.raw = all;                      // v57：付費照顧要知道對方那格在哪、有多少
    let mine = 0, peer = 0;
    const me = bondId();
    for (const [cid, v] of Object.entries(all)) {
      const n = Number(v) || 0;
      if (cid === me) mine += n; else peer += n;
    }
    /* ⚠️ 只能往上，不能往下。
          按下去的當下畫面就 +1 了（樂觀更新），但那一筆要等 FLUSH_MS 後才寫進雲端 ——
          這中間雲端回來的數字是舊的，直接採用的話畫面會「倒退一下再跳回去」。
          歸零只發生在清除對話，那條路徑走的是 reset()。
       ⚠️⚠️ v57 起思念**會被花掉**（使用者選的），所以這條「只能往上」不再絕對。
          但**不可以直接把 Math.max 拿掉** —— 拿掉的話上面那個樂觀 +1 的延遲
          就會讓數字倒退再跳回去，那個 bug 會回來。
          做法是：花費的當下用 spend() 把**本機基準**一起降下來，
          雲端回來的較小值就不再比基準小，Math.max 自然放行。 */
    this.mine = Math.max(this.mine, mine);
    const grew = peer - this.peer;
    this.peer = peer;
    this.paint();

    if (!this.primed) {
      this.primed = true;
      this.measure(peer);
      this.remember(peer);
      this.placeMarks();
      return;
    }
    if (grew > 0) {
      this.burst();
      const btn = $(Bond.cur().btn);
      if (btn) { btn.classList.remove("peer"); void btn.offsetWidth; btn.classList.add("peer"); }
      this.remember(peer);
    }
  },

  /* 比較基準：「我上次離開時，別人的計數是多少」。
     ⚠️ 這一筆刻意留在本機（localStorage），不上雲端 ——
        它每次對方按都要更新，寫上去等於把「你幾點還在看螢幕」一路記給雲端。
        鍵名用房間位址（本來就是密碼推導出的 32 字亂碼，看不出是哪一間），
        跟貼圖庫、照片暫存同一個等級。
     ⚠️ 標記清單本身則在雲端（加密），這樣換裝置接得上 —— 兩者刻意分開。 */
  /* ⚠️ 鍵名要含「我是誰」（v29）。只用房號的話，同一台裝置換一組個人密碼登入
        （或打錯一碼變成新身分）之後，自己以前按的次數會整包從 mine 跑到 peer，
        差額直接爆掉 —— 進房就跳出「大家想念了你 175 次」，其實那是自己按的。
        接不上舊鍵沒關係：measure() 遇到 null 會當成「第一次進這間房」直接跳過，
        不會算出錯的數字，下一次就正常了。 */
  key() { return `sc-h-${S.roomId}-${bondId()}`; },

  /* 清除對話專用：基準、標記、畫面全部一起抹掉。
     ⚠️ 只抹一半的話下次進來會拿「舊的大數字」去比新的小數字，
        算出負的差額（或永遠不顯示）。 */
  wiped() {
    const k = this.key();
    if (S.roomId) ReadMark.forget(S.roomId);   // 對話都清了，「讀到哪」也不該留
    S.marks = [];
    if (S.dropMarks) S.dropMarks().catch(() => {});
    this.reset();
    try { localStorage.removeItem(k); } catch (_) {}
  },

  remember(peer) {
    try { localStorage.setItem(this.key(), String(peer)); } catch (_) {}
  },

  /* 緊急退出用：一次清掉所有房間的比較基準（v29）。
     ⚠️ 鍵名是 `sc-h-<32 字房間位址>-<身分>`，那串房間位址由密碼推導出來，
        規則又只要求 auth != null —— 留在被搶走的手機上等於留了半把鑰匙。
     ⚠️ 要先收集再刪，邊列舉邊 removeItem 會漏掉一半（跟 MemberStore 同一個坑）。 */
  clearAll() {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sc-h-")) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  },

  /* 算出「這次不在的時候被想念幾次」，先存起來，等訊息載完再變成標記。 */
  measure(peer) {
    let last = null;
    try { last = localStorage.getItem(this.key()); } catch (_) {}
    if (last === null) return;              // 第一次進這間房（或換過裝置），沒有比較基準
    const diff = peer - (Number(last) || 0);
    if (diff > 0) this.pendingDiff = diff;
  },
};

/* 飄浮愛心的五種粉。⚠️ 寫死不用 CSS 變數 —— 這裡要的是「隨機挑一個」，
   而 getComputedStyle 每顆都查一次是白花的成本。 */
const HEART_PINKS = ["#ff6b9d", "#ff8fb1", "#f7a8c4", "#ff9fc0", "#e8749a"];
/* ⚠️ 五個色階都要「在深色背景上還看得見」。
      原本最暗的兩個（#d99b3a / #c9862b）飄起來會沉進背景，
      跟粉紅那一組的亮度對不齊 —— 那是多人房的效果看起來比較弱的另一半原因。 */
const FRIEND_AMBERS = ["#f0a437", "#e8b45c", "#e5a63f", "#f5bb6a", "#dfa14a"];

/* ────────── 思念（私人房）／友誼（多人房）──────────
 *
 * 這是「同一個模組的兩張皮」，不是兩個功能：
 *   同一個資料節點（heart/<裝置>）、同一套合併寫入、同一套動畫規則、
 *   同一個 Heart 物件。差別只有圖案、顏色與三句文案。
 *
 * ⚠️ 刻意共用 heart 節點，不另外開一個 friend 節點 ——
 *    多一個節點就要多改一次資料庫規則、多一條訂閱，而換來的只是換個名字。
 *    一間房不可能同時是私人房和多人房，共用不會撞。
 *
 * ⚠️ 兩顆按鈕在 HTML 裡都存在，靠 applyRoomMode() 決定顯示哪一顆。
 *    所有會碰到 DOM 的地方都要走 Bond.cur()，不可以寫死 id ——
 *    寫死的話多人房會去操作那顆藏起來的愛心，動畫飄不出來而且找不到原因。 */
const BOND = {
  private: {
    btn: "btnHeart", field: "heartField", num: "heartNum", pop: "heartPop",
    tints: HEART_PINKS,
    icon: (s, c) =>
      `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">` +
      `<path fill="${c}" d="M12 20.7 4.9 13.9C2.6 11.7 2.7 8 5.1 6a4.6 4.6 0 0 1 6.2.3l.7.7.7-.7a4.6 4.6 0 0 1 6.2-.3c2.4 2 2.5 5.7.2 7.9L12 20.7Z"/></svg>`,
    them: "對方",
  },
  open: {
    btn: "btnFriend", field: "friendField", num: "friendNum", pop: "friendPop",
    tints: FRIEND_AMBERS,
    /* 三人半身。⚠️ 側邊兩個人的肩線要「切齊 viewBox 邊緣」而不是畫成完整的圓弧 ——
       在 17px 下完整圓弧會跟中間那個人糊成一團，切齊反而讀得出是三個人。 */
    icon: (s, c) =>
      `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">` +
      `<g fill="${c}" opacity=".5">` +
      `<circle cx="4.2" cy="8.2" r="2.5"/>` +
      `<path d="M4.2 11.9c-2.4 0-4.2 1.5-4.2 3.5v.8h8.4v-.8c0-2-1.8-3.5-4.2-3.5Z"/>` +
      `<circle cx="19.8" cy="8.2" r="2.5"/>` +
      `<path d="M19.8 11.9c-2.4 0-4.2 1.5-4.2 3.5v.8H24v-.8c0-2-1.8-3.5-4.2-3.5Z"/></g>` +
      `<circle cx="12" cy="7.4" r="3.6" fill="${c}"/>` +
      `<path fill="${c}" d="M12 12.6c-3.6 0-6.4 2.2-6.4 5.1v1.1h12.8v-1.1c0-2.9-2.8-5.1-6.4-5.1Z"/></svg>`,
    /* 飄浮用的單人剪影 —— 實心、沒有半透明的部分，小尺寸才看得見 */
    bit: (s2, c2) =>
      `<svg viewBox="0 0 24 24" width="${s2}" height="${s2}" aria-hidden="true">` +
      `<circle cx="12" cy="7" r="4.2" fill="${c2}"/>` +
      `<path fill="${c2}" d="M12 12.4c-4 0-7 2.5-7 5.7V20h14v-1.9c0-3.2-3-5.7-7-5.7Z"/></svg>`,
    them: "大家",
  },
};

const Bond = {
  cur() { return S.open ? BOND.open : BOND.private; },

  /* 換房型時把「另一張皮」的殘留畫面清乾淨。
     ⚠️ 不清的話，上一間房飄到一半的愛心會留在多人房的上方列裡。 */
  applyMode() {
    for (const m of [BOND.private, BOND.open]) {
      const f = $(m.field);
      if (f && m !== this.cur()) f.replaceChildren();
      const p = $(m.pop);
      if (p) p.hidden = true;
    }
    Heart._el = null;                       // 提示節點的快取要跟著房型重新指定
    /* ⚠️ 泡泡也要一起收 —— 它是生在 #chat 底下的，不在上面那兩個 field 裡，
          上面那個迴圈掃不到。不收的話上一間房飄到一半的泡泡會留在下一間房。 */
    Miss.stop();
    Heart.paint();
  },
};


/* ────────────────────────── 4d. 思念泡泡 ──────────────────────────
 *
 * 收到「你不在的時候，◯◯想念了你 N 次」的當下，
 * 從輸入列上緣的隨機位置往上飄出 N 顆泡泡，大小／位置／透明度全部隨機。
 * 私人房是粉色愛心、多人房是暖橘小人 —— 跟 Bond 同一套圖與同一組色，不另外定義。
 *
 * ⚠️ 這是「一次性的效果」，不是常駐動畫。只在那一枚標記剛產生時播一次；
 *    往上捲看到舊的標記不會再播 —— 不然每捲一次就炸一次畫面。
 *    （觸發點在 Heart.placeMarks() 的最後，看那邊的說明。）
 *
 * ⚠️ 泡泡要「順順地」往上飄，不可以一頓一頓的。頓點有兩個來源，兩個都要防：
 *      ‧ CSS 端：關鍵影格一多，timing function 就會每一段各跑一次
 *        → 見 style.css 裡 .c-miss-bit 那段（這是使用者第一眼就退回來的問題）
 *      ‧ JS 端：同時數滿了之後如果把積欠的顆數「一次補完」，
 *        畫面上會看到一叢一叢的 → 所以每一幀最多只補 PER_FRAME 顆
 *
 * ⚠️ 數量真的照 N 走，但有三道閘：
 *      ‧ 同時最多 MAX_ALIVE 顆（保護低階手機，滿了就等前面的飄完再補）
 *      ‧ 一次最多 MAX_TOTAL 顆（次數本身照實顯示，只是不會真的生上千個節點）
 *      ‧ 系統開了「減少動態」或分頁在背景 → 整個不播
 *
 * ⚠️ 排程走單一 rAF，不是 N 個 setTimeout。
 *    175 個 setTimeout 會在同一輪事件迴圈裡排出 175 個計時器，
 *    低階手機光排程就先卡一下 —— 而且離開房間時還得一個一個取消。
 *
 * ⚠️ 「該放到第幾顆」是照時間算的，不是照幀數算。
 *    照幀數算的話掉幀時整個節奏會跟著變慢，慢的機器反而播得更久。
 * ─────────────────────────────────────────────────────────── */

const Miss = {
  MAX_ALIVE: 80,        // 同時最多幾顆
  MAX_TOTAL: 240,       // 一次最多灑幾顆
  WINDOW_MS: 3200,      // 希望在這段時間內灑完
  MIN_GAP_MS: 12,       // 兩顆之間最短間隔
  PER_FRAME: 3,         // 單一幀最多補幾顆（卡住之後不要一叢一叢地爆出來）
  DUR: [4.0, 6.6],      // 每一顆從冒出到淡掉多久（秒）——使用者選的「慢版」

  raf: 0,

  /* ⚠️ 「現在有幾顆」直接數節點，不自己記一個計數器。
        記帳版有一個很難查的死法：泡泡是靠 animationend 自刪的，
        但只要那顆元素在動畫跑完前變成 display:none（例如中途開了「減少動態」），
        animationend 就永遠不會來 —— 計數器會卡在非零，之後每一次都被
        「同時數已滿」擋掉，功能等於整個死掉，而且沒有任何錯誤訊息。
        數節點的話，節點被清掉就是 0，不可能對不上。 */
  alive(f) { return f ? f.childElementCount : 0; },

  /* 泡泡都生在這一層裡。
     ⚠️ 下緣切齊輸入列上緣 —— 泡泡從這裡冒出來才會像是從輸入框飄出去的。
     ⚠️ 上緣切齊上方列下緣 —— 不切的話泡泡會蓋到在線狀態與計數。
     兩個邊界每次都要重量：鍵盤彈出、輸入框變成多行，高度都會變。 */
  field() {
    const chat = $("chat");
    if (!chat) return null;
    let f = $("missField");
    if (!f) {
      f = document.createElement("div");
      f.id = "missField";
      f.className = "c-miss-field";
      f.setAttribute("aria-hidden", "true");
      chat.appendChild(f);
    }
    const box = chat.getBoundingClientRect();
    const bar = $("sendForm");
    const head = chat.querySelector(".c-bar");
    f.style.top = (head ? head.getBoundingClientRect().bottom - box.top : 48) + "px";
    f.style.bottom = (bar ? bar.getBoundingClientRect().height : 56) + "px";
    return f;
  },

  spawn(f, mode) {
    if (this.alive(f) >= this.MAX_ALIVE) return false;
    const w = f.clientWidth, h = f.clientHeight;
    if (!w || !h) return false;

    const rnd = (a, z) => a + Math.random() * (z - a);
    const size = rnd(11, 26);

    const el = document.createElement("span");
    el.className = "c-miss-bit";
    el.style.left = (rnd(0.06, 0.94) * w - size / 2) + "px";
    el.style.bottom = rnd(-2, 14) + "px";
    /* 飄多高：最矮的到半途就散掉，最高的一路到訊息區頂端 —— 層次是這樣來的 */
    el.style.setProperty("--rise", rnd(h * 0.42, h * 0.98).toFixed(0) + "px");
    /* 一路從小長到大：連續的、沒有轉折，跟等速上升疊在同一條動畫裡 */
    el.style.setProperty("--s0", rnd(0.55, 0.92).toFixed(2));
    el.style.setProperty("--s1", rnd(0.94, 1.22).toFixed(2));
    /* 擺動：半幅、角度、週期、起始相位，每顆都不一樣 */
    el.style.setProperty("--sx", rnd(5, 17).toFixed(1) + "px");
    el.style.setProperty("--rot", rnd(4, 15).toFixed(0) + "deg");
    el.style.setProperty("--swayd", rnd(2.4, 4.2).toFixed(2) + "s");
    el.style.setProperty("--swayo", (-rnd(0, 4.2)).toFixed(2) + "s");
    /* ⚠️ 最濃的一顆也要留得住底下的字。0.75 以上會把訊息糊掉 ——
          「隨機透明度」的重點是層次，不是遮住畫面。 */
    el.style.setProperty("--peak", rnd(0.20, 0.62).toFixed(2));
    el.style.setProperty("--dur", rnd(this.DUR[0], this.DUR[1]).toFixed(2) + "s");

    const c = mode.tints[(Math.random() * mode.tints.length) | 0];
    /* ⚠️ 多人房用的是 bit（實心單人剪影）而不是按鈕上那顆三人圖 ——
          11px 下三個人會糊成一團，看起來就像什麼都沒飄出來。跟 v30 同一個坑。 */
    el.innerHTML = (mode.bit || mode.icon)(size.toFixed(0), c);

    /* ⚠️ 外層掛了兩條動畫（上升、淡出），animationend 會來兩次 —— once 只收第一次。
          裡面那個 <svg> 的擺動是 infinite，永遠不會發 animationend，
          但還是擋一下 target，免得哪天有人把它改成有限次數，泡泡會提早被砍掉。 */
    el.addEventListener("animationend", (e) => {
      if (e.target === el) el.remove();
    }, { once: true });
    f.appendChild(el);
    return true;
  },

  /* n = 這次「不在的時候被想念幾次」。 */
  /* ⚠️ modeOverride 是給「愛」關鍵字用的（v46）：
        關鍵字是「愛」，所以**多人房也要飄粉紅愛心**，不可以跟著房型變成琥珀色的三人圖 ——
        那個圖案跟「愛」對不上（使用者決定的）。沒帶就照房型走，行為跟以前一樣。 */
  shower(n, modeOverride) {
    n = Number(n) || 0;
    if (n <= 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;              // 分頁在背景就不要浪費效能

    const f = this.field();
    if (!f) return;
    const mode = modeOverride || Bond.cur();

    const total = Math.min(n, this.MAX_TOTAL);
    const gap = Math.max(this.MIN_GAP_MS, this.WINDOW_MS / total);
    const t0 = performance.now();
    /* ⚠️ 一定要有死線。spawn() 失敗（同時數滿了、或聊天室這時候是隱藏的所以量到 0×0）
          時 done 不會前進，沒有死線的話這個 rAF 迴圈會永遠轉下去。
          正常情況最久的一次（240 顆、慢版、被同時數節流）大約 20 秒，這裡給到 40 秒。 */
    const deadline = t0 + this.WINDOW_MS + 40000;
    let done = 0;

    cancelAnimationFrame(this.raf);
    const step = (t) => {
      this.raf = 0;
      const want = Math.min(total, Math.floor((t - t0) / gap) + 1);
      let budget = this.PER_FRAME;
      while (done < want && budget > 0) {
        if (!this.spawn(f, mode)) break;      // 同時數滿了，這一幀先跳過
        done++; budget--;
      }
      if (done < total && t < deadline) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  /* 離開房間／換房型／清除對話時整組收掉。
     ⚠️ 不收的話，上一間房還沒飄完的泡泡會留在下一間房的畫面上。 */
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const f = $("missField");
    if (f) f.replaceChildren();
  },
};


/* ────────────────────────── 4e. 位置回報 ──────────────────────────
 *
 * 偽裝首頁上一顆平常看不到的大頭針：長按 Google logo 才淡入，
 * 按下去把座標「密封」後丟上雲，只有管理儀表板解得開。
 *
 * 方向是「對方分享給我」，不是我分享給對方。
 *
 * ⚠️ 為什麼是非對稱加密（密封信箱）：
 *    偽裝頁是公開的，config.js 裡的東西全世界都下載得到。
 *    所以那裡**不能放任何解得開的鑰匙** —— 只放公鑰，它只能把東西塞進去。
 *    偽裝頁投完信之後連自己都解不開，這是整個設計的重點。
 *
 * ⚠️⚠️ 私鑰**不在 config.js 裡**（這一點跟第一版規格不同，是刻意改掉的）。
 *    私鑰即使用 admin 密碼鎖過，只要跟著 config.js 一起公開發布，
 *    任何人都能抓回家「完全離線」慢慢試密碼 —— 不用連這個網站、
 *    不留任何痕跡、我們也不會知道有人在試。8 碼純數字是一億組，
 *    PBKDF2 31 萬次在單張高階顯卡上大約一個半小時就試完了。
 *    所以私鑰收在使用者自己的密碼檔裡，第一次進儀表板貼一次，存在這台裝置上。
 *
 * ⚠️ 送出時**不帶任何身分欄位**。sc-cid 絕對不送 —— 送了就不匿名了。
 *    節流紀錄留在 localStorage，不上雲。
 *
 * ⚠️ 存座標，不存地圖連結。存 google.com/maps?q=… 等於把座標明文放進資料庫，
 *    加密整套白做。連結是儀表板解開之後現場組的。
 *
 * ⚠️ t 刻意是明文：push key 本來就編了時間，加密它擋不住任何人，而且排序要用。
 *    這是新增的明文代價 —— 外人（登入過的）看得到「有幾筆、幾點來的」，看不懂內容。
 * ─────────────────────────────────────────────────────────── */

/* 這幾個參數兩邊（網頁與金鑰工具）必須一模一樣，改任何一個都會對不起來。 */
const LOC_EC = { name: "ECDH", namedCurve: "P-256" };
const LOC_INFO = new TextEncoder().encode("sc-loc-v1");
const LOC_SALT = new TextEncoder().encode("sc-loc-v1");
const LOC_ITER = 310000;
const LOC_LAST = "sc-loc-last";         // 節流用的上次送出時間（本機）
/* 等定位等多久就放棄（毫秒）。
   ⚠️ 這不是 getCurrentPosition 的 timeout —— 那一個管不到「等人回答權限提示」，
      見 Loc.tap() 裡的說明。這是我們自己的看門狗，比它長一點。 */
const GEO_WAIT_MS = 20 * 1000;
const LOC_PAGE = 10;                    // 一次抓幾筆
const LOC_PRUNE = 20;                   // 進儀表板時順手檢查最舊的幾筆
const LOC_TIMEOUT_MS = 12 * 1000;

function locB64(buf) {
  const u = new Uint8Array(buf); let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
function locB64d(str) {
  const t = atob(str), u = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i);
  return u;
}
/* ⚠️ 一定要過一次 HKDF，不可以拿 ECDH 的原始輸出直接當 AES 金鑰。
      deriveBits 的 256 是 P-256 的曲線長度，不是「我想要幾位元的金鑰」——
      改成別的數字會直接失敗，或（更糟）跟另一邊算出不一樣的東西。 */
async function locShared(privKey, pubKey) {
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pubKey }, privKey, 256);
  const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: LOC_INFO },
    hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
/* 用 admin 密碼推出「開私鑰用的那把鎖」。
   ⚠️ 回傳的是不可匯出的 CryptoKey —— 推完就把密碼丟掉，記憶體裡不留明文。 */
async function locWrapKey(pw) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw),
    "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: LOC_SALT, iterations: LOC_ITER, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
/* 偽裝頁：投一封信（不需要任何密碼）。
   ⚠️ 每一筆都用「一次性金鑰對」，用完即丟。這是匿名性的一部分，不是裝飾 ——
      同一個人按十次，十筆密文彼此看不出關聯。 */
async function locSeal(lat, lng, acc) {
  const pub = await crypto.subtle.importKey("raw", locB64d(String(CFG.locPub).trim()), LOC_EC, false, []);
  const eph = await crypto.subtle.generateKey(LOC_EC, true, ["deriveBits"]);
  const key = await locShared(eph.privateKey, pub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key,
    new TextEncoder().encode(JSON.stringify({ lat, lng, acc })));
  return { ek: locB64(await crypto.subtle.exportKey("raw", eph.publicKey)), iv: locB64(iv), c: locB64(c) };
}
/* 儀表板：把私鑰解開（進儀表板時做一次，之後重用）*/
async function locUnwrap(wrapKey, privB64) {
  const raw = locB64d(String(privB64).trim());
  const p8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, wrapKey, raw.slice(12));
  return crypto.subtle.importKey("pkcs8", p8, LOC_EC, false, ["deriveBits"]);
}
/* 儀表板：解一筆 */
async function locOpen(privKey, rec) {
  const ep = await crypto.subtle.importKey("raw", locB64d(rec.ek), LOC_EC, false, []);
  const key = await locShared(privKey, ep);
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: locB64d(rec.iv) }, key, locB64d(rec.c));
  return JSON.parse(new TextDecoder().decode(out));
}

const Loc = {
  /* 總開關。⚠️ 沒有公鑰等於沒設定完，這時候也要當作關的 ——
        不然按下去會在 locSeal() 丟例外，而偽裝頁上是看不到任何錯誤的。 */
  on() { return CFG.locationReport === true && !!String(CFG.locPub || "").trim(); },

  revealT: null, stateT: null, sending: false,

  /* ⚠️ 關掉時那顆按鈕「根本不進 DOM」，不是用 CSS 藏起來。
        藏起來的話，任何人檢視原始碼都看得到偽裝頁上有一顆奇怪的大頭針。 */
  init() {
    if (!this.on()) return;
    const bell = $("gBell");
    if (!bell || $("locPin")) return;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "g-plain g-pin";
    b.id = "locPin";
    b.hidden = true;
    /* ⚠️ 不給 aria-label：讀螢幕軟體會把它念出來，偽裝就破了。
          aria-hidden 也一起給，讓它整個不進無障礙樹。 */
    b.setAttribute("aria-hidden", "true");
    b.setAttribute("tabindex", "-1");
    b.innerHTML =
      '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.05 6.24 12.31 6.5 12.62a.66.66 0 0 0 1 0C12.76 21.31 19 14.05 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"/></svg>';
    bell.after(b);
    b.addEventListener("click", () => this.tap());
    this.bindLongPress();
  },

  /* 長按 Google logo 才叫得出來。
     ⚠️ 位移超過 10 px 就取消 —— 不然「想捲動頁面」會被當成長按。
     ⚠️ 偽裝頁上的連點退出本來就不計數（initPanic 在 chat 與 admin 都隱藏時直接 return），
        所以長按失敗兩次不會導頁。這件事有測試守著，別把那個 return 拿掉。 */
  bindLongPress() {
    const logo = $("gLogo");
    if (!logo) return;
    let t = null, x0 = 0, y0 = 0;
    const cancel = () => { clearTimeout(t); t = null; };

    logo.addEventListener("pointerdown", (e) => {
      x0 = e.clientX; y0 = e.clientY;
      cancel();
      t = setTimeout(() => { t = null; this.reveal(); }, Number(CFG.locLongPressMs) || 1500);
    });
    logo.addEventListener("pointermove", (e) => {
      if (!t) return;
      if (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) cancel();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
      logo.addEventListener(ev, cancel));
  },

  reveal() {
    const pin = $("locPin");
    if (!pin) return;
    pin.hidden = false;
    void pin.offsetWidth;                   // 讓 transition 有起點可跑
    pin.classList.add("show");
    this.arm();
  },

  arm() {
    clearTimeout(this.revealT);
    this.revealT = setTimeout(() => this.hide(), Number(CFG.locRevealMs) || 5000);
  },

  /* ⚠️ 淡出結束一定要真的 hidden —— 只有 opacity: 0 的話它還按得到。 */
  hide() {
    clearTimeout(this.revealT); this.revealT = null;
    const pin = $("locPin");
    if (!pin) return;
    pin.classList.remove("show");
    setTimeout(() => { if (!pin.classList.contains("show")) pin.hidden = true; }, 300);
  },

  /* 回饋只有圖示自己變色 —— 不跳提示框、不出現任何中文字、不出聲。
     偽裝頁上冒出一句中文就等於當場破功。 */
  flash(cls) {
    const pin = $("locPin");
    if (!pin) return;
    clearTimeout(this.stateT);
    pin.classList.remove("busy", "ok", "bad");
    if (cls) pin.classList.add(cls);
    if (cls === "ok" || cls === "bad") {
      this.stateT = setTimeout(() => {
        pin.classList.remove("ok", "bad");
        this.hide();
      }, 800);
    }
  },

  /* 緊急退出：計時器與畫面狀態一起收掉。
     ⚠️ 本機退出（不導頁）時它不會自己消失，所以一定要在這裡清。 */
  reset() {
    clearTimeout(this.revealT); this.revealT = null;
    clearTimeout(this.stateT); this.stateT = null;
    this.sending = false;
    const pin = $("locPin");
    if (pin) { pin.classList.remove("show", "busy", "ok", "bad"); pin.hidden = true; }
  },

  queue: Promise.resolve(),
  tap(options = {}) {
    const job = this.queue.then(() => this.report(options));
    this.queue = job.catch(() => {});
    return job;
  },
  async report(options = {}) {
    const automatic = options.automatic === true;
    const consentVersion = options.consentVersion ?? AutoLocation.revision;
    const allowed = () => !automatic || (AutoLocation.enabled() && consentVersion === AutoLocation.revision);
    if (!allowed() || !this.on()) return;
    if (this.sending) return;
    clearTimeout(this.revealT);             // 進入狀態機，交棒給 flash 的計時器
    this.revealT = null;

    /* ⚠️ 節流只擋手滑，不是安全機制 —— 清瀏覽器資料就重置。
          擋惡意洗版的是 App Check，不是它。 */
    const cd = (Number(CFG.locCooldownSeconds) || 0) * 1000;
    let last = 0;
    try { last = +(localStorage.getItem(LOC_LAST) || 0); } catch (_) {}
    if (!automatic && cd && Date.now() - last < cd) {
      this.flash("bad");
      if (automatic) AutoLocation.status("近期已回報，本次不重複傳送");
      return;
    }

    this.sending = true;
    this.flash("busy");
    try {
      /* ⚠️⚠️ getCurrentPosition 的 timeout **不包含「等使用者回答權限提示」那一段**。
            實測（Chromium）：權限還沒被回答時，成功與失敗兩個回呼都不會來，
            而且 timeout: 10000 完全不觸發 —— 量到 14 秒還在等。
            沒有下面那道自己的看門狗的話，大頭針會在 Google 首頁上「永遠脈動」，
            偽裝當場破功，而且使用者完全不知道發生什麼事（畫面上不能出現任何文字）。
         ⚠️ 看門狗贏了之後，晚到的座標會被忽略（promise 已經結束了）——
            這是刻意的：那時候畫面已經紅過、也收起來了，再送出去會變成「按一下送兩筆」。 */
      const pos = await withTimeout(new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("no-geo"));
        navigator.geolocation.getCurrentPosition(res, rej,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      }), GEO_WAIT_MS);
      if (!allowed()) return;
      const { latitude, longitude, accuracy } = pos.coords;
      const sealed = await locSeal(
        +latitude.toFixed(6), +longitude.toFixed(6), Math.round(accuracy || 0));

      const f = await connect();
      const { db, ref, push, serverTimestamp } = f;
      if (!allowed()) return;
      /* ⚠️ t 一定要用 serverTimestamp()，不是本機時鐘 ——
            資料庫規則要求 t === now，本機錶差幾秒就會被整筆拒絕。
         ⚠️ 這裡不帶任何身分欄位。sc-cid 絕對不送 —— 送了就不匿名了。
         ⚠️ 用 push(ref, 值) 的兩參數寫法，不要寫成 set(push(ref), 值)：
            後者要靠 push() 回傳的 ThenableReference，可讀性差而且模擬層對不上。 */
      await withTimeout(push(ref(db, "loc"), {
        t: serverTimestamp(), ek: sealed.ek, iv: sealed.iv, c: sealed.c,
      }), LOC_TIMEOUT_MS);

      /* ⚠️ 送出成功才寫回節流時間。失敗也記的話 = 白白靜音一輪（同 v28 的 lm）。 */
      try { localStorage.setItem(LOC_LAST, String(Date.now())); } catch (_) {}
      this.flash("ok");
      if (automatic) AutoLocation.status("本次解鎖位置已回報");
    } catch (_) {
      /* 權限被拒、逾時、寫入失敗 —— 一律紅一下就好。
         偽裝頁上不能分辨原因，這是「不能出現任何中文」的必然代價。 */
      this.flash("bad");
      if (automatic && allowed()) AutoLocation.status("本次未取得或未能回報位置；請檢查瀏覽器定位權限");
    } finally {
      this.sending = false;
    }
  },
};

const AutoLocation = {
  key: "sc-auto-location-consent-v1",
  revision: 0,
  enabled() {
    try { return JSON.parse(localStorage.getItem(this.key))?.enabled === true; } catch (_) { return false; }
  },
  status(text) { const el = $("autoLocationStatus"); if (el) el.textContent = text; },
  set(enabled) {
    if (enabled === this.enabled()) { this.sync(); return; }
    this.revision++;
    try {
      if (enabled) localStorage.setItem(this.key, JSON.stringify({ enabled: true, at: Date.now(), version: 1 }));
      else localStorage.removeItem(this.key);
    } catch (_) { this.status("無法儲存選擇，自動回報未啟用"); return; }
    this.sync();
    this.status(enabled ? "已開啟：每次首頁密碼驗證成功後回報位置" : "已關閉自動回報位置");
  },
  sync() {
    for (const id of ["homeAutoLocation", "setAutoLocation", "autoLocationChoice"]) {
      const el = $(id); if (el) el.checked = this.enabled();
    }
  },
  async run() {
    if (!this.enabled() || !Loc.on()) return;
    this.status("正在取得本次位置…");
    await Loc.tap({ automatic: true, consentVersion: this.revision });
  },
  init() {
    this.sync();
    for (const id of ["setAutoLocation", "autoLocationChoice"]) $(id)?.addEventListener("change", (e) => {
      this.set(e.target.checked);
    });
    $("homeAutoLocation")?.addEventListener("change", (e) => { if (!e.target.checked) this.set(false); });
    for (const el of document.querySelectorAll("[data-location-settings]")) el.addEventListener("click", (e) => {
      e.preventDefault(); this.sync(); $("autoLocationDialog").showModal();
    });
    $("autoLocationClose").addEventListener("click", () => $("autoLocationDialog").close());
    window.addEventListener("storage", (e) => { if (e.key === this.key || e.key === null) { this.revision++; this.sync(); } });
  },
};

/* ────────── 位置回報 · 儀表板那一側 ────────── */
/* ────────── 裝置備註（v53）──────────
 *
 * 使用者要的是「有沒有別人進過我的房間」。答案是 sc-cid：每台裝置一個固定代號，
 * 換 Wi-Fi、換基地台都不會變，清掉瀏覽器資料才會變。
 * 所以這裡存的是「**我認得哪些代號**」，不是一份登入日誌 ——
 * 資料量幾乎是零，也不會累積出一份「對方的作息表」躺在雲端。
 *
 * ⚠️ 存在 devnote/<admin 密碼推導的 32 字位址>/<房號>/<裝置代號>，
 *    跟 locpush 同一套祕密位址：拿到房間密碼的人算不出這個路徑。
 * ⚠️ 而且備註本身再用 admin 金鑰加密一次。備註是你自己寫的字
 *    （「他的 iPhone」「我公司電腦」），那比裝置代號本身敏感得多。
 * ⚠️ 「刪除」＝ 連 devnote 與 rooms/<房號>/seen 兩邊一起刪。
 *    只刪備註的話那台還是「看過的」，下次進來不會重新判定 —— 那就不是使用者要的。
 */
const DevNote = {
  path: null,        // devnote/<32 字位址>
  key: null,         // admin 密碼推導出來的 AES 金鑰（不可匯出，離開儀表板就沒了）

  arm(pathId, key) {
    this.path = pathId && pathId.length === 32 ? `devnote/${pathId}` : null;
    this.key = key || null;
  },
  ready() { return !!(this.path && this.key); },

  /* 讀這間房「認得的裝置」→ Map(cid → 備註字串) */
  async load(roomId) {
    const out = new Map();
    if (!this.ready()) return out;
    const { db, ref, get } = await connect();
    const snap = await get(ref(db, `${this.path}/${roomId}`));
    const all = snap.val() || {};
    for (const [cid, rec] of Object.entries(all)) {
      let note = "";
      /* 解不開就當成「認得但沒備註」—— 換過 admin 密碼會走到這裡。
         ⚠️ 不可以當成「不認得」：那會把整份清單變成一片紅色警報。 */
      try { if (rec && rec.iv && rec.c) note = String((await unseal(this.key, rec)).n || ""); }
      catch (_) { note = ""; }
      out.set(cid, note);
    }
    return out;
  },

  async save(roomId, cid, note) {
    if (!this.ready()) return;
    const { db, ref, set } = await connect();
    const sealed = await seal(this.key, { n: String(note || "").slice(0, 40) });
    await set(ref(db, `${this.path}/${roomId}/${cid}`), {
      t: Date.now(), iv: sealed.iv, c: sealed.c,
    });
  },

  /* 刪除 ＝ 取消認得。兩邊都要清，那台下次進來才會重新被判成新裝置。 */
  async drop(roomId, cid) {
    const { db, ref, remove } = await connect();
    const jobs = [remove(ref(db, `rooms/${roomId}/seen/${cid}`))];
    if (this.ready()) jobs.push(remove(ref(db, `${this.path}/${roomId}/${cid}`)));
    await Promise.all(jobs);
  },
};

const LocAdm = {
  priv: null,           // 解開後的私鑰（只在記憶體，離開儀表板就沒了）
  err: "",              // 解不開時要對使用者說的那一句
  rows: [],             // [{ k, t, lat, lng, acc }]
  total: null,
  busy: false,
  reachedTop: false,

  /* 進儀表板時做一次：用剛才打的 admin 密碼把 config.js 裡那把私鑰解開。
     ⚠️ 使用者要的是「只打密碼就好」，所以私鑰跟著 config.js 走，不再需要任何貼上動作。
     ⚠️ 自動重查**不會**再跑這裡 —— PBKDF2 31 萬次每分鐘來一次會卡住畫面
        （同 v33「重查不重新推導密碼」）。
     ⚠️ 密碼推完就丟：記憶體裡留的是不可匯出的 CryptoKey，不是密碼本身。 */
  async arm(pw) {
    if (!Loc.on()) { this.paintOff(); return; }
    this.reset();
    const blob = String(CFG.locPriv || "").trim();
    if (blob) {
      try {
        const wk = await locWrapKey(pw);
        this.priv = await locUnwrap(wk, blob);
      } catch (_) {
        /* 解不開只有兩種可能：locPriv 跟 locPub 不是同一次產生的，
           或者換過 admin 密碼卻沒重跑金鑰工具。兩種都要講出來，
           不然畫面上只會是一片空白，完全看不出哪裡錯。 */
        this.priv = null;
        this.err = "解不開 —— 請用現在的 admin 密碼重跑一次金鑰工具，把兩行重新貼進 config.js";
      }
    } else {
      this.err = "config.js 的 locPriv 還是空的 —— 請跑一次金鑰工具，把兩行都貼進去";
    }
    this.paint();
    if (this.priv) this.load();
  },

  keepMs() { return (Number(CFG.locKeepDays) || 7) * 86400000; },

  /* 抓最近幾筆。⚠️ 一次拿 10 筆（總共才 2 KB），前端自己控制顯示 3 或 10，
        展開不用再查一次。
     ⚠️ 絕對不要 get(ref(db,"loc")) 不加 query —— 那等於整包下載（坑 #74）。 */
  async load() {
    if (this.busy || !this.priv) return;
    this.busy = true;
    try {
      const f = await connect();
      const { db, ref, get, query, orderByKey, limitToLast } = f;
      const snap = await withTimeout(
        get(query(ref(db, "loc"), orderByKey(), limitToLast(LOC_PAGE))), LOC_TIMEOUT_MS);
      const raw = [];
      /* ⚠️ 一定要用大括號吞掉回傳值 —— DataSnapshot.forEach 只要回呼回傳真值就中止，
            寫成 snap.forEach((c) => raw.push(c)) 的話永遠只拿得到第一筆（坑 #1）。 */
      snap.forEach((c) => { raw.push({ k: c.key, ...(c.val() || {}) }); });
      this.rows = await this.decode(raw);
      this.reachedTop = raw.length < LOC_PAGE;
      /* 看過了 → 鈴鐺的紅點要熄掉（v42）。
         ⚠️ 只在「第一頁」推進，往前翻舊的不算看過新的。 */
      LocSeen.mark(this.rows);
      this.count();
      this.prune();
    } catch (_) {
      /* 連不上就維持原狀，不要把畫面清成「沒有回報」—— 那會讓人以為對方沒按 */
    } finally {
      this.busy = false;
      this.paint();
    }
  },

  /* 往前再抓一頁。
     ⚠️ 短頁不可以直接當成「到頂」（坑 #106 / v37）—— 再花一個只抓 1 筆的查詢確認，
        確認不了一律當作還有。 */
  async loadOlder() {
    if (this.busy || !this.priv || !this.rows.length) return;
    this.busy = true;
    this.paint();
    try {
      const f = await connect();
      const { db, ref, get, query, orderByKey, limitToLast, endBefore } = f;
      const oldest = this.rows[this.rows.length - 1].k;
      const snap = await withTimeout(
        get(query(ref(db, "loc"), orderByKey(), endBefore(oldest), limitToLast(LOC_PAGE))),
        LOC_TIMEOUT_MS);
      const raw = [];
      snap.forEach((c) => { raw.push({ k: c.key, ...(c.val() || {}) }); });
      if (raw.length) this.rows = this.rows.concat(await this.decode(raw));
      if (raw.length < LOC_PAGE) {
        const key = this.rows.length ? this.rows[this.rows.length - 1].k : oldest;
        const chk = await withTimeout(
          get(query(ref(db, "loc"), orderByKey(), endBefore(key), limitToLast(1))), LOC_TIMEOUT_MS);
        let n = 0; chk.forEach(() => { n++; });
        this.reachedTop = n === 0;
      }
    } catch (_) {
      this.reachedTop = false;            // 確認不了就當作還有，讓他可以再按一次
    } finally {
      this.busy = false;
      this.paint();
    }
  },

  /* 解密。⚠️ 解不開的那一筆不可以靜靜消失，畫成「解不開」——
        跟訊息那邊同一條規矩（坑 #5）。 */
  async decode(raw) {
    const out = [];
    for (const r of raw) {
      const row = { k: r.k, t: Number(r.t) || 0 };
      try {
        const v = await locOpen(this.priv, r);
        row.lat = v.lat; row.lng = v.lng; row.acc = Number(v.acc) || 0;
      } catch (_) { row.bad = true; }
      out.push(row);
    }
    out.sort((a, b) => (a.k < b.k ? 1 : -1));     // 新的在前
    return out;
  },

  /* 總筆數：shallow 只回鍵、不回內容。⚠️ 不要 get() 整包（坑 #74）。 */
  async count() {
    try {
      const { auth } = await connect();
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${CFG.firebase.databaseURL}/loc.json?shallow=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const keys = await res.json();
      this.total = keys ? Object.keys(keys).length : 0;
    } catch (_) { this.total = null; }
  },

  /* 過期清理：只碰最舊的 20 筆，超過保留天數的就地刪掉。
     跟 v25「進房順手清 presence 殘骸」同一招 —— 自己會好，不需要排程。
     ⚠️ 一定要用伺服器時間比（serverOffset 之後）：本機錶不準的話會產生一堆
        被規則拒絕的無效寫入。
     ⚠️ 規則只允許刪「保留天數以前」的，所以刪錯也刪不掉，最多是白跑一趟。 */
  async prune() {
    try {
      const f = await connect();
      const { db, ref, get, query, orderByKey, limitToFirst, remove } = f;
      const offset = await serverOffset(f);
      const cutoff = Date.now() + offset - this.keepMs();
      const snap = await withTimeout(
        get(query(ref(db, "loc"), orderByKey(), limitToFirst(LOC_PRUNE))), LOC_TIMEOUT_MS);
      const doomed = [];
      snap.forEach((c) => {
        const t = Number((c.val() || {}).t) || 0;
        if (t && t < cutoff) doomed.push(c.key);
      });
      if (!doomed.length) return;
      await Promise.all(doomed.map((k) => remove(ref(db, `loc/${k}`)).catch(() => {})));
      this.rows = this.rows.filter((r) => !doomed.includes(r.k));
      this.count();
    } catch (_) {}
  },

  paintOff() {
    const box = $("admLoc");
    if (box) box.hidden = true;
  },

  /* 一鍵清空：把 loc 底下整包刪掉。
     ⚠️ 分頁刪，不是 remove(ref(db,"loc")) 一次砍 —— 一次砍要先把整包載下來
        （SDK 會先讀再寫），資料多的時候等於整包下載一次（坑 #74）。
        照 key 一頁一頁刪，每一頁只帶鍵不帶內容。
     ⚠️ 刪完要把「看過到哪」也往前推，不然鈴鐺會因為「最新的那筆不見了」
        而永遠停在舊的標記上（其實不會亮，但狀態是髒的）。
     ⚠️ 資料庫規則現在允許「登入過就刪得掉」—— 使用者要這顆按鈕，
        而規則沒辦法驗證誰是管理員（大家都是匿名的）。代價是別人也刪得掉，
        但他們看不懂內容，而且這些紀錄本來 7 天就會自己消失。 */
  async wipeAll() {
    if (this.busy) return false;
    this.busy = true;
    this.paint();
    try {
      const f = await connect();
      const { db, ref, get, query, orderByKey, limitToFirst, remove } = f;
      for (let round = 0; round < 60; round++) {
        const snap = await withTimeout(
          get(query(ref(db, "loc"), orderByKey(), limitToFirst(100))), LOC_TIMEOUT_MS);
        const keys = [];
        snap.forEach((c) => { keys.push(c.key); });     // ⚠️ 大括號（坑 #1）
        if (!keys.length) break;
        await Promise.all(keys.map((k) => remove(ref(db, `loc/${k}`)).catch(() => {})));
        if (keys.length < 100) break;
      }
      this.rows = [];
      this.total = 0;
      this.expanded = false;
      this.reachedTop = true;
      /* 清光了 → 把標記推到一個「比任何未來的 key 都小、但不是空的」的值。
         ⚠️ 不可以直接 removeItem：沒有標記的裝置鈴鐺一律不亮（那是刻意的），
            但那樣一來下次真的有新回報時也不會亮。 */
      LocSeen.set("-");
      return true;
    } catch (_) {
      return false;
    } finally {
      this.busy = false;
      this.paint();
    }
  },

  paint() {
    const box = $("admLoc");
    if (!box) return;
    if (!Loc.on()) { box.hidden = true; return; }
    box.hidden = false;

    /* 解不開就把原因寫出來。⚠️ 這一格空白＝什麼都看不出來，
       而「還沒設定完」跟「密碼換過了」要用完全不同的方式處理。 */
    const hint = $("locErr");
    if (hint) { hint.textContent = this.err || ""; hint.hidden = !this.err; }
    $("locList").hidden = !this.priv;
    /* 清空鈕只在「解得開、而且真的有東西可以清」的時候出現 ——
       沒東西還放一顆紅色的清空鈕，只會讓人以為壞了。 */
    const wipeRow = $("locWipeRow");
    if (wipeRow) wipeRow.hidden = !this.priv || !this.rows.length;
    const wipeBtn = $("locWipe");
    if (wipeBtn) wipeBtn.disabled = this.busy;
    $("locMore").hidden = !this.priv || this.reachedTop;
    $("locMore").disabled = this.busy;
    $("locMore").textContent = this.busy ? "查詢中…" : "載入更早的";

    const cnt = $("locCount");
    if (cnt) {
      cnt.textContent = this.priv
        ? (this.total === null ? "" : `　共 ${this.total} 筆 · 只保留 ${Number(CFG.locKeepDays) || 7} 天`)
        : "";
    }

    const list = $("locList");
    list.replaceChildren();
    if (!this.priv) return;

    if (!this.rows.length) {
      /* 「空的」跟「壞掉」要分得出來 */
      const e = document.createElement("div");
      e.className = "a-loc-empty";
      e.textContent = this.busy ? "查詢中…" : "目前沒有位置回報";
      list.append(e);
      return;
    }

    const shown = this.rows.slice(0, this.expanded ? this.rows.length : 3);
    shown.forEach((r, i) => list.append(...this.row(r, i === 0)));

    if (!this.expanded && this.rows.length > 3) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "a-loc-more";
      b.textContent = `顯示全部 ${this.rows.length} 筆`;
      b.addEventListener("click", () => { this.expanded = true; this.paint(); });
      list.append(b);
      $("locMore").hidden = true;
    }
  },

  row(r, newest) {
    const d = new Date(r.t);
    const row = document.createElement("div");
    row.className = "a-loc-row" + (newest ? " new" : "");
    const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const dot = document.createElement("span"); dot.className = "a-loc-dot";
    const when = document.createElement("span"); when.className = "a-loc-when"; when.textContent = hh;
    const ago = document.createElement("span"); ago.className = "a-loc-ago"; ago.textContent = admAgo(r.t);
    const acc = document.createElement("span");
    acc.className = "a-loc-acc";
    if (r.bad) { acc.textContent = "解不開"; acc.classList.add("far"); }
    else {
      /* ⚠️ 誤差超過 100 公尺一定要標出來。室內可能差好幾百公尺，
            不標的話地圖上那個點會騙人（跟坑 #86 同一類：不要替使用者猜）。 */
      acc.textContent = `±${r.acc} 公尺`;
      if (r.acc > 100) acc.classList.add("far");
    }
    const chev = document.createElement("span");
    chev.className = "a-loc-chev";
    chev.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M9.3 6.7 14.6 12l-5.3 5.3 1.4 1.4L17.4 12l-6.7-6.7z"/></svg>';
    row.append(dot, when, ago, acc, chev);

    /* 座標藏在展開裡，不平鋪在列表上 —— 少一點被旁邊的人瞄到的機會 */
    const det = document.createElement("div");
    det.className = "a-loc-detail";
    det.hidden = true;
    if (r.bad) {
      det.textContent = "這一筆解不開。可能是用另一組金鑰送的，或資料損毀。";
    } else {
      const xy = document.createElement("span");
      xy.className = "a-loc-xy";
      xy.textContent = `${r.lat}, ${r.lng}`;
      const a = document.createElement("a");
      a.className = "a-loc-map";
      a.target = "_blank"; a.rel = "noopener noreferrer";
      /* ⚠️ 連結是「現在」組的，不是存進資料庫的 —— 存連結等於把座標明文放進雲端。 */
      a.href = `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`;
      a.textContent = "開啟地圖 ›";
      det.append(xy, a);
      if (r.acc > 100) {
        const w = document.createElement("span");
        w.className = "a-loc-warn";
        w.textContent = "誤差偏大，這個點可能離實際位置有一段距離";
        det.append(w);
      }
    }
    row.addEventListener("click", () => {
      det.hidden = !det.hidden;
      row.classList.toggle("open", !det.hidden);
    });
    return [row, det];
  },

  /* 離開儀表板 / 緊急退出。
     ⚠️ 解開的私鑰與畫面上的座標都要抹掉。v34 修過儀表板分支漏清的問題（坑 #97），
        兩條路都要走到這裡。
     ⚠️ 這裡「沒有」本機儲存要清 —— 私鑰是每次進儀表板用密碼現解的，
        關掉畫面就沒了，硬碟上不留任何跟位置有關的鑰匙。 */
  reset() {
    this.priv = null;
    this.rows = [];
    this.total = null;
    this.err = "";
    this.expanded = false;
    this.reachedTop = false;
    this.busy = false;
    const list = $("locList");
    if (list) list.replaceChildren();
    const hint = $("locErr");
    if (hint) { hint.textContent = ""; hint.hidden = true; }
    const wipeRow = $("locWipeRow");
    if (wipeRow) wipeRow.hidden = true;
  },
};

/* ────────── 位置回報 · 推播與鈴鐺（v42）──────────
 *
 * 儀表板上一個開關：打開之後，只要 loc/ 多一筆，這台裝置就會收到推播。
 * 同時偽裝首頁的鈴鐺也會亮 —— 使用者兩個都要。
 *
 * ⚠️ 訂閱放在 locpush/<用 admin 密碼推導出來的 32 字位址>/<裝置代號>。
 *    跟房間同一招：位址本身就是祕密，外人不知道要去哪裡看，也就動不了。
 *    那個位址直接沿用 deriveKeys(admin 密碼).roomId —— tryEnter() 進來之前
 *    本來就算過一次了，不必再花一次 PBKDF2（31 萬次會卡住畫面）。
 *
 * ⚠️ 這台裝置「只有一個」推播訂閱位址，聊天與位置共用同一筆 ep/k/a。
 *    也就是說 iOS 把訂閱作廢時，兩邊的紀錄會一起變成死的。
 *    聊天那邊在進房時對帳（Push.reconcile），位置這邊只能在**進儀表板時**對帳 ——
 *    因為那個祕密位址要 admin 密碼才算得出來，人在聊天室裡是拿不到的。
 *    → 已知行為：位置推播的訂閱只在你進儀表板時自我修復。
 *      （v35 把 silent push 修掉之後，訂閱被作廢已經很少見了。）
 *
 * ⚠️ 沒有冷卻（使用者明確要求）：對方按幾次就響幾次。
 * ─────────────────────────────────────────────── */

const LOC_SEEN = "sc-loc-seen";        // 鈴鐺用：最後看過的那一筆 loc 的 key

const LocPush = {
  path: null,        // locpush/<32 字位址>
  rec: null,         // 雲端目前存的那一筆
  busy: false,

  /* 進儀表板時算一次。pathId 是 deriveKeys(admin 密碼).roomId。 */
  async arm(pathId) {
    this.path = pathId && pathId.length === 32 ? `locpush/${pathId}` : null;
    this.rec = null;
    if (!Loc.on() || !this.path) { this.paint(); return; }

    try {
      const f = await connect();
      const { db, ref, get } = f;
      const snap = await withTimeout(get(ref(db, `${this.path}/${myClientId()}`)), LOC_TIMEOUT_MS);
      this.rec = snap.val() || null;
    } catch (_) { this.rec = null; }

    /* 對帳：雲端存的位址跟這台裝置現在真正的位址不一樣就更新。
       ⚠️ 只在「本來就開著」的時候做 —— 沒開的話重新訂閱等於幫使用者
          偷偷打開推播，那是他沒同意的事。 */
    if (this.rec) await this.reconcile();
    this.paint();
  },

  isOn() { return !!(this.rec && this.rec.on !== false); },

  async save(v) {
    if (!this.path) return false;
    try {
      const f = await connect();
      const { db, ref, set } = f;
      await withTimeout(set(ref(db, `${this.path}/${myClientId()}`), v), LOC_TIMEOUT_MS);
      this.rec = v;
      return true;
    } catch (_) { return false; }
  },

  async drop() {
    if (!this.path) return;
    try {
      const f = await connect();
      const { db, ref, remove } = f;
      await withTimeout(remove(ref(db, `${this.path}/${myClientId()}`)), LOC_TIMEOUT_MS);
    } catch (_) {}
    this.rec = null;
  },

  /* 位址換過就寫回新的（同 Push.reconcile 的道理，見上面的說明）。 */
  async reconcile() {
    if (!Push.supported() || Push.permission() !== "granted") return;
    const r = await Push.reg();
    if (!r) return;
    let sub;
    try { sub = await r.pushManager.getSubscription(); } catch (_) { return; }
    if (!sub) {
      /* 被 iOS 撤銷了。權限還在就直接重訂 —— granted 時 subscribe() 不需要手勢。 */
      try {
        sub = await r.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: Push.key(),
        });
      } catch (_) { return; }
    }
    if (!sub) return;
    const j = sub.toJSON();
    if (!j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return;
    if (this.rec && this.rec.ep === j.endpoint) return;      // 沒換過
    await this.save({ ep: j.endpoint, k: j.keys.p256dh, a: j.keys.auth, t: Date.now(), on: true });
  },

  /* 按下開關。回傳要顯示給使用者的那一句（空字串＝成功，不必說話）。 */
  async toggle(want) {
    if (this.busy) return "";
    this.busy = true;
    this.paint();
    try {
      if (!want) { await this.drop(); return ""; }

      if (!Push.supported()) {
        return Push.needsInstall()
          ? "iPhone 要先把這個網站加到主畫面，才收得到推播"
          : "這個瀏覽器不支援推播";
      }
      let perm = Push.permission();
      if (perm === "default") {
        /* ⚠️ 一定要在使用者的點擊事件裡呼叫，否則瀏覽器直接拒絕。 */
        try { perm = await Notification.requestPermission(); } catch (_) { return "開啟失敗"; }
      }
      if (perm !== "granted") return "通知權限被拒絕了，要去瀏覽器設定裡開";

      const r = await Push.reg();
      if (!r) return "開啟失敗";
      let sub;
      try {
        sub = await r.pushManager.getSubscription();
        if (!sub) {
          sub = await r.pushManager.subscribe({
            userVisibleOnly: true, applicationServerKey: Push.key(),
          });
        }
      } catch (_) { return "開啟失敗"; }
      const j = sub && sub.toJSON();
      if (!j || !j.endpoint || !j.keys || !j.keys.p256dh || !j.keys.auth) return "開啟失敗";

      const ok = await this.save({
        ep: j.endpoint, k: j.keys.p256dh, a: j.keys.auth, t: Date.now(), on: true,
      });
      return ok ? "" : "存不進去，等一下再試";
    } finally {
      this.busy = false;
      this.paint();
    }
  },

  paint() {
    const row = $("locPushRow");
    if (!row) return;
    row.hidden = !Loc.on();
    const box = $("locPushSw");
    const sub = $("locPushSub");
    if (box) { box.checked = this.isOn(); box.disabled = this.busy; }
    if (sub) {
      sub.textContent = this.busy ? "處理中…"
        : this.isOn() ? "開啟中 · 有新回報就通知這台裝置"
        : Push.needsInstall() ? "要先把網站加到主畫面"
        : "關閉中";
    }
  },

  reset() {
    this.path = null;
    this.rec = null;
    this.busy = false;
    const box = $("locPushSw");
    if (box) { box.checked = false; box.disabled = false; }
  },
};

/* 鈴鐺要不要為了位置回報亮起來。
   ⚠️ 只比 key（push key 的字典序就是時間序），完全不解密、不留內容。
   ⚠️ sc-loc-seen 緊急退出「不清」—— 跟 v36 鈴鐺的清單同一條規矩：
      清掉的話回到偽裝首頁，鈴鐺會亮一顆永遠消不掉的假紅點。 */
const LocSeen = {
  get() { try { return localStorage.getItem(LOC_SEEN) || ""; } catch (_) { return ""; } },
  /* 這台裝置有沒有「參與過」位置回報。
     ⚠️ 這是**每台裝置的選擇**，不是 config 的開關 ——
        鈴鐺要不要連線只能看這個。看 Loc.on() 的話，
        任何人打開偽裝首頁按一下鈴鐺就會連上 Firebase，
        而「沒開提示的裝置點鈴鐺不會連線」是 test-bell 守著的隱私前提。 */
  has() { return !!this.get(); },
  set(k) { try { if (k) localStorage.setItem(LOC_SEEN, k); } catch (_) {} },

  /* 進儀表板時把「看過了」推到最新那一筆。 */
  mark(rows) {
    if (!rows || !rows.length) return;
    const newest = rows[0] && rows[0].k;
    if (newest) this.set(newest);
  },

  /* 點鈴鐺時問一次：有沒有比「看過的」更新的位置回報。
     ⚠️ 只抓 1 筆、只看 key。整包下載是坑 #74。
     ⚠️ 這台裝置從來沒看過（沒有 sc-loc-seen）時回 false ——
        不然任何人第一次打開這個網站，鈴鐺就會亮，等於對外宣告有東西。 */
  async unread(f) {
    if (!Loc.on()) return false;
    const seen = this.get();
    if (!seen) return false;
    try {
      const { db, ref, get, query, orderByKey, limitToLast } = f;
      const snap = await withTimeout(
        get(query(ref(db, "loc"), orderByKey(), limitToLast(1))), LOC_TIMEOUT_MS);
      let newest = "";
      snap.forEach((c) => { newest = c.key; });      // ⚠️ 大括號（坑 #1）
      return !!newest && newest > seen;
    } catch (_) { return false; }
  },
};



/* ────────────────────────── 5a. 照片 ──────────────────────────
 *
 * 一張照片會產生「兩份」：
 *
 *   縮圖 480px  → 包進訊息密文，跟訊息一起躺在 Realtime Database，訊息在它就在
 *   原圖 2048px → 用同一把房間金鑰加密，上傳 Cloud Storage，點開才下載
 *
 * ⚠️ 為什麼不像貼圖一樣整張塞進訊息裡：
 *    進房會一次載最近 30 則，那 30 則裡只要有幾張大圖，每次進房都要重拉一次。
 *    而且 RTDB 的下載費率是 Storage 的 8 倍。縮圖 20 KB × 30 = 600 KB，
 *    原圖 400 KB × 30 = 12 MB —— 差 20 倍，而且多數的圖你根本不會點開。
 *
 * ⚠️ 原圖 7 天後會被 Google 的生命週期規則刪掉（不是我們的程式刪的）。
 *    刪掉之後縮圖還在，泡泡照樣看得到，點下去才會說「原圖已過期」。
 * ───────────────────────────────────────────────────────────── */

function mediaId() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function fmtBytes(n) {
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

/* 把一個圖片檔變成「可以送出去的照片訊息」。
   回傳 payload；過程中會呼叫 onProgress(0～1)。 */
async function buildPhoto(file, onProgress) {
  const f = S.fb;
  if (!f || !f.st || !f.storage) throw new Error("sc/no-storage");

  // 縮圖與原圖各縮一次。兩次都從原始檔解碼，不要拿縮圖再放大。
  const thumb = await scaleImage(file, {
    max: CFG.photoThumbSize, quality: CFG.photoThumbQuality,
  });
  const full = await scaleImage(file, {
    max: CFG.photoMaxSize, quality: CFG.photoQuality, wantBlob: true,
  });
  if (!full.blob) throw new Error("sc/encode-failed");

  const capMB = CFG.photoMaxUploadMB || 6;
  if (full.blob.size > capMB * 1024 * 1024) {
    const e = new Error("sc/too-big");
    e.scSize = full.blob.size;
    throw e;
  }

  // 用房間金鑰加密。⚠️ 每個檔案自己一組 iv，絕對不可以共用。
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await full.blob.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, S.key, plain);

  const path = `media/${S.roomId}/${mediaId()}`;
  const ref = f.st.ref(f.storage, path);

  /* contentType 一律 application/octet-stream —— 密文沒有 MIME 可言，
     而且 storage.rules 就是靠這個擋掉「有人拿這個桶子當圖床」。 */
  const task = f.st.uploadBytesResumable(ref, new Uint8Array(cipher), {
    contentType: "application/octet-stream",
    cacheControl: "private, max-age=604800",
  });
  await new Promise((res, rej) => {
    task.on("state_changed",
      (snap) => { if (onProgress && snap.totalBytes) onProgress(snap.bytesTransferred / snap.totalBytes); },
      rej, res);
  });

  // 自己送出去的圖直接進暫存，之後點開完全不用連網
  Media.put(path, full.blob);

  return {
    k: "ph",
    d: thumb.url,                 // 縮圖（跟訊息一起存）
    w: full.w, h: full.h,         // 原圖尺寸 → 泡泡先用 aspect-ratio 佔位，載入時不會跳動
    p: path,                      // Storage 路徑
    fi: b64(iv),                  // 原圖的 iv
    fb: full.blob.size,           // 原圖大小（顯示用）
  };
}

/* 取回原檔（照片原圖或影片）：先問暫存，沒有才下載 + 解密 + 存進暫存。
   丟出的錯誤帶 .scCode：expired（過期／被刪）、offline、其他。
   ⚠️ 影片一定要帶對 MIME，不然 <video> 會直接說不支援。 */
function mediaMime(body) {
  if (body && body.k === "vd") return body.mt || "video/mp4";
  return "image/webp";
}

async function fetchMedia(body, onProgress) {
  if (!body || !body.p) throw Object.assign(new Error("no path"), { scCode: "broken" });

  /* ⚠️ 連「查本機暫存」都要有上限。IndexedDB 卡住的時候它不會報錯，
        只會不回來 —— 那一樣是一顆永遠轉不完的圈，而且更難查，
        因為畫面上完全看不出卡在本機還是卡在網路。
        查不到頂多多下載一次，絕對不值得為它卡住整個流程。 */
  let hit = null;
  try { hit = await withTimeout(Media.get(body.p), MEDIA_CACHE_TIMEOUT_MS); } catch (_) {}
  if (hit) return hit;

  const f = S.fb;
  if (!f || !f.st || !f.storage) throw Object.assign(new Error("no storage"), { scCode: "nostorage" });

  /* ⚠️ getBytes 的第二個參數是硬上限，超過就直接失敗。
        它必須「大於 app 端的上傳上限」，否則自己傳得出去、對方卻抓不回來。
        加密後會多出 16 bytes 的驗證標籤，所以再留一點餘裕。 */
  const cap = (Math.max(CFG.videoMaxUploadMB || 0, CFG.photoMaxUploadMB || 0) + 8) * 1024 * 1024;

  /* 「還在下載」的心跳。getBytes 沒有進度事件（整包加密，中途拆不開），
     所以這裡回報的是「經過幾秒」而不是百分比 —— 誠實，而且足以讓人知道它還活著。 */
  let beat = null;
  if (typeof onProgress === "function") {
    const t0 = Date.now();
    beat = setInterval(() => onProgress(Math.round((Date.now() - t0) / 1000)), 1000);
  }

  let bytes;
  try {
    bytes = await withTimeout(
      f.st.getBytes(f.st.ref(f.storage, body.p), cap), mediaTimeoutMs());
  } catch (err) {
    const code = String(err && err.code || "");
    /* ⚠️ 自己的逾時要跟 Firebase 的錯誤分開講。
          「等太久」跟「檔案不見了」對使用者是完全不同的兩件事：
          前者值得再試一次，後者再試一百次也沒有用。 */
    if (code === "sc/timeout" || code.includes("retry-limit") || code.includes("canceled")) {
      /* ⚠️ 「抓不到位元組」有好幾種完全不同的原因，而使用者只看得到轉圈。
            所以這裡再花一次很小的請求去問「這個檔案到底在不在」——
            中繼資料只有幾百位元組，而它能一次分辨出四種情況：
              查得到      → 檔案在、權限也對 → 卡在傳輸本身（多半是網路擋掉了）
              object-not-found → 檔案真的不在（過期或被刪）
              unauthorized     → 規則擋的
              連中繼資料都問不到 → 根本連不到儲存空間
            少了這一步，畫面上只能說「等太久」，而那句話幫不了任何人。 */
      let probe = "unreachable";
      try {
        await withTimeout(f.st.getMetadata(f.st.ref(f.storage, body.p)),
          Math.min(8000, mediaTimeoutMs()));
        probe = "exists";
      } catch (e2) {
        const c2 = String(e2 && e2.code || "");
        if (c2.includes("object-not-found")) probe = "gone";
        else if (c2.includes("unauthorized")) probe = "denied";
      }
      if (probe === "gone") throw Object.assign(err, { scCode: "expired" });
      if (probe === "denied") throw Object.assign(err, { scCode: "denied" });
      if (probe !== "exists") throw Object.assign(err, { scCode: "blocked" });

      /* 檔案在、權限也對 —— 再分最後一次：「線路真的斷了」還是「瀏覽器不准讀」。
       *
       * ⚠️ 2026-08-24 的事故就是後者：Storage 桶子沒設 CORS，
       *    封包其實有出去也有回來，只是瀏覽器不准這個網站讀取回應內容。
       *    當時這裡只會說「換個網路或關掉擋廣告的擴充功能」—— 方向完全相反，
       *    使用者照做一百次也沒有用，這個病因此拖了三個版本（坑 #128～#130）。
       *
       * no-cors 拿回來的是讀不到內容的 opaque 回應，
       * 但「拿得回來」本身就是答案：線路是通的，擋人的是 CORS。
       * 實測兩者耗時幾乎一樣（317ms vs 318ms），所以這一步很便宜。
       *
       * ⚠️ 探測本身失敗不可以讓整段掛掉 —— 分不出來就退回原本的說法。
       *    寧可話講得含糊，也不可以把使用者的錯誤訊息換成一個例外。 */
      let opaque = false;
      if (f.st && typeof f.st.getDownloadURL === "function") {
        try {
          const u = await withTimeout(f.st.getDownloadURL(f.st.ref(f.storage, body.p)), 8000);
          await withTimeout(fetch(u, { mode: "no-cors", cache: "no-store" }), 8000);
          opaque = true;
        } catch (_) {}
      }
      throw Object.assign(err, { scCode: opaque ? "cors" : "stalled" });
    }
    /* object-not-found = 檔案不在了。兩種可能：滿 7 天被生命週期規則刪掉，
       或是對方把那則訊息刪了。對使用者來說是同一件事，不必分。 */
    if (code.includes("object-not-found")) throw Object.assign(err, { scCode: "expired" });
    if (code.includes("unauthorized")) throw Object.assign(err, { scCode: "denied" });
    if (code.includes("retry-limit") || code.includes("canceled")) {
      throw Object.assign(err, { scCode: "offline" });
    }
    throw Object.assign(err, { scCode: "failed", scRaw: code });
  } finally {
    if (beat) clearInterval(beat);
  }

  let blob;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(body.fi) }, S.key, bytes);
    blob = new Blob([plain], { type: mediaMime(body) });
  } catch (_) {
    // 解不開：金鑰換過了，或檔案被改壞。不要把爛資料寫進暫存。
    throw Object.assign(new Error("decrypt failed"), { scCode: "broken" });
  }

  Media.put(body.p, blob);
  return blob;
}

/* 刪訊息 / 一鍵清除時要把 Storage 上的原檔一起帶走。
   ⚠️ 失敗不要擋住流程 —— 就算漏刪，生命週期規則最多 7 天也會收掉。
   ⚠️ 新增媒體種類時這裡一定要跟著加，不然刪了訊息、雲端的檔案卻留著。 */
const MEDIA_KINDS = ["ph", "vd"];

async function dropMediaBlob(body) {
  if (!body || !MEDIA_KINDS.includes(body.k) || !body.p) return;
  Media.del(body.p);
  const f = S.fb;
  if (!f || !f.st || !f.storage) return;
  try { await f.st.deleteObject(f.st.ref(f.storage, body.p)); } catch (_) {}
}


/* ─────────────────────────── 影片 ───────────────────────────
 *
 * ⚠️ 刻意不轉檔。上限擋不下的就請使用者自己剪 —— 見 config.js 的說明。
 *
 * ⚠️ iOS Safari 只有在 muted + playsInline 都設好的情況下，
 *    才肯把影片畫面畫進 canvas。少一個就會拿到「全黑的封面」，
 *    而且不會報錯 —— 這種 bug 只有在真機上才看得到。
 * ─────────────────────────────────────────────────────────── */

/* 讀長度、尺寸，順便抽一幀當封面。抽不到幀不算失敗（回 poster: null）。 */
async function probeVideo(file) {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.preload = "metadata";
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.setAttribute("muted", "");
  v.src = url;

  const wait = (ev, ms) => new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error("sc/video-timeout")), ms);
    const ok = () => { clearTimeout(to); v.removeEventListener("error", bad); res(true); };
    const bad = () => { clearTimeout(to); v.removeEventListener(ev, ok); rej(new Error("sc/video-unreadable")); };
    v.addEventListener(ev, ok, { once: true });
    v.addEventListener("error", bad, { once: true });
  });

  try {
    await wait("loadedmetadata", 20000);

    let dur = Number(v.duration);
    /* ⚠️ 有些錄影檔（尤其是還在寫入時複製出來的）duration 會是 Infinity，
          要先跳到很後面逼它算出真正長度。 */
    if (!isFinite(dur) || dur <= 0) {
      v.currentTime = 1e6;
      try { await wait("timeupdate", 4000); } catch (_) {}
      dur = Number(v.duration);
      v.currentTime = 0;
    }

    const w = v.videoWidth || 0;
    const h = v.videoHeight || 0;
    if (!isFinite(dur) || dur <= 0) throw new Error("sc/video-unreadable");

    let poster = null;
    try {
      v.currentTime = Math.min(CFG.videoPosterAt ?? 0.6, Math.max(0, dur - 0.05));
      await wait("seeked", 8000);
      const max = CFG.videoPosterSize || 480;
      const scale = Math.min(1, max / Math.max(w || 1, h || 1));
      const cw = Math.max(1, Math.round((w || max) * scale));
      const ch = Math.max(1, Math.round((h || max) * scale));
      const cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      cv.getContext("2d").drawImage(v, 0, 0, cw, ch);
      poster = cv.toDataURL("image/webp", CFG.videoPosterQuality || 0.7);
      // 全黑或極短的 data URL 代表其實沒畫到東西，寧可當作沒有封面
      if (!poster || poster.length < 200) poster = null;
    } catch (_) { poster = null; }

    return { dur, w, h, poster };
  } finally {
    v.removeAttribute("src");
    try { v.load(); } catch (_) {}
    URL.revokeObjectURL(url);
  }
}

/* iPhone 預設錄 HEVC 並包成 .mov。它在 Chrome 107+／Safari／Firefox 134+ 都放得出來，
   但 Windows／Linux 桌機版 Chrome 需要硬體解碼器，沒有的話是「黑畫面、不報錯」。
   ⚠️ 這裡只能「可能」不能「一定」—— 前端讀不到實際編碼，只看得到容器。 */
function maybeIncompatible(file) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t === "video/quicktime" || n.endsWith(".mov");
}

async function buildVideo(file, onProgress) {
  const f = S.fb;
  if (!f || !f.st || !f.storage) throw new Error("sc/no-storage");

  const info = await probeVideo(file);

  const maxSec = CFG.videoMaxSeconds || 30;
  if (info.dur > maxSec + 0.5) {
    throw Object.assign(new Error("sc/too-long"), { scDur: info.dur });
  }
  const capMB = CFG.videoMaxUploadMB || 50;
  if (file.size > capMB * 1024 * 1024) {
    throw Object.assign(new Error("sc/too-big"), { scSize: file.size });
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, S.key, plain);

  const path = `media/${S.roomId}/${mediaId()}`;
  const ref = f.st.ref(f.storage, path);
  const task = f.st.uploadBytesResumable(ref, new Uint8Array(cipher), {
    contentType: "application/octet-stream",
    cacheControl: "private, max-age=604800",
  });
  await new Promise((res, rej) => {
    task.on("state_changed",
      (snap) => { if (onProgress && snap.totalBytes) onProgress(snap.bytesTransferred / snap.totalBytes); },
      rej, res);
  });

  // 自己傳的影片直接進暫存，再看一次不用重抓
  Media.put(path, new Blob([plain], { type: file.type || "video/mp4" }));

  return {
    k: "vd",
    d: info.poster || "",             // 封面（沒抽到就空字串，泡泡會畫深色底＋播放鍵）
    w: info.w || 16, h: info.h || 9,
    du: Math.round(info.dur),         // 秒數，泡泡右下角顯示
    p: path,
    fi: b64(iv),
    fb: file.size,
    mt: file.type || "video/mp4",     // ⚠️ 播放時要餵給 <video>，少了它 Safari 會拒播
  };
}


/* 一次送一或多張照片，輸入列上方顯示進度。
   ⚠️ 一定要「上傳完成才送訊息」。反過來（先送訊息再上傳）的話，
      對方會在檔案還沒到的那幾秒點開，看到「載入失敗」。 */
async function sendPhotos(files) {
  if (!S.send) { toast("還在連線中，請稍候一下"); return; }
  if (!S.fb || !S.fb.st || !S.fb.storage) {
    toast("照片功能需要先在 Firebase 主控台啟用 Storage", 5000);
    return;
  }
  const imgs = files.filter((f) => f && f.type.startsWith("image/"));
  if (!imgs.length) { toast("只能傳圖片"); return; }

  const bar = $("upBar"), fill = $("upFill"), label = $("upText");
  if (bar) bar.hidden = false;

  for (let i = 0; i < imgs.length; i++) {
    const file = imgs[i];
    const many = imgs.length > 1 ? `（${i + 1}/${imgs.length}）` : "";
    if (label) label.textContent = `處理中${many}`;
    if (fill) fill.style.width = "6%";
    try {
      const payload = await buildPhoto(file, (p) => {
        if (label) label.textContent = `上傳中 ${Math.round(p * 100)}%${many}`;
        if (fill) fill.style.width = Math.max(6, Math.round(p * 100)) + "%";
      });
      const r = S.replyTo; setReply(null);
      await S.send(withNick(withReply(withBurn(payload), r)));
    } catch (err) {
      console.error(err);
      if (err.message === "sc/too-big") {
        toast(`這張壓縮後還有 ${fmtBytes(err.scSize)}，超過 ${CFG.photoMaxUploadMB} MB 上限`, 5000);
      } else if (err.message === "sc/no-storage") {
        toast("照片功能需要先在 Firebase 主控台啟用 Storage", 5000);
      } else if (String(err.code || "").includes("no-default-bucket")) {
        toast("config.js 的 firebase 少了 storageBucket（Storage 頁面上方那串 gs:// 的名字）", 7000);
      } else if (String(err.code || "").includes("unauthorized")) {
        toast("Storage 規則擋下了上傳 —— 檢查是否已貼上 storage.rules", 6000);
      } else if (err.message === "sc/encode-failed") {
        toast("這個圖片格式讀不進來");
      } else {
        toast("照片送出失敗，請檢查網路");
      }
    }
  }

  if (fill) fill.style.width = "100%";
  setTimeout(() => { if (bar) { bar.hidden = true; if (fill) fill.style.width = "0%"; } }, 260);
}


/* 一次送一支影片。
   ⚠️ 跟照片一樣：一定要「上傳完成才送訊息」。
   ⚠️ 錯誤訊息要「講得出下一步」。「影片太長」沒有用，
      要講「這支 47 秒，上限 30 秒，請先在相簿裡剪短」。 */
async function sendVideo(file) {
  if (!S.send) { toast("還在連線中，請稍候一下"); return; }
  if (!S.fb || !S.fb.st || !S.fb.storage) {
    toast("影片功能需要先在 Firebase 主控台啟用 Storage", 5000);
    return;
  }
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm)$/i.test(file.name || "")) {
    toast("這不是影片檔"); return;
  }

  const capMB = CFG.videoMaxUploadMB || 50;
  // 大小在讀檔前就查得到，先擋掉可以省下解碼一支巨檔的時間
  if (file.size > capMB * 1024 * 1024) {
    toast(`這支 ${fmtBytes(file.size)}，超過 ${capMB} MB 上限 · 請先在相簿裡剪短`, 6000);
    return;
  }

  const bar = $("upBar"), fill = $("upFill"), label = $("upText");
  if (bar) bar.hidden = false;
  if (label) label.textContent = "讀取影片…";
  if (fill) fill.style.width = "4%";

  try {
    const payload = await buildVideo(file, (p) => {
      if (label) label.textContent = `上傳中 ${Math.round(p * 100)}%`;
      if (fill) fill.style.width = Math.max(6, Math.round(p * 100)) + "%";
    });
    const r = S.replyTo; setReply(null);
    await S.send(withNick(withReply(withBurn(payload), r)));

    /* iPhone 的 .mov 有機會在對方的 Windows 桌機上放不出來（缺 HEVC 解碼器）。
       送成功之後才提醒，不要在送出前擋人 —— 大多數情況其實是好的。 */
    if (maybeIncompatible(file)) {
      toast("已送出。iPhone 的 .mov 在部分電腦上可能放不出來，若對方說看不到：設定 → 相機 → 格式 → 相容性最佳", 8000);
    }
  } catch (err) {
    console.error(err);
    const msg = String(err && err.message || "");
    if (msg === "sc/too-long") {
      toast(`這支 ${fmtDur(err.scDur)}，超過 ${CFG.videoMaxSeconds || 30} 秒上限 · 請先在相簿裡剪短`, 6000);
    } else if (msg === "sc/too-big") {
      toast(`這支 ${fmtBytes(err.scSize)}，超過 ${capMB} MB 上限 · 請先在相簿裡剪短`, 6000);
    } else if (msg === "sc/video-unreadable" || msg === "sc/video-timeout") {
      toast("這個影片格式讀不進來，試試看轉成 MP4", 6000);
    } else if (msg === "sc/no-storage") {
      toast("影片功能需要先在 Firebase 主控台啟用 Storage", 5000);
    } else if (String(err.code || "").includes("unauthorized")) {
      toast("Storage 規則擋下了上傳 —— 影片上限要 64 MB，檢查 storage.rules 是否已更新", 7000);
    } else {
      toast("影片送出失敗，請檢查網路");
    }
  }

  if (fill) fill.style.width = "100%";
  setTimeout(() => { if (bar) { bar.hidden = true; if (fill) fill.style.width = "0%"; } }, 260);
}


/* ────────────────────────── 5b. 多人房：暱稱與顏色 ────────────────────────── */

/* 進多人房之前先問暱稱。回傳 { nick, color }，按取消回傳 null。
   ⚠️ 暱稱是「包在密文裡跟著每一則訊息走」的，不另外做名冊 ——
      有名冊就等於在雲端留一份「這間房有哪些人」的明文清單。
      代價：沒辦法顯示成員列表，正在輸入也只能說「有人」。 */
/* ────────── 多人房的個人密碼登入（v27）──────────
 *
 * 流程就三步：
 *   ① 九宮格輸入個人密碼 → 推導出身分代號
 *   ② 查 mem/<身分代號> 在不在
 *        在  → 解開拿暱稱，直接進（回傳 returning: true）
 *        不在 → 問暱稱與顏色，建立這個身分
 *   ③ 回傳 { uid, n, c }，呼叫端負責寫進本機
 *
 * ⚠️ 「查不到」不是錯誤，是「這組密碼還沒有人用過」——
 *    畫面上絕對不可以講成「密碼錯誤」。任何一組數字都是合法的身分，
 *    講成錯誤會讓人以為系統壞掉，然後一直重試同一組。
 * ⚠️ 使用者明確表示不處理「兩個人選到同一組密碼」的情況（自用小眾工具）。
 *    後果是兩個人會共用同一個身分與計數，而且分不開。這是知情的取捨。
 */
function askMember() {
  return new Promise((resolve) => {
    const gate = $("memGate"), sub = $("memSub"), dots = $("memDots");
    /* 這一行講的是「這組密碼是幹嘛的」，不是操作提示 ——
       第一次進來的人不會知道自己在設定什麼，只寫「輸入個人密碼」等於沒說。
       ⚠️ 錯誤訊息會暫時蓋掉它，所以 .c-pad-sub 要留兩行的高度，不然盒子會跳。
       ⚠️ 拆成陣列是為了換行：每一段包成一個 inline-block，中文才不會被切在詞中間。
          HTML 裡寫死沒有用 —— say() 會用 textContent 蓋掉它，要在這裡重建。 */
    const SUB0 = ["請輸入您的身分辨識密碼 4 碼後", "即可進入聊天室，", "若您為第一次登入", "請先設置身分專屬密碼。"];
    const grid = $("memGrid"), cancel = $("memCancel");
    let buf = "", busy = false;

    const paint = () => {
      dots.replaceChildren();
      for (let i = 0; i < buf.length; i++) {
        const el = document.createElement("span");
        el.className = "c-pad-dot";
        dots.appendChild(el);
      }
    };
    /* 陣列＝要保護換行的說明文字，字串＝一行的狀態／錯誤訊息。
       ⚠️ 一律用 textContent 建節點，不用 innerHTML —— 這幾句雖然是寫死的，
          但這個檔案的通則就是「不對畫面塞 HTML 字串」，不要在這裡破例。 */
    const say = (msg, bad) => {
      sub.classList.toggle("bad", !!bad);
      if (!Array.isArray(msg)) { sub.textContent = msg; return; }
      sub.replaceChildren(...msg.map((t) => {
        const el = document.createElement("span");
        el.className = "c-nb";
        el.textContent = t;
        return el;
      }));
    };
    /* ⚠️ 這一關關掉之後，submit() 可能還在飛（deriveMemberId + 連線 + 查詢，
          行動網路上真的會好幾秒）。沒有這個旗標的話，使用者在「查詢中…」按取消
          回到偽裝首頁，幾秒後暱稱視窗會自己冒出來蓋在 Google 頁上。 */
    let aborted = false;
    const done = (val) => {
      aborted = true;
      S.abortMember = null;
      gate.hidden = true;
      grid.removeEventListener("click", onKey);
      cancel.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onPhysical, true);
      resolve(val);
    };

    const submit = async () => {
      if (busy) return;
      const pin = buf;
      if (pin.length < 4) { say("個人密碼至少 4 位數", true); return; }
      busy = true;
      say("查詢中…");
      try {
        const uid = await deriveMemberId(S.hk, pin);
        if (aborted) return;
        const rec = await loadMember(uid);
        if (aborted) return;
        if (rec) {
          /* 已經建立過 → 直接進。順便把暱稱顯示出來當作「認對人了沒」的回饋：
             萬一撞到別人的密碼，這裡會冒出一個不是自己的名字。 */
          done({ uid, n: rec.n, c: rec.c, returning: true });
          return;
        }
        gate.hidden = true;
        const picked = await askNick(S.nick, S.nickColor);
        if (aborted) return;
        if (!picked) { gate.hidden = false; buf = ""; paint(); say(SUB0); busy = false; return; }
        await saveMember(uid, picked.nick, picked.color);
        if (aborted) return;
        done({ uid, n: picked.nick, c: picked.color, returning: false });
      } catch (err) {
        if (aborted) return;
        console.error(err);
        buf = ""; paint();
        say("連線有問題，再試一次", true);
        busy = false;
      }
    };

    const press = (k) => {
      if (busy) return;
      if (k === "del") { buf = buf.slice(0, -1); paint(); return; }
      if (k === "go") { submit(); return; }
      if (buf.length >= 12) return;              // 防呆上限，不是規定長度
      buf += k; paint();
      if (sub.classList.contains("bad")) say(SUB0);
    };
    const onKey = (e) => {
      const b = e.target.closest(".c-key");
      if (b) press(b.dataset.k);
    };
    const onCancel = () => done(null);
    /* 桌機用實體鍵盤打。⚠️ Esc 要留給緊急退出，這裡不攔。 */
    const onPhysical = (e) => {
      if (gate.hidden) return;
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); press(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); press("del"); }
      else if (e.key === "Enter") { e.preventDefault(); press("go"); }
    };

    buf = ""; paint(); say(SUB0); busy = false;
    gate.hidden = false;
    /* 讓緊急退出／Esc／閒置關得掉這一關（v29）。
       ⚠️ 這個畫面在 #chat 外面，而它出現的時候房間金鑰已經在記憶體裡了 ——
          沒有這個掛勾的話，那三道保護在這個狀態下全部是空包彈。 */
    S.abortMember = () => done(null);
    grid.addEventListener("click", onKey);
    cancel.addEventListener("click", onCancel);
    document.addEventListener("keydown", onPhysical, true);
  });
}

/* 讀一個身分。回 null 就代表「這組密碼還沒有人用過」。
   ⚠️ 解不開也要當作 null（換過房間密碼的舊資料），不要讓人卡在進不去。 */
async function loadMember(uid) {
  const { db, ref, get } = await connect();
  const snap = await get(ref(db, `rooms/${S.roomId}/mem/${uid}`));
  const v = snap.val();
  if (!v || !v.iv || !v.c) return null;
  try {
    const body = await unseal(S.key, v);
    const n = String(body.n || "").slice(0, NICK_MAX).trim();
    return n ? { n, c: body.c || "blue" } : null;
  } catch (_) { return null; }
}

/* 建立一個身分。⚠️ 暱稱與顏色包在密文裡 —— 雲端只會看到一串亂碼加一團密文。 */
async function saveMember(uid, nick, color) {
  const { db, ref, set, serverTimestamp } = await connect();
  const sealed = await seal(S.key, { n: nick, c: color });
  await set(ref(db, `rooms/${S.roomId}/mem/${uid}`), { t: serverTimestamp(), ...sealed });
}

function askNick(defNick = "", defColor = "blue") {
  return new Promise((resolve) => {
    const gate = $("nickGate"), inp = $("nickInput"), go = $("nickGo");
    const cancel = $("nickCancel"), cnt = $("nickCount"), colors = $("nickColors");
    let color = ACCENTS.some((a) => a.k === defColor) ? defColor : "blue";

    const clean = () => inp.textContent.replace(/[\r\n\t]+/g, " ").trim().slice(0, NICK_MAX);

    const paintColors = () => {
      colors.replaceChildren();
      for (const a of ACCENTS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "n-color" + (a.k === color ? " on" : "");
        b.style.setProperty("--c", a.c);
        b.dataset.k = a.k;
        b.title = a.label;
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(a.k === color));
        b.setAttribute("aria-label", a.label);
        colors.appendChild(b);
      }
    };

    const sync = () => {
      const v = clean();
      cnt.textContent = `${[...v].length}/${NICK_MAX}`;
      go.disabled = v.length === 0;
      // 設在最外層，輸入框與「進入聊天室」按鈕才會一起跟著選到的顏色走
      gate.style.setProperty("--nick-c", ACCENTS.find((a) => a.k === color).c);
    };

    const done = (val) => {
      S.abortNick = null;
      gate.hidden = true;
      inp.removeEventListener("input", onInput);
      inp.removeEventListener("keydown", onKey);
      colors.removeEventListener("click", onColor);
      go.removeEventListener("click", onGo);
      cancel.removeEventListener("click", onCancel);
      resolve(val);
    };
    const onInput = () => {
      // contenteditable 貼上多行會夾帶換行；超過上限就當場截掉，不要等按下去才報錯
      const v = clean();
      if (inp.textContent !== v && [...inp.textContent].length > NICK_MAX) {
        inp.textContent = v;
        const r = document.createRange(), sel = getSelection();
        r.selectNodeContents(inp); r.collapse(false);
        sel.removeAllRanges(); sel.addRange(r);
      }
      sync();
    };
    const onKey = (e) => {
      if (e.key === "Enter") { e.preventDefault(); if (!go.disabled) onGo(); }
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    };
    const onColor = (e) => {
      const b = e.target.closest(".n-color");
      if (!b) return;
      color = b.dataset.k;
      paintColors();
      sync();
    };
    const onGo = () => { const v = clean(); if (v) done({ nick: v, color }); };
    const onCancel = () => done(null);

    inp.textContent = defNick || "";
    paintColors();
    sync();
    gate.hidden = false;
    S.abortNick = () => done(null);      // 緊急退出／Esc／閒置要關得掉（v29，同 askMember）
    inp.addEventListener("input", onInput);
    inp.addEventListener("keydown", onKey);
    colors.addEventListener("click", onColor);
    go.addEventListener("click", onGo);
    cancel.addEventListener("click", onCancel);
    setTimeout(() => {
      inp.focus();
      const r = document.createRange(), sel = getSelection();
      r.selectNodeContents(inp); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    }, 30);
  });
}

/* 私人房 / 多人房的介面差異全部集中在這裡，不要散在各處各自判斷。
   多人房為什麼要關掉這些（使用者逐條確認過）：
     已讀回條 —— 人多的時候「誰讀到哪」是一張作息表，而且畫面會爆炸
     一鍵清除 —— 那是「雙方共識」才成立的動作，多人房沒有這個共識
     歷史訊息鎖 —— 只留 48 小時，本來就翻不到多遠，再上一道鎖只是擋自己
     刪除 —— 只能刪自己送的（⚠️ 這是介面層的限制，資料庫規則擋不住，見下方註解） */
function applyRoomMode() {
  const open = !!S.open;
  document.documentElement.dataset.room = open ? "open" : "private";

  /* 隱身常駐提示（v56）。掛在這裡的理由跟 Burn.paint() 一樣：
     applyRoomMode() 是「房型定案了」的唯一入口，而隱身只有私人房有。
     ⚠️ 離房時 S.stealth 會歸零、這個函式也會再跑一次，所以它自己會收掉。 */
  const st = $("stealthBar");
  if (st) st.hidden = !S.stealth;

  /* ⚠️ 即焚那顆鈕的顯示要跟著房型走，而且一定要在**這裡**再畫一次（v50）。
        只在 Burn.load() 畫的話，多人房會漏掉：進多人房要先過個人密碼與暱稱兩關，
        enterChat() 跑到 Burn.load() 的時候 S.open 還沒定案，
        於是多人房也會看到那顆鈕（實測 test-v39 抓到的）。
        applyRoomMode() 是「房型定案了」的唯一入口，掛在這裡才不會漏。 */
  Burn.paint();

  /* 多人房的常駐提示只在「真的會自動刪」時才出現。
     ⚠️ v26 起 openRoomTtlHours 預設 0，這條就不該再顯示 ——
        頂著「只保留最近 48 小時」但其實永遠不刪，那是在對使用者說謊。
        時數改回大於 0 的話它會自己回來，而且數字跟著設定走。 */
  const bar = $("openBar");
  if (bar) {
    const ttl = Number(CFG.openRoomTtlHours) || 0;
    bar.hidden = !open || ttl <= 0;
    const h = $("openBarH");
    if (h) h.textContent = String(ttl);
  }

  // 一鍵清除：多人房整顆藏起來（不是 disabled —— 看得到按不下去更讓人困惑）
  const wipe = $("btnWipe");
  if (wipe) wipe.hidden = open;

  /* 記事本：v26 起兩種房型都有。
     ⚠️ 多人房是「一群人共用一本」，誰都能改能刪 —— 所以記事會顯示作者暱稱，
        不然一群人共用時完全看不出是誰寫的（私人房兩個人還猜得到，一群人不行）。 */
  const notes = $("btnNotes");
  if (notes) notes.hidden = false;

  /* 思念（私人房，愛心）／友誼（多人房，三人半身）——
     兩顆是同一個模組、同一個資料節點（heart/<裝置>），只有圖案、顏色與文案不同。
     ⚠️ 一次只能顯示一顆，另一顆要確實藏起來，
        不然上方列會同時出現兩個膠囊把狀態文字擠掉。 */
  const heart = $("btnHeart"), friend = $("btnFriend");
  if (heart) heart.hidden = open;
  if (friend) friend.hidden = !open;
  Bond.applyMode();

  /* 歷史訊息鎖：v26 起兩種房型都有，規則相同。
     ⚠️ 多人房的密碼是全房共用的，所以這道鎖擋不住同房的人 ——
        它真正防的是「手機被別人拿去滑」。這樣還是有價值，所以照做。 */

  /* 未讀提示：v36 起多人房也有。
     ⚠️ 多人房沒有已讀回條，所以那裡的未讀改用「這台裝置本機記的上次讀到哪」
        （tryMarkRead 本來就有在寫，只是以前沒人拿來用）。
        因此這一列不再跟 showReadReceipt 綁在一起 —— 那個設定只影響
        「要不要讓對方知道我讀了」，跟「我自己要不要被提醒」是兩件事。 */
  const watchRow = $("setWatchRow");
  if (watchRow) watchRow.hidden = !CFG.unreadBell;

  /* ⚠️ 一定要重畫一次。resetList() 跑在這個函式之前，那時候 S.histUnlocked
     還是上一間房留下來的 false —— 不補這一下，多人房的按鈕會頂著「輸入密碼」。 */
  paintLoadMore();
}

/* ── 已讀回條分成兩件事（v56 拆開）──
 *
 * ⚠️⚠️ 這兩個一定要分開。第一版我只在 readReceiptOn() 加了 `&& !S.stealth`，
 *    看起來很漂亮 —— 一行就把 read/ 與 recv/ 兩個節點關掉了。
 *    但那條同時也管著「**訂閱對方的已讀**」與「畫出已讀標記」：
 *    結果隱身時我自己也看不到對方讀了沒。
 *    而使用者選的是**不對等**：「隱身只管我發出去的東西，對方的照常看得到」。
 *    → 一個布林同時管「我寫」跟「我讀」，看起來省事，其實是把兩個需求綁死。
 */
/* 這間房有沒有已讀回條這回事 —— 管「顯示」與「訂閱」 */
function readReceiptOn() {
  return CFG.showReadReceipt && !S.open;
}
/* 我這一次要不要把自己的已讀回報上去 —— 管「寫入」
   ⚠️ 回 false 的時候不必另外做退路：tryMarkRead 本來就有一條
      「改寫本機那份 ReadMark」的路徑（多人房一直走的那條），
      所以「你不在的時候…」那條分隔線照常會有。 */
function readReceiptSend() {
  return readReceiptOn() && !S.stealth;
}

/* 這間房訊息保留幾小時（0 = 不自動刪） */
function ttlHours() {
  return S.open ? (CFG.openRoomTtlHours || 0) : (CFG.roomTtlHours || 0);
}

/* 暱稱顏色代號 → 實際色碼（跟著深淺色主題走） */
function nickColorOf(k) {
  const a = ACCENTS.find((x) => x.k === k) || ACCENTS[0];
  return document.documentElement.dataset.theme === "light" ? a.c : a.d;
}

/* ────────── 在線狀態的兩條門檻 ──────────
 *
 * 在線是每台裝置在 rooms/<房號>/p/<裝置> 寫一筆 { at }，離開刪掉。
 * 正常有兩道保險：離開時主動 remove、斷線時 onDisconnect 幫忙刪。
 * ⚠️ 但手機切 App 時這兩道會「同時」失效 ——
 *    網頁被系統凍結，主動刪除送不出去；連線只是被凍住沒真的關閉，
 *    所以 onDisconnect 也不觸發。要等系統回收分頁才會清，可能是好幾小時後。
 *    強制關瀏覽器、沒電、電梯裡斷訊，結果都一樣。
 *
 * 所以「節點在不在」不能當成「人在不在」，一定要看時間戳。
 * 這是 v25 修掉的 bug：前端只看節點在不在，於是一顆殘留就讓那間房
 * 永遠顯示「有人在線上」，而且沒有任何東西會讓它過期（見坑 #56）。
 *
 * 兩個數字刻意不同，不可以合併：
 *   FRESH  90 秒  → 顯示成「在線上」的門檻。心跳每 45 秒一次，容得下漏一拍。
 *   STALE  10 分鐘 → 「確定是殘留、可以刪掉」的門檻。
 * 用 FRESH 當刪除門檻的話，對方只是切出去看一眼通知，回來就得重建節點。
 *
 * ⚠️ PRESENCE_FRESH_MS 必須跟 functions/index.js 的同名常數一致 ——
 *    不一致的話畫面說「不在線」、雲端卻認為「人在房裡」而不推播，
 *    或是反過來明明在看螢幕還一直收到通知。 */
/* 「對方刪了訊息」這個訂閱要盯多長的一段（v29）。
   ⚠️ 這不是「刪除只在最近 N 則有效」—— 是「即時同步只在最近 N 則有效」。
      比這更舊的訊息被刪掉時，這台裝置要等下一次進房才會看到它消失。
      取 400 是因為一次工作階段幾乎不可能往上翻超過這個數（一頁 30 則），
      而數字愈大、每次進房要下載的密文就愈多。 */
const DEL_WINDOW = 400;

/* ────────── 抓原圖／原檔的兩個時間（v31）──────────
 *
 * ⚠️ Firebase Storage SDK 自己的下載重試預算是「以分鐘計」的。
 *    網路層一失敗它會安靜地重試很久 —— 畫面上就是一顆永遠轉不完的圈，
 *    而且從頭到尾沒有任何一句話。使用者看到的是「下載不了」，
 *    但他不知道是過期、沒網路、還是壞了。
 * ⚠️ 所以要有自己的上限，而且時間到要**講得出發生什麼事**。
 * ⚠️ SLOW 是「還活著」的訊號，不是逾時 —— 大張照片本來就要等，
 *    先講一句比讓人盯著轉圈猜好。
 * ────────────────────────────────────────────── */
const MEDIA_TIMEOUT_MS = 30 * 1000;
const MEDIA_SLOW_MS = 6 * 1000;
const MEDIA_CACHE_TIMEOUT_MS = 3 * 1000;
/* 每次呼叫都重讀設定 —— 測試要把它調短，不然一條測試就得等滿 30 秒。 */
const mediaTimeoutMs = () => (Number(CFG.mediaTimeoutSeconds) || 0) * 1000 || MEDIA_TIMEOUT_MS;
const mediaSlowMs = () => Math.min(MEDIA_SLOW_MS, Math.round(mediaTimeoutMs() * 0.2));

const PRESENCE_FRESH_MS = 90 * 1000;
const PRESENCE_STALE_MS = 10 * 60 * 1000;

/* 伺服器時間的「現在」。時間戳是伺服器寫的，拿本機時鐘去比會被使用者的錯時鐘騙。 */
function nowServer() {
  return Date.now() + (Number(S.offset) || 0);
}

function presenceFresh(rec, now) {
  const at = Number(rec && rec.at);
  return Number.isFinite(at) && at > 0 && (now - at) < PRESENCE_FRESH_MS;
}

/* 友情／思念的計數與標記要掛在「誰」身上。
   多人房＝個人身分（換裝置接得回來）；私人房＝這台裝置（沒有個人密碼那一步）。
   ⚠️ 只有 heart/ 與 hm/ 用它。在線、正在輸入、已讀、推播一律維持裝置層 ——
      那四樣本來就是「這台裝置」的事，混進去只會製造 bug。
   ⚠️ 多人房萬一 memberId 不知為何是空的，退回裝置代號而不是丟例外 ——
      寧可計數暫時分開，也不要讓人進不了房。 */
function bondId() {
  return (S.open && S.memberId) ? S.memberId : S.clientId;
}

/* ────────── 一則訊息是「誰」說的（v28）──────────
 *
 * 訊息的明文只有 s = 送出的那台裝置。多人房有了個人身分之後，
 * 光看 s 會把「同一個人的另一台裝置」判成別人：
 * 用電腦講的話，在手機上會靠左、還掛著自己的暱稱。
 *
 * 所以多人房另外把身分代號包進「加密後的內容」裡（body.u）。
 * ⚠️ 一定要在密文裡，不可以做成明文欄位 ——
 *    明文的話等於在雲端擺一張「哪幾則是同一個人說的」對照表，
 *    那正是刻意不做名冊節點時要避免的東西（見 withNick 的註解）。
 * ⚠️ v28 以前送的訊息沒有 body.u，所以一定要保留「比裝置」這條退路，
 *    否則舊訊息會在原本那台裝置上突然全部跑到左邊。
 * ─────────────────────────────────────────────── */

/* 這則是不是我說的 */
function isMine(m) {
  if (!m) return false;
  if (m.s === S.clientId) return true;                 // 這台裝置送的，永遠算我的
  return !!(S.open && S.memberId && m.body && m.body.u === S.memberId);
}

/* 這則的「作者」是誰 —— 只拿來比兩則是不是同一個人連著講的。
   多人房登入後同一個人的不同裝置會得到同一個值。 */
function msgAuthor(m) {
  if (!m) return "";
  const u = (S.open && m.body && typeof m.body.u === "string") ? m.body.u : "";
  return u || m.s || "";
}

/* 引用塊指向的那則是不是我說的。
   引用只存了 { k, s }，s 一樣是裝置 —— 先回訊息清單裡找本尊，
   找不到（已刪、或還沒往上載到）才退回比裝置。 */
function refIsMine(r) {
  if (!r) return false;
  const src = S.msgs.find((x) => x.k === r.k);
  return src ? isMine(src) : r.s === S.clientId;
}

/* 從一份 p 的快照算出「有幾台『別人的』裝置真的在線上」 */
function livePeers(map, myId, now) {
  const mine = (S.open && S.memberId) ? S.memberId : null;
  return Object.keys(map || {}).filter((k) => {
    if (k === myId) return false;
    // 多人房：自己的另一台裝置也是「自己」，不該讓你看到「有人在線上」
    if (mine && map[k] && map[k].u === mine) return false;
    return presenceFresh(map[k], now);
  });
}


/* ────────────────────────── 6. 聊天室 ────────────────────────── */

async function enterChat() {
  S.gen++;                     // 新的一輪：舊訂閱若還沒解除也不會再作用
  resetList();                 // 從乾淨狀態開始，並讓上一輪飛行中的工作全部作廢
  $("gate").hidden = true;
  $("chat").hidden = false;

  // 先綁好介面再連線 —— 這樣連線期間輸入框就是活的，不會有「打了字送不出去」的空窗
  if (!S.uiBound) { bindChatUI(); bindPlant(); S.uiBound = true; }
  $("peerText").textContent = "連線中";
  $("msgInput").focus();
  renderStickerGrid();
  Burn.load(S.roomId);          // 這間房的即焚開關（預設開啟）
  /* 第二道密碼（v54）。⚠️ 刻意**不 await** —— 讓聊天室照常連線與載入，
     視窗蓋在上面等使用者輸入。await 的話會多一個「白畫面幾百毫秒」的空窗，
     而那個空窗剛好會露出底下的訊息。 */
  Gate2.load(`rooms/${S.roomId}`).then((need) => {
    if (need && !Gate2.passed && $("chat").hidden === false) Gate2.open();
  });
  /* 植物（v55）。⚠️ 同樣**不 await** —— 它是裝飾，慢一點出現無所謂，
     但絕對不可以因為它讀不到就讓人進不了房。 */
  Plant.load(`rooms/${S.roomId}`);
  maskUrl();
  restoreShake();
  syncWatchUI();
  applyScheme(true);
  syncSettingsUI();
  setReply(null);
  $("settingsPanel").hidden = true;
  $("gBellDot").hidden = true;   // 進來看了就不算未讀，紅點先收掉
  applyRoomMode();
  markActive();
  warmPanicUrl();                // 緊急退出要導去的網站：先把 DNS/連線暖起來

  let f;
  try {
    f = await connect();
  } catch (err) {
    console.error(err);
    /* ⚠️ 連線失敗＝人回到偽裝首頁，所以「進房時做過的每一件事都要還原」（v29）。
          v28 以前只把兩個面板切回去就 return，留下三個破綻：
            ‧ applyScheme(true) 已經宣告深色 → 白色的 Google 頁配深色網址列與
              iOS 輸入輔助列，正是 applyScheme 註解自己說會破功的組合
            ‧ 網址停在假網址沒有還原
            ‧ 房間金鑰與房號無限期留在記憶體裡
          另外錯誤訊息不可以留在偽裝首頁上六秒 —— 那是一整句中文。 */
    $("gate").hidden = false;
    $("chat").hidden = true;
    S.password = null; S.key = null; S.roomId = null; S.hk = null;
    S.open = false; S.nick = ""; S.memberId = null; S.stealth = false;
    applyScheme(false);
    unmaskUrl();
    applyRoomMode();            // ⚠️ 要在 S.open 清掉之後才叫，不然 data-room 會停在 open
    toast(connHint(err), 2600);
    return;
  }

  const {
    db, ref, push, set, get, remove, update, increment,
    query, orderByKey, orderByChild, limitToLast, limitToFirst, endBefore, endAt,
    onChildAdded, onChildRemoved, onValue, onDisconnect, serverTimestamp,
  } = f;

  // 連線期間可能已經被閒置計時器或緊急退出踢回首頁，這時就不該再往房間寫東西
  if (!S.roomId || $("chat").hidden) return;

  const base = `rooms/${S.roomId}`;
  const mRef = ref(db, `${base}/m`);
  const myGen = S.gen;                   // 這次進房的代號，用來丟棄過期的非同步結果

  S.subs = [];                           // 這一輪的所有訂閱，離開時要全部解除
  /* v61：在房裡持續盯著「這間房開了審核嗎」與「我還在核准名單上嗎」——
     你在儀表板按撤銷的那一秒，這邊就退回偽裝首頁再跳指定頁。
     ⚠️ 規則層同時會把資料切斷，這裡只是把畫面收乾淨；少了它會看到一堆 permission_denied。 */
  Acl.watch(f, S.roomId);

  /* --- 6.1 在線狀態 --- */
  const meRef = ref(db, `${base}/p/${S.clientId}`);
  /* ⚠️ 多人房順便標上身分代號（v27）：
        ① 儀表板名冊才答得出「誰在線上」，那正是這整條線最早的問題
        ② 你自己的第二台裝置才不會被算成「別人在線上」
     ⚠️ 這是明文的 —— 雲端因此知道「這台裝置是哪個成員」。
        mem/ 本來就已經洩漏成員數，這一步多洩漏的是「裝置屬於誰」。
     ⚠️ 私人房不寫（沒有身分代號），節點形狀維持原樣。 */
  const meRec = () => (S.open && S.memberId)
    ? { at: serverTimestamp(), u: S.memberId }
    : { at: serverTimestamp() };
  /* ⚠️⚠️ 隱身（v56）：整個在線節點都不寫。
        這是四樣被動痕跡裡**最吵的一個** —— 它不只讓對方畫面變成「在線上」，
        `p/<裝置>` 被**建立**還會觸發 Cloud Function（notifyPeerOnline），
        直接推一則通知到對方手機。你只是點開來看一眼，他的鎖定畫面就亮了。
     ⚠️ 心跳與 onDisconnect 也要一起跳過。只擋第一次 set 的話，
        45 秒後那一發心跳會把節點建出來，等於延遲 45 秒才通知對方 —— 更糟。
     ⚠️ 代價（已跟使用者說明）：推播的函式是靠「p 有沒有在 90 秒內更新過」
        判斷你在不在房裡的，所以隱身時你正在看的那則新訊息還是會推到你自己手機。 */
  if (!S.stealth) {
    set(meRef, meRec());
    onDisconnect(meRef).remove();
  }

  /* ⚠️ 這個時間戳一定要「持續更新」，不能只寫進房那一次。
        推播的函式是靠「at 有沒有在 90 秒內更新過」判斷你人在不在房裡的 ——
        只寫一次的話，你在房裡聊到第 91 秒之後，每一則新訊息都會推播給你，
        明明你正盯著螢幕看。
     ⚠️ 只在畫面看得見的時候心跳。切到背景會走 panicExit／cover，
        那時候本來就該被當成「不在房裡」。 */
  const beat = setInterval(() => {
    if (myGen !== S.gen) { clearInterval(beat); return; }
    if (document.hidden) return;
    if (S.stealth) return;               // v56：隱身連心跳都不送（見上面那段）
    set(meRef, meRec()).catch(() => {});
  }, 45000);
  S.presenceBeat = beat;

  /* ⚠️ 判斷「有沒有人在線上」一定要看 at 的新鮮度，不可以只看節點在不在。
        殘留節點是常態（見 PRESENCE_FRESH_MS 上方那段），
        只看存在的話那間房會永遠亮著「有人在線上」。 */
  S.presence = {};
  S.subs.push(onValue(ref(db, `${base}/p`), (snap) => {
    if (myGen !== S.gen) return;
    S.presence = snap.val() || {};
    repaintPresence();
  }));

  /* ⚠️ 還要自己「衰減」。對方是被系統凍結而不是正常離開的話，
        資料庫不會再有任何異動 —— 沒有這個計時器，onValue 永遠不會再觸發一次，
        畫面就會停在最後一次看到的狀態。 */
  const decay = setInterval(() => {
    if (myGen !== S.gen) { clearInterval(decay); return; }
    repaintPresence();
  }, 20000);
  S.presenceDecay = decay;

  /* ⚠️ 一定要在訂閱訊息之前抓。訊息一進來 appendMsg 就會呼叫 tryMarkRead，
     水位馬上被推到最新 —— 那時候再問就永遠拿到「全部已讀」。 */
  S.entryReadKey = null;
  /* ⚠️ 用 readReceiptSend()，不是 readReceiptOn()。隱身時雲端那一筆 read/
        是**上一次正常進房**留下來的，早就過期了 —— 拿它當分隔線的位置，
        會把「你隱身時已經看過的那一段」又標成未讀。本機那一筆才是真的。 */
  if (readReceiptSend()) {
    try {
      const snap = await get(ref(db, `${base}/read/${S.clientId}`));
      const v = snap.val();
      if (typeof v === "string") S.entryReadKey = v;
    } catch (_) {}
    if (myGen !== S.gen) return;
  } else {
    /* 沒有回報已讀的情況（多人房、隱身、或使用者把 showReadReceipt 關掉的私人房）
       改用本機那一筆。
       ⚠️ 分隔線與「你不在的時候…」的定位都靠它 —— 沒有的話 anchor() 只能退回
          「目前載到的最新一則」，而計數幾乎一定比訊息先回來，
          那時候列表還是空的、錨點會變成空字串，標記就永遠漂在最下面
          而且下次回來會被併掉（v27 修的 bug）。 */
    S.entryReadKey = ReadMark.load(S.roomId);
  }

  /* --- 6.2 已送達 / 已讀 ---
     兩段式，分開兩個欄位記「各自到哪一則」，不必每則訊息都寫：
       recv = 這台裝置真的收到、而且解得開了（人在房裡就算，遮罩蓋著也算）
       read = 這個人真的看到了（畫面亮著、遮罩沒蓋、捲到最底才算）
     分開的理由：手機閒置 15 秒就會蓋遮罩、切 App 直接退房，
     只有「已讀」的話對方十次有九次看不到任何回饋，會以為訊息沒送出去。 */
  if (readReceiptOn()) {
    /* ⚠️⚠️ 寫入的把手掛在 readReceiptSend()，訂閱掛在外面的 readReceiptOn() ——
          兩者**不可以合併**。合併的話隱身時連對方的已讀都訂閱不到，
          而使用者要的是不對等：我不留痕跡，但照常看得到他。 */
    if (readReceiptSend()) {
      const myReadRef = ref(db, `${base}/read/${S.clientId}`);
      const myRecvRef = ref(db, `${base}/recv/${S.clientId}`);
      S.markRead = (key) => { set(myReadRef, key).catch(() => {}); };
      S.markRecv = (key) => { set(myRecvRef, key).catch(() => {}); };
    }

    /* 兩個節點結構一樣，取「不是我的那一格」 */
    const peerOf = (v) => {
      let peer = null;
      for (const [cid, key] of Object.entries(v || {})) {
        if (cid !== S.clientId && typeof key === "string" && (!peer || key > peer)) peer = key;
      }
      return peer;
    };

    S.subs.push(onValue(ref(db, `${base}/read`), (snap) => {
      if (myGen !== S.gen) return;
      S.peerReadKey = peerOf(snap.val());
      renderReadMark();
    }));

    S.subs.push(onValue(ref(db, `${base}/recv`), (snap) => {
      if (myGen !== S.gen) return;
      S.peerRecvKey = peerOf(snap.val());
      renderReadMark();
    }));
  }

  /* --- 6.2b 表情回應 ---
     一個人對一則訊息只能有一個表情，所以直接用「裝置代號」當欄位名，
     再點同一個就是取消。整包用 onValue 訂閱：資料很小，而且這樣
     不必自己處理新增／修改／移除三種事件，少一堆邊界情況。 */
  const rxRef = ref(db, `${base}/rx`);
  S.setRx = (key, code) => {
    const one = ref(db, `${base}/rx/${key}/${S.clientId}`);
    (code ? set(one, code) : remove(one)).catch(() => {});
  };
  S.subs.push(onValue(rxRef, (snap) => {
    if (myGen !== S.gen) return;
    S.rx = snap.val() || {};
    paintReactions();
  }));

  /* --- 6.2d 置頂公告（v45）---
     一間房只有一則，整包 onValue 訂閱：資料很小，而且「新的蓋掉舊的」
     用 set() 就是原子的，不必自己處理新增／修改／移除三種事件。
     ⚠️ 任何人都能設、任何人都能下架（使用者決定的）——
        公告本來就是要被蓋掉的東西，鎖住反而會卡住。
     ⚠️ t 用 serverTimestamp()，不用本機時鐘：時間本身沒有拿來顯示，
        但寫本機時間等於在雲端留下「這台裝置的鐘幾點」。 */
  const noticeRef = ref(db, `${base}/notice`);
  /* ⚠️ v50 起公告會多記一個「來源是哪一則」（src），而且一起加密。
        沒有它的話，把一則**即焚**訊息設成公告，訊息燒掉了公告還會留在最上面 ——
        等於幫使用者把一句本來要消失的話永久留下來，方向完全相反。
        有了 src，來源被刪的那一刻公告就跟著下架（見 onChildRemoved）。
     ⚠️ src 一定要包進密文裡。開在外面等於告訴雲端「公告是哪一則訊息」。 */
  S.setNotice = async (text, srcKey) => {
    const sealed = await seal(S.key, { d: String(text || ""), src: srcKey || null });
    await set(noticeRef, { t: serverTimestamp(), iv: sealed.iv, c: sealed.c });
  };
  S.dropNotice = () => remove(noticeRef);
  S.subs.push(onValue(noticeRef, async (snap) => {
    if (myGen !== S.gen) return;
    const v = snap.val();
    if (!v || !v.iv || !v.c) { Notice.clear(); return; }
    let body = null;
    /* ⚠️ 解不開就當作沒有公告，不要畫一個「解不開」的框上去。
          解不開只有兩種可能：金鑰換過了、或資料被改壞 ——
          兩種都不是使用者能處理的，擺一個壞掉的公告在最上面只會擋路。 */
    try { body = await unseal(S.key, v); } catch (_) { Notice.clear(); return; }
    if (myGen !== S.gen) return;                 // 解密是非同步的，回來時可能已經換房了
    /* 記住這則公告是從哪一則訊息來的 —— 那一則燒掉時要跟著下架。 */
    S.noticeSrc = (body && body.src) || null;
    Notice.show(body && body.d);
  }));

  /* --- 6.2c 記事本（v26 起兩種房型都有）---
     整包 onValue 訂閱：一間房的記事本來就不多，這樣不必自己處理
     新增／修改／移除三種事件，少一堆邊界情況。
     ⚠️ 記事跟訊息用同一把金鑰，所以雲端看到的一樣只有密文。 */
  {
    const ntRef = ref(db, `${base}/nt`);

    /* ⚠️ 作者暱稱要包進「密文裡」，不可以另外開一個明文欄位 ——
          那等於在雲端擺一份「這間房有誰」的名單，跟訊息的 withNick 同一個理由。
       ⚠️ 私人房沒有暱稱（S.nick 是空的），所以只有多人房會帶這個欄位，
          舊記事沒有這個欄位也要正常顯示。 */
    S.saveNote = async (key, body) => {
      const payload = { b: String(body) };
      if (S.open && S.nick) { payload.n = S.nick; payload.nc = S.nickColor; }
      const sealed = await seal(S.key, payload);
      if (key) {
        await set(ref(db, `${base}/nt/${key}`), { t: serverTimestamp(), ...sealed });
        return key;
      }
      const p = push(ntRef, { t: serverTimestamp(), ...sealed });
      await p;
      return p.key;
    };
    S.delNote = (key) => remove(ref(db, `${base}/nt/${key}`));

    S.subs.push(onValue(ntRef, async (snap) => {
      if (myGen !== S.gen) return;
      const raw = [];
      /* ⚠️ 大括號一定要，回呼回傳真值會讓 Firebase 中止列舉（見專案紀錄的坑 #1）。 */
      snap.forEach((c) => { raw.push({ k: c.key, v: c.val() }); });

      const out = [];
      for (const it of raw) {
        const v = it.v;
        if (!v || !v.c || !v.iv) continue;
        try {
          const body = await unseal(S.key, v);
          out.push({
            k: it.k, t: v.t || 0, body: String(body.b || ""),
            nick: body.n ? String(body.n) : "", nc: body.nc || "",
          });
        } catch (_) {
          // 解不開（換過密碼的舊記事）—— 畫出來但講清楚，不要讓它人間蒸發
          out.push({ k: it.k, t: v.t || 0, body: "（這則記事解不開）", broken: true, nick: "", nc: "" });
        }
      }
      if (myGen !== S.gen) return;
      out.sort((a, b) => b.t - a.t);              // 最近編輯的排最上面
      S.notes = out;

      /* 面板開著就即時重畫。
         ⚠️ 正在編輯時不要碰輸入框 —— 對方存了一版就把我打到一半的字蓋掉，那是最糟的體驗。 */
      if (!$("notesPanel").hidden && $("ntEdit").hidden) Notes.paint();
    }));
  }

  /* --- 6.2c2 思念（私人房）／友誼（多人房）---
     v26 起兩種房型都掛。同一個節點、同一個模組，差別只有那張皮（見 BOND）。
     ⚠️ 用 increment() 而不是「讀出來 +1 再寫回去」——
        後者兩個人同時按會互相蓋掉，數字會憑空消失。多人房人更多，更不能省。
     ⚠️ 多人房的「peer」是「除了我以外的所有人加起來」，不是某一個人 ——
        onData 的分法（不是我 → 算對方）本來就成立，不必改。 */
  {
    const me = bondId();
    const heartRef = ref(db, `${base}/heart`);
    const mineRef = ref(db, `${base}/heart/${me}`);
    S.bumpHeart = (n) => set(mineRef, f.increment(n));

    /* --- 標記清單（v26）---
       「你不在的時候被想念 N 次」不再是一次性的提示，而是釘在對話裡的歷史。
       ⚠️ 整份清單封成「一顆密文」，不是每枚標記一個子節點 ——
          進房一次讀取、最多一次寫入。拆成子節點的話寫入次數會跟標記數一起長。
       ⚠️ 掛在裝置代號底下：換裝置時用設定面板的移轉碼把代號帶過去就接得上。
       ⚠️ 只在「這一輪真的產生新標記」時才寫，所以進房通常是 0 次寫入。 */
    const markRef = ref(db, `${base}/hm/${me}`);
    S.saveMarks = async (listRaw) => {
      const list = (listRaw || []).map((m) => ({ a: String(m.a || ""), n: Number(m.n) || 0 }));
      await set(markRef, await seal(S.key, { v: list }));
    };
    S.dropMarks = () => remove(markRef);

    /* 先讀標記再掛計數訂閱：onData 一回來就會叫 placeMarks()，
       那時候 S.marks 要已經是雲端的內容，不然第一次會畫成空的再閃一下。 */
    try {
      const snap = await get(markRef);
      const v = snap.val();
      if (myGen !== S.gen) return;
      if (v && v.c && v.iv) {
        const body = await unseal(S.key, v);
        if (myGen !== S.gen) return;
        if (Array.isArray(body.v)) {
          S.marks = body.v
            .map((m) => ({ a: String((m && m.a) || ""), n: Number(m && m.n) || 0 }))
            .filter((m) => m.n > 0)
            .slice(-Heart.MAX_MARKS);
        }
      }
    } catch (_) {
      /* 解不開（換過密碼）或讀不到 —— 標記只是裝飾，不值得為它擋住進房。 */
    }

    S.subs.push(onValue(heartRef, (snap) => {
      if (myGen !== S.gen) return;
      const raw = snap.val() || {};
      Heart.onData(raw);
      /* 植物的果實（v55）：思念總數換算而來。
         ⚠️ 這裡是**免費**的 —— heart 本來就已經訂閱了，不必為了果實多讀一次資料庫。
         ⚠️ 思念只換果實，**不影響**莖高、葉數、分枝（使用者明確要求）。 */
      Plant.hearts = Object.values(raw).reduce((n, v) => n + (Number(v) || 0), 0);
      Plant.paint(false);
    }));
  }

  /* --- 6.2d 新訊息推播的訂閱 ---
     ⚠️ 這一段是**明文**的（endpoint 與兩把公鑰）—— 伺服器要讀得懂才發得出去，
        沒辦法加密。這是推播真正的代價：雲端會多知道「這間房有幾台裝置開了推播」。
        內容本身還是看不到。 */
  const pushRef = ref(db, `${base}/push/${S.clientId}`);
  const onlineRef = ref(db, `${base}/push/${S.clientId}/on`);
  const newMsgRef = ref(db, `${base}/push/${S.clientId}/nm`);
  S.savePush = (rec) => set(pushRef, rec);
  S.dropPush = () => remove(pushRef);
  /* 兩個開關的旗標（v52 起兩者獨立）。
     ⚠️ 只寫那一個子節點，不要整筆 set —— 整筆 set 會把 ep/k/a、另一個開關的旗標
        以及伺服器寫的兩個冷卻時間戳 lm/lo 一起洗掉。
     ⚠️ 多人房不掛上線通知：那裡沒有「對方」可言。 */
  S.saveOnlineAlert = (v) => (v ? set(onlineRef, true) : remove(onlineRef));
  S.saveNewMsgAlert = (v) => set(newMsgRef, !!v);

  /* ── 進入足跡（v53，v55.3 起兩種房分開）──
   * 進房時記一筆「來過這間房」，儀表板才答得出「有沒有別人進過」。
   *
   * ⚠️⚠️ **私人房記裝置，多人房記人。**（v55.3，使用者要求）
   *    私人房沒有個人密碼那一關，裝置就是唯一分得出來的身分 —— 記 cid 是對的。
   *    多人房完全不一樣：名冊 `mem/` 是用**身分代號**當鍵的，
   *    而足跡以前也記 cid —— 兩邊的鍵**永遠對不起來**，後果是：
   *      ① 名冊上每一個人的 `seen[身分代號]` 都不存在
   *         → v54.2 做的登入次數在多人房**從來沒有生效過**（`logins > 0` 永遠是 false）
   *      ② 每一台進過房的裝置各自多出一列「不在名冊上的裝置紀錄」→ 越積越多
   *    改成記身分代號之後，一個人不管換幾台裝置、開幾個分頁都只有**一列**。
   *
   * ⚠️ 這裡沒有多洩漏任何東西：cid 本來就以明文出現在 p/、read/、heart/、push/
   *    的鍵上，房間與裝置的對應關係早就存在。新增的只有時間與次數。
   *
   * ⚠️ f（首次出現）只在節點不存在時寫，而且規則也擋 ——
   *    否則闖進來的人可以把自己的首次時間改成很久以前，看起來像「一直都在」。
   *    所以要先讀一次再決定寫什麼；那一次讀取只有幾十位元組。
   *
   * ⚠️ 失敗一律吞掉。這是一個輔助功能，不可以因為它寫不進去就讓人進不了房。 */
  (async () => {
    try {
      /* ⚠️ 多人房一定要有 memberId 才寫。理論上走不到這裡（沒過個人密碼那一關的
            會在 enterRoom 就 bail 掉，根本不會叫 enterChat），但寫成 `|| S.clientId`
            的話那個「理論上不會發生」會變成**靜靜地把裝置代號混進身分鍵裡**，
            之後完全查不出來。寧可不記。 */
      if (CFG.deviceHistoryEnabled === false) return;
      const who = S.open ? S.memberId : S.clientId;
      if (!who) return;
      const seenRef = ref(db, `${base}/seen/${who}`);
      const snap = await get(seenRef);
      if (myGen !== S.gen) return;
      if (!snap.exists()) {
        /* 全新的一筆。nf（開始計數的時間）＝ f，代表「這個次數是完整的」。 */
        const rec = { f: serverTimestamp(), l: serverTimestamp(), n: 1, nf: serverTimestamp() };
        if (S.open) rec.dv = { [S.clientId]: true };
        await set(seenRef, rec);
        return;
      }
      /* v54.2：登入次數。
         ⚠️ 一定要用 increment()，不是「讀出來 +1 再寫回去」——
            兩台裝置（或同一台開兩個分頁）同時進房會互相蓋掉，而且是靜靜地少算。
         ⚠️ nf 只在**還沒有的時候**補寫。v53～v54 留下來的舊紀錄沒有 n，
            這一次 increment 會讓它變成 1 —— 但那台可能其實已經來過五十次了。
            直接顯示「登入 1 次」就是在說謊，而「只來過 1 次」正好是這個功能裡
            最刺眼的訊號（會讓自己的裝置看起來像陌生人）。
            所以補一個 nf = 現在，畫面上就寫得出「3 次（9/1 起算）」。
            nf 跟 f 差不多的就是完整的次數，不必加註。
         ⚠️ v55.3 的 dv 用 `= true` **不是計數**：同一台重複寫沒有任何副作用，
            所以不必先讀、也不會有兩個分頁互相蓋掉的問題。
            要的是「用過幾台」這個數字 —— 一個人的裝置數突然多一台，
            正是兩組密碼一起外洩最先看得到的訊號。
         ⚠️ 相對路徑（"dv/xxx"）跟其他欄位可以放在同一次 update 裡，只走一趟。 */
      const v = snap.val() || {};
      const patch = { l: serverTimestamp(), n: increment(1) };
      if (typeof v.nf !== "number") patch.nf = serverTimestamp();
      if (S.open) patch[`dv/${S.clientId}`] = true;
      await update(seenRef, patch);
    } catch (_) { /* 寫不進去就算了，不影響聊天 */ }
  })();

  if (Push.supported()) {
    let rec = null;
    try {
      const snap = await get(pushRef);
      if (myGen !== S.gen) return;
      rec = snap.exists() ? (snap.val() || {}) : null;
      S.pushRec = rec;
      /* ⚠️⚠️ `rec.nm !== false`，不是 `rec.nm === true`。
            v52 之前「這筆存在」本身就代表新訊息推播開著，所以**既有的訂閱都沒有 nm**。
            寫成 `=== true` 的話，使用者一升級就會發現推播自己關掉了，
            而他什麼都沒動 —— 而且畫面與雲端會一致地顯示「關著」，查不出哪裡錯。 */
      S.pushOn = !!rec && rec.nm !== false;
      S.onlineOn = !S.open && !!rec && rec.on === true;
    } catch (_) { rec = null; S.pushRec = null; S.pushOn = false; S.onlineOn = false; }

    /* 雲端說開著 → 還要確認「雲端存的位址」就是這台裝置現在的位址（v35）。
       ⚠️ v35 之前這裡只問「瀏覽器有沒有訂閱」，位址換掉是看不出來的 ——
          於是開關顯示開著、伺服器每次都送成功、手機從頭到尾沒響過。
       ⚠️ 對不上就補寫新的；瀏覽器那邊被 iOS 撤掉的話會自己重訂。
          真的救不回來才關掉並清掉那筆孤兒，不然伺服器會一直對著死位址推。 */
    /* ⚠️ 守門條件是「**有沒有這一筆**」，不是「新訊息推播開著嗎」。
          v52 起「只開上線通知」是合法狀態（rec 在、nm 是 false）——
          用 S.pushOn 當條件的話，那種裝置的位址就永遠不會對帳，
          iOS 換掉位址之後上線通知會安靜地永遠收不到。 */
    if (rec) {
      const state = await Push.reconcile(rec);
      if (myGen !== S.gen) return;
      /* ⚠️ 只有 "gone"（確定這台裝置沒有訂閱了）才動手。
            "unknown" 是「這次確認不了」—— 網路不順、SW 還沒 ready 都會走到那裡，
            照著刪的話會為了一次小狀況毀掉一筆本來好好的訂閱。 */
      if (state === "gone") {
        S.pushOn = false;
        S.onlineOn = false;
        S.pushRec = null;
        S.dropPush().catch(() => {});
      }
    }
    syncSettingsUI();
  }

  /* --- 6.3 一鍵清除的同步旗標 --- */
  let wipeInit = false;
  S.subs.push(onValue(ref(db, `${base}/meta/wipe`), (snap) => {
    if (myGen !== S.gen) return;
    const v = snap.val();
    if (!wipeInit) { wipeInit = true; S.wipeMark = v; return; }  // 首次讀取只記錄，不動作
    if (v !== S.wipeMark) {
      S.wipeMark = v;
      resetList();
      Heart.wiped();
      addSystem("對話已清除");
    }
  }));

  /* --- 6.3 過期自毀（預設關閉）---
     roomTtlHours 設 0 就完全不自動刪，訊息一直留著、由你自己決定什麼時候清。
     設大於 0 才會啟用：訊息的時間戳是伺服器時間，所以門檻也要用伺服器時間算，
     直接用本機 Date.now()，只要裝置時鐘快了兩天就會把整室訊息刪光。 */
  const clockOffset = await serverOffset(f);
  S.offset = clockOffset;

  /* ⚠️ 多人房走 openRoomTtlHours（預設 48 小時），私人房走 roomTtlHours（預設 0＝不刪）。
     清理只在「有人進房」時做 —— 免費方案沒有排程，整間房沒人進去就不會有人幫忙刪。
     所以上方那條常駐提示寫的是「只保留最近 48 小時」，不是「滿 48 小時就一定消失」。 */
  const ttl = ttlHours();
  if (ttl > 0) {
    const cutoff = Date.now() + clockOffset - ttl * 3600 * 1000;
    await pruneStale(f, `${base}/m`, cutoff);
  }

  /* ⚠️ 這一行不可以省（v29）。2699 那道守衛之後還有三個 await
        （推播訂閱查詢、時鐘校時、清舊訊息），期間使用者可能已經按了離開、
        切了 App 或被閒置踢掉。少了這一行，下面六筆訂閱會掛在
        leaveChat() 已經清空過的 S.subs 上 —— 變成解不掉的孤兒，
        人已經回到偽裝首頁了，那間房的密文還在背景一直下載。 */
  if (myGen !== S.gen) return;

  /* 順手清掉別人留下的殘留在線節點。
     ⚠️ 這是「清乾淨」不是「修正確性」—— 正確性已經由新鮮度判斷擋住了。
        做這件事只是不想讓資料庫一直長殘骸，順便讓儀表板的原始數字也是真的。
     ⚠️ 一定要放在 serverOffset 之後：拿本機時鐘去比，
        使用者的錶快十分鐘就會把還在房裡的人整批刪掉。
     ⚠️ 不 await —— 這只是打掃，不該擋住進房。 */
  sweepPresence(f, base, myGen);

  /* 舊版會在每次送出時寫一筆明文的 meta/last（最後活動時間），
     但整支程式沒有任何地方讀它 —— 純粹是白送一個「你們幾點在講話」出去。
     現在不寫了，順手把舊房間殘留的那一筆清掉。 */
  remove(ref(db, `${base}/meta/last`)).catch(() => {});

  /* --- 6.4 訂閱最新訊息 + 往上分段載入 ---
     解密是非同步的，若各自 await 會依「誰先解完」而不是「誰先到」排序，
     所以串成一條佇列，確保訊息順序跟送達順序一致。 */
  const liveQ = query(mRef, orderByKey(), limitToLast(CFG.pageSize));
  let chain = Promise.resolve();
  S.subs.push(onChildAdded(liveQ, (snap) => {
    chain = chain
      .then(async () => {
        if (myGen !== S.gen) return;
        const m = await decodeMsg(snap);
        if (!m) return;
        // 解密期間已經離開這一輪 → 丟棄，但佔位要還回去（不然這則就永久消失）
        if (myGen !== S.gen) { S.keys.delete(m.k); return; }
        appendMsg(m);
      })
      .catch(() => {});
  }));

  /* 往上翻的三道保險，缺一不可：
       ① IntersectionObserver：正常情況下捲到頂就自動載入
       ② 捲動事件裡的位置判斷：iOS 慣性捲動時 ① 有機會整個跳過不觸發
       ③ 畫面上那顆「載入更早的訊息」按鈕：前兩道都失靈時，手動一定按得到 */
  S.loadOlder = () => loadOlder(f, mRef, myGen);

  /* ⚠️ 停在頂端時，前面那兩道保險其實是**同時失效**的：
        `.c-scroll` 是 overscroll-behavior: contain，到頂之後往下拉不產生捲動事件；
        sentinel 也一直在畫面內，不會再有「進入視野」可以觸發。
        所以再加第三道：只要 sentinel 還看得見就每隔兩秒自己試一次。
        loadOlder() 本身有 loadingOlder 與 TOP_RECHECK_MS 兩層節流，不會打爆。
        載進來之後捲動位置會被推回去，sentinel 就離開視野、計時器自己停。 */
  let topTick = null;
  const stopTick = () => { if (topTick) { clearInterval(topTick); topTick = null; } };
  const io = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting) { stopTick(); return; }
    // 上鎖期間不自動載入，避免使用者一捲到頂就被彈出九宮格
    if (!S.histUnlocked) return;
    await loadOlder(f, mRef, myGen);
    if (topTick || myGen !== S.gen) return;
    let ticks = 0;
    topTick = setInterval(() => {
      // 上限是保險絲：真的到頂而且使用者就停在那裡的話，兩分鐘後別再問了
      if (myGen !== S.gen || ++ticks > 60) { stopTick(); return; }
      if (S.histUnlocked) loadOlder(f, mRef, myGen);
    }, 2000);
  }, { root: $("scroller"), rootMargin: "120px" });
  io.observe($("topSentinel"));
  S.subs.push(() => { io.disconnect(); stopTick(); });

  /* --- 6.5 送出訊息 --- */
  /* Firebase 離線時 push() 會先寫進本機快取 —— 訊息「立刻」出現在畫面上，
     但其實還沒到伺服器，promise 會一直懸著。這時候關掉分頁訊息就永久消失，
     而你以為傳出去了。所以每一則都要標記「還沒落地」，落地了才拿掉。 */
  async function sendPayload(payload) {
    const sealed = await seal(S.key, payload);
    const p = push(mRef, { s: S.clientId, t: serverTimestamp(), ...sealed });
    const key = p.key;                     // 真實 Firebase 同步就給 key，不必等落地

    if (key) { S.pending.add(key); paintSendState(); }

    try {
      await p;
    } catch (err) {
      if (key) { S.pending.delete(key); S.failed.add(key); paintSendState(); }
      throw err;
    }
    if (key) { S.pending.delete(key); paintSendState(); }
  }
  S.send = sendPayload;

  /* --- 6.5b 連線狀態：斷線時明講，不要讓人誤以為訊息送出去了 --- */
  S.subs.push(onValue(ref(db, ".info/connected"), (snap) => {
    if (myGen !== S.gen) return;
    const online = snap.val() === true;
    const bar = $("offlineBar");
    if (bar) bar.hidden = online;
    if (online && S.failed.size) { S.failed.clear(); paintSendState(); }
  }));

  /* --- 6.6 一鍵清除雙方紀錄 --- */
  S.wipe = async () => {
    const mark = Date.now();
    S.wipeMark = mark;                 // 先記錄，避免自己被自己的通知再清一次

    /* 照片原圖與影片放在 Cloud Storage，刪訊息不會連帶刪掉它們 —— 要自己來。
       ⚠️ 只刪得掉「這台裝置目前載進來的那些」。翻不到的舊媒體刪不到，
          但生命週期規則最多 7 天也會把它們收走，不會永久留著。 */
    const blobs = S.msgs.filter((m) => MEDIA_KINDS.includes(m.kind)).map((m) => m.body);

    // 先送出清除旗標讓對方立刻停手，再刪資料；最後補刪一次，
    // 收掉「旗標送達到刪除完成之間」剛好擠進來的訊息
    await set(ref(db, `${base}/meta/wipe`), mark);
    await remove(mRef);
    // 訊息之外的殘留也要一起清乾淨：
    //   read / recv 存的是訊息鍵，那串字本身就含時間戳，等於「你幾點在看手機」
    //   typing 是打字時間戳、meta/last 是舊版留下來的最後活動時間
    await Promise.all([
      remove(ref(db, `${base}/read`)),
      remove(ref(db, `${base}/recv`)),
      remove(ref(db, `${base}/typing`)),
      remove(ref(db, `${base}/rx`)),
      remove(ref(db, `${base}/meta/last`)),
      /* 思念的計數要一起歸零 —— 使用者明確說「只會隨著清除對話而清除」。 */
      remove(ref(db, `${base}/heart`)),
      /* 置頂公告也一起清（v45，使用者決定的）——
         清除是「這段對話當作沒發生過」，留一則公告在最上面很突兀。 */
      remove(ref(db, `${base}/notice`)),
      /* ⚠️ 這裡刻意「不刪」 nt（記事本）。
         一鍵清除清的是對話；記事本是拿來留的東西，一起清掉會讓人不敢按這顆鈕。
         要清記事只能一則一則刪，或用儀表板遠端清空整間房。 */
    ]);
    await remove(mRef);
    await Promise.all(blobs.map((b) => dropMediaBlob(b)));
    // 這間房被清空了，也把它從未讀提示清單移除 —— 沒訊息可提示，位址也沒必要繼續留著
    Watch.remove(S.roomId);
    syncWatchUI();
    S.peerReadKey = null; S.peerRecvKey = null;
    S.lastReadSent = null; S.lastRecvSent = null;
    resetList();
    Heart.wiped();
    addSystem("對話已清除");
    toast("雙方的對話紀錄都已刪除");
  };

  /* --- 6.6b 正在輸入 ---
     只寫一個時間戳，不寫任何內容。5 秒沒更新就當作停了。
     斷線時 onDisconnect 會清掉，避免對方畫面卡在「正在輸入」。 */
  /* ⚠️ v56：隱身時不寫 typing。
        這裡**故意不去動 `Typing.enabled()` 本身** —— 那是使用者在設定裡按的開關，
        讓它在隱身時回 false 的話，設定面板那一格會跟著變成關閉，
        看起來像「我的偏好被偷偷改掉了」。隱身是這次進房的事，設定是長期的事。 */
  if (Typing.enabled() && !S.stealth) {
    const myTypeRef = ref(db, `${base}/typing/${S.clientId}`);
    onDisconnect(myTypeRef).remove();
    let lastPing = 0;
    S.ping = () => {
      if (!Typing.enabled() || S.stealth) return;
      const now = Date.now();
      if (now - lastPing < 1800) return;        // 節流，不要每個按鍵都寫
      lastPing = now;
      set(myTypeRef, serverTimestamp()).catch(() => {});
    };
    S.stopTyping = () => { lastPing = 0; remove(myTypeRef).catch(() => {}); };
  }

  S.subs.push(onValue(ref(db, `${base}/typing`), (snap) => {
    if (myGen !== S.gen) return;
    const v = snap.val() || {};
    let peer = 0;
    for (const [cid, ts] of Object.entries(v)) {
      if (cid !== S.clientId && typeof ts === "number" && ts > peer) peer = ts;
    }
    S.peerTyping = peer;
    paintPeerState();
  }));

  /* --- 6.7 刪除單則（雙方同步） ---
     刻意只做刪除、不做編輯 —— 能改內容就會有「他到底原本寫什麼」的爭議。 */
  S.delMsg = async (key) => {
    /* ⚠️ 順序：先撈出這則的內容（等一下要用它的 Storage 路徑），再刪。
       刪完就再也找不到路徑了，那張原圖會變成沒人指得到的孤兒，
       只能等 7 天後被生命週期規則收走。 */
    const victim = S.msgs.find((x) => x.k === key);
    await remove(ref(db, `${base}/m/${key}`));
    remove(ref(db, `${base}/rx/${key}`)).catch(() => {});   // 表情也要跟著走，不留殘留
    if (victim && MEDIA_KINDS.includes(victim.kind)) dropMediaBlob(victim.body);
  };

  /* 對方刪掉一則、或過期清理刪掉舊訊息時，我這邊也要即時消失。
     少了這個訂閱，「刪除」就只是自己看不到而已，對方畫面還在 —— 那比不做更糟。 */
  /* ⚠️ 這個訂閱不可以掛在「裸的 mRef」上（v29 修）。
        對一個沒有加任何 query 的 Reference 掛 child 事件，等於註冊 default query ——
        Firebase 會把 rooms/<房號>/m 底下**整包**送過來，包含每一張貼圖與
        照片縮圖的 base64。每個人、每次進房都來一次，而訊息又永不刪，
        所以這條成本會單調成長：幾百則含圖的訊息就是每次進房好幾 MB。
        儀表板早就為了同一個理由改用 shallow REST（見 admCount 的註解），
        聊天室這條卻是每天都在走的路。
     ⚠️ 但加了 limitToLast 之後 child_removed 多了第二個來源：
        舊訊息被新訊息「擠出視窗」時也會觸發。所以動畫面之前要先確認
        那一則是真的不見了 —— 一次幾十位元組，換掉每次進房好幾 MB。 */
  const delQ = query(mRef, orderByKey(), limitToLast(DEL_WINDOW));
  S.subs.push(onChildRemoved(delQ, async (snap) => {
    if (myGen !== S.gen) return;
    const k = snap.key;
    if (!S.keys.has(k)) return;
    try {
      const still = await get(ref(db, `${base}/m/${k}`));
      if (myGen !== S.gen) return;
      if (still.exists()) return;         // 只是被擠出視窗，不是被刪掉
    } catch (_) { /* 查不出來就照舊當成刪除 —— 寧可少顯示，不要多顯示 */ }
    if (!S.keys.has(k)) return;           // await 期間可能已經被別條路徑處理掉了
    S.keys.delete(k);
    S.pending.delete(k); S.failed.delete(k);
    const i = S.msgs.findIndex((m) => m.k === k);
    if (i >= 0) S.msgs.splice(i, 1);
    const list = $("msgList");
    list.querySelector(`.row[data-k="${k}"]`)?.remove();

    /* 刪乾淨：引用到這一則的回覆，預覽字要當場換掉，不能留著原文 */
    list.querySelectorAll(`.q[data-to="${k}"] .q-snip`).forEach((sn) => {
      sn.textContent = "訊息已刪除";
      sn.classList.add("gone");
    });
    // 正在回覆它 / 正放大它的貼圖 → 一併收掉，畫面上不留任何殘影
    if (S.replyTo && S.replyTo.k === k) setReply(null);
    if (S.lightboxKey === k) closeLightbox();

    /* ⚠️ 這一則如果正是公告的來源，公告要跟著走（v50）。
          即焚的訊息燒掉了、公告卻還掛在最上面的話，那句話等於沒有燒掉。 */
    if (S.noticeSrc && S.noticeSrc === k && S.dropNotice) {
      S.noticeSrc = null;
      S.dropNotice().catch?.(() => {});
    }

    if (S.oldestKey === k) S.oldestKey = S.msgs.length ? S.msgs[0].k : null;
    $("emptyState").hidden = S.msgs.length > 0;
    renderReadMark();
    paintSendState();
    paintLoadMore();
  }));

  /* --- 6.8 離開時要做的清理 --- */
  S.cleanup = () => {
    try { clearInterval(S.presenceBeat); S.presenceBeat = null; } catch (_) {}
    try { clearInterval(S.presenceDecay); S.presenceDecay = null; } catch (_) {}
    /* ⚠️ v61：被撤銷核准的那一刻規則已經把寫入切斷，這兩筆 remove 會被拒 ——
          那是預期的（onDisconnect 會在斷線時由伺服器收掉），不要讓它變成未處理的 rejection。 */
    try { remove(meRef).catch(() => {}); } catch (_) {}
    try { remove(ref(db, `${base}/typing/${S.clientId}`)).catch(() => {}); } catch (_) {}
  };

  /* 初次載入穩定之後，停在「上次讀到的地方」而不是最底。
     訊息是一則一則非同步解密進來的，所以等安靜下來再做。 */
  let settleT = null;
  const settle = () => {
    clearTimeout(settleT);
    settleT = setTimeout(() => {
      if (myGen !== S.gen) return;
      S.onSettle = null;               // 之後就是一般的即時訊息，不再重新定位
      anchorUnread();
      tryMarkRecv();
      tryMarkRead();
    }, 450);
  };
  S.onSettle = settle;
  settle();
}

/* 畫「以下是新訊息」分隔線並捲過去。
   ⚠️ 進房只載最新一頁，未讀如果比那一頁還多，最舊的未讀根本沒被載進來 ——
      那種情況一定要明講，不然使用者會以為「就這些」而錯過訊息。 */
/* ⚠️ 用 finally 包起來：anchorUnread 有好幾條提早 return 的路徑
      （沒未讀、找不到那一列…），每一條都得重新擺一次思念的提示，
      不然只有「剛好有未讀」的情況擺得對。 */
function anchorUnread() {
  /* ⚠️ 順序很重要：先宣告「訊息載完了」，placeMarks() 才敢建立標記。
        這個函式跑在 settle 裡（列表安靜下來 450ms 之後），
        是唯一能確定「錨點算得準」的時機。 */
  Heart.listed = true;
  try { anchorUnreadInner(); } finally { Heart.placeMarks(); }
}

function anchorUnreadInner() {
  const list = $("msgList");
  const sc = $("scroller");
  list.querySelectorAll(".newline").forEach((el) => el.remove());
  const banner = $("manyUnread");
  if (banner) banner.hidden = true;

  const mark = S.entryReadKey;
  if (!mark || !S.msgs.length) return;

  /* 第一則「比上次讀到的還新、而且不是我自己說的」。
     ⚠️ 是「我說的」不是「這台裝置送的」—— 多人房拿裝置比的話，
        用電腦講的那幾句到手機上會被算成未讀，分隔線就釘錯位置。 */
  const first = S.msgs.find((m) => m.k > mark && !isMine(m));
  if (!first) return;                               // 沒有未讀 → 維持在最底

  const row = list.querySelector(`.row[data-k="${first.k}"]`);
  if (!row) return;

  const div = document.createElement("div");
  div.className = "newline";
  div.textContent = "以下是新訊息";
  row.before(div);

  // 上次讀到的那一則比這次載入的最舊還舊 → 中間有沒載進來的未讀
  if (banner && S.oldestKey && mark < S.oldestKey) banner.hidden = false;

  // 捲到分隔線，上面留一點空間看得到前文
  sc.scrollTop = Math.max(0, div.offsetTop - 70);
  paintJump();
}

/* 清掉超過 TTL 的訊息。
   一次只抓 500 筆是 Firebase 的實務上限，但只刪一輪的話超過 500 筆的房間永遠清不完，
   所以要跑到乾淨為止（最多 20 輪 = 10000 筆，避免萬一無法刪除時卡死）。 */
/* 訊息時間戳是伺服器時間，門檻也要用伺服器時間算。
   直接用本機 Date.now()，只要裝置時鐘快了兩天就會把整室訊息刪光。 */
async function serverOffset(f) {
  const { db, ref, onValue } = f;
  try {
    return await new Promise((res) => {
      let done = false;
      /* ⚠️ 兩條路徑都要解除訂閱（v29）。逾時那條原本只 res(0) 就走了，
            訂閱留在那裡沒人收 —— 它是全檔唯一一個沒有進 S.subs 的監聽器，
            離開房間時掃不到它，每逾時一次就多留一個。 */
      const off = () => { try { un(); } catch (_) {} };
      const un = onValue(ref(db, ".info/serverTimeOffset"), (s) => {
        if (done) return;
        done = true;
        res(Number(s.val()) || 0);
        setTimeout(off, 0);
      });
      setTimeout(() => { if (!done) { done = true; res(0); off(); } }, 2000);
    });
  } catch (_) { return 0; }
}

async function pruneStale(f, mPath, cutoff) {
  const { db, ref, get, update, query, orderByChild, endAt, limitToFirst } = f;
  const mRef = ref(db, mPath);
  let removed = 0;
  try {
    for (let pass = 0; pass < 20; pass++) {
      const stale = await get(query(mRef, orderByChild("t"), endAt(cutoff), limitToFirst(500)));
      const updates = {};
      stale.forEach((c) => { updates[c.key] = null; });
      const n = Object.keys(updates).length;
      if (!n) break;
      await update(mRef, updates);
      removed += n;
      if (n < 500) break;
    }
  } catch (err) { console.warn("prune skipped:", err.message); }
  return removed;
}

async function decodeMsg(snap) {
  const v = snap.val();
  if (!v || !S.key || S.keys.has(snap.key)) return null;

  // 先佔位再解密：解密是非同步的，不先登記的話同一則可能被解兩次、畫兩份
  S.keys.add(snap.key);
  const epoch = S.epoch;

  try {
    const body = await unseal(S.key, v);
    /* ⚠️ 期間已換房或清空 → 丟棄，但一定要把佔位「還回去」。
       忘了還的話這則訊息就死了：之後不管怎麼往上翻，
       都會在最上面那個 S.keys.has() 被判成「已經載過了」而永遠跳過。 */
    if (epoch !== S.epoch) { S.keys.delete(snap.key); return null; }
    return { k: snap.key, s: v.s, t: v.t || Date.now(), kind: body.k, body };
  } catch (_) {
    /* 解不開（換過密碼的舊訊息、或資料被改壞）。
       ⚠️ 不可以回 null 讓它人間蒸發。舊版就是這樣，後果是：
          ‧ 儀表板說 387 則，畫面上只有一兩百則，查不出差在哪
          ‧ 往上翻時游標只跟著「解得開的那幾則」走，變成一次只冒一則
          ‧ 冒出來的那則被插在最上面，看起來就像順序亂跳
       改成回一個佔位：則數對得起來，也看得出來到底有幾則有問題。 */
    return { k: snap.key, s: v.s, t: v.t || Date.now(), kind: "err", body: null };
  }
}

/* ────────────────────────── 九宮格密碼盤（兩處共用）──────────────────────────
 * 用在兩個地方：
 *   ① 閒置遮罩的解鎖
 *   ② 第一次要「載入更早的訊息」時
 *
 * 為什麼不用輸入框：沒有 <input> / contenteditable 就沒有自動填入、
 * 不會叫出系統輸入法、也不會留在鍵盤的輸入紀錄裡。
 * 畫面上只顯示「幾個點」代表位數，不顯示按了什麼 —— 旁邊的人看不出來。
 * ─────────────────────────────────────────────────────────────────────────── */
function makePad(cfg) {
  return {
    buf: "",
    tries: 0,
    busy: false,      // verify 還在跑的時候不收第二次送出

    reset(msg) {
      this.buf = "";
      this.paint();
      const s = $(cfg.sub);
      if (s) { s.textContent = msg || cfg.sub0; s.classList.remove("bad"); }
    },

    paint() {
      const d = $(cfg.dots);
      if (!d) return;
      d.replaceChildren();
      for (let i = 0; i < this.buf.length; i++) {
        const el = document.createElement("span");
        el.className = "c-pad-dot";
        d.appendChild(el);
      }
    },

    key(k) {
      if (k === "del") { this.buf = this.buf.slice(0, -1); this.paint(); return; }
      if (k === "go") { this.submit(); return; }
      if (this.buf.length >= 24) return;          // 純粹防呆
      this.buf += k;
      this.paint();
    },

    /* ⚠️ v54 起可以帶 cfg.verify(tried) 自己決定「對不對」（第二道密碼用）。
          沒帶就維持原本的行為：跟房間密碼比。
       ⚠️ verify 可能是非同步的（要推導），所以整支改成 async ——
          但**不可以**在等待期間讓人一直按送出，不然三次機會會被一口氣用光。 */
    async submit() {
      if (this.busy) return;
      const tried = this.buf;
      this.buf = "";
      this.paint();

      let ok;
      if (cfg.verify) {
        this.busy = true;
        try { ok = await cfg.verify(tried); }
        catch (_) { ok = false; }
        finally { this.busy = false; }
      } else {
        ok = !!(S.password && tried === S.password);
      }
      if (ok) { this.tries = 0; cfg.onOk(); return; }

      /* ⚠️ verify 可以回 "shown"，意思是「這組不能用，但我已經自己把原因
            寫在副標上了」。這時候不要覆蓋那句話，也不要算一次錯 ——
            「設定」盤根本沒有試錯次數的概念。
            少了這一條，設定第二道密碼時打太短會看到
            「密碼不對，還可以試 98 次」（真的踩過，v54）。 */
      if (ok === "shown") return;

      this.tries++;
      if (navigator.vibrate) { try { navigator.vibrate(60); } catch (_) {} }
      if (this.tries >= cfg.maxTries) { this.tries = 0; cfg.onFail(); return; }

      const s = $(cfg.sub);
      if (s) {
        s.textContent = `密碼不對，還可以試 ${cfg.maxTries - this.tries} 次`;
        s.classList.add("bad");
      }
    },

    bind() {
      $(cfg.grid)?.addEventListener("click", (e) => {
        const b = e.target.closest(".c-key");
        if (b) this.key(b.dataset.k);
      });
    },
  };
}


/* ══════════════════════════════════════════════════════════════
 *  植物（v55）—— 私人房的背景，兩個人共養一株
 *
 *  使用者的話：「我想要在聊天室內加入養成可以互動的公仔…我希望公仔會隨時間慢慢成長」
 *  → 討論後定案：**背景植物 ＋ 扇形選單**，共享一株，只做私人房。
 *
 *  ⚠️⚠️ **「背景」是安全設計，不只是美觀。**
 *     植物是 pointer-events:none 的背景，觸控直接穿過去，所以它永遠不會被點到。
 *     少了這一條，「戳一下植物」就等於 panicTaps:2 / panicTapWindowMs:500 /
 *     panicTapRadius:44 那個「同一處 500ms 內點兩下＝緊急退出」的手勢 ——
 *     使用者會在摸植物的時候莫名其妙被彈回偽裝首頁。
 *     全畫面只有計量條那一顆 <button> 跟植物有關，而 button 本來就在連點的排除清單裡。
 *
 *  ⚠️⚠️ **外觀是算出來的，不是存起來的。**
 *     雲端只有「出生時間」與「每台裝置的互動次數／上次動作時間」，
 *     階段與果實數都是當場算的。所以**沒有任何東西需要讀出來改一改再寫回去**，
 *     兩個人同時照顧也不會有人的動作靜靜消失（v54.2 剛踩過那一顆）。
 *
 *  ⚠️ 外洩程度跟現有的 heart（思念次數，本來就是明文數字掛在裝置代號上）
 *     完全同一級，不是新的一類洩漏。
 * ══════════════════════════════════════════════════════════════ */

/* 三個照顧動作。冷卻以小時為單位（使用者指定）。
   ⚠️ 三個動作給的經驗**一樣多** —— 經驗數值是隱藏的，給不同的分數使用者根本看不出來，
      只會讓公式多一個沒人驗得到的分支。差異放在冷卻長度，那個看得見。 */
const PLANT_ACTS = {
  w: { label: "澆水",   hours: 1,  says: [
    "土壤濕潤了，葉子舒展開來", "水順著葉脈流下去", "它喝飽了，看起來精神一點",
    "盆底滲出一點水，剛剛好"] },
  s: { label: "曬太陽", hours: 3,  says: [
    "葉子朝著光轉了過去", "曬得暖暖的", "新葉的邊緣透出光", "影子在土上慢慢移動"] },
  t: { label: "鬆土",   hours: 5, says: [
    "土鬆開了，根有地方伸展", "翻過的土有雨後的味道", "根鬚舒服地伸展開來"] },
};

/* 成長。
   ⚠️ 目標節奏：**認真養約 6 週滿級，完全不理約 5 個月也會滿級**。
      時間保證你一定會長大，互動負責讓槓「當場往前跳一格」——
      少了後者，隱藏數值 ＋ 慢速成長 ＝ 進度條看起來永遠不動，使用者會以為壞了。
      一天最多 6+3+2 = 11 次互動：主動 24+66 = 90/天，完全不理 24/天。 */
const PLANT_EXP_HOUR = 1;      // 每小時
const PLANT_EXP_ACT = 6;       // 每次互動
const PLANT_STEPS = [0, 120, 520, 1500, 3800];   // 進入第 2/3/4/5 階的門檻
const PLANT_NAMES = ["種子", "發芽", "幼苗", "分枝", "開花"];

/* 每 N 次思念換一顆果實。⚠️ 果實**不影響**成長 —— 使用者明確要求。 */
const PLANT_HEART_PER_FRUIT = 25;

/* ── 消耗思念的照顧（v57）──
 * 使用者的話：「加入消耗思念愛心也可以 鬆土 灌溉 曬太陽…原本的按鈕下方加入
 * 粉色的特殊按鈕並告知需要消耗的數量…冷卻時間與原本一樣」
 *
 * 價格照冷卻長度排成階梯（使用者說「從 300 起跳」）。
 *
 * ⚠️⚠️ 付費那一條冷卻**寫在自己的欄位**（pw／ps／pt），不是共用 w／s／t。
 *    共用的話會被規則直接擋掉 —— `w` 的 validate 是
 *    `newData.val() === now && (!data.exists() || now > data.val() + 3600000)`，
 *    **冷卻是寫在資料庫規則裡的**，付費想繞過它根本寫不進去，
 *    而且失敗是**靜靜的**（規則拒絕沒有錯誤訊息）：思念扣了、植物沒動。
 *    分開之後變成兩條各自獨立、長度相同的冷卻 —— 照顧頻率翻倍，但不能無限連按。
 *
 * ⚠️ 使用者選的是「**直接扣總數**」：花掉的思念會讓果實跟著變少
 *    （300 思念 = 12 顆果實）。這推翻了 v24 的「思念不可逆」，是他明確的決定。 */
const PLANT_PAY = { w: 300, s: 500, t: 700 };

/* ── 畫植物 ──────────────────────────────────────────────
 * 全部由參數算出來，沒有任何一張圖是手刻的，所以「成長」就只是幾個數字在變。
 * ⚠️ viewBox 固定 0 0 100 142、從底部中央長上來 —— 底邊就是土線（v55.2 起土畫在 SVG 外面），
 *    升級時整株才不會上下跳（當背景的時候這件事很明顯）。
 * ⚠️ 綠色寫死不跟主題色走（使用者指定）。深淺色主題下都是同一株。
 */
function plantRnd(seed) {
  let s = ((seed * 9301 + 49297) % 233280 + 233280) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const PLANT_SEASON = {
  spring: { leaf: "#8ec97a", back: "#6b9e5a", flowers: .35, fruit: 0,  drop: 0,  bud: true },
  summer: { leaf: "#7fb06a", back: "#5d8a4e", flowers: 1,   fruit: .3, drop: 0,  bud: false },
  autumn: { leaf: "#c8a55c", back: "#a8813f", flowers: 0,   fruit: 1,  drop: .25, bud: false },
  winter: { leaf: "#8a9e7c", back: "#6b7d61", flowers: 0,   fruit: .15, drop: .6, bud: true },
};
const PLANT_SHAPE = [
  null,
  { h: 13,  leaves: 0, w: 3.2, branch: 0, flower: 0 },
  { h: 38,  leaves: 2, w: 4.6, branch: 0, flower: 0 },
  { h: 68,  leaves: 5, w: 5.8, branch: 0, flower: 0 },
  { h: 100, leaves: 6, w: 7.2, branch: 2, flower: 0 },
  { h: 130, leaves: 7, w: 8.6, branch: 3, flower: 6 },
];

/* 由粗到細的莖。⚠️ 用 stroke 畫是等寬的，看起來像一根鐵絲 —— 真的植物由粗到細。 */
function plantStem(x0, y0, qx, qy, x1, y1, w0, w1) {
  const wq = (w0 + w1) / 2;
  return `<path d="M${(x0 - w0).toFixed(1)} ${y0.toFixed(1)} Q${(qx - wq).toFixed(1)} ${qy.toFixed(1)} ${(x1 - w1).toFixed(1)} ${y1.toFixed(1)}`
    + ` L${(x1 + w1).toFixed(1)} ${y1.toFixed(1)} Q${(qx + wq).toFixed(1)} ${qy.toFixed(1)} ${(x0 + w0).toFixed(1)} ${y0.toFixed(1)} Z" fill="var(--p-stem)"/>`;
}
/* 一片葉子：葉柄 ＋ 尖頭葉身 ＋ 中脈側脈 ＋ 一道亮面。
   ⚠️ 寬高比是「像不像葉子」最關鍵的數字。0.34 太胖，放大看像箭頭；真葉多半 0.24～0.28。 */
function plantLeaf(x, y, len, ang, o) {
  o = o || {};
  const w = len * 0.26, pet = len * 0.16;
  const c = o.color || "var(--p-leaf)", vein = o.vein || "var(--p-vein)", curl = o.curl || 0;
  const body = `M${pet} 0 C${(pet + len * .14).toFixed(1)} ${(-w * 1.06).toFixed(1)} ${(pet + len * .55).toFixed(1)} ${(-w * .86 + curl).toFixed(1)} ${len.toFixed(1)} ${curl.toFixed(1)}`
    + ` C${(pet + len * .58).toFixed(1)} ${(w * .74 + curl).toFixed(1)} ${(pet + len * .16).toFixed(1)} ${(w * .88).toFixed(1)} ${pet} 0 Z`;
  let v = `<path d="M${pet} 0 Q${(len * .6).toFixed(1)} ${(curl * .4).toFixed(1)} ${(len * .94).toFixed(1)} ${(curl * .9).toFixed(1)}" fill="none" stroke="${vein}" stroke-width="${(len * .045).toFixed(2)}" opacity=".5" stroke-linecap="round"/>`;
  for (let i = 1; i <= 2; i++) {
    const tt = 0.3 + i * 0.22, bx = pet + (len - pet) * tt, by = curl * tt * 0.5;
    v += `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} l${(len * .16).toFixed(1)} ${(-w * .42).toFixed(1)} M${bx.toFixed(1)} ${by.toFixed(1)} l${(len * .16).toFixed(1)} ${(w * .42).toFixed(1)}" fill="none" stroke="${vein}" stroke-width="${(len * .032).toFixed(2)}" opacity=".38" stroke-linecap="round"/>`;
  }
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)})">`
    + `<path d="M0 0 L${pet.toFixed(1)} 0" stroke="var(--p-stem)" stroke-width="${(len * .075).toFixed(2)}" stroke-linecap="round" fill="none"/>`
    + `<path d="${body}" fill="${c}"/>`
    + `<path d="M${(pet + len * .1).toFixed(1)} ${(-w * .32).toFixed(1)} Q${(len * .55).toFixed(1)} ${(-w * .62 + curl * .4).toFixed(1)} ${(len * .9).toFixed(1)} ${(curl * .8).toFixed(1)}" fill="none" stroke="#fff" stroke-width="${(len * .05).toFixed(2)}" opacity=".13" stroke-linecap="round"/>`
    + v + `</g>`;
}
/* ⚠️ 花不可以太大 —— 6 瓣兩層 ×0.66 半徑放大看像貼紙。花是點綴不是主角。 */
const PLANT_PETALS = ["#f2a8c4", "#f6c1a0", "#efb7de", "#f5d08a", "#e79ab4"];
function plantFlower(x, y, r, seed) {
  const col = PLANT_PETALS[seed % PLANT_PETALS.length];
  let p = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">`;
  for (let L = 0; L < 2; L++) {
    const rr = r * (L ? .58 : 1), off = L ? 36 : 0;
    for (let i = 0; i < 5; i++) {
      p += `<ellipse cx="0" cy="${(-rr * .74).toFixed(1)}" rx="${(rr * .40).toFixed(1)}" ry="${(rr * .58).toFixed(1)}" fill="${col}" opacity="${L ? .55 : .95}" transform="rotate(${i * 72 + off})"/>`;
    }
  }
  return p + `<circle r="${(r * .36).toFixed(1)}" fill="#f6d98a"/><circle cx="${(-r * .12).toFixed(1)}" cy="${(-r * .14).toFixed(1)}" r="${(r * .12).toFixed(1)}" fill="#fff" opacity=".55"/></g>`;
}
const PLANT_FRUITS = ["#e2607f", "#e88aa8", "#d9524f", "#e5834a", "#c96a9e"];
function plantFruit(x, y, r, seed) {
  const col = PLANT_FRUITS[seed % PLANT_FRUITS.length];
  return `<g><path d="M${x.toFixed(1)} ${(y - r).toFixed(1)} l${(-r * .5).toFixed(1)} ${(-r * .7).toFixed(1)}" stroke="var(--p-stem)" stroke-width="${(r * .3).toFixed(2)}" stroke-linecap="round" fill="none"/>`
    + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}"/>`
    + `<circle cx="${(x - r * .3).toFixed(1)}" cy="${(y - r * .34).toFixed(1)}" r="${(r * .28).toFixed(1)}" fill="#fff" opacity=".45"/></g>`;
}

function plantSVG(stage, fruit, o) {
  o = o || {};
  const g = PLANT_SHAPE[Math.max(1, Math.min(5, stage))];
  const r = plantRnd(o.seed == null ? 7 : o.seed);
  const sea = o.season ? PLANT_SEASON[o.season] : null;
  const leafCol = sea ? sea.leaf : "var(--p-leaf)";
  const backCol = sea ? sea.back : "var(--p-leaf-b)";
  const baseY = 142, cx = 50, topY = baseY - g.h, lean = o.lean || 0;
  const P = [];
  /* 枝梢晃動（v55.1）：上半部的東西收進一個群組另外動。
     ⚠️ 效能是使用者的前提，所以刻意只做**兩個**會動的元素：
        整株一個慢的、上半部一個快一點的。兩者都只動 transform，
        不碰 filter／box-shadow／寬高，也不用 will-change
        （提升圖層在低階手機上反而更貴，這裡只有 14% 透明度的線條，不值得）。
     ⚠️ 分層不是為了好看，是為了**便宜**：真正的植物是每根枝條各自晃，
        那要幾十個動畫；用「離基部越遠、擺幅越大」的兩層近似，肉眼分不出來。 */
  const TIP = [];
  const tipY = baseY - g.h * 0.42;      // 這條線以上算「枝梢」
  const put = (y, s) => { (y < tipY ? TIP : P).push(s); };
  /* ⚠️ 土**不在 SVG 裡**（v55.2）。使用者要的是「植物種在輸入框上」——
        土是一條貫穿整個聊天室寬度的水平線（`.c-plantsoil`），
        而不是只鋪在植物腳下的一小段弧。
        所以這裡不畫土，viewBox 的底邊直接切在 baseY，
        植物的根部才會剛好坐在那條線上。
     ⚠️ r() 還是要往前跑幾次 —— 亂數是確定性的，少跑幾次會讓所有葉子的
        角度與長度整個位移，等於換了一株植物。 */
  for (let i = 0; i < 4; i++) r();
  if (stage === 1) {
    P.push(`<ellipse cx="${cx}" cy="${baseY - 5}" rx="5.4" ry="7" fill="var(--p-stem)" transform="rotate(-14 ${cx} ${baseY - 5})"/>`);
    P.push(`<ellipse cx="${cx - 1.4}" cy="${baseY - 6.5}" rx="1.7" ry="2.4" fill="#fff" opacity=".18" transform="rotate(-14 ${cx} ${baseY - 5})"/>`);
    P.push(plantLeaf(cx + 1, baseY - 11, 8, -70, { color: leafCol }));
    return `<svg viewBox="0 0 100 142" aria-hidden="true">${P.join("")}</svg>`;
  }
  const tipX = cx + lean * 7, qx = cx + lean * 4, qy = baseY - g.h * .55;
  const dropN = sea ? Math.round(g.leaves * sea.drop) : 0;
  for (let i = 0; i < g.leaves - dropN; i += 2) {
    const tt = (i + 1.4) / (g.leaves + 1), y = baseY - g.h * tt * .9, x = cx + lean * 4 * tt;
    const side = i % 4 === 0 ? -1 : 1, len = g.w * (1.5 - tt * .5);
    put(y, plantLeaf(x, y, len, side < 0 ? -(158 + tt * 10) : -(22 - tt * 10), { color: backCol, vein: backCol, curl: len * .1 }));
  }
  P.push(plantStem(cx, baseY, qx, qy, tipX, topY, g.w * .5, g.w * .16));
  const tips = [{ x: tipX, y: topY }];
  for (let i = 0; i < g.branch; i++) {
    const tt = .36 + i * (.44 / Math.max(1, g.branch));
    const y0 = baseY - g.h * tt, x0 = cx + lean * 4 * tt, side = i % 2 === 0 ? -1 : 1;
    const bl = g.h * (.30 - i * .042), bx = x0 + side * bl * .74, by = y0 - bl * .68;
    P.push(plantStem(x0, y0, x0 + side * bl * .46, y0 - bl * .22, bx, by, g.w * .26, g.w * .1));
    tips.push({ x: bx, y: by });
    if (i >= dropN) {
      put(by, plantLeaf(bx, by, g.w * 1.2, side < 0 ? -152 : -28, { color: leafCol, curl: g.w * .14 }));
      put((y0 + by) / 2, plantLeaf((x0 + bx) / 2, (y0 + by) / 2, g.w * 1.0, side < 0 ? -130 : -50, { color: leafCol }));
    }
  }
  for (let i = 0; i < g.leaves - dropN; i++) {
    const tt = (i + 1) / (g.leaves + 1), y = baseY - g.h * tt * .9, x = cx + lean * 4 * tt;
    const side = i % 2 === 0 ? -1 : 1;
    const len = g.w * (1.9 - tt * .62) * (.78 + r() * .42), jit = (r() - .5) * 26;
    put(y, plantLeaf(x, y, len, (side < 0 ? -(152 + tt * 12) : -(28 - tt * 12)) + jit,
      { color: leafCol, curl: len * (.06 + r() * .12) * (sea && sea.drop > .4 ? 1.8 : 1) }));
  }
  if (stage >= 3 && (!sea || sea.bud || sea.drop < .5)) put(topY, plantLeaf(tipX, topY, g.w * 1.05, -90, { color: leafCol }));
  const fN = sea ? Math.round(g.flower * sea.flowers) : g.flower;
  if (fN) tips.forEach((tp, i) => { if (i < fN) put(tp.y, plantFlower(tp.x, tp.y - 2.5, g.w * .42, i + (o.seed || 0))); });
  const scale = sea ? sea.fruit : 1;
  const n = Math.min(12, Math.round((fruit || 0) * scale));
  for (let i = 0; i < n; i++) {
    const tt = .22 + (i / Math.max(1, n)) * .72, y = baseY - g.h * tt, side = i % 2 === 0 ? 1 : -1;
    const x = cx + lean * 4 * tt + side * (g.w * .7 + r() * 3.5);
    const rr = 2.2 + (fruit > 12 ? Math.min(1.8, (fruit - 12) / 45) : 0);
    put(y, plantFruit(x, y, rr, i + (o.seed || 0)));
  }
  const tipG = TIP.length ? `<g class="p-tip">${TIP.join("")}</g>` : "";
  return `<svg viewBox="0 0 100 142" aria-hidden="true">${P.join("")}${tipG}</svg>`;
}

/* ── 狀態與行為 ───────────────────────────────────────── */
const Plant = {
  on: false,          // 這間房有沒有植物（只有私人房）
  born: 0,            // 出生時間
  boost: 0,           // 管理員調整的經驗值差額
  acts: {},           // 這台裝置的 { n, w, s, t }
  total: 0,           // 所有裝置的互動次數總和
  hearts: 0,          // 思念總數（換果實用）
  lastStage: 0,       // 上次畫的階段 —— 用來偵測「你不在的時候它長大了」
  tick: null,

  reset() {
    this.on = false; this.born = 0; this.acts = {}; this.total = 0; this.boost = 0;
    this.hearts = 0; this.lastStage = 0;
    clearInterval(this.tick); this.tick = null;
    this.closeFan();
    const bg = $("plantBg"); if (bg) bg.replaceChildren();
    /* ⚠️ v56：土線也要收。它是 v55.2 加的獨立元素，不在 SVG 裡面 ——
          所以 bg.replaceChildren() 清不掉它。以前沒事是因為
          「私人房一定有植物」，沒有植物的房間根本不存在；
          隱身造出那個狀態之後，會看到一條土色的線橫在空白的訊息區上。 */
    const soil = $("plantSoil"); if (soil) soil.hidden = true;
    const bar = $("plantBar"); if (bar) bar.hidden = true;
    const say = $("plantSay"); if (say) { say.hidden = true; say.textContent = ""; }
  },

  /* 經驗與階段。⚠️ 全部是**算**出來的，雲端沒有存任何一個。 */
  exp() {
    if (!this.born) return 0;
    const hours = Math.max(0, (Date.now() + S.offset - this.born) / 3600000);
    return Math.max(0, Math.floor(hours * PLANT_EXP_HOUR + this.total * PLANT_EXP_ACT + this.boost));
  },
  stage() {
    const e = this.exp();
    let s = 1;
    for (let i = 1; i < PLANT_STEPS.length; i++) if (e >= PLANT_STEPS[i]) s = i + 1;
    return s;
  },
  /* 這一階走了幾成。⚠️ 滿級之後回 1（不再有進度） */
  pct() {
    const s = this.stage();
    if (s >= 5) return 1;
    const lo = PLANT_STEPS[s - 1], hi = PLANT_STEPS[s];
    return Math.max(0, Math.min(1, (this.exp() - lo) / Math.max(1, hi - lo)));
  },
  fruit() { return Math.floor(this.hearts / PLANT_HEART_PER_FRUIT); },
  /* 滿級之後改成季節變化 —— 不再升級但永遠有變化（「養了很久」不是「破關了」） */
  season() {
    if (this.stage() < 5) return null;
    const m = new Date(Date.now() + S.offset).getMonth() + 1;
    if (m <= 2 || m === 12) return "winter";
    if (m <= 5) return "spring";
    if (m <= 8) return "summer";
    return "autumn";
  },

  async load(base) {
    this.reset();
    /* ⚠️ 只有私人房有植物（使用者指定）。多人房不做 —— 一群人共養一株，
          「誰照顧的」會變得沒有意義，而且 heart 在多人房是友誼不是思念。 */
    if (S.open) return;
    /* ⚠️⚠️ `on` 一定要等到**確定有植物**才設 true。
          原本是在這裡先樂觀地設 true 再去讀雲端 —— 中間那幾百毫秒，
          heart 的訂閱回來會呼叫 Plant.paint(false)，而 paint 只看 `on`：
          於是畫面上會冒出一株「第 1 階 · 種子」。
          以前看不出來，因為讀完之後本來就一定會種一株，樂觀畫的剛好是對的。
          v56 的隱身第一次造出「有房間、但沒有植物」這個狀態，這顆競態就現形了：
          雲端明明是空的，畫面上卻有一株植物和一條土線。
       → `on` 的意思是「這間房有植物」，不是「我正在查有沒有」。 */
    try {
      const { db, ref, get, set, serverTimestamp } = await connect();
      const snap = await get(ref(db, `${base}/pet`));
      const v = snap.val() || null;
      if (!v || typeof v.b !== "number") {
        /* ⚠️⚠️ v56：隱身時**不種**。
              這是整個隱身功能裡最容易漏掉的一條 —— 前四樣（在線、已讀、已送達、
              正在輸入）都長得像「痕跡」，但這一個長得像「初始化」。
              漏掉的話：你偷看一眼，反而替對方憑空種出一株植物，
              而且他點開來看得到出生時間 = 你進來的那一刻。
              比已讀還明確，因為已讀至少可以推說是舊的。
           ⚠️ 直接 return —— on 還是 false，畫面上不會有植物、也不會有土線。 */
        if (S.stealth) return;
        /* 還沒種 —— 現在種下去。⚠️ b 只寫一次，規則也擋重寫。 */
        await set(ref(db, `${base}/pet/b`), serverTimestamp());
        const again = await get(ref(db, `${base}/pet`));
        this.born = Number((again.val() || {}).b) || (Date.now() + S.offset);
        this.acts = {}; this.total = 0;
      } else {
        this.born = Number(v.b);
        this.boost = Number(v.boost) || 0;
        const a = v.a || {};
        this.acts = a[S.clientId] || {};
        this.total = Object.values(a).reduce((n, x) => n + (Number(x && x.n) || 0), 0);
      }
    } catch (_) {
      /* ⚠️ 讀不到就當成沒有植物 —— 這是裝飾功能，不可以因為它讓人進不了房。 */
      return;
    }
    this.on = true;
    this.paint(true);
    const f = await connect();
    const roomId = S.roomId;
    S.subs.push(f.onValue(f.ref(f.db, `${base}/pet/boost`), (snap) => {
      if (S.roomId !== roomId || !this.on) return;
      this.boost = Number(snap.val()) || 0;
      this.paint(true);
    }));
    /* 每分鐘重算一次：時間也會長經驗，槓要會自己走。
       ⚠️ 只重算數字，不重畫 SVG（除非階段變了）—— 重畫是最貴的部分。 */
    clearInterval(this.tick);
    this.tick = setInterval(() => { if (!document.hidden) this.paint(false); }, 60000);
  },

  paint(force) {
    if (!this.on) return;
    const bar = $("plantBar"), bg = $("plantBg");
    if (!bar || !bg) return;
    bar.hidden = false;
    const soil = $("plantSoil"); if (soil) soil.hidden = false;
    const st = this.stage(), fr = this.fruit();
    $("plantLv").textContent = `第 ${st} 階 · ${PLANT_NAMES[st - 1]}`;
    $("plantFill").style.width = (this.pct() * 100).toFixed(1) + "%";
    /* v58：成長（經驗值）一直寫著，果實還是 0 顆就收起來。
       ⚠️ 成長**不可以**比照果實在 0 的時候藏起來 —— 剛種下的第一天正好是 0 附近，
          而那正是最需要看到「照顧有沒有加分」的時候。 */
    const ge = $("plantGrowN");
    if (ge) ge.textContent = String(this.exp());
    const fe = $("plantFruit"), fn = $("plantFruitN");
    if (fe) fe.hidden = fr <= 0;
    if (fn) fn.textContent = String(fr);
    /* 公告開著的時候縮成一條細線 —— 320×568 上標題列＋計量條＋公告＋輸入列
       會吃掉太多高度，訊息區只剩三百出頭。 */
    bar.classList.toggle("slim", $("annSlot") && !$("annSlot").hidden);

    if (force || st !== this.lastStage || fr !== this.lastFruit) {
      bg.innerHTML = plantSVG(st, fr, { seed: 5, lean: .18, season: this.season() });
      /* 「你不在的時候，它長大了」。⚠️ 不做推播 —— 植物不該吵你，而且那是外洩。
            只在進房時比對「上次看到的階段」，跟現有的「你不在的時候想念了你 N 次」同一個模式。 */
      if (!force && st > this.lastStage && this.lastStage > 0) this.say("它長大了 · 第 " + st + " 階");
      else if (force) {
        const seen = Number(localStorage.getItem("sc-pl-" + S.roomId)) || 0;
        if (seen && st > seen) this.say("你不在的時候，它長大了");
      }
      try { localStorage.setItem("sc-pl-" + S.roomId, String(st)); } catch (_) {}
      this.lastStage = st; this.lastFruit = fr;
    }
  },

  /* 「還要多久」的說法。
     ⚠️ 不可以用 Math.floor(ms / 小時) —— 剛澆完是 3 小時 59 分，floor 會說「還要 3 小時」，
        比實際**短**。使用者照著等，時間到了卻還是按不動，那是最糟的一種不準。
     ⚠️ 也不要一律 ceil：1 小時 1 分講「還要 2 小時」又太誇張。
        所以 90 分鐘以內講分鐘，以上才進位到小時 —— 寧可多說一點，不可以少說。 */
  wait(ms) {
    if (ms < 5400000) return `${Math.max(1, Math.ceil(ms / 60000))} 分`;
    return `${Math.ceil(ms / 3600000)} 小時`;
  },

  /* 這個動作還要等多久（毫秒）。0 = 現在就可以。 */
  left(kind) {
    const last = Number(this.acts && this.acts[kind]) || 0;
    if (!last) return 0;
    return Math.max(0, last + PLANT_ACTS[kind].hours * 3600000 - (Date.now() + S.offset));
  },
  /* 付費那一條的冷卻（v57）。⚠️ 欄位是 p + 原本的代號，跟免費那條**完全分開**。 */
  leftPaid(kind) {
    const last = Number(this.acts && this.acts["p" + kind]) || 0;
    if (!last) return 0;
    return Math.max(0, last + PLANT_ACTS[kind].hours * 3600000 - (Date.now() + S.offset));
  },
  /* 付費鈕的能量（0～1）。使用者選的是「不寫時間，用能量條累積」。 */
  charge(kind) {
    const total = PLANT_ACTS[kind].hours * 3600000;
    return total <= 0 ? 1 : Math.min(1, Math.max(0, 1 - this.leftPaid(kind) / total));
  },

  openFan() {
    if (!this.on) return;
    const fan = $("plantFan");
    if (!fan) return;
    fan.querySelectorAll(".c-pf-item").forEach((b) => {
      const k = b.dataset.act, ms = this.left(k);
      b.classList.toggle("off", ms > 0);
      b.disabled = ms > 0;
      const cd = b.querySelector(".c-pf-cd");
      /* ⚠️ 冷卻中要**明講還要幾小時**，不可以靜靜不算 —— 按了沒反應是最糟的回饋。
            不足一小時就講分鐘，不要顯示「還要 0 小時」。 */
      cd.textContent = ms > 0 ? `還要 ${this.wait(ms)}` : "";
    });
    this.paintPay();
    fan.hidden = false;
    /* ⚠️ 能量條要會自己走。只在打開那一刻畫一次的話，選單開著等它充滿的人
          會看到一條**不動的**條 —— 那比不畫還糟（看起來像壞了）。
       ⚠️ 一秒一次就夠：條子是 1／3／5 小時充滿的，更密只是白燒電。 */
    clearInterval(this._payT);
    this._payT = setInterval(() => {
      if (!$("plantFan") || $("plantFan").hidden) { clearInterval(this._payT); return; }
      this.paintPay();
    }, 1000);
  },

  /* 粉色付費鈕（v57）。使用者選的畫法是 **A：藥丸自己填滿**
     —— 不寫剩餘時間，用背景由左往右填色表示能量累積。
     ⚠️ 不佔額外高度是選 A 的主因：320×568 上扇形本來就很擠。 */
  paintPay() {
    const fan = $("plantFan");
    if (!fan) return;
    fan.querySelectorAll(".c-pf-pay").forEach((b) => {
      const k = b.dataset.act, cost = PLANT_PAY[k] || 0;
      const p = this.charge(k);
      const broke = this.hearts < cost;
      b.style.setProperty("--p", p.toFixed(3));
      b.classList.toggle("broke", broke);
      b.classList.toggle("ready", !broke && p >= 1);
      b.disabled = broke || p < 1;
      /* ⚠️ 數字要一直寫著。只在「按得下去」時才顯示價格的話，
            思念不夠的人根本不知道差多少 —— 而那正是他最需要知道的時候。 */
      const n = b.querySelector(".c-pf-cost");
      if (n) n.textContent = String(cost);
    });
  },
  closeFan() {
    const f = $("plantFan"); if (f) f.hidden = true;
    clearInterval(this._payT); this._payT = null;
  },

  /* 回饋橫幅。使用者指定放在**訊息區上方**（接近公告下方），不是底部吐司。 */
  say(text) {
    const el = $("plantSay");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => { el.hidden = true; }, 3600);
  },

  async act(kind) {
    const cfg = PLANT_ACTS[kind];
    if (!cfg || !this.on) return;
    const ms = this.left(kind);
    if (ms > 0) { this.say(`${cfg.label}要再等 ${this.wait(ms)}`); return; }
    this.closeFan();
    /* 先動畫面再送出 —— 回饋要立刻，寫入慢一點沒關係。
       ⚠️ 但失敗要還原，不然畫面上長了、雲端沒有。 */
    const before = { acts: { ...this.acts }, total: this.total };
    this.acts = { ...this.acts, [kind]: Date.now() + S.offset, n: (Number(this.acts.n) || 0) + 1 };
    this.total += 1;
    this.paint(false);
    /* ⚠️ v58：後面接一句「成長 +6」。上面那個數字本來就會跳，
          但第 3 階之後跳 6 點在 4 位數裡很不起眼，這一句是**當下**的收據。 */
    this.say(cfg.says[Math.floor(Math.random() * cfg.says.length)] + ` · 成長 +${PLANT_EXP_ACT}`);
    try {
      const { db, ref, update, increment, serverTimestamp } = await connect();
      await update(ref(db, `rooms/${S.roomId}/pet/a/${S.clientId}`),
        { n: increment(1), [kind]: serverTimestamp() });
    } catch (err) {
      console.error(err);
      this.acts = before.acts; this.total = before.total;
      this.paint(false);
      this.say("沒送出去，請檢查網路");
    }
  },

  /* ── 消耗思念的照顧（v57）──────────────────────────────
   * ⚠️⚠️ 扣思念與照顧植物**一定要是同一筆寫入**。分兩筆送的話，
   *    最糟的失敗會發生：思念扣掉了、植物沒被照顧到，而且救不回來。
   *    `heart/<裝置>` 跟 `pet/a/<裝置>/p*` 共同的上層是 `rooms/<房號>`，
   *    所以用一次 multi-path update 就有原子性 —— Firebase 保證全成功或全失敗。
   *
   * ⚠️ 額度看的是**總思念**（畫面上那顆愛心的數字＝我的＋對方的），
   *    但寫入只能寫到各自的節點。所以先扣我自己的，不夠再扣對方那格。
   *    兩邊都用 increment（負值），併發才不會互相蓋掉。
   *
   * ⚠️ 規則擋 `newData.val() >= 0`：如果對方在這中間也花了思念，
   *    整筆會被拒絕 —— **失敗方向是安全的**（什麼都沒發生），提示重試就好。
   */
  async pay(kind) {
    const cfg = PLANT_ACTS[kind];
    const cost = PLANT_PAY[kind];
    if (!cfg || !cost || !this.on) return;
    if (this.hearts < cost) { this.say(`還差 ${cost - this.hearts} 次思念`); return; }
    const ms = this.leftPaid(kind);
    if (ms > 0) { this.say(`能量還沒滿，再等 ${this.wait(ms)}`); return; }
    this.closeFan();

    /* 思念要從哪幾格扣（v58.1 重寫）。
     *
     * ⚠️⚠️ 舊版只挑**一格**對方（`Object.keys(...).find(...)` 找第一個 >0 的），
     *    然後把不足的部分整包記在它頭上。房裡只有兩台裝置時剛好不會出事，
     *    但只要有第三格（換過手機、換過電腦，舊的 `sc-cid` 還留在雲端），
     *    第一格的餘額就可能不夠付 —— 於是那一格被扣成負數，
     *    規則的 `newData.val() >= 0` 一擋，**整筆 update 被拒**：
     *    畫面上就是「思念沒扣成功，什麼都沒有變」＋ 主控台 PERMISSION_DENIED。
     *    實測：我 100 / B 50 / C 400 花 500 → B 被寫成 −350。
     *
     * ⚠️⚠️ 而且**一定要照 `Heart.raw`（雲端那一包）算，不可以用 `Heart.mine`**。
     *    mine 帶著 v24 的樂觀 `Math.max` 保護，可能比雲端**高** ——
     *    照它扣一樣會把自己那格扣成負的，同一種死法。
     *
     * → 現在改成：自己那格排第一，其餘依序墊，每一格最多只扣它現有的量。
     */
    const raw = Heart.raw || {};
    const me = bondId();
    const order = [me, ...Object.keys(raw).filter((c) => c !== me)];
    const debits = [];
    let need = cost;
    for (const c of order) {
      if (need <= 0) break;
      const have = Math.max(0, Number(raw[c]) || 0);
      if (!have) continue;
      const take = Math.min(have, need);
      debits.push([c, take]);
      need -= take;
    }
    /* ⚠️ 湊不滿就什麼都不做。上面那道 `this.hearts < cost` 看的是訂閱算出來的總數，
          這一道看的是**逐格加起來真的湊得出來**——兩者不一致時以這道為準。 */
    if (need > 0) { this.say(`還差 ${need} 次思念`); return; }
    const takeMine = (debits.find(([c]) => c === me) || [null, 0])[1];

    const before = { acts: { ...this.acts }, total: this.total, hearts: this.hearts };
    this.acts = { ...this.acts, ["p" + kind]: Date.now() + S.offset, n: (Number(this.acts.n) || 0) + 1 };
    this.total += 1;
    this.hearts = Math.max(0, this.hearts - cost);
    Heart.spend(takeMine);                 // 讓上方那顆愛心的數字真的降下來
    this.paint(true);                      // 果實變少了，SVG 要重畫
    /* ⚠️ 付費這一句要**兩件事都講**：成長加了多少、思念花了多少。
          只講成長的話，果實憑空少掉一截會看起來像 bug（那是使用者自己選的代價）。 */
    this.say(cfg.says[Math.floor(Math.random() * cfg.says.length)]
             + ` · 成長 +${PLANT_EXP_ACT} · 思念 −${cost}`);

    try {
      const { db, ref, update, increment, serverTimestamp } = await connect();
      const patch = {
        [`pet/a/${S.clientId}/n`]: increment(1),
        [`pet/a/${S.clientId}/p${kind}`]: serverTimestamp(),
      };
      /* ⚠️ 每一格各自 increment（負值）。併發時才不會互相蓋掉，
            而且任何一格不夠扣，**整筆**都會被規則拒絕 —— 失敗方向是安全的。 */
      for (const [c, n] of debits) patch[`heart/${c}`] = increment(-n);
      await update(ref(db, `rooms/${S.roomId}`), patch);
    } catch (err) {
      console.error(err);
      this.acts = before.acts; this.total = before.total; this.hearts = before.hearts;
      Heart.spend(-takeMine);              // 把樂觀扣掉的加回去
      this.paint(true);
      this.say("思念沒扣成功，什麼都沒有變");
    }
  },
};

function bindPlant() {
  /* 輸入列的高度 → --c-in-h，背景植物靠它決定要從哪裡開始往上長。
     ⚠️ 輸入列會跟著多行文字長高，所以要用 ResizeObserver 一直跟著 ——
        寫死一個數字的話，打了三行字之後植物的土線就被輸入列吃掉了。 */
  const row = $("sendForm"), chat = $("chat");
  if (row && chat && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      chat.style.setProperty("--c-in-h", Math.round(row.getBoundingClientRect().height) + "px");
    });
    ro.observe(row);
  }
  $("plantBar")?.addEventListener("click", () => Plant.openFan());
  $("plantFanScrim")?.addEventListener("click", () => Plant.closeFan());
  $("plantFan")?.addEventListener("click", (e) => {
    /* ⚠️ 粉色那顆要**判在免費那顆前面**。它們是兄弟、class 不同，
          理論上不會互相吃到，但順序寫反的話將來若有人把粉色鈕包進 .c-pf-item
          裡（為了共用樣式），按付費會變成免費 —— v54 的 .a-g2／.a-check
          就是這樣壞掉的（坑 #173）。先判具體的那一個。 */
    const pay = e.target.closest(".c-pf-pay");
    if (pay) { Plant.pay(pay.dataset.act); return; }
    const b = e.target.closest(".c-pf-item");
    if (b) Plant.act(b.dataset.act);
  });
}

/* ────────── 第二道密碼（v54）──────────
 *
 * 使用者的話：「可以在指定房間開啟設定第二組驗證密碼嗎? 例如0606房進去後
 * 會再有一個九宮格彈窗要求輸入閱讀密碼」。版型看完預覽選的是**兩段式**：
 * 第一頁只有警語，按「我是受邀者，繼續」才出現九宮格。
 *
 * ⚠️⚠️ **這是一道畫面，不是一把鎖**，使用者知情並選擇如此（他要的是嚇阻）。
 *    見 deriveGate2Fp 的註解。這裡不要因為「看起來像安全機制」就對它有錯誤期待。
 *
 * ⚠️ 解鎖只在這一輪有效 —— 退回偽裝首頁（含切 App、閒置退出）就重新上鎖，
 *    跟歷史訊息鎖同一條規矩。不這樣的話它連嚇阻都做不到。
 */
const Gate2 = {
  need: false,      // 這間房有沒有開
  fp: "",           // 雲端存的指紋
  passed: false,    // 這一輪過了沒

  reset() { this.need = false; this.fp = ""; this.passed = false; this.close(); },

  /* 進房時問一次。讀不到就當成沒開 —— 這是輔助功能，不可以因為它讀不到就讓人進不了房。 */
  async load(base) {
    this.need = false; this.fp = ""; this.passed = false;
    try {
      const { db, ref, get } = await connect();
      const snap = await get(ref(db, `${base}/gate2`));
      const v = snap.val();
      if (v && v.on === true && typeof v.fp === "string" && v.fp.length === 32) {
        this.need = true; this.fp = v.fp;
      }
    } catch (_) { /* 讀不到就當沒開 */ }
    return this.need;
  },

  open() {
    Gate2Pad.reset();
    Gate2Pad.tries = 0;
    this.step(1);
    $("g2Gate").hidden = false;
  },
  step(n) {
    $("g2Step1").hidden = n !== 1;
    $("g2Step2").hidden = n !== 2;
    /* 換頁時把可捲區捲回最上面 —— 不然回上一頁會停在剛剛看的位置，
       看起來像少了一段文字。 */
    if (n === 1) { const b = $("g2Gate")?.querySelector(".g2-body"); if (b) b.scrollTop = 0; }
  },
  close() { const g = $("g2Gate"); if (g) g.hidden = true; },
};

const Gate2Pad = makePad({
  sub: "g2Sub", dots: "g2Dots", grid: "g2Grid",
  sub0: "僅限受邀者",
  maxTries: 3,
  /* ⚠️ 比的是指紋，不是明文 —— 第二組密碼跟房間密碼一樣，一個字都不會離開這個瀏覽器。 */
  async verify(tried) {
    if (!S.hk || !Gate2.fp) return false;
    return (await deriveGate2Fp(S.hk, tried)) === Gate2.fp;
  },
  onOk() {
    Gate2.passed = true;
    Gate2.close();
    $("msgInput")?.focus();
  },
  /* 三次都錯 → 退回偽裝首頁。跟歷史訊息鎖同一套。 */
  onFail() { Gate2.close(); leaveChat(); },
});

/* 閒置遮罩：維持原本的規則 —— 打錯一次就直接退回偽裝首頁，不給重試 */
const VeilPad = makePad({
  sub: "veilSub", dots: "veilDots", grid: "veilGrid",
  sub0: "輸入密碼解鎖",
  maxTries: 1,
  onOk() {
    $("veil").hidden = true;
    resumeIdle();
    $("msgInput").focus();
    tryMarkRead();                       // 遮罩解除後才算真的看到訊息
  },
  onFail() { $("veil").hidden = true; leaveChat(); },
});

/* 歷史訊息鎖：往上翻＝把整份歷史從雲端拉下來，所以要再確認一次密碼。
   ① 省流量：不會有人手滑就把幾百則加貼圖整包拖下來
   ② 拿到你已解鎖手機的人，翻得到的也只有最近 30 則
   解鎖只在這一輪有效，退回偽裝首頁（含切 App、閒置退出）就重新上鎖。
   這裡給三次機會 —— 它是內層關卡，外面還有遮罩擋著。 */
const HistPad = makePad({
  sub: "padSub", dots: "padDots", grid: "padGrid",
  sub0: "請輸入這個房間的密碼",
  maxTries: 3,
  onOk() {
    S.histUnlocked = true;
    $("padGate").hidden = true;
    paintLoadMore();
    S.loadOlder?.();                     // 解開就直接載第一批，不用再按一次
  },
  onFail() { $("padGate").hidden = true; leaveChat(); },
});

/* 記事本的九宮格。跟歷史訊息鎖同一組密碼，但**解鎖狀態分開記** ——
   開過舊訊息不代表記事本也開了。多按四下的代價換「兩件事各自上鎖」。 */
const NotePad = makePad({
  sub: "ntSub", dots: "ntDots", grid: "ntGrid",
  sub0: "輸入房間密碼開啟",
  maxTries: 3,
  onOk() {
    S.notesUnlocked = true;
    $("ntGate").hidden = true;
    Notes.open();
  },
  onFail() { $("ntGate").hidden = true; leaveChat(); },
});

function openHistPad() {
  if (!S.password) { toast("還在連線中，請稍候一下"); return; }
  HistPad.reset();
  $("padGate").hidden = false;
}

function bindPad() {
  VeilPad.bind();
  HistPad.bind();
  NotePad.bind();
  Gate2Pad.bind();
  /* 第二道密碼的兩頁（v54）。⚠️ 兩個「離開」都要走 leaveChat() ——
        只把視窗關掉的話，人會直接落在聊天室裡，等於這一關形同虛設。 */
  $("g2Next")?.addEventListener("click", () => Gate2.step(2));
  $("g2Back")?.addEventListener("click", () => { Gate2Pad.reset(); Gate2.step(1); });
  $("g2Cancel1")?.addEventListener("click", () => { Gate2.close(); leaveChat(); });
  $("padCancel")?.addEventListener("click", () => { $("padGate").hidden = true; HistPad.reset(); });
  $("ntCancel")?.addEventListener("click", () => { $("ntGate").hidden = true; NotePad.reset(); });

  /* 桌機還是能用實體鍵盤打 —— 電腦上逼人用滑鼠點十個鍵很痛苦。
     只攔數字、退格、Enter；Esc 要留給緊急退出。 */
  document.addEventListener("keydown", (e) => {
    const P = !$("veil").hidden ? VeilPad
            : !$("ntGate").hidden ? NotePad
            : !$("padGate").hidden ? HistPad : null;
    if (!P) return;
    if (e.key >= "0" && e.key <= "9") { e.preventDefault(); P.key(e.key); }
    else if (e.key === "Backspace") { e.preventDefault(); P.key("del"); }
    else if (e.key === "Enter") { e.preventDefault(); P.key("go"); }
  });
}

/* 下拉／滾輪觸發的載入（v38）。
   ⚠️ 效果刻意跟按下「已經是最早的訊息了 · 再檢查一次」**完全一樣**：
      先把「到頂」那個結論解掉再查。不解掉的話，一旦誤判過一次，
      使用者拉再多下畫面都不會有任何反應 —— 那正是最難查的那種壞法。 */
function pullLoad() {
  if (!S.loadOlder) { toast("還在連線中，請稍候一下"); return; }
  if (!S.histUnlocked) { openHistPad(); return; }
  S.reachedTop = false;
  S.topCheckedAt = 0;
  paintLoadMore();
  S.loadOlder();
}

/* 往上翻的統一入口：還沒解鎖就先叫出九宮格 */
function requestOlder() {
  if (!S.loadOlder) { toast("還在連線中，請稍候一下"); return; }
  if (!S.histUnlocked) { openHistPad(); return; }
  S.loadOlder();
}

/* 往上翻的狀態列。三種狀態：可以載入 / 載入中 / 已經到最早。
   刻意讓它一直看得見 —— 舊版只有載入中才閃一下轉圈，
   自動載入沒觸發時畫面完全沒有線索，看起來就像舊訊息不見了。 */
function paintLoadMore() {
  const box = $("loadMore");
  const spin = $("loadSpin"), btn = $("btnLoadOlder"), end = $("loadEnd");
  // 舊版外殼沒有這幾個節點。少了這道防護會整串丟例外，
  // 連帶把後面的已讀回報、載入狀態全部拖下水。
  if (!box || !spin || !btn || !end) return;
  const has = S.msgs.length > 0;
  const locked = !S.histUnlocked;
  /* ⚠️ 文字要在「還沒 return」之前就更新。
     房間是空的時候整條會被藏起來、但文字留在上一間房的狀態 ——
     從上鎖的私人房換到不上鎖的多人房，那顆按鈕會頂著「輸入密碼」的舊字。 */
  btn.textContent = locked ? "輸入密碼載入更早的訊息" : "載入更早的訊息";
  box.hidden = !has;
  if (!has) return;
  spin.hidden = !S.loadingOlder;
  // 上鎖時按鈕一定看得見（不管到沒到頂），按下去會叫出九宮格
  btn.hidden = S.loadingOlder || (!locked && S.reachedTop);
  btn.classList.toggle("locked", locked);
  end.hidden = S.loadingOlder || locked || !S.reachedTop;
}

/* 一次查詢最多等多久。
   ⚠️ 不可以省：實測 Firebase 的 get() 在連線斷掉時**不會拋錯，也不會回來**，
      它就那樣懸著。少了這道上限，S.loadingOlder 會永遠停在 true ——
      畫面上是一顆轉不完的圈，而且這一輪之後再也載不動任何舊訊息。 */
const OLDER_TIMEOUT_MS = 12 * 1000;

/* 「這個游標前面真的一則都沒有了嗎」——只抓 1 筆，很便宜。
   ⚠️ 查不出來一律回 false（＝不敢說到頂）。寧可讓使用者多捲一次，
      也不要把「已經是最早」這個結論釘死。 */
async function noOlderThan(f, mRef, key) {
  if (!key) return false;
  try {
    const s = await withTimeout(
      f.get(f.query(mRef, f.orderByKey(), f.endBefore(key), f.limitToLast(1))),
      OLDER_TIMEOUT_MS);
    let n = 0;
    s.forEach(() => { n++; });
    return n === 0;
  } catch (_) { return false; }
}

/* 已經宣告「到頂」之後，多久才願意再確認一次。 */
const TOP_RECHECK_MS = 4000;

async function loadOlder(f, mRef, gen) {
  if (S.loadingOlder || !S.oldestKey) return;
  if (gen !== undefined && gen !== S.gen) return;
  /* ⚠️ 「到頂」不可以是一個永久的結論。
        使用者又捲到頂＝他覺得上面還有東西，那就花一個很小的查詢再確認一次，
        確實還有就自己解開 —— 不要求他先看懂那行字、再想到要去按它。
        節流是必要的：真的到頂時使用者可能一直停在頂端捲動。 */
  if (S.reachedTop && Date.now() - (S.topCheckedAt || 0) < TOP_RECHECK_MS) return;

  const epoch = S.epoch;
  S.loadingOlder = true;
  paintLoadMore();

  const stale = () => (gen !== undefined && gen !== S.gen) || epoch !== S.epoch;

  /* 中途放棄時，要把已經登記出去的訊息鍵還回來。
     少了這一步，那幾則會被永遠當成「已經載過了」而再也看不到。 */
  const release = (list) => list.forEach((m) => S.keys.delete(m.k));

  try {
   /* 先把「到頂」這個結論重新驗一次。真的到頂就安靜地什麼都不做；
      驗出來還有，就解開它，接著照常往下翻。 */
   if (S.reachedTop) {
     S.topCheckedAt = Date.now();
     if (await noOlderThan(f, mRef, S.oldestKey)) return;
     if (stale()) return;
     S.reachedTop = false;
   }

   /* 這一輪如果整批都解不開、或都已經在畫面上了，要自動再往前找一段。
      停在原地的話畫面什麼都沒變，使用者也不會再捲動去觸發下一次 → 看起來就是壞的。 */
   for (let round = 0; round < 12; round++) {
    const q = f.query(mRef, f.orderByKey(), f.endBefore(S.oldestKey), f.limitToLast(CFG.pageSize));
    const snap = await withTimeout(f.get(q), OLDER_TIMEOUT_MS);
    if (stale()) return;                              // 期間已離開房間或清空 → 整批丟棄

    const raw = [];
    /* ⚠️⚠️ 一定要用大括號把回傳值吞掉。
       Firebase 的 DataSnapshot.forEach 只要「回呼回傳真值」就會立刻中止列舉，
       而 raw.push(c) 回傳的是陣列的新長度（1、2、3…）—— 全都是真值。
       寫成 (c) => raw.push(c) 的話，每次都只會拿到第一筆就停了。
       這就是「往上翻一次只出現一則、怎麼翻都補不完」的真正原因。 */
    snap.forEach((c) => { raw.push(c); });

    /* ⚠️ 游標一律用「伺服器實際回傳的最舊那一筆」推進，不能用解得開的那幾則。
       整批都解不開時，游標若原地不動，下一次會查到同一批 → 永遠翻不過去。
       ⚠️ 這一步要排在「判斷到頂」前面，下面那次確認才問得到正確的位置。 */
    if (raw.length) {
      const oldestRaw = raw[0].key;
      if (!S.oldestKey || oldestRaw < S.oldestKey) S.oldestKey = oldestRaw;
    }

    /* 判斷「到頂了沒」。
     *
     * ⚠️⚠️ 「這一頁回來的比一頁少」**不等於**「已經是最早的了」。 ⚠️⚠️
     *
     * 這是一個**會永久鎖死的結論**：S.reachedTop 一旦變成 true，
     * loadOlder() 第一行就直接 return，這一輪之內再也載不到任何舊訊息 ——
     * 唯一的出路是使用者自己看到那行字、而且想到要去按它。
     * 使用者回報的就是這個：「往上滑到頂卡在『已經是最早的訊息了』，
     * 按一下『再檢查一次』又能繼續往上」。按得動＝那個結論本來就是錯的。
     *
     * ⚠️ 為什麼私人房比多人房容易中：不是房型的差別，是**頁數**的差別。
     *    那間私人房有 1863 則（實測）＝要翻 63 頁；多人房 214 則＝8 頁。
     *    只要每一頁有一點點機率拿到不完整的結果，翻 63 頁幾乎一定會中一次。
     *
     * ⚠️ 「回來的筆數」本身也不可靠：連線抖一下、SDK 用本機快取回答、
     *    查詢被中途取消，都會讓這一頁看起來很短。所以短的時候要**再問一次**：
     *    只抓 1 筆，問「這個游標前面真的一則都沒有了嗎」。
     *    只有那一問也說「沒有」，才敢認。
     *
     * ⚠️ 反過來也要處理：確認說「還有」的話，這一輪要繼續往前翻，
     *    不能就這樣結束 —— 不然畫面沒動，使用者以為壞了。 */
    if (raw.length < CFG.pageSize) {
      const reallyTop = await noOlderThan(f, mRef, S.oldestKey);
      if (stale()) return;
      if (reallyTop) S.reachedTop = true;
      else if (!raw.length) {
        /* 這一輪什麼都沒拿到，但確認說還有 → 原地再試一次。
           ⚠️ 游標沒有推進，所以下一輪是同一個查詢；隔一下再問，不要連著打。 */
        await new Promise((r) => setTimeout(r, 250 * (round + 1)));
        if (stale()) return;
        continue;
      }
    }

    const batch = [];
    for (const c of raw) {
      /* ⚠️ 每一則都要重新確認還在同一輪。解密是非同步的，
         中途切 App／閒置退出／被清空都會換代號；繼續解下去會把訊息鍵
         登記進「新一輪」的清單，那些訊息之後就永遠被跳過。 */
      if (stale()) { release(batch); return; }
      const m = await decodeMsg(c);
      if (!m) continue;
      if (S.msgs.some((x) => x.k === m.k)) continue;   // 保險：已經在畫面上就不重複插
      batch.push(m);
    }
    if (stale()) { release(batch); return; }

    if (!batch.length) {
      if (S.reachedTop) { refreshQuotes(); break; }
      continue;                                        // 這一輪全被過濾掉，再往前找一段
    }

    {
      const sc = $("scroller");
      const list = $("msgList");

      /* 位置錨定：拿「現有的最後一列」當基準點，它絕對不會被這次插入動到。
         ⚠️ 不能用 scrollHeight 的差值 —— 貼圖是 data: URL，剛插進去時還沒解碼，
            高度是 0，差值會少算好幾百像素，畫面就會亂跳。 */
      const anchor = [...list.querySelectorAll(".row")].pop() || null;
      const anchorTop = () => (anchor ? anchor.getBoundingClientRect().top : 0);
      const base = anchorTop();

      const oldFirst = S.msgs[0];                     // 併入前的第一則
      const oldFirstRow = list.querySelector(".row");
      S.msgs = batch.concat(S.msgs);

      /* ⚠️ 不可以整份重畫。幾百則的房間每往上翻一次就重建全部節點（含所有貼圖），
         手機上會卡到像沒反應，圖片還會整輪重新解碼閃一次。只插新的這一批。 */
      const frag = document.createDocumentFragment();
      batch.forEach((m, i) => frag.appendChild(rowEl(m, batch[i - 1])));
      // 原本的第一則現在前面有東西了，跨日線與「同一人連續」的貼齊要重算
      if (oldFirst && oldFirstRow) {
        frag.appendChild(rowEl(oldFirst, batch[batch.length - 1]));
        oldFirstRow.remove();
      }
      const newImgs = [...frag.querySelectorAll("img")];
      list.prepend(frag);

      if (anchor) sc.scrollTop += anchorTop() - base;
      const settled = sc.scrollTop;
      renderReadMark();
      paintSendState();
      paintReactions();
      refreshQuotes();

      // 貼圖解碼完會把上面的內容撐高，等它們都好了再校正一次；
      // 使用者中途自己捲動過就不要再插手（scrollTop 變了就代表他動過）
      if (anchor && newImgs.length) {
        const ready = (im) => (im.complete ? Promise.resolve() : new Promise((r) => {
          im.addEventListener("load", r, { once: true });
          im.addEventListener("error", r, { once: true });
        }));
        // loading="lazy" 的圖如果還在畫面外，永遠不會觸發 load，所以要有逾時
        Promise.race([
          Promise.all(newImgs.map(ready)),
          new Promise((r) => setTimeout(r, 1500)),
        ]).then(() => requestAnimationFrame(() => {
          if (stale() || sc.scrollTop !== settled) return;
          sc.scrollTop += anchorTop() - base;
        }));
      }
    }
    break;                                             // 這一輪有東西了，收工
   }
  } catch (err) {
    console.warn(err);      // 網路暫時出錯不能當成「到頂」，否則這次進房就再也載不到歷史
  } finally {
    S.loadingOlder = false;
    paintLoadMore();
  }
}


/* ────────────────────────── 7. 畫面渲染 ────────────────────────── */

/* 圖片來源一律只收 data:（v29）。
   ⚠️ body 是解密之後直接 JSON.parse 的結果，欄位內容完全由送出的人決定。
      同房的人改一下前端就能送一則 { k:"st", d:"https://他的伺服器/px.gif" }，
      收訊方的瀏覽器會去抓那張圖 —— 而且是「捲到這一則的那一刻」才抓
      （lazy），對方因此拿到你的 IP、瀏覽器、以及你幾點幾分真的看到這一則。
      那正是端對端加密要擋掉的東西。程式裡別處已經寫過同一個道理
      （「刻意不抓連結預覽圖：抓預覽等於把這條網址送給第三方伺服器」）。 */
function safeImgSrc(d) {
  return (typeof d === "string" && d.startsWith("data:image/")) ? d : "";
}

function rowEl(m, prev) {
  const wrap = document.createDocumentFragment();

  // 跨日只放一條淡淡的線，刻意不顯示日期
  if (prev && dayKey(prev.t) !== dayKey(m.t)) {
    const sep = document.createElement("div");
    sep.className = "sep";
    wrap.appendChild(sep);
  }

  const row = document.createElement("div");
  const mine = isMine(m);            // ⚠️ 不是比裝置 —— 同一個人的另一台裝置也算我的
  const nick = (S.open && m.body && typeof m.body.n === "string") ? m.body.n : "";
  /* 多人房要多比一次暱稱：同一個人中途改了名字，
     那兩則不能當成「同一個人連續說的話」黏在一起，不然新名字會被吃掉。 */
  const sameAsPrev = prev && msgAuthor(prev) === msgAuthor(m) && Math.abs(m.t - prev.t) < 120000
    && (!S.open || (prev.body && prev.body.n) === (m.body && m.body.n));
  row.className = `row ${mine ? "me" : "you"} ${sameAsPrev ? "tight" : "gap"}`;
  row.dataset.k = m.k;

  // 解不開的訊息：畫一條細細的佔位，不要假裝它不存在
  if (m.kind === "err") {
    row.className = "row undec";
    const tag = document.createElement("div");
    tag.className = "undec-tag";
    tag.textContent = "這則訊息解不開";
    row.appendChild(tag);
    wrap.appendChild(row);
    return wrap;
  }

  const bub = document.createElement("div");
  const time = `<span class="time">${hhmm(m.t)}</span>`;

  if (m.kind === "st") {
    bub.className = "bub sticker";
    const img = document.createElement("img");
    img.src = safeImgSrc(m.body.d);
    img.alt = "貼圖";
    img.loading = "lazy";
    img.decoding = "async";
    // 解碼完才放開 CSS 那道占位高度（見 .bub.sticker img:not(.ready)）
    if (img.complete) img.classList.add("ready");
    else img.addEventListener("load", () => img.classList.add("ready"), { once: true });
    // 長按貼圖會先叫出選單，接著 pointerup 還是會送出一次 click ——
    // 不擋的話放大檢視會蓋住選單，「收藏」就按不到了
    img.addEventListener("click", () => {
      if (!$("msgMenu").hidden) return;
      openLightbox(m.body.d, m.k);
    });
    bub.appendChild(img);
    bub.insertAdjacentHTML("beforeend", time);
  } else if (m.kind === "ph") {
    /* 照片：泡泡裡只放縮圖。
       ⚠️ 外框一定要先用 aspect-ratio 把原圖比例佔住 ——
          少了它，縮圖解碼完的瞬間高度才撐開，整串訊息會往上跳。 */
    bub.className = "bub photo";
    const box = document.createElement("div");
    box.className = "ph";
    const w = Number(m.body.w) || 4, h = Number(m.body.h) || 3;
    box.style.aspectRatio = `${w} / ${h}`;

    const img = document.createElement("img");
    img.src = safeImgSrc(m.body.d);
    img.alt = "照片";
    img.decoding = "async";
    img.loading = "lazy";
    box.appendChild(img);

    // 右下角那顆小標：點開才會下載原圖，先讓人知道要花多少流量
    const tag = document.createElement("span");
    tag.className = "ph-size";
    tag.textContent = fmtBytes(Number(m.body.fb) || 0);
    box.appendChild(tag);

    box.addEventListener("click", () => {
      if (!$("msgMenu").hidden) return;      // 長按選單開著時不要順手放大
      openPhoto(m);
    });
    bub.appendChild(box);
    bub.insertAdjacentHTML("beforeend", time);
  } else if (m.kind === "vd") {
    /* 影片：泡泡裡放封面（第一幀）＋播放鍵＋長度。
       ⚠️ 泡泡裡「絕對不要」放 <video> —— 那會讓瀏覽器對每一則影片
          都去建立一個解碼器，捲動一長串訊息時記憶體會直接爆掉。
          真正的 <video> 只有燈箱裡那一個。 */
    bub.className = "bub photo video";
    const box = document.createElement("div");
    box.className = "ph vd";
    const w = Number(m.body.w) || 16, h = Number(m.body.h) || 9;
    box.style.aspectRatio = `${w} / ${h}`;

    if (m.body.d) {
      const img = document.createElement("img");
      img.src = safeImgSrc(m.body.d);
      img.alt = "影片封面";
      img.decoding = "async";
      img.loading = "lazy";
      box.appendChild(img);
    }

    const play = document.createElement("span");
    play.className = "vd-play";
    play.setAttribute("aria-hidden", "true");
    box.appendChild(play);

    // 右下角：長度 + 大小。點下去才會下載，先讓人知道要等多久
    const tag = document.createElement("span");
    tag.className = "ph-size";
    tag.textContent = `${fmtDur(m.body.du)} · ${fmtBytes(Number(m.body.fb) || 0)}`;
    box.appendChild(tag);

    box.addEventListener("click", () => {
      if (!$("msgMenu").hidden) return;
      openVideo(m);
    });
    bub.appendChild(box);
    bub.insertAdjacentHTML("beforeend", time);
  } else {
    bub.className = "bub";
    bub.appendChild(linkify(m.body.d));
    bub.insertAdjacentHTML("beforeend", time);
    /* 「愛」關鍵字：外框繞一道粉光（v49；v46 是整顆粉紅），而且會自己微微冒出愛心。
       ⚠️ 冒出來的那幾顆「不放進泡泡裡」—— 泡泡有 `overflow` 之外的兩個問題：
          愛心要從泡泡「底緣往外」飄，放進去會被泡泡的圓角與範圍切掉；
          而且泡泡會跟著訊息列一起捲動，愛心那一層是釘在對話區上的。
          所以愛心生在獨立的一層上，每次要生的時候現量泡泡的位置（見 Love.spawn）。
       ⚠️ 更正一個舊註解：這裡以前寫「泡泡沒有 position: relative」，那是錯的。
          `.bub` 本來就是 relative，`.sendmark`（left:-18px）正是靠它定位的，
          v49 那道繞框的光也依賴它。實測加上 ::before 之後泡泡尺寸與小標位置都沒變。 */
    if (hasLove(m)) { bub.classList.add("love"); Love.watch(bub); }
  }

  /* 閱後即焚的記號（v50）。
     ⚠️ 火苗小標**每一則即焚訊息都有**，包含自己剛送出、對方還沒看到的那些 ——
        不然你會分不出「這則是即焚的」跟「這則是一般的」，而那個差別是不可逆的。
     ⚠️ 倒數的數字只有「引信真的在走」的時候才有字（Burn.paintOne 填），
        所以自己送出的那幾則只看得到火苗，看不到數字。 */
  if (isBurn(m) && burnFeatureOn()) {
    bub.classList.add("burn");
    const mark = document.createElement("span");
    mark.className = "burn-mark";
    mark.setAttribute("aria-hidden", "true");
    /* ⚠️ viewBox 是 "7.5 1.4 9 11.6"，不是 "0 0 24 24" —— 這條路徑的墨水只落在
          24×24 畫布的左上一角（getBBox 實測 x=7.5 y=1.4 w=9 h=11.6，只佔 38%×48%）。
          v50 用 0 0 24 24 時寫 width=10 實際只畫出 3.8×4.8px，看起來像一顆髒點。
          畫布裁到墨水邊界之後「宣告幾 px 就是幾 px」，改大小才有意義。
          → 要換火苗形狀的話，記得同時用 getBBox 重算 viewBox，不要直接沿用這串數字。 */
    mark.innerHTML =
      '<svg viewBox="7.5 1.4 9 11.6" width="12.5" height="12.5"><path fill="currentColor"' +
      ' d="M13.6 1.4c.3 2-.6 3.6-.2 5.4.7-.4 1.2-1.2 1.4-2.2 1 1.1 1.7 2.4 1.7 3.9a4.5 4.5 0 0 1-9 0c0-1.9 1-3.3 2.2-4.6 1.3-1.3 2.6-2.3 3.9-2.5Z"/></svg>' +
      '<span class="burn-cd"></span>';
    bub.appendChild(mark);
    Burn.watch(bub, m);
  }

  // 引用塊：整段都藏在密文裡，所以雲端看不到被引用的是什麼
  if (m.body && m.body.r && m.body.r.k) {
    const q = document.createElement("div");
    q.className = "q";
    q.dataset.to = m.body.r.k;
    const who = document.createElement("span");
    who.className = "q-who";
    /* 多人房裡「對方」是誰講不清楚，所以去訊息清單裡把被引用那則的暱稱撈出來。
       撈不到（已刪、或還沒載進來）就退回「有人」，不要留一個假的名字。 */
    if (refIsMine(m.body.r)) who.textContent = "你";
    else if (S.open) {
      const src = S.msgs.find((x) => x.k === m.body.r.k);
      who.textContent = (src && src.body && src.body.n) || "有人";
    } else who.textContent = "對方";
    const sn = document.createElement("span");
    sn.className = "q-snip";
    paintQuote(sn, m.body.r);
    q.append(who, sn);
    bub.insertBefore(q, bub.firstChild);
  }

  /* 註：v18.9 拿掉了「隱形墨水」。以前送出的訊息密文裡可能還留著 fx:"ink"，
     現在一律當成普通訊息顯示 —— 不用特別處理，多的欄位讀不到就沒有作用。 */

  /* 多人房：別人的訊息掛暱稱。顏色只上在名字與泡泡左緣那條細線上，
     不去改泡泡底色 —— 六種顏色乘上深淺兩套主題，很容易做出看不清楚的組合。 */
  if (nick && !mine) {
    const c = nickColorOf(m.body.nc);
    bub.classList.add("named");
    bub.style.setProperty("--nick", c);

    const stack = document.createElement("div");
    stack.className = "b-stack";
    if (!sameAsPrev) {
      const tag = document.createElement("span");
      tag.className = "nick";
      tag.style.color = c;
      tag.textContent = nick;      // textContent，絕不用 innerHTML：暱稱是對方送來的字串
      stack.appendChild(tag);
    }
    stack.appendChild(bub);
    row.appendChild(stack);
    row.dataset.nick = nick;
  } else {
    row.appendChild(bub);
  }

  /* 氣泡外側下緣那顆小圓鈕 → 展開表情。
     `.me` 的訊息靠右，鈕會被擠到螢幕邊，所以用 order 翻到氣泡左邊（見 style.css）。 */
  const rxBtn = document.createElement("button");
  rxBtn.type = "button";
  rxBtn.className = "rx-btn";
  rxBtn.setAttribute("aria-label", "表情回應");
  rxBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>'
    + '<circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>'
    + '<path d="M8.2 14.2a4.6 4.6 0 0 0 7.6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
  row.appendChild(rxBtn);

  wrap.appendChild(row);
  return wrap;
}

/* 把訊息裡的網址變成可點的連結。
   一律用 DOM 節點組出來，絕對不碰 innerHTML —— 訊息是對方送來的內容，
   拼進 HTML 就是現成的 XSS。
   刻意不抓預覽圖：抓預覽等於把這條網址送給第三方伺服器。 */
const URL_RE = /\bhttps?:\/\/[^\s<>"'）)】」，,。]+/g;

function linkify(text) {
  const frag = document.createDocumentFragment();
  const str = String(text ?? "");
  let last = 0;
  for (const mm of str.matchAll(URL_RE)) {
    if (mm.index > last) frag.appendChild(document.createTextNode(str.slice(last, mm.index)));
    const a = document.createElement("a");
    a.href = mm[0];
    a.textContent = mm[0];
    a.target = "_blank";
    a.rel = "noopener noreferrer nofollow";
    frag.appendChild(a);
    last = mm.index + mm[0].length;
  }
  if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
  return frag;
}

/* 往上翻舊訊息時才出現「回到最新」 */
function paintJump() {
  const btn = $("btnJump"), sc = $("scroller");
  if (!btn || !sc) return;
  btn.hidden = $("chat").hidden || (sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 240;
}

function renderAll() {
  const list = $("msgList");
  const frag = document.createDocumentFragment();
  S.msgs.forEach((m, i) => frag.appendChild(rowEl(m, S.msgs[i - 1])));
  list.replaceChildren(frag);
  $("emptyState").hidden = S.msgs.length > 0;
  renderReadMark();
  paintSendState();
  paintLoadMore();
  paintReactions();
}

/* 標題列同時要顯示「在線狀態」與「正在輸入」，共用同一塊文字。
   正在輸入優先 —— 那是當下正在發生的事。 */
/* 清掉「超過 10 分鐘沒心跳」的在線節點。
   規則對 p 是整間房可寫的（同一把密碼＝同一間房），所以在房裡的人都清得動。
   ⚠️ 絕對不能用 PRESENCE_FRESH_MS（90 秒）當門檻 ——
      那只是「顯示成不在線」的門檻，對方切出去看一眼通知就會被誤刪，
      回來得重建節點，而且兩台裝置會互相刪來刪去。
   ⚠️ 不刪自己的：自己的那筆剛剛才寫，而且離開時有專屬的清理路徑。 */
async function sweepPresence(f, base, myGen) {
  const { db, ref, get, remove } = f;
  try {
    const snap = await get(ref(db, `${base}/p`));
    if (myGen !== S.gen) return;                 // 掃到一半已經離開這一輪
    const v = snap.val() || {};
    const now = nowServer();
    const dead = Object.keys(v).filter((k) => {
      if (k === S.clientId) return false;
      const at = Number(v[k] && v[k].at);
      return !Number.isFinite(at) || at <= 0 || (now - at) > PRESENCE_STALE_MS;
    });
    for (const k of dead) {
      if (myGen !== S.gen) return;
      await remove(ref(db, `${base}/p/${k}`)).catch(() => {});
    }
  } catch (_) {}
}

/* 依「現在」重算在線並重畫。資料沒變也可能改變結果（時間過去了）。 */
function repaintPresence() {
  S.peerOnline = livePeers(S.presence, S.clientId, nowServer()).length > 0;
  paintPeerState();
}

function paintPeerState() {
  const dot = $("peerDot"), txt = $("peerText");
  if (!dot || !txt) return;
  const fresh = S.peerTyping && (Date.now() + S.offset - S.peerTyping) < 5000;
  if (fresh) {
    dot.dataset.on = "true";
    /* 多人房刻意不說「誰」在輸入 —— 名冊只存在密文裡，而 typing 節點是明文的。
       要顯示名字就得把暱稱寫成明文，等於公告「這間房有哪些人」。 */
    txt.textContent = S.open ? "有人正在輸入…" : "正在輸入…";
    txt.classList.add("typing");
    return;
  }
  txt.classList.remove("typing");
  dot.dataset.on = S.peerOnline ? "true" : "false";
  // 多人房只講「有人」，不講幾個人，也不講是誰
  if (S.open) txt.textContent = S.peerOnline ? "有人在線上" : "目前只有你";
  else txt.textContent = S.peerOnline ? "在線上" : "不在線";
}

/* 送出狀態：還沒落地的掛時鐘、失敗的掛驚嘆號、落地了什麼都不掛。
   刻意不做「已送出」的勾 —— 每則都掛一個小圖示只是視覺噪音，
   真正需要被告知的是「還沒送出」這件事。 */
function paintSendState() {
  const list = $("msgList");
  if (!list) return;
  list.querySelectorAll(".row.me").forEach((row) => {
    const k = row.dataset.k;
    const state = S.failed.has(k) ? "failed" : S.pending.has(k) ? "pending" : "";
    if (row.dataset.state === state) return;
    row.dataset.state = state;
    row.querySelector(".sendmark")?.remove();
    if (!state) return;
    const tag = document.createElement("span");
    tag.className = `sendmark ${state}`;
    tag.textContent = state === "failed" ? "！" : "";
    tag.title = state === "failed" ? "送出失敗" : "還沒送出";
    row.querySelector(".bub")?.appendChild(tag);
  });
}

/* 兩段式狀態，各只掛一次：
     「已讀」  貼在對方看過的、我方最新的那一則下面
     「已送達」貼在對方收到但還沒看的、我方最新的那一則下面
   兩個標記最多同時出現一個「已讀」加一個「已送達」，
   對方全部看完時只會剩「已讀」。 */
function renderReadMark() {
  const list = $("msgList");
  list.querySelectorAll(".readmark").forEach((el) => el.remove());
  if (!readReceiptOn()) return;

  // 找出「我送的、而且不比 key 新」的最後一則
  const mineUpTo = (key) => {
    if (!key) return null;
    let target = null;
    for (const m of S.msgs) {
      if (m.s === S.clientId && m.k <= key) target = m;
    }
    return target;
  };

  const stick = (target, text, cls) => {
    if (!target) return;
    const row = [...list.querySelectorAll(".row")].find((r) => r.dataset.k === target.k);
    if (!row) return;
    const tag = document.createElement("div");
    tag.className = "readmark" + (cls ? " " + cls : "");
    tag.textContent = text;
    // 表情列要緊貼氣泡，「已讀」排在它下面
    const bar = row.nextElementSibling;
    (bar && bar.classList.contains("rx-bar") ? bar : row).after(tag);
  };

  const readT = mineUpTo(S.peerReadKey);
  const recvT = mineUpTo(S.peerRecvKey);

  stick(readT, "已讀");
  if (recvT && (!readT || recvT.k > readT.k)) stick(recvT, "已送達", "sent");
}

/* ────────────── 「愛」關鍵字（v46）──────────────
 *
 * 使用者的話：「輸入關鍵字『愛』這個字可以將泡泡框變成粉色且整個泡泡框都帶微微的冒出
 * 愛心泡泡，並且在輸入愛的關鍵字同時會瞬間冒出 100 個愛心泡泡，效果如同思念按鈕累積 100 次。」
 *
 * 三個設定都可以在 config.js 覆寫，但**沒寫也要能動** ——
 * 更新包不含 config.js，使用者手上那一份不會有這些鍵（坑 #124）。
 */
const LOVE_WORDS_DEFAULT = ["愛"];
const loveOn = () => CFG.loveKeyword !== false;      // 沒設定＝開著
const loveWords = () =>
  (Array.isArray(CFG.loveWords) && CFG.loveWords.length ? CFG.loveWords : LOVE_WORDS_DEFAULT);
const loveBurstN = () => (Number(CFG.loveBurst) > 0 ? Number(CFG.loveBurst) : 100);
const loveCoolMs = () =>
  (Number.isFinite(Number(CFG.loveCooldownSeconds)) ? Number(CFG.loveCooldownSeconds) : 8) * 1000;

/* ⚠️ 只認純文字訊息。照片／影片／貼圖沒有文字可以比對，
      解不開的訊息（kind "err"）更不可以拿密文去比對。
   ⚠️ 使用者明確決定「不管，含『愛』就噴」—— 所以這裡**刻意不做否定詞判斷**，
      「我不愛你」照樣是粉紅色、照樣噴。要改的話只有這一個函式。 */
function hasLove(m) {
  if (!loveOn()) return false;
  if (!m || m.kind !== "tx") return false;
  const t = String((m.body && m.body.d) || "");
  if (!t) return false;
  return loveWords().some((w) => w && t.includes(w));
}

const Love = {
  MAX_ALIVE: 3,          // 每一顆泡泡同時最多冒幾顆
  EVERY_MS: 1800,        // 多久補一輪
  coolAt: 0,             // 100 顆的冷卻到期時間
  io: null,
  vis: new Set(),
  timer: null,

  /* 愛心生在自己的一層上，跟思念泡泡分開。
     ⚠️ 共用 missField 的話，這幾顆常駐的會吃掉爆發時 MAX_ALIVE 的名額，
        而且 Miss.stop() 會把它們一起清掉（那是對的，但時機不對）。
     ⚠️ 上下邊界跟 missField 一樣要現量：鍵盤彈出、輸入框變多行都會變。 */
  field() {
    const chat = $("chat");
    if (!chat) return null;
    let f = $("loveField");
    if (!f) {
      f = document.createElement("div");
      f.id = "loveField";
      f.className = "c-love-field";
      f.setAttribute("aria-hidden", "true");
      chat.appendChild(f);
    }
    const box = chat.getBoundingClientRect();
    const bar = $("sendForm");
    const head = chat.querySelector(".c-bar");
    f.style.top = (head ? head.getBoundingClientRect().bottom - box.top : 48) + "px";
    f.style.bottom = (bar ? bar.getBoundingClientRect().height : 56) + "px";
    return f;
  },

  /* 只有「畫面上看得到」的粉紅泡泡會冒。
     ⚠️ 這一條不是最佳化，是必要的：歷史裡有二十則含「愛」的話，
        沒有這道就是二十個永遠在跑的動畫，手機會一直發燙。 */
  watch(bub) {
    if (!loveOn()) return;
    if (typeof IntersectionObserver !== "function") return;   // 太舊的瀏覽器就不冒，不要壞掉
    if (!this.io) {
      this.io = new IntersectionObserver((es) => {
        es.forEach((e) => (e.isIntersecting ? this.vis.add(e.target) : this.vis.delete(e.target)));
        this.pump();
      }, { root: $("scroller"), threshold: 0 });
    }
    this.io.observe(bub);
    this.pump();
  },

  pump() {
    /* 畫面上一顆都沒有就把計時器停掉 —— 不停的話它會在背景一直空轉。 */
    if (!this.vis.size) { clearInterval(this.timer); this.timer = null; return; }
    if (this.timer) return;
    this.timer = setInterval(() => this.round(), this.EVERY_MS);
    this.round();
  },

  round() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;
    const f = this.field();
    if (!f) return;
    const box = f.getBoundingClientRect();
    for (const bub of [...this.vis]) {
      /* renderAll() 會把整串泡泡換掉，舊節點還留在集合裡 —— 這裡順手清掉。 */
      if (!bub.isConnected) { this.vis.delete(bub); this.io?.unobserve(bub); continue; }
      if (f.querySelectorAll(`[data-love="${bub.dataset.loveId}"]`).length >= this.MAX_ALIVE) continue;
      this.spawn(f, box, bub);
    }
    if (!this.vis.size) { clearInterval(this.timer); this.timer = null; }
  },

  spawn(f, box, bub) {
    const r = bub.getBoundingClientRect();
    if (!r.width || r.bottom < box.top || r.top > box.bottom) return;
    if (!bub.dataset.loveId) bub.dataset.loveId = String(++Love.seq);

    const rnd = (a, z) => a + Math.random() * (z - a);
    const size = rnd(9, 14);
    const el = document.createElement("span");
    el.className = "c-love-bit";
    el.dataset.love = bub.dataset.loveId;
    el.style.left = (r.left - box.left + rnd(0.1, 0.9) * r.width - size / 2) + "px";
    /* 從泡泡底緣往上飄。field 是由下往上算的，所以要換算成 bottom。 */
    el.style.bottom = (box.bottom - r.bottom) + "px";
    el.style.setProperty("--rise", rnd(34, 62).toFixed(0) + "px");
    el.style.setProperty("--peak", rnd(0.16, 0.34).toFixed(2));
    el.style.setProperty("--dur", rnd(3.0, 4.4).toFixed(2) + "s");
    el.style.setProperty("--sx", rnd(3, 8).toFixed(1) + "px");
    el.style.setProperty("--swayd", rnd(2.0, 3.2).toFixed(2) + "s");
    el.style.setProperty("--swayo", (-rnd(0, 3)).toFixed(2) + "s");
    el.innerHTML = BOND.private.icon(size.toFixed(0), HEART_PINKS[(Math.random() * HEART_PINKS.length) | 0]);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    f.appendChild(el);
  },

  /* 收到一則新的含「愛」訊息 → 瞬間灑 100 顆。
     ⚠️ 只掛在「真的有新訊息進來」那條路上，不可以掛在畫面重繪上 ——
        往上翻舊訊息、切換主題、清單重畫都會重跑一次渲染，
        掛錯地方的話會變成「捲一下就滿天愛心」。
     ⚠️ 冷卻是使用者選的 8 秒：連打十次不會把字整個蓋掉，
        但粉紅泡泡與微微冒出的那幾顆**不受冷卻影響**，每一則都照樣有。 */
  maybeBurst(m) {
    if (!hasLove(m)) return;
    const now = Date.now();
    if (now < this.coolAt) return;
    this.coolAt = now + loveCoolMs();
    Miss.shower(loveBurstN(), BOND.private);
  },

  reset() {
    clearInterval(this.timer); this.timer = null;
    if (this.io) { this.io.disconnect(); this.io = null; }
    this.vis.clear();
    this.coolAt = 0;
    const f = $("loveField");
    if (f) f.replaceChildren();
  },
};
Love.seq = 0;

/* ────────────────────────── 閱後即焚（v50）──────────────────────────
 *
 * 私人房限定。輸入列上那顆火焰信封鈕亮著的時候送出去的訊息，會帶一個
 * **加密在內容裡**的旗標（body.b）—— 雲端看到的還是一包密文，
 * 它不知道哪一則會燒。
 *
 * ⚠️⚠️ 引信只在「這則泡泡真的在畫面上」的時候走。使用者原本想的是
 *    「進房就開始倒數」，但那會燒掉你根本還沒讀到的訊息 ——
 *    進房剛好被打斷、手機放下五分鐘回來，整串沒讀就沒了，而且救不回來。
 *    所以改成：看得見才燒，捲走就暫停，切到背景、遮罩蓋著也暫停。
 *
 * ⚠️⚠️ **只燒「對方傳給我的」**。自己送出的那幾則在自己這邊不起跑引信 ——
 *    不然你光是看著自己剛打的字，它就會在對方讀到之前先燒掉，
 *    「閱後」即焚就變成「送出」即焚了。
 *    （自己那一份會在對方燒掉時跟著消失，因為刪的是雲端同一個節點。）
 *
 * ⚠️ 燒掉 = 從雲端刪掉，所以**雙方一起消失**，不是只有讀的人那邊不見。
 *    這一點使用者確認過了。
 *
 * ⚠️ 照片與影片燒掉時，Cloud Storage 的原檔會一起刪，但桶子開著虛刪除、
 *    保留 7 天 —— 也就是說**圖片不是真的立刻燒掉**，一週內在主控台還救得回來。
 *    使用者知道而且接受（「圖片畫面燒掉資料庫還躺七天的設定沒關係」）。
 *    要真的燒掉只能把桶子的虛刪除關掉。這件事寫在部署說明裡備查。
 * ─────────────────────────────────────────────────────────────────── */

const BURN_KEY = (rid) => `sc-burn-${rid}`;
const burnFeatureOn = () => CFG.burnAfterRead !== false;
const burnBase = () => (Number(CFG.burnSeconds) > 0 ? Number(CFG.burnSeconds) : 10);
const burnStepChars = () => (Number(CFG.burnPerChars) > 0 ? Number(CFG.burnPerChars) : 20);
const burnStepSecs = () => (Number(CFG.burnPerCharsSeconds) > 0 ? Number(CFG.burnPerCharsSeconds) : 5);
const burnCap = () => (Number(CFG.burnMaxSeconds) > 0 ? Number(CFG.burnMaxSeconds) : 40);

/* 這一則是不是即焚的。旗標藏在密文裡，所以要解得開才看得到。 */
function isBurn(m) {
  return !!(m && m.body && m.body.b);
}

/* 幾秒。長訊息多給一點 —— 一句「好」跟三行的話都給 10 秒不合理。
   ⚠️ 只看文字長度。照片／貼圖沒有文字可以量，一律用基準秒數。 */
function burnSecondsFor(m) {
  const t = String((m && m.body && m.body.d) || "");
  const extra = Math.floor(t.length / burnStepChars()) * burnStepSecs();
  return Math.min(burnCap(), burnBase() + extra);
}

const Burn = {
  TICK_MS: 250,
  on: true,           // 這台裝置在這間房的開關（輸入列那顆鈕）
  io: null,
  vis: new Set(),     // 目前看得見、而且引信該走的泡泡
  left: new Map(),    // 泡泡節點 → 還剩幾秒
  timer: null,

  /* 私人房才有這個功能。多人房沒有「對方」這個單數概念，
     一個人讀完就幫所有人燒掉太粗暴。 */
  usable() { return burnFeatureOn() && !S.open; },

  load(rid) {
    if (!this.usable()) { this.on = false; return; }
    let v = null;
    try { v = localStorage.getItem(BURN_KEY(rid)); } catch (_) {}
    /* ⚠️ 預設「開啟」（使用者決定的）。所以只有明確存過 "off" 才是關的，
          沒存過一律當成開 —— 換新裝置、清過瀏覽器資料都會回到安全的那一邊。 */
    this.on = v !== "off";
    this.paint();
  },

  toggle() {
    if (!this.usable()) return;
    this.on = !this.on;
    try { localStorage.setItem(BURN_KEY(S.roomId), this.on ? "on" : "off"); } catch (_) {}
    this.paint();
    toast(this.on ? "接下來送出的訊息，對方看完就會燒掉" : "接下來送出的訊息會一直留著");
  },

  paint() {
    const btn = $("btnBurn");
    if (!btn) return;
    btn.hidden = !this.usable();
    btn.classList.toggle("lit", this.usable() && this.on);
    btn.setAttribute("aria-pressed", String(this.usable() && this.on));
    btn.setAttribute("aria-label", this.on ? "閱後即焚（已開啟）" : "閱後即焚（已關閉）");
  },

  /* 掛一顆泡泡上去。
     ⚠️ 只掛「對方傳來的」—— 見檔案上方那段警告。 */
  watch(bub, m) {
    if (!this.usable() || !isBurn(m) || isMine(m)) return;
    if (typeof IntersectionObserver !== "function") return;   // 太舊的瀏覽器就不燒，不要壞掉
    this.left.set(bub, burnSecondsFor(m));
    bub.dataset.burnKey = m.k;
    this.paintOne(bub);
    if (!this.io) {
      this.io = new IntersectionObserver((es) => {
        es.forEach((e) => (e.isIntersecting ? this.vis.add(e.target) : this.vis.delete(e.target)));
        this.pump();
      }, { root: $("scroller"), threshold: 0.9 });   // 露出九成才算「看得到」
    }
    this.io.observe(bub);
    this.pump();
  },

  pump() {
    if (!this.vis.size) { clearInterval(this.timer); this.timer = null; return; }
    if (this.timer) return;
    this.timer = setInterval(() => this.round(), this.TICK_MS);
  },

  /* ⚠️ 這三個「不燒」的條件缺一不可：
        ‧ document.hidden —— 手機切到別的 App、螢幕關掉，不可以在口袋裡燒掉
        ‧ #veil 沒蓋著 —— 閒置上鎖時人沒在看
        ‧ #chat 沒藏起來 —— 緊急退出、回到偽裝首頁 */
  awake() {
    return !document.hidden && $("veil")?.hidden !== false && $("chat")?.hidden === false;
  },

  round() {
    if (!this.awake()) return;
    const dt = this.TICK_MS / 1000;
    for (const bub of [...this.vis]) {
      /* renderAll() 會把整串泡泡換掉，舊節點還留在集合裡 —— 順手清掉。 */
      if (!bub.isConnected) { this.forget(bub); continue; }
      const left = (this.left.get(bub) ?? 0) - dt;
      if (left > 0) { this.left.set(bub, left); this.paintOne(bub); continue; }
      const key = bub.dataset.burnKey;
      this.forget(bub);
      /* 燒掉 = 從雲端刪掉。刪除會自己傳到兩邊，畫面由 onChildRemoved 收尾，
         所以這裡不必自己動 DOM。 */
      if (key && S.delMsg) S.delMsg(key).catch(() => {});
    }
    if (!this.vis.size) { clearInterval(this.timer); this.timer = null; }
  },

  forget(bub) {
    this.vis.delete(bub);
    this.left.delete(bub);
    try { this.io?.unobserve(bub); } catch (_) {}
  },

  /* 泡泡上那個小數字。看不到的那些不畫 —— 省下每 250ms 一次的無謂寫入。 */
  paintOne(bub) {
    const el = bub.querySelector(".burn-cd");
    if (!el) return;
    const left = this.left.get(bub);
    if (left == null) { el.textContent = ""; return; }
    el.textContent = String(Math.max(1, Math.ceil(left)));
  },

  reset() {
    clearInterval(this.timer); this.timer = null;
    try { this.io?.disconnect(); } catch (_) {}
    this.io = null;
    this.vis.clear();
    this.left.clear();
    this.on = true;
  },
};

/* 做一件會改變聊天室高度的事，做完之後如果本來就貼在底部，就繼續貼著。
   ⚠️ 跟 paintReactions 同一條規矩：一定要「先量再動」——
      動完再量，量到的是新高度，永遠會判成「不在底部」（v44 的教訓）。
   ⚠️ 不在底部就完全不動：使用者正在翻舊訊息時被拉到最底比什麼都煩。 */
function keepBottom(work) {
  const sc = $("scroller");
  const at = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90 : false;
  work();
  if (!at || !sc) return;
  sc.scrollTop = sc.scrollHeight;
  requestAnimationFrame(() => {
    if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90) sc.scrollTop = sc.scrollHeight;
  });
}

/* ────────────── 置頂公告（v45）──────────────
 *
 * 一間房只有一則。新的直接蓋掉舊的 —— 使用者要的就是「一次只有一則」。
 *
 * ⚠️ 內容跟訊息一樣用房間金鑰加密（seal/unseal），伺服器看不懂。
 *    存在 rooms/<房號>/notice 而不是訊息串裡 —— 它不是一則訊息，
 *    混進訊息串會讓「載入更早」「已讀位置」「清除」三件事全部要為它開特例。
 *
 * ⚠️ 這個模組只管畫面。要不要顯示是雲端那份資料決定的：
 *    訂閱收到 null 就收起來，收到內容就畫出來。
 *    「下架」是刪雲端那一筆，不是在本機藏起來 —— 兩邊都會消失。
 *
 * ⚠️ 公告會佔掉聊天室的高度，所以每一次顯示／收合／展開都要走 keepBottom()，
 *    不然使用者原本看著的最後一則訊息會被擠出畫面。
 */
const Notice = {
  text: "",
  open: false,

  /* ⚠️ 只切一個 class。下架鈕露不露臉交給 CSS（.c-ann.open .c-ann-drop）——
        兩邊都管的話，總有一天會出現「class 對了但鈕沒出來」的狀態不一致。 */
  paint() {
    const box = $("annBox");
    if (!box) return;
    box.classList.toggle("open", this.open);
    box.setAttribute("aria-expanded", String(this.open));
  },

  show(text) {
    const t = String(text || "").trim();
    if (!t) return this.clear();
    /* 換了一則公告就回到收合 —— 停在上一則的展開狀態會讓人以為看的還是舊的。 */
    if (t !== this.text) this.open = false;
    this.text = t;
    keepBottom(() => {
      const el = $("annText");
      if (el) el.textContent = t;
      const slot = $("annSlot");
      if (slot) slot.hidden = false;
      this.paint();
    });
  },

  clear() {
    if (!this.text && $("annSlot")?.hidden !== false) { this.open = false; this.paint(); return; }
    this.text = ""; this.open = false;
    keepBottom(() => {
      const slot = $("annSlot");
      if (slot) slot.hidden = true;
      const el = $("annText");
      if (el) el.textContent = "";
      this.paint();
    });
  },

  toggle(on) {
    if (!this.text) return;
    this.open = on === undefined ? !this.open : !!on;
    keepBottom(() => this.paint());
  },

  /* 離開房間時用。不碰雲端，只把畫面收乾淨 ——
     ⚠️ 中文公告留在偽裝首頁上會直接破功，跟 toast 同一個道理。 */
  reset() {
    this.text = ""; this.open = false;
    const slot = $("annSlot");
    if (slot) slot.hidden = true;
    const el = $("annText");
    if (el) el.textContent = "";
    this.paint();
  },
};

function bindNotice() {
  const box = $("annBox");
  if (!box) return;

  box.addEventListener("click", (e) => {
    if (e.target.closest("#annDrop")) return;   // 下架鈕有自己的行為，不要順便收合
    Notice.toggle();
  });
  /* ⚠️ 只收 Enter 與空白鍵。Esc 一定要留給緊急退出，這裡不可以攔。 */
  box.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    Notice.toggle();
  });

  /* ⚠️ 沒有獨立的「收起」鈕（使用者要求，為了省公告欄的空間）——
        收合就是再點一次公告本身，右上角那個箭頭會跟著轉，已經足夠說明。 */

  $("annDrop")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!S.dropNotice) { toast("還在連線中，請稍候一下"); return; }
    try {
      await S.dropNotice();
      Notice.clear();                      // 不等訂閱回來，按下去就要有反應
      toast("公告已下架");
    } catch (err) { console.error(err); toast("下架失敗，請檢查網路"); }
  });
}

/* 表情回應的小標，貼在氣泡正下方。
   只跑「有人按過的那幾則」，不是每則都掃 —— 幾百則的房間才不會卡。 */
function paintReactions() {
  const list = $("msgList");
  const sc = $("scroller");

  /* 表情小標是加在氣泡「下面」的 —— 對最後一則按表情，內容會變高，
     畫面不跟著走的話那一顆表情就卡在可視範圍外緣被切掉，要手動往下滑才看得到。
     ⚠️ 一定要在動 DOM「之前」量。畫完再量，量到的是新高度，
        永遠會判成「不在底部」，這條就等於白做。
     ⚠️ 只有本來就貼著底部才跟著走。使用者正在往上翻舊訊息時被硬拉到最底，
        比看不到表情更惱人 —— 判定沿用 appendMsg 那個 90px。 */
  const atBottom = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90 : false;

  list.querySelectorAll(".rx-bar").forEach((el) => el.remove());

  for (const [key, byWho] of Object.entries(S.rx || {})) {
    const row = list.querySelector(`.row[data-k="${key}"]`);
    if (!row || !byWho) continue;

    // 統計每個表情幾個人按，以及我自己按的是哪一個
    const count = {};
    let mine = null;
    for (const [cid, code] of Object.entries(byWho)) {
      if (typeof code !== "string") continue;
      count[code] = (count[code] || 0) + 1;
      if (cid === S.clientId) mine = code;
    }
    const codes = REACTIONS.filter((r) => count[r.k]);
    if (!codes.length) continue;

    /* 三種以上不同的表情就改成「疊」的：小標互相重疊省空間。
       多人房一則訊息很容易同時出現四五種表情，排開來會比訊息本身還寬。
       z-index 由左往右遞減，這樣每一顆露在外面的左半邊都壓在後一顆上面，還點得到。 */
    const bar = document.createElement("div");
    bar.className = "rx-bar " + (row.classList.contains("me") ? "me" : "you")
      + (codes.length >= 3 ? " stack" : "");
    bar.dataset.k = key;

    let z = codes.length;
    for (const r of codes) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "rx-chip" + (mine === r.k ? " mine" : "");
      chip.style.zIndex = String(z--);
      chip.dataset.k = key;
      chip.dataset.rx = r.k;
      chip.title = mine === r.k ? `取消${r.label}` : r.label;
      const em = document.createElement("span");
      em.className = "rx-em";
      em.textContent = r.e;
      chip.appendChild(em);
      if (count[r.k] > 1) {
        const n = document.createElement("span");
        n.className = "rx-n";
        n.textContent = String(count[r.k]);
        chip.appendChild(n);
      }
      bar.appendChild(chip);
    }
    row.after(bar);
  }

  if (atBottom && sc) {
    sc.scrollTop = sc.scrollHeight;
    /* 表情的字型換好之後高度還會再動一點點，下一幀補一次。
       ⚠️ 補的時候要再判一次「還在底部附近嗎」—— 使用者在這 16 毫秒內
          剛好開始往上滑的話，不可以把他拉回去。 */
    requestAnimationFrame(() => {
      if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90) sc.scrollTop = sc.scrollHeight;
    });
  }
}

/* 表情選擇器：從氣泡右下角那顆小圓鈕展開。
   刻意不放進長按選單 —— 表情是「一秒回一個」的東西，
   要先長按半秒再從四個項目裡找，就失去意義了。 */
function openRxPicker(btn) {
  const row = btn.closest(".row");
  if (!row || !row.dataset.k) return;
  const key = row.dataset.k;
  const pick = $("rxPicker");
  const mine = (S.rx?.[key] || {})[S.clientId];

  pick.replaceChildren();
  pick.dataset.k = key;
  for (const r of REACTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "c-rxb" + (mine === r.k ? " mine" : "");
    b.dataset.rx = r.k;
    b.textContent = r.e;
    b.setAttribute("aria-label", r.label);
    pick.appendChild(b);
  }
  pick.hidden = false;

  // 先顯示才量得到尺寸，再夾在畫面內
  const a = btn.getBoundingClientRect();
  const p = pick.getBoundingClientRect();
  const pad = 8;
  const bar = document.querySelector(".c-bar");
  const topLimit = (bar ? bar.getBoundingClientRect().bottom : 0) + 6;

  let left = a.left + a.width / 2 - p.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - p.width - pad));

  let top = a.top - p.height - 6;                 // 預設放上面
  if (top < topLimit) top = a.bottom + 6;         // 上面放不下就改放下面
  top = Math.max(topLimit, Math.min(top, window.innerHeight - p.height - pad));

  pick.style.left = Math.round(left) + "px";
  pick.style.top = Math.round(top) + "px";
  if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
}

function closeRxPicker() {
  const p = $("rxPicker");
  if (p) { p.hidden = true; p.replaceChildren(); }
}

function bindRxPicker() {
  $("rxPicker")?.addEventListener("click", (e) => {
    const b = e.target.closest(".c-rxb");
    if (!b) return;
    const key = $("rxPicker").dataset.k;
    closeRxPicker();
    toggleRx(key, b.dataset.rx);
  });

  $("msgList").addEventListener("click", (e) => {
    const btn = e.target.closest(".rx-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (!$("msgMenu").hidden) return;
    if (!$("rxPicker").hidden && $("rxPicker").dataset.k === btn.closest(".row")?.dataset.k) {
      closeRxPicker();                 // 再點同一顆就收起來
      return;
    }
    openRxPicker(btn);
  });

  $("scroller").addEventListener("scroll", closeRxPicker, { passive: true });
  document.addEventListener("pointerdown", (e) => {
    if (!$("rxPicker").hidden && !e.target.closest("#rxPicker") && !e.target.closest(".rx-btn")) closeRxPicker();
  }, true);
}

/* 點一下自己按過的表情就是取消，點別的就是換一個 */
function toggleRx(key, code) {
  if (!S.setRx) { toast("還在連線中，請稍候一下"); return; }
  const mine = (S.rx?.[key] || {})[S.clientId];
  S.setRx(key, mine === code ? null : code);
}

/* 只有「畫面看得到、而且捲到底」才算真的讀過 */
function tryMarkRead() {
  /* ⚠️ 多人房沒有已讀回條，但「我讀到哪」這件事本身還是要記 ——
        不然就沒有分隔線、也沒有「你不在的時候…」的定位點。
        差別只在：私人房寫雲端（對方看得到），多人房只寫本機（誰都看不到）。 */
  const local = !readReceiptSend();          // v56：隱身也走本機那條
  if (!local && !S.markRead) return;
  if ($("chat").hidden || !$("veil").hidden) return;   // 遮罩蓋著不算看到
  const sc = $("scroller");
  if (sc.scrollHeight - sc.scrollTop - sc.clientHeight > 120) return;

  const last = S.msgs[S.msgs.length - 1];
  if (!last || last.k === S.lastReadSent) return;
  S.lastReadSent = last.k;
  if (local) ReadMark.save(S.roomId, last.k);
  else S.markRead(last.k);
}

/* 「已送達」的門檻低很多：訊息真的到了這台裝置、而且解得開就算。
   遮罩蓋著、捲在上面看舊訊息都算 —— 那些只影響「有沒有看到」，
   不影響「有沒有收到」。退出房間後 S.markRecv 會被清掉，就不再回報了。 */
function tryMarkRecv() {
  if (!readReceiptSend() || !S.markRecv) return;
  const last = S.msgs[S.msgs.length - 1];
  if (!last || last.k === S.lastRecvSent) return;
  S.lastRecvSent = last.k;
  S.markRecv(last.k);
}

/* ⚠️ 不可以一律 appendChild。
   即時訂閱是 limitToLast(pageSize) 的滑動視窗：只要刪掉視窗內的一則，
   視窗就會往下滑，第 31 舊的那則會「進入視窗」而觸發 onChildAdded。
   那是一則舊訊息，直接接到最後面就會出現「刪一則、底下冒出一則老訊息」
   的迴光返照現象（重新整理就好，因為重畫時會照 key 排序）。
   所以比最後一則舊的，要插回正確位置並重畫。 */
function appendMsg(m) {
  const sc = $("scroller");
  const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90;

  // 要記「最小的」key，不是「第一個解完的」，否則往上載入會跳過中間的訊息
  if (!S.oldestKey || m.k < S.oldestKey) S.oldestKey = m.k;
  $("emptyState").hidden = true;

  const last = S.msgs[S.msgs.length - 1];

  if (!last || m.k > last.k) {
    // 常見路徑：真的是最新的一則
    S.msgs.push(m);
    $("msgList").appendChild(rowEl(m, last));
    if (atBottom) sc.scrollTop = sc.scrollHeight;
  } else {
    // 補進來的舊訊息：插回正確位置，重畫，並保住使用者當下看的位置
    let i = S.msgs.length;
    while (i > 0 && S.msgs[i - 1].k > m.k) i--;
    if (S.msgs[i] && S.msgs[i].k === m.k) return;    // 已經有了就不重複插
    S.msgs.splice(i, 0, m);
    const keep = sc.scrollHeight - sc.scrollTop;
    renderAll();
    sc.scrollTop = Math.max(0, sc.scrollHeight - keep);
  }

  renderReadMark();
  paintSendState();
  paintJump();
  paintLoadMore();
  paintReactions();
  if (S.onSettle) { S.onSettle(); return; }   // 初次載入中：等安靜下來再一次處理
  /* ⚠️ 一定要放在上面那一行「之後」。放前面的話，進房載入那一批舊訊息
        只要有一則含「愛」就會當場噴 100 顆 —— 每次進房都滿天愛心。
        往上翻舊訊息走的是另一條路（直接 prepend），本來就不會經過這裡。 */
  Love.maybeBurst(m);
  tryMarkRecv();     // 先回報「收到」—— 不受遮罩／捲動位置影響
  tryMarkRead();     // 再看夠不夠格算「看到」
}

function addSystem(text) {
  const d = document.createElement("div");
  d.className = "sys";
  d.textContent = text;
  $("msgList").appendChild(d);
  $("emptyState").hidden = true;      // 不然會同時出現「對話已清除」和「還沒有訊息」
  $("scroller").scrollTop = $("scroller").scrollHeight;
}

function resetList() {
  // 只動 epoch，不動 gen —— 清空訊息不該讓這間房的訂閱失效
  S.epoch++;               // 讓所有還在飛的解密／載入結果失效，不會再被畫回來
  S.msgs = [];
  S.keys.clear();
  S.oldestKey = null;
  S.reachedTop = false;
  S.topCheckedAt = 0;
  S.loadingOlder = false;
  S.peerReadKey = null;
  S.peerRecvKey = null;
  S.lastReadSent = null;
  S.lastRecvSent = null;
  S.rx = {};
  $("msgList").replaceChildren();
  $("emptyState").hidden = false;
  /* ⚠️ 這裡只能清「畫面與記憶體」，絕對不可以碰 localStorage。
        resetList() 在「進房」時也會跑一次 —— 在這裡刪掉本機基準的話，
        「你不在的時候他想念了你 N 次」永遠算不出來（基準每次進房都被抹掉）。
        真正的歸零走 Heart.wiped()，只掛在兩條清除對話的路徑上。 */
  Heart.reset();
  paintLoadMore();
}

function closeLightbox() {
  const box = $("lightbox"), img = $("lightboxImg"), vid = $("lightboxVideo");
  box.hidden = true;
  box.classList.remove("loading", "expired", "isvideo");
  const note = $("lightboxNote");
  if (note) { note.hidden = true; note.textContent = ""; }
  // 解密後的原圖不留在 DOM，objectURL 也要還回去（不還的話那份解密內容會一直留在記憶體）
  if (img.dataset.objurl) { URL.revokeObjectURL(img.dataset.objurl); delete img.dataset.objurl; }
  img.removeAttribute("src");
  img.hidden = false;

  /* ⚠️ 影片一定要 pause() + 清掉 src + load()。
        只把元素 hidden 起來的話它會在背景繼續播，聲音還會傳出來 ——
        在一個偽裝成 Google 首頁的網站上，那是最糟糕的失誤。 */
  if (vid) {
    try { vid.pause(); } catch (_) {}
    if (vid.dataset.objurl) { URL.revokeObjectURL(vid.dataset.objurl); delete vid.dataset.objurl; }
    vid.removeAttribute("src");
    try { vid.load(); } catch (_) {}
    vid.hidden = true;
  }
  const save = $("lightboxSave");
  if (save) { save.hidden = true; save.removeAttribute("href"); }
  S.lightboxKey = null;
  S.retryMedia = null;
}

function openLightbox(src, key) {
  const img = $("lightboxImg");
  img.hidden = false;
  img.src = src || "";
  const vid = $("lightboxVideo");
  if (vid) vid.hidden = true;
  $("lightbox").hidden = false;
  S.lightboxKey = key || null;    // 記住是哪一則，那則被刪掉時要把放大檢視一起收掉
}

/* 秒 → 0:07 / 1:23 */
function fmtDur(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* 媒體抓不回來時的說法。照片與影片共用，只有主詞不一樣。 */
function mediaErrText(code, what, raw) {
  return (
    code === "expired"   ? `${what}已過期（只保留 ${CFG.mediaTtlDays || 7} 天）` :
    code === "slow"      ? `等太久了，${what}沒抓下來。點一下再試一次` :
    /* 檔案在、權限也對、線路也是通的 —— 是瀏覽器不准這個網站讀取回應內容。
       ⚠️ 這一句「絕對不可以」叫使用者去弄自己的網路或擴充功能：他做什麼都沒有用，
          要改的是伺服器那一端（Storage 桶子的 CORS 設定），而且改一次全部人生效。
          2026-08-24 就是因為說錯話，害使用者往「我的網路是不是有問題」查了三個版本。 */
    code === "cors"      ? `${what}被瀏覽器擋下來了 —— 這是網站的伺服器設定問題（CORS），不是你的網路` :
    /* 檔案在、權限也對，就是傳不回來 —— 幾乎都是網路那一段（行動網路／換個瀏覽器常常就好） */
    code === "stalled"   ? `${what}在雲端上（檔案沒問題），但傳不回來。換個網路或關掉擋廣告的擴充功能再試一次` :
    code === "blocked"   ? "連不到儲存空間。多半是網路、DNS 或擋廣告的擴充功能把它擋掉了" :
    code === "offline"   ? "連不上，稍後再試" :
    code === "nostorage" ? "這個網站還沒啟用 Cloud Storage" :
    code === "broken"    ? `${what}解不開` :
    code === "denied"    ? `沒有權限讀取${what}` :
    /* ⚠️ 真的查不出原因時要把代碼講出來。
          「載入失敗」四個字對回報問題的人一點幫助都沒有 ——
          有代碼才分得出是規則擋的、檔案不在、還是網路。 */
    raw ? `${what}載入失敗（${String(raw).replace(/^storage\//, "")}）` : `${what}載入失敗`
  );
}

/* 點影片 → 整支下載 + 解密 + 播放。
   ⚠️ 沒辦法邊下載邊播（整支是加密成一塊的），所以進度一定要看得到，
      不然使用者會以為當掉了。
   ⚠️ 播不出來要「明講」。HEVC 在缺硬體解碼器的 Windows Chrome 上
      是黑畫面、不報錯 —— 那是最難自己看懂的失敗。 */
async function openVideo(m) {
  openLightbox(m.body.d || "", m.k);
  const box = $("lightbox");
  box.classList.add("loading", "isvideo");
  box.classList.remove("expired");
  const note = $("lightboxNote");
  if (note) {
    note.hidden = false;
    note.textContent = `影片要整支下載完才播得出來（${fmtBytes(Number(m.body.fb) || 0)}）`;
  }

  let blob;
  try {
    blob = await fetchMedia(m.body, (sec) => {
      if (S.lightboxKey !== m.k || box.hidden || !note) return;
      note.hidden = false;
      note.textContent =
        `影片要整支下載完才播得出來（${fmtBytes(Number(m.body.fb) || 0)}）· 已經 ${sec} 秒`;
    });
  } catch (err) {
    if (S.lightboxKey !== m.k || box.hidden) return;
    box.classList.remove("loading");
    box.classList.add("expired");
    if (note) { note.hidden = false; note.textContent = mediaErrText(err.scCode, "影片", err.scRaw); }
    if (["slow", "offline", "failed", "stalled", "blocked"].includes(err.scCode)) {
      S.retryMedia = () => openVideo(m);
    }
    return;
  }
  S.retryMedia = null;

  if (S.lightboxKey !== m.k || box.hidden) return;   // 中途關掉或換了一則 → 丟棄

  const vid = $("lightboxVideo");
  const url = URL.createObjectURL(blob);
  const prev = vid.dataset.objurl;
  vid.src = url;
  vid.dataset.objurl = url;
  if (prev) URL.revokeObjectURL(prev);

  vid.onerror = () => {
    if (S.lightboxKey !== m.k) return;
    box.classList.remove("loading");
    vid.hidden = true;
    $("lightboxImg").hidden = false;         // 退回封面，不要留一片黑
    if (note) {
      note.hidden = false;
      note.textContent = "你的裝置放不出這個影片格式（多半是 iPhone 的 HEVC）。可以先存下來用其他播放器開。";
    }
    const save = $("lightboxSave");
    if (save) { save.href = url; save.download = `video-${m.k}.mp4`; save.hidden = false; }
  };
  vid.onloadeddata = () => {
    if (S.lightboxKey !== m.k) return;
    box.classList.remove("loading");
    $("lightboxImg").hidden = true;
    if (note) { note.hidden = true; note.textContent = ""; }
  };

  vid.hidden = false;
  try { await vid.play(); } catch (_) { /* 自動播放被擋沒關係，有 controls */ }
}

/* ────────────────────────── 相簿（v60）──────────────────────────
 * 使用者的話：「我想要聊天室內做一個上傳過圖片的相簿」
 *
 * ⚠️⚠️ **絕對不可以用 decodeMsg()**。它會把訊息鍵登記進 `S.keys`
 *    —— 那是**訊息清單**的去重表。相簿掃過的每一則，之後都會被主清單
 *    判成「已經載過了」而**永遠跳過**：使用者往上翻會看到訊息憑空少掉，
 *    而且完全查不出原因（少掉的正好是他開過相簿的那一段）。
 *    所以這裡自己 unseal，一個字都不碰 S.keys。
 *
 * ⚠️ 縮圖是**內嵌在訊息裡的 data URL**（body.d），所以相簿不必另外抓圖 ——
 *    但也因此不可以一次掃完整間房：一則帶圖的訊息可以到 400000 字元，
 *    幾百則就是幾十 MB，手機上會等到懷疑人生。一次翻一頁。
 *
 * ⚠️ 只收照片（k === "ph"）。影片是使用者明確說不用的。
 * ─────────────────────────────────────────────────────────────── */
const ALBUM_PAGE = 40;          // 一次查幾則訊息
const ALBUM_ROUNDS = 6;         // 一次「載入更多」最多往回翻幾頁（整段都沒圖時才會用到）
const ALBUM_TIMEOUT_MS = 15000;

const Album = {
  items: [],        // [{ k, t, body }] 由新到舊
  cursor: null,     // 掃到哪一則訊息鍵（null = 還沒開始，從最新那頭起）
  done: false,      // 已經翻到最早
  busy: false,
  gen: 0,           // ⚠️ 自己的世代：離開房間、關掉面板都要讓在途的回應失效

  reset() {
    this.items = []; this.cursor = null; this.done = false; this.busy = false;
    this.gen++;
    const g = $("albumGrid"); if (g) g.replaceChildren();
    const n = $("albumCount"); if (n) n.textContent = "";
    const t = $("albumTip"); if (t) t.textContent = "";
    const m = $("btnAlbumMore"); if (m) m.hidden = true;
  },

  close() {
    const p = $("albumPanel");
    if (p) p.hidden = true;
    this.gen++;                      // 在途的那一輪回來時就會被丟掉
  },

  async open() {
    if (!S.key || !S.roomId) return;
    $("stickerPanel").hidden = true;
    $("settingsPanel").hidden = true;
    const p = $("albumPanel");
    if (!p) return;
    this.reset();
    p.hidden = false;
    await this.more();
  },

  /* 往回翻一段，把裡面的照片收進來。 */
  async more() {
    if (this.busy || this.done) return;
    const myGen = this.gen, myEpoch = S.epoch;
    this.busy = true;
    this.paintTip("翻找中…");

    try {
      const f = await connect();
      const mRef = f.ref(f.db, `rooms/${S.roomId}/m`);
      let found = 0;

      /* ⚠️ 整段都沒有照片時要**自己往前多翻幾頁**。
            停在原地的話畫面什麼都沒變，使用者只會覺得按鈕壞了
            —— 跟 loadOlder 那邊同一個道理。 */
      for (let round = 0; round < ALBUM_ROUNDS; round++) {
        const q = this.cursor
          ? f.query(mRef, f.orderByKey(), f.endBefore(this.cursor), f.limitToLast(ALBUM_PAGE))
          : f.query(mRef, f.orderByKey(), f.limitToLast(ALBUM_PAGE));
        const snap = await withTimeout(f.get(q), ALBUM_TIMEOUT_MS);
        if (myGen !== this.gen || myEpoch !== S.epoch) return;

        const raw = [];
        /* ⚠️ 一定要用大括號吞掉回傳值 —— forEach 的回呼回真值就會中止列舉
              （raw.push 回傳的是長度，全都是真值）。跟 loadOlder 同一顆坑。 */
        snap.forEach((c) => { raw.push(c); });
        if (!raw.length) { this.done = true; break; }

        /* 游標用**伺服器回傳的最舊那一筆**推進，不是解得開的那幾則 ——
           整段都解不開時游標若原地不動，下一輪會查到同一批，永遠翻不過去。 */
        this.cursor = raw[0].key;
        if (raw.length < ALBUM_PAGE) this.done = true;

        for (let i = raw.length - 1; i >= 0; i--) {    // 由新到舊
          const v = raw[i].val();
          if (!v || !v.c || !v.iv) continue;
          let body = null;
          try { body = await unseal(S.key, v); } catch (_) { continue; }   // 解不開就跳過
          if (myGen !== this.gen || myEpoch !== S.epoch) return;
          if (!body || body.k !== "ph" || !body.d) continue;
          this.items.push({ k: raw[i].key, t: v.t || 0, body });
          found++;
        }

        this.paint();
        if (found > 0) break;         // 這一輪有收穫就先停，讓使用者看到東西
        if (this.done) break;
      }

      this.paint();
    } catch (err) {
      if (myGen !== this.gen) return;
      console.error(err);
      this.paintTip("翻找失敗了 —— " + connHint(err));
      return;
    } finally {
      if (myGen === this.gen) this.busy = false;
    }
  },

  paintTip(s) {
    const t = $("albumTip"); if (t) t.textContent = s || "";
  },

  paint() {
    const grid = $("albumGrid");
    if (!grid) return;

    /* 只補新的那幾格，不整塊重畫 —— 重畫會讓已經載好的縮圖閃一下，
       而「載入更多」正好是使用者最常按的動作。 */
    for (let i = grid.childElementCount; i < this.items.length; i++) {
      const it = this.items[i];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "c-alb-cell";
      b.dataset.k = it.k;
      b.title = it.t ? new Date(it.t).toLocaleString("zh-TW", { hour12: false }) : "";
      const img = document.createElement("img");
      img.src = it.body.d;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      b.appendChild(img);
      grid.appendChild(b);
    }

    const n = $("albumCount");
    if (n) n.textContent = this.items.length ? `　${this.items.length} 張` : "";

    const more = $("btnAlbumMore");
    if (more) more.hidden = this.done;

    this.paintTip(
      this.items.length === 0
        ? (this.done ? "這間房還沒有照片" : "這一段沒有照片，可以再往前找")
        : (this.done ? "已經到最早了" : "")
    );
  },
};

/* 點照片 → 放大。先把縮圖放上去（立刻看得到東西），再去抓原圖蓋上來。
   ⚠️ 抓原圖是非同步的，回來時人可能已經關掉燈箱或點了別張 ——
      所以回來一定要重新確認「現在展示的還是不是同一則」。 */
async function openPhoto(m) {
  openLightbox(m.body.d, m.k);
  const box = $("lightbox");
  box.classList.add("loading");
  box.classList.remove("expired");
  const note = $("lightboxNote");
  if (note) { note.hidden = true; note.textContent = ""; }

  let blob;
  try {
    /* 超過幾秒還沒好就講一句 —— 轉圈本身不會告訴人「它還活著」還是「它死了」，
       而那兩件事使用者的反應完全不同（繼續等 vs 重點一次）。 */
    blob = await fetchMedia(m.body, (sec) => {
      if (S.lightboxKey !== m.k || box.hidden || !note) return;
      if (sec * 1000 < mediaSlowMs()) return;
      note.hidden = false;
      /* ⚠️ 不要寫「檔案比較大」—— 那是在替使用者猜原因，而且常常猜錯：
            224KB 的圖也會走到這裡，那時候這句話只會誤導人去查錯的方向。
            這裡只講「還在等」這個事實。 */
      note.textContent = `還在抓原圖…（${sec} 秒）`;
    });
  } catch (err) {
    if (S.lightboxKey !== m.k || box.hidden) return;
    box.classList.remove("loading");
    box.classList.add("expired");
    if (note) {
      note.hidden = false;
      note.textContent = err.scCode === "expired"
        ? `原圖已過期（只保留 ${CFG.mediaTtlDays || 7} 天），這是縮圖`
        : mediaErrText(err.scCode, "原圖", err.scRaw);
    }
    /* 「等太久」與「連不上」是值得再試一次的，給一條路回去 ——
       不然使用者只能關掉燈箱再點一次，而那看起來像功能壞了。 */
    if (["slow", "offline", "failed", "stalled", "blocked"].includes(err.scCode)) {
      S.retryMedia = () => openPhoto(m);
    }
    return;
  }
  S.retryMedia = null;

  if (S.lightboxKey !== m.k || box.hidden) return;   // 中途關掉或換了一張 → 丟棄
  const url = URL.createObjectURL(blob);
  const img = $("lightboxImg");
  const prev = img.dataset.objurl;
  img.src = url;
  img.dataset.objurl = url;
  // 上一張的 objectURL 要還回去，不然一直看圖記憶體會越吃越多
  if (prev) URL.revokeObjectURL(prev);
  box.classList.remove("loading");
}


/* ────────────────────────── 8. 聊天室互動 ────────────────────────── */

/* 按 Enter 是「送出」還是「換行」？
 *
 * ⚠️ v44 之前是 `window.innerWidth > 720` —— 拿視窗寬度當「這是不是手機」的替身。
 *    但視窗寬度跟「有沒有實體鍵盤」毫無關係：桌機把視窗縮窄到 720 以下，
 *    Enter 就整個失效，只能用滑鼠去點送出鈕。使用者實際踩到的就是這一條，
 *    而且症狀特別難察覺 —— 按下去不是沒反應，是「在輸入框裡換行」，
 *    看起來像自己手殘沒按到，不像程式判斷錯了。
 *
 * 改成問裝置本身：支援 hover 而且指標是「精準」的 ＝ 有滑鼠或觸控板，
 * 那台機器幾乎一定也有實體鍵盤。純觸控（手機、平板）維持換行 ——
 * 軟鍵盤的 Enter 是使用者拿來分段用的，搶走它就打不出多行訊息。
 *
 * ⚠️ 每次按鍵都重算，不可以在載入時算一次存起來：
 *    iPad 接上／拔掉鍵盤、桌機插上觸控螢幕，這個值會即時變。
 */
function enterSends() {
  try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
  catch (_) { return window.innerWidth > 720; }   // 老到沒有 matchMedia 的瀏覽器才走這條
}

function bindChatUI() {
  const input = $("msgInput"), sendBtn = $("btnSend");

  const autoGrow = () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 132) + "px";
    sendBtn.disabled = !input.value.trim();
  };
  input.addEventListener("input", autoGrow);

  const sendNow = async () => {
    const text = input.value.trim();
    if (!text) return;
    if (!S.send) { toast("還在連線中，請稍候一下"); return; }
    const reply = S.replyTo;
    input.value = ""; autoGrow(); setReply(null);
    if (S.stopTyping) S.stopTyping();          // 送出了就不是「正在輸入」了
    /* 即焚旗標（v50）：包進**加密內容**裡，不是另開一個明文欄位 ——
       開在外面的話，雲端一眼就看得出哪幾則是會燒的。 */
    try { await S.send(withNick(withReply(withBurn({ k: "tx", d: text }), reply))); }
    catch (err) {
      console.error(err); toast("送出失敗，請檢查網路");
      input.value = text; autoGrow(); setReply(reply);
    }
  };

  input.addEventListener("input", () => { if (S.ping) S.ping(); });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && enterSends()) {
      e.preventDefault();
      sendNow();
    }
  });

  /* ⚠️ 按鈕的預設行為會把焦點從輸入框搶走，而焦點一走，手機的螢幕鍵盤就收起來 ——
        使用者要再點一次輸入框才能繼續打，變成「送一句、鍵盤收一次、再點開」，
        連續講話時整個畫面一直在跳。在 mousedown 擋掉預設行為就不會發生，
        click 照常會觸發（手機點按鈕也會走 mousedown 這條相容事件，兩邊都吃得到）。
     ⚠️ 只在「焦點本來就在輸入框」時擋。使用者自己把鍵盤收起來之後再點送出，
        不該被強迫叫回一個他剛剛才關掉的鍵盤。 */
  sendBtn.addEventListener("mousedown", (e) => {
    if (document.activeElement === input) e.preventDefault();
  });
  sendBtn.addEventListener("click", sendNow);

  /* 輕點對話區的空白處 → 收起螢幕鍵盤。
   *
   * ⚠️ 一定要「輕點」才算，不可以綁在 pointerdown 上就收 ——
   *    捲動對話也是從 pointerdown 開始的，那樣一滑動鍵盤就沒了，
   *    使用者只是想往上看一眼，回來卻要重新叫鍵盤。
   *    所以這裡自己判：手指移動 12px 以內、500 毫秒以內才算輕點
   *    （門檻跟長按選單那邊一致，兩者對同一個手勢的認定才不會打架）。
   *
   * ⚠️ 只認「空白」：氣泡、表情鈕、引用塊、任何按鈕與輸入元件都排除。
   *    點氣泡多半是要長按叫選單或看照片，順手把鍵盤收掉會讓畫面白跳一下。
   *
   * ⚠️ 這跟「點送出鈕要留住鍵盤」不衝突：送出鈕是 button，本來就在排除清單裡。 */
  const scTap = $("scroller");
  let tapPt = null, tapAt = 0, tapHadFocus = false;
  scTap.addEventListener("pointerdown", (e) => {
    tapPt = { x: e.clientX, y: e.clientY };
    tapAt = Date.now();
    /* ⚠️ 「當時焦點在不在輸入框」一定要在 pointerdown 記下來，不可以到 pointerup 才問。
          有些瀏覽器（桌機 Chromium 就是）在按下滑鼠的預設行為裡就把焦點移走了，
          等到 pointerup 再問，答案永遠是「不在」，這段程式就等於從來沒執行過。
          （第一版真的寫成那樣，測試一路綠 —— 因為量到的是瀏覽器自己的失焦，
            不是我們的行為。改成數 input.blur() 的呼叫次數之後才紅出來。） */
    tapHadFocus = document.activeElement === input;
  }, { passive: true });
  scTap.addEventListener("pointerup", (e) => {
    const pt = tapPt, had = tapHadFocus;
    tapPt = null; tapHadFocus = false;
    if (!pt || !had) return;
    if (Math.hypot(e.clientX - pt.x, e.clientY - pt.y) > 12) return;   // 在捲動
    if (Date.now() - tapAt > 500) return;                              // 是長按
    if (e.target.closest(".bub, .rx-btn, .rx-chip, .q, button, a, input, textarea, [contenteditable]")) return;
    input.blur();
  }, { passive: true });

  /* --- 貼圖面板 --- */
  $("btnStickers").addEventListener("click", async () => {
    const p = $("stickerPanel");
    p.hidden = !p.hidden;
    if (!p.hidden) {
      await renderStickerGrid();
      const sc = $("scroller");
      sc.scrollTop = sc.scrollHeight;   // 面板展開後把最新訊息推回可視範圍
    }
  });
  // 「收合」在編輯模式下先退出編輯，再按一次才收起面板（給使用者一條明確的退路）
  $("btnCloseStickers").addEventListener("click", () => {
    const grid = $("stickerGrid");
    if (grid.classList.contains("editing")) { grid.classList.remove("editing"); return; }
    $("stickerPanel").hidden = true;
  });
  $("btnAddSticker").addEventListener("click", () => $("fileInput").click());

  /* 閱後即焚的開關（v50）。⚠️ 跟送出鈕同一個理由擋掉預設行為：
        焦點一離開輸入框，手機的螢幕鍵盤就收起來（v44 的教訓）。 */
  $("btnBurn")?.addEventListener("mousedown", (e) => {
    if (document.activeElement === $("msgInput")) e.preventDefault();
  });
  $("btnBurn")?.addEventListener("click", () => Burn.toggle());

  /* 分頁：按哪一頁就畫哪一頁，並且記起來。
     ⚠️「＋ 新增」與「收合」也住在這一列裡，closest('.c-stk-tab') 挑不到它們，
        所以不會被誤判成切換分頁。 */
  $("stkTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".c-stk-tab");
    if (b) renderStickerGrid(b.dataset.k);
  });

  $("fileInput").addEventListener("change", async (e) => {
    const files = [...e.target.files].slice(0, 12);
    e.target.value = "";
    if (!files.length) return;
    toast("處理中…");
    for (const f of files) {
      try { await Stickers.put(await compressImage(f)); }
      catch (err) { console.error(err); toast("有一張圖片讀不到"); }
    }
    // 新增的一定是進「其他」，就直接切過去讓人看到它真的加進來了
    await renderStickerGrid("mine");
    toast(`已加入 ${files.length} 張貼圖`);
  });

  /* --- 一鍵清除：長按 2 秒 --- */
  const wipeBtn = $("btnWipe"), hold = $("wipeHold");
  let holdTimer = null, wipeFired = false;
  const startHold = (e) => {
    e.preventDefault();
    wipeFired = false;
    hold.classList.add("run");
    holdTimer = setTimeout(async () => {
      cancelHold();
      wipeFired = true;                  // 放手時的 click 不要蓋掉成功提示
      if (!S.wipe) { toast("還在連線中，請稍候一下"); return; }
      try { await S.wipe(); } catch (err) { console.error(err); toast("清除失敗"); }
    }, 2000);
  };
  const cancelHold = () => {
    clearTimeout(holdTimer); holdTimer = null;
    hold.classList.remove("run");
    hold.style.transform = "";
  };
  wipeBtn.addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => wipeBtn.addEventListener(ev, cancelHold));
  wipeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (wipeFired) { wipeFired = false; return; }
    toast("按住 2 秒才會清除");
  });

  /* --- 回到最新 --- */
  $("btnJump").addEventListener("click", () => {
    const sc = $("scroller");
    sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
  });

  /* --- 貼上截圖直接送成「照片」 ---
     訊息框是 textarea，貼上文字本來就是純文字，這裡只多攔圖片。
     ⚠️ v20 起貼上是「照片」不是「貼圖」—— 截圖本來就該用照片的規格（保留比例、看得清楚）。
        貼圖是從貼圖面板點出去的那種，小張、會存進你自己的貼圖庫。 */
  input.addEventListener("paste", async (e) => {
    const items = [...(e.clipboardData?.items || [])];
    const imgs = items.filter((it) => it.kind === "file" && it.type.startsWith("image/"))
                      .map((it) => it.getAsFile())
                      .filter(Boolean);
    if (!imgs.length) return;                    // 沒圖片就讓瀏覽器照常貼文字
    e.preventDefault();
    await sendPhotos(imgs);
  });

  /* --- 相簿按鈕 ---
     用一個藏起來的 <input type=file>，按鈕只負責去點它。
     ⚠️ 這是全站唯一的 <input>。它不是文字欄位，沒有自動填入的問題，
        但還是把 lpignore 那幾個屬性補上，讓密碼管理員完全不要理它。 */
  /* --- 「＋」附件選單 --- */
  const plus = $("btnPlus"), plusMenu = $("plusMenu");
  const closePlus = () => {
    if (!plusMenu || plusMenu.hidden) return;
    plusMenu.hidden = true;
    plus?.setAttribute("aria-expanded", "false");
  };
  S.closePlus = closePlus;

  // 影片的上限直接從 config 讀出來寫進選單，不要在 HTML 裡寫死第二份數字
  const vsub = $("plusVideoSub");
  if (vsub) vsub.textContent = `最長 ${CFG.videoMaxSeconds || 30} 秒 · ${CFG.videoMaxUploadMB || 50} MB 以內`;

  plus?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!plusMenu) return;
    const open = plusMenu.hidden;
    plusMenu.hidden = !open;
    plus.setAttribute("aria-expanded", open ? "true" : "false");
  });
  /* 點外面就收。⚠️ 用捕獲階段，否則會被泡泡上那些 stopPropagation 的處理器擋掉。 */
  document.addEventListener("click", (e) => {
    if (plusMenu && !plusMenu.hidden && !plusMenu.contains(e.target) && e.target !== plus) closePlus();
  }, true);

  $("plusPhoto")?.addEventListener("click", () => { closePlus(); $("photoInput")?.click(); });
  $("plusVideo")?.addEventListener("click", () => { closePlus(); $("videoInput")?.click(); });

  $("photoInput")?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";                         // 清掉才能連續選同一張
    if (files.length) await sendPhotos(files);
  });
  $("videoInput")?.addEventListener("change", async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = "";
    if (file) await sendVideo(file);
  });

  bindMsgMenu();
  bindSettings();
  bindNotes();
  bindHeart();
  bindHeartNum();

  /* --- 離開 --- */
  $("btnLeave").addEventListener("click", leaveChat);

  bindRxPicker();
  bindNotice();

  /* --- 氣泡下方的表情小標：點一下取消或換一個 --- */
  $("msgList").addEventListener("click", (e) => {
    const chip = e.target.closest(".rx-chip");
    if (!chip) return;
    e.preventDefault();
    if (!$("msgMenu").hidden) return;        // 選單開著時不要順手改到表情
    toggleRx(chip.dataset.k, chip.dataset.rx);
  });

  /* --- 圖片放大 --- */
  /* ⚠️ 燈箱本來是「點一下就關」。抓失敗的時候改成「點一下＝再試一次」——
        失敗訊息裡就是這樣寫的，兩邊要對得上。 */
  $("lightbox").addEventListener("click", () => {
    const again = S.retryMedia;
    if (again && $("lightbox").classList.contains("expired")) {
      S.retryMedia = null;
      again();
      return;
    }
    closeLightbox();
  });

  /* --- 捲到底就回報已讀（節流，避免每個捲動事件都寫入） --- */
  let readThrottle = null;
  const sc = $("scroller");
  sc.addEventListener("scroll", () => {
    paintJump();
    // 捲到接近頂端就補一次載入。IntersectionObserver 在 iOS 慣性捲動時
    // 有機會整段沒觸發，少了這道就會變成「往上滑但舊訊息不出來」
    if (sc.scrollTop < 240 && S.histUnlocked) S.loadOlder?.();
    if (readThrottle) return;
    readThrottle = setTimeout(() => { readThrottle = null; tryMarkRead(); }, 300);
  }, { passive: true });

  /* --- 下拉載入更早的訊息（v38）---
   *
   * ⚠️⚠️ 為什麼非有這個手勢不可：`.c-scroll` 設了 `overscroll-behavior: contain`，
   *    **捲到頂之後再往下拉不會產生任何捲動事件**；IntersectionObserver 也不會
   *    再觸發一次（sentinel 本來就一直在畫面內，沒有「進入視野」這件事）。
   *    也就是說「人停在頂端」的時候，自動載入的兩道保險是同時失效的 ——
   *    使用者剩下的唯一出路就是畫面上那顆按鈕。那正是他一直回報的狀況：
   *    v37 已經讓「已經是最早」會自己重新確認，但那段程式碼**根本沒被叫到**。
   *
   * ⚠️ 觸控事件本身照樣會發生（被抑制的是捲動，不是事件），所以用 touchmove
   *    自己算下拉距離是可行的，而且不必動 overscroll-behavior
   *    （那個設定是為了不讓整頁跟著晃，動它會賠掉偽裝的穩定度）。
   */
  {
    const PULL_MAX = 80;        // 最多跟手 80px
    const PULL_GO = 52;         // 拉過這個距離放開就載入
    let startY = 0, pulling = false, dist = 0;
    const list = $("msgList");

    /* ⚠️ 這裡「只動位移，不動任何文字」（使用者明講的）。
          那一行永遠維持 paintLoadMore() 決定的內容 ——
          「載入更早的訊息」或「已經是最早的訊息了 · 再檢查一次」。
          下拉只是再去查一次，不是換一個新的介面狀態。 */
    const setPull = (d) => {
      dist = d;
      list.style.transform = d ? `translateY(${d}px)` : "";
    };
    const endPull = () => {
      if (!pulling) return;
      const go = dist >= PULL_GO;
      pulling = false;
      list.style.transition = "transform .18s ease";
      setPull(0);
      setTimeout(() => { list.style.transition = ""; }, 220);
      if (go) pullLoad();
    };

    sc.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1 || $("chat").hidden) { pulling = false; return; }
      pulling = sc.scrollTop <= 0;
      startY = e.touches[0].clientY;
      dist = 0;
    }, { passive: true });

    /* ⚠️ 這一個不可以是 passive —— 要 preventDefault 才不會變成「拉了但畫面在別的地方動」。
          只有「已經在頂端而且往下拉」時才擋，正常捲動完全不受影響。 */
    sc.addEventListener("touchmove", (e) => {
      if (!pulling) return;
      if (sc.scrollTop > 0) { pulling = false; setPull(0); return; }
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { if (dist) setPull(0); return; }
      e.preventDefault();
      setPull(Math.min(PULL_MAX, dy * 0.5));       // 有阻尼，手感才對
    }, { passive: false });

    sc.addEventListener("touchend", endPull, { passive: true });
    sc.addEventListener("touchcancel", endPull, { passive: true });

    /* 桌機沒有下拉這回事 —— 在頂端往上滾滾輪就當成同一個意思 */
    let wheelAt = 0;
    sc.addEventListener("wheel", (e) => {
      if (sc.scrollTop > 0 || e.deltaY >= 0 || $("chat").hidden) return;
      const now = Date.now();
      if (now - wheelAt < 800) return;             // 一次滾動會噴很多事件
      wheelAt = now;
      pullLoad();
    }, { passive: true });
  }

  /* --- 一定按得到的手動載入 --- */
  $("btnLoadOlder")?.addEventListener("click", requestOlder);
  bindPad();

  /* 「已經是最早的訊息了」也能按：查詢剛好碰上網路抽風、回了零筆的時候，
     會被誤判成到頂而且再也不會自己重試。留一條手動重來的路。 */
  $("loadEnd")?.addEventListener("click", () => {
    if (!S.loadOlder) return;
    S.reachedTop = false;
    paintLoadMore();
    S.loadOlder();
  });
}

/* ────────────────────────── 設定面板 ──────────────────────────
 * 全部存在這台裝置的 localStorage：
 *   sc-theme  深淺色      sc-shake  搖晃保護
 *   sc-idle   閒置秒數    sc-watch  未讀提示（每間房各自）
 * 不上雲端，也跟房間無關 —— 換裝置要重設一次，這是刻意的。
 * ───────────────────────────────────────────────────────────── */

function syncSettingsUI() {
  const t = $("setTheme"); if (t) t.checked = Theme.get() === "dark";
  const k = $("setShake"); if (k) k.checked = !!motionHandler;
  const w = $("setWatch"); if (w) w.checked = Watch.has(S.roomId);
  const ty = $("setTyping"); if (ty) ty.checked = Typing.enabled();

  // 搖晃保護整組關掉時，開關就不要出現
  const shakeRow = $("setShake")?.closest(".c-set-row");
  if (shakeRow) shakeRow.hidden = !CFG.panicShake && !CFG.panicFaceDown;

  // 未讀提示：兩種房型都有（v36），只看功能有沒有整個關掉
  const watchRow = $("setWatchRow");
  if (watchRow) watchRow.hidden = !CFG.unreadBell;

  paintAccentPicker();
  paintCacheInfo();
  paintPushRow();
  paintOnlineRow();
  paintNickRow();

  const cur = Idle.get();
  $("setIdle")?.querySelectorAll("button").forEach((b) => {
    b.setAttribute("aria-pressed", Number(b.dataset.v) === cur ? "true" : "false");
  });
}

/* 設定面板的推播那一列。
   ⚠️ 這一列有四種狀態，每一種都要講得出「現在怎樣、下一步該做什麼」：
        沒開       → 可以按
        已開       → 可以關
        被系統擋掉 → 開關按不動，要去系統設定改（說明頁講怎麼改）
        iPhone 沒裝到主畫面 → 開關按不動，要先加到主畫面 */
async function paintPushRow() {
  const row = $("setPushRow");
  if (!row) return;
  /* ⚠️ installable() 這一段不能省，否則 iPhone 的 Safari 分頁永遠看不到這一列，
        也就永遠看不到「要先加到主畫面」的說明。 */
  if (!Push.supported() && !Push.installable()) { row.hidden = true; return; }
  row.hidden = false;

  const box = $("setPush");
  const sub = $("setPushSub");
  const perm = Push.permission();
  const on = await Push.isOn();

  if (box) { box.checked = on; box.disabled = false; }
  row.classList.remove("blocked");

  if (Push.needsInstall()) {
    if (box) { box.checked = false; box.disabled = true; }
    row.classList.add("blocked");
    if (sub) sub.textContent = "iPhone 要先「加入主畫面」，再從那個圖示打開才收得到 · 按「說明」看步驟";
    return;
  }
  if (perm === "denied") {
    if (box) { box.checked = false; box.disabled = true; }
    row.classList.add("blocked");
    if (sub) sub.textContent = "系統已經擋掉通知了 · 按「說明」看怎麼改回來";
    return;
  }
  if (sub) {
    sub.textContent = on
      ? "開啟中 · 你不在房裡時通知你 · 最多每 3 分鐘一次"
      : "關閉中 · 通知內容只有一句固定文字，不會有訊息內容";
  }
}

/* 對方上線通知那一列（v25；v52 起跟新訊息推播完全獨立）。
   ⚠️ v52 之前這一列「附屬」在新訊息推播上：推播沒開就整列淡掉、開關按不動，
      副標寫「要先開啟上面的新訊息推播」。使用者要求拆開，所以現在它自己會走
      完整的開啟流程（加到主畫面 → 問權限 → 訂閱）。
   ⚠️ 但「要權限、要有訂閱」拆不掉 —— 沒有訂閱位址就沒有東西可以送。
      所以這一列的 needsInstall／denied 兩種擋法要跟新訊息那一列**一模一樣**，
      不然 iPhone 使用者會看到一顆按了沒反應的開關。
   ⚠️ 多人房整列不出現（沒有「對方」）。 */
async function paintOnlineRow() {
  const row = $("setOnlineRow");
  if (!row) return;
  if (S.open || (!Push.supported() && !Push.installable())) { row.hidden = true; return; }
  row.hidden = false;

  const box = $("setOnline");
  const sub = $("setOnlineSub");
  const perm = Push.permission();
  const on = await Push.onlineIsOn();

  if (box) { box.checked = on; box.disabled = false; }
  row.classList.remove("blocked");

  /* ⚠️ needsInstall 一定要排在 supported 前面（跟推播那一列同一個理由，坑 #33）。 */
  if (Push.needsInstall()) {
    if (box) { box.checked = false; box.disabled = true; }
    row.classList.add("blocked");
    if (sub) sub.textContent = "iPhone 要先「加入主畫面」，再從那個圖示打開才收得到 · 按「說明」看步驟";
    return;
  }
  if (perm === "denied") {
    if (box) { box.checked = false; box.disabled = true; }
    row.classList.add("blocked");
    if (sub) sub.textContent = "系統已經擋掉通知了 · 按「說明」看怎麼改回來";
    return;
  }
  if (sub) {
    sub.textContent = on
      ? "開啟中 · 最多每 10 分鐘通知你一次"
      : "關閉中 · 對方進入這間房時通知你";
  }
}

function paintPushHelpState() {
  const el = $("pushHelpState");
  if (!el) return;
  const perm = Push.permission();
  /* ⚠️ needsInstall 一定要排在 supported 前面。
        iPhone 的 Safari 分頁裡 supported() 本來就是 false，
        先問 supported 的話會顯示「這個瀏覽器不支援」—— 那是錯的，它裝了就支援。 */
  el.textContent =
    Push.needsInstall()        ? "目前狀態：這是 Safari 分頁，還沒加到主畫面 —— iPhone 一定要裝才收得到。" :
    !Push.supported()          ? "這個瀏覽器不支援推播通知。" :
    perm === "denied"          ? "目前狀態：系統已經擋掉通知了，要自己去設定改回來。" :
    perm === "granted"         ? "目前狀態：系統已經允許通知，開關可以正常使用。" :
                                 "目前狀態：還沒問過你要不要允許通知。";
}

/* 設定面板那一列：「照片暫存 12.4 MB · 8 張」。
   ⚠️ 統計是非同步的，面板可能已經被關掉才回來 —— 元素還在就寫，寫了也不會怎樣。 */
/* 多人房才有個人身分，私人房整列不出現 */
function paintNickRow() {
  const row = $("setNickRow");
  if (!row) return;
  row.hidden = !S.open;
  if (!S.open) return;
  const sub = $("setNickSub");
  if (sub) {
    sub.textContent = S.nick
      ? `${S.nick} · 這台裝置記住了，下次直接進`
      : "還沒登入";
  }
}

async function paintCacheInfo() {
  const el = $("setCacheInfo");
  if (!el) return;
  const { n, bytes } = await Media.stat();
  el.textContent = n
    ? `${fmtBytes(bytes)} · ${n} 張　看過的原圖留在這台裝置，再看就不用重抓`
    : "看過的原圖留在這台裝置，再看就不用重抓";
  const btn = $("btnClearCache");
  if (btn) btn.disabled = !n;
}

/* 真正去開推播，並把每一種失敗都翻成「人看得懂、而且知道下一步」的話。
   ⚠️ v52 起兩個開關共用這一支（which 是 "nm" 或 "on"）——
      兩邊的失敗處理必須一模一樣，不然單獨開上線通知時會少掉
      「iPhone 要先加到主畫面」「系統擋掉了」那兩條出路。 */
async function runPushEnable(which) {
  const r = which === "on" ? await Push.setOnline(true) : await Push.setNewMsg(true);
  await paintPushRow();
  await paintOnlineRow();
  paintPushHelpState();
  if (r === "ok") {
    toast(which === "on"
      ? "對方進來時會通知你（最多每 10 分鐘一次）"
      : "推播已開啟 · 你不在房裡時通知你，最多每 3 分鐘一次", 4200);
    return;
  }
  if (r === "denied") {
    toast("系統擋掉了通知。按「說明」看怎麼改回來", 5000);
    $("pushHelp").hidden = false;
    return;
  }
  if (r === "install") { $("pushHelp").hidden = false; return; }
  if (r === "unsupported") { toast("這個瀏覽器不支援推播通知", 4000); return; }
  toast("開啟失敗，請檢查網路後再試一次", 4000);
}

function paintAccentPicker() {
  const box = $("setAccent");
  if (!box) return;
  const cur = Accent.get().k;
  box.replaceChildren();
  for (const a of ACCENTS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "c-acc" + (a.k === cur ? " on" : "");
    b.dataset.k = a.k;
    b.style.setProperty("--dot", a.c);
    b.setAttribute("aria-label", a.label);
    b.setAttribute("aria-pressed", String(a.k === cur));
    box.appendChild(b);
  }
}

function bindSettings() {
  const panel = $("settingsPanel");

  const openPanel = () => {
    $("stickerPanel").hidden = true;
    Album.close();                 // v60：相簿也是浮層，開設定時要收掉
    syncSettingsUI();
    panel.hidden = false;
  };

  /* --- 推播 --- */
  $("btnPushHelp")?.addEventListener("click", () => {
    paintPushHelpState();
    /* 每次打開都收合，不要留著上次展開的那一項 */
    $("pushAcc")?.querySelectorAll("details").forEach((d) => { d.open = false; });
    $("pushHelp").hidden = false;
  });
  $("pushHelpClose")?.addEventListener("click", () => { $("pushHelp").hidden = true; });

  $("pushKill")?.addEventListener("click", async () => {
    await Push.killAll();
    await paintPushRow();
  await paintOnlineRow();
    paintPushHelpState();
    toast("這台裝置已經完全停用推播");
  });

  /* ⚠️ 用 change 不能用 click —— 要拿得到「使用者想切到哪一邊」。
     而且打開的路徑一定要先跳自己的說明，不可以直接叫系統視窗。 */
  $("setPush")?.addEventListener("change", async (e) => {
    const want = e.target.checked;
    e.target.checked = !want;                 // 先還原，等真的成功再畫
    if (!want) {
      /* ⚠️ setNewMsg(false)，不是 disable()。上線通知還開著的話這裡只改旗標 ——
            整筆刪掉就是 v52 之前那個「關掉新訊息推播會把上線通知一起關掉」的行為。 */
      await Push.setNewMsg(false);
      await paintPushRow();
      await paintOnlineRow();
      toast(S.onlineOn ? "已關閉新訊息推播（上線通知還開著）" : "已關閉這間房的推播");
      return;
    }
    if (Push.needsInstall()) { $("pushHelp").hidden = false; paintPushHelpState(); return; }
    if (Push.permission() === "denied") { $("pushHelp").hidden = false; paintPushHelpState(); return; }
    if (Push.permission() === "granted") { await runPushEnable("nm"); return; }
    S.pushAskFor = "nm";
    $("pushAsk").hidden = false;              // 還沒問過 → 先看說明
  });

  /* 對方上線通知（v25；v52 起跟新訊息推播完全獨立）。
     ⚠️ v52 之前這裡只是「在同一筆訂閱上多插一個旗標」，開之前要求新訊息推播已經開著
        （不然沒有訂閱可以插）。使用者要求拆開，所以現在它走跟上面那顆**完全一樣**
        的四條路：沒裝主畫面／被系統擋掉／已經有權限／還沒問過。
     ⚠️ 「還沒問過」也要先跳自己的說明，不可以直接叫系統視窗 ——
        權限一輩子只問得到一次（坑 #33 那一串），按錯就只能去系統設定救。 */
  $("setOnline")?.addEventListener("change", async (e) => {
    const want = e.target.checked;
    e.target.checked = !want;                 // 先還原，等真的成功再畫
    if (!want) {
      /* ⚠️ setOnline(false)，不是直接寫旗標 —— 新訊息推播也關著的話要把整筆刪掉，
            留一筆兩個都關的訂閱伺服器每則訊息都要多讀一次。 */
      await Push.setOnline(false);
      await paintPushRow();
      await paintOnlineRow();
      toast("已關閉上線通知");
      return;
    }
    if (Push.needsInstall()) { $("pushHelp").hidden = false; paintPushHelpState(); return; }
    if (Push.permission() === "denied") { $("pushHelp").hidden = false; paintPushHelpState(); return; }
    if (Push.permission() === "granted") { await runPushEnable("on"); return; }
    S.pushAskFor = "on";
    $("pushAsk").hidden = false;
  });

  $("pushAskCancel")?.addEventListener("click", () => {
    $("pushAsk").hidden = true;
    S.pushAskFor = null;
  });
  $("pushAskGo")?.addEventListener("click", async () => {
    $("pushAsk").hidden = true;
    /* ⚠️ 要記得是「哪一顆開關」把這個說明叫出來的 —— 忘了的話，
          從上線通知進來的人按下「好」會去開新訊息推播，開錯東西。 */
    const which = S.pushAskFor === "on" ? "on" : "nm";
    S.pushAskFor = null;
    await runPushEnable(which);
  });

  /* v60：相簿 */
  $("btnAlbum")?.addEventListener("click", () => { Album.open(); });
  $("btnCloseAlbum")?.addEventListener("click", () => { Album.close(); });
  $("btnAlbumMore")?.addEventListener("click", () => { Album.more(); });
  /* ⚠️ 點格子 → 走**跟泡泡點照片完全同一條路**（openPhoto）。
        相簿自己再寫一套抓原圖／錯誤處理的話，兩邊的行為遲早會分岔。 */
  $("albumGrid")?.addEventListener("click", (e) => {
    const cell = e.target.closest(".c-alb-cell");
    if (!cell) return;
    const it = Album.items.find((x) => x.k === cell.dataset.k);
    if (it) openPhoto({ k: it.k, body: it.body });
  });

  $("btnClearCache")?.addEventListener("click", async () => {
    await Media.clear();
    await paintCacheInfo();
    toast("照片暫存已清除");
  });

  /* 登出：只抹掉這台裝置記住的身分，雲端的 mem/ 與既有訊息完全不動 ——
     下次進來重打一樣的個人密碼就會接回同一個身分。
     ⚠️ 這不是「刪除身分」。身分刪不掉也不該刪：刪了那些友情計數就變成孤兒。 */
  $("btnForgetNick")?.addEventListener("click", () => {
    if (!S.roomId) return;
    MemberStore.forget(S.roomId);
    NICKS.delete(S.roomId);
    paintNickRow();
    toast("已登出這台裝置，下次進來要打個人密碼");
  });


  $("setAccent")?.addEventListener("click", (e) => {
    const b = e.target.closest(".c-acc");
    if (!b) return;
    Accent.set(b.dataset.k);
    paintAccentPicker();
  });
  $("btnSettings").addEventListener("click", () => {
    if (panel.hidden) openPanel(); else panel.hidden = true;
  });
  $("btnCloseSettings").addEventListener("click", () => { panel.hidden = true; });

  $("setTheme").addEventListener("change", () => {
    Theme.set($("setTheme").checked ? "dark" : "light");
    applyScheme(!$("chat").hidden);
  });

  // ⚠️ iOS 的動作感測授權必須在使用者點擊當下同步發起，所以直接沿用 toggleShake
  $("setShake").addEventListener("change", () => { toggleShake(); setTimeout(syncSettingsUI, 60); });

  $("setWatch").addEventListener("change", () => { toggleWatch(); syncSettingsUI(); });

  $("setTyping").addEventListener("change", () => {
    const on = $("setTyping").checked;
    Typing.set(on);
    if (!on && S.stopTyping) S.stopTyping();   // 關掉就把已經寫上去的清乾淨
    toast(on ? "對方會看到你正在輸入" : "已關閉，對方看不到你在打字");
  });

  $("setIdle").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    Idle.set(b.dataset.v);
    markActive();                      // 換秒數就重新計時，不要立刻上鎖
    syncSettingsUI();
    toast(`閒置 ${b.textContent.trim()} 後上鎖`);
  });

  $("replyCancel").addEventListener("click", () => setReply(null));
}


/* ────────────────────────── 回覆 ────────────────────────── */

/* 引用的摘要跟被引用者的 key 都放在「加密內容」裡，
   雲端只看得到密文，看不出誰在回覆誰。 */
function replySnippet(m) {
  if (!m) return "";
  if (m.kind === "err") return "解不開的訊息";
  if (m.kind === "st") return "貼圖";
  if (m.kind === "ph") return "照片";
  if (m.kind === "vd") return "影片";
  const t = String((m.body && m.body.d) || "").replace(/\s+/g, " ").trim();
  return t.length > 46 ? t.slice(0, 46) + "…" : t;
}

/* 閱後即焚的旗標（v50）。
   ⚠️ 一定要包在會被加密的那一包裡。開成 rooms/<房號>/m/<鍵>/burn 那種明文欄位的話，
      雲端就算看不懂內容，也一眼看得出「這幾則是會自毀的」——
      那等於免費送出一份「哪幾句話比較敏感」的清單。
   ⚠️ 只在私人房、而且那顆鈕亮著的時候加。多人房一律不加。 */
function withBurn(payload) {
  return (Burn.usable() && Burn.on) ? { ...payload, b: 1 } : payload;
}

/* ⚠️ 只存「回覆的是哪一則」，不存內容快照。
   舊版會把被引用訊息的前 46 個字複製一份存進回覆裡，
   結果是：把被引用的那則刪掉之後，它的內容還活在回覆的引用塊裡，
   等於刪不乾淨。現在改成畫面每次自己去找那一則，找不到就顯示「訊息已刪除」。
   （r.p 還留著讀，是為了看得懂改版之前送出的舊訊息。） */
function withReply(payload, reply) {
  if (!reply || !reply.k) return payload;
  return { ...payload, r: { k: reply.k, s: reply.s } };
}

/* 多人房：把暱稱與顏色一起包進「已加密的內容」。
   ⚠️ 刻意不做名冊節點。名冊是明文的，等於在雲端擺一份「這間房有誰」；
      跟著每則訊息走雖然多幾個位元組，但雲端看到的永遠只是密文。
      副作用：同一個人改暱稱時，舊訊息還是顯示舊名字 —— 這是對的，
      那本來就是「他當時說這句話時用的名字」。 */
function withNick(payload) {
  if (!S.open || !S.nick) return payload;
  /* u = 個人身分代號。跟暱稱一樣包在密文裡 ——
     有了它，同一個人在別台裝置上看自己的訊息才會靠右（見 isMine）。
     ⚠️ 不可以搬到明文欄位去，理由同上面那段註解。 */
  const p = { ...payload, n: S.nick, nc: S.nickColor };
  if (S.memberId) p.u = S.memberId;
  return p;
}

/* 引用塊的預覽字：現場去訊息清單裡找，不吃雲端存的快照 */
function paintQuote(el, r) {
  const src = S.msgs.find((x) => x.k === r.k);
  if (src) { el.textContent = replySnippet(src); el.classList.remove("gone"); return; }
  if (r.p) { el.textContent = r.p; el.classList.remove("gone"); return; }  // 舊訊息相容
  if (!S.reachedTop && S.oldestKey && r.k < S.oldestKey) {
    el.textContent = "訊息";                 // 只是還沒往上載入到，不是被刪掉
    el.classList.remove("gone");
    return;
  }
  el.textContent = "訊息已刪除";
  el.classList.add("gone");
}

/* 往上載入更多、或有訊息被刪掉之後，所有引用塊都要重新對一次 */
function refreshQuotes() {
  $("msgList").querySelectorAll(".q").forEach((q) => {
    const sn = q.querySelector(".q-snip");
    const src = S.msgs.find((x) => x.k === q.dataset.to);
    if (!sn) return;
    if (src) { sn.textContent = replySnippet(src); sn.classList.remove("gone"); }
    else if (!sn.classList.contains("gone") && sn.textContent === "訊息" && S.reachedTop) {
      sn.textContent = "訊息已刪除"; sn.classList.add("gone");
    }
  });
}

function setReply(reply) {
  S.replyTo = reply || null;
  const bar = $("replyBar");
  if (!bar) return;
  if (!S.replyTo) { bar.hidden = true; return; }
  $("replyWho").textContent = refIsMine(S.replyTo) ? "回覆你自己" : "回覆對方";
  $("replySnip").textContent = S.replyTo.p || "訊息";
  bar.hidden = false;
}

/* 點引用塊 → 跳到原訊息並閃一下。找不到就老實說，不要靜靜沒反應。 */
function jumpTo(key) {
  const row = $("msgList").querySelector(`.row[data-k="${key}"]`);
  if (!row) { toast("原訊息已經不在這裡了"); return; }
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  row.classList.remove("flash");
  void row.offsetWidth;                    // 強制重排，動畫才會重播
  row.classList.add("flash");
  setTimeout(() => row.classList.remove("flash"), 1300);
}


/* 長按單則訊息 → 複製／刪除。
   ⚠️ 長按一定要通知緊急退出的連點偵測「這不算一次點擊」，
      否則長按兩則訊息就會被判定成連點而彈回偽裝首頁。 */
function bindMsgMenu() {
  const menu = $("msgMenu");
  const list = $("msgList");
  let target = null, timer = null, startPt = null;

  const close = () => { menu.hidden = true; target = null; };

  const open = (row) => {
    target = row;
    const msg = S.msgs.find((x) => x.k === row.dataset.k);
    const sticker = msg && msg.kind === "st";
    const photo = msg && MEDIA_KINDS.includes(msg.kind);
    const broken = msg && msg.kind === "err";
    /* 文字：回覆 / 複製 / 刪除
       貼圖：回覆 / 收藏 / 刪除
       照片：回覆 / 刪除 —— 沒有「收藏」，貼圖庫是拿來放小圖的，
             一張 2048px 的照片塞進去只會把本機空間吃光
       解不開的：只有刪除 */
    $("mmCopy").hidden = !!sticker || !!photo || broken;
    $("mmSave").hidden = !sticker || broken;
    $("mmReply").hidden = !!broken;
    /* 只有文字能設成公告（使用者決定的）。
       ⚠️ 照片／影片／貼圖也讓它出現的話，按下去只會什麼都沒發生 ——
          「按了沒反應」比「這裡沒有這個選項」難懂得多。 */
    /* 只有文字能設成公告（使用者決定的）。
       ⚠️ v50 一度改成「即焚的不給設公告」，但私人房預設就是即焚 ——
          那等於把公告整個功能關掉了。改成**公告跟著來源一起燒**
          （設公告時記下來源鍵，來源被刪就自動下架），兩個功能才都還在。 */
    $("mmNotice").hidden = !(msg && msg.kind === "tx");
    /* 多人房只能刪自己送的。
       ⚠️ 這是介面層的限制，不是資料庫規則擋的 —— 規則看得到的只有匿名 uid，
          而發話者身分是本機隨機產生的 clientId，兩者對不起來。
          也就是說：肯改程式的人繞得過去。私人房本來就是雙方都能刪，不受影響。 */
    $("mmDelete").hidden = S.open && !row.classList.contains("me");
    menu.hidden = false;
    // 先顯示才量得到尺寸，再夾在畫面內
    const r = row.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const pad = 8;

    let left = r.left + r.width / 2 - m.width / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - m.width - pad));

    /* 上緣不能壓到頂部列 —— 壓上去除了難看，還可能誤觸「離開」或「清除」。
       上方放不下就改放訊息下方。 */
    const bar = document.querySelector(".c-bar");
    const topLimit = (bar ? bar.getBoundingClientRect().bottom : 0) + 6;
    const bottomLimit = window.innerHeight - m.height - pad;

    let top = r.top - m.height - 6;
    if (top < topLimit) top = r.bottom + 6;
    top = Math.max(topLimit, Math.min(top, bottomLimit));

    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  };

  list.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".rx-btn, .rx-chip")) return;   // 那兩個有自己的行為，不要當成長按訊息
    const row = e.target.closest(".row");
    if (!row || !row.dataset.k) return;
    startPt = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      suppressNextTap();          // 長按不算點擊
      open(row);
    }, 450);
  });

  const cancel = (e) => {
    // 手指移動超過門檻就是在捲動，不是長按
    if (e && startPt && Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) < 12 && timer === null) return;
    clearTimeout(timer); timer = null;
  };
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => list.addEventListener(ev, cancel));
  list.addEventListener("pointermove", (e) => {
    if (!startPt) return;
    if (Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) > 12) { clearTimeout(timer); timer = null; }
  }, { passive: true });

  // Android Chrome 的長按選單走 contextmenu，要一併擋掉
  list.addEventListener("contextmenu", (e) => e.preventDefault());

  // 點引用塊跳回原訊息（要在長按判定之前處理，所以綁在 click 而不是 pointer）
  list.addEventListener("click", (e) => {
    const q = e.target.closest(".q");
    if (!q || !q.dataset.to) return;
    e.stopPropagation();
    jumpTo(q.dataset.to);
  });

  $("scroller").addEventListener("scroll", close, { passive: true });

  /* 點選單以外的任何地方就關掉。
   *
   * ⚠️ v44 之前這裡還多一句 `&& !e.target.closest(".row")` ——
   *    意思是「點在任何一則訊息上都不關」。但 `.row` 是**整列**（含氣泡兩側的空白），
   *    所以使用者以為自己「點的是旁邊的空白處」，其實點在 .row 上面，選單就一直不消失；
   *    點別則訊息、點別則的表情鈕也一樣關不掉。使用者實際回報的就是這個。
   *
   * ⚠️ 第一下只負責「關掉」，不要順便把底下那顆按鈕按下去 ——
   *    不然點另一張照片會變成「關選單」和「開燈箱」兩件事一起發生。
   *    這是選單／遮罩的通則：第一下是消除，第二下才是操作。
   *    但只吃掉**對話區裡**的那一下；點輸入列照常生效，
   *    不然使用者想接著打字還得多點一次。
   *
   * ⚠️ 順手告訴連點偵測「這一下不算」—— 關選單是介面操作，
   *    不該被算進「連點兩下＝緊急退出」的其中一下。 */
  let swallow = false;
  document.addEventListener("pointerdown", (e) => {
    if (menu.hidden || e.target.closest("#msgMenu")) return;
    close();
    suppressNextTap();
    swallow = !!e.target.closest("#msgList");
    if (swallow) setTimeout(() => { swallow = false; }, 400);
  }, true);
  document.addEventListener("click", (e) => {
    if (!swallow) return;
    swallow = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  $("mmNotice").addEventListener("click", async () => {
    const row = target; close();
    if (!row) return;
    const m = S.msgs.find((x) => x.k === row.dataset.k);
    if (!m || m.kind !== "tx") return;
    const text = String(m.body && m.body.d || "").trim();
    if (!text) return;
    if (!S.setNotice) { toast("還在連線中，請稍候一下"); return; }
    try {
      await S.setNotice(text, row.dataset.k);
      /* ⚠️ 不在這裡自己畫上去 —— 等訂閱把雲端那份送回來再畫。
            自己先畫的話，寫入其實失敗時畫面會顯示一則對方根本看不到的公告。 */
      toast("已設為公告");
    } catch (err) { console.error(err); toast("設定失敗，請檢查網路"); }
  });

  $("mmReply").addEventListener("click", () => {
    const row = target; close();
    if (!row) return;
    const m = S.msgs.find((x) => x.k === row.dataset.k);
    if (!m) return;
    setReply({ k: m.k, s: m.s, p: replySnippet(m) });
    $("msgInput").focus();
  });

  $("mmSave").addEventListener("click", async () => {
    const row = target; close();
    if (!row) return;
    const m = S.msgs.find((x) => x.k === row.dataset.k);
    if (!m || m.kind !== "st") return;
    /* 對方送來的如果就是內建那一張，不要再存一份 ——
       「其他」那一頁會多出一張跟內建長得一模一樣的圖，看了只會困惑。
       ⚠️ 內建圖庫還沒載進來時 isOne() 一律回 false，那就照存：
          為了比對去強拉 600KB 不划算，多一張的代價小得多。 */
    if (Builtin.isOne(m.body.d)) { toast("這張本來就在內建貼圖裡"); return; }
    try {
      await Stickers.put(m.body.d);
      await renderStickerGrid("mine");
      toast("已收藏到你的貼圖庫");
    } catch (err) { console.error(err); toast("收藏失敗"); }
  });

  $("mmCopy").addEventListener("click", async () => {
    const row = target; close();
    if (!row) return;
    const m = S.msgs.find((x) => x.k === row.dataset.k);
    if (!m) return;
    if (m.kind === "st") { toast("貼圖不能複製文字"); return; }
    if (m.kind === "ph") { toast("照片不能複製文字"); return; }
    if (m.kind === "vd") { toast("影片不能複製文字"); return; }
    if (m.kind === "err" || !m.body) { toast("這則訊息解不開，沒有內容可複製"); return; }
    try { await navigator.clipboard.writeText(m.body.d); toast("已複製"); }
    catch (_) { toast("複製失敗，請長按訊息手動選取"); }
  });

  $("mmDelete").addEventListener("click", async () => {
    const row = target; close();
    if (!row) return;
    if (!S.delMsg) { toast("還在連線中，請稍候一下"); return; }
    try { await S.delMsg(row.dataset.k); toast("已刪除，對方也看不到了"); }
    catch (err) { console.error(err); toast("刪除失敗，請檢查網路"); }
  });
}

/* 送出一張貼圖。自己上傳的與內建的走的是**同一條路** ——
   訊息格式沒有為了內建貼圖改過任何東西。 */
async function sendSticker(dataUrl, after) {
  if (!dataUrl) return;
  if (!S.send) { toast("還在連線中，請稍候一下"); return; }
  const r = S.replyTo; setReply(null);
  try {
    await S.send(withNick(withReply(withBurn({ k: "st", d: dataUrl }), r)));
    if (after) after();
    $("stickerPanel").hidden = true;
  } catch (err) { console.error(err); toast("貼圖送出失敗"); }
}

/* 「其他」那一頁的格子：可以刪、長按進入刪除模式 */
function stickerCellMine(it, grid) {
  const cell = document.createElement("div");
  cell.className = "cell";

  const img = document.createElement("img");
  img.src = safeImgSrc(it.dataUrl); img.alt = "貼圖"; img.loading = "lazy";
  cell.appendChild(img);

  const del = document.createElement("button");
  del.className = "del"; del.textContent = "×"; del.type = "button";
  del.addEventListener("click", async (e) => {
    e.stopPropagation();
    await Stickers.del(it.id);
    await renderStickerGrid("mine");
  });
  cell.appendChild(del);

  cell.addEventListener("click", () => {
    if (grid.classList.contains("editing")) return;
    sendSticker(it.dataUrl, () => Stickers.touch(it.id));   // 用過的往前排，下次好找
  });

  let pressTimer;
  cell.addEventListener("pointerdown", () => {
    pressTimer = setTimeout(() => grid.classList.add("editing"), 550);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
    cell.addEventListener(ev, () => clearTimeout(pressTimer))
  );
  return cell;
}

/* 內建那四頁的格子。
   ⚠️ 刻意**沒有** × 、也**沒有**長按進入刪除模式（使用者決定內建不給刪）。
   ⚠️ 也刻意不做「最近用過往前排」：內建的位置固定，手才記得住。 */
function stickerCellFixed(id) {
  const cell = document.createElement("div");
  cell.className = "cell fixed";
  const img = document.createElement("img");
  img.src = safeImgSrc(Builtin.src(id)); img.alt = "貼圖"; img.loading = "lazy";
  cell.appendChild(img);
  cell.addEventListener("click", () => sendSticker(Builtin.src(id)));
  return cell;
}

/* want 沒給的時候用「上次停的那一頁」。 */
async function renderStickerGrid(want) {
  const grid = $("stickerGrid"), tip = $("stkTip"), tabs = $("stkTabs");
  if (!grid) return;
  grid.classList.remove("editing");   // 重畫時一律退出編輯模式，避免卡在刪除狀態出不來

  const items = await Stickers.all();

  /* 第一次打開（本機還沒有記錄）：手上已經有自己的貼圖就停在「其他」——
     那是既有使用者原本的習慣；完全沒有的話停在「喜」，不然開起來是一片空白。
     之後一律照上次那一頁。 */
  let tab = want || StkTab.get();
  if (!STK_TABS.includes(tab)) tab = items.length ? "mine" : "joy";
  StkTab.set(tab);

  const mine = tab === "mine";
  tabs.querySelectorAll(".c-stk-tab").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.k === tab)));
  $("btnAddSticker").hidden = !mine;
  /* ⚠️ 內建那四頁顯示的是**授權要求的出處標示**（CC-BY 4.0），不可以拿掉。
        見 授權-Twemoji.txt。 */
  tip.textContent = mine
    ? "貼圖只存在你自己的裝置，長按可刪除"
    : "內建貼圖 Twemoji · CC-BY 4.0";

  grid.replaceChildren();
  const note = (t) => {
    const p = document.createElement("div");
    p.className = "stk-note";
    p.textContent = t;
    grid.appendChild(p);
  };

  if (mine) {
    if (!items.length) { note("還沒有貼圖，按右上角「＋ 新增」上傳圖片"); return; }
    items.forEach((it) => grid.appendChild(stickerCellMine(it, grid)));
    return;
  }

  /* ⚠️ 面板還收著就**不要**去載內建圖庫 —— 那是 600KB。
        進房時這個函式會被叫一次（重設狀態用），那時候面板是收起來的。 */
  if (!Builtin.tried && $("stickerPanel").hidden) { note("載入中…"); return; }

  if (!Builtin.tried) {
    note("載入中…");
    await Builtin.load();
    /* ⚠️ 載入是非同步的，載完的時候人可能已經切走、或把面板收起來了。
          不再確認一次就重畫，會把使用者當下看的那一頁蓋掉。 */
    if (StkTab.cur !== tab || $("stickerPanel").hidden) return;
    return renderStickerGrid(tab);
  }

  const ids = Builtin.ids(tab);
  if (!ids.length) { note("內建貼圖這次沒載進來，重新整理一次就會回來"); return; }
  ids.forEach((id) => grid.appendChild(stickerCellFixed(id)));
}

function leaveChat() {
  HomeSwitch.lock();
  // 1. 解除這一輪房間的所有訂閱，避免舊房的狀態滲進下一輪
  (S.subs || []).forEach((off) => { try { off(); } catch (_) {} });
  S.subs = [];
  S.gen++;                                   // 雙保險：即使有殘留 callback 也不會再作用

  // 2. 收掉所有浮層
  $("veil").hidden = true;
  $("stickerPanel").hidden = true;
  $("settingsPanel").hidden = true;
  /* ⚠️⚠️ v60：相簿也要收，而且要 reset 不是只藏起來 ——
        留著上一間房的縮圖，下一次打開會先閃出**別間房的照片**。
        （v56 的隱身提示帶就是漏了這一步，回到偽裝首頁還掛著。） */
  Album.close(); Album.reset();
  S.closePlus?.();                 // ⚠️ 「＋」選單也是浮層，漏掉的話回到偽裝首頁它會還開著
  /* ⚠️ 先 flush 再 reset —— 順序反了的話「按了三下就離開」那三下會整組不見。 */
  Heart.flush();
  Heart.reset();
  S.bumpHeart = null;
  setReply(null);
  $("stickerGrid").classList.remove("editing");
  /* 下拉到一半就離開房間的話，位移與提示要收乾淨（v38），
     不然下次進來畫面會整片歪著、或掛著一行「放開就載入」。 */
  const ml = $("msgList");
  if (ml) { ml.style.transform = ""; ml.style.transition = ""; }
  closeLightbox();
  /* ⚠️ 輸入盤裡打到一半的數字不可以跟著進下一間房 —— 那個數字不可逆，
        帶著上一間房的 999 進來按送出是最貴的一種誤觸。 */
  HeartNum.close();
  /* ⚠️ 第二道密碼要整組歸零：關視窗、清掉指紋、把 passed 收回來。
        只關視窗的話，下次進同一間房 passed 還是 true，那一關就被跳過了。 */
  Gate2.reset();
  Gate2Pad.reset(); Gate2Pad.tries = 0;
  /* ⚠️ 植物也要整組收掉：計時器、扇形選單、背景 SVG、回饋橫幅。
        漏掉的話回到偽裝首頁那株植物還會留在畫面上（它在 #chat 裡但 hidden 只藏容器，
        計時器會繼續跑）。 */
  Plant.reset();
  $("padGate").hidden = true;
  HistPad.reset(); HistPad.tries = 0;
  VeilPad.reset(); VeilPad.tries = 0;
  S.histUnlocked = false;          // 退回偽裝首頁就重新上鎖
  clearTimeout(toastTimer);
  $("toast").hidden = true;                  // 中文提示留在偽裝首頁上會直接破功
  $("offlineBar").hidden = true;
  $("msgMenu").hidden = true;
  closeRxPicker();
  $("btnJump").hidden = true;
  S.pending.clear(); S.failed.clear();

  // 3. 清空輸入內容
  const mi = $("msgInput");
  // 先把草稿收進記憶體，下次進同一間房再還原（不落地）
  if (S.roomId) {
    if (mi.value.trim()) DRAFTS.set(S.roomId, mi.value);
    else DRAFTS.delete(S.roomId);
  }
  mi.value = "";                             // 沒送出的草稿不能帶進下一間房
  mi.style.height = "";
  $("btnSend").disabled = true;

  // 4. 清掉指向舊房間的操作與金鑰
  unmaskUrl();
  S.cleanup?.();
  S.send = null; S.wipe = null; S.cleanup = null; S.retryMedia = null; S.wipeMark = null; S.delMsg = null;
  S.loadOlder = null;
  S.ping = null; S.stopTyping = null; S.peerTyping = 0; S.peerOnline = false;
  S.presence = {};
  S.saveOnlineAlert = null; S.onlineOn = false;
  S.marks = []; S.saveMarks = null; S.dropMarks = null;
  S.markRead = null; S.peerReadKey = null; S.lastReadSent = null;
  S.markRecv = null; S.peerRecvKey = null; S.lastRecvSent = null;
  S.setRx = null; S.rx = {};
  /* ⚠️ 公告一定要收乾淨。它是一段中文，留在偽裝首頁上會直接破功 ——
        跟 toast、長按選單同一條規矩。 */
  S.setNotice = null; S.dropNotice = null; S.noticeSrc = null;
  Notice.reset();
  Notes.close();
  $("ntGate").hidden = true;
  NotePad.reset(); NotePad.tries = 0;
  S.notes = []; S.notesUnlocked = false;
  S.saveNote = null; S.delNote = null;
  /* ⚠️ 推播訂閱刻意**不**在離開時清掉 —— 不在房裡才是要收通知的時候。
     要停掉是設定裡那顆開關的事。 */
  S.savePush = null; S.dropPush = null; S.pushOn = false;
  S.saveNewMsgAlert = null; S.pushRec = null; S.pushAskFor = null;
  $("pushHelp").hidden = true;
  $("pushAsk").hidden = true;
  S.onSettle = null; S.entryReadKey = null;
  $("manyUnread").hidden = true;
  $("nickGate").hidden = true;
  $("openBar").hidden = true;
  /* ⚠️ v56：隱身一定要跟著歸零。留著的話下一間房（或下一次正常進房）
        會頂著上一間的隱身狀態 —— 你以為你在留已讀，其實沒有。
     ⚠️ 提示帶要**當場**收掉，不能只靠下次進房的 applyRoomMode 補。
        離房後它停在 hidden=false 是一個看不見的髒狀態（#chat 藏著所以看不出來），
        而還原驗證第 12 條就是被它騙的：遮罩密碼打錯 → onFail → leaveChat，
        提示帶卻還亮著，於是「解鎖之後隱身還在」這條測試在**失敗的路徑上也是綠的**。 */
  S.open = false; S.nick = ""; S.nickColor = "blue"; S.memberId = null; S.stealth = false;
  { const sb = $("stealthBar"); if (sb) sb.hidden = true; }
  document.documentElement.dataset.room = "private";
  S.password = null; S.key = null; S.roomId = null; S.hk = null; S.memberId = null;

  // 5. 還原閒置計時（遮罩時被暫停過，不還原的話閒置退出會永久失效）
  resumeIdle();

  resetList();                               // 內含 S.gen++，讓飛行中的工作全部作廢
  applyScheme(false);                        // 回到偽裝首頁一定要換回 light，否則系統元件是深色會很怪
  $("chat").hidden = true;
  $("gate").hidden = false;
  clearBox($("gateInput"));
  $("gClear").hidden = true;
  $("gDivider").hidden = true;
  $("gateInput").focus();
  maybeReload();
}


/* ────────────────────────── 9. 版面自適應 ──────────────────────────
 * 版面用 position:fixed 固定，不隨網址列或鍵盤改變尺寸。
 * 鍵盤高度另外算成 --kb，只拿來墊高聊天室底部。
 * ────────────────────────────────────────────────────────────── */

function initViewport() {
  const vv = window.visualViewport;
  const root = document.documentElement;

  /* 版面高度 = 「目前實際看得到的高度」。
     鍵盤彈出時這個值會自動變小，輸入列就停在鍵盤正上方；
     body 已經釘死，所以縮短後不會露出空白。 */
  const fit = () => {
    if (!vv) {
      root.style.setProperty("--app-h", window.innerHeight + "px");
      root.style.setProperty("--app-top", "0px");
      return;
    }

    // 雙指放大時 vv.height 也會變小，但那不是鍵盤，不能動版面
    if (vv.scale > 1.05) return;

    // 高度與位置都要對齊「實際看得到的那一塊」，輸入列才會剛好停在鍵盤上緣
    root.style.setProperty("--app-h", Math.round(vv.height) + "px");
    root.style.setProperty("--app-top", Math.round(vv.offsetTop) + "px");

    // iOS 會把整份文件往上推來讓輸入框露出來，這裡強制拉回原位
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  };

  const stickToBottom = () => {
    if ($("chat").hidden) return;
    const sc = $("scroller");
    requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
  };

  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("scroll", fit, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(fit, 300));

  if (vv) {
    vv.addEventListener("resize", () => {
      fit();
      if (vv.scale <= 1.05) stickToBottom();
    });
    vv.addEventListener("scroll", fit);
  }

  // 點輸入框叫出鍵盤後，把最新訊息推回看得到的位置
  $("msgInput").addEventListener("focus", () => {
    setTimeout(() => { fit(); stickToBottom(); }, 300);
    setTimeout(() => { fit(); stickToBottom(); }, 600);   // iOS 鍵盤動畫較慢，補一次
  });
}


/* ────────────────────────── 10. 閒置自動退出 ──────────────────────────
 * 在聊天室內，超過設定秒數沒有任何動作（點擊、滑動、打字、捲動）就退回偽裝首頁。
 * 用「最後活動時間 + 定時檢查」而不是每次事件都重設計時器，滑動時才不會一直重建。
 * ────────────────────────────────────────────────────────────────── */

let lastActive = Date.now();
let idlePaused = false;
let idleTicker = null;

const markActive = () => {
  lastActive = Date.now();
  /* 順便校準「螢幕朝上是哪一邊」—— 使用者碰得到螢幕，螢幕就不是朝下的。
     ⚠️ 這是翻面偵測唯一的基準來源，拿掉的話翻面保護會永遠不啟用。 */
  calibrateFacing();
};
function pauseIdle() { idlePaused = true; }
function resumeIdle() { idlePaused = false; markActive(); }

/* 頂部的倒數數字 */
function paintCountdownTo(id, leftMs) {
  const el = $(id);
  if (!el) return;
  const sec = Math.max(0, Math.ceil(leftMs / 1000));
  // 超過一分鐘改用 分:秒，數字才不會把頂部列撐開
  const txt = sec < 60 ? String(sec)
            : Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  if (el.textContent !== txt) el.textContent = txt;
  el.classList.toggle("warn", !idlePaused && sec <= 5 && sec > 0);
  el.classList.toggle("paused", idlePaused);
}

/* ⚠️ 只畫聊天室那一格。儀表板那一格從 v33 起是「自動更新倒數」，
      不是閒置倒數 —— 儀表板已經沒有閒置自動退出了（使用者的決定：
      那個畫面只有他自己會用，而且掃描要花好幾秒，被踢掉最惱人）。
   ⚠️ 其他保護（Esc、連點、晃動、切 App）在儀表板上**照樣有效**，
      拿掉的只有「時間到自動退出」這一項。 */
function paintCountdown(leftMs, limitMs) {
  paintCountdownTo("idleCount", leftMs, limitMs);
}

// 由 initDisguise 填入，讓閒置計時器也能叫出遮罩
let coverScreen = () => {};

function initIdle() {
  const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "touchmove", "input", "scroll"];
  events.forEach((ev) =>
    document.addEventListener(ev, markActive, { passive: true, capture: true })
  );

  clearInterval(idleTicker);
  idleTicker = setInterval(() => {
    // 每次都重讀設定，改了 idleSeconds 不必重新載入頁面就會生效
    const limit = Idle.get() * 1000;

    const inAdmin = !$("admin").hidden;
    /* 儀表板不做閒置自動退出（v33）。這一格改成「幾秒後自動重查」。 */
    if (inAdmin) { admTick(); return; }
    /* 個人密碼盤／暱稱視窗停在那裡也要算閒置（v29）——
       那個畫面是一整片中文，而且房間金鑰已經在記憶體裡了。
       這一關沒有「蓋遮罩再解鎖」的概念，時間到就直接收回偽裝首頁。 */
    if (keyGateOpen()) {
      const over = (Date.now() - lastActive) >= limit;
      paintCountdown(limit - (Date.now() - lastActive), limit);
      if (over) { closeKeyGates(); leaveChat(); }
      return;
    }
    if ($("chat").hidden && !inAdmin) { markActive(); paintCountdown(limit, limit); return; }

    paintPeerState();                          // 順便讓「正在輸入」過期後自動收掉
    const left = limit - (Date.now() - lastActive);
    paintCountdown(idlePaused ? limit : left, limit);

    if (idlePaused) { markActive(); return; }
    if (left > 0) return;

    // 預設是蓋遮罩（輸入密碼就回到原本的對話，不會中斷）
    if (CFG.idleAction !== "exit" && CFG.blurOnBlur) {
      coverScreen();
      // 萬一遮罩沒能顯示（設定被關掉），退而求其次直接離開，不要讓保護落空
      if ($("veil").hidden) { leaveChat(); toast("閒置太久，已自動退出"); }
    } else {
      leaveChat();
      toast("閒置太久，已自動退出");
    }
  }, 250);   // 250ms 一次，倒數數字才跳得順
}


/* ────────────────────────── 11. 緊急隱藏 ──────────────────────────
 * 三種觸發：快速連點螢幕、劇烈晃動（手機被搶走的瞬間）、螢幕翻面朝下。
 * 晃動與翻面共用同一個感測器；iOS 規定必須由使用者點一次才能啟用。
 * ────────────────────────────────────────────────────────────── */

const HOME_URL = (() => {
  try {
    const fake = CFG.fakeUrl ? new URL(CFG.fakeUrl, location.origin).pathname : null;
    if (fake && location.pathname === fake) return "/";      // 從偽裝網址重整進來
  } catch (_) {}
  return location.pathname + location.search;
})();

function maskUrl() {
  if (!CFG.fakeUrl) return;
  try { history.replaceState(null, "", CFG.fakeUrl); } catch (_) {}
}
function unmaskUrl() {
  if (!CFG.fakeUrl) return;
  try { history.replaceState(null, "", HOME_URL); } catch (_) {}
}

/* 長按叫出訊息選單時，要通知連點偵測「這一次的放手不算點擊」 */
let tapSuppressed = false;
function suppressNextTap() { tapSuppressed = true; }

/* hard = 真的是「手機要被拿走了」的訊號（連點、劇烈晃動、翻面、Esc）。
   這時連未讀提示的房間位址一起清掉，裝置上不留任何指向這個站的東西。
   切換 App 不算 hard —— 那是日常操作，每次切走都清掉的話這個功能等於不能用。 */
/* 個人密碼盤／暱稱視窗這一刻開著嗎。
   ⚠️ 它們是 #chat 外面的頂層元素，但出現的時候房間金鑰已經在記憶體裡、
      畫面上也是一整片中文 —— 只看 $("chat").hidden 的話，緊急退出、Esc、
      閒置上鎖、切 App 在這兩個畫面上全部是空包彈（v29 補上）。 */
function keyGateOpen() {
  /* ⚠️ v54：第二道密碼那一關也要算進來。
        它出現的時候**房間金鑰已經在記憶體裡、畫面上是一整片中文**，
        跟個人密碼盤同一個等級的暴露面。漏掉的話，緊急退出／Esc／閒置／
        連點／晃動翻面／切 App 這六道在那一關全部是空包彈（坑 #75）。 */
  return !!(S.abortMember || S.abortNick || $("g2Gate")?.hidden === false);
}

/* 把那兩關收掉。先關內層（暱稱）再關外層（個人密碼），
   順序反了的話 askMember 的 submit() 會以為只是「暱稱那步取消」而把密碼盤叫回來。 */
function closeKeyGates() {
  if (S.abortNick) { try { S.abortNick(); } catch (_) {} }
  if (S.abortMember) { try { S.abortMember(); } catch (_) {} }
  S.abortNick = null; S.abortMember = null;
  Gate2.close();
}

function panicExit(hard) {
  if (!$("admin").hidden) {                 // 儀表板也要能緊急退出
    /* ⚠️ v34 補上 dropDrafts()：在儀表板上連點／搖晃，威脅模型跟在聊天室裡
       一模一樣（手機要被拿走了），可是 v33 之前只清了未讀提示 ——
       之前在聊天室看過的照片原圖、暱稱、身分全都還留在這台裝置上。
       同一顆 Esc 鍵走的是另一段程式碼，那邊本來就有 dropDrafts()，
       所以這是「兩條路不一致」，不是刻意的設計。 */
    if (hard) { panicClearWatch(); dropDrafts(); }
    leaveAdmin();
    if (hard) leaveSite();
    return;
  }
  if (keyGateOpen()) {
    closeKeyGates();
    if (hard) { panicClearWatch(); dropDrafts(); }
    leaveChat();                            // 把金鑰、假網址、深色宣告一起收乾淨
    if (hard) leaveSite();
    return;
  }
  if ($("chat").hidden) return;
  if (hard) { panicClearWatch(); dropDrafts(); }
  leaveChat();
  if (hard) leaveSite();
}

/* ────────────── 離站（v34）──────────────
 *
 * 硬觸發（連點／搖晃／翻面／Esc）退出之後，再往外跳到一個真的網站。
 * 理由很單純：停在自製的偽裝首頁上，被看到的人會「看著它」——
 * 一個停在搜尋首頁、什麼都沒做的畫面本來就不自然。
 * 跳到一個正在瀏覽中的網站，才像是「他剛剛在看這個」。
 *
 * ⚠️ ① 導頁**不能取代**本機那一段，只能加在它後面。
 *      瀏覽器在新頁面畫出第一幀之前，螢幕上顯示的**還是舊頁面** ——
 *      只導頁不先切的話，聊天室會原封不動留在螢幕上直到新頁畫出來
 *      （實測 1111 的首頁 1.76MB／250 個請求，冷連線的手機大約
 *        0.8～2.5 秒才有第一幀）。緊急退出最重要的就是那一瞬間。
 *      ⚠️ 真正有先後之分的是「leaveSite() 一定要排在 dropDrafts() 後面」——
 *         它靠 dropDrafts() 留下的 S.panicClean 才知道要等什麼。
 *         排到前面去的話 S.panicClean 還是空的，就會立刻導頁，
 *         照片暫存的清除交易當場被砍掉（見 ③）。
 *         至於 leaveChat() 與 leaveSite() 誰先寫，畫面上其實沒有差別：
 *         同一個同步區段裡瀏覽器不會插進來重繪，location.replace 也不會
 *         當場卸載文件。仍然把 leaveSite() 寫在最後，是為了讓
 *         「本機先乾淨、再談離站」這件事在程式碼上一眼看得出來。
 *
 * ⚠️ ② 沒網路不跳。離線導頁會落在瀏覽器的「無法連上這個網站」錯誤頁：
 *      那比偽裝首頁可疑得多，而且回不去（網址已經換掉了）。
 *      本機那一段照樣做完 —— 安全性一點都沒少，少的只有「跳」。
 *
 * ⚠️ ③ 要等 dropDrafts() 那筆 IndexedDB 清除交易做完才能走。
 *      導頁會直接中止還沒 commit 的交易，看過的照片原圖就留在硬碟上了 ——
 *      那正是緊急退出最該抹掉的東西。但也不能無限等，
 *      等不到就照樣走（CLEAN_WAIT_MS）。
 *
 * ⚠️ ④ 用 replace 不用 assign：留下一筆歷史紀錄的話，
 *      按上一頁就會回到這個站。
 */
const CLEAN_WAIT_MS = 350;

function panicTarget(fallback) {
  const raw = String(CFG.panicUrl || "").trim();
  if (raw) {
    /* 只接受 http(s)。這個值會直接餵給 location，而且設定檔是純文字，
       手改時很容易貼進一個不是網址的東西。
       ⚠️ 別以為瀏覽器都會擋：javascript: 它確實會擋，但**同源的 blob:
          它是允許整頁導覽的** —— 沒有這一行就真的會導過去。 */
    try {
      const u = new URL(raw, location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (_) {}
  }
  return fallback || "";
}

function leaveSite(fallback) {
  const url = panicTarget(fallback);
  if (!url) return false;
  if (navigator.onLine === false) return false;   // ⚠️ 只有明確離線才不跳；undefined 當作有網路

  const go = () => {
    try { location.replace(url); } catch (_) { location.href = url; }
  };

  const p = S.panicClean;
  S.panicClean = null;
  if (p && typeof p.then === "function") {
    let done = false;
    const once = () => { if (done) return; done = true; go(); };
    p.then(once, once);
    setTimeout(once, CLEAN_WAIT_MS);
  } else {
    go();
  }
  return true;
}

/* 預熱：緊急退出的那一刻才開始查 DNS、握手 TLS 的話，手機網路上那一段
   本身就要好幾百毫秒。進房的時候先做掉。
   ⚠️ 只放 origin，不放完整網址 —— preconnect 帶路徑沒有意義。
   ⚠️ 不加 crossorigin：待會兒是「整頁導覽」不是 CORS 請求，
      加了反而預熱到另一條用不到的連線上。
   ⚠️ DNS 那一份才是真正穩的（快取以分鐘計）；TCP/TLS 那一條閒置十秒左右
      就會被回收，只有「進房沒多久就緊急退出」才吃得到。不無小補，成本是零。
   ⚠️ 放在進房才做，不放在開站就做：偽裝首頁上不該有指向別站的連線。 */
let warmed = false;
function warmPanicUrl() {
  if (warmed) return;
  const url = panicTarget();
  if (!url) return;
  let origin = "";
  try { origin = new URL(url).origin; } catch (_) { return; }
  if (!origin || origin === location.origin) return;
  warmed = true;
  ["dns-prefetch", "preconnect"].forEach((rel) => {
    const l = document.createElement("link");
    l.rel = rel;
    l.href = origin;
    document.head.appendChild(l);
  });
}

/* 緊急退出時要不要順便把「未讀提示（鈴鐺）」的清單也清掉（v36）。
 *
 * ⚠️ v36 之前是「一律清掉」，而且**只有連點／搖晃／翻面會清，Esc 不會** ——
 *    兩條路不一致。使用者的實際感受是「私人房的鈴鐺三不五時就被關掉」，
 *    因為連點本來就是他最常用的退出方式（v34 之後更是，那是跳去 1111 的入口）。
 *
 * ⚠️ 這裡的權衡要看清楚：鈴鐺**本來就**需要把房間位址長期存在這台裝置上才能運作 ——
 *    平常那幾組位址一直都在。所以清不清的真正差別，只有「被搶走的那一刻要不要抹掉」。
 *    拿到位址的人解不開任何內容（金鑰是密碼推導的，不在裝置上），
 *    但規則允許已登入的人寫入，所以他可以把那間房的對話弄不見。
 *
 * 使用者選的是「全都不清，鈴鐺永遠留著」。留下這個開關是為了隨時改得回去。 */
function panicClearWatch() {
  if (CFG.panicClearWatch === true) Watch.clear();
}

/* 緊急退出時把沒送出的字整份丟掉 —— 那是「手機被拿走」的情境，草稿留著等於留證據。
   ⚠️ 切 App／鎖螢幕不算緊急（那是 panicExit(false)），草稿要留著，
      不然「打到一半鎖螢幕，回來字不見了」的問題就白修了。 */
function dropDrafts() {
  DRAFTS.clear();
  /* v61：跳去 LINE 之前加密暫存的那一筆（正常情況下回來就刪了，這是保險）。
     ⚠️ LINE 身分本身**預設不登出** —— 登出的話下次進房要再跳一次 LINE 頁。
        config.js 的 panicSignOut 打開才會順手登出（代價：多一次 LINE 往返）。 */
  dropAclStash();
  if (CFG.panicSignOut && S.fb && S.fb.authMod) {
    try { S.fb.authMod.signOut(S.fb.auth).catch(() => {}); } catch (_) {}
  }
  /* 緊急退出＝「手機被搶走了」。
     多人房的暱稱、以及看過的照片原圖暫存，全部一起清掉。
     ⚠️ Media.clear() 是非同步的，這裡「不 await」—— 畫面要立刻切掉，
        不能為了等硬碟而多停一幀。
     ⚠️ 但也不能就這樣丟著不管：v34 開始退出之後還會導頁，
        而導頁會直接中止還沒 commit 的 IndexedDB 交易 —— 照片原圖就留在
        硬碟上了。所以把這個 Promise 交給 S.panicClean，
        由 leaveSite() 在導頁前等它（最多 CLEAN_WAIT_MS）。 */
  NICKS.clear();
  MemberStore.clearAll();    // ⚠️ 身分也在硬碟上（加密），緊急退出要一起抹掉
  /* ⚠️ 「上次讀到哪」內含時間戳，一樣要抹 —— 但有開鈴鐺的房間要留（v36）：
        多人房的未讀就是拿它算的，抹掉的話首頁的鈴鐺會永遠亮著假紅點。 */
  ReadMark.clearAll(Watch.list());
  Heart.clearAll();          // ⚠️ 鍵名「就是」房間位址，不清＝把半把鑰匙留在被搶走的手機上
  /* 位置回報（v41）：大頭針的狀態與計時器、記憶體裡解開的私鑰、畫面上的座標，全部收掉。
     ⚠️ 這裡沒有「本機的位置金鑰」要清 —— 私鑰是每次進儀表板用 admin 密碼現解的，
        硬碟上不留任何跟位置有關的鑰匙。這也是為什麼換裝置不用做任何設定。
     ⚠️ 節流時間戳是這台裝置留下的痕跡，一起清（坑 #105）。 */
  Loc.reset();
  LocAdm.reset();
  LocPush.reset();
  try { localStorage.removeItem(LOC_LAST); } catch (_) {}
  /* ⚠️ sc-loc-seen 刻意「不清」—— 跟 v36 鈴鐺的清單同一條規矩。
        清掉的話回到偽裝首頁，鈴鐺會亮一顆永遠消不掉的假紅點。 */
  S.panicClean = Media.clear();
  S.notesUnlocked = false;
  const mi = $("msgInput");
  if (mi) mi.value = "";
}

/* ────────────── 搖晃與翻面保護（v30 改寫）──────────────
 *
 * 舊版有兩個「看起來合理、實際上會一直誤判」的假設：
 *
 * ⚠️ ① 翻面：寫死「accelerationIncludingGravity.z 小於 -7.5 就是螢幕朝下」。
 *      但這個值的**正負方向不是跨平台一致的** —— iOS Safari 回報的符號
 *      跟規格（以及 Android Chrome）相反。寫死一邊的後果，在另一邊就是
 *      「手機平放在桌上、螢幕朝上」被判成翻面：一放下去就退出，而且會一直退。
 *      → 改成不假設符號，自己量：使用者手指碰到螢幕的那一刻，
 *        螢幕一定是朝著他的，把那一刻的 z 記下來當基準。
 *      → 量到基準之前，翻面偵測**不啟用**。寧可暫時沒保護，
 *        也不要誤把人踢出去 —— 誤退的代價是「打到一半的字沒了、位置也沒了」，
 *        而且會讓人乾脆把整個保護關掉，那才是真正的損失。
 *
 * ⚠️ ② 搖晃：用「單一一筆超過門檻」判定。
 *      但**把手機放到桌上的那一下撞擊**也會衝到 20～40，跟用力甩一樣高。
 *      差別不在高度，在形狀：撞擊是一個尖峰，搖晃是反覆來回。
 *      → 改成「一秒內至少三次越過門檻」，而且要掉回低點才重新計次
 *        （不然 60Hz 取樣下，一個尖峰會被算成好幾次）。
 * ─────────────────────────────────────────────────────── */

let motionHandler = null;
let faceDownSince = 0;
let faceUpSign = 0;      // +1 / -1：這台裝置「螢幕朝上」時 z 是哪個方向。0 = 還沒量到
let lastZ = 0;
let lastZAt = 0;
let shakeHits = [];      // 最近幾次越過門檻的時間
let shakeArmed = true;   // 掉回低點才重新武裝

/* 使用者碰到螢幕的那一刻校準一次。
   ⚠️ 只在「手機夠平」的時候才採信（|z| > 5）—— 手機立著的時候 z 接近 0，
      那一刻的正負只是雜訊。
   ⚠️ 也要求那筆讀數是新鮮的：偽裝首頁上感測器沒在跑，
      拿一筆幾分鐘前的舊值來校準會校到完全錯的方向。 */
function calibrateFacing() {
  if (!motionHandler) return;
  if (Date.now() - lastZAt > 1500) return;
  if (Math.abs(lastZ) < 5) return;
  faceUpSign = lastZ > 0 ? 1 : -1;
}

function startMotion() {
  if (motionHandler) return;
  /* ⚠️ 每次開始都重新校準（不寫進 localStorage）。
        存起來的話，萬一某次躺在床上把手機舉在臉上方校準到反的，
        那個錯誤會一直跟著這台裝置。每次重來的代價只是
        「進房後要碰一下螢幕，翻面保護才開始作用」—— 而你本來就會碰。 */
  faceDownSince = 0; faceUpSign = 0; lastZ = 0; lastZAt = 0;
  shakeHits = []; shakeArmed = true;

  motionHandler = (e) => {
    /* 個人密碼盤／暱稱視窗開著時也要算「在房裡」（v29）——
       那個畫面是一整片中文，而且房間金鑰已經在記憶體裡了。 */
    if ($("chat").hidden && !keyGateOpen()) { faceDownSince = 0; return; }

    // 劇烈晃動（acceleration 已扣掉重力，靜置時接近 0）
    if (CFG.panicShake && e.acceleration) {
      const a = e.acceleration;
      const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      const th = Number(CFG.shakeThreshold) || 22;
      if (mag > th) {
        if (shakeArmed) {
          shakeArmed = false;
          const now = Date.now();
          shakeHits = shakeHits.filter((t) => now - t < 1000);
          shakeHits.push(now);
          if (shakeHits.length >= 3) { shakeHits = []; panicExit(true); return; }
        }
      } else if (mag < th * 0.4) {
        shakeArmed = true;
      }
    }

    const g = e.accelerationIncludingGravity;
    if (!g || typeof g.z !== "number") return;
    lastZ = g.z; lastZAt = Date.now();

    /* 螢幕朝下 = 跟「朝上」相反的方向、而且夠平，持續 0.7 秒才算數
       （避免翻轉途中、或走路晃到的瞬間就被判定）。 */
    if (CFG.panicFaceDown && faceUpSign !== 0) {
      const down = (g.z * faceUpSign) < -7.5;
      if (down) {
        if (!faceDownSince) faceDownSince = Date.now();
        else if (Date.now() - faceDownSince > 700) { faceDownSince = 0; panicExit(true); }
      } else {
        faceDownSince = 0;
      }
    }
  };

  window.addEventListener("devicemotion", motionHandler);
  syncShakeUI();
}

function stopMotion() {
  if (!motionHandler) return;
  window.removeEventListener("devicemotion", motionHandler);
  motionHandler = null;
  faceDownSince = 0; faceUpSign = 0; lastZAt = 0;
  shakeHits = []; shakeArmed = true;
  syncShakeUI();
}

/* 開關已經搬進設定面板，這裡只負責把面板的狀態同步回來 */
function syncShakeUI() { syncSettingsUI(); }

const iosNeedsMotionPermission = () =>
  typeof DeviceMotionEvent !== "undefined" &&
  typeof DeviceMotionEvent.requestPermission === "function";

/* 頂部開關：點一下切換。iOS 第一次會跳出系統授權視窗。 */
function toggleShake() {
  if (motionHandler) {
    stopMotion();
    localStorage.setItem("sc-shake", "off");
    toast("已關閉搖晃與翻面保護");
    return;
  }

  if (!iosNeedsMotionPermission()) {
    startMotion();
    localStorage.setItem("sc-shake", "on");
    toast("已開啟搖晃與翻面保護");
    return;
  }

  // ⚠️ requestPermission 必須在使用者點擊當下同步發起，不能先 await 別的東西
  DeviceMotionEvent.requestPermission()
    .then((r) => {
      if (r === "granted") {
        startMotion();
        localStorage.setItem("sc-shake", "on");
        toast("已開啟搖晃與翻面保護");
      } else {
        toast("未授權，搖晃保護沒有開啟");
      }
    })
    .catch(() => toast("這台裝置不支援動作感測"));
}

/* 進房時依上次的選擇自動恢復 */
function restoreShake() {
  if (!CFG.panicShake && !CFG.panicFaceDown) { syncSettingsUI(); return; }
  if (localStorage.getItem("sc-shake") === "off") { syncShakeUI(); return; }
  // Android 不需授權可直接開；iOS 一定要使用者親自點一下，這裡只更新外觀
  if (!iosNeedsMotionPermission()) startMotion();
  else syncShakeUI();
}

function initPanic() {
  /* 在畫面「任何位置」連點就緊急退出。
     只有兩種情況不算：
       1) 滑動（捲動訊息時每次滑都會產生一次觸碰，不能當成連點）
       2) 打字（訊息輸入框、密碼輸入框內）
     另外要求兩次觸碰落在相近位置 —— 這才是「連點」的意思，
     也讓「點貼圖鈕再點一張貼圖」這類跨位置的正常操作不會誤觸。 */
  const need = Number(CFG.panicTaps) || 0;
  if (need >= 2) {
    const win = Number(CFG.panicTapWindowMs) || 500;
    const radius = Number(CFG.panicTapRadius) || 44;
    let taps = [];
    let down = null, moved = false;
    tapSuppressed = false;

    document.addEventListener("pointerdown", (e) => {
      down = { x: e.clientX, y: e.clientY, at: Date.now() };
      moved = false;
    }, true);

    document.addEventListener("pointermove", (e) => {
      if (!down) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) moved = true;
    }, true);

    document.addEventListener("pointerup", (e) => {
      const start = down;
      down = null;
      if (!start || moved) return;                 // 滑動不算
      if ($("chat").hidden && $("admin").hidden && !keyGateOpen()) return;

      /* 不列入計數的地方：
         輸入框（打字）、功能按鈕與貼圖格（連續送兩則訊息、連送兩張貼圖都是
         日常操作，兩下就退出的話根本沒辦法用）。
         其餘所有位置 —— 訊息區、氣泡、標題列、面板空白處 —— 都算數。 */
      /* ⚠️ .nt-item 也要排除：記事清單是拿來點的，
         連點兩則記事叫出編輯會被誤判成緊急退出手勢。 */
      if (e.target.closest("[contenteditable], textarea, input, button, a, .cell, .nt-item")) return;

      /* 長按不是點擊。少了這兩道，長按兩則訊息叫選單就會被誤判成連點而彈回首頁。 */
      if (tapSuppressed) { tapSuppressed = false; taps = []; return; }
      if (start.at && Date.now() - start.at > 400) { taps = []; return; }

      const now = Date.now();
      taps = taps.filter((p) => now - p.t < win && Math.hypot(p.x - e.clientX, p.y - e.clientY) < radius);
      taps.push({ t: now, x: e.clientX, y: e.clientY });

      if (taps.length >= need) { taps = []; panicExit(true); }
    }, true);
  }

}


/* ────────────────────────── 11.5 未讀提示 ────────────────────────── */

function syncWatchUI() { syncSettingsUI(); }

function toggleWatch() {
  if (!S.roomId) return;
  if (Watch.has(S.roomId)) {
    Watch.remove(S.roomId);
    toast("已關閉未讀提示，房間位址也從這台裝置移除了");
  } else {
    Watch.add(S.roomId);
    toast("已開啟未讀提示：回首頁點鈴鐺就看得到");
  }
  syncWatchUI();
}

/* 點鈴鐺才查。查不到、沒開、連線失敗 —— 一律安靜地什麼都不做，
   偽裝首頁上絕對不能冒出中文提示或錯誤訊息。 */
let bellBusy = false;

async function checkUnread() {
  const dot = $("gBellDot");
  if (!dot || bellBusy) return;

  const rooms = Watch.list();
  /* ⚠️ v42 起「沒有任何房間在監看」也可能有事要查 —— 位置回報是獨立的一條。
        還照舊直接 return 的話，只開位置回報的人永遠不會看到紅點。
     ⚠️ 但這裡只能看 LocSeen.has()（這台裝置進過儀表板），**不可以看 Loc.on()** ——
        後者是 config 的開關，對所有訪客都成立。看它的話，任何人打開偽裝首頁
        按一下鈴鐺就會連上 Firebase，「沒開提示的裝置點鈴鐺不會連線」這個
        隱私前提就破了（test-bell 守著它，我第一版就是這樣踩到的）。 */
  if (!rooms.length && !LocSeen.has()) return;   // 兩條都沒有 → 跟真的 Google 一樣沒事發生

  bellBusy = true;
  try {
    const f = await connect();
    const { db, ref, get, query, orderByKey, limitToLast, onValue } = f;
    const cid = myClientId();

    /* 過期自動清理預設是關的（roomTtlHours: 0），改用儀表板手動清空。
       只有把它設成大於 0 才會啟用；免費方案沒有排程可用，
       清理只能靠「有人連上來」時順手做，所以點鈴鐺時也一併清一次，
       否則沒人進去的冷門房間就永遠清不到。 */
    const offset = await serverOffset(f);
    const cutoff = CFG.roomTtlHours > 0
      ? Date.now() + offset - CFG.roomTtlHours * 3600 * 1000
      : 0;

    const flags = await Promise.all(rooms.map(async (rid) => {
      try {
        if (cutoff) await pruneStale(f, `rooms/${rid}/m`, cutoff);   // 先清，再算未讀

        const [newestSnap, readSnap] = await Promise.all([
          get(query(ref(db, `rooms/${rid}/m`), orderByKey(), limitToLast(1))),
          get(ref(db, `rooms/${rid}/read/${cid}`)),
        ]);
        let newest = null;
        newestSnap.forEach((c) => { newest = c.key; });   // 只取鍵，密文完全不解、不留
        if (!newest) return false;

        /* 「我讀到哪」有兩個來源，取比較新的那一個（v36）：
             雲端 read/<裝置>  —— 私人房才有（已讀回條）。跨裝置準。
             本機 sc-r-<房號>  —— 多人房用的，tryMarkRead 一直有在寫。
           ⚠️ 訊息鍵是 push key，字典序就是時間序，所以直接比大小就好。
           ⚠️ 兩個都沒有＝這台裝置從來沒讀過這間房 → 當作有未讀。 */
        const server = readSnap.val();
        const local = ReadMark.load(rid);
        const mine = [server, local]
          .filter((x) => typeof x === "string" && x)
          .sort()
          .pop();
        return mine ? newest > mine : true;
      } catch (_) { return false; }
    }));

    /* 顯示「幾間房有新訊息」，不顯示是哪一間 ——
       真的 Google 通知徽章本來就會顯示數字，所以偽裝不吃虧。 */
    /* 位置回報也算一則（v42）。
       ⚠️ 跟房間的未讀合起來算 —— 使用者要的是「有沒有東西要看」，
          不是「哪一種東西」。真的 Google 的徽章本來也只給一個數字。 */
    let n = flags.filter(Boolean).length;
    if (await LocSeen.unread(f)) n++;

    dot.textContent = n > 1 ? String(n) : "";
    dot.classList.toggle("num", n > 1);
    dot.hidden = n === 0;
  } catch (_) {
    // 連不上就維持原狀，不要在偽裝頁上留下任何痕跡
  } finally {
    bellBusy = false;
  }
}

function initBell() {
  /* ⚠️ v36 起不再要求 showReadReceipt —— 未讀有本機那一份可以算（見 checkUnread）。
        以前綁在一起的後果是：把已讀回條關掉，鈴鐺清單會在下次開站時被整份刪掉。 */
  if (!CFG.unreadBell) { Watch.clear(); return; }
  const bell = $("gBell");
  if (bell) bell.addEventListener("click", checkUnread);
}


/* ────────────────────────── 11.9 系統配色宣告 ──────────────────────────
 * iOS Safari 那條「鍵盤上方的白色輸入輔助列」（顯示網域＋上下箭頭＋打勾）
 * 是 Safari 自己畫的系統元件，CSS 動不到、也沒有 API 可以移除。
 * 但它的配色會跟著頁面宣告的 color-scheme 走 —— 所以宣告對了就會變深色。
 *
 *   偽裝首頁  → light      （要跟真的 Google 一樣是白的，深色反而破功）
 *   聊天室    → light dark （跟隨系統：深色模式下那條橫條就變深色）
 *
 * 順手也換 theme-color，讓 Safari 的網址列底色跟著畫面走，不會閃一塊白。
 * ─────────────────────────────────────────────────────────────────── */

const THEME = { gate: "#ffffff", light: "#ffffff", dark: "#0f1115" };

/* 深淺色由使用者自己決定，不跟隨系統。預設深色（寫在 index.html 的 <html data-theme>，
   所以載入時不會先閃一下淺色）。切過之後記在 localStorage。
   這一筆殘留完全無害 —— 看不出跟聊天有任何關係。 */
/* 使用者在設定面板調的閒置秒數，覆寫 config.js 的預設值。
   夾在 5～600 秒之間，避免手動改 localStorage 把保護整個關掉。 */
const Idle = {
  KEY: "sc-idle",
  CHOICES: [10, 15, 30, 60, 180],
  get() {
    const v = Number(localStorage.getItem(this.KEY));
    if (Number.isFinite(v) && v >= 5 && v <= 600) return v;
    return Math.max(1, Number(CFG.idleSeconds) || 15);
  },
  set(v) { localStorage.setItem(this.KEY, String(Math.min(600, Math.max(5, Number(v) || 15)))); },
};

/* 正在輸入指示。
   ⚠️ 這是「即時廣播你的活動狀態」，比已讀更敏感（已讀是事後、這個是當下）。
   所以做成可以關，而且只寫一個時間戳、不寫任何內容。 */
/* 氣泡配色。只改本機的顯示，對方看到的還是他自己選的那組。
   存 localStorage，跟深淺色、閒置秒數同一類設定。 */
const ACCENTS = [
  { k: "blue",   c: "#1a73e8", d: "#2b6cd4", label: "藍" },
  { k: "indigo", c: "#4f46e5", d: "#5b52e8", label: "靛" },
  { k: "teal",   c: "#0f8f7e", d: "#12a08d", label: "青" },
  { k: "green",  c: "#2e7d32", d: "#37913c", label: "綠" },
  { k: "amber",  c: "#c76a12", d: "#d2791f", label: "橘" },
  { k: "rose",   c: "#c2185b", d: "#d32b6c", label: "粉" },
];

const Accent = {
  KEY: "sc-accent",
  get() {
    const v = localStorage.getItem(this.KEY);
    return ACCENTS.find((a) => a.k === v) || ACCENTS[0];
  },
  set(k) {
    if (k === ACCENTS[0].k) localStorage.removeItem(this.KEY);
    else localStorage.setItem(this.KEY, k);
    this.apply();
  },
  apply() {
    /* 多人房裡，自己的泡泡要用「進房時挑的那個顏色」，不是設定裡的偏好色 ——
       不然別人看到你是綠色、你自己看到藍色，對不起來。 */
    const key = (S.open && S.nick) ? S.nickColor : this.get().k;
    const a = ACCENTS.find((x) => x.k === key) || ACCENTS[0];
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.style.setProperty("--me-accent", dark ? a.d : a.c);
  },
};

const Typing = {
  KEY: "sc-typing",
  enabled() { return localStorage.getItem(this.KEY) !== "off"; },
  set(on) { localStorage.setItem(this.KEY, on ? "on" : "off"); },
};

const Theme = {
  KEY: "sc-theme",
  get() { return localStorage.getItem(this.KEY) === "light" ? "light" : "dark"; },
  set(v) { localStorage.setItem(this.KEY, v === "light" ? "light" : "dark"); },
  toggle() { const v = this.get() === "dark" ? "light" : "dark"; this.set(v); return v; },
};

function applyScheme(inChat) {
  const theme = Theme.get();
  document.documentElement.dataset.theme = theme;
  Accent.apply();                     // 深淺色用不同明度，切換後要重算

  /* 偽裝首頁一律宣告 light —— 它本來就是白的，宣告深色會讓 Safari 的系統元件
     （鍵盤上方那條輸入輔助列）變深，配上白色 Google 頁反而破功。
     聊天室則宣告成使用者選的那個，那條輔助列就會跟著走。 */
  const declared = inChat ? theme : "light";
  document.documentElement.style.colorScheme = declared;

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute("content", declared);

  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute("content", inChat ? THEME[theme] : THEME.gate);

  syncThemeUI();
}

function syncThemeUI() { syncSettingsUI(); }

function toggleTheme() {
  Theme.toggle();
  applyScheme(!$("chat").hidden);
}


/* Service Worker：讓加到主畫面的圖示點下去瞬間就出現偽裝首頁，沒網路也開得起來。
   採網路優先策略，所以不會有「改了沒生效」的問題（細節見 sw.js）。
   註冊失敗完全不影響功能，靜靜跳過就好。 */
function initServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => {
    /* 新版本上線之後，這個分頁裡跑的還是舊的那一份 JS —— 一定要重新整理才會換。
       偽裝首頁的用法是「退出去、再輸入密碼進來」，整個過程都不會重新載入頁面，
       所以一個分頁可能連續好幾天都在跑舊版。這裡自動補上那一次重整。 */
    /* ⚠️ 只有「本來就有人在管、又換人」才算真的有新版上線（v37）。
       第一次載入時這個分頁是「沒有 controller」的：Service Worker 裝好之後
       clients.claim() 會接手，那也會觸發 controllerchange ——
       但那時候 SW 跟頁面根本是同一版，重整純粹是白做一次。
       而且那一次重整的時機完全看安裝快慢，會落在「剛進房」或
       「剛退回偽裝首頁」的任何一刻，看起來就像畫面自己閃了一下。
       （測試裡的症狀更難認：掛在頁面上的測試變數被清掉，
         錯誤訊息會變成「某某不是函式」，跟被測的功能毫無關係。） */
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; }   // 第一次接手，不是換版
      S.needsReload = true;
      maybeReload();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) navigator.serviceWorker.getRegistration()
        .then((r) => r?.update()).catch(() => {});
    });

    navigator.serviceWorker.register("sw.js").then((reg) => {
      // 有新版本待命就立刻叫它上工，不要等所有分頁關掉
      if (reg.waiting) reg.waiting.postMessage("skip-waiting");
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            sw.postMessage("skip-waiting");
          }
        });
      });
    }).catch(() => {});
  });
}


/* ────────────────────────── 12. 偽裝機制 ────────────────────────── */

/* 只在「人不在聊天室也不在儀表板」的時候重整 —— 正在看訊息時把人踢回首頁太粗暴 */
function maybeReload() {
  if (!S.needsReload) return;
  if (Acl.busy || window.__sq) return;
  if (!$("chat").hidden || !$("admin").hidden) return;
  location.reload();
}

function initDisguise() {
  document.title = CFG.disguiseTitle;
  const veil = $("veil");

  /* 只是視窗失焦（點到別的視窗）→ 蓋毛玻璃，解除要重新輸入密碼 */
  const cover = () => {
    if (!CFG.blurOnBlur || $("chat").hidden || !veil.hidden) return;
    VeilPad.reset();
    Notes.flush();                       // 遮罩蓋上前先把還沒存的記事存掉
    closeLightbox();                     // 放大中的圖片也要一起收掉
    veil.hidden = false;
    pauseIdle();                         // 遮罩期間不計閒置，否則永遠沒機會解鎖
  };
  coverScreen = cover;                   // 讓閒置計時器也能叫出遮罩

  /* ⚠️ 預設「失焦不蓋遮罩」。
     手機叫出／收起輸入法都會送出 blur，而且 iOS 收鍵盤時連 document.hasFocus()
     都會回傳 false，任何覆核都擋不住 —— 結果就是每打完一句話就被要求解鎖一次。
     保護改由兩個可靠的訊號負責：閒置計時，以及真正切到背景（visibilitychange）。 */
  let blurTimer = null;
  if (CFG.coverOnBlur) {
    window.addEventListener("blur", () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        if (document.hasFocus()) return;
        cover();
      }, 350);
    });
  }

  window.addEventListener("focus", () => { clearTimeout(blurTimer); });

  /* 真的切到背景（切換 App、鎖螢幕）→ 直接退回偽裝首頁。
     這樣手機的 App 切換器截到的畫面是乾淨的 Google 頁，不是模糊的聊天室。 */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (CFG.hideOnAppSwitch) panicExit(false);
    else cover();
  });

  // 解鎖邏輯已經在 VeilPad 裡（見九宮格密碼盤那一節）

  // 緊急鍵：第一次退回偽裝首頁，兩秒內再按一次直接離站
  let escAt = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key !== CFG.panicKey) return;

    // 第二次的判斷要放在最前面 —— 放在 chat.hidden 檢查之後的話，
    // 第一次按完 chat 已經是隱藏的，第二次永遠走不到這裡
    const now = Date.now();
    if (escAt && now - escAt < 2000) {
      escAt = 0;
      /* 第二下＝「連本機首頁都不要留」。設定了 panicUrl 就用它，
         沒設定才退回 google.com（v34 之前唯一的行為）。
         ⚠️ 離線時一樣不跳 —— 第一下已經把畫面切乾淨了，
            這時候導頁只會換來一張「無法連上這個網站」。 */
      leaveSite("https://www.google.com");
      return;
    }

    if (!$("lightbox").hidden) { closeLightbox(); return; }
    /* 個人密碼盤／暱稱視窗也要收得掉（v29）—— 那時候 #chat 還是 hidden，
       只看它的話 Esc 在這兩個畫面上完全沒有作用。 */
    if (keyGateOpen()) {
      escAt = now;
      dropDrafts();
      closeKeyGates();
      leaveChat();
      leaveSite();                     // ⚠️ 一定在 leaveChat() 之後 —— 先切畫面再導頁
      return;
    }
    if ($("chat").hidden && $("admin").hidden) return;

    escAt = now;
    dropDrafts();                      // Esc 是緊急鍵，草稿不留
    if (!$("admin").hidden) leaveAdmin(); else leaveChat();
    leaveSite();
  });
}


/* ────────────────────────── 12. 啟動 ────────────────────────── */

(function boot() {
  if (!window.isSecureContext) {
    console.warn("需要 https 或 localhost 才能使用加密功能");
  }
  // 第二道防線：index.html 的內聯腳本已經清過一次，這裡再確認一次
  if (location.search) {
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (_) {}
  }
  initViewport();
  initIdle();
  initPanic();
  initDisguise();
  initBell();
  applyScheme(false);
  initServiceWorker();
  initGate();
  /* v61：網址上帶著 LINE 回來的 code/state 就接著換票、重跑進房。
     ⚠️ index.html 開頭那段內聯腳本已經把網址清乾淨了，參數存在 window.__sq（只在記憶體）。 */
  Acl.resume().catch((err) => console.error(err)).finally(() => { LineHeader.init(); });
})();


/* ══════════════════════════════════════════════════════════════
   14. 管理儀表板
   ──────────────────────────────────────────────────────────────
   雲端「零儲存」：房間密碼是你當場貼上的，只活在記憶體，
   關掉分頁就沒了。資料庫沒有任何新節點，安全規則一行都沒改。

   ⚠️ 所以就算有人破解了 admin 密碼，看到的也只是一個空儀表板 ——
      真正的鑰匙（房間密碼）從頭到尾沒有離開過你手上。
   ══════════════════════════════════════════════════════════════ */

const Adm = { rooms: [], busy: false, nextAt: 0 };

/* 儀表板的自動更新間隔（毫秒）。0 = 關閉。 */
const admRefreshMs = () => Math.max(0, Number(CFG.adminRefreshSeconds) || 0) * 1000;

async function enterAdmin(password, pathId, adminKey) {
  admHomeSwitchLoad();
  $("gate").hidden = true;
  $("chat").hidden = true;
  $("admin").hidden = false;
  applyScheme(true);
  if (!Adm.bound) { bindAdmin(); Adm.bound = true; }
  Adm.rooms = [];
  clearBox($("admPws"));
  clearBox($("admGenIn"));
  $("admResult").hidden = true;
  $("admGenOut").hidden = true;
  $("admCopy").hidden = true;
  $("admHint").textContent = "";
  paintVersion();
  markActive();
  warmPanicUrl();
  Adm.nextAt = 0;
  const ac = $("admCount");
  if (ac) { ac.textContent = ""; ac.classList.remove("warn", "paused"); }
  /* 位置回報：用 admin 密碼推出解鎖金鑰、解開私鑰、載入紀錄。
     ⚠️ 只在這裡做一次。自動重查不會再跑（PBKDF2 31 萬次每分鐘一次會卡住畫面）。
     ⚠️ 密碼推完就丟，記憶體裡留的是不可匯出的 CryptoKey。 */
  LocAdm.arm(password);
  /* 位置推播的開關（v42）。⚠️ pathId 是 admin 密碼推導出來的 32 字位址，
        tryEnter() 進來之前已經算過，這裡不再花一次 PBKDF2。 */
  LocPush.arm(pathId);
  /* 裝置備註（v53）。跟 locpush 同一套祕密位址：admin 密碼推導的 32 字。
     ⚠️ 備註是「你自己給裝置取的名字」，可能寫著誰是誰 —— 拿到房間密碼的人
        不可以讀得到，所以它同時吃兩道保護：祕密路徑 ＋ 用 admin 金鑰加密。 */
  DevNote.arm(pathId, adminKey);
  /* v61：把自己的 LINE 代號印在提示列 —— 初始化 admin/ 或跟別人對代號時要用。 */
  try {
    const u = S.fb && S.fb.auth && S.fb.auth.currentUser;
    if (u && !u.isAnonymous) $("admHint").textContent = `你的 LINE 代號：${u.uid}`;
  } catch (_) {}
  $("admPws").focus();
}

/* 儀表板上方印出三個版號。
   「改了沒生效」最常見的原因不是部署失敗，是這台裝置還跑著舊的那一份：
     APP  = 現在執行中的 app.js
     外殼 = index.html（跟 APP 不同就代表 HTML 是舊的）
     快取 = Service Worker 的快取名（跟 APP 不同就代表 SW 還沒換手）
   三個一致就是乾淨的；只要有一個對不上，畫面就會標紅。 */
async function paintVersion() {
  const el = $("admVer");
  if (!el) return;
  const parts = [APP_VERSION];
  if (SHELL_VERSION !== APP_VERSION) parts.push(`外殼 ${SHELL_VERSION}`);
  try {
    const ck = (await caches.keys()).filter((x) => x.startsWith("sc-v"));
    if (ck.length && !ck.includes("sc-" + APP_VERSION)) parts.push(`快取 ${ck.join("/")}`);
  } catch (_) {}
  el.textContent = parts.join(" · ");
  el.classList.toggle("stale", parts.length > 1);
  el.title = parts.length > 1 ? "版本對不起來，請重新整理這一頁" : "版本一致";
}

function leaveAdmin() {
  if ($("admHomeDialog").open) $("admHomeDialog").close();
  HomeSwitch.lock();
  Adm.nextAt = 0;                       // 自動更新的倒數不要跨進下一次
  // 貼上的密碼只在記憶體，這裡把畫面上的也一起抹掉
  clearBox($("admPws"));
  clearBox($("admGenIn"));
  Adm.rooms = [];
  $("admRows").replaceChildren();
  $("admResult").hidden = true;
  $("admGenOut").hidden = true;
  $("admGenOut").textContent = "";
  $("admCopy").hidden = true;
  $("admHint").textContent = "";
  /* ⚠️ 記憶體裡解開的私鑰與畫面上的座標都要抹掉（坑 #97：v34 就是這條分支漏了一步）。 */
  LocAdm.reset();
  LocPush.reset();      // ⚠️ path 是密碼推導出來的，等於半把鑰匙，不可以留在記憶體裡
  $("admin").hidden = true;
  $("toast").hidden = true;
  applyScheme(false);
  S.role = null;
  $("gate").hidden = false;
  clearBox($("gateInput"));
  $("gClear").hidden = true;
  $("gDivider").hidden = true;
  $("gateInput").focus();
  maybeReload();
}

/* ⚠️ 一定要用 innerText 不能用 textContent。
   contenteditable 裡的換行是 <br> 元素，textContent 讀出來會把好幾行黏成一行，
   結果就是「貼了 8 組密碼卻只查到 1 間房」。innerText 才看得到實際的換行。 */
const admLines = (el) =>
  (el.innerText || el.textContent || "")
    .split(/\r?\n/)
    .map((x) => x.replace(/\u3000/g, " ").trim())
    .filter(Boolean);

const admAgo = (ms) => {
  if (!ms) return "—";
  const s = Math.max(0, Math.round((Date.now() + S.offset - ms) / 1000));
  if (s < 60) return s + " 秒前";
  if (s < 3600) return Math.floor(s / 60) + " 分前";
  if (s < 86400) return Math.floor(s / 3600) + " 小時前";
  return Math.floor(s / 86400) + " 天前";
};

/* 「幾月幾號」。登入次數的起算日用這個，不用 admAgo ——
   「3 次（62 天前 起算）」讀起來像在講次數發生的時間，是誤導。 */
const admDay = (ms) => {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/* ────────── 儀表板的自動更新（v33）──────────
 *
 * ⚠️ 儀表板是「一次性掃描」，不是即時訂閱 —— 沒有這個的話，
 *    畫面上的數字會停在你按下查詢的那一刻，而「現在幾個人在線上」
 *    這種東西幾秒就變了。使用者以為看到的是現況，其實是快照。
 *
 * ⚠️ 重查刻意**不重新推導密碼**：Adm.rooms 裡已經有房號與金鑰了。
 *    重新推導是每間房 31 萬次 PBKDF2（約 0.14 秒的阻塞運算），
 *    五間房就是每分鐘卡 0.7 秒 —— 為了一件本來就不必做的事。
 *
 * ⚠️ 分頁切走時要暫停。留著它在背景每分鐘打一輪，是白花的流量。
 * ─────────────────────────────────────────── */
function admTick() {
  const el = $("admCount");
  const every = admRefreshMs();

  // 還沒查過、或關掉自動更新 → 這一格就不要顯示東西
  if (!Adm.rooms.length || !every) {
    if (el) { el.textContent = ""; el.classList.remove("warn", "paused"); }
    Adm.nextAt = 0;
    return;
  }
  if (Adm.busy) {
    if (el) { el.textContent = "…"; el.classList.add("paused"); }
    return;
  }
  if (document.hidden) {                 // 背景不查，也不倒數
    if (el) { el.textContent = "‖"; el.classList.add("paused"); }
    Adm.nextAt = Date.now() + every;
    return;
  }

  if (!Adm.nextAt) Adm.nextAt = Date.now() + every;
  const left = Adm.nextAt - Date.now();
  if (left <= 0) { Adm.nextAt = Date.now() + every; admRefreshRooms(); return; }

  if (el) {
    const sec = Math.max(0, Math.ceil(left / 1000));
    const txt = sec < 60 ? String(sec) : Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.remove("warn", "paused");
  }
}

/* 重查一輪：只重新抓數字，不重新推導密碼。
   ⚠️ 展開中的名冊也要一起更新 —— 不然畫面上一半是新的、一半是舊的，
      那比整片舊的更容易誤導人。 */
async function admRefreshRooms() {
  if (Adm.busy || !Adm.rooms.length) return;
  Adm.busy = true;
  $("admScan").disabled = true;
  try {
    const f = await connect();
    const { db, ref, get, query, orderByKey, limitToLast } = f;
    S.offset = await serverOffset(f);
    const now = Date.now() + S.offset;

    await Promise.all(Adm.rooms.map(async (r) => {
      const base = `rooms/${r.roomId}`;
      try {
        /* ⚠️ gate2 也一起抓（v54）。它是明文的小節點，不用解密，
              而且**兩個地方都要改** —— 這一段在「查詢」與「自動重查」各有一份，
              只改一份的話開關會在自動重查之後自己變回舊狀態。 */
        const [n, pSnap, newest, mSnap, g2Snap, petSnap, aclSnap] = await Promise.all([
          admCount(base),
          get(ref(db, `${base}/p`)),
          get(query(ref(db, `${base}/m`), orderByKey(), limitToLast(1))),
          get(ref(db, `${base}/mem`)),
          get(ref(db, `${base}/gate2`)),
          get(ref(db, `${base}/pet`)),
          get(ref(db, `acl/${r.roomId}`)).catch(() => null),   // v61（跟「查詢」那一份同步改）
        ]);
        r.acl = admAclNorm(aclSnap && aclSnap.val());
        /* 植物（v55）：跟 gate2 一樣是明文小節點，掃描時順手抓。
           ⚠️ 這一段在「查詢」與「自動重查」**各有一份**，只改一份的話
              自動重查之後儀表板上的植物數值會變回舊的（坑 #54 的同一家族）。 */
        r.pet = petSnap.val() || null;
        r.count = n;
        r.gate2 = !!(g2Snap.val() && g2Snap.val().on === true);
        r.members = Object.keys(mSnap.val() || {}).length;
        r.presence = pSnap.val() || {};
        r.online = Object.keys(r.presence).filter((c) => presenceFresh(r.presence[c], now)).length;
        r.ghosts = Object.keys(r.presence).length - r.online;
        let last = 0;
        newest.forEach((c) => { const v = c.val(); if (v && v.t > last) last = v.t; });
        r.last = last;
      } catch (_) { /* 單一間房失敗不要拖垮整輪 */ }
    }));
    admRender();

    // 展開中的名冊跟著更新
    for (let i = 0; i < Adm.rooms.length; i++) {
      if (Adm.rooms[i].who) await admWho(i, true);
    }
    $("admHint").textContent =
      `自動更新於 ${new Date().toLocaleTimeString("zh-TW", { hour12: false })}（每 ${Math.round(admRefreshMs() / 1000)} 秒）`;
  } catch (err) {
    console.error(err);
    $("admHint").textContent = connHint(err);
  } finally {
    Adm.busy = false;
    $("admScan").disabled = false;
  }
}

async function admScan() {
  if (Adm.busy) return;
  /* ⚠️ v59：貼進來的密碼也要**剝掉記號**。
        使用者每天進房打的是 `0606,`／`0606.`，貼到這裡來是必然的肌肉記憶 ——
        不剝的話推導出來的是另一個房號，畫面上會顯示「查不到這間房」，
        而那是**沉默的錯誤**：看起來像資料沒了，其實只是多打了一個逗號。
     ⚠️ 只在這裡剝，不在「產生指紋」那個工具剝 —— 那裡要的是密碼本身。 */
  const pws = admLines($("admPws")).map((s) => peelStealth(s).pw);
  if (!pws.length) { $("admHint").textContent = "請先貼上至少一組房間密碼。"; return; }

  Adm.busy = true;
  $("admScan").disabled = true;
  $("admHint").textContent = `推導中…（${pws.length} 組，每組要跑 31 萬次運算）`;

  try {
    const f = await connect();
    const { db, ref, get, query, orderByKey, limitToLast } = f;
    S.offset = await serverOffset(f);

    const rows = [];
    for (const pw of pws) {
      let k;
      try { k = await deriveKeys(pw); } catch (_) { continue; }
      const known = CFG.passwords.find((p) => p.fingerprint === k.fingerprint);
      if (known && known.role === "admin") continue;         // 別把自己列進去

      const base = `rooms/${k.roomId}`;
      let count = 0, last = 0, online = 0, ghosts = 0, presence = {}, members = 0, gate2 = false, pet = null, acl = admAclNorm(null);
      try {
        /* ⚠️ gate2 也一起抓（v54）。它是明文的小節點，不用解密，
              而且**兩個地方都要改** —— 這一段在「查詢」與「自動重查」各有一份，
              只改一份的話開關會在自動重查之後自己變回舊狀態。 */
        const [n, pSnap, newest, mSnap, g2Snap, petSnap, aclSnap] = await Promise.all([
          admCount(base),
          get(ref(db, `${base}/p`)),
          get(query(ref(db, `${base}/m`), orderByKey(), limitToLast(1))),
          get(ref(db, `${base}/mem`)),
          get(ref(db, `${base}/gate2`)),
          get(ref(db, `${base}/pet`)),
          /* LINE 審核（v61）：整個 acl/<房號> 一次抓（on / req / ok 都是小節點）。
             ⚠️ 只有管理員讀得到 req 與整份 ok —— 這裡是管理員，規則會放行。
             ⚠️ 這一段在「查詢」與「自動重查」**各有一份**（同 gate2 那顆坑）。 */
          get(ref(db, `acl/${k.roomId}`)).catch(() => null),
        ]);
        acl = admAclNorm(aclSnap && aclSnap.val());
        pet = petSnap.val() || null;
        members = Object.keys(mSnap.val() || {}).length;
        gate2 = !!(g2Snap.val() && g2Snap.val().on === true);
        count = n;
        /* ⚠️ 在線數要看 at 的新鮮度，不可以數節點個數。
              殘留節點是常態，數個數的話這一格會永遠是「有人在」（見坑 #56）。
              另外把「殘骸幾筆」也算出來 —— 差多少一眼就看得到。 */
        presence = pSnap.val() || {};
        const now = Date.now() + S.offset;
        online = Object.keys(presence).filter((c) => presenceFresh(presence[c], now)).length;
        ghosts = Object.keys(presence).length - online;
        newest.forEach((c) => { const v = c.val(); if (v && v.t > last) last = v.t; });
      } catch (_) {}

      rows.push({
        name: known ? known.role : "（不在名單上）",
        known: !!known,
        roomId: k.roomId,
        key: k.aesKey,          // 只活在記憶體，離開儀表板就跟著 Adm.rooms 一起丟掉
        /* ⚠️ hk 一起留著：第二道密碼的指紋要用它推導（v54）。
              deriveKeys 本來就算出來了，留著是零成本 ——
              **絕對不要改成存明文的房間密碼**，那是完全不必要的暴露。 */
        hk: k.hk,
        count, last, online, ghosts, presence, members, gate2, pet,
        acl, aclOpen: false, aclBusy: false,
        who: null, whoBusy: false, whoNote: "",
        ok: null, bad: null, busy: false,
      });
    }

    Adm.rooms = rows;
    admRender();
    $("admHint").textContent = `查了 ${rows.length} 間房。密碼沒有存到任何地方。`;
  } catch (err) {
    console.error(err);
    $("admHint").textContent = connHint(err);
  } finally {
    Adm.busy = false;
    $("admScan").disabled = false;
  }
}

/* 展開「成員名冊」：這間房有哪些人、各自的友情次數、現在在不在線上。
 *
 * v27 之前這裡是「翻最近 40 則訊息拼出裝置→暱稱對照」——
 * 那個做法查不到從沒發過言的人。有了個人密碼登入之後，
 * mem/ 就是一份真正的名冊：**每個登入過的人都在裡面，發不發言都一樣。**
 *
 * ⚠️ 名冊的內容（暱稱、顏色）是密文，要用房間金鑰在「這台電腦上」解 ——
 *    雲端看到的只有一串 32 字的身分代號加一團密文。
 * ⚠️ 在線是靠 p/<裝置>/u 對回身分代號算的，所以一個人用兩台會顯示「2 台」。
 * ⚠️ 私人房沒有 mem/（沒有個人密碼那一步），那裡只會列出裝置與心跳，這是對的。
 */
async function admWho(i, force) {
  if (CFG.deviceHistoryEnabled === false) return;
  const r = Adm.rooms[i];
  if (!r || r.whoBusy) return;
  /* 再按一次收起來。⚠️ force 是給自動更新用的「原地重整」——
     少了它，自動更新會把使用者展開的名冊收掉，看起來像自己閃掉了。 */
  if (r.who && !force) { r.who = null; r.whoNote = ""; admRender(); return; }

  r.whoBusy = true; admRender();
  try {
    const { db, ref, get } = await connect();
    const base = `rooms/${r.roomId}`;

    /* v53：多抓兩樣 —— 裝置足跡（誰來過）與備註（我認得哪些）。
       ⚠️ 備註走 DevNote，讀不到（沒設定、或換過 admin 密碼）就當成空的，
          整份清單會變成「全部沒看過」—— 那是誠實的結果，不要假裝認得。 */
    const [pSnap, mSnap, hSnap, sSnap] = await Promise.all([
      get(ref(db, `${base}/p`)),
      get(ref(db, `${base}/mem`)),
      get(ref(db, `${base}/heart`)),
      get(ref(db, `${base}/seen`)),
    ]);
    const presence = pSnap.val() || {};
    const members = mSnap.val() || {};
    const hearts = hSnap.val() || {};
    const seen = sSnap.val() || {};
    let notes = new Map();
    try { notes = await DevNote.load(r.roomId); } catch (_) {}
    r.notes = notes;
    r.presence = presence;

    const now = Date.now() + S.offset;

    /* 先把在線紀錄依身分代號分組。沒有 u 的（私人房、或還沒登入過的舊節點）
       自成一組，用裝置代號當鍵。 */
    const byMember = new Map();
    for (const [cid, rec] of Object.entries(presence)) {
      const key = (rec && rec.u) ? rec.u : `dev:${cid}`;
      const cur = byMember.get(key) || { devices: 0, live: 0, at: 0 };
      cur.devices++;
      if (presenceFresh(rec, now)) cur.live++;
      cur.at = Math.max(cur.at, Number(rec && rec.at) || 0);
      byMember.set(key, cur);
    }

    const rows = [];
    for (const [uid, rec] of Object.entries(members)) {
      let nick = "", color = "";
      try {
        if (rec && rec.iv && rec.c) {
          const body = await unseal(r.key, rec);
          nick = String(body.n || "");
          color = body.c || "";
        }
      } catch (_) { /* 解不開（換過房間密碼）→ 留空，下面會誠實顯示 */ }
      const p = byMember.get(uid) || { devices: 0, live: 0, at: 0 };
      byMember.delete(uid);
      rows.push({
        id: uid, name: nick, color,
        joined: Number(rec && rec.t) || 0,
        hearts: Number(hearts[uid]) || 0,
        devices: p.devices, live: p.live > 0, at: p.at,
        member: true,
      });
    }

    /* 名冊上沒有、但在線紀錄裡有的 —— 私人房的裝置，或多人房的殘骸。
       ⚠️ 不要靜靜吃掉：「名冊 3 人但在線有第 4 個東西」正是要看得出來的狀況。 */
    for (const [key, p] of byMember.entries()) {
      rows.push({
        id: key.replace(/^dev:/, ""), name: "", color: "",
        joined: 0, hearts: 0,
        devices: p.devices, live: p.live > 0, at: p.at,
        member: false,
      });
    }

    /* ⚠️ 這一段是 v53 的重點：**來過就走的裝置**。
          p/ 那一筆離開時就被刪了，10 分鐘後連殘骸都清掉 ——
          少了這一段，一台進來看完就走的裝置在儀表板上完全查不到，
          而那正好是「有沒有別人進過」最該抓到的情況。 */
    const listed = new Set(rows.map((x) => x.id));
    for (const cid of Object.keys(seen)) {
      if (listed.has(cid)) continue;
      rows.push({
        id: cid, name: "", color: "", joined: 0, hearts: 0,
        devices: 0, live: false, at: Number(seen[cid] && seen[cid].l) || 0,
        member: false,
      });
    }

    /* 每一列補上「首次出現」與「認不認得」。
       ⚠️ 認得與否只看 devnote 有沒有那一筆 —— 不看 seen。
          seen 是「來過」，devnote 是「我按過認得」，兩件事。 */
    rows.forEach((x) => {
      const sv = seen[x.id];
      /* ⚠️ v55.3：多人房的名冊列**要拿 mem/<身分>/t 當首次**，不能只看 seen.f。
            足跡是這一版才改成記身分代號的，名冊上已經待了半年的人下次進房
            才會第一次寫下 f = 現在 —— 畫面上寫「首次 剛剛」是在說謊。
            joined（mem 的 t）才是他真正登入名冊的那一刻。取兩者較早的。
            這樣 countFrom 會離 first 很遠，下面那個 partial 會自動加註
            「（9/1 起算）」—— 跟 v54.2 處理舊裝置紀錄是同一套手法。 */
      const sf = Number(sv && sv.f) || 0;
      x.first = (x.joined && sf) ? Math.min(x.joined, sf) : (sf || x.joined || 0);
      /* v54.2：登入次數。
         ⚠️ countFrom 跟 first 差很多的，代表這一筆是計數功能上線**之前**就存在的
            舊紀錄 —— 次數是從半路開始數的，畫面上要加註，不可以直接寫「登入 1 次」。 */
      x.logins = Number(sv && sv.n) || 0;
      x.countFrom = Number(sv && sv.nf) || 0;
      /* v59：被假的那條路擋下來幾次（打了沒有記號的房間密碼）。
         ⚠️ 跟 logins 是**兩個不同的數字**：logins 是真的進來過，blocked 是被擋在外面。
            一台只有 blocked、沒有 logins 的裝置 = 有人知道密碼但不知道記號。 */
      x.blocked = Number(sv && sv.dn) || 0;
      x.blockedAt = Number(sv && sv.dl) || 0;
      /* v55.3：這個身分用過幾台裝置。
         ⚠️ 只顯示**數量**，不列出是哪幾台 —— 使用者要的是「不要再累積裝置列」。
            但數量本身要留著：兩組密碼一起外洩的時候，
            「這個人突然多了一台」是最先看得到的訊號。 */
      x.devUsed = Object.keys((sv && sv.dv) || {}).length;
      x.known = notes.has(x.id);
      x.note = notes.get(x.id) || "";
    });

    /* 沒看過的排最前面 —— 那是唯一需要你動作的東西 */
    rows.sort((a, b) => (a.known - b.known) || (b.live - a.live) || (b.hearts - a.hearts) || (b.at - a.at));
    r.who = rows;
    r.unknown = rows.filter((x) => !x.known).length;

    const anon = rows.filter((x) => x.member && !x.name).length;
    const strays = rows.filter((x) => !x.member).length;
    /* ⚠️ 「沒看過幾台」**不可以**寫死進 whoNote —— 它是掃描當下算出來的字串，
          使用者按一下「確認」之後就過期了，畫面上會留著
          「⚠ 1 台沒看過」但那一列早就變成認得的了（截圖時當場抓到）。
          會變的東西留到畫面上再組，見 admWhoRow。 */
    r.whoNote = rows.length === 0
      ? "這間房還沒有人登入過，也沒有任何在線紀錄。"
      : `名冊 ${rows.filter((x) => x.member).length} 人` +
        (strays ? ` · 另有 ${strays} 筆不在名冊上的裝置紀錄` : "") +
        (anon ? ` · ${anon} 筆解不開（可能換過房間密碼）` : "");
  } finally {
    r.whoBusy = false;
    admRender();
  }
}

/* 數這間房有幾則訊息。
   ⚠️ 不能用 get(rooms/<房號>/m) —— 那會把整間房的密文（含貼圖的 base64）
      整包下載下來只為了數個數字。48 小時自動清理關掉之後房間會一直長大，
      掃一輪八間房可能就是好幾 MB，免費方案每月 10GB 撐不了多久。
   改用 Firebase REST 的 shallow 查詢：只回鍵、不回內容，一則大約 24 bytes。
   token 走 Authorization 標頭而不是網址參數，才不會被記進任何存取紀錄。
   萬一 REST 走不通（例如離線）就退回原本的做法，功能不會壞，只是比較耗流量。 */
async function admCount(base) {
  try {
    const { auth } = await connect();
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${CFG.firebase.databaseURL}/${base}/m.json?shallow=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(String(res.status));
    const keys = await res.json();
    return keys ? Object.keys(keys).length : 0;
  } catch (_) {
    const { db, ref, get } = await connect();
    const snap = await get(ref(db, `${base}/m`));
    return Object.keys(snap.val() || {}).length;
  }
}

/* 逐則試解，只數成敗，不顯示任何內容。
   用途：畫面上的則數跟這裡的則數對不起來時，一鍵看出差在哪 ——
   是「解不開」還是「沒載進來」，兩者的處理方式完全不同。
   ⚠️ 這會把整間房下載一次（貼圖很吃流量），所以做成按需求觸發，不自動跑。 */
async function admVerify(i) {
  const r = Adm.rooms[i];
  if (!r || !r.key || r.busy) return;
  r.busy = true; admRender();
  try {
    const { db, ref, get } = await connect();
    const snap = await get(ref(db, `rooms/${r.roomId}/m`));
    const v = snap.val() || {};
    let ok = 0, bad = 0, bytes = 0;
    for (const rec of Object.values(v)) {
      if (!rec || typeof rec.c !== "string" || typeof rec.iv !== "string") { bad++; continue; }
      bytes += rec.c.length + rec.iv.length + 60;    // 60 ≈ 鍵、s、t 與 JSON 外殼
      try { await unseal(r.key, rec); ok++; } catch (_) { bad++; }
    }
    r.ok = ok; r.bad = bad; r.count = ok + bad; r.bytes = bytes;
    const mb = (bytes / 1048576).toFixed(2);
    toast(bad ? `${r.name}：${bad} 則解不開` : `${r.name}：${ok} 則全部正常，共 ${mb} MB`);
  } catch (err) {
    console.error(err); toast("檢查失敗，請確認網路");
  } finally {
    r.busy = false; admRender();
  }
}

function admRender() {
  const tb = $("admRows");
  tb.replaceChildren();

  Adm.rooms.forEach((r, i) => {
    const tr = document.createElement("tr");

    /* ⚠️ 每一格都掛一個「這是什麼」的 class（v54.1）。窄螢幕的卡片排法靠它定位 ——
          用 nth-child 的話，哪天欄位順序一動就整個錯位，而且不會有人發現。 */
    const c1 = document.createElement("td");
    c1.className = "a-c-room";
    const nm = document.createElement("span");
    nm.className = "a-name";
    nm.textContent = r.name;
    if (!r.known) nm.style.color = "var(--danger)";
    const rid = document.createElement("span");
    rid.className = "a-room";
    rid.textContent = r.roomId.slice(0, 8) + "…";
    c1.append(nm, rid);

    const c2 = document.createElement("td");
    c2.className = "a-num a-c-msg";
    c2.dataset.label = "訊息";
    if (r.busy) c2.textContent = "檢查中…";
    else if (r.bad != null) {
      c2.textContent = String(r.count);
      const tag = document.createElement("span");
      tag.className = "a-bad" + (r.bad ? "" : " ok");
      tag.textContent = r.bad ? `解不開 ${r.bad}` : "全部正常";
      c2.appendChild(tag);
      // 這間房整份拉下來要多少流量 —— 直接看得到，不用猜
      const sz = document.createElement("span");
      sz.className = "a-bad ok";
      sz.textContent = (r.bytes / 1048576).toFixed(2) + " MB";
      c2.appendChild(sz);
    } else c2.textContent = String(r.count);

    const c3 = document.createElement("td");
    c3.className = "a-c-last";
    c3.dataset.label = "最後活動";
    c3.textContent = admAgo(r.last);

    /* 在線那一格改成按鈕：按下去展開明細。
       ⚠️ 明細要現抓、還要解訊息，所以是「按了才做」，不跟著掃描一起跑 —— 那會吃流量。 */
    const c4 = document.createElement("td");
    c4.className = "a-num a-c-live";
    c4.dataset.label = "在線";
    const who = document.createElement("button");
    who.type = "button";
    who.className = "a-who-btn" + (r.online > 0 ? " a-live" : "");
    who.dataset.i = String(i);
    who.textContent = r.whoBusy ? "…" : String(r.online);
    who.title = "看名冊：有哪些人、友情次數、現在在不在線上";
    who.disabled = !!r.whoBusy || CFG.deviceHistoryEnabled === false;
    if (CFG.deviceHistoryEnabled === false) who.title = "設備紀錄已停用";
    c4.appendChild(who);
    /* 殘骸也要看得到 —— 「在線 0 但底下躺著 3 筆」正是要能一眼分辨的狀況 */
    if (r.members > 0) {
      const m = document.createElement("span");
      m.className = "a-ghost";
      m.textContent = `名冊 ${r.members} 人`;
      m.title = "登入過這間房的人數（包含從沒發過言的）";
      c4.appendChild(m);
    }
    /* v53：展開過才知道有幾台沒看過（要解密備註才算得出來），
       所以只在 who 載入過的房間顯示這一行。 */
    if (CFG.deviceHistoryEnabled !== false && r.unknown > 0) {
      const u = document.createElement("span");
      u.className = "a-flag";
      u.textContent = `⚠ ${r.unknown} 台沒看過`;
      u.title = "有裝置進過這間房，但你還沒按過「認得」";
      c4.appendChild(u);
    }
    if (r.ghosts > 0) {
      const g = document.createElement("span");
      g.className = "a-ghost";
      g.textContent = `殘骸 ${r.ghosts}`;
      g.title = "有節點但心跳早就停了。下次有人進這間房會自動清掉。";
      c4.appendChild(g);
    }

    const c5 = document.createElement("td");
    c5.className = "a-c-act";
    /* 第二道密碼（v54）：開著就是藍色實線、關著是一般灰框。點一下設定／改／關閉。
       ⚠️ gate2 是明文的小節點，掃描時順手抓，不用解密。
       ⚠️⚠️ **不可以為了共用長相就掛上 `.a-check`。** `.a-check` 是「檢查」那顆鈕的
          **行為**標記 —— 事件處理器與別的測試都靠它認人。第一版掛了，結果
          `querySelector("#admRows .a-check")` 從此指到這一顆（它排在前面），
          test-v183 的「檢查會算出解不開幾則」整條壞掉，而症狀跟 v54 毫無關聯。
          長相走 CSS 那邊的 `.a-check, .a-g2 { … }`，行為各認各的 class。 */
    const g2 = document.createElement("button");
    g2.type = "button";
    g2.className = "a-g2" + (r.gate2 ? " on" : "");
    g2.dataset.i = String(i);
    g2.textContent = r.gate2 ? "第二道 ✓" : "第二道";
    g2.title = r.gate2
      ? "這間房已開啟第二道密碼。點一下可以改密碼或關閉。"
      : "為這間房設定第二道密碼（進房後要再輸入一次才看得到訊息）";
    c5.appendChild(g2);

    /* 植物（v55）：看數值與歸零。
       ⚠️ 跟 .a-g2 同一條規矩 —— **不可以掛 .a-check**，那是「檢查」的行為標記。 */
    const pl = document.createElement("button");
    pl.type = "button";
    pl.className = "a-g2 a-plant";
    pl.dataset.i = String(i);
    pl.textContent = "植物";
    pl.title = "看這間房植物的目前數值，或把它歸零回第 1 階";
    c5.appendChild(pl);

    /* LINE 審核（v61）：開著是藍色實線。點一下展開申請名單與開關。
       ⚠️ 跟 .a-g2 / .a-plant 同一條規矩 —— 不可以掛 .a-check。 */
    const ac = document.createElement("button");
    ac.type = "button";
    ac.className = "a-g2 a-acl" + (r.acl.on ? " on" : "");
    ac.dataset.i = String(i);
    const pending = admAclPending(r.acl);
    ac.textContent = (r.acl.on ? "LINE ✓" : "LINE") + (pending ? ` · ${pending} 待審` : "");
    ac.title = r.acl.on
      ? "這間房已開啟 LINE 審核：沒被核准的 LINE 帳號進不來。點一下看名單或關閉。"
      : "這間房還沒開 LINE 審核（任何知道密碼的人都進得來）。點一下看申請名單或開啟。";
    c5.appendChild(ac);

    const chk = document.createElement("button");
    chk.type = "button";
    chk.className = "a-check";
    chk.dataset.i = String(i);
    chk.textContent = "檢查";
    chk.title = "逐則試解，看有幾則解不開（會下載整間房，比較吃流量）";
    chk.disabled = !!r.busy;
    c5.appendChild(chk);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "a-wipe";
    btn.dataset.i = String(i);
    btn.textContent = "清空";
    const hold = document.createElement("span");
    hold.className = "a-hold";
    btn.appendChild(hold);
    c5.appendChild(btn);

    tr.append(c1, c2, c3, c4, c5);
    tb.appendChild(tr);

    if (CFG.deviceHistoryEnabled !== false && r.who) tb.appendChild(admWhoRow(r));
    if (r.aclOpen) tb.appendChild(admAclRow(r, i));
  });

  $("admResult").hidden = Adm.rooms.length === 0;
}

/* 在線明細那一列（展開時才有）。 */
function admWhoRow(r) {
  const tr = document.createElement("tr");
  tr.className = "a-who-row";
  const td = document.createElement("td");
  td.colSpan = 5;

  const box = document.createElement("div");
  box.className = "a-who";

  /* v53：每一列多了備註、首次出現、認得／刪除（使用者選的 A1：全部攤開在同一行）。
     ⚠️ 這一行在 390px 上一定會換行 —— 所有零件都不可壓縮，總寬度超過容器。
        .a-dev 有 flex-wrap: wrap，少了它按鈕會被推到面板外面去。 */
  r.who.forEach((w) => {
    const line = document.createElement("div");
    line.className = "a-dev" + (w.live ? " on" : "") + (w.known ? "" : " unknown");
    /* ⚠️ v55.3：「這一列是不是名冊上的人」要以**屬性**的形式留在 DOM 上。
          ✕ 給不給、首次時間怎麼算，都是看這件事 ——
          只靠「（不在名冊上）」那串佔位文字去分辨的話，
          哪天文案改一個字，守這件事的檢查就會靜靜地測到錯的東西。 */
    line.dataset.member = w.member ? "1" : "0";

    const dot = document.createElement("span");
    dot.className = "a-dev-dot";
    line.appendChild(dot);

    if (w.known) {
      /* 認得的：左邊是可以直接改的備註。有備註就顯示備註，沒有才顯示代號。 */
      const inp = document.createElement("input");
      inp.className = "a-dev-note" + (w.note ? " named" : "");
      inp.type = "text";
      inp.value = w.note;
      inp.placeholder = "加備註…";
      inp.maxLength = 40;
      inp.dataset.cid = w.id;
      inp.dataset.i = String(Adm.rooms.indexOf(r));
      /* ⚠️ 這幾個屬性跟密碼那格同一套：不要讓密碼管理員跳出來認領這個欄位。 */
      inp.setAttribute("autocomplete", "off");
      inp.setAttribute("data-1p-ignore", "");
      inp.setAttribute("data-lpignore", "true");
      inp.setAttribute("data-bwignore", "");
      inp.setAttribute("spellcheck", "false");
      line.appendChild(inp);
    } else {
      const nm = document.createElement("span");
      nm.className = "a-dev-name anon";
      /* 誠實原則：對不上名字就講對不上，不要編一個「未知使用者」出來假裝知道 */
      nm.textContent = w.name || (w.member ? "（名字解不開）" : "（不在名冊上）");
      nm.style.flex = "1 1 auto";
      line.appendChild(nm);
    }

    const cid = document.createElement("span");
    cid.className = "a-dev-id";
    cid.textContent = w.id.slice(0, 6);
    line.appendChild(cid);

    if (!w.known) {
      const badge = document.createElement("span");
      badge.className = "a-dev-new";
      badge.textContent = "沒看過";
      badge.title = "這個代號還沒被你按過「認得」。對方清了瀏覽器資料、換瀏覽器、換手機都會變成新的代號。";
      line.appendChild(badge);
    }

    const meta = document.createElement("span");
    meta.className = "a-dev-ago";
    const bits = [];
    if (w.member) bits.push(`友情 ${w.hearts}`);
    /* ⚠️ v55.3 起這裡有兩個「台」，一定要講清楚是哪一種 ——
          `devices` 是**此刻**有幾台在線（p/ 分組來的，離開就歸零），
          `devUsed` 是**累計**用過幾台（seen 的 dv，永久）。
          以前只寫「3 台」，跟新的累計數字擺在一起會完全分不出來。 */
    if (w.devices > 1) bits.push(`在線 ${w.devices} 台`);
    /* 只在 ≥2 才顯示：1 台是常態，寫出來只是雜訊。
       這樣「1 台變 2 台」的那一刻是**多出一個標籤**，比數字從 1 跳到 2 顯眼得多。 */
    if (w.devUsed > 1) bits.push(`用過 ${w.devUsed} 台`);
    if (w.first) bits.push("首次 " + admAgo(w.first));
    /* v54.2：登入次數（使用者選的版型 A —— 併進這一行，不另外做徽章）。
       ⚠️ 舊紀錄的次數是從半路開始數的，一定要加註起算日。
          少了這一句，一台其實來過五十次的自己人會顯示「登入 1 次」——
          而「只來過 1 次」正好是這整個功能裡最刺眼的訊號。 */
    if (w.logins > 0) {
      const partial = w.first && w.countFrom && (w.countFrom - w.first) > 60000;
      bits.push(`登入 ${w.logins} 次` + (partial ? `（${admDay(w.countFrom)} 起算）` : ""));
    }
    bits.push(w.live ? "在線上" : (w.at ? admAgo(w.at) : "沒上線過"));
    meta.textContent = bits.join(" · ");
    line.appendChild(meta);

    /* v59：被假的那條路擋下來的次數。
       ⚠️ 這一條**不併進上面那行 bits**，要自己一個徽章 ——
          它的意思跟那一行其他東西完全不同：那些是「這台做了什麼」，
          這個是「有人知道房間密碼、但不知道要加記號」。
          混在一串點點點裡面會被讀過去，而這正是整個功能唯一要你看到的東西。 */
    if (w.blocked > 0) {
      const warn = document.createElement("span");
      warn.className = "a-dev-blocked";
      warn.textContent = `擋下 ${w.blocked} 次` + (w.blockedAt ? " · " + admAgo(w.blockedAt) : "");
      warn.title = "這台打過『沒有記號』的房間密碼，被當成打錯擋掉了（對方看到的是 Google 搜尋結果）。"
                 + "如果不是你自己手滑，代表有人知道這組密碼。";
      line.appendChild(warn);
    }

    /* v54.2：兩顆鈕**同時**都在，不是二選一。
       ⚠️ 使用者的話：「因為要刪除記錄以前要先點『這是他的』然後在按『X』才能真實刪除，
          我要的是在點『這是他的』同時也可以直接按『X』刪除該記錄」。
          原本是 if/else —— 沒看過的那一列只有「確認」（v54.2 之前寫「這台是他的」），
          想清掉一台陌生裝置得先**假裝認得它**再刪，完全反直覺，
          而「清掉陌生裝置」正是這個名單最主要的用途。
       ⚠️ ✕ 排在最後（破壞性的動作放右邊），而且兩顆之間要有間距，
          不然在窄機上很容易按錯。 */
    const act = document.createElement("span");
    act.className = "a-dev-act";
    const idx = String(Adm.rooms.indexOf(r));

    if (!w.known) {
      const ok = document.createElement("button");
      ok.type = "button";
      ok.className = "a-dev-ok";
      ok.dataset.cid = w.id;
      ok.dataset.i = idx;
      ok.textContent = "確認";
      ok.title = "確認這台是你認得的裝置，之後不再標成沒看過";
      act.appendChild(ok);
    }

    /* ⚠️⚠️ v55.3：**名冊上的人不給 ✕**（使用者決定）。
          多人房改成用身分代號記足跡之後，名冊列按 ✕ 會變成一顆騙人的按鈕：
          它刪掉的是 seen/<身分>（登入次數、最後時間、用過幾台全沒了），
          但那一列是從 mem/ 來的 —— **下一次掃描它就原封不動長回來**，
          看起來像「按了沒反應」，實際上歷史已經被清掉而且救不回來。
          真正要清的是不在名冊上的舊裝置紀錄，那些列還是有 ✕。
       ⚠️ 「把人從 mem/ 一起刪掉」不是選項：他的友情計數會變成孤兒
          （btnForgetNick 那邊的註解講的是同一件事），而且他下次進房就重建一筆。 */
    if (!w.member) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "a-dev-del";
      del.dataset.cid = w.id;
      del.dataset.i = idx;
      del.textContent = "✕";
      del.title = w.known
        ? "直接刪除這一筆紀錄（備註一起刪掉，沒有復原）"
        : "直接刪除這一筆紀錄（不必先按「確認」）";
      del.setAttribute("aria-label", "刪除這一筆紀錄");
      act.appendChild(del);
    }

    line.appendChild(act);

    box.appendChild(line);
  });

  if (r.whoNote) {
    const note = document.createElement("p");
    note.className = "a-who-note";
    /* 現算，不用 admWho 當時那一份 —— 按了認得／刪除之後這個數字馬上會變。 */
    note.textContent = (r.unknown ? `⚠ ${r.unknown} 台沒看過 · ` : "") + r.whoNote;
    box.appendChild(note);
  }

  td.appendChild(box);
  tr.appendChild(td);
  return tr;
}


/* ── 儀表板：植物的數值與歸零（v55）──
 * 使用者的話：「我要儀表可以將植物歸零回到一階(按鈕長按兩秒生效)以及看到植物當前數值的功能」
 *
 * ⚠️ 這裡把**隱藏的經驗值攤開來看**。聊天室那邊刻意不顯示數字（使用者要求隱藏），
 *    但儀表板是自己用的除錯視角 —— 看不到數字就沒辦法判斷「是不是壞了」還是「就是這麼慢」。
 */
const AdmPlant = { i: -1 };

async function admPlantOpen(i) {
  const r = Adm.rooms[i];
  if (!r) return;
  AdmPlant.i = i;
  /* 果實要看思念總數。⚠️ **不在掃描時一起抓** —— 那會讓每一輪查詢
        每間房都多一次讀取，只為了一個很少人會看的數字。改成打開面板才讀一次。 */
  if (r.hearts == null) {
    try {
      const { db, ref, get } = await connect();
      const hs = await get(ref(db, `rooms/${r.roomId}/heart`));
      r.hearts = Object.values(hs.val() || {}).reduce((n, v) => n + (Number(v) || 0), 0);
    } catch (_) { r.hearts = 0; }
  }
  const box = $("paBody");
  const pet = r.pet;
  $("paEdit").hidden = !pet || typeof pet.b !== "number";
  $("paTitle").textContent = "植物 · " + r.name;

  if (!pet || typeof pet.b !== "number") {
    $("paSub").textContent = "這間房還沒有植物";
    box.innerHTML = `<div class="pa-k">還沒有人進過這間房，或這是多人房（多人房不做植物）。</div>`;
    $("paReset").hidden = true;
    $("plantAdm").hidden = false;
    return;
  }
  $("paSub").textContent = "這間房的目前數值";
  $("paReset").hidden = false;

  const a = pet.a || {};
  const total = Object.values(a).reduce((n, x) => n + (Number(x && x.n) || 0), 0);
  const hours = Math.max(0, (Date.now() + S.offset - pet.b) / 3600000);
  const exp = Math.max(0, Math.floor(hours * PLANT_EXP_HOUR + total * PLANT_EXP_ACT + (Number(pet.boost) || 0)));
  let st = 1;
  for (let k = 1; k < PLANT_STEPS.length; k++) if (exp >= PLANT_STEPS[k]) st = k + 1;
  $("paStage").replaceChildren(...PLANT_NAMES.map((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1); option.textContent = `第 ${index + 1} 階 · ${name}`;
    return option;
  }));
  $("paStage").value = String(st);
  const lo = PLANT_STEPS[st - 1], hi = PLANT_STEPS[st] || null;
  const pct = hi ? Math.round(((exp - lo) / (hi - lo)) * 100) : 100;
  const days = Math.floor(hours / 24);

  const row = (k, v) => `<div><span class="pa-k">${k}</span><span class="pa-v">${v}</span></div>`;
  let html = row("階段", `第 ${st} 階 · ${PLANT_NAMES[st - 1]}`)
    + row("經驗值", String(exp))
    + row("管理員調整", String(Number(pet.boost) || 0))
    + row("這一階", hi ? `${exp - lo} / ${hi - lo}（${pct}%）` : "已滿級")
    + (hi ? row("下一階還差", String(hi - exp)) : "")
    + row("種下多久", `${days} 天（${Math.floor(hours)} 小時）`)
    + row("時間給的", String(Math.floor(hours * PLANT_EXP_HOUR)))
    + row("互動給的", `${total} 次 × ${PLANT_EXP_ACT} = ${total * PLANT_EXP_ACT}`)
    + row("果實", `${Math.floor((r.hearts || 0) / PLANT_HEART_PER_FRUIT)} 顆（思念 ${r.hearts || 0} 次）`);

  html += `<div style="margin-top:8px"><b>每台裝置</b></div>`;
  const ids = Object.keys(a);
  if (!ids.length) html += `<div class="pa-k">還沒有人照顧過</div>`;
  ids.forEach((cid) => {
    const x = a[cid] || {};
    const bits = [];
    ["w", "s", "t"].forEach((k) => { if (x[k]) bits.push(`${PLANT_ACTS[k].label} ${admAgo(x[k])}`); });
    html += row(cid.slice(0, 6), `${Number(x.n) || 0} 次`)
      + (bits.length ? `<div class="pa-k" style="font-size:11px;opacity:.8">　${bits.join(" · ")}</div>` : "");
  });

  box.innerHTML = html;
  $("plantAdm").hidden = false;
}

/* 歸零 ＝ 把整個 pet 節點刪掉。下次有人進房會重新種一株（b 重寫、次數歸零）。
   ⚠️ 沒有復原。⚠️ 思念換來的果實**不受影響** —— 那是 heart，另一個節點。 */
async function admPlantSetStage() {
  const i = AdmPlant.i, r = Adm.rooms[i], stage = Number($("paStage").value);
  if (!r || !Number.isInteger(stage) || stage < 1 || stage > PLANT_STEPS.length) return;
  const button = $("paApply");
  if (button.disabled) return;
  button.disabled = true;
  try {
    const f = await connect(), path = `rooms/${r.roomId}/pet`;
    const pet = (await f.get(f.ref(f.db, path))).val();
    if (!pet || typeof pet.b !== "number") throw new Error("no-plant");
    const total = Object.values(pet.a || {}).reduce((sum, act) => sum + (Number(act && act.n) || 0), 0);
    const hours = Math.max(0, (Date.now() + S.offset - pet.b) / 3600000);
    const boost = PLANT_STEPS[stage - 1] - Math.floor(hours * PLANT_EXP_HOUR + total * PLANT_EXP_ACT);
    await f.set(f.ref(f.db, path + "/boost"), boost);
    r.pet = { ...pet, boost };
    if (AdmPlant.i === i && !$("plantAdm").hidden) await admPlantOpen(i);
    toast(`已調整為第 ${stage} 階 · ${PLANT_NAMES[stage - 1]}`);
  } catch (_) { toast("植物階段未更新，請重新查詢後再試"); }
  finally { button.disabled = false; }
}

async function admPlantReset() {
  const r = Adm.rooms[AdmPlant.i];
  if (!r) return;
  try {
    const { db, ref, remove } = await connect();
    await remove(ref(db, `rooms/${r.roomId}/pet`));
    r.pet = null;
    $("plantAdm").hidden = true;
    admRender();
    toast("已歸零 · 下次有人進這間房會重新種一株");
  } catch (err) { console.error(err); toast("歸不掉，請檢查網路"); }
}

/* ── 第二道密碼：儀表板這一側（v54）──
 * ⚠️ 這裡設定的是**指紋**，不是密碼本身 —— 密碼一個字都不會離開這個瀏覽器，
 *    跟房間密碼、個人密碼同一條規矩。
 * ⚠️ 指紋要用**那間房的** hk 推導，不是 admin 的。所以要先用房間金鑰重推一次。
 *    Adm.rooms 裡存的是 aesKey（不能拿來 HKDF），沒有 hk —— 見下面 admG2Hk()。 */
const AdmG2 = { i: -1, hk: null };


/* ══════════════ 儀表板：LINE 審核（v61）══════════════ */
function admAclNorm(v) {
  v = (v && typeof v === "object") ? v : {};
  return { on: v.on !== false, req: (v.req && typeof v.req === "object") ? v.req : {}, ok: (v.ok && typeof v.ok === "object") ? v.ok : {} };
}
function admAclPending(acl) {
  return Object.keys(acl.req).filter((uid) => acl.ok[uid] !== true).length;
}
/* 展開列：總開關 ＋ 申請名單（名字／大頭貼／首次／最後／次數／狀態／核准／撤銷／✕） */
function admAclRow(r, i) {
  const tr = document.createElement("tr");
  tr.className = "a-who-row a-acl-row";
  const td = document.createElement("td");
  td.colSpan = 5;
  const box = document.createElement("div");
  box.className = "a-who a-aclbox";

  const head = document.createElement("div");
  head.className = "a-acl-head";
  const sw = document.createElement("button");
  sw.type = "button";
  sw.dataset.i = i;
  sw.className = "a-acl-on" + (r.acl.on ? " on" : "");
  sw.setAttribute("aria-pressed", String(r.acl.on));
  sw.textContent = "LINE 審核：" + (r.acl.on ? "開" : "關");
  head.appendChild(sw);
  const note = document.createElement("span");
  note.className = "a-acl-note";
  note.textContent = r.acl.on ? "未核准的帳號只會看到「等待管理員審核」。" : "不需 LINE 登入，輸入房號即可進房。";
  head.appendChild(note);
  box.appendChild(head);

  const uids = Object.keys(r.acl.req);
  if (!uids.length) {
    const e = document.createElement("div");
    e.className = "a-acl-empty";
    e.textContent = "還沒有任何 LINE 帳號申請過這間房。";
    box.appendChild(e);
  }
  /* 待審的排前面、再來核准的；同組內最後一次申請新的在前 */
  uids.sort((a, b) => {
    const oa = r.acl.ok[a] === true ? 1 : 0, ob = r.acl.ok[b] === true ? 1 : 0;
    if (oa !== ob) return oa - ob;
    return (r.acl.req[b].l || 0) - (r.acl.req[a].l || 0);
  });
  uids.forEach((uid) => {
    const q = r.acl.req[uid] || {};
    const ok = r.acl.ok[uid] === true;
    const line = document.createElement("div");
    line.className = "a-dev a-acl-line" + (ok ? " ok" : " pending");
    line.dataset.uid = uid;
    line.dataset.ok = ok ? "1" : "0";
    const dot = document.createElement("span");
    dot.className = "a-dev-dot";
    line.appendChild(dot);

    /* 大頭貼：LINE 的網址，顯示它會對 LINE 發請求（使用者知情）。壞掉就退回字母。 */
    const av = document.createElement("span");
    av.className = "a-acl-av";
    if (q.p && /^https:\/\//.test(q.p)) {
      const img = document.createElement("img");
      img.src = q.p; img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.onerror = () => { img.remove(); av.textContent = (q.n || "?").slice(0, 1); };
      av.appendChild(img);
    } else av.textContent = (q.n || "?").slice(0, 1);
    line.appendChild(av);

    const nm = document.createElement("span");
    nm.className = "a-dev-name a-acl-name";
    nm.textContent = q.n || "待補齊 LINE 資料";
    nm.title = uid;
    line.appendChild(nm);

    const meta = document.createElement("span");
    meta.className = "a-dev-meta";
    const parts = [];
    if (q.f) parts.push(`首次 ${admAgo(q.f)}`);
    if (q.l) parts.push(`最後 ${admAgo(q.l)}`);
    if (typeof q.c === "number") parts.push(`申請 ${q.c} 次`);
    meta.textContent = parts.join(" · ");
    line.appendChild(meta);

    const st = document.createElement("span");
    st.className = "a-flag a-acl-st" + (ok ? " ok" : "");
    st.textContent = ok ? "已核准" : "待審核";
    line.appendChild(st);

    const act = document.createElement("span");
    act.className = "a-dev-act";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "a-dev-ok a-acl-ok" + (ok ? " revoke" : "");
    b.dataset.i = String(i); b.dataset.uid = uid; b.dataset.v = ok ? "0" : "1";
    b.disabled = !!r.aclBusy;
    b.textContent = ok ? "撤銷" : "核准";
    b.title = ok ? "撤銷之後他正在看的畫面會立刻被踢出去" : "核准之後他下次打密碼就直接進得來";
    if (!ok && !q.n) { b.disabled = true; b.title = "請對方重新進房並完成 LINE 登入，補齊姓名後再核准"; }
    act.appendChild(b);
    const d = document.createElement("button");
    d.type = "button";
    d.className = "a-dev-del a-acl-del";
    d.dataset.i = String(i); d.dataset.uid = uid;
    d.disabled = !!r.aclBusy;
    d.textContent = "✕";
    d.title = "把這一筆整個刪掉（他下次打密碼會重新申請）";
    act.appendChild(d);
    line.appendChild(act);
    box.appendChild(line);
  });

  td.appendChild(box);
  tr.appendChild(td);
  return tr;
}
async function admAclWrite(i, fn, doneMsg) {
  const r = Adm.rooms[i];
  if (!r || r.aclBusy) return;
  r.aclBusy = true; admRender();
  try {
    const f = await connect();
    await fn(f);
    const snap = await f.get(f.ref(f.db, `acl/${r.roomId}`));
    r.acl = admAclNorm(snap.val());
    if (doneMsg) toast(doneMsg);
  } catch (err) {
    console.error(err);
    toast("沒寫成功，什麼都沒有變 —— " + connHint(err), 3200);
  } finally {
    r.aclBusy = false; admRender();
  }
}

function admAclSet(i, uid, v) {
  const r = Adm.rooms[i]; if (!r || !uid) return;
  admAclWrite(i, (f) => f.set(f.ref(f.db, `acl/${r.roomId}/ok/${uid}`), !!v),
    v ? "已核准" : "已撤銷（他正在看的畫面會立刻被踢出去）");
}
function admAclDrop(i, uid) {
  const r = Adm.rooms[i]; if (!r || !uid) return;
  admAclWrite(i, (f) => f.update(f.ref(f.db, `acl/${r.roomId}`), { [`req/${uid}`]: null, [`ok/${uid}`]: null }),
    "已刪除這一筆");
}

async function admG2Open(i) {
  const r = Adm.rooms[i];
  if (!r) return;
  AdmG2.i = i;
  AdmG2.hk = r.hk || null;
  G2SetPad.reset();
  G2SetPad.tries = 0;
  $("g2SetTitle").textContent = r.gate2 ? "改第二道密碼" : "設定第二道密碼";
  $("g2SetSub").textContent = r.gate2
    ? "輸入新密碼；要關閉請按下面的「關閉這道」"
    : "至少 4 位數字";
  $("g2SetOff").hidden = !r.gate2;
  $("g2Set").hidden = false;
}

async function admG2Save(pin) {
  const i = AdmG2.i, r = Adm.rooms[i];
  if (!r) return;
  const hk = AdmG2.hk || r.hk;
  /* 重新查詢過就會有 hk。沒有的話講清楚要做什麼，不要只是安靜地失敗。 */
  if (!hk) { toast("請先按「查詢各房狀態」再設定"); return; }
  try {
    const fp = await deriveGate2Fp(hk, pin);
    const { db, ref, set } = await connect();
    await set(ref(db, `rooms/${r.roomId}/gate2`), { on: true, fp });
    r.gate2 = true;
    $("g2Set").hidden = true;
    admRender();
    toast("已設定第二道密碼 · 下次進這間房會先跳出警語");
  } catch (err) { console.error(err); toast("存不進去，請檢查網路"); }
}

async function admG2Off() {
  const i = AdmG2.i, r = Adm.rooms[i];
  if (!r) return;
  try {
    const { db, ref, remove } = await connect();
    await remove(ref(db, `rooms/${r.roomId}/gate2`));
    r.gate2 = false;
    $("g2Set").hidden = true;
    admRender();
    toast("已關閉這間房的第二道密碼");
  } catch (err) { console.error(err); toast("關不掉，請檢查網路"); }
}

const G2SetPad = makePad({
  sub: "g2SetSub", dots: "g2SetDots", grid: "g2SetGrid",
  sub0: "至少 4 位數字",
  maxTries: 99,                 // 這裡是「設定」不是「驗證」，沒有試錯次數的概念
  /* ⚠️ verify 在這裡的意思是「這組能不能拿來設定」，不是「對不對」。
        太短就退回去 —— 4 位是使用者自己定的下限。 */
  async verify(tried) {
    if (String(tried).length < 4) {
      const el = $("g2SetSub");
      if (el) { el.textContent = "至少要 4 位數字"; el.classList.add("bad"); }
      /* ⚠️ 回 "shown" 不是 false —— false 會被 makePad 當成「打錯了」，
            把這句話覆蓋成「密碼不對，還可以試 98 次」。 */
      return "shown";
    }
    await admG2Save(tried);
    return true;
  },
  onOk() { /* admG2Save 已經處理完畫面了 */ },
  onFail() { $("g2Set").hidden = true; },
});

/* ── 裝置：認得／改備註／刪除／復原（v53）──
 * ⚠️ 四支都先改記憶體再重畫，再把寫入丟出去 —— 儀表板要立刻有反應，
 *    不然按下去要等一趟網路，會讓人以為沒按到而連按好幾次。
 * ⚠️ 寫入失敗要講出來並把畫面改回去，不可以留一個「看起來成功了」的假象。 */
async function admDevKnow(i, cid) {
  const r = Adm.rooms[i];
  if (!r || !r.who || !cid) return;
  const w = r.who.find((x) => x.id === cid);
  if (!w) return;
  w.known = true; w.note = "";
  r.notes?.set(cid, "");
  r.unknown = r.who.filter((x) => !x.known).length;
  admRender();
  try { await DevNote.save(r.roomId, cid, ""); }
  catch (err) { console.error(err); toast("存不進去，請檢查網路"); w.known = false; r.notes?.delete(cid); r.unknown = r.who.filter((x) => !x.known).length; admRender(); }
}

async function admDevNote(i, cid, note) {
  const r = Adm.rooms[i];
  if (!r || !r.who || !cid) return;
  const w = r.who.find((x) => x.id === cid);
  if (!w) return;
  const v = String(note || "").slice(0, 40);
  if (w.note === v) return;
  w.note = v;
  r.notes?.set(cid, v);
  try { await DevNote.save(r.roomId, cid, v); }
  catch (err) { console.error(err); toast("備註沒存起來，請檢查網路"); }
}

/* v54.2：✕ ＝ **直接刪掉那一筆**，沒有復原。
 *
 * 使用者的話：「我要儀表設備名單中點X刪除就直接刪除該筆記錄…避免設備累積越來越多」
 *
 * ⚠️⚠️ 刪掉的是**紀錄**，不是那台裝置。名單是「在線紀錄 ∪ 名冊 ∪ 足跡」三份合出來的，
 *    所以**那台現在人還在房裡的話，下一次查詢它會立刻又出現**（只是變回「沒看過」、
 *    次數從 1 重新算）。真的會從名單上消失的是**已經離開的**裝置。
 *    這不是 bug，是「名單反映的是現況」；照著使用者要的做，但畫面上要說實話 ——
 *    所以吐司分成兩種講法。
 *
 * ⚠️ 備註跟著永久消失，救不回來（使用者確認過要這樣）。 */
async function admDevDrop(i, cid) {
  const r = Adm.rooms[i];
  if (!r || !r.who || !cid) return;
  const idx = r.who.findIndex((x) => x.id === cid);
  if (idx < 0) return;
  const w = r.who[idx];
  /* 還在線上／名冊上的，刪掉足跡也不會從名單消失 —— 先算出來才講得出正確的話。 */
  const stays = !!(w.member || w.devices > 0);
  const label = w.note || cid.slice(0, 6);

  r.who.splice(idx, 1);
  r.notes?.delete(cid);
  r.unknown = r.who.filter((x) => !x.known).length;
  admRender();

  try {
    await DevNote.drop(r.roomId, cid);
    toast(stays
      ? `已刪除「${label}」的紀錄 · 那台還在房裡，下次查詢會以新裝置出現`
      : `已刪除「${label}」的紀錄`);
  } catch (err) {
    /* ⚠️ 刪不掉就要把那一列放回去 —— 畫面上消失了、雲端還在，
          是這個功能最糟的失敗方式（你以為清乾淨了，其實沒有）。 */
    console.error(err);
    r.who.splice(idx, 0, w);
    if (w.known) r.notes?.set(cid, w.note);
    r.unknown = r.who.filter((x) => !x.known).length;
    admRender();
    toast("刪不掉，請檢查網路");
  }
}

/* ⚠️ 順序很重要：一定要先寫 meta/wipe 這個旗標，再刪資料。
   房裡的人是靠訂閱這個旗標即時清畫面的 —— 先刪資料的話，
   對方畫面上的訊息會一則一則消失（看起來像當機），
   而且他正在看的那幾則還會留在他的記憶體裡直到他自己重整。
   先送旗標，對方是「整個列表當場清空 + 顯示『對話已清除』」，不必等下一則訊息。 */
async function admWipe(i) {
  const r = Adm.rooms[i];
  if (!r) return;
  try {
    const { db, ref, remove, set } = await connect();
    const base = `rooms/${r.roomId}`;

    await set(ref(db, `${base}/meta/wipe`), Date.now());   // ① 讓房裡的人立刻停手清畫面
    await remove(ref(db, `${base}/m`));                    // ② 再刪訊息本體
    await Promise.all([                                    // ③ 訊息以外的殘留也一起清
      remove(ref(db, `${base}/read`)),
      remove(ref(db, `${base}/recv`)),
      remove(ref(db, `${base}/typing`)),
      remove(ref(db, `${base}/rx`)),
      remove(ref(db, `${base}/meta/last`)),
      // 儀表板的清空是「整間房歸零」，記事本與思念計數也要一起帶走
      remove(ref(db, `${base}/nt`)),
      remove(ref(db, `${base}/heart`)),
      remove(ref(db, `${base}/notice`)),

    ]);
    await remove(ref(db, `${base}/m`));                    // ④ 補刪，收掉這中間擠進來的

    r.count = 0; r.last = 0;
    admRender();
    toast(`已清空 ${r.name}`);
  } catch (err) { console.error(err); toast("清空失敗"); }
}

async function admGenerate() {
  const pws = admLines($("admGenIn"));
  if (!pws.length) { toast("請先輸入至少一組密碼"); return; }
  const out = [];
  for (let i = 0; i < pws.length; i++) {
    const k = await deriveKeys(pws[i]);
    out.push(`    { role: "room-${i + 1}", fingerprint: "${k.fingerprint}" },`);
  }
  $("admGenOut").textContent = "  passwords: [\n" + out.join("\n") + "\n  ],";
  $("admGenOut").hidden = false;
  $("admCopy").hidden = false;
}

function admHomeDialog(action) {
  const dialog = $("admHomeDialog"), input = $("admHomeSecret"), repeat = $("admHomeRepeat");
  const error = $("admHomeError"), save = $("admHomeSave"), cancel = $("admHomeCancel");
  const changing = action === "password";
  $("admHomeTitle").textContent = changing ? "修改首頁開關密碼" : "關閉首頁保護";
  $("admHomeHelp").textContent = changing ? "請設定 4～16 位數字密碼。" : "請輸入固定關閉密碼。";
  input.value = repeat.value = error.textContent = "";
  repeat.hidden = !changing;
  save.disabled = cancel.disabled = false;
  dialog.onclose = () => { input.value = repeat.value = error.textContent = ""; };
  cancel.onclick = () => dialog.close();
  save.onclick = async () => {
    if (save.disabled) return;
    const password = input.value;
    if (changing && (!/^\d{4,16}$/.test(password) || password !== repeat.value)) {
      error.textContent = "請輸入相同的 4～16 位數字密碼"; return;
    }
    input.value = repeat.value = "";
    save.disabled = cancel.disabled = true;
    try {
      await HomeSwitch.request(action, { password, ...(changing ? {} : { enabled: false }) });
      dialog.close();
      toast(changing ? "首頁開關密碼已更新" : "已關閉首頁保護");
      await admHomeSwitchLoad();
    } catch (_) { error.textContent = changing ? "密碼未更新，請稍後再試" : "關閉失敗，請確認固定密碼或稍後再試"; }
    finally { save.disabled = cancel.disabled = false; }
  };
  dialog.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); save.click(); }
  };
  dialog.oncancel = (e) => { if (save.disabled) e.preventDefault(); };
  dialog.showModal(); input.focus();
}

async function admHomeSwitchLoad() {
  const button = $("admHomeSwitch");
  button.disabled = true;
  try {
    const on = await HomeSwitch.required();
    button.dataset.on = String(on);
    button.textContent = "首頁開關：" + (on ? "開" : "關");
    button.setAttribute("aria-pressed", String(on));
    button.disabled = false;
  } catch (_) { button.textContent = "首頁開關：讀取失敗"; }
}

function bindAdmin() {
  $("admHomePassword").addEventListener("click", () => admHomeDialog("password"));
  $("admHomeSwitch").addEventListener("click", async () => {
    const button = $("admHomeSwitch");
    if (button.disabled) return;
    const on = button.dataset.on !== "true";
    if (!on) { admHomeDialog("toggle"); return; }
    button.disabled = true;
    try {
      await HomeSwitch.request("toggle", { enabled: true });
      toast(on ? "已開啟首頁保護，需先輸入首頁開關密碼" : "已關閉首頁保護，可直接輸入房號");
    } catch (_) { toast("首頁開關設定失敗，請稍後再試"); }
    await admHomeSwitchLoad();
  });
  bindMultilinePaste($("admPws"));
  bindMultilinePaste($("admGenIn"));

  $("admBack").addEventListener("click", leaveAdmin);
  $("admScan").addEventListener("click", admScan);

  /* 位置回報：只有「載入更早的」要綁 —— 金鑰是進儀表板時用密碼自動解的，沒有貼上這一步。
     ⚠️ 用 ?. 保護：locationReport 關掉時整區是 hidden 的，但節點還在 HTML 裡。 */
  $("locMore")?.addEventListener("click", () => LocAdm.loadOlder());

  /* 一鍵清空要長按 2 秒 —— 跟各房的「清空」同一套防誤觸。
     ⚠️ 一定要在 pointerup / pointerleave / pointercancel 都取消，
        不然手指滑開之後計時器還在跑，放開手才發現東西已經沒了。 */
  {
    const btn = $("locWipe");
    if (btn) {
      let timer = null;
      const bar = () => btn.querySelector(".a-hold");
      const stop = () => {
        clearTimeout(timer); timer = null;
        bar()?.classList.remove("run");
      };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        bar()?.classList.add("run");
        timer = setTimeout(async () => {
          stop();
          const ok = await LocAdm.wipeAll();
          toast(ok ? "位置回報已清空" : "清空失敗，等一下再試");
        }, 2000);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
        btn.addEventListener(ev, stop));
    }
  }
  /* 位置推播開關（v42）。
     ⚠️ 一定要用 change 而不是 click ——「要求通知權限」必須在使用者手勢裡，
        而且要先把畫面切回實際狀態，否則按失敗時開關會停在錯的位置。 */
  $("locPushSw")?.addEventListener("change", async (e) => {
    const want = !!e.target.checked;
    const msg = await LocPush.toggle(want);
    if (msg) toast(msg);
  });
  $("admRefresh").addEventListener("click", admScan);
  /* 第二道密碼的設定盤（v54） */
  G2SetPad.bind();
  $("paCancel")?.addEventListener("click", () => { $("plantAdm").hidden = true; });
  $("paApply")?.addEventListener("click", admPlantSetStage);
  /* 歸零：長按 2 秒（使用者指定），跟「清空」同一套防誤觸。
     ⚠️ 這一顆在面板裡，不在 #admRows 表格裡 —— 表格那道 pointerdown 監聽吃不到它，
        所以要自己綁一份。少了這一段會變成「按了完全沒反應」。 */
  {
    const b = $("paReset");
    let timer = null;
    const stop = () => { clearTimeout(timer); timer = null; b?.querySelector(".a-hold")?.classList.remove("run"); };
    b?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.querySelector(".a-hold")?.classList.add("run");
      timer = setTimeout(() => { stop(); admPlantReset(); }, 2000);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b?.addEventListener(ev, stop));
    b?.addEventListener("click", (e) => { e.preventDefault(); if (!timer) toast("按住 2 秒才會歸零"); });
  }
  $("g2SetCancel")?.addEventListener("click", () => { $("g2Set").hidden = true; G2SetPad.reset(); });
  $("g2SetOff")?.addEventListener("click", admG2Off);
  $("admGen").addEventListener("click", admGenerate);

  $("admCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("admGenOut").textContent); toast("已複製"); }
    catch (_) { toast("複製失敗，請手動選取"); }
  });

  /* 清空要長按 2 秒 —— 跟聊天室的一鍵清除同一套防誤觸邏輯 */
  let timer = null, fired = false, cur = null;
  const start = (e) => {
    const b = e.target.closest(".a-wipe");
    if (!b) return;
    e.preventDefault();
    cur = b; fired = false;
    b.querySelector(".a-hold")?.classList.add("run");
    timer = setTimeout(() => { cancel(); fired = true; admWipe(Number(b.dataset.i)); }, 2000);
  };
  const cancel = () => {
    clearTimeout(timer); timer = null;
    cur?.querySelector(".a-hold")?.classList.remove("run");
    cur = null;
  };
  const tb = $("admRows");
  tb.addEventListener("pointerdown", start);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => tb.addEventListener(ev, cancel));
  /* 備註：打字中不重畫（會把游標踢掉），**離開欄位才寫進雲端**。
     ⚠️ 用 change 不是 input —— input 會每打一個字就送一次寫入。 */
  tb.addEventListener("change", (e) => {
    const inp = e.target.closest(".a-dev-note");
    if (!inp) return;
    admDevNote(Number(inp.dataset.i), inp.dataset.cid, inp.value);
  });
  tb.addEventListener("click", (e) => {
    /* ⚠️⚠️ .a-g2 一定要判在 .a-check **前面** —— 它為了樣式也帶著 .a-check，
          排在後面就會被下面那道攔走去跑 admVerify（「檢查」），
          而那會把整間房的密文整包下載下來。實測到的症狀是「按了沒反應」，
          背景卻在跑一件完全不同、而且很吃流量的事。 */
    /* ⚠️ .a-plant 也帶著 .a-g2（共用樣式），所以**一定要判在 .a-g2 前面**，
          不然按「植物」會跑去開第二道密碼的設定盤（v54 那顆坑的翻版）。 */
    const pl = e.target.closest(".a-plant");
    if (pl) { e.preventDefault(); admPlantOpen(Number(pl.dataset.i)); return; }
    /* v61：LINE 審核的幾顆鈕（都掛著 .a-g2 共用樣式，所以**一定要判在 .a-g2 前面**） */
    const aOn = e.target.closest(".a-acl-on");
    if (aOn) {
      e.preventDefault();
      const i = Number(aOn.dataset.i), r = Adm.rooms[i];
      if (r) admAclWrite(i, (f) => f.set(f.ref(f.db, `acl/${r.roomId}/on`), !r.acl.on), "已更新 LINE 審核設定");
      return;
    }
    const aOk = e.target.closest(".a-acl-ok");
    if (aOk) { e.preventDefault(); admAclSet(Number(aOk.dataset.i), aOk.dataset.uid, aOk.dataset.v === "1"); return; }
    const aDel = e.target.closest(".a-acl-del");
    if (aDel) { e.preventDefault(); admAclDrop(Number(aDel.dataset.i), aDel.dataset.uid); return; }
    const acl = e.target.closest(".a-acl");
    if (acl) { e.preventDefault(); const r = Adm.rooms[Number(acl.dataset.i)]; if (r) { r.aclOpen = !r.aclOpen; admRender(); } return; }
    const g2 = e.target.closest(".a-g2");
    if (g2) { e.preventDefault(); admG2Open(Number(g2.dataset.i)); return; }
    const chk = e.target.closest(".a-check");
    if (chk) { e.preventDefault(); admVerify(Number(chk.dataset.i)); return; }
    const w = e.target.closest(".a-who-btn");
    if (w) { e.preventDefault(); admWho(Number(w.dataset.i)); return; }
    /* v53：認得／刪除／復原。
       ⚠️ 一定要排在 .a-wipe 那道 return 前面，不然這三顆按鈕全部按不動。 */
    const ok = e.target.closest(".a-dev-ok");
    if (ok) { e.preventDefault(); admDevKnow(Number(ok.dataset.i), ok.dataset.cid); return; }
    const del = e.target.closest(".a-dev-del");
    if (del) { e.preventDefault(); admDevDrop(Number(del.dataset.i), del.dataset.cid); return; }
    if (!e.target.closest(".a-wipe")) return;
    e.preventDefault();
    if (fired) { fired = false; return; }
    toast("按住 2 秒才會清空");
  });
}
