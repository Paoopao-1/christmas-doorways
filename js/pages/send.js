import { store } from '../store.js';
import { navigate } from '../router.js';
import { buildWorld } from '../data/worlds.js';
import { buildDays, giftYear } from '../data/days.js';
import { postHtml } from '../ui/post.js';
import { encodeGift, shareUrl } from '../share.js';
import { esc, toast } from '../util.js';

// C10 · 送出礼物：把礼物保存到服务器，生成唯一的 /gift/<礼物编号> 链接
const GIFT_FIELDS = ['to', 'from', 'anonymous', 'relationship', 'scene', 'sceneText', 'detail', 'worldKey', 'days', 'endOn', 'allowEarly',
  'treeStyle', 'ornPalette', 'starStyle', 'notes', 'letter', 'finalWish', 'coverLine', 'photos'];

function payload(d) {
  const out = {};
  for (const k of GIFT_FIELDS) out[k] = d[k];
  out.year = d.year || giftYear();
  out.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  // 保存每扇门的最终内容，之后网站更新也不会改变已经送出的礼物
  out.doors = buildDays(d).filter((x) => !x.final).map((x) => ({ f: x.content.f, title: x.content.title, body: x.content.body, act: x.content.act }));
  return out;
}

async function saveToServer(d) {
  const res = await fetch('/api/gifts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload(d)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || '保存失败'); e.status = res.status; throw e; }
  return { id: data.id, url: `${location.origin}${data.path}` };
}

export function render(root) {
  const d = store.get();
  const w = buildWorld(d.worldKey, d);
  const to = esc(d.to.trim());

  root.innerHTML = `
  <section class="page send-page">
    <header class="page-head">
      <p class="eyebrow rise">送出礼物</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">有些礼物，<br><span class="tilt">适合慢慢打开。</span></h1>
    </header>
    <div class="rise" style="--d:.2s">${postHtml(d, w, { cls: 's1 s2 s3 s4 s5 sealed' })}</div>
    <div id="out">
      <div class="actions"><button class="btn btn-primary" id="send" type="button">送出这份礼物</button></div>
      <div class="back-row"><button class="link" id="back" type="button">再拆开改一改</button></div>
    </div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  $('#back').addEventListener('click', () => navigate('/create/wrap'));

  const show = ({ id, url, offline }) => {
    $('#out').innerHTML = `
      <p class="wrap-line">你的圣诞礼物，已经准备好出发了。</p>
      <div class="share-box">
        <label class="flabel" for="url" style="font-size:22px">${to}的专属礼物链接</label>
        <div class="share-url">
          <input id="url" readonly value="${esc(url)}">
          <button class="btn btn-red sm" id="copy" type="button">复制链接</button>
        </div>
        <p class="share-meta">${offline ? '这是离线链接：整份礼物装在链接里。' : `礼物编号 ${esc(id)} · 已保存，TA 在任何设备上打开都能收到，不需要注册。`}</p>
        ${offline ? `<p class="warn"><b>服务器暂时连不上，</b>所以先生成了离线链接。它同样能打开礼物，但开启进度只会保存在 TA 当前的浏览器里。</p>` : ''}
        <div class="actions" style="margin-top:22px">
          ${navigator.share ? '<button class="btn btn-ghost" id="native" type="button">用手机分享</button>' : ''}
          <a class="btn btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">以${to}的视角打开</a>
        </div>
        <div class="back-row"><button class="link" id="again" type="button">再准备一份礼物</button></div>
      </div>`;
    $('#copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('链接已复制，可以发给 TA 了'); }
      catch { $('#url').select(); document.execCommand('copy'); toast('链接已复制'); }
    });
    $('#native')?.addEventListener('click', () => navigator.share({ title: `给${d.to.trim()}的圣诞礼物`, text: '有人为你准备了一份圣诞礼物，每天打开一扇门。', url }).catch(() => {}));
    $('#again').addEventListener('click', () => {
      if (!window.confirm('开始准备一份新的礼物？当前的草稿会被清空，已经送出的礼物和链接不受影响。')) return;
      store.reset();
      navigate('/create/for');
    });
  };

  $('#send').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '正在封好、寄出……';
    try {
      const sent = await saveToServer(store.get());
      store.set({ lastSent: sent });
      show(sent);
    } catch (err) {
      // 服务器不可用（例如本地预览）时，退回到离线链接
      if (err.status && err.status < 500 && err.status !== 404) {
        toast(err.message);
        btn.disabled = false;
        btn.textContent = '送出这份礼物';
        return;
      }
      try {
        const token = await encodeGift(store.get(), { withPhotos: true });
        show({ url: shareUrl(token), offline: true });
      } catch {
        toast('生成链接时出了点问题，请再试一次');
        btn.disabled = false;
        btn.textContent = '送出这份礼物';
      }
    }
  });
}
