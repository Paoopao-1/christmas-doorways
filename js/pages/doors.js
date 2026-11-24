import { store } from '../store.js';
import { progress } from '../progress.js';
import { navigate } from '../router.js';
import { buildDays, FORMAT_LABEL, DOOR_TYPE_LABEL } from '../data/days.js';
import { renderDoor } from '../ui/calendar.js';
import { esc, toast } from '../util.js';

// C6 · 编辑礼盒：逐扇查看、改写或换一份内容
export function render(root) {
  const d = store.get();
  const to = esc(d.to.trim());

  root.innerHTML = `
  <section class="page doors-edit">
    <header class="page-head">
      <p class="eyebrow rise">编辑礼盒</p>
      <h1 class="h1 rise" style="--d:.1s" tabindex="-1">一扇一扇地，<br><span class="tilt">为${to}写下去</span></h1>
      <p class="lede rise" style="--d:.2s">每扇门里已经放好了一份内容。你可以直接改写，或者换一份——写下只有你们懂的话，它就真正属于 TA 了。</p>
    </header>
    <ol class="door-list" id="list"></ol>
    <div class="actions">
      <button class="btn btn-primary" id="next" type="button">下一步：包装礼物</button>
      <button class="btn btn-ghost" id="preview" type="button">以${to}的视角预览</button>
    </div>
    <div class="back-row"><button class="link" id="back" type="button">返回装饰圣诞树</button></div>
  </section>`;

  const list = root.querySelector('#list');

  const draw = () => {
    const cur = store.get();
    const days = buildDays(cur);
    list.innerHTML = days.map((x) => {
      if (x.final) {
        return `<li class="door-item di-final">
          <div class="di-door">${renderDoor(x, 'closed', true, true)}</div>
          <div>
            <div class="di-meta"><span>第 ${x.day} 扇 · ${x.label}</span><span class="pill">最后的礼物</span></div>
            <p class="di-title" style="border:0">一颗星星，和你的最终祝福</p>
            <p class="hint" style="margin-top:6px">这扇门里是树顶的星星。TA 放上星星后，会读到你在「装饰圣诞树」里写的最终祝福。</p>
          </div></li>`;
      }
      const edit = (cur.doorEdits || {})[x.day] || {};
      return `<li class="door-item" data-day="${x.day}">
        <div class="di-door">${renderDoor(x, 'closed', true)}</div>
        <div>
          <div class="di-meta"><span>第 ${x.day} 扇 · ${x.label}</span><span class="pill">${FORMAT_LABEL[x.content.f]}</span><span>${DOOR_TYPE_LABEL[x.type]} · ${x.ornament.name}</span></div>
          <input class="di-title" data-k="title" value="${esc(x.content.title)}" aria-label="第 ${x.day} 扇门的标题" maxlength="24">
          <textarea class="textarea di-body" data-k="body" rows="3" maxlength="200" aria-label="第 ${x.day} 扇门的内容">${esc(x.content.body)}</textarea>
          <div class="di-actions">
            <button type="button" class="link" data-act="alt">换一份内容</button>
            ${edit.title || edit.body || edit.alt ? '<button type="button" class="link" data-act="reset">恢复原样</button>' : ''}
            ${x.ornament.note ? `<span class="hint" style="margin:0;align-self:center">挂饰留言：${esc(x.ornament.note)}</span>` : ''}
          </div>
        </div></li>`;
    }).join('');
  };

  const setEdit = (day, patch) => {
    const all = { ...(store.get().doorEdits || {}) };
    const next = { ...(all[day] || {}), ...patch };
    Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] == null || next[k] === 0) delete next[k]; });
    if (Object.keys(next).length) all[day] = next; else delete all[day];
    store.set({ doorEdits: all });
  };

  list.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    const li = e.target.closest('[data-day]');
    if (k && li) setEdit(li.dataset.day, { [k]: e.target.value });
  });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const li = btn?.closest('[data-day]');
    if (!li) return;
    const day = li.dataset.day;
    if (btn.dataset.act === 'alt') {
      const cur = (store.get().doorEdits || {})[day] || {};
      setEdit(day, { alt: (cur.alt || 0) + 1, title: '', body: '' });
      toast(`第 ${day} 扇门换了一份内容`);
    } else {
      const all = { ...(store.get().doorEdits || {}) };
      delete all[day];
      store.set({ doorEdits: all });
    }
    draw();
  });

  root.querySelector('#next').addEventListener('click', () => navigate('/create/wrap'));
  root.querySelector('#preview').addEventListener('click', () => { progress.use('preview'); progress.reset(); navigate('/gift/preview'); });
  root.querySelector('#back').addEventListener('click', () => navigate('/create/tree'));
  draw();
}
