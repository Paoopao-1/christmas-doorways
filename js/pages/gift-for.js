import { store } from '../store.js';
import { navigate } from '../router.js';
import { RELATIONSHIPS } from '../data/worlds.js';
import { esc } from '../util.js';
import { bow } from '../ui/decor.js';

// C2 · Gift for someone / 送给谁
export function render(root) {
  const d = store.get();
  const rel = RELATIONSHIPS.find((r) => r.id === d.relationship);

  root.innerHTML = `
  <section class="page gift-for">
    <header class="page-head">
      <p class="eyebrow rise">先想起一个人</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">这扇圣诞之门，<br>你想为谁打开？</h1>
      <p class="lede rise" style="--d:.2s">如果你可以为一个重要的人，准备 7 到 25 份圣诞惊喜——你会把它送给谁？</p>
    </header>

    <div class="chips rise" style="--d:.3s" role="group" aria-label="TA 是你的……">
      ${RELATIONSHIPS.map((r) => `<button type="button" class="chip" data-id="${r.id}" aria-pressed="${r.id === d.relationship}">${r.label}</button>`).join('')}
    </div>
    <p class="whisper" id="whisper" aria-live="polite">${rel ? esc(rel.whisper) : ''}</p>

    <div class="tag-wrap rise" style="--d:.4s">
      <span class="tag-bow" aria-hidden="true">${bow('#c0392f', 58)}</span>
      <form class="tag" id="tagForm" autocomplete="off" novalidate>
        <div class="tag-row">
          <label for="to">致</label>
          <input id="to" maxlength="16" value="${esc(d.to)}" placeholder="${esc(rel?.example || '写下 TA 的名字或称呼')}" aria-describedby="whisper">
        </div>
        <div class="tag-row">
          <label for="from">来自</label>
          <input id="from" maxlength="16" value="${esc(d.from)}" placeholder="${d.relationship === 'self' ? '现在的我' : '你的名字或昵称（可不填）'}" ${d.anonymous ? 'disabled' : ''}>
        </div>
        <label class="tag-check"><input type="checkbox" id="anon" ${d.anonymous ? 'checked' : ''}>保留一点神秘：署名会显示为「一个想着你的人」</label>
      </form>
    </div>

    <div class="actions rise" style="--d:.5s">
      <button class="btn btn-primary" id="next" type="submit" form="tagForm"></button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">返回</button></div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  const to = $('#to'), from = $('#from'), anon = $('#anon'), next = $('#next'), whisper = $('#whisper');

  const syncButton = () => {
    const name = to.value.trim();
    next.disabled = !name;
    next.textContent = name ? `为「${name}」继续` : '写下 TA 的称呼后继续';
  };
  syncButton();

  root.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const r = RELATIONSHIPS.find((x) => x.id === chip.dataset.id);
      root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      whisper.textContent = r.whisper;
      to.placeholder = r.example;
      from.placeholder = r.id === 'self' ? '现在的我' : '你的名字或昵称（可不填）';
      if (r.id === 'self' && !to.value.trim()) to.value = '未来的我';
      store.set({ relationship: r.id, to: to.value });
      syncButton();
      to.focus();
    });
  });

  to.addEventListener('input', () => { store.set({ to: to.value }); syncButton(); });
  from.addEventListener('input', () => store.set({ from: from.value }));
  anon.addEventListener('change', () => {
    from.disabled = anon.checked;
    store.set({ anonymous: anon.checked });
  });

  $('#tagForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!to.value.trim()) { to.focus(); return; }
    store.set({ to: to.value.trim(), from: from.value.trim() });
    navigate('/create/imagine');
  });

  $('#back').addEventListener('click', () => navigate('/'));
}
