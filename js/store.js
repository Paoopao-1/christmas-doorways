// 礼物草稿：创建过程中保存在本地浏览器（localStorage）。
// 送出时整份礼物会被压缩进分享链接（见 share.js），收礼人无需服务器即可打开。
import { TREE_STYLES, DEFAULT_TREE, PALETTES, DEFAULT_PALETTE } from './data/tree-options.js';

const KEY = 'cd.draft.v1';

export const DEFAULT_LETTER = '这份礼物，是我一扇门一扇门为你准备的。\n每天只能打开一扇，不能快进——\n就像所有值得等待的事情一样。';

export const empty = () => ({
  to: '',            // 收礼人称呼
  from: '',          // 创建者署名
  anonymous: false,  // 保留一点神秘
  relationship: null,
  scene: null,       // 想象起点：snow / forest / station / secret
  sceneText: '',     // 创建者自己写下的画面
  detail: '',        // 一件关于 TA 的小事
  worldKey: null,
  worldIndex: 0,
  needsWeave: true,
  days: 12,          // 7 / 12 / 24 / 25 / 自定义
  endOn: 'christmas',// christmas = 12月25日结束；eve = 12月24日结束
  allowEarly: false,
  treeStyle: DEFAULT_TREE,
  ornPalette: DEFAULT_PALETTE,
  starStyle: 'classic',
  photos: [],        // 照片挂饰（压缩后的 dataURL）
  notes: {},         // { 第几天: 挂饰留言 }
  doorEdits: {},     // { 第几天: { title, body, alt } } 创建者改写的礼盒内容
  letter: '',        // 开场信
  finalWish: '',     // 最终祝福
  coverLine: '',     // 礼物封面上的一句话
});

// 兼容旧版本保存的选项
export function normalize(d) {
  const out = { ...empty(), ...d };
  if (!TREE_STYLES[out.treeStyle]) out.treeStyle = DEFAULT_TREE;
  if (!PALETTES[out.ornPalette]) out.ornPalette = DEFAULT_PALETTE;
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : empty();
  } catch {
    return empty();
  }
}

let draft = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* 隐私模式或空间不足时忽略 */ }
}

export const store = {
  get: () => draft,
  set(patch) { draft = { ...draft, ...patch }; save(); return draft; },
  reset() { draft = empty(); save(); return draft; },
};
