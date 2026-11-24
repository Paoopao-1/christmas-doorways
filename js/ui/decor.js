// 圣诞装饰元素：图标、松枝花环、蝴蝶结、冬青、邮戳、屋顶
const rng = (seed) => {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};

const P = {
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 3v2"/>',
  snowflake: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
  tree: '<path d="M12 2.5l-6 8h3l-4 6h14l-4-6h3z"/><path d="M12 16.5v4"/>',
  candy: '<path d="M9 21V8.5a4 4 0 0 1 8 0V10"/><path d="M9 13l3-1.6M9 17l3-1.6M13.2 6.2l1.6 2.4"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 1 6-1.5S14 5 12 9z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  mitten: '<path d="M8 20h8v-8a4 4 0 0 0-6.6-3L8 10.4 6.6 8.8a1.6 1.6 0 0 0-2.4 2.1L8 15.5z"/><path d="M8 17.5h8"/>',
  ball: '<circle cx="12" cy="14" r="6.5"/><path d="M10 7.5h4M12 4v3.5M6 13c3 1.5 9 1.5 12 0"/>',
  holly: '<path d="M12 12c-3-4-7-3-8-1 2 0 2 2 4 2-1 1-1 3 0 3 2-1 3-2 4-4zM12 12c3-4 7-3 8-1-2 0-2 2-4 2 1 1 1 3 0 3-2-1-3-2-4-4z"/><circle cx="12" cy="10" r="1.6"/>',
  candle: '<rect x="9" y="10" width="6" height="11" rx="1"/><path d="M12 3c1.5 2 1.5 3.5 0 5-1.5-1.5-1.5-3 0-5z"/>',
  moon: '<path d="M16 3.5a8.5 8.5 0 1 0 4.5 13A7 7 0 0 1 16 3.5z"/>',
  bow: '<path d="M12 11c-3-4-8-4-8-1s5 2 8 1zm0 0c3-4 8-4 8-1s-5 2-8 1z"/><path d="M11 12l-3 8M13 12l3 8"/>',
  envelope: '<rect x="3.5" y="6" width="17" height="12" rx="1"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  photo: '<rect x="5" y="3.5" width="14" height="17" rx="1"/><rect x="7.2" y="5.7" width="9.6" height="9.6"/>',
};

export const ICON_CYCLE = ['star', 'bell', 'snowflake', 'tree', 'candy', 'gift', 'heart', 'mitten', 'ball', 'holly', 'candle', 'moon'];

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;

export const ORN_ICON = { ball: 'ball', star: 'star', bell: 'bell', bow: 'bow', snowflake: 'snowflake', gift: 'gift', envelope: 'envelope', keepsake: 'heart', photo: 'photo', topstar: 'star' };

// 松枝花环：程序生成的针叶、红浆果和小彩球
export function garland(seed = 5) {
  const W = 1200, r = rng(seed);
  const greens = ['#1d5640', '#2f6b4a', '#3f8460', '#24503c', '#356f50'];
  const yAt = (x) => 14 + 30 * Math.sin(Math.PI * Math.max(0, Math.min(W, x)) / W);
  let needles = '', extras = '';
  for (let x = -10; x <= W + 10; x += 5) {
    const y = yAt(x);
    for (let k = 0; k < 3; k++) {
      const ang = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.7;
      const len = 10 + r() * 13;
      needles += `<line x1="${x}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(ang) * len * 0.8).toFixed(1)}" y2="${(y + Math.sin(ang) * len).toFixed(1)}" stroke="${greens[(r() * 5) | 0]}"/>`;
    }
  }
  for (let x = 50; x < W; x += 90 + r() * 50) {
    const y = yAt(x) + 6;
    if (r() > 0.5) {
      extras += [[0, 0], [5, 3], [-4, 4]].map(([dx, dy]) =>
        `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="3.6" fill="#c0392f"/><circle cx="${(x + dx - 1).toFixed(1)}" cy="${(y + dy - 1.2).toFixed(1)}" r="1" fill="#fff" opacity=".6"/>`).join('');
    } else {
      const by = y + 12, c = ['#c0392f', '#f0c674', '#e9e2cf'][(r() * 3) | 0];
      extras += `<line x1="${x}" y1="${y}" x2="${x}" y2="${by - 8}" stroke="#c9a55a" stroke-width="1"/><rect x="${x - 2.5}" y="${by - 9}" width="5" height="4" fill="#c9a55a"/><circle cx="${x}" cy="${by}" r="7" fill="${c}"/><circle cx="${x - 2.2}" cy="${by - 2.4}" r="2" fill="#fff" opacity=".55"/>`;
    }
  }
  return `<svg class="garland" viewBox="0 0 ${W} 84" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><g stroke-width="2.4" stroke-linecap="round">${needles}</g>${extras}</svg>`;
}

export const bow = (c = '#c0392f', w = 64) => `<svg viewBox="0 0 64 48" width="${w}" aria-hidden="true">
  <path d="M30 23 L20 46 L25.5 42 L29 47.5 L33 25Z" fill="${c}"/><path d="M34 23 L44 46 L38.5 42 L35 47.5 L31 25Z" fill="${c}"/>
  <path d="M32 21 C20 4 3 6 5 18 C7 30 22 28 32 24Z" fill="${c}"/><path d="M32 21 C44 4 61 6 59 18 C57 30 42 28 32 24Z" fill="${c}"/>
  <path d="M30 21 C21 10 11 10 11 17" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2"/><path d="M34 21 C43 10 53 10 53 17" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2"/>
  <rect x="26.5" y="17" width="11" height="11" rx="3.5" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/></svg>`;

export const hollySprig = (w = 56) => `<svg viewBox="0 0 56 36" width="${w}" aria-hidden="true">
  <path d="M28 20 C18 6 6 8 2 14 C7 14 8 19 13 19 C10 23 11 28 14 28 C20 26 24 24 28 20Z" fill="#2f6b4a"/>
  <path d="M28 20 C38 6 50 8 54 14 C49 14 48 19 43 19 C46 23 45 28 42 28 C36 26 32 24 28 20Z" fill="#24503c"/>
  <circle cx="25" cy="17" r="4" fill="#c0392f"/><circle cx="31" cy="16" r="4" fill="#d24a3e"/><circle cx="28" cy="22" r="4" fill="#b23229"/></svg>`;

export const postmark = (top, bottom) => `<svg class="postmark" viewBox="0 0 190 120" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="60" cy="60" r="46"/><circle cx="60" cy="60" r="36"/>
  <path d="M112 42q10-8 20 0t20 0t20 0"/><path d="M112 60q10-8 20 0t20 0t20 0"/><path d="M112 78q10-8 20 0t20 0t20 0"/></g>
  <text x="60" y="56" text-anchor="middle" font-size="13" fill="currentColor">${top}</text>
  <text x="60" y="75" text-anchor="middle" font-size="11" fill="currentColor">${bottom}</text></svg>`;

// 手绘圣诞小屋屋顶：瓦片、积雪、烟囱和炊烟（带轻微的手绘抖动）
export const roof = () => {
  const r = rng(29);
  const j = (v, a = 2.2) => (v + (r() - 0.5) * a).toFixed(1);
  let tiles = '';
  for (let row = 1; row < 6; row++) {
    const y = 40 + row * 16;
    const half = ((y - 14) / 136) * 300;
    for (let x = 300 - half + 14; x < 300 + half - 10; x += 26) {
      tiles += `<path d="M${j(x)} ${j(y)} q13 ${j(9, 3)} 26 0" fill="none" stroke="#3A2A22" stroke-width="1.3" opacity=".45"/>`;
    }
  }
  return `<svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true">
  <defs><filter id="roofRough"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter></defs>
  <g filter="url(#roofRough)">
    <path d="M${j(458)} 92 L${j(458)} 20 L${j(500)} 22 L${j(500)} 116 Z" fill="#795747" stroke="#3A2A22" stroke-width="2.5"/>
    <path d="M450 22 q25 -10 58 0 l0 8 q-30 6 -58 0z" fill="#FBF4E6" stroke="#3A2A22" stroke-width="2"/>
    <path d="M478 14 q-12 -12 4 -20 q16 -8 6 -20 q-8 -10 8 -16" fill="none" stroke="#87A9BC" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <path d="M-4 150 L${j(300)} 12 L604 150 Z" fill="#B62935" stroke="#3A2A22" stroke-width="3" stroke-linejoin="round"/>
    ${tiles}
    <path d="M-10 152 L300 4 L610 152 L586 152 q-6 14 -14 0 q-10 16 -20 2 L300 30 L48 150 q-8 16 -18 2 q-8 12 -16 0 Z" fill="#FBF4E6" stroke="#3A2A22" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="300" cy="62" r="17" fill="none" stroke="#315B46" stroke-width="9" stroke-dasharray="3 3"/>
    <path d="M292 78 l8 10 l8 -10" fill="#F1D47B" stroke="#3A2A22" stroke-width="1.5"/>
  </g></svg>`;
};
