// 分享链接：把整份礼物压缩进链接（#/g/…），不需要服务器或数据库。
// 网站部署到任意静态托管后，这个链接可以在任何设备上打开。
import { normalize } from './store.js';
import { giftYear } from './data/days.js';

const FIELDS = ['to', 'from', 'anonymous', 'relationship', 'scene', 'sceneText', 'detail', 'worldKey', 'days', 'endOn', 'allowEarly',
  'treeStyle', 'ornPalette', 'starStyle', 'notes', 'doorEdits', 'letter', 'finalWish', 'coverLine', 'photos'];

const b64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function pipe(bytes, Stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw')));
  return new Uint8Array(await out.arrayBuffer());
}

// 分享前再把照片压小一点，让链接不至于太长
function shrinkDataUrl(src, size = 150, q = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function encodeGift(d, { withPhotos = true } = {}) {
  const obj = { v: 1, year: d.year || giftYear() };
  for (const f of FIELDS) {
    const v = d[f];
    if (v === '' || v == null || v === false) continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    obj[f] = v;
  }
  if (obj.photos) obj.photos = withPhotos ? (await Promise.all(obj.photos.map((p) => shrinkDataUrl(p)))).filter(Boolean) : undefined;
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream !== 'undefined') return 'z' + b64url(await pipe(bytes, CompressionStream));
  return 'j' + b64url(bytes);
}

export async function decodeGift(token) {
  const kind = token[0];
  let bytes = unb64url(token.slice(1));
  if (kind === 'z') bytes = await pipe(bytes, DecompressionStream);
  else if (kind !== 'j') throw new Error('无法识别的礼物链接');
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  return normalize({ ...obj, worldIndex: 0, needsWeave: false });
}

// 礼物编号：用于在收礼人浏览器里分别保存进度
export function giftId(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) { h ^= token.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export const shareUrl = (token) => `${location.origin}${location.pathname}#/g/${token}`;
export const isLocalHost = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
