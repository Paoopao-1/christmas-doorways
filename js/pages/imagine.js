import { store } from '../store.js';
import { navigate } from '../router.js';
import { SCENES, DETAIL_EXAMPLES, inferScene } from '../data/worlds.js';
import { cover } from '../art.js';
import { esc, toast } from '../util.js';
import { postmark } from '../ui/decor.js';
import { giftYear } from '../data/days.js';

// C3 · Imagine / 想象引导
export function render(root) {
  const d = store.get();
  const name = esc(d.to.trim());
  const isSelf = d.relationship === 'self';

  root.innerHTML = `
  <section class="page imagine">
    <header class="page-head">
      <p class="eyebrow rise">为 ${name} 想象</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">如果这份礼物是一扇门，<br>${isSelf ? '你' : name}推开它时，会走进哪里？</h1>
      <p class="lede rise" style="--d:.2s">选一个画面开始，或者用你自己的话描述。<br>不必想得很完整，一个画面就够了。</p>
    </header>

    <div class="scenes rise" style="--d:.3s" role="group" aria-label="画面起点">
      ${SCENES.map((s, i) => `
        <button type="button" class="scene" data-id="${s.id}" aria-pressed="${s.id === d.scene}">
          <span class="stamp perf">
            <span class="thumb" aria-hidden="true">${cover(s.id)}</span>
            <span class="denom" aria-hidden="true">圣诞 · ${i + 1}</span>
            <span class="scene-body"><strong>${s.title}</strong><small>${s.desc}</small></span>
          </span>
          <span class="scene-mark" aria-hidden="true">${postmark('已选', `${giftYear()} 圣诞`)}</span>
        </button>`).join('')}
    </div>

    <div class="field rise" style="--d:.4s">
      <label class="flabel" for="sceneText">或者，用你自己的话写下它</label>
      <p class="hint">一条街、一个房间、一段只有你们记得的路。</p>
      <textarea class="textarea" id="sceneText" maxlength="120" placeholder="比如：我们第一次一起看雪的那条小巷……">${esc(d.sceneText)}</textarea>
    </div>

    <div class="field rise" style="--d:.5s">
      <label class="flabel" for="detail">再告诉我一件关于 ${isSelf ? '现在的你' : name} 的小事</label>
      <p class="hint">${isSelf ? '这个冬天你正在做的一件事，或者想对未来说的一个细节' : 'TA 冬天总会做的一件事，或者只有你们懂的一个细节'}。它会被悄悄藏进某一扇门里。（可以跳过）</p>
      <textarea class="textarea" id="detail" maxlength="80" placeholder="${DETAIL_EXAMPLES[0]}">${esc(d.detail)}</textarea>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="go" type="button">为 TA 想象一个世界</button>
      <button class="btn btn-ghost" id="inspire" type="button">给我一点灵感</button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">返回</button></div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  const sceneText = $('#sceneText'), detail = $('#detail'), go = $('#go');
  const cards = [...root.querySelectorAll('.scene')];

  const sync = () => { go.disabled = !store.get().scene && !sceneText.value.trim(); };
  sync();

  const select = (id) => {
    cards.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === id)));
    store.set({ scene: id });
    sync();
  };

  cards.forEach((card) => card.addEventListener('click', () => {
    const already = card.getAttribute('aria-pressed') === 'true';
    select(already ? null : card.dataset.id);
  }));

  sceneText.addEventListener('input', () => { store.set({ sceneText: sceneText.value }); sync(); });
  detail.addEventListener('input', () => store.set({ detail: detail.value }));

  let exampleIdx = 0;
  $('#inspire').addEventListener('click', () => {
    const current = store.get().scene;
    const options = SCENES.filter((s) => s.id !== current);
    const pick = options[Math.floor(Math.random() * options.length)];
    select(pick.id);
    exampleIdx = (exampleIdx + 1) % DETAIL_EXAMPLES.length;
    detail.placeholder = DETAIL_EXAMPLES[exampleIdx];
    const card = cards.find((c) => c.dataset.id === pick.id);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`也许是这里：${pick.title}？`);
  });

  go.addEventListener('click', () => {
    const cur = store.get();
    const scene = cur.scene || inferScene(sceneText.value);
    store.set({
      scene,
      sceneText: sceneText.value.trim(),
      detail: detail.value.trim(),
      worldIndex: 0,
      worldKey: null,
      needsWeave: true,
    });
    navigate('/create/world');
  });

  $('#back').addEventListener('click', () => navigate('/create/for'));
}
