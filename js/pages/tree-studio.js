import { store, DEFAULT_LETTER } from '../store.js';
import { progress } from '../progress.js';
import { navigate } from '../router.js';
import { buildDays } from '../data/days.js';
import { TREE_STYLES, PALETTES, STARS } from '../data/tree-options.js';
import { Tree } from '../tree.js';
import { icon } from '../ui/decor.js';
import { esc, toast, applyDeckle } from '../util.js';

const MAX_PHOTOS = 3;

// 三种画风的小样图
const STYLE_THUMB = {
  painted: `<svg class="style-thumb" viewBox="0 0 54 46" aria-hidden="true"><rect width="54" height="46" rx="3" fill="#3E5869"/><g stroke-linecap="round" stroke-width="4"><path d="M27 6 l-6 10 M27 6 l6 10" stroke="#3B6750"/><path d="M27 14 l-11 13 M27 14 l11 13 M22 20 l-4 6" stroke="#2C5240"/><path d="M27 22 l-15 15 M27 22 l15 15 M31 28 l6 8" stroke="#4E7D5D"/></g><circle cx="21" cy="28" r="2.6" fill="#B62935" stroke="#3A2A22"/><circle cx="33" cy="20" r="2.2" fill="#F1D47B"/><path d="M0 40 q27 -6 54 0 v6 H0z" fill="#F5EBD8"/></svg>`,
  handmade: `<svg class="style-thumb" viewBox="0 0 54 46" aria-hidden="true"><rect width="54" height="46" rx="3" fill="#EADBBD"/><path d="M27 5 L37 18 H17Z" fill="#3B6A51" stroke="#3A2A22" stroke-width="1.4"/><path d="M27 12 L42 28 q-3.7 3 -7.5 0 q-3.7 3 -7.5 0 q-3.7 3 -7.5 0 q-3.7 3 -7.5 0Z" fill="#2E5642" stroke="#3A2A22" stroke-width="1.4"/><path d="M15 26 h24" stroke="#F5EBD8" stroke-dasharray="2 2"/><path d="M14 22 q13 6 26 0" fill="none" stroke="#3A2A22" stroke-width=".8"/><path d="M19 24 l2 4 l2 -4 M29 25 l2 4 l2 -4" fill="#B62935"/><rect x="24" y="33" width="6" height="6" fill="#795747"/></svg>`,
  starlight: `<svg class="style-thumb" viewBox="0 0 54 46" aria-hidden="true"><rect width="54" height="46" rx="3" fill="#252F3C"/><g fill="#CFE6D9">${Array.from({ length: 40 }, (_, i) => { const y = 8 + ((i * 7) % 30); const half = (y - 6) * 0.45; const x = 27 + (((i * 13) % 20) / 20 - 0.5) * 2 * half; return `<circle cx="${x.toFixed(1)}" cy="${y}" r=".9"/>`; }).join('')}</g><path d="M14 30 q13 -6 26 -2 M18 20 q10 -4 18 -1" fill="none" stroke="#F1D47B" stroke-width=".8" stroke-dasharray="1 2"/><path d="M27 3 l1.2 2.6 2.8.3 -2.1 1.9.6 2.8 -2.5-1.4 -2.5 1.4.6-2.8 -2.1-1.9 2.8-.3z" fill="#F1D47B"/></svg>`,
};

// 把照片压缩成小尺寸，避免本地存储空间不够
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 720;
      const r = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('无法读取这张图片')); };
    img.src = url;
  });
}

// C5 · 装饰圣诞树（创建者自定义）
export function render(root) {
  const d = store.get();
  const to = esc(d.to.trim());

  root.innerHTML = `
  <section class="page studio">
    <header class="page-head">
      <p class="eyebrow rise">装饰圣诞树</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">为${to}准备一棵圣诞树</h1>
      <p class="lede rise" style="--d:.2s">TA 每打开一扇门，树上就会多一件挂饰。到最后一天，由 TA 亲手放上树顶的星星。</p>
    </header>

    <div class="studio-grid">
      <div class="studio-preview rise" style="--d:.3s">
        <div class="tree-stage small"><canvas id="tree" data-deckle="17" aria-label="圣诞树预览，可以拖动旋转"></canvas></div>
        <div class="seg center" role="group" aria-label="预览哪一天">
          <button type="button" data-when="first" aria-pressed="false">第一天的样子</button>
          <button type="button" data-when="last" aria-pressed="true">圣诞夜的样子</button>
        </div>
        <p class="hint center">拖动旋转 · 点挂饰查看它属于哪一天</p>
      </div>

      <div class="studio-controls rise" style="--d:.4s">
        <fieldset class="opt">
          <legend>树的风格</legend>
          <div class="opt-row">
            ${Object.entries(TREE_STYLES).map(([k, v]) => `
              <button type="button" class="opt-card" data-style="${k}" aria-pressed="${k === d.treeStyle}">
                ${STYLE_THUMB[k]}${v.label}<small>${v.desc}</small>
              </button>`).join('')}
          </div>
        </fieldset>

        <fieldset class="opt">
          <legend>挂饰配色</legend>
          <div class="opt-row">
            ${Object.entries(PALETTES).map(([k, v]) => `
              <button type="button" class="opt-card" data-palette="${k}" aria-pressed="${k === d.ornPalette}">
                <span class="swatch">${v.colors.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}</span>${v.label}
              </button>`).join('')}
          </div>
        </fieldset>

        <fieldset class="opt">
          <legend>树顶星星</legend>
          <div class="opt-row">
            ${Object.entries(STARS).map(([k, v]) => `
              <button type="button" class="opt-card" data-star="${k}" aria-pressed="${k === d.starStyle}">
                ${icon(v.icon)}${v.label}
              </button>`).join('')}
          </div>
        </fieldset>

        <fieldset class="opt">
          <legend>照片挂饰</legend>
          <p class="hint">最多 ${MAX_PHOTOS} 张，会变成 TA 树上的小相框。照片只保存在这台设备上。</p>
          <input type="file" id="photoIn" accept="image/*" multiple hidden>
          <div class="thumbs" id="thumbs"></div>
        </fieldset>

        <fieldset class="opt">
          <legend>给挂饰留一句话</legend>
          <p class="hint">TA 打开那一天的门时，会读到你写在这件挂饰上的话。</p>
          <div class="note-form">
            <select class="select" id="noteDay" aria-label="选择挂饰"></select>
            <textarea class="textarea" id="noteText" maxlength="60" rows="2" placeholder="比如：这个铃铛，是我们第一次一起过圣诞时买的。"></textarea>
            <button type="button" class="btn btn-ghost sm" id="noteAdd">挂上这句话</button>
          </div>
          <ul class="notes" id="notes"></ul>
        </fieldset>
      </div>
    </div>

    <section class="letters">
      <h2 class="section-title">写下你的话</h2>
      <div class="field">
        <label class="flabel" for="letter">开场信</label>
        <p class="hint">TA 第一次打开礼物时，拆开信封读到的话。</p>
        <textarea class="textarea paper-input" id="letter" rows="4" maxlength="300">${esc(d.letter || DEFAULT_LETTER)}</textarea>
      </div>
      <div class="field">
        <label class="flabel" for="wish">最终祝福</label>
        <p class="hint">树顶的星星被点亮后，TA 会读到这段话。只有你能写。</p>
        <textarea class="textarea paper-input" id="wish" rows="5" maxlength="500" placeholder="写下你最想让 TA 在圣诞节那天读到的话……">${esc(d.finalWish)}</textarea>
      </div>
    </section>

    <div class="actions">
      <button class="btn btn-primary" id="next" type="button">下一步：编辑礼盒</button>
      <button class="btn btn-ghost" id="preview" type="button">以${to}的视角预览</button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">返回塑造礼物</button></div>
  </section>`;

  const $ = (s) => root.querySelector(s);
  let when = 'last';
  let days = buildDays(store.get());

  applyDeckle(root);
  const tree = new Tree($('#tree'), {
    style: d.treeStyle,
    star: d.starStyle,
    palette: (PALETTES[d.ornPalette] || PALETTES.classic).colors,
    onPick: (o) => {
      if (o.kind === 'topstar') { toast('树顶星星：最后一天由 TA 亲手放上去'); return; }
      toast(`第 ${o.day} 扇门 · ${o.name}${o.note ? `：${o.note}` : ''}`);
    },
  });

  const refreshTree = () => {
    const cur = store.get();
    days = buildDays(cur);
    tree.setOptions({ style: cur.treeStyle, star: cur.starStyle, palette: (PALETTES[cur.ornPalette] || PALETTES.classic).colors });
    if (when === 'last') {
      tree.setOrnaments(days.filter((x) => !x.final).map((x) => x.ornament));
      tree.setProgress(1);
      tree.setStarPlaced(true);
    } else {
      tree.setOrnaments([]);
      tree.setProgress(0);
      tree.setStarPlaced(false);
    }
  };

  const refreshNotes = () => {
    const cur = store.get();
    const regular = days.filter((x) => !x.final);
    const sel = $('#noteDay');
    const keep = sel.value;
    sel.innerHTML = regular.map((x) => `<option value="${x.day}">第 ${x.day} 扇门 · ${x.ornament.name}</option>`).join('');
    if (keep && regular.some((x) => String(x.day) === keep)) sel.value = keep;
    const entries = Object.entries(cur.notes || {}).filter(([k]) => regular.some((x) => String(x.day) === k)).sort((a, b) => a[0] - b[0]);
    $('#notes').innerHTML = entries.length
      ? entries.map(([k, v]) => {
        const x = regular.find((y) => String(y.day) === k);
        return `<li><span><b>第 ${k} 扇 · ${x.ornament.name}</b>${esc(v)}</span><button type="button" data-del="${k}">删除</button></li>`;
      }).join('')
      : '<li class="empty">还没有留言。挑一件挂饰，写一句只有 TA 懂的话。</li>';
  };

  const refreshThumbs = () => {
    const photos = store.get().photos || [];
    $('#thumbs').innerHTML = photos.map((p, i) => `
      <div class="thumb-item"><img src="${p}" alt="照片挂饰 ${i + 1}"><button type="button" data-rm="${i}" aria-label="移除第 ${i + 1} 张照片">×</button></div>`).join('')
      + (photos.length < MAX_PHOTOS ? `<button type="button" class="thumb-add" id="addPhoto">${icon('photo')}<span>添加照片</span></button>` : '');
  };

  const refreshAll = () => { refreshTree(); refreshNotes(); refreshThumbs(); };

  const pressed = (attr, val) => root.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === val)));
  root.querySelectorAll('[data-style]').forEach((b) => b.addEventListener('click', () => { store.set({ treeStyle: b.dataset.style }); pressed('style', b.dataset.style); refreshTree(); }));
  root.querySelectorAll('[data-palette]').forEach((b) => b.addEventListener('click', () => { store.set({ ornPalette: b.dataset.palette }); pressed('palette', b.dataset.palette); refreshTree(); }));
  root.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', () => {
    store.set({ starStyle: b.dataset.star }); pressed('star', b.dataset.star);
    if (when === 'first') { when = 'last'; pressed('when', 'last'); }
    refreshTree();
  }));
  root.querySelectorAll('[data-when]').forEach((b) => b.addEventListener('click', () => { when = b.dataset.when; pressed('when', when); refreshTree(); }));

  $('#thumbs').addEventListener('click', (e) => {
    if (e.target.closest('#addPhoto')) { $('#photoIn').click(); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const photos = [...(store.get().photos || [])];
      photos.splice(+rm.dataset.rm, 1);
      store.set({ photos });
      refreshAll();
    }
  });
  $('#photoIn').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - (store.get().photos || []).length);
    e.target.value = '';
    try {
      const added = await Promise.all(files.map(shrink));
      store.set({ photos: [...(store.get().photos || []), ...added] });
      refreshAll();
      if (added.length) toast(`已添加 ${added.length} 张照片挂饰`);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#noteAdd').addEventListener('click', () => {
    const text = $('#noteText').value.trim();
    if (!text) { $('#noteText').focus(); return; }
    store.set({ notes: { ...(store.get().notes || {}), [$('#noteDay').value]: text } });
    $('#noteText').value = '';
    days = buildDays(store.get());
    refreshAll();
    toast('留言已经挂上');
  });
  $('#notes').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    const notes = { ...(store.get().notes || {}) };
    delete notes[del.dataset.del];
    store.set({ notes });
    days = buildDays(store.get());
    refreshAll();
  });

  $('#letter').addEventListener('input', (e) => store.set({ letter: e.target.value }));
  $('#wish').addEventListener('input', (e) => store.set({ finalWish: e.target.value }));

  $('#next').addEventListener('click', () => navigate('/create/doors'));
  $('#preview').addEventListener('click', () => {
    progress.use('preview');
    if (!store.get().letter) store.set({ letter: $('#letter').value });
    progress.reset();
    navigate('/gift/preview');
  });
  $('#back').addEventListener('click', () => navigate('/create/shape'));

  refreshAll();
  return () => tree.destroy();
}
