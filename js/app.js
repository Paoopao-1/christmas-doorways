import { store } from './store.js';
import { navigate, currentPath } from './router.js';
import { applyDeckle } from './util.js';
import * as landing from './pages/landing.js';
import * as giftFor from './pages/gift-for.js';
import * as imagine from './pages/imagine.js';
import * as worldReveal from './pages/world-reveal.js';
import * as shape from './pages/shape.js';
import * as treeStudio from './pages/tree-studio.js';
import * as doors from './pages/doors.js';
import * as wrap from './pages/wrap.js';
import * as send from './pages/send.js';
import * as recipient from './pages/recipient.js';

// 创建者进度：小门图标，当前步骤才显示文字
const STEPS = ['送给谁', '想象', '世界', '塑造', '装饰', '编辑', '包装', '送出'];

const needName = (d) => (d.to.trim() ? null : '/create/for');
const needScene = (d) => needName(d) || (d.scene ? null : '/create/imagine');
const needWorld = (d) => needScene(d) || (d.worldKey ? null : '/create/world');

const routes = {
  '/':               { page: landing,     step: null },
  '/create/for':     { page: giftFor,     step: 0 },
  '/create/imagine': { page: imagine,     step: 1, guard: needName },
  '/create/world':   { page: worldReveal, step: 2, guard: needScene },
  '/create/shape':   { page: shape,       step: 3, guard: needWorld },
  '/create/tree':    { page: treeStudio,  step: 4, guard: needWorld },
  '/create/doors':   { page: doors,       step: 5, guard: needWorld },
  '/create/wrap':    { page: wrap,        step: 6, guard: needWorld },
  '/create/send':    { page: send,        step: 7, guard: needWorld },
  '/gift/preview':   { page: recipient,   step: null, guard: needWorld, mode: 'preview' },
  '/sample':         { page: recipient,   step: null, mode: 'sample' },
};

function match(path) {
  if (routes[path]) return { ...routes[path] };
  const s = path.match(/^\/server\/([A-Za-z0-9]+)$/);
  if (s) return { page: recipient, step: null, mode: 'server', param: s[1] };
  const m = path.match(/^\/g\/(.+)$/);
  if (m) return { page: recipient, step: null, mode: 'real', param: m[1] };
  return null;
}

const app = document.getElementById('app');
let renderId = 0;
let cleanups = [];

function updateSteps(cur) {
  const nav = document.getElementById('steps');
  if (cur == null) { nav.hidden = true; nav.innerHTML = ''; return; }
  nav.hidden = false;
  nav.innerHTML = STEPS.map((s, i) => {
    const cls = i < cur ? 'done' : i === cur ? 'current' : '';
    return `<span class="step ${cls}" ${i === cur ? 'aria-current="step"' : ''}><i aria-hidden="true"></i><span>${s}</span></span>`;
  }).join('');
}

async function route() {
  const path = currentPath();
  const r = match(path);
  if (!r) { navigate('/', true); return; }
  const redirect = r.guard?.(store.get());
  if (redirect) { navigate(redirect, true); return; }

  cleanups.forEach((fn) => fn());
  cleanups = [];
  document.querySelectorAll('dialog[open]').forEach((dl) => dl.close());

  const id = ++renderId;
  const ctx = { isCurrent: () => id === renderId, onCleanup: (fn) => cleanups.push(fn), mode: r.mode, param: r.param };
  updateSteps(r.step);
  window.scrollTo(0, 0);
  const cleanup = await r.page.render(app, ctx);
  if (typeof cleanup === 'function') cleanups.push(cleanup);
  if (ctx.isCurrent()) {
    applyDeckle(app);
    app.querySelector('h1')?.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', route);
route();
