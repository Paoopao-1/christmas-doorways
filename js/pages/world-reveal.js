import { store } from '../store.js';
import { navigate } from '../router.js';
import { SCENES, worldOrder, buildWorld } from '../data/worlds.js';
import { cover } from '../art.js';
import { esc, fromName, reducedMotion, wait } from '../util.js';
import { bow, hollySprig, postmark } from '../ui/decor.js';
import { giftYear } from '../data/days.js';

// C5 · World reveal / 世界揭示（含生成过渡）
export async function render(root, ctx) {
  let d = store.get();

  if (d.needsWeave || !d.worldKey) {
    const order = worldOrder(d.scene);
    const key = order[(d.worldIndex || 0) % order.length];
    await weave(root, d, ctx, (d.worldIndex || 0) > 0);
    if (!ctx.isCurrent()) return;
    d = store.set({ worldKey: key, needsWeave: false });
  }

  show(root, d, ctx);
}

async function weave(root, d, ctx, again) {
  const scene = SCENES.find((s) => s.id === d.scene) || SCENES[0];
  const lines = again
    ? ['换一束光……', `重新为 ${d.to.trim()} 想象……`, scene.weaveLine]
    : ['正在写下第一段记忆……', `正在为 ${d.to.trim()} 寻找一束光……`, scene.weaveLine];

  root.innerHTML = `
  <section class="page weave">
    <div>
      <div class="lantern" aria-hidden="true"></div>
      <p class="weave-line out" id="wl" role="status" aria-live="polite"></p>
      <div class="weave-bar" aria-hidden="true"><i id="wb"></i></div>
    </div>
  </section>`;

  const line = root.querySelector('#wl');
  const bar = root.querySelector('#wb');
  const per = reducedMotion() ? 700 : (again ? 1000 : 1400);

  bar.style.transition = `width ${per * lines.length}ms linear`;
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '100%'; }));

  for (const text of lines) {
    if (!ctx.isCurrent()) return;
    line.textContent = text;
    line.classList.remove('out');
    await wait(per - 400);
    line.classList.add('out');
    await wait(400);
  }
}

function show(root, d, ctx) {
  const w = buildWorld(d.worldKey, d);
  const to = esc(d.to.trim());
  const isSelf = d.relationship === 'self';
  let t = 0;
  const step = () => `style="--d:${(t += 0.12).toFixed(2)}s"`;

  root.innerHTML = `
  <section class="page reveal">
    <p class="eyebrow rise" ${step()}>为 ${to} 而生的圣诞世界</p>
    <div class="cover-wrap rise" ${step()}>
      <figure class="cover perf">
        <span class="cover-in">${cover(w.scene, w.variant)}</span>
        <figcaption>插画占位</figcaption>
      </figure>
      <span class="cover-mark" aria-hidden="true">${postmark(esc(d.to.trim().slice(0, 6)), `${giftYear()} · 圣诞`)}</span>
      <span class="cover-bow" aria-hidden="true">${bow('#c0392f', 70)}</span>
    </div>
    <h1 class="h1 world-name rise" ${step()} tabindex="-1">${esc(w.name)}</h1>
    <p class="lede rise" ${step()} style="margin:0 auto">${esc(w.tagline)}</p>
    ${w.quote ? `<blockquote class="quote rise" ${step()}>你写下：「${esc(w.quote)}」</blockquote>` : ''}

    <span class="holly-mark rise" ${step()} aria-hidden="true">${hollySprig(52)}</span>
    <h2 class="section-title rise" ${step()} style="margin-top:6px">这个世界的样子</h2>
    <ul class="anchors">
      ${w.anchors.map((a) => `<li class="rise ${a.detail ? 'detail' : ''}" ${step()}>${esc(a.text)}</li>`).join('')}
    </ul>

    <h2 class="section-title rise" ${step()}>它会如何展开</h2>
    <ol class="arc rise" ${step()}>
      ${w.arc.map(([phase, text]) => `<li><i aria-hidden="true"></i><div><b>${phase}</b><span>${esc(text)}</span></div></li>`).join('')}
    </ol>
    <p class="note rise" ${step()}>具体有几扇门、每扇门里藏着什么，会在接下来的「塑造礼物」和「编辑礼盒」里，由你亲手决定。</p>

    <div class="actions rise" ${step()}>
      <button class="btn btn-primary" id="keep" type="button">就是它</button>
      <button class="btn btn-ghost" id="again" type="button">换一个方向</button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">回去改一改想象</button></div>

    <p class="from-line">致 ${to}<span aria-hidden="true">　·　</span>来自 ${esc(isSelf && !d.from.trim() && !d.anonymous ? '现在的我' : fromName(d))}</p>
  </section>`;

  root.querySelector('#keep').addEventListener('click', () => navigate('/create/shape'));
  root.querySelector('#again').addEventListener('click', async () => {
    store.set({ worldIndex: (store.get().worldIndex || 0) + 1, needsWeave: true });
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    await render(root, ctx);
    if (ctx.isCurrent()) root.querySelector('h1')?.focus({ preventScroll: true });
  });
  root.querySelector('#back').addEventListener('click', () => navigate('/create/imagine'));
}
