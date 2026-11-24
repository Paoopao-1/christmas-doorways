import { navigate } from '../router.js';
import { garland } from '../ui/decor.js';
import { cover } from '../art.js';

// C1 · Landing / 首页
export function render(root) {
  root.innerHTML = `
  <div class="landing-garland rise" aria-hidden="true">${garland(7)}</div>
  <section class="page landing">
    <div class="door rise" id="door" aria-hidden="true">
      <div class="door-light"></div>
      <div class="door-leaf"><span class="wreath"></span><span class="knob"></span></div>
    </div>

    <p class="eyebrow rise" style="--d:.25s">一份慢慢打开的圣诞礼物</p>
    <h1 class="h1 rise" style="--d:.4s" tabindex="-1">有些礼物，<br><span class="tilt">要<span class="accent">一扇门</span>一扇门地打开。</span></h1>
    <p class="lede rise" style="--d:.55s; margin:0 auto">为一个重要的人，准备一份每天只能打开一次的圣诞礼物。<br>直到圣诞节那天，它才完整揭晓。</p>

    <div class="actions rise" style="--d:.7s">
      <button class="btn btn-primary" id="begin" type="button">开始准备一份礼物</button>
    </div>
    <div class="back-row rise" style="--d:.8s">
      <button class="link" id="sample" type="button">看看一份礼物如何展开</button>
    </div>

    <div class="stamp-collage rise" style="--d:.9s" role="img" aria-label="礼物示例：致小雨，十二扇门，12月14日到12月25日">
      <span class="mini-stamp s1"><span class="perf ms-face"><span class="ms-art">${cover('snow')}</span><span class="ms-txt">12 / 14</span></span></span>
      <span class="mini-stamp s2"><span class="perf ms-face"><span class="ms-art">${cover('forest', 'b')}</span><span class="ms-txt">致 小雨</span></span></span>
      <span class="mini-stamp s3"><span class="perf ms-face"><span class="ms-art">${cover('station')}</span><span class="ms-txt">12 / 25</span></span></span>
    </div>

    <div class="candy-rule rise" style="--d:1s" aria-hidden="true"></div>

    <ol class="trio rise" style="--d:1s">
      <li><b>一</b><span>想起一个人</span><small>TA 是谁，这份礼物就为谁而生</small></li>
      <li><b>二</b><span>为 TA 想象一个世界</span><small>落雪的公寓、无月的森林，<br>或只属于你们的地方</small></li>
      <li><b>三</b><span>每天一扇门</span><small>TA 每天打开一次，直到圣诞</small></li>
    </ol>
  </section>`;

  const door = root.querySelector('#door');
  const begin = root.querySelector('#begin');
  const open = () => door.classList.add('ajar');
  const close = () => door.classList.remove('ajar');
  begin.addEventListener('mouseenter', open);
  begin.addEventListener('focus', open);
  begin.addEventListener('mouseleave', close);
  begin.addEventListener('blur', close);

  begin.addEventListener('click', () => {
    open();
    setTimeout(() => navigate('/create/for'), 380);
  });

  root.querySelector('#sample').addEventListener('click', () => navigate('/sample'));
}
