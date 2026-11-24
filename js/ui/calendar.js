// 圣诞倒数小屋：根据天数自动排版；五种门（窗户 / 邮票 / 信封 / 礼盒 / 贺卡）各有开启动画
import { icon, bow, roof, ORN_ICON } from './decor.js';
import { DOOR_TYPE_LABEL } from '../data/days.js';

export function calendarCols(n, mini = false) {
  if (n <= 7) return 3;
  const narrow = mini || window.matchMedia('(max-width: 520px)').matches;
  if (narrow) return 4;
  return n <= 12 ? 4 : 5;
}

const STATE_TEXT = { locked: '尚未解锁', today: '今天可以打开', missed: '可以补开', early: '可以提前打开', opened: '已经打开', closed: '' };

function cover(t, d, isFinal) {
  switch (t) {
    case 'window':
      return `<span class="cd-cover"><span class="sh l"></span><span class="sh r"></span><span class="num">${d.day}</span></span>`;
    case 'stamp':
      return `<span class="cd-cover"><span class="stamp-face perf"><span class="sf-in">${icon(d.icon)}<span class="num">${d.day}</span></span></span></span>`;
    case 'envelope':
      return `<span class="cd-cover"><span class="env-body"></span><span class="env-flap"></span><span class="seal">${d.day}</span></span>`;
    case 'card':
      return `<span class="cd-cover"><span class="card-front">${icon(d.icon)}<span class="num">${d.day}</span></span></span>`;
    default:
      return `<span class="cd-cover"><span class="box"></span><span class="rib v"></span><span class="rib h"></span><span class="bow-s">${bow(isFinal ? '#f0c674' : '#f3ead8', 64)}</span><span class="num">${isFinal ? `最后的礼物 · ${d.short}` : d.day}</span></span>`;
  }
}

// 浅色挂饰放在奶油色纸面上看不清，换成深一点的金棕色
const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 190;
};

export function renderDoor(d, state, mini, isFinal = false) {
  const tag = mini ? 'span' : 'button';
  const o = { ...d.ornament, color: isLight(d.ornament.color) ? '#a0782f' : d.ornament.color };
  const aria = `第${d.day}扇门，${d.label}，${isFinal ? '最后的礼物' : DOOR_TYPE_LABEL[d.type]}，${STATE_TEXT[state]}`;
  const flag = state === 'today' ? '<span class="cd-flag">今天</span>'
    : state === 'missed' ? '<span class="cd-flag soft">补开</span>' : '';
  return `<${tag} class="cal-door t-${d.type} s-${state} ${state === 'opened' ? 'is-open' : ''} ${isFinal ? 'cal-final' : ''}"
      data-day="${d.day}" style="--c1:${d.c1};--oc:${o.color}" ${mini ? 'aria-hidden="true"' : `type="button" aria-label="${aria}"`}>
    <span class="cd-inside"></span>
    ${cover(d.type, d, isFinal)}
    <span class="cd-orn">${icon(ORN_ICON[o.kind])}</span>
    ${flag}
    ${mini || isFinal ? '' : `<span class="cd-date">${d.short}</span>`}
  </${tag}>`;
}

export function renderHouse(days, states, { mini = false, title = `圣诞倒数 · ${days.length} 天` } = {}) {
  const n = days.length;
  const cols = calendarCols(n, mini);
  const regular = days.slice(0, -1);
  const final = days[n - 1];
  const fill = (cols - (regular.length % cols)) % cols;
  const decor = ['holly', 'candy', 'bell', 'snowflake'];
  return `
  <div class="house ${mini ? 'mini' : ''}" style="--cols:${cols}">
    <div class="roof">${roof()}<span class="roof-sign">${title}</span></div>
    <div class="facade">
      <div class="door-grid">
        ${regular.map((d) => renderDoor(d, states[d.day] || 'closed', mini)).join('')}
        ${Array.from({ length: fill }, (_, i) => `<span class="cal-decor" aria-hidden="true">${icon(decor[i % decor.length])}</span>`).join('')}
      </div>
      <div class="final-row">${renderDoor(final, states[final.day] || 'closed', mini, true)}</div>
    </div>
  </div>`;
}

// 播放某扇门的开启动画
export function playOpen(btn) {
  btn.classList.add('animating');
  requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('is-open')));
}
