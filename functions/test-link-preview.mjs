import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const og = require("./og.js");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const firebase = JSON.parse(fs.readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
const redirect = fs.readFileSync(new URL("../domain-redirect/firebase.json", import.meta.url), "utf8");
const fnSrc = fs.readFileSync(new URL("./index.js", import.meta.url), "utf8");

const clientYoutube = new Function(`${app.slice(app.indexOf("function youtubeId(raw)"), app.indexOf("function firstHttpUrl"))}; return youtubeId;`)();

const samples = [
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://youtube.com/watch?v=dQw4w9WgXcQ&list=abc", "dQw4w9WgXcQ"],
  ["https://m.youtube.com/watch?v=Pasta10mins", "Pasta10mins"],
  ["https://youtu.be/Pasta10mins", "Pasta10mins"],
  ["https://youtu.be/Pasta10mins?si=abc", "Pasta10mins"],
  ["https://www.youtube.com/shorts/abcdefghijk", "abcdefghijk"],
  ["https://m.youtube.com/shorts/abcdefghijk/", "abcdefghijk"],
  ["http://music.youtube.com/watch?v=dQw4w9WgXcQ", ""],
  ["https://example.com/watch?v=dQw4w9WgXcQ", ""],
  ["https://youtu.be/short", ""],
  ["https://youtube.com/watch?v=not-an-id!", ""],
  ["notaurl", ""],
];
for (const [input, id] of samples) {
  assert.equal(og.youtubeId(input), id, input);
  assert.equal(clientYoutube(input), id, "client " + input);
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'）)】」，,。]+/g;
function firstHttpUrl(text) {
  const found = new RegExp(URL_RE.source, "g").exec(String(text ?? ""));
  return found ? found[0] : "";
}
assert.equal(firstHttpUrl("看 https://a.example/x 還有 https://b.example/y"), "https://a.example/x");
assert.equal(firstHttpUrl("純文字"), "");
assert.match(app, /function firstHttpUrl\(text\)/);
assert.match(app, /const re = new RegExp\(URL_RE\.source, "g"\)/);

assert.equal(og.ipBlocked("127.0.0.1"), true);
assert.equal(og.ipBlocked("10.1.2.3"), true);
assert.equal(og.ipBlocked("192.168.1.9"), true);
assert.equal(og.ipBlocked("172.16.0.1"), true);
assert.equal(og.ipBlocked("172.31.255.255"), true);
assert.equal(og.ipBlocked("172.15.0.1"), false);
assert.equal(og.ipBlocked("172.32.0.1"), false);
assert.equal(og.ipBlocked("169.254.169.254"), true);
assert.equal(og.ipBlocked("0.0.0.0"), true);
assert.equal(og.ipBlocked("8.8.8.8"), false);
assert.equal(og.ipBlocked("::1"), true);
assert.equal(og.ipBlocked("::"), true);
assert.equal(og.ipBlocked("fe80::1"), true);
assert.equal(og.ipBlocked("fc00::1"), true);
assert.equal(og.ipBlocked("fd12::1"), true);
assert.equal(og.ipBlocked("::ffff:127.0.0.1"), true);
assert.equal(og.ipBlocked("::ffff:7f00:1"), true);
assert.equal(og.ipBlocked("2001:4860:4860::8888"), false);

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];
await og.checkUrl("https://example.com/a", publicLookup);
await assert.rejects(() => og.checkUrl("http://127.0.0.1/", publicLookup), (err) => err.status === 403);
await assert.rejects(() => og.checkUrl("http://[::1]/", publicLookup), (err) => err.status === 403);
await assert.rejects(() => og.checkUrl("http://169.254.169.254/latest/meta-data", publicLookup), (err) => err.status === 403);
await assert.rejects(() => og.checkUrl("file:///etc/passwd", publicLookup), (err) => err.status === 400);
await assert.rejects(() => og.checkUrl("http://user:pass@example.com/", publicLookup), (err) => err.status === 400);
await assert.rejects(() => og.checkUrl("http://localhost/", publicLookup), (err) => err.status === 403);
await assert.rejects(() => og.checkUrl("http://metadata.google.internal/", publicLookup), (err) => err.status === 403);
await assert.rejects(
  () => og.checkUrl("https://rebind.example/", async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]),
  (err) => err.status === 403,
);

let redirected = 0;
await assert.rejects(() => og.retrieve("http://example.com/start", {
  lookup: publicLookup,
  maxBytes: 1000,
  accept: "text/html",
  request: async (target) => {
    redirected++;
    assert.notEqual(target.address, "127.0.0.1");
    return { statusCode: 302, headers: { location: "http://127.0.0.1/secret" }, body: Buffer.alloc(0) };
  },
}), (err) => err.status === 403);
assert.equal(redirected, 1);

let hops = 0;
await assert.rejects(() => og.retrieve("http://example.com/loop", {
  lookup: publicLookup,
  maxBytes: 100,
  request: async () => {
    hops++;
    return { statusCode: 302, headers: { location: "http://example.com/loop" }, body: Buffer.alloc(0) };
  },
}), (err) => err.status === 502);
assert.equal(hops, og.MAX_REDIRECTS + 1);

const parsed = og.parseOg(`
  <html><head>
    <script>var x = "<title>壞的</title><meta property=\\"og:title\\" content=\\"script\\">";</script>
    <meta content="在家做歐式麵包：溫度、時間與麵粉怎麼配" property="og:title">
    <meta property="og:image" content="/img/bread.jpg">
    <meta property="og:site_name" content="Example News">
    <title>不該用這個</title>
  </head></html>`, "https://example-news.com/bread");
assert.equal(parsed.title, "在家做歐式麵包：溫度、時間與麵粉怎麼配");
assert.equal(parsed.image, "https://example-news.com/img/bread.jpg");
assert.equal(parsed.site, "Example News");
assert.doesNotMatch(parsed.title, /壞的|script/);

const twitter = og.parseOg(
  `<meta name="twitter:image" content="//cdn.example/a.png"><title>只有標題 &amp; 符號</title>`,
  "https://www.example.com/p",
);
assert.equal(twitter.title, "只有標題 & 符號");
assert.equal(twitter.image, "https://cdn.example/a.png");
assert.equal(twitter.site, "example.com");

const preview = await og.preview("https://youtu.be/dQw4w9WgXcQ", {
  lookup: async () => [{ address: "142.250.1.1", family: 4 }],
  request: async (target) => {
    assert.match(target.url.href, /youtube\.com\/oembed/);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify({ title: "十分鐘義大利麵" })),
    };
  },
});
assert.equal(preview.title, "十分鐘義大利麵");
assert.equal(preview.image, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
assert.equal(preview.site, "youtube.com");

const page = await og.preview("https://example.com/story", {
  lookup: publicLookup,
  request: async () => ({
    statusCode: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: Buffer.from(`<meta property="og:title" content="一篇"><meta property="og:image" content="https://cdn.example/p.jpg">`),
  }),
});
assert.equal(page.title, "一篇");
assert.equal(page.image, "https://cdn.example/p.jpg");

await assert.rejects(() => og.image("https://example.com/x", {
  lookup: publicLookup,
  request: async () => ({ statusCode: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<html></html>") }),
}), (err) => err.status === 415);
const img = await og.image("https://cdn.example/p.jpg", {
  lookup: publicLookup,
  request: async () => ({ statusCode: 200, headers: { "content-type": "image/jpeg" }, body: Buffer.from("jpeg") }),
});
assert.equal(img.type, "image/jpeg");
await assert.rejects(() => og.retrieve("https://example.com/big", {
  lookup: publicLookup,
  maxBytes: 8,
  request: async () => ({ statusCode: 200, headers: { "content-type": "text/html" }, body: Buffer.alloc(og.HTML_LIMIT + 1) }),
}), (err) => err.status === 413);

assert.equal(og.allowedCaller({ "sec-fetch-site": "same-origin" }), true);
assert.equal(og.allowedCaller({ origin: "https://sb.02251121.com", "x-forwarded-host": "sb.02251121.com" }), true);
assert.equal(og.allowedCaller({ referer: "https://evil.test/api/og", host: "sb.02251121.com" }), false);
assert.equal(og.allowedCaller({}), false);
assert.equal(og.allowedCaller({ "sec-fetch-site": "cross-site", origin: "https://evil.test" }), false);

const previewSrc = app.slice(app.indexOf("function youtubeId(raw)"), app.indexOf("function paintJump("));
assert.doesNotMatch(previewSrc, /innerHTML/);
assert.match(previewSrc, /textContent/);
assert.match(previewSrc, /referrerPolicy = "no-referrer"/);
assert.match(previewSrc, /loading = "lazy"/);
assert.match(previewSrc, /\/api\/og\?url=/);
assert.match(previewSrc, /\/api\/ogimg\?url=/);
assert.match(previewSrc, /i\.ytimg\.com\/vi\//);
assert.match(previewSrc, /hqdefault\.jpg/);
assert.match(previewSrc, /noopener noreferrer nofollow/);
assert.match(previewSrc, /if \(!LinkPreview\.enabled\(\)/);
assert.match(app, /linkPreview === false/);
assert.match(app, /KEY: "sc-link-preview"/);
assert.doesNotMatch(previewSrc, /getDb|ref\(db|rooms\//);
assert.match(html, /id="setLinkPreview"/);
assert.match(html, /網址縮圖/);
assert.match(css, /\.lp-card/);
assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
assert.equal(firebase.hosting.site, "daily-notes-7bb64");
assert.equal(firebase.hosting.rewrites[0].function.functionId, "ogPreview");
assert.equal(firebase.hosting.rewrites[0].function.region, "asia-southeast1");
assert.equal(firebase.hosting.rewrites[1].source, "/api/ogimg");
assert.equal(firebase.hosting.rewrites[1].function.functionId, "ogImage");
assert.doesNotMatch(redirect, /ogPreview|ogImage|\/api\/og/);
const ogFn = fnSrc.slice(fnSrc.indexOf("async function handleOgPreview"), fnSrc.indexOf("exports.ogImage"));
assert.match(fnSrc, /exports\.ogPreview = onRequest/);
assert.match(ogFn, /public, max-age=86400/);
assert.doesNotMatch(ogFn, /getDb|ref\(/);
assert.match(fnSrc, /region: REGION, maxInstances: 3/);

console.log("PASS: link preview URL detection, SSRF blocklist, OG parser, and same-origin proxy wiring.");
