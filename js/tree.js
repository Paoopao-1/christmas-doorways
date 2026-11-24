// 交互式圣诞树（Canvas 2D，伪 3D，可拖动旋转、点击挂饰、逐日装饰、最后点亮星星）
// 三种画风共用同一套互动：
//   painted   手绘油画 —— 水粉笔触的松针、颜料点的灯、夜色水粉背景
//   handmade  复古手作 —— 剪纸层叠的树、缝线、布料与纸艺挂饰、彩旗串
//   starlight 梦幻星光 —— 细腻粒子与环绕灯光（克制的发光）
// 不依赖 Three.js / CDN；低性能设备自动减量；减少动效模式下不自动旋转。
import { reducedMotion } from './util.js';

const TAU = Math.PI * 2;
const INK = '#3A2A22';
const rng = (seed) => {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};
const radiusAt = (y) => (0.035 + 0.36 * y) * (0.84 + 0.16 * ((y * 5.2) % 1));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(Math.max(0, Math.min(255, c + 255 * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function starPath(ctx, r, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? inner : r;
    const a = (i * Math.PI) / points - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
}
function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.9, -s * 1.1, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.9, -s * 1.1, s * 1.4, 0, 0, s * 0.9);
  ctx.closePath();
}

export function ornamentSlot(i) {
  const y = 0.2 + 0.72 * (((i + 1) * 0.6180339) % 1);
  return { y, a: i * 2.399963, R: radiusAt(y) * 1.03 };
}

const LOOK = {
  painted: {
    sky: ['#2E4253', '#6A889A'], needles: ['#22402F', '#2C5240', '#3B6750', '#4E7D5D', '#6A9468'], snow: '#FBF4E6', light: '#F1D47B',
  },
  handmade: {
    sky: ['#F0E3C8', '#E3CEA6'], tiers: ['#2E5642', '#3B6A51', '#4A7A5D', '#315B46', '#5A8767'], light: '#F1D47B',
  },
  starlight: {
    sky: ['#1E2733', '#34414F'], colors: ['#8FBFA8', '#CFE6D9', '#5E9078', '#F5EBD8'], spark: '#F1D47B', garland: '#FFF1CF', glow: 'rgba(143,191,168,',
  },
};

export class Tree {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = { style: 'painted', star: 'classic', palette: ['#B62935', '#F1D47B', '#F5EBD8', '#315B46'], progress: 0, interactive: true, onPick: null, ...opts };
    this.reduce = reducedMotion();
    this.lite = opts.lite ?? ((navigator.hardwareConcurrency || 8) <= 4);
    this.theta = 0.6; this.vel = 0; this.focus = null; this.dragging = false;
    this.orns = []; this.flying = []; this.sparks = []; this.hits = [];
    this.images = new Map();
    this.starPlaced = !!opts.starPlaced;
    this.light = this.starPlaced ? 1 : 0;
    this.starAnim = null;
    this.time = 0;
    this.visible = true;
    this.build();
    if (opts.ornaments) this.setOrnaments(opts.ornaments);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(canvas);
    if (this.o.interactive) this.bind();
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- 对外接口 ----------
  setOrnaments(list) { this.orns = list.map((o) => this.makeOrn(o, true)); }
  setOptions(patch) {
    const restyle = patch.style && patch.style !== this.o.style;
    Object.assign(this.o, patch);
    if (restyle) { this.build(); this.paintBackdrop(); }
  }
  setProgress(p) { this.o.progress = clamp01(p); }
  setStarPlaced(v) { this.starPlaced = v; this.light = v ? 1 : 0; this.starAnim = null; }
  rotate(dir) { this.focus = null; this.vel += dir * 0.07; }

  addOrnament(o, { animate = true } = {}) {
    const orn = this.makeOrn(o, !animate || this.reduce);
    this.orns.push(orn);
    if (orn.visible) return Promise.resolve();
    this.focus = -Math.PI / 2 - orn.a;
    return new Promise((res) => this.flying.push({ o: orn, t: 0, dur: 1900, res }));
  }

  placeStar() {
    if (this.reduce) { this.setStarPlaced(true); this.burst(this.cx, this.starY(), 30); return Promise.resolve(); }
    this.focus = null;
    return new Promise((res) => { this.starAnim = { phase: 'drop', t: 0, dur: 1700, res }; });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.unbind?.();
  }

  // ---------- 构建 ----------
  build() {
    const r = rng(11);
    const st = this.o.style;
    if (st === 'painted') {
      const N = this.lite ? 520 : 1050;
      this.strokes = Array.from({ length: N }, (_, i) => {
        const y = Math.pow(r(), 0.72);
        const snow = i % 11 === 0;
        return { y, a: r() * TAU, R: radiusAt(y) * (0.62 + 0.38 * Math.sqrt(r())), len: 7 + r() * 11, w: 2.4 + r() * 3.2, c: (r() * 5) | 0, tilt: (r() - 0.5) * 0.8, snow };
      });
    } else if (st === 'starlight') {
      const N = this.lite ? 700 : 1600;
      this.groups = [[], [], [], []];
      for (let i = 0; i < N; i++) {
        const y = Math.pow(r(), 0.8);
        this.groups[(r() * 4) | 0].push({ y, a: r() * TAU, R: radiusAt(y) * (0.55 + 0.45 * Math.sqrt(r())), s: r() * 1.5 + 0.7, tw: r() * TAU });
      }
    }
    const L = this.lite ? 60 : 100;
    this.lights = Array.from({ length: L }, (_, i) => {
      const t = i / L, y = 0.06 + t * 0.9;
      return { t, y, a: t * TAU * 4.2, R: radiusAt(y) * 1.08 };
    });
    this.snow = Array.from({ length: this.lite ? 30 : 60 }, () => ({ x: r(), y: r(), s: r() * 1.6 + 0.8, v: r() * 0.0013 + 0.0006, p: r() * 6, rot: r() * TAU, c: (r() * 4) | 0 }));
    this.motes = Array.from({ length: 10 }, () => ({ a: r() * TAU, y: r(), v: r() * 0.004 + 0.002 }));
  }

  makeOrn(o, visible) {
    const orn = { ...o, ...ornamentSlot(o.index), visible };
    if (o.photo && !this.images.has(o.photo)) {
      const img = new Image();
      img.src = o.photo;
      this.images.set(o.photo, img);
    }
    return orn;
  }

  bind() {
    const c = this.c;
    c.style.touchAction = 'pan-y';
    const down = (e) => { this.dragging = true; this.moved = 0; this.lx = e.clientX; this.focus = null; c.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lx;
      this.lx = e.clientX;
      this.moved += Math.abs(dx);
      this.theta += dx * 0.011;
      this.vel = dx * 0.011;
    };
    const up = (e) => { if (!this.dragging) return; this.dragging = false; if (this.moved < 6) this.pick(e); };
    const cancel = () => { this.dragging = false; };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', cancel);
    this.unbind = () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', cancel);
    };
  }

  pick(e) {
    const rect = this.c.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best = null, bd = Infinity;
    for (const h of this.hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < h.r + 12 && d < bd) { best = h; bd = d; }
    }
    if (best) this.o.onPick?.(best.o);
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.5 : 2);
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
    this.H = Math.min(this.h * 0.7, this.w * 1.02);
    this.top = this.h * 0.15 + (this.h * 0.7 - this.H) * 0.5;
    this.cx = this.w / 2;
    this.unit = this.H / 400;
    this.paintBackdrop();
  }

  // 背景预先画在离屏画布上，每帧直接贴图
  paintBackdrop() {
    if (!this.w) return;
    const bg = document.createElement('canvas');
    bg.width = this.c.width; bg.height = this.c.height;
    const g = bg.getContext('2d');
    g.scale(this.dpr, this.dpr);
    const { w, h } = this;
    const st = this.o.style;
    const look = LOOK[st];
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, look.sky[0]);
    grad.addColorStop(1, look.sky[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    const groundY = this.top + this.H * 1.0;

    if (st === 'painted') {
      // 水粉笔触的天空
      for (let i = 0; i < 70; i++) {
        g.globalAlpha = 0.06 + r() * 0.08;
        g.fillStyle = r() > 0.5 ? '#9DB8C7' : '#22323F';
        g.beginPath();
        g.ellipse(r() * w, r() * groundY, 30 + r() * 90, 8 + r() * 18, (r() - 0.5) * 0.6, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#F1D47B'; g.lineWidth = 1.4; g.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const x = r() * w, y = r() * groundY * 0.8, s = 2 + r() * 3;
        g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      }
      this.hill(g, groundY, '#F5EBD8', true);
    } else if (st === 'handmade') {
      g.globalAlpha = 0.25;
      for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? '#795747' : '#FFFFFF'; g.fillRect(r() * w, r() * h, 1, 1); }
      g.globalAlpha = 1;
      // 纸剪的雪花
      g.strokeStyle = '#87A9BC'; g.lineWidth = 1.6; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const x = r() * w, y = r() * groundY * 0.7, s = 6 + r() * 7;
        for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.lineTo(x - Math.cos(a) * s, y - Math.sin(a) * s); g.stroke(); }
      }
      // 撕纸地面
      g.fillStyle = '#FBF4E6';
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, groundY - 4 + (r() - 0.5) * 7 + Math.sin(x / 70) * 6);
      g.lineTo(w, h); g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
      g.setLineDash([5, 5]); g.strokeStyle = '#B62935';
      g.beginPath(); g.moveTo(0, groundY + 14); g.lineTo(w, groundY + 14); g.stroke(); g.setLineDash([]);
    } else {
      g.fillStyle = '#FFFFFF';
      for (let i = 0; i < 60; i++) { g.globalAlpha = 0.15 + r() * 0.4; g.beginPath(); g.arc(r() * w, r() * groundY, r() * 1.1 + 0.3, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      this.hill(g, groundY, '#3E4B5A', false);
    }
    this.bg = bg;
  }

  hill(g, y, color, outline) {
    const { w, h } = this;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-10, h);
    g.lineTo(-10, y + 16);
    g.bezierCurveTo(w * 0.25, y - 10, w * 0.6, y + 2, w + 10, y + 12);
    g.lineTo(w + 10, h);
    g.closePath();
    g.fill();
    if (outline) { g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
  }

  project(y, a, R) {
    const ang = a + this.theta;
    const x = R * Math.cos(ang), z = R * Math.sin(ang);
    const k = 2.4 / (2.4 + z);
    return { x: this.cx + x * this.H * k, y: this.top + y * this.H + z * this.H * 0.1, z, k };
  }
  starY() { return this.top - this.H * 0.03; }

  burst(x, y, n) {
    const st = this.o.style;
    const cols = st === 'starlight' ? ['#FFF1CF'] : this.o.palette;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 0.6 + Math.random() * 2.4;
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, life: 1, decay: 0.012 + Math.random() * 0.018, color: cols[(Math.random() * cols.length) | 0], s: 1.5 + Math.random() * 2.2, rot: Math.random() * TAU });
    }
  }

  // ---------- 动画循环 ----------
  frame = (now) => {
    this.raf = requestAnimationFrame(this.frame);
    if (!this.visible || document.hidden || !this.w) { this.last = now; return; }
    const dt = Math.min(50, now - this.last);
    this.last = now;
    this.time += dt / 1000;
    this.update(dt);
    this.draw();
  };

  update(dt) {
    const k = dt / 16.7;
    if (this.focus != null) {
      let diff = this.focus - this.theta;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.theta += diff * Math.min(1, 0.06 * k);
      this.vel = 0;
    } else if (!this.dragging) {
      this.theta += this.vel * k;
      this.vel *= Math.pow(0.94, k);
      if (Math.abs(this.vel) < 0.0005 && !this.reduce) this.theta += 0.0022 * k;
    }
    if (!this.reduce) {
      for (const s of this.snow) {
        s.y += s.v * k; s.rot += 0.02 * k;
        s.x += Math.sin(this.time + s.p) * 0.0003 * k;
        if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
      }
      for (const m of this.motes) { m.y -= m.v * 0.25 * k; m.a += 0.004 * k; if (m.y < -0.05) m.y = 1.02; }
    }
    for (const f of [...this.flying]) {
      f.t += dt / f.dur;
      if (f.t >= 1) {
        f.o.visible = true;
        const p = this.project(f.o.y, f.o.a, f.o.R);
        this.burst(p.x, p.y, 18);
        this.flying.splice(this.flying.indexOf(f), 1);
        if (!this.flying.length) setTimeout(() => { if (!this.flying.length) this.focus = null; }, 900);
        f.res();
      }
    }
    const sa = this.starAnim;
    if (sa) {
      sa.t += dt / sa.dur;
      if (sa.phase === 'drop' && sa.t >= 1) {
        this.starPlaced = true;
        this.burst(this.cx, this.starY(), 50);
        this.starAnim = { phase: 'light', t: 0, dur: 2600, res: sa.res };
      } else if (sa.phase === 'light') {
        this.light = ease(clamp01(sa.t));
        if (sa.t >= 1) { this.light = 1; this.starAnim = null; sa.res(); }
      }
    }
    for (const s of this.sparks) { s.x += s.vx * k; s.y += s.vy * k; s.vy += 0.04 * k; s.vx *= 0.98; s.rot += 0.1 * k; s.life -= s.decay * k; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  flyPos(f) {
    const e = ease(clamp01(f.t));
    const tp = this.project(f.o.y, f.o.a, f.o.R);
    const fx = this.cx, fy = this.h + 20;
    return { x: fx + (tp.x - fx) * e + Math.sin(Math.PI * e) * 50, y: fy + (tp.y - fy) * e - Math.sin(Math.PI * e) * this.h * 0.22, scale: 2.6 - 1.6 * e };
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (this.bg) ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const visible = this.orns.filter((o) => o.visible).map((o) => ({ o, q: this.project(o.y, o.a, o.R) }));
    const back = visible.filter((v) => v.q.z > 0).sort((a, b) => b.q.z - a.q.z);
    const front = visible.filter((v) => v.q.z <= 0).sort((a, b) => b.q.z - a.q.z);
    this.hits = [];

    const st = this.o.style;
    if (st === 'painted') this.drawPainted(back, front);
    else if (st === 'handmade') this.drawHandmade(front);
    else this.drawStarlight(back, front);

    this.drawStar();
    for (const f of this.flying) { const p = this.flyPos(f); this.drawOrn(f.o, p.x, p.y, p.scale, 1, true); }
    this.drawSparks();
    this.drawSnow();
  }

  trunk(color, outline) {
    const { ctx } = this, u = this.unit;
    ctx.fillStyle = color;
    ctx.fillRect(this.cx - 8 * u, this.top + this.H * 0.96, 16 * u, this.H * 0.06);
    if (outline) { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(this.cx - 8 * u, this.top + this.H * 0.96, 16 * u, this.H * 0.06); }
  }

  // A · 手绘油画
  drawPainted(back, front) {
    const { ctx } = this, u = this.unit;
    const look = LOOK.painted;
    const p = this.o.progress, L = this.light;
    this.trunk('#795747', true);
    for (const v of back) this.drawOrn(v.o, v.q.x, v.q.y, v.q.k, 1, false, 'paint');

    const items = this.strokes.map((s) => ({ s, q: this.project(s.y, s.a, s.R) })).sort((a, b) => b.q.z - a.q.z);
    ctx.lineCap = 'round';
    for (const { s, q } of items) {
      const ang = s.a + this.theta;
      let dx = Math.cos(ang) * 0.75 + s.tilt * 0.3, dy = 0.7;
      const m = Math.hypot(dx, dy); dx /= m; dy /= m;
      const len = s.len * u * q.k;
      const depth = clamp01(0.5 - q.z * 1.6);
      const ci = Math.max(0, Math.min(4, s.c - (q.z > 0.08 ? 1 : 0) + (q.z < -0.12 ? 1 : 0)));
      ctx.strokeStyle = s.snow && q.z < 0.05 ? look.snow : look.needles[ci];
      ctx.globalAlpha = 0.82 + depth * 0.18;
      ctx.lineWidth = s.w * u * q.k;
      ctx.beginPath();
      ctx.moveTo(q.x - dx * len * 0.3, q.y - dy * len * 0.3);
      ctx.lineTo(q.x + dx * len * 0.7, q.y + dy * len * 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 颜料点的灯：随进度从下往上点亮
    const reach = L > 0 ? 1 : Math.max(0.1, p);
    for (const l of this.lights) {
      if (1 - l.t > reach) continue;
      const q = this.project(l.y, l.a, l.R);
      if (q.z > 0.04) continue;
      const on = 0.75 + 0.25 * Math.sin(this.time * 2.2 + l.t * 30);
      ctx.fillStyle = look.light;
      ctx.globalAlpha = on;
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.8 * u * q.k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#FFFBEA';
      ctx.beginPath(); ctx.arc(q.x - 0.8 * u, q.y - 0.8 * u, 1 * u * q.k, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 点亮后的暖色晕染
    if (L > 0) {
      const g = ctx.createRadialGradient(this.cx, this.top + this.H * 0.5, 0, this.cx, this.top + this.H * 0.5, this.H * 0.6);
      g.addColorStop(0, `rgba(241,212,123,${0.22 * L})`);
      g.addColorStop(1, 'rgba(241,212,123,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    for (const v of front) { this.drawOrn(v.o, v.q.x, v.q.y, v.q.k, 1, false, 'paint'); this.hits.push({ o: v.o, x: v.q.x, y: v.q.y, r: 11 * u * v.q.k }); }
  }

  // B · 复古手作
  drawHandmade(front) {
    const { ctx } = this, u = this.unit;
    const look = LOOK.handmade;
    const p = this.o.progress, L = this.light;
    this.trunk('#795747', true);
    const sway = Math.sin(this.theta) * 0.06;
    const tiers = 5;
    for (let i = tiers - 1; i >= 0; i--) {
      const y0 = this.top + this.H * (i / tiers) * 0.92;
      const y1 = this.top + this.H * ((i + 1) / tiers) * 0.98 + this.H * 0.02;
      const half = radiusAt((i + 1) / tiers) * this.H * 1.05;
      const topHalf = i === 0 ? 0 : radiusAt(i / tiers) * this.H * 0.35;
      const tipX = this.cx + sway * half;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(tipX - topHalf, y0);
        ctx.lineTo(tipX + topHalf, y0);
        ctx.lineTo(this.cx + half, y1);
        const sc = 7;
        for (let k = 1; k <= sc; k++) {
          const x = this.cx + half - (2 * half * k) / sc;
          ctx.quadraticCurveTo(x + half / sc, y1 + 9 * u, x, y1);
        }
        ctx.closePath();
      };
      ctx.save();
      ctx.translate(3 * u, 4 * u); path(); ctx.fillStyle = 'rgba(58,42,34,.22)'; ctx.fill();
      ctx.restore();
      path();
      ctx.fillStyle = look.tiers[i % look.tiers.length]; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.save();
      ctx.setLineDash([4 * u, 4 * u]); ctx.strokeStyle = 'rgba(245,235,216,.8)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(this.cx - half * 0.86, y1 - 6 * u); ctx.lineTo(this.cx + half * 0.86, y1 - 6 * u); ctx.stroke();
      ctx.restore();
    }

    // 彩旗串
    const reach = L > 0 ? 1 : Math.max(0.12, p);
    let prev = null;
    ctx.lineWidth = 1.2;
    this.lights.forEach((l, i) => {
      const q = this.project(l.y, l.a, l.R * 1.05);
      const vis = q.z <= 0.02 && 1 - l.t <= reach;
      if (vis && prev) {
        ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.quadraticCurveTo((prev.x + q.x) / 2, (prev.y + q.y) / 2 + 3 * u, q.x, q.y); ctx.stroke();
        if (i % 2 === 0) {
          ctx.fillStyle = this.o.palette[i % this.o.palette.length];
          ctx.beginPath(); ctx.moveTo(q.x - 3.5 * u, q.y); ctx.lineTo(q.x + 3.5 * u, q.y); ctx.lineTo(q.x, q.y + 8 * u * q.k); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke(); ctx.lineWidth = 1.2;
        }
      }
      prev = vis ? q : null;
    });
    // 点亮后的纸灯笼
    if (L > 0) {
      this.lights.forEach((l, i) => {
        if (i % 5 || 1 - l.t > L) return;
        const q = this.project(l.y, l.a, l.R * 0.95);
        if (q.z > 0) return;
        ctx.fillStyle = '#F1D47B'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(q.x, q.y, 3.6 * u, 4.4 * u, 0, 0, TAU); ctx.fill(); ctx.stroke();
      });
    }
    for (const v of front) {
      if (v.q.z > -0.02 && v.q.z <= 0) continue;
      this.drawOrn(v.o, v.q.x, v.q.y, v.q.k, 1, false, 'paper');
      this.hits.push({ o: v.o, x: v.q.x, y: v.q.y, r: 11 * u * v.q.k });
    }
  }

  // C · 梦幻星光（克制版）
  drawStarlight(back, front) {
    const { ctx } = this, u = this.unit;
    const look = LOOK.starlight;
    const p = this.o.progress, L = this.light;
    const gy = this.top + this.H * 0.6;
    const g = ctx.createRadialGradient(this.cx, gy, 0, this.cx, gy, Math.min(this.H * 0.7, this.w * 0.5));
    g.addColorStop(0, look.glow + (0.05 + 0.1 * p + 0.15 * L) + ')');
    g.addColorStop(1, look.glow + '0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    for (const v of back) this.drawOrn(v.o, v.q.x, v.q.y, v.q.k, 0.45, false, 'glow');
    this.trunk('rgba(121,87,71,.9)', false);
    ctx.globalCompositeOperation = 'lighter';
    const baseA = 0.3 + 0.35 * p + 0.25 * L;
    this.groups.forEach((grp, gi) => {
      ctx.fillStyle = L > 0 && gi === 3 ? look.spark : look.colors[gi];
      for (const part of grp) {
        const q = this.project(part.y, part.a, part.R);
        ctx.globalAlpha = clamp01(baseA * (0.6 - q.z * 0.9) * (0.75 + 0.25 * Math.sin(this.time * 2 + part.tw)));
        const s = part.s * q.k * u;
        ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      }
    });
    const reach = L > 0 ? 1 : Math.max(0.12, p);
    ctx.fillStyle = look.garland;
    for (const l of this.lights) {
      if (1 - l.t > reach) continue;
      const q = this.project(l.y, l.a, l.R);
      ctx.globalAlpha = clamp01((0.5 - q.z) * (0.55 + 0.45 * Math.sin(this.time * 3 - l.t * 24)));
      ctx.beginPath(); ctx.arc(q.x, q.y, 1.5 * q.k * u, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#F1D47B';
    for (const m of this.motes) {
      const q = this.project(m.y, m.a, radiusAt(m.y) + 0.12);
      ctx.globalAlpha = 0.35 + 0.3 * p;
      ctx.beginPath(); ctx.arc(q.x, q.y, 1.6 * u * q.k, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (const v of front) { this.drawOrn(v.o, v.q.x, v.q.y, v.q.k, 1, false, 'glow'); this.hits.push({ o: v.o, x: v.q.x, y: v.q.y, r: 11 * u * v.q.k }); }
  }

  drawSparks() {
    const { ctx } = this;
    const st = this.o.style;
    if (st === 'starlight') ctx.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) {
      ctx.globalAlpha = clamp01(s.life);
      ctx.fillStyle = s.color;
      if (st === 'starlight') { ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.7, 0, TAU); ctx.fill(); }
      else { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillRect(-s.s, -s.s * 0.6, s.s * 2, s.s * 1.2); ctx.restore(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  drawSnow() {
    const { ctx, w, h } = this;
    const st = this.o.style, u = this.unit;
    for (const s of this.snow) {
      const x = s.x * w, y = s.y * h;
      if (st === 'handmade') {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = this.o.palette[s.c % this.o.palette.length];
        ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot); ctx.fillRect(-s.s * u * 1.4, -s.s * u, s.s * u * 2.8, s.s * u * 2); ctx.restore();
      } else {
        ctx.globalAlpha = st === 'painted' ? 0.9 : 0.55;
        ctx.fillStyle = st === 'painted' ? '#FBF4E6' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(x, y, s.s * u * (st === 'painted' ? 1.5 : 0.9), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawStar() {
    const { ctx } = this;
    const sa = this.starAnim;
    if (!this.starPlaced && !(sa && sa.phase === 'drop')) return;
    let y = this.starY(), scale = 1, alpha = 1;
    if (sa && sa.phase === 'drop') {
      const e = ease(clamp01(sa.t));
      y = this.starY() - this.h * 0.45 * (1 - e);
      scale = 2.2 - 1.2 * e;
      alpha = clamp01(sa.t * 3);
    }
    const s = 16 * this.unit * scale;
    const st = this.o.style;
    ctx.save();
    ctx.translate(this.cx, y);
    ctx.globalAlpha = alpha;
    if (this.light > 0) {
      const glowR = s * (2 + 2.2 * this.light);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      g.addColorStop(0, `rgba(241,212,123,${(st === 'starlight' ? 0.45 : 0.35) * this.light})`);
      g.addColorStop(1, 'rgba(241,212,123,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, glowR, 0, TAU); ctx.fill();
      ctx.strokeStyle = st === 'starlight' ? `rgba(255,241,207,${0.4 * this.light})` : `rgba(241,212,123,${0.9 * this.light})`;
      ctx.lineWidth = st === 'starlight' ? 1 : 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + (st === 'starlight' ? this.time * 0.3 : 0);
        const l0 = s * 1.4, l1 = s * (2 + (i % 2) * 0.9);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * l0, Math.sin(a) * l0); ctx.lineTo(Math.cos(a) * l1, Math.sin(a) * l1); ctx.stroke();
      }
    }
    const kind = this.o.star;
    ctx.fillStyle = '#F1D47B';
    ctx.strokeStyle = st === 'starlight' ? '#FFF1CF' : INK;
    ctx.lineWidth = st === 'starlight' ? 1 : 2;
    if (kind === 'heart') { heartPath(ctx, s * 0.95); ctx.fill(); ctx.stroke(); }
    else if (kind === 'snow') {
      ctx.lineCap = 'round';
      ctx.strokeStyle = st === 'starlight' ? '#FFF1CF' : '#F1D47B';
      ctx.lineWidth = s * 0.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill();
      if (st !== 'starlight') { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); }
    } else { starPath(ctx, s * 1.25, s * 0.52); ctx.fill(); ctx.stroke(); }
    if (st === 'handmade' && kind !== 'snow') {
      ctx.setLineDash([2.5, 2.5]); ctx.strokeStyle = '#B62935'; ctx.lineWidth = 1;
      ctx.save(); ctx.scale(0.72, 0.72);
      if (kind === 'heart') heartPath(ctx, s * 0.95); else starPath(ctx, s * 1.25, s * 0.52);
      ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (this.starPlaced) this.hits.push({ o: { kind: 'topstar' }, x: this.cx, y, r: s * 1.4 });
  }

  // 挂饰：paint = 水粉平涂 + 墨线；paper = 布料/纸艺 + 缝线；glow = 光泽球
  drawOrn(o, x, y, scale, alpha, flying = false, mode) {
    const { ctx } = this;
    mode = mode || (this.o.style === 'handmade' ? 'paper' : this.o.style === 'starlight' ? 'glow' : 'paint');
    const s = 10 * this.unit * scale;
    const lw = mode === 'glow' ? 0 : Math.max(1, 1.3 * this.unit * scale);
    const col = o.color || '#B62935';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (!flying) {
      ctx.strokeStyle = mode === 'glow' ? 'rgba(255,240,210,.45)' : INK;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, -s * 1.9); ctx.stroke();
    }
    const finish = () => {
      if (mode === 'glow') return;
      ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
      if (mode === 'paper') { ctx.setLineDash([2, 2]); ctx.strokeStyle = 'rgba(251,244,230,.9)'; ctx.lineWidth = 0.9; ctx.stroke(); ctx.setLineDash([]); }
    };
    switch (o.kind) {
      case 'star': starPath(ctx, s * 1.2, s * 0.52); ctx.fillStyle = col; ctx.fill(); finish(); break;
      case 'bell': {
        ctx.beginPath();
        ctx.moveTo(-s * 0.95, s * 0.7);
        ctx.quadraticCurveTo(-s * 0.8, -s * 1.05, 0, -s * 1.05);
        ctx.quadraticCurveTo(s * 0.8, -s * 1.05, s * 0.95, s * 0.7);
        ctx.closePath();
        ctx.fillStyle = '#E3B54F'; ctx.fill(); finish();
        ctx.fillStyle = '#795747'; ctx.beginPath(); ctx.arc(0, s * 0.85, s * 0.24, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B62935'; ctx.fillRect(-s * 0.5, -s * 1.25, s, s * 0.32);
        break;
      }
      case 'bow': {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(-s * 0.6, -s * 0.15, s * 0.65, s * 0.42, -0.4, 0, TAU); ctx.fill(); finish();
        ctx.beginPath(); ctx.ellipse(s * 0.6, -s * 0.15, s * 0.65, s * 0.42, 0.4, 0, TAU); ctx.fill(); finish();
        ctx.beginPath(); ctx.moveTo(-s * 0.15, 0); ctx.lineTo(-s * 0.6, s * 1.1); ctx.lineTo(-s * 0.2, s * 0.9); ctx.closePath(); ctx.fill(); finish();
        ctx.beginPath(); ctx.moveTo(s * 0.15, 0); ctx.lineTo(s * 0.6, s * 1.1); ctx.lineTo(s * 0.2, s * 0.9); ctx.closePath(); ctx.fill(); finish();
        ctx.fillStyle = shade(col, -0.2); ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.3, 0, TAU); ctx.fill(); finish();
        break;
      }
      case 'snowflake': {
        ctx.strokeStyle = mode === 'glow' ? '#F4FBFF' : '#FBF4E6';
        ctx.lineCap = 'round';
        for (let pass = 0; pass < (mode === 'glow' ? 1 : 2); pass++) {
          ctx.lineWidth = Math.max(1, s * (pass === 0 && mode !== 'glow' ? 0.3 : 0.16));
          ctx.strokeStyle = pass === 0 && mode !== 'glow' ? INK : '#FBF4E6';
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(-Math.cos(a) * s, -Math.sin(a) * s); ctx.stroke();
          }
        }
        break;
      }
      case 'gift': {
        ctx.beginPath(); ctx.rect(-s * 0.85, -s * 0.7, s * 1.7, s * 1.5); ctx.fillStyle = col; ctx.fill(); finish();
        ctx.fillStyle = '#F1D47B';
        ctx.fillRect(-s * 0.15, -s * 0.7, s * 0.3, s * 1.5);
        ctx.fillRect(-s * 0.85, -s * 0.1, s * 1.7, s * 0.28);
        break;
      }
      case 'envelope': {
        ctx.beginPath(); ctx.rect(-s, -s * 0.65, s * 2, s * 1.3); ctx.fillStyle = '#FBF4E6'; ctx.fill(); finish();
        ctx.strokeStyle = mode === 'glow' ? '#B89C6A' : INK; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.65); ctx.lineTo(0, s * 0.1); ctx.lineTo(s, -s * 0.65); ctx.stroke();
        ctx.fillStyle = '#B62935'; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.3, 0, TAU); ctx.fill();
        break;
      }
      case 'keepsake': heartPath(ctx, s); ctx.fillStyle = '#B62935'; ctx.fill(); finish(); break;
      case 'photo': {
        ctx.rotate(-0.08);
        ctx.beginPath(); ctx.rect(-s * 1.15, -s * 1.3, s * 2.3, s * 2.7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        if (mode !== 'glow') { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); }
        const img = o.photo && this.images.get(o.photo);
        const iw = s * 1.9, ih = s * 1.9;
        if (img && img.complete && img.naturalWidth) {
          const r = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
          const sw = iw / r, sh = ih / r;
          ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, -iw / 2, -s * 1.1, iw, ih);
        } else { ctx.fillStyle = '#87A9BC'; ctx.fillRect(-iw / 2, -s * 1.1, iw, ih); }
        if (mode === 'paper') { ctx.fillStyle = 'rgba(241,212,123,.8)'; ctx.fillRect(-s * 0.5, -s * 1.55, s, s * 0.45); }
        break;
      }
      default: { // ball
        ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU);
        if (mode === 'glow') {
          const g = ctx.createRadialGradient(-s * 0.35, -s * 0.35, s * 0.1, 0, 0, s);
          g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, col); g.addColorStop(1, shade(col, -0.4));
          ctx.fillStyle = g; ctx.fill();
        } else {
          ctx.fillStyle = col; ctx.fill();
          ctx.save(); ctx.clip();
          ctx.fillStyle = 'rgba(58,42,34,.18)'; ctx.beginPath(); ctx.arc(s * 0.45, s * 0.45, s, 0, TAU); ctx.fill();
          if (mode === 'paper') { ctx.strokeStyle = 'rgba(251,244,230,.8)'; ctx.lineWidth = s * 0.18; ctx.beginPath(); ctx.moveTo(-s, -s * 0.1); ctx.lineTo(s, -s * 0.1); ctx.stroke(); }
          ctx.restore();
          ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); finish();
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, s * 0.16); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, s * 0.62, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
        }
        ctx.fillStyle = '#C9A55A'; ctx.fillRect(-s * 0.3, -s * 1.2, s * 0.6, s * 0.32);
      }
    }
    ctx.restore();
  }
}
