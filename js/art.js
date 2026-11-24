// 封面插画占位：按场景生成的简单 SVG。正式版替换为插画师作品。
let uid = 0;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const dots = (r, n, maxY, minR, varR, minA) => {
  let o = '';
  for (let i = 0; i < n; i++) {
    o += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(r() * maxY).toFixed(1)}" r="${(r() * varR + minR).toFixed(2)}" fill="#fff" opacity="${(r() * .5 + minA).toFixed(2)}"/>`;
  }
  return o;
};

const defs = (id, top, bottom) => `
  <defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="${id}g"><stop offset="0" stop-color="#ffe3a3" stop-opacity=".85"/><stop offset="1" stop-color="#ffe3a3" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd88a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd88a" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="400" height="260" fill="url(#${id}s)"/>`;

function snow(id, r, v) {
  let win = '';
  for (let row = 0; row < 6; row++) {
    for (let c = 0; c < 4; c++) {
      const x = 146 + c * 30, y = 78 + row * 28;
      const special = row === 3 && c === 2;
      const lit = special || (v === 'a' && r() > .55);
      win += `<rect x="${x}" y="${y}" width="16" height="18" rx="1" fill="${lit ? '#F1D47B' : '#3b4c5b'}" opacity="${lit && !special ? .7 : 1}"/>`;
      if (lit) win += `<rect x="${x - 1}" y="${y + 18}" width="18" height="3" fill="#e9eefb" opacity=".85"/>`;
    }
  }
  return `${defs(id, '#2c3e52', '#6d8ea3')}${dots(r, 40, 120, .3, 1, .2)}
    <rect x="28" y="132" width="82" height="128" fill="#24313d"/>
    <rect x="292" y="112" width="86" height="148" fill="#24313d"/>
    <rect x="130" y="62" width="140" height="198" fill="#2f3d4b"/>
    <rect x="126" y="58" width="148" height="6" rx="2" fill="#e9eefb" opacity=".9"/>
    <circle cx="214" cy="171" r="48" fill="url(#${id}g)" opacity=".7"/>
    ${win}
    <path d="M0 236 Q120 222 200 230 T400 228 V260 H0Z" fill="#dfe6f5"/>
    ${dots(r, 50, 260, .6, 1.4, .3)}`;
}

function forest(id, r, v) {
  const layers = [['#3d6e4f', 196, 10, 50], ['#315b46', 220, 9, 62], ['#244536', 252, 7, 80]];
  let trees = '';
  layers.forEach(([fill, base, n, hMax], li) => {
    if (li === 2) trees += `<path d="M0 222 Q200 206 400 224 V260 H0Z" fill="#cdd6ee" opacity=".9"/>
      <path d="M150 260 Q188 236 206 214 Q218 200 222 190" stroke="#f0c674" stroke-opacity=".2" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="224" cy="184" r="44" fill="url(#${id}g)"/>
      <line x1="224" y1="166" x2="224" y2="178" stroke="#2a2420" stroke-width="1.5"/>
      <rect x="219" y="178" width="10" height="13" rx="2" fill="#F1D47B"/>`;
    for (let i = 0; i < n; i++) {
      const x = (i + .5) * (400 / n) + (r() - .5) * 26;
      if (li === 2 && x > 170 && x < 270) continue; // 给小路和灯留出空间
      const h = hMax * (.7 + r() * .4), w = h * .32;
      trees += `<polygon points="${x},${base - h} ${x - w},${base - h * .35} ${x + w},${base - h * .35}" fill="${fill}"/>
        <polygon points="${x},${base - h * .7} ${x - w * 1.3},${base} ${x + w * 1.3},${base}" fill="${fill}"/>`;
    }
  });
  const deer = v === 'b' ? `<g fill="#e9eefb" opacity=".85"><ellipse cx="270" cy="214" rx="14" ry="7"/><rect x="259" y="218" width="2" height="12"/><rect x="278" y="218" width="2" height="12"/><path d="M282 210 l6 -12 l4 2 l-6 12z"/><path d="M289 196 l-3 -6 M289 196 l4 -6" stroke="#e9eefb" stroke-width="1.2"/></g>` : '';
  return `${defs(id, '#22323f', '#4d6878')}${dots(r, 70, 150, .3, .9, .2)}${trees}${deer}${dots(r, 40, 260, .6, 1.3, .3)}`;
}

function station(id, r, v) {
  let windows = '';
  for (let i = 0; i < 6; i++) windows += `<rect x="${192 + i * 34}" y="150" width="20" height="16" rx="2" fill="#F1D47B" opacity="${v === 'b' && i % 2 ? .35 : .9}"/>`;
  return `${defs(id, '#2b3a4c', '#768fa0')}${dots(r, 45, 120, .3, 1, .2)}
    <g fill="#2a3644">${[20, 60, 95, 330, 360].map((x, i) => `<rect x="${x}" y="${120 - i * 6}" width="30" height="${80 + i * 6}"/>`).join('')}</g>
    <rect x="172" y="138" width="260" height="52" rx="10" fill="#7a2a2f"/>
    <rect x="178" y="134" width="248" height="5" rx="2" fill="#e9eefb" opacity=".85"/>
    ${windows}
    <polygon points="72,92 88,92 124,196 36,196" fill="#ffd88a" opacity=".08"/>
    <circle cx="80" cy="96" r="48" fill="url(#${id}g)" opacity=".8"/>
    <rect x="78" y="90" width="4" height="106" fill="#2a2420"/>
    <rect x="70" y="84" width="20" height="8" rx="2" fill="#2a2420"/>
    <line x1="138" y1="18" x2="138" y2="40" stroke="#2a2420" stroke-width="2"/>
    <circle cx="138" cy="58" r="18" fill="#f4ecdc" opacity=".92" stroke="#2a2420" stroke-width="2"/>
    <line x1="138" y1="58" x2="138" y2="48" stroke="#2a2420" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="138" y1="58" x2="139.5" y2="43.5" stroke="#2a2420" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="0" y="196" width="400" height="64" fill="#4a3a30"/>
    <rect x="0" y="194" width="400" height="3" fill="#f0c674" opacity=".5"/>
    <path d="M0 196 H400" stroke="#e9eefb" stroke-width="1" opacity=".4"/>
    ${dots(r, 55, 260, .6, 1.3, .3)}`;
}

function secret(id, r, v) {
  let steps = '';
  for (let i = 0; i < 7; i++) {
    const y = 252 - i * 8.5, x = 200 + (i % 2 ? 5 : -5) + i * .4;
    steps += `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.6" fill="#9aa6c8" opacity=".7"/>`;
  }
  const globe = v === 'b' ? `
    <circle cx="200" cy="138" r="112" fill="#ffffff" fill-opacity=".03" stroke="#ffffff" stroke-opacity=".28" stroke-width="2"/>
    <path d="M128 230 Q200 214 272 230 L262 256 H138Z" fill="#795747"/>` : '';
  return `${defs(id, '#283848', '#5f7d90')}${dots(r, 90, 180, .3, 1.1, .2)}
    <circle cx="200" cy="160" r="70" fill="url(#${id}g)"/>
    <path d="M0 196 Q200 182 400 198 V260 H0Z" fill="#d9e1f2"/>
    <polygon points="182,196 218,196 268,260 132,260" fill="url(#${id}l)"/>
    <path d="M178 196 V136 a22 22 0 0 1 44 0 V196Z" fill="#ffd88a"/>
    <path d="M178 196 V136 a22 22 0 0 1 12 -19.5 L194 198Z" fill="#7a2a2f"/>
    ${steps}${globe}
    ${dots(r, 40, 260, .6, 1.2, .3)}`;
}

const DRAW = { snow, forest, station, secret };
const LABEL = { snow: '落雪的公寓', forest: '没有月亮的森林', station: '午夜之后的列车站', secret: '只属于你们的地方' };

export function cover(scene, variant = 'a') {
  const id = 'art' + (++uid);
  const r = rng(scene.length * 97 + (variant === 'b' ? 31 : 7));
  const body = (DRAW[scene] || snow)(id, r, variant);
  // 手绘感：轻微扭曲边缘（不完全规整的线条）+ 水粉纸张颗粒
  const fx = `<defs>
    <filter id="${id}r" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="${uid}"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
    <filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .15 0 0 0 .35 0"/></filter>
  </defs>`;
  return `<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${LABEL[scene] || ''}插画" xmlns="http://www.w3.org/2000/svg">${fx}<g filter="url(#${id}r)">${body}</g><rect width="400" height="260" filter="url(#${id}n)" opacity=".7"/></svg>`;
}
