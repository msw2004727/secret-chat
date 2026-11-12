/* 解裁過邊的袋鼠 GIF。每一格都是完整畫面，方便走路時播、停下來停在第一格。 */
export const FRAME_MS = 100;
export const REF_S = 3 * 0.85;
export const QUOKKA_CSS_AT_REF = 26;

export function cssHeight(worldS) {
  return QUOKKA_CSS_AT_REF * (worldS / REF_S);
}

function lzwDecode(minSize, bytes, count) {
  const clear = 1 << minSize;
  const eoi = clear + 1;
  let size = minSize + 1;
  let next = eoi + 1;
  const dict = new Array(4096);
  const reset = () => {
    size = minSize + 1;
    next = eoi + 1;
    for (let i = 0; i < clear; i++) dict[i] = [i];
  };
  reset();
  let buf = 0, bits = 0, p = 0;
  const read = () => {
    while (bits < size) {
      if (p >= bytes.length) return eoi;
      buf |= bytes[p++] << bits;
      bits += 8;
    }
    const code = buf & ((1 << size) - 1);
    buf >>= size;
    bits -= size;
    return code;
  };
  const out = new Uint8Array(count);
  let n = 0;
  let prev = null;
  while (n < count) {
    const code = read();
    if (code === clear) { reset(); prev = null; continue; }
    if (code === eoi) break;
    let entry;
    if (code < next && dict[code]) entry = dict[code];
    else if (prev && code === next) entry = prev.concat(prev[0]);
    else break;
    for (let i = 0; i < entry.length && n < count; i++) out[n++] = entry[i];
    if (prev && next < 4096) {
      dict[next++] = prev.concat(entry[0]);
      if (next === (1 << size) && size < 12) size++;
    }
    prev = entry;
  }
  return out;
}

export function decodeQuokkaGif(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const sig = String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5]);
  if (sig !== "GIF89a" && sig !== "GIF87a") throw new Error("不是 GIF");
  let i = 6;
  const width = b[i] | (b[i + 1] << 8); i += 2;
  const height = b[i] | (b[i + 1] << 8); i += 2;
  const packed = b[i++]; i += 2;
  const gctN = (packed & 0x80) ? (1 << ((packed & 7) + 1)) : 0;
  const pal = b.subarray(i, i + gctN * 3); i += gctN * 3;
  let trans = -1;
  const frames = [];
  while (i < b.length) {
    const c = b[i++];
    if (c === 0x3b) break;
    if (c === 0x21) {
      const label = b[i++];
      if (label === 0xf9) {
        const sz = b[i++];
        const flags = b[i];
        trans = (flags & 1) ? b[i + 3] : -1;
        i += sz + 1;
      } else {
        while (true) { const n = b[i++]; if (!n) break; i += n; }
      }
    } else if (c === 0x2c) {
      i += 8;
      const ip = b[i++];
      if (ip & 0x80) i += (1 << ((ip & 7) + 1)) * 3;
      const min = b[i++];
      const parts = [];
      while (true) {
        const n = b[i++];
        if (!n) break;
        parts.push(b.subarray(i, i + n));
        i += n;
      }
      const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
      let o = 0;
      for (const part of parts) { bytes.set(part, o); o += part.length; }
      const idx = lzwDecode(min, bytes, width * height);
      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let p = 0; p < idx.length; p++) {
        const k = idx[p];
        const at = p * 4;
        if (k === trans) continue;
        const s = k * 3;
        rgba[at] = pal[s]; rgba[at + 1] = pal[s + 1]; rgba[at + 2] = pal[s + 2]; rgba[at + 3] = 255;
      }
      frames.push(rgba);
    } else break;
  }
  return { width, height, frames };
}

export function quokkaFrame(moving, now, t0, count) {
  const n = count || 7;
  if (!moving || n < 1) return 0;
  return Math.floor(Math.max(0, now - t0) / FRAME_MS) % n;
}

/* 原圖鼻子在身體中線右側（朝畫面右），棍子在左邊。
   dir > 0 是往右，沿用原圖；往左才水平翻面，鼻子才會朝移動方向。 */
export function quokkaMirror(dir) {
  return dir < 0;
}
