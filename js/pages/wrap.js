import { store } from '../store.js';
import { navigate } from '../router.js';
import { buildWorld } from '../data/worlds.js';
import { range, fmt } from '../data/days.js';
import { cover } from '../art.js';
import { bow } from '../ui/decor.js';
import { postHtml } from '../ui/post.js';
import { esc, fromName, reducedMotion, wait } from '../util.js';

const DEFAULT_LINE = '一扇门一扇门，慢慢打开。';

// C8 + C9 · 礼物预览 → 放进圣诞信封
export function render(root, ctx) {
  const d = store.get();
  const w = buildWorld(d.worldKey, d);
  const { n, start, end } = range(d);
  const to = esc(d.to.trim());

  root.innerHTML = `
  <section class="page wrap-page">
    <header class="page-head" id="head">
      <p class="eyebrow rise">包装礼物</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">最后看一眼，<br><span class="tilt">再把它放进信封</span></h1>
    </header>
    <div id="stage">
      <article class="gift-card rise" style="--d:.2s" id="card">
        <span class="gc-bow">${bow('#B62935', 70)}</span>
        <span class="gc-art">${cover(w.scene, w.variant)}</span>
        <p class="gc-to">致 ${to}</p>
        <p class="gc-world">${esc(w.name)}</p>
        <p class="gc-meta">${n} doors · ${fmt(start)} — ${fmt(end)}</p>
        <p class="gc-line" id="gcLine">${esc(d.coverLine || DEFAULT_LINE)}</p>
        <p class="gc-from">—— ${esc(fromName(d))}</p>
      </article>
      <div class="cover-line rise" style="--d:.3s">
        <label class="flabel" for="line" style="font-size:22px">封面上的一句话</label>
        <textarea class="textarea" id="line" maxlength="30" rows="1" placeholder="${DEFAULT_LINE}">${esc(d.coverLine)}</textarea>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="wrap" type="button">把它放进圣诞信封</button>
      </div>
      <div class="back-row"><button class="link" id="back" type="button">返回编辑礼盒</button></div>
    </div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  $('#line').addEventListener('input', (e) => {
    store.set({ coverLine: e.target.value.trim() });
    $('#gcLine').textContent = e.target.value.trim() || DEFAULT_LINE;
  });
  $('#back').addEventListener('click', () => navigate('/create/doors'));

  $('#wrap').addEventListener('click', async () => {
    const rm = reducedMotion();
    $('#card').style.transform = 'rotate(-6deg) scale(.6) translateY(40px)';
    $('#card').style.opacity = '0';
    await wait(rm ? 0 : 500);
    if (!ctx.isCurrent()) return;
    $('#stage').innerHTML = `${postHtml(d, w)}<p class="wrap-line" id="wl" role="status" aria-live="polite"></p>`;
    const post = $('#post'), line = $('#wl');
    const steps = [
      ['s1', '正在挑选合适的丝带……', 900],
      ['s2', '把第一段记忆折好……', 900],
      ['s3', '在里面藏一点光……', 800],
      ['s4', '贴上一枚圣诞邮票……', 700],
      ['s5', '把它留给接下来的日子……', 1300],
    ];
    for (const [cls, text, ms] of steps) {
      if (!ctx.isCurrent()) return;
      post.classList.add(cls);
      line.textContent = text;
      await wait(rm ? 150 : ms);
    }
    store.set({ wrapped: true });
    if (ctx.isCurrent()) navigate('/create/send');
  });
}
