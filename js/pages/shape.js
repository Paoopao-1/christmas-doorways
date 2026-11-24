import { store } from '../store.js';
import { navigate } from '../router.js';
import { LENGTHS, range, fmt, buildDays } from '../data/days.js';
import { renderHouse } from '../ui/calendar.js';
import { esc } from '../util.js';

// C4 · 塑造礼物：天数、结束日、解锁方式，并实时预览日历小屋的排版
export function render(root) {
  const d = store.get();
  const to = esc(d.to.trim());
  const isPreset = LENGTHS.some((l) => l.n === d.days);

  root.innerHTML = `
  <section class="page shape">
    <header class="page-head">
      <p class="eyebrow rise">塑造礼物</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">这份礼物，<br>你想陪${to}走多久？</h1>
      <p class="lede rise" style="--d:.2s">每一天，TA 只能打开一扇门。你选的天数，就是这段等待的长度。</p>
    </header>

    <div class="len-grid rise" style="--d:.3s" role="group" aria-label="日历天数">
      ${LENGTHS.map((l) => `
        <button type="button" class="len-card" data-n="${l.n}" aria-pressed="${l.n === d.days}">
          <b>${l.n}</b><span>扇门</span><small>${l.label}</small>
        </button>`).join('')}
      <div class="len-card custom" role="group" aria-label="自定义天数" data-active="${!isPreset}">
        <button type="button" class="len-custom-pick" id="customPick" aria-pressed="${!isPreset}">自定义</button>
        <div class="stepper">
          <button type="button" id="minus" aria-label="减少一天">−</button>
          <output id="customN">${isPreset ? 10 : d.days}</output>
          <button type="button" id="plus" aria-label="增加一天">+</button>
        </div>
        <small>3 到 31 扇</small>
      </div>
    </div>

    <div class="shape-row rise" style="--d:.4s">
      <div class="seg" role="group" aria-label="最后一扇门在哪天">
        <button type="button" data-end="christmas" aria-pressed="${d.endOn !== 'eve'}">圣诞节当天结束</button>
        <button type="button" data-end="eve" aria-pressed="${d.endOn === 'eve'}">平安夜结束</button>
      </div>
      <div class="seg" role="group" aria-label="解锁方式">
        <button type="button" data-early="0" aria-pressed="${!d.allowEarly}">每天只能开一扇</button>
        <button type="button" data-early="1" aria-pressed="${!!d.allowEarly}">允许 TA 提前打开</button>
      </div>
    </div>

    <p class="range-line" id="rangeLine" aria-live="polite"></p>
    <p class="note" style="margin-top:4px">每扇门在 TA 所在时区的零点开启。</p>

    <div class="shape-preview">
      <h2 class="section-title">小屋会长成这样</h2>
      <div id="miniHouse"></div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="next" type="button">下一步：装饰圣诞树</button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">回到这个世界</button></div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  let customN = isPreset ? 10 : d.days;

  const refresh = () => {
    const cur = store.get();
    const { n, start, end } = range(cur);
    $('#rangeLine').innerHTML = `<b>${fmt(start)}</b> — <b>${fmt(end)}</b>　·　共 <b>${n}</b> 扇门`;
    const days = buildDays(cur);
    const states = Object.fromEntries(days.map((x) => [x.day, 'closed']));
    $('#miniHouse').innerHTML = renderHouse(days, states, { mini: true });
    root.querySelectorAll('.len-card[data-n]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === n)));
    const custom = !LENGTHS.some((l) => l.n === n);
    $('#customPick').setAttribute('aria-pressed', String(custom));
    $('.len-card.custom').dataset.active = String(custom);
  };

  root.querySelectorAll('.len-card[data-n]').forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.n;
    store.set({ days: n, endOn: n === 24 ? 'eve' : store.get().endOn });
    syncSeg();
    refresh();
  }));

  const setCustom = (v) => {
    customN = Math.max(3, Math.min(31, v));
    $('#customN').textContent = customN;
    store.set({ days: customN });
    refresh();
  };
  $('#customPick').addEventListener('click', () => setCustom(customN));
  $('#minus').addEventListener('click', () => setCustom(customN - 1));
  $('#plus').addEventListener('click', () => setCustom(customN + 1));

  const syncSeg = () => {
    const cur = store.get();
    root.querySelectorAll('[data-end]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.end === 'eve') === (cur.endOn === 'eve'))));
    root.querySelectorAll('[data-early]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.early === '1') === !!cur.allowEarly)));
  };
  root.querySelectorAll('[data-end]').forEach((b) => b.addEventListener('click', () => { store.set({ endOn: b.dataset.end }); syncSeg(); refresh(); }));
  root.querySelectorAll('[data-early]').forEach((b) => b.addEventListener('click', () => { store.set({ allowEarly: b.dataset.early === '1' }); syncSeg(); }));

  const onResize = () => refresh();
  window.addEventListener('resize', onResize);

  $('#next').addEventListener('click', () => navigate('/create/tree'));
  $('#back').addEventListener('click', () => navigate('/create/world'));

  refresh();
  return () => window.removeEventListener('resize', onResize);
}
