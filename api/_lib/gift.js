// 礼物数据的校验与清洗：只保存白名单字段，限制长度，防止收礼人或他人写入任意内容
import { HttpError } from './db.js';

const RELATIONSHIPS = ['love', 'friend', 'family', 'child', 'colleague', 'self', 'special'];
const SCENES = ['snow', 'forest', 'station', 'secret'];
const TREE_STYLES = ['painted', 'handmade', 'starlight'];
const PALETTES = ['classic', 'dusty', 'market'];
const STARS = ['classic', 'snow', 'heart'];
const FORMATS = ['story', 'question', 'task', 'song', 'blessing', 'memory'];
const ACTS = ['answer', 'done', 'song'];

const str = (v, max) => (typeof v === 'string' ? v.replace(/\u0000/g, '').slice(0, max) : '');
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);

export const ID_RE = /^[A-Za-z0-9]{8,24}$/;

export function newId(len = 10) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

function validTz(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return 'Asia/Shanghai';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'Asia/Shanghai'; }
}

export function sanitizeGift(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, '礼物内容为空');
  const to = str(input.to, 16).trim();
  if (!to) throw new HttpError(400, '请写下收礼人的称呼');
  const days = Math.max(3, Math.min(31, parseInt(input.days, 10) || 12));
  const now = new Date();
  const year = Number.isInteger(input.year) && Math.abs(input.year - now.getUTCFullYear()) <= 1 ? input.year : now.getUTCFullYear();

  const notes = {};
  if (input.notes && typeof input.notes === 'object') {
    for (const [k, v] of Object.entries(input.notes).slice(0, 31)) {
      const day = parseInt(k, 10);
      const text = str(v, 60).trim();
      if (day >= 1 && day < days && text) notes[day] = text;
    }
  }

  const doors = Array.isArray(input.doors)
    ? input.doors.slice(0, days - 1).map((x) => ({
      f: oneOf(x?.f, FORMATS, 'story'),
      title: str(x?.title, 40).trim() || '今天的门',
      body: str(x?.body, 400).trim(),
      ...(ACTS.includes(x?.act) ? { act: x.act } : {}),
    }))
    : [];

  return {
    v: 2,
    to,
    from: str(input.from, 16).trim(),
    anonymous: !!input.anonymous,
    relationship: oneOf(input.relationship, RELATIONSHIPS, null),
    scene: oneOf(input.scene, SCENES, 'snow'),
    sceneText: str(input.sceneText, 120),
    detail: str(input.detail, 80),
    worldKey: /^(snow|forest|station|secret)-(a|b)$/.test(input.worldKey) ? input.worldKey : 'snow-a',
    days,
    endOn: input.endOn === 'eve' ? 'eve' : 'christmas',
    allowEarly: !!input.allowEarly,
    treeStyle: oneOf(input.treeStyle, TREE_STYLES, 'painted'),
    ornPalette: oneOf(input.ornPalette, PALETTES, 'classic'),
    starStyle: oneOf(input.starStyle, STARS, 'classic'),
    notes,
    doors,
    letter: str(input.letter, 300),
    finalWish: str(input.finalWish, 500),
    coverLine: str(input.coverLine, 30),
    year,
    timezone: validTz(input.timezone),
    photos: [],
  };
}

// 解析照片 dataURL（最多 3 张，每张不超过 900KB）
export function parsePhotos(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 3).map((src, i) => {
    const m = typeof src === 'string' && src.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new HttpError(400, `第 ${i + 1} 张照片格式不对`);
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 900 * 1024) throw new HttpError(413, `第 ${i + 1} 张照片太大了`);
    return { buf, type: `image/${m[1]}`, ext: m[1] === 'jpeg' ? 'jpg' : m[1] };
  });
}

// 按礼物创建者所在时区计算“今天是第几天”（服务器端解锁判断）
export function todayIndex(g, now = new Date()) {
  const endDay = g.endOn === 'eve' ? 24 : 25;
  const start = Date.UTC(g.year, 11, endDay - g.days + 1);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: g.timezone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.min(g.days, Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000) + 1);
}

export function emptyProgress() {
  return { welcomed: false, opened: [], starPlaced: false, answers: {}, done: {} };
}
