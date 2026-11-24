// 首页「看看一份礼物如何展开」使用的示例礼物
import { DEFAULT_LETTER, normalize } from '../store.js';

export const SAMPLE = normalize({
  to: '小雨',
  from: '阿远',
  relationship: 'love',
  scene: 'snow',
  worldKey: 'snow-a',
  detail: '她总把手揣进我的外套口袋',
  days: 12,
  treeStyle: 'painted',
  ornPalette: 'classic',
  starStyle: 'classic',
  notes: { 3: '这片雪花，是我们第一次一起看雪那天，落在你帽子上的。' },
  letter: DEFAULT_LETTER,
  finalWish: '小雨：\n谢谢你这一年一直都在。\n明年冬天，我们还一起看雪。',
  coverLine: '一扇门一扇门，慢慢打开。',
});
