// 每日礼盒：日期、门的样式、挂饰和内容（第一版为本地模拟内容）
import { PALETTES } from './tree-options.js';
import { buildWorld } from './worlds.js';
import { ICON_CYCLE } from '../ui/decor.js';

export const DOOR_TYPES = ['window', 'stamp', 'envelope', 'giftbox', 'card'];
export const DOOR_TYPE_LABEL = { window: '小屋窗户', stamp: '圣诞邮票', envelope: '圣诞信封', giftbox: '小礼盒', card: '圣诞贺卡' };
const DOOR_COLORS = ['#B62935', '#6F93A8', '#795747', '#8E1F2A', '#5E8468'];

export const ORNAMENT_NAMES = {
  ball: '圣诞球', star: '小星星', bell: '金色铃铛', bow: '红色蝴蝶结', snowflake: '雪花',
  gift: '小礼物', envelope: '迷你信封', keepsake: '纪念之心', photo: '照片挂饰', topstar: '树顶星星',
};
const ORN_CYCLE = ['ball', 'bell', 'snowflake', 'bow', 'star', 'gift', 'envelope', 'ball', 'keepsake'];

export const FORMAT_LABEL = { story: '一段故事', question: '一个问题', task: '一件小事', song: '一首歌', blessing: '一句祝福', memory: '一段回忆', final: '最后的礼物' };

// 按情绪弧线排列：抵达 → 发现 → 变化 → 高潮。天数少时等距抽取，自动压缩弧线。
const POOL = [
  { f: 'story', title: '第一盏灯亮了', body: '{world}里，有一盏灯在今天夜里亮了。它不急，只是安静地等着，等{to}推开第一扇门。' },
  { f: 'question', title: '冬天的第一个画面', body: '如果只能留下一个冬天的画面，你会留下哪一个？', act: 'answer' },
  { f: 'blessing', title: '给今天的一句话', body: '愿你今天出门时，风刚好不冷，路上刚好有一盏为你亮着的灯。' },
  { f: 'task', title: '去看看窗外', body: '今天找一个时刻，停下来看三十秒窗外。什么都不用想。', act: 'done' },
  { f: 'song', title: '适合下雪时听的歌', body: '这首歌留给今晚。戴上耳机，把音量调到刚好能听见雪落的声音。', act: 'song' },
  { f: 'story', title: '一张没有署名的纸条', body: '门缝里塞着一张纸条，上面只写了一句：“我一直记得。”这句话，还会在之后的门里慢慢长出来。' },
  { f: 'memory', title: '那年冬天', body: '有些冬天会被忘记，有些会一直留着。今天这扇门里，放着一个只属于你们的冬天。' },
  { f: 'question', title: '写给一年前的自己', body: '如果能给一年前的自己寄一张明信片，你会写什么？', act: 'answer' },
  { f: 'task', title: '给一个人发一句晚安', body: '今天睡前，给一个你想念的人发一句晚安。不用解释为什么。', act: 'done' },
  { f: 'blessing', title: '今天也辛苦了', body: '不管今天过得怎么样，到这里就可以先放下了。这扇门替你守着。' },
  { f: 'story', title: '铃铛声近了', body: '{world}深处，那个一直响着的铃铛声，今天听起来近了一点。' },
  { f: 'song', title: '一首慢下来的歌', body: '今天的门里是一首很慢的歌，适合在回家的路上听完。', act: 'song' },
  { f: 'question', title: '今年最想感谢的人', body: '这一年里，有没有一个人，让你很想认真说一声谢谢？', act: 'answer' },
  { f: 'memory', title: '被记住的小事', body: '有人记得你说过的一句很小的话。今天，它变成了一件挂饰。' },
  { f: 'task', title: '给自己买一杯热饮', body: '今天允许自己慢下来。买一杯热饮，捧在手里，直到它变温。', act: 'done' },
  { f: 'story', title: '窗边的人影', body: '那个一直在窗边的人影，今天终于转过了身。你好像在哪里见过 TA。' },
  { f: 'blessing', title: '愿你被温柔地对待', body: '愿这个冬天，所有的门都为你打开，所有的灯都为你留着。' },
  { f: 'question', title: '明年冬天的你', body: '明年冬天，你希望自己在哪里？身边有谁？', act: 'answer' },
  { f: 'memory', title: '一张旧票根', body: '口袋里翻出一张旧票根。日期已经模糊了，但那天的天气，你一定还记得。' },
  { f: 'story', title: '快到了', body: '{world}里的路已经走了很远。前面只剩几扇门了，光越来越亮。' },
  { f: 'song', title: '平安夜前的歌', body: '今晚的歌，留给快要到来的那一天。', act: 'song' },
  { f: 'blessing', title: '谢谢你一直打开这些门', body: '谢谢你每天都回来。这份礼物，因为有你打开，才算完成。' },
  { f: 'task', title: '把今天写下来', body: '在纸上写下今天的一件小事，折起来收好。明年圣诞再打开。', act: 'done' },
  { f: 'story', title: '最后一扇门前', body: '明天，最后一扇门就会打开。今晚，{world}里所有的灯都还亮着，在等你。' },
];
const FINAL = { f: 'final', title: '最后一扇门', body: '最后一扇门里，没有别的东西——只有一颗星星。它属于{to}的圣诞树，要由你亲手放上树顶。', act: 'star' };

export const LENGTHS = [
  { n: 7, label: '一周的小旅程' },
  { n: 12, label: '圣诞十二日' },
  { n: 24, label: '一路到平安夜' },
  { n: 25, label: '整个十二月' },
];

export function giftYear(now = new Date()) {
  return now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
}

export function range(d) {
  const n = Math.max(3, Math.min(31, d.days || 12));
  const endDay = d.endOn === 'eve' ? 24 : 25;
  const y = d.year || giftYear();
  return { n, start: new Date(y, 11, endDay - n + 1), end: new Date(y, 11, endDay) };
}

export const fmt = (dt) => `${dt.getMonth() + 1}月${dt.getDate()}日`;
const short = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}`;

export function buildDays(d) {
  const { n, start } = range(d);
  const to = d.to.trim();
  const world = d.worldKey ? buildWorld(d.worldKey, d).name : '这个世界';
  const fill = (s) => s.replaceAll('{to}', to).replaceAll('{world}', `「${world}」`);
  const colors = (PALETTES[d.ornPalette] || PALETTES.classic).colors;
  const regular = n - 1;
  const photos = d.photos || [];
  const photoDays = photos.map((_, k) => Math.max(1, Math.round(((k + 1) * regular) / (photos.length + 1))));
  const detailDay = d.detail?.trim() ? Math.max(1, Math.round(regular * 0.6)) : -1;

  return Array.from({ length: n }, (_, i) => {
    const day = i + 1;
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const final = day === n;

    const edit = (d.doorEdits || {})[day] || {};
    const base = regular <= 1 ? 0 : Math.round((i * (POOL.length - 1)) / (regular - 1));
    let c = final ? FINAL : POOL[(base + (edit.alt || 0) * 7) % POOL.length];
    if (day === detailDay && !edit.alt) {
      c = { f: 'memory', title: '一件被记住的小事', body: `有人一直记得：「${d.detail.trim()}」。今天这扇门，是为这件小事留的。` };
    }
    if (!final && (edit.title || edit.body)) c = { ...c, title: edit.title || c.title, body: edit.body || c.body, edited: true };
    if (!final && Array.isArray(d.doors) && d.doors[i]) c = { ...d.doors[i], edited: true }; // 已送出的礼物：使用保存的内容

    const pIdx = photoDays.indexOf(day);
    const kind = final ? 'topstar' : pIdx >= 0 ? 'photo' : ORN_CYCLE[i % ORN_CYCLE.length];

    return {
      day, date, final,
      label: fmt(date),
      short: short(date),
      type: final ? 'giftbox' : DOOR_TYPES[(i + Math.floor(i / 5)) % DOOR_TYPES.length],
      icon: ICON_CYCLE[(i * 5) % ICON_CYCLE.length],
      c1: final ? '#B62935' : DOOR_COLORS[(i * 2 + (i >> 2)) % DOOR_COLORS.length],
      ornament: {
        index: i,
        day,
        kind,
        name: ORNAMENT_NAMES[kind],
        color: kind === 'photo' ? '#f6edd9' : colors[(i * 3) % colors.length],
        photo: pIdx >= 0 ? photos[pIdx] : null,
        note: d.notes?.[day] || '',
      },
      content: { ...c, title: c.edited ? c.title : fill(c.title), body: c.edited ? c.body : fill(c.body) },
    };
  });
}
