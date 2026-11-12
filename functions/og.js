/* 網址縮圖代理用的純函式。
   只負責「這條網址能不能抓、抓回來的 HTML 裡標題和圖在哪」。
   不寫資料庫、不記網址到任何持久儲存。 */

const net = require("node:net");

const HTML_LIMIT = 512 * 1024;
const IMAGE_LIMIT = 3 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const MAX_URL = 2048;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function youtubeId(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return ""; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const idOk = (id) => /^[A-Za-z0-9_-]{11}$/.test(id || "");
  if (host === "youtu.be") {
    const id = (url.pathname.split("/").filter(Boolean)[0] || "");
    return idOk(id) ? id : "";
  }
  if (host !== "youtube.com" && host !== "m.youtube.com") return "";
  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v") || "";
    return idOk(id) ? id : "";
  }
  const shorts = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})(?:\/|$)/);
  return shorts ? shorts[1] : "";
}

function ipv4Parts(ip) {
  const p = String(ip).split(".");
  if (p.length !== 4) return null;
  const n = [];
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = Number(part);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n.push(v);
  }
  return n;
}

function ipv4Blocked(ip) {
  const p = ipv4Parts(ip);
  if (!p) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127 || a === 255) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function expandIPv6(ip) {
  const raw = String(ip).toLowerCase().split("%")[0];
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return { v4: mapped[1] };
  const halves = raw.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && head.length !== 8) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  const parts = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (parts.length !== 8) return null;
  const nums = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    nums.push(parseInt(part, 16));
  }
  return { parts: nums };
}

function ipBlocked(ip) {
  const raw = String(ip || "").trim().toLowerCase().split("%")[0];
  if (!raw) return true;
  if (raw.includes(".")) {
    if (ipv4Parts(raw)) return ipv4Blocked(raw);
    const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? ipv4Blocked(mapped[1]) : true;
  }
  const exp = expandIPv6(raw);
  if (!exp) return true;
  if (exp.v4) return ipv4Blocked(exp.v4);
  const p = exp.parts;
  if (p.every((n) => n === 0)) return true;
  if (p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0 && p[4] === 0 && p[5] === 0 && p[6] === 0 && p[7] === 1) return true;
  if (p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0 && p[4] === 0 && p[5] === 0xffff) {
    const v4 = `${p[6] >> 8}.${p[6] & 255}.${p[7] >> 8}.${p[7] & 255}`;
    return ipv4Blocked(v4);
  }
  if ((p[0] & 0xfe00) === 0xfc00) return true;
  if ((p[0] & 0xffc0) === 0xfe80) return true;
  return false;
}

function header(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    const v = headers.get(name);
    return v == null ? "" : String(v);
  }
  const want = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== want) continue;
    const v = headers[key];
    return Array.isArray(v) ? String(v[0] || "") : String(v || "");
  }
  return "";
}

/* 基本濫用門檻：瀏覽器同源請求會帶 Sec-Fetch-Site，
   或者帶得上跟這次 Host 相同的 Origin／Referer。
   沒有這些的直接呼叫（例如拿函式網址當開放代理）直接拒絕。 */
function allowedCaller(headers) {
  if (header(headers, "sec-fetch-site").toLowerCase() === "same-origin") return true;
  const host = (header(headers, "x-forwarded-host") || header(headers, "host")).split(",")[0].trim().toLowerCase();
  if (!host) return false;
  for (const name of ["origin", "referer"]) {
    const value = header(headers, name);
    if (!value) continue;
    try {
      if (new URL(value).host.toLowerCase() === host) return true;
    } catch (_) {}
  }
  return false;
}

async function checkUrl(raw, lookup) {
  if (typeof raw !== "string" || !raw || raw.length > MAX_URL) throw fail(400, "url");
  let url;
  try { url = new URL(raw); } catch { throw fail(400, "url"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw fail(400, "protocol");
  if (url.username || url.password) throw fail(400, "userinfo");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")
      || host === "metadata.google.internal" || host === "metadata.google.com") {
    throw fail(403, "host");
  }
  let addrs;
  if (net.isIP(host)) addrs = [{ address: host, family: net.isIP(host) }];
  else {
    try { addrs = await lookup(host, { all: true, verbatim: true }); }
    catch { throw fail(403, "dns"); }
  }
  if (!Array.isArray(addrs) || !addrs.length) throw fail(403, "dns");
  for (const item of addrs) {
    if (!item || ipBlocked(item.address)) throw fail(403, "ip");
  }
  const address = String(addrs[0].address);
  const family = Number(addrs[0].family) === 6 || address.includes(":") ? 6 : 4;
  return { url, address, family };
}

function lowerHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[String(key).toLowerCase()] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

function defaultRequest(target, { accept, timeout, maxBytes }) {
  const http = require("node:http");
  const https = require("node:https");
  return new Promise((resolve, reject) => {
    const lib = target.url.protocol === "https:" ? https : http;
    const req = lib.request({
      protocol: target.url.protocol,
      hostname: target.url.hostname,
      port: target.url.port || undefined,
      path: `${target.url.pathname}${target.url.search}` || "/",
      method: "GET",
      headers: {
        Host: target.url.host,
        "User-Agent": "secret-chat-preview",
        Accept: accept || "*/*",
      },
      timeout,
      servername: target.url.hostname,
      lookup(hostname, options, cb) {
        if (typeof options === "function") cb = options;
        cb(null, target.address, target.family);
      },
    }, (res) => {
      const code = res.statusCode || 0;
      if (code === 301 || code === 302 || code === 303 || code === 307 || code === 308) {
        res.resume();
        resolve({ statusCode: code, headers: res.headers, body: Buffer.alloc(0) });
        return;
      }
      const chunks = [];
      let size = 0;
      let tooBig = false;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          tooBig = true;
          res.destroy();
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ statusCode: code, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", (err) => reject(tooBig ? fail(413, "too big") : err));
      res.on("aborted", () => { if (tooBig) reject(fail(413, "too big")); });
    });
    req.on("timeout", () => req.destroy(fail(504, "timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function retrieve(raw, opts = {}) {
  const lookup = opts.lookup;
  if (!lookup) throw fail(500, "lookup");
  const request = opts.request || defaultRequest;
  const maxBytes = opts.maxBytes;
  const deadline = Date.now() + (opts.timeoutMs || TIMEOUT_MS);
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const left = deadline - Date.now();
    if (left <= 0) throw fail(504, "timeout");
    const target = await checkUrl(current, lookup);
    const res = await request(target, { accept: opts.accept, timeout: left, maxBytes });
    const code = res.statusCode || 0;
    const headers = lowerHeaders(res.headers);
    if (code === 301 || code === 302 || code === 303 || code === 307 || code === 308) {
      if (!headers.location) throw fail(502, "redirect");
      current = new URL(headers.location, target.url).href;
      continue;
    }
    if (code < 200 || code >= 300) throw fail(502, "status");
    const body = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body || "");
    if (body.length > maxBytes) throw fail(413, "too big");
    return { body, headers, finalUrl: target.url.href };
  }
  throw fail(502, "redirect");
}

function decodeEntities(value) {
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, ent) => {
    if (ent[0] === "#") {
      const hex = ent[1] === "x" || ent[1] === "X";
      const cp = parseInt(ent.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return all;
      try { return String.fromCodePoint(cp); } catch { return all; }
    }
    const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
    return Object.prototype.hasOwnProperty.call(named, ent.toLowerCase()) ? named[ent.toLowerCase()] : all;
  });
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function stripBlocks(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function metaContent(html) {
  const found = new Map();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const match of tag.matchAll(/([^\s=/"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    const key = String(attrs.property || attrs.name || "").toLowerCase();
    if (key && attrs.content && !found.has(key)) found.set(key, attrs.content);
  }
  return found;
}

function parseOg(html, pageUrl) {
  const src = stripBlocks(html).slice(0, HTML_LIMIT);
  const meta = metaContent(src);
  const titleMatch = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(meta.get("og:title") || meta.get("twitter:title") || (titleMatch ? titleMatch[1] : ""));
  const imageRaw = meta.get("og:image") || meta.get("og:image:url") || meta.get("twitter:image") || "";
  let image = "";
  if (imageRaw) {
    try {
      const abs = new URL(decodeEntities(imageRaw), pageUrl);
      if (abs.protocol === "http:" || abs.protocol === "https:") image = abs.href.slice(0, MAX_URL);
    } catch (_) {}
  }
  let site = cleanText(meta.get("og:site_name") || "").slice(0, 80);
  if (!site) {
    try { site = new URL(pageUrl).hostname.replace(/^www\./i, ""); } catch { site = ""; }
  }
  return { title, image, site };
}

async function preview(raw, opts = {}) {
  const id = youtubeId(raw);
  if (id) {
    let title = "";
    const watch = `https://www.youtube.com/watch?v=${id}`;
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`;
    try {
      const got = await retrieve(endpoint, {
        ...opts,
        accept: "application/json",
        maxBytes: 64 * 1024,
      });
      const json = JSON.parse(got.body.toString("utf8"));
      title = cleanText(json && json.title);
    } catch (_) {}
    return {
      title,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      site: "youtube.com",
    };
  }
  const got = await retrieve(raw, {
    ...opts,
    accept: "text/html,application/xhtml+xml;q=0.9",
    maxBytes: HTML_LIMIT,
  });
  const type = String(got.headers["content-type"] || "");
  if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) {
    return { title: "", image: "", site: "" };
  }
  return parseOg(got.body.toString("utf8"), got.finalUrl);
}

async function image(raw, opts = {}) {
  const got = await retrieve(raw, {
    ...opts,
    accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
    maxBytes: IMAGE_LIMIT,
  });
  const type = String(got.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(type)) throw fail(415, "type");
  return { body: got.body, type };
}

module.exports = {
  youtubeId,
  ipBlocked,
  allowedCaller,
  checkUrl,
  parseOg,
  preview,
  image,
  retrieve,
  HTML_LIMIT,
  IMAGE_LIMIT,
  MAX_REDIRECTS,
};
