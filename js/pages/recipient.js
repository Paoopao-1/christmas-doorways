import { store, DEFAULT_LETTER, normalize } from '../store.js';
import { progress } from '../progress.js';
import { navigate } from '../router.js';
import { buildDays, FORMAT_LABEL, range, fmt } from '../data/days.js';
import { buildWorld } from '../data/worlds.js';
import { PALETTES } from '../data/tree-options.js';
import { SAMPLE } from '../data/sample.js';
import { decodeGift, giftId } from '../share.js';
import { renderHouse, playOpen } from '../ui/calendar.js';
import { Tree } from '../tree.js';
import { cover } from '../art.js';
import { icon, bow, hollySprig, ORN_ICON } from '../ui/decor.js';
import { esc, fromName, reducedMotion, wait, toast, applyDeckle } from '../util.js';

// R1–R4 · 收礼人视图
//   preview：创建者预览（可“假装今天是第 N 天”）
//   sample ：首页的示例礼物
//   real   ：分享链接 #/g/…（按收礼人本地日期解锁）
const paras = (t) => esc(t).replace(/\n/g, '<br>');
const DAY_MS = 86400000;

export async function render(root, ctx) {
  const mode = ctx.mode || 'preview';
  let gift;
  let serverToday = null;
  if (mode === 'server') {
    root.innerHTML = `<section class="page weave"><div><div class="lantern" aria-hidden="true"></div><p class="weave-line">正在取出你的礼物……</p></div></section>`;
    try {
      const res = await fetch(`/api/gifts/${encodeURIComponent(ctx.param)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '打不开这份礼物');
      gift = normalize({ ...data.gift, worldIndex: 0, needsWeave: false });
      progress.useRemote(ctx.param, data.progress);
      serverToday = data.today;
    } catch (err) {
      if (!ctx.isCurrent()) return;
      root.innerHTML = `<section class="page page-head"><p class="eyebrow">打不开这份礼物</p><h1 class="h1" tabindex="-1">${esc(err.message || '出了点问题')}</h1><p class="lede" style="margin:0 auto">请确认链接完整，或稍后刷新再试。</p><div class="actions"><a class="btn btn-ghost" href="/#/">去看看圣诞之门</a></div></section>`;
      return;
    }
    if (!ctx.isCurrent()) return;
  } else if (mode === 'real') {
    try { gift = await decodeGift(ctx.param); }
    catch {
      root.innerHTML = `<section class="page page-head"><p class="eyebrow">打不开这份礼物</p><h1 class="h1" tabindex="-1">这个链接好像不完整</h1><p class="lede" style="margin:0 auto">可能是复制时少了一段。请让送礼的人重新发一次完整的链接。</p><div class="actions"><a class="btn btn-ghost" href="#/">去看看圣诞之门</a></div></section>`;
      return;
    }
    progress.use(giftId(ctx.param));
  } else if (mode === 'sample') {
    gift = SAMPLE;
    progress.use('sample');
  } else {
    gift = store.get();
    progress.use('preview');
  }

  const view = {
    mode,
    d: gift,
    to: esc(gift.to.trim()),
    from: esc(gift.relationship === 'self' && !gift.from.trim() && !gift.anonymous ? '现在的我' : fromName(gift)),
    days: buildDays(gift),
    world: buildWorld(gift.worldKey, gift),
    tree: null,
    serverToday,
  };
  view.n = view.days.length;
  ctx.onCleanup?.(() => view.tree?.destroy());

  if (!progress.get().welcomed) renderWelcome(root, view);
  else renderPath(root, view);
}

// 今天是第几天：预览 / 示例用“假装的日子”；真实礼物按收礼人本地日期
function todayIndex(view) {
  if (view.mode === 'server') return view.serverToday;
  if (view.mode !== 'real') return progress.get().simDay;
  const { start } = range(view.d);
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.min(view.n, Math.floor((t0 - start) / DAY_MS) + 1);
}

// ---------- 预览控制条 ----------
function demoBar(view) {
  if (view.mode === 'real' || view.mode === 'server') return '';
  const pr = progress.get();
  const day = view.days[Math.min(pr.simDay, view.n) - 1];
  return `
  <div class="demo-bar" role="region" aria-label="预览控制">
    <span class="demo-tag">${view.mode === 'sample' ? '示例礼物' : `预览 · 以${view.to}的视角`}</span>
    <span class="demo-day">
      <button type="button" id="dayMinus" aria-label="前一天">−</button>
      <span id="dayLabel">假装今天是第 ${pr.simDay} 天 · ${day.label}</span>
      <button type="button" id="dayPlus" aria-label="后一天">+</button>
    </span>
    <button type="button" class="link" id="resetPr">重新开始</button>
    <button type="button" class="link" id="backEdit">${view.mode === 'sample' ? '我也要准备一份' : '返回编辑'}</button>
  </div>`;
}

function bindDemo(root, view, onDay) {
  if (view.mode === 'real' || view.mode === 'server') return;
  root.querySelector('#dayMinus').addEventListener('click', () => { progress.set({ simDay: Math.max(1, progress.get().simDay - 1) }); onDay(); });
  root.querySelector('#dayPlus').addEventListener('click', () => { progress.set({ simDay: Math.min(view.n, progress.get().simDay + 1) }); onDay(); });
  root.querySelector('#resetPr').addEventListener('click', () => { progress.reset(); view.tree?.destroy(); view.tree = null; renderWelcome(root, view); });
  root.querySelector('#backEdit').addEventListener('click', () => navigate(view.mode === 'sample' ? '/create/for' : '/create/doors'));
}

function updateDemo(root, view) {
  const pr = progress.get();
  const label = root.querySelector('#dayLabel');
  if (label) label.textContent = `假装今天是第 ${pr.simDay} 天 · ${view.days[Math.min(pr.simDay, view.n) - 1].label}`;
}

// ---------- R1 欢迎：信封 → 开场信 ----------
function renderWelcome(root, view) {
  root.innerHTML = `
  <section class="page welcome">
    ${demoBar(view)}
    <p class="eyebrow rise">有人为你准备了一份圣诞礼物</p>
    <div class="envelope rise" style="--d:.15s" id="env">
      <div class="env-back"></div>
      <div class="env-letter"><span>致 ${view.to}</span></div>
      <div class="env-front"></div>
      <div class="env-top"></div>
      <p class="env-to">致 ${view.to}</p>
      <button class="env-seal" id="seal" type="button" aria-label="拆开这封信">${icon('star')}</button>
    </div>
    <h1 class="h1 rise" style="--d:.25s;font-size:clamp(30px,5vw,44px)" tabindex="-1">一封寄给你的信</h1>
    <div class="actions rise" style="--d:.3s"><button class="btn btn-primary" id="openLetter" type="button">拆开这封信</button></div>
  </section>`;

  bindDemo(root, view, () => updateDemo(root, view));
  const open = async () => {
    root.querySelector('#env').classList.add('open');
    root.querySelector('#openLetter').disabled = true;
    await wait(reducedMotion() ? 0 : 1300);
    renderLetter(root, view);
  };
  root.querySelector('#openLetter').addEventListener('click', open);
  root.querySelector('#seal').addEventListener('click', open);
}

function renderLetter(root, view) {
  const letter = view.d.letter?.trim() || DEFAULT_LETTER;
  root.innerHTML = `
  <section class="page welcome">
    ${demoBar(view)}
    <div class="paper-shadow rise">
      <article class="letter" data-deckle="7">
        <span class="letter-holly">${hollySprig(54)}</span>
        <h1 class="letter-to" tabindex="-1">致 ${view.to}：</h1>
        <p class="letter-lead">这份礼物是为你做的，一扇门一扇门地。</p>
        <div class="letter-body">${paras(letter)}</div>
        <p class="letter-from">—— ${view.from}</p>
        <p class="letter-note">共 ${view.n} 扇门 · 每天回来，打开下一扇</p>
      </article>
    </div>
    <div class="actions rise" style="--d:.4s"><button class="btn btn-primary" id="toToday" type="button">打开今天的门</button></div>
  </section>`;
  applyDeckle(root);
  root.querySelector('h1').focus({ preventScroll: true });
  bindDemo(root, view, () => updateDemo(root, view));
  root.querySelector('#toToday').addEventListener('click', async () => {
    progress.set({ welcomed: true });
    renderPath(root, view);
    await wait(300);
    const today = root.querySelector('.cal-door.s-today') || root.querySelector('.house');
    today?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    today?.focus?.({ preventScroll: true });
  });
}

// ---------- R2 礼物之路：圣诞树 + 倒数小屋 ----------
function statesFor(view) {
  const pr = progress.get();
  const today = todayIndex(view);
  const out = {};
  for (const x of view.days) {
    if (pr.opened.includes(x.day)) out[x.day] = 'opened';
    else if (x.day === today) out[x.day] = 'today';
    else if (x.day < today) out[x.day] = 'missed';
    else out[x.day] = view.d.allowEarly ? 'early' : 'locked';
  }
  return out;
}

function renderPath(root, view) {
  const pr = progress.get();
  root.innerHTML = `
  <section class="page gift-page">
    ${demoBar(view)}
    <header class="gift-head">
      <p class="eyebrow rise">${esc(view.world.name)}</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">${view.to}的圣诞树</h1>
      <p class="gift-progress rise" style="--d:.2s" id="prog" aria-live="polite"></p>
    </header>
    <div class="tree-stage rise" style="--d:.25s" id="stage">
      <canvas id="tree" data-deckle="21" data-amp="1.1" aria-label="属于${view.to}的圣诞树。可以左右拖动旋转，点击挂饰重温那一天。"></canvas>
      <div class="tree-ui">
        <button type="button" class="round-btn" id="rotL" aria-label="向左旋转圣诞树">‹</button>
        <span class="tree-hint">拖动旋转 · 点挂饰重温那一天</span>
        <button type="button" class="round-btn" id="rotR" aria-label="向右旋转圣诞树">›</button>
      </div>
    </div>
    <div class="orn-list" id="ornList" aria-label="已收藏的挂饰"></div>
    <p class="wait-note" id="waitNote" hidden></p>
    <div id="cal" role="region" aria-label="圣诞倒数日历"></div>
    <p class="from-line">来自 ${view.from}</p>
    <dialog class="dd" id="doorDlg" aria-labelledby="ddTitle"></dialog>
    <dialog class="final-dlg" id="finalDlg" aria-label="最终祝福"></dialog>
  </section>`;
  applyDeckle(root);

  const $ = (s) => root.querySelector(s);
  const ornsOf = () => view.days.filter((x) => !x.final && progress.get().opened.includes(x.day)).map((x) => x.ornament);

  view.tree?.destroy();
  view.tree = new Tree($('#tree'), {
    style: view.d.treeStyle,
    star: view.d.starStyle,
    palette: (PALETTES[view.d.ornPalette] || PALETTES.classic).colors,
    progress: pr.opened.length / view.n,
    starPlaced: pr.starPlaced,
    ornaments: ornsOf(),
    onPick: (o) => {
      if (o.kind === 'topstar') { showFinal(root, view); return; }
      const day = view.days.find((x) => x.day === o.day);
      if (day) showDoor(root, view, day, false);
    },
  });

  bindDemo(root, view, () => { updateDemo(root, view); refresh(root, view); });
  $('#rotL').addEventListener('click', () => view.tree.rotate(-1));
  $('#rotR').addEventListener('click', () => view.tree.rotate(1));
  $('#cal').addEventListener('click', (e) => {
    const btn = e.target.closest('.cal-door');
    if (btn) onDoor(root, view, +btn.dataset.day, btn);
  });
  $('#ornList').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-day]');
    if (!chip) return;
    if (chip.dataset.day === 'final') { showFinal(root, view); return; }
    showDoor(root, view, view.days[+chip.dataset.day - 1], false);
  });
  refresh(root, view);
}

function refresh(root, view) {
  const pr = progress.get();
  const k = pr.opened.length;
  const prog = root.querySelector('#prog');
  if (!prog) return;
  if (pr.starPlaced) prog.textContent = '你打开了每一扇门。';
  else if (k === 0) prog.textContent = `这棵树还在等第一件挂饰 · 共 ${view.n} 扇门`;
  else prog.textContent = `你已经打开了 ${k} / ${view.n} 扇门`;

  const today = todayIndex(view);
  const note = root.querySelector('#waitNote');
  if (today < 1) {
    note.hidden = false;
    note.textContent = `第一扇门会在 ${fmt(range(view.d).start)} 打开。到时候再来，它会在这里等你。`;
  } else note.hidden = true;

  root.querySelector('#ornList').innerHTML = view.days
    .filter((x) => !x.final && pr.opened.includes(x.day))
    .map((x) => `<button type="button" class="orn-chip" data-day="${x.day}" style="--oc:${x.ornament.kind === 'photo' || ['#F5EBD8', '#F1D47B'].includes(x.ornament.color) ? '#795747' : x.ornament.color}">${icon(ORN_ICON[x.ornament.kind])}第 ${x.day} 天 · ${x.ornament.name}</button>`)
    .join('') + (pr.starPlaced ? `<button type="button" class="orn-chip is-final" data-day="final">${icon('star')}重读最终祝福</button>` : '');

  root.querySelector('#cal').innerHTML = renderHouse(view.days, statesFor(view));
}

async function onDoor(root, view, day, btn) {
  const x = view.days[day - 1];
  const state = statesFor(view)[day];
  if (state === 'locked') {
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
    toast(`这扇门还在为你保存着，${x.label}再来。`);
    return;
  }
  if (state === 'opened') { showDoor(root, view, x, false); return; }
  if (state === 'early' && !window.confirm(`这扇门本来要等到 ${x.label}。要提前打开吗？`)) return;
  if (btn.dataset.busy) return;
  btn.dataset.busy = '1';
  try {
    await progress.open(day); // 正式礼物：服务器确认日期后才记录
  } catch (err) {
    delete btn.dataset.busy;
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
    toast(err.message || '这扇门暂时打不开');
    return;
  }
  playOpen(btn);
  await wait(reducedMotion() ? 0 : 1050);
  showDoor(root, view, x, true);
}

// ---------- R3 每日礼盒 ----------
function showDoor(root, view, x, first) {
  const pr = progress.get();
  const c = x.content, o = x.ornament;
  const dlg = root.querySelector('#doorDlg');
  let action = '';
  if (c.act === 'answer') action = `<label class="dd-label" for="ans">写下你的答案（只有你能看到）</label><textarea class="dd-text" id="ans" rows="3">${esc(pr.answers[x.day] || '')}</textarea>`;
  if (c.act === 'done') action = `<button type="button" class="btn btn-ghost-dark" id="doneBtn" aria-pressed="${!!pr.done[x.day]}">${pr.done[x.day] ? '✓ 我做到了' : '我做到了'}</button>`;
  if (c.act === 'song') action = `<div class="song" id="song"><button type="button" class="song-play" id="songBtn" aria-label="播放歌曲">▶</button><div><b>一首为今晚挑的歌</b><small>送礼人挑选的歌会放在这里（音乐素材待接入）</small></div><span class="song-bar"><i></i></span></div>`;
  const oc = o.kind === 'photo' || ['#F5EBD8', '#F1D47B'].includes(o.color) ? '#795747' : o.color;
  const starBtn = x.final && !pr.starPlaced;

  dlg.innerHTML = `
  <form method="dialog" class="dd-card">
    <button class="dd-x" value="x" aria-label="关闭">×</button>
    <div class="dd-art">${cover(view.world.scene, view.world.variant)}<span class="dd-ic" style="--oc:${x.final ? '#B62935' : oc}">${icon(x.final ? 'star' : ORN_ICON[o.kind])}</span></div>
    <div class="dd-inner">
      <div class="dd-top"><span>第 ${x.day} 扇门 · <span class="dd-date">${x.short}</span></span><span class="dd-fmt">${FORMAT_LABEL[c.f]}</span></div>
      <h2 class="dd-title" id="ddTitle">${esc(c.title)}</h2>
      ${o.photo ? `<img class="dd-photo" src="${o.photo}" alt="送礼人放进这扇门的照片">` : ''}
      <p class="dd-body">${paras(c.body)}</p>
      ${action}
      ${o.note ? `<p class="dd-note">${esc(o.note)}<span>—— ${view.from}</span></p>` : ''}
      ${x.final ? '' : `<div class="dd-orn"><span class="dd-orn-ic" style="color:${oc}">${icon(ORN_ICON[o.kind])}</span><span>今天的挂饰：${o.name}${first ? '。关上这扇门，它就会挂上你的圣诞树。' : ''}</span></div>`}
      <div class="dd-actions">
        ${starBtn
          ? `<button class="btn btn-red" value="star">${icon('star')}把星星放上树顶</button>`
          : `<button class="btn btn-red" value="keep">${first ? '收进圣诞树' : '关上这扇门'}</button>`}
      </div>
    </div>
  </form>`;

  dlg.querySelector('#ans')?.addEventListener('input', (e) => progress.set({ answers: { ...progress.get().answers, [x.day]: e.target.value } }));
  dlg.querySelector('#doneBtn')?.addEventListener('click', (e) => {
    const v = !progress.get().done[x.day];
    progress.set({ done: { ...progress.get().done, [x.day]: v } });
    e.currentTarget.setAttribute('aria-pressed', String(v));
    e.currentTarget.textContent = v ? '✓ 我做到了' : '我做到了';
  });
  dlg.querySelector('#songBtn')?.addEventListener('click', (e) => {
    const on = dlg.querySelector('#song').classList.toggle('playing');
    e.currentTarget.textContent = on ? '❚❚' : '▶';
  });

  dlg.onclose = async () => {
    if (dlg.returnValue === 'star') await starSequence(root, view);
    else if (first && !x.final) await hang(root, view, x);
    else refresh(root, view);
  };
  dlg.returnValue = '';
  dlg.showModal();
}

async function scrollToTree(root) {
  root.querySelector('#stage')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  await wait(reducedMotion() ? 0 : 650);
}

async function hang(root, view, x) {
  refresh(root, view);
  await scrollToTree(root);
  view.tree.setProgress(progress.get().opened.length / view.n);
  await view.tree.addOrnament(x.ornament, { animate: true });
  toast(`${x.ornament.name}挂上了你的圣诞树`);
}

// ---------- R4 最终揭晓 ----------
async function starSequence(root, view) {
  refresh(root, view);
  await scrollToTree(root);
  view.tree.setProgress(1);
  await view.tree.placeStar();
  progress.set({ starPlaced: true });
  refresh(root, view);
  await wait(reducedMotion() ? 0 : 700);
  showFinal(root, view);
}

function showFinal(root, view) {
  const dlg = root.querySelector('#finalDlg');
  const wish = view.d.finalWish?.trim() || '圣诞快乐。\n谢谢你，一直在我的生活里。';
  const build = () => {
    dlg.innerHTML = `
    <div class="final">
      <p class="final-line big rise" style="--d:.3s">你打开了每一扇门。</p>
      <p class="final-line rise" style="--d:1.6s">这份礼物从来不只藏在门后，</p>
      <p class="final-line rise" style="--d:2.7s">而是有人愿意花时间，为你一扇一扇地准备。</p>
      <div class="paper-shadow rise" style="--d:3.9s;width:min(460px,100%)">
        <article class="final-card" data-deckle="13">
          <span class="fc-bow">${bow('#B62935', 78)}</span>
          <p class="fc-to">致 ${view.to}：</p>
          <div class="fc-body">${paras(wish)}</div>
          <p class="fc-from">—— ${view.from}</p>
          <span class="fc-holly">${hollySprig(48)}</span>
        </article>
      </div>
      <div class="final-actions rise" style="--d:4.8s">
        <button type="button" class="btn btn-ghost" id="again">再读一遍</button>
        <button type="button" class="btn btn-primary" id="toTree">回到圣诞树</button>
        <button type="button" class="link" id="makeGift">也为某个人准备一份</button>
      </div>
    </div>`;
    applyDeckle(dlg);
    dlg.querySelector('#again').addEventListener('click', build);
    dlg.querySelector('#toTree').addEventListener('click', () => dlg.close());
    dlg.querySelector('#makeGift').addEventListener('click', () => { dlg.close(); navigate('/'); });
  };
  build();
  if (!dlg.open) dlg.showModal();
}
