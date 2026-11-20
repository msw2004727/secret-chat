import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = src.indexOf('function appleTouchPoster()');
const end = src.indexOf('async function sendPhotos(');
assert.ok(start > 0 && end > start);
const body = src.slice(start, end);
assert.doesNotMatch(body, /currentTime\s*=\s*1e[0-9]+/);
assert.doesNotMatch(body.slice(0, body.indexOf('async function buildVideo')), /arrayBuffer\(/);
assert.match(body, /preload = "metadata"/);
assert.match(body, /loadedmetadata/);
assert.match(body, /revokeObjectURL/);
assert.match(body, /v\.pause\(\)/);
assert.match(body, /v\.load\(\)/);
assert.match(body, /ios \? 1200 : 2000/);
assert.match(body, /w \* h > 1920 \* 1080/);
assert.match(body, /info\.poster \|\| ""/);
assert.match(body, /await probeVideo\(file\)/);
assert.match(body, /const plain = await file\.arrayBuffer\(\)/);

const state = {
  ua: '', touch: 0, w: 0, h: 0, duration: 0, seekable: null, clampTo: 0,
  meta: 'auto', seek: 'auto', poster: 'webp', draw: 'ok', onSeek: null,
  videos: [], draws: [], contexts: [], reads: 0,
};
const revoked = [];
const timers = [];
const delays = [];
let seq = 1;

function reset(over = {}) {
  Object.assign(state, {
    ua: 'Mozilla/5.0 (Macintosh)', touch: 0, w: 1280, h: 720, duration: 4,
    seekable: null, clampTo: 0, meta: 'auto', seek: 'auto', poster: 'webp',
    draw: 'ok', onSeek: null, reads: 0,
  }, over);
  state.videos.length = 0;
  state.draws.length = 0;
  state.contexts.length = 0;
  revoked.length = 0;
  timers.length = 0;
  delays.length = 0;
}

function makeVideo() {
  const listeners = {};
  let srcValue = '';
  let current = 0;
  let duration = state.duration;
  const video = {
    preload: '', muted: false, defaultMuted: false, playsInline: false, autoplay: false,
    videoWidth: state.w, videoHeight: state.h, readyState: 2,
    width: 0, height: 0, paused: true, loaded: 0, removed: false, seeks: [],
    seekable: state.seekable || { length: 0, end() { return 0; } },
    srcObject: null,
    setAttribute() {},
    removeAttribute(name) { if (name === 'src') srcValue = ''; },
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    removeEventListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); },
    pause() { video.paused = true; },
    load() { video.loaded++; },
    remove() { video.removed = true; },
  };
  const emit = (ev) => { for (const fn of [...(listeners[ev] || [])]) fn(); };
  Object.defineProperty(video, 'src', {
    get() { return srcValue; },
    set(val) {
      srcValue = String(val || '');
      if (srcValue && state.meta === 'auto') queueMicrotask(() => emit('loadedmetadata'));
    },
  });
  Object.defineProperty(video, 'currentTime', {
    get() { return current; },
    set(t) {
      current = state.clampTo ? Math.min(Number(t), state.clampTo) : Number(t);
      video.seeks.push(current);
      if (state.onSeek) state.onSeek(video, current);
      if (state.seek === 'auto') queueMicrotask(() => emit('seeked'));
    },
  });
  Object.defineProperty(video, 'duration', {
    get() { return duration; },
    set(val) { duration = val; },
  });
  state.videos.push(video);
  return video;
}

function makeCanvas() {
  const cv = {
    width: 0,
    height: 0,
    getContext(_type, opts) {
      state.contexts.push(opts || {});
      return {
        drawImage(src) {
          state.draws.push({ src, cw: cv.width, ch: cv.height });
          if (state.draw === 'throw') throw new Error('draw');
        },
      };
    },
    toDataURL(type) {
      if (state.poster === 'throw') throw new Error('encode');
      if (state.poster === 'short') return 'data:image/webp;base64,AA';
      if (state.poster === 'png' && type === 'image/webp') return 'data:image/png;base64,' + 'A'.repeat(220);
      const kind = state.poster === 'png' ? type : 'image/webp';
      return 'data:' + kind + ';base64,' + 'C'.repeat(240);
    },
  };
  return cv;
}

const ctx = vm.createContext({
  CFG: { videoPosterSize: 480, videoPosterQuality: 0.7, videoPosterAt: 0.6, videoMaxSeconds: 30, videoMaxUploadMB: 50 },
  URL: { createObjectURL() { return 'blob:fake'; }, revokeObjectURL(u) { revoked.push(u); } },
  document: { createElement(tag) { return tag === 'video' ? makeVideo() : makeCanvas(); } },
  navigator: { get userAgent() { return state.ua; }, get maxTouchPoints() { return state.touch; } },
  queueMicrotask,
  setTimeout(fn, ms) { const id = seq++; delays.push(ms); timers.push({ id, fn }); return id; },
  clearTimeout(id) { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
  Uint8Array, Blob,
  crypto: { getRandomValues: (a) => a, subtle: { encrypt: async () => new ArrayBuffer(4) } },
  S: { fb: { storage: {}, st: { ref: () => ({}), uploadBytesResumable: () => ({ on(_n, _p, _e, done) { done(); } }) } }, roomId: 'fixture', key: {} },
  Media: { put() {} },
  mediaId: () => 'mid',
  b64: () => 'iv',
});
vm.runInContext(body + '\nglobalThis.probeVideo=probeVideo;globalThis.buildVideo=buildVideo;', ctx);

function fakeFile(size = 2048) {
  return { size, type: 'video/mp4', name: 'clip.mp4', async arrayBuffer() { state.reads++; return new ArrayBuffer(8); } };
}

async function settle(pending) {
  for (let i = 0; i < 40; i++) await Promise.resolve();
  const due = timers.splice(0, timers.length);
  for (const t of due) t.fn();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  return pending;
}

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15';

reset();
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.dur, 4);
  assert.equal(info.w, 1280);
  assert.equal(info.h, 720);
  assert.match(info.poster, /^data:image\/webp;base64,/);
  assert.ok(info.poster.length >= 200);
  assert.deepEqual(state.draws, [{ src: state.videos[0], cw: 480, ch: 270 }]);
  assert.equal(state.contexts[0].willReadFrequently, false);
  assert.deepEqual(state.videos[0].seeks, [0.6]);
  assert.equal(state.videos[0].paused, true);
  assert.equal(state.videos[0].src, '');
  assert.equal(state.videos[0].loaded, 1);
  assert.equal(state.videos[0].removed, true);
  assert.deepEqual(revoked, ['blob:fake']);
  assert.equal(state.reads, 0);
  assert.ok(delays.includes(20000));
  assert.ok(delays.includes(2000));
  assert.ok(!delays.includes(1200));
  assert.ok(!delays.some((ms) => ms >= 8000 && ms < 20000));
}

reset({ ua: iphone, w: 640, h: 360, duration: 5 });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.dur, 5);
  assert.match(info.poster, /^data:image\/webp/);
  assert.deepEqual(state.draws[0], { src: state.videos[0], cw: 320, ch: 180 });
  assert.equal(state.contexts[0].willReadFrequently, true);
  assert.deepEqual(state.videos[0].seeks, [0.6]);
  assert.ok(delays.includes(1200));
  assert.ok(!delays.includes(2000));
  assert.deepEqual(revoked, ['blob:fake']);
}

reset({ w: 3840, h: 2160, duration: 6 });
{
  const info = await settle(ctx.probeVideo(fakeFile(40 * 1024 * 1024)));
  assert.equal(info.poster, null);
  assert.equal(info.dur, 6);
  assert.equal(info.w, 3840);
  assert.equal(state.draws.length, 0);
  assert.equal(state.contexts.length, 0);
  assert.deepEqual(state.videos[0].seeks, []);
  assert.deepEqual(revoked, ['blob:fake']);
  assert.equal(state.videos[0].removed, true);
}

reset({ seek: 'never', w: 320, h: 180, duration: 3 });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.poster, null);
  assert.equal(info.dur, 3);
  assert.equal(state.draws.length, 0);
  assert.deepEqual(revoked, ['blob:fake']);
  assert.equal(state.videos[0].src, '');
  assert.ok(delays.includes(2000));
}

reset({ meta: 'never' });
{
  await assert.rejects(settle(ctx.probeVideo(fakeFile())), /sc\/video-timeout/);
  assert.deepEqual(revoked, ['blob:fake']);
  assert.equal(state.videos[0].removed, true);
  assert.equal(state.reads, 0);
}

reset({ draw: 'throw' });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.poster, null);
  assert.equal(info.dur, 4);
  assert.deepEqual(revoked, ['blob:fake']);
}

reset({ poster: 'throw' });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.poster, null);
  assert.equal(info.dur, 4);
}

reset({ poster: 'short' });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.poster, null);
}

reset({ poster: 'png' });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.match(info.poster, /^data:image\/jpeg/);
}

reset({ duration: Infinity, seekable: { length: 1, end() { return 9; } } });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.dur, 9);
  assert.deepEqual(state.videos[0].seeks, [0.6]);
  assert.ok(!state.videos[0].seeks.some((t) => t > 5));
}

reset({ duration: Infinity, onSeek(video, t) { if (t > 10) video.duration = 8; } });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.dur, 8);
  assert.equal(state.videos[0].seeks[0], 31);
  assert.ok(state.videos[0].seeks.every((t) => t <= 31));
}

reset({ duration: Infinity, clampTo: 8 });
{
  const info = await settle(ctx.probeVideo(fakeFile()));
  assert.equal(info.dur, 8);
  assert.ok(state.videos[0].seeks[0] <= 8);
}

reset({ ua: iphone, w: 3840, h: 2160, duration: 6 });
{
  const payload = await settle(ctx.buildVideo(fakeFile(30 * 1024 * 1024)));
  assert.equal(payload.k, 'vd');
  assert.equal(payload.d, '');
  assert.equal(payload.du, 6);
  assert.equal(payload.w, 3840);
  assert.equal(state.reads, 1);
  assert.equal(state.draws.length, 0);
  assert.deepEqual(revoked, ['blob:fake']);
  assert.equal(state.videos[0].removed, true);
}

reset({ seek: 'never', ua: iphone, w: 640, h: 360, duration: 4 });
{
  const payload = await settle(ctx.buildVideo(fakeFile()));
  assert.equal(payload.k, 'vd');
  assert.equal(payload.d, '');
  assert.equal(payload.du, 4);
  assert.equal(payload.mt, 'video/mp4');
  assert.equal(state.reads, 1);
  assert.equal(state.draws.length, 0);
  assert.ok(delays.includes(1200));
  assert.equal(state.videos[0].src, '');
}

reset({ duration: 48, w: 320, h: 180 });
{
  await assert.rejects(settle(ctx.buildVideo(fakeFile())), (err) => err.message === 'sc/too-long' && err.scDur === 48);
  assert.equal(state.reads, 0);
  assert.deepEqual(revoked, ['blob:fake']);
}

reset();
{
  const payload = await settle(ctx.buildVideo(fakeFile()));
  assert.equal(payload.k, 'vd');
  assert.match(payload.d, /^data:image\/webp/);
  assert.equal(payload.du, 4);
  assert.equal(state.reads, 1);
}

console.log('PASS: video poster seeks a short time, caps the canvas, drops huge frames, releases the element, and still sends when the poster fails.');
