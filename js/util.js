export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const fromName = (d) =>
  d.anonymous || !d.from?.trim() ? '一个想着你的人' : d.from.trim();

// 不规则的手撕纸边：返回 clip-path 用的 polygon()
export function deckle(seed = 1, amp = 0.9, step = 4) {
  let s = seed >>> 0 || 1;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pts = [];
  const j = () => (r() * amp).toFixed(2);
  for (let x = 0; x < 100; x += step) pts.push(`${x}% ${j()}%`);
  for (let y = 0; y < 100; y += step) pts.push(`${(100 - +j()).toFixed(2)}% ${y}%`);
  for (let x = 100; x > 0; x -= step) pts.push(`${x}% ${(100 - +j()).toFixed(2)}%`);
  for (let y = 100; y > 0; y -= step) pts.push(`${j()}% ${y}%`);
  return `polygon(${pts.join(',')})`;
}

export function applyDeckle(root) {
  root.querySelectorAll('[data-deckle]').forEach((el, i) => {
    el.style.setProperty('--deckle', deckle(+el.dataset.deckle || i + 3, +el.dataset.amp || 0.9));
  });
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
