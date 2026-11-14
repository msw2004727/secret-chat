/* 聊天室兩側位置。只給房間成員用房間金鑰解開，跟首頁 loc/ 回報無關。
   超過 12 小時的紀錄當成沒有，看到的人要把它刪掉。 */

export const PAIR_LOC_STALE_MS = 43200 * 1000;

export function pairLocAgeSec(t, now) {
  const stamp = Number(t);
  const at = Number(now);
  if (!Number.isFinite(stamp) || !Number.isFinite(at)) return null;
  return Math.floor((at - stamp) / 1000);
}

export function pairLocFresh(t, now) {
  const age = pairLocAgeSec(t, now);
  return age !== null && age >= 0 && age < 43200;
}

export function pairLocClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  if (s <= 99) return String(s);
  const pad = (n) => (n < 10 ? "0" + n : String(n));
  if (s < 3600) return Math.floor(s / 60) + ":" + pad(s % 60);
  const h = Math.floor(s / 3600);
  return h + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
}

export function pairLocDistance(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return "";
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  if (meters < 1000) return Math.max(1, Math.round(meters)) + "m";
  const km = meters / 1000;
  return (km < 10 ? km.toFixed(1) : String(Math.round(km))) + "km";
}
