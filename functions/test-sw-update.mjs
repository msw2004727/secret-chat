import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');

const swInit = app.slice(app.indexOf('function initServiceWorker()'), app.indexOf('function paintUpdateBanner()'));
const reload = app.slice(app.indexOf('function maybeReload()'), app.indexOf('function initDisguise()'));

assert.match(swInit, /let hadController = !!navigator\.serviceWorker\.controller/);
assert.match(swInit, /if \(!hadController\) \{ hadController = true; return; \}/);
assert.match(swInit, /const SW_UPDATE_MS = 5 \* 60 \* 1000/);
assert.match(swInit, /setInterval\(checkSwUpdate, SW_UPDATE_MS\)/);
assert.match(swInit, /document\.addEventListener\("visibilitychange"/);
assert.match(swInit, /window\.addEventListener\("focus", checkSwUpdate\)/);
assert.match(swInit, /window\.addEventListener\("online", checkSwUpdate\)/);
assert.match(swInit, /if \(document\.hidden\) return/);
assert.match(swInit, /r && r\.update\(\)/);

assert.match(reload, /if \(Acl\.busy \|\| window\.__sq\) return/);
assert.match(reload, /if \(!\$\("chat"\)\.hidden \|\| !\$\("admin"\)\.hidden\) \{ paintUpdateBanner\(\); return; \}/);
assert.match(reload, /location\.reload\(\)/);
const inApp = reload.indexOf('paintUpdateBanner(); return;');
assert.ok(inApp > 0 && inApp < reload.indexOf('location.reload()'));

assert.match(html, /id="updateBanner"/);
assert.match(html, /有新版本，點一下更新/);
assert.match(html, /id="updateBannerGo">更新</);
assert.match(css, /-webkit-backdrop-filter:\s*blur\(16px\)/);
assert.match(css, /backdrop-filter:\s*blur\(16px\)/);
assert.match(css, /env\(safe-area-inset-top\)/);
assert.match(css, /html\[data-theme="dark"\] \.update-banner/);
assert.match(app, /\$\("updateBannerGo"\)\?\.addEventListener\("click"/);

console.log('PASS: service worker update checks stay cheap; chat and admin show a banner instead of reloading.');
