// 圣诞信封（包装页与送出页共用）
import { cover } from '../art.js';
import { icon, postmark } from './decor.js';
import { esc, fromName } from '../util.js';
import { range } from '../data/days.js';

export function postHtml(d, w, { cls = '' } = {}) {
  const to = esc(d.to.trim());
  const { n, end } = range(d);
  return `
  <div class="post ${cls}" id="post" role="img" aria-label="一个写着「致 ${to}」的圣诞信封">
    <div class="post-back"></div>
    <div class="post-card">致 ${to}</div>
    <div class="post-front"></div>
    <div class="post-flap"></div>
    <div class="post-to">致 ${to}<small>来自 ${esc(fromName(d))}</small></div>
    <div class="post-stamp"><span class="perf ms-face"><span class="ms-art">${cover(w.scene, w.variant)}</span><span class="ms-txt">${n} 扇门</span></span></div>
    <div class="post-mark">${postmark('圣诞之门', `${end.getFullYear()} · 12`)}</div>
    <div class="post-seal">${icon('star')}</div>
  </div>`;
}
