import { TAU, clamp, mulberry32 } from './util.js';

export const WORLD_R = 300;

const BRAZIER_COUNT = 6;
export const BRAZIERS = Array.from({ length: BRAZIER_COUNT }, (_, i) => {
  const a = -Math.PI / 2 + (i * TAU) / BRAZIER_COUNT + Math.PI / BRAZIER_COUNT / 2;
  return { angle: a, x: Math.cos(a) * (WORLD_R + 22), y: Math.sin(a) * (WORLD_R + 22) };
});

/* ============================================================
   STATIC ARENA
   ============================================================ */
export function buildFloor(k, dpr) {
  const pad = 74;
  const half = WORLD_R + pad;
  const scale = Math.max(0.1, k * dpr);
  const size = Math.ceil(half * 2 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  const rnd = mulberry32(7331);

  // Outer halo / heat from the abyss.
  const halo = ctx.createRadialGradient(0, 0, WORLD_R * 0.8, 0, 0, WORLD_R + 70);
  halo.addColorStop(0, 'rgba(120,22,30,0.16)');
  halo.addColorStop(0.62, 'rgba(80,18,24,0.10)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, WORLD_R + 70, 0, TAU); ctx.fill();

  // Arena stone.
  const base = ctx.createRadialGradient(-70, -100, 20, 0, 0, WORLD_R + 6);
  base.addColorStop(0, '#3a2029');
  base.addColorStop(0.45, '#291521');
  base.addColorStop(0.82, '#190c15');
  base.addColorStop(1, '#120812');
  ctx.beginPath(); ctx.arc(0, 0, WORLD_R + 3, 0, TAU);
  ctx.fillStyle = base; ctx.fill();

  // Wedge tiles.
  const wedges = 18;
  for (let i = 0; i < wedges; i++) {
    const a0 = (i / wedges) * TAU;
    const a1 = ((i + 1) / wedges) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, WORLD_R - 2, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2
      ? 'rgba(255,210,170,0.016)'
      : 'rgba(0,0,0,0.05)';
    ctx.fill();
  }

  // Radial seams.
  for (let i = 0; i < wedges; i++) {
    const a = (i / wedges) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
    ctx.lineTo(Math.cos(a) * (WORLD_R - 16), Math.sin(a) * (WORLD_R - 16));
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Concentric rings.
  for (const r of [66, 128, 190, 250]) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = 'rgba(232,185,107,0.055)';
    ctx.lineWidth = r === 128 ? 2 : 1;
    ctx.stroke();
    if (r === 128) {
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU);
      ctx.strokeStyle = 'rgba(232,185,107,0.025)';
      ctx.stroke();
    }
  }

  // Labyrinth spiral at centre.
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#e8b96b';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const turns = 3.4;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const a = t * turns * TAU;
    const r = 8 + t * 104;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = '#e8b96b'; ctx.fill();
  ctx.restore();

  // Cracks — some glowing with lava.
  for (let c = 0; c < 22; c++) {
    const a = rnd() * TAU;
    const startR = 86 + rnd() * 150;
    const endR = Math.min(WORLD_R - 10, startR + 18 + rnd() * 62);
    const pts = [];
    let r = startR;
    let aa = a;
    while (r < endR) {
      pts.push([Math.cos(aa) * r, Math.sin(aa) * r]);
      r += 5 + rnd() * 8;
      aa += (rnd() - 0.5) * 0.18;
    }
    const glowing = rnd() < 0.34;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (glowing) {
      ctx.strokeStyle = 'rgba(255,90,50,0.085)';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.strokeStyle = glowing ? 'rgba(255,116,58,0.22)' : 'rgba(0,0,0,0.36)';
    ctx.lineWidth = glowing ? 1.3 : 2.2;
    ctx.stroke();
    if (glowing) {
      ctx.strokeStyle = 'rgba(255,210,140,0.2)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  // Meander border.
  const br = WORLD_R - 12;
  ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU);
  ctx.strokeStyle = 'rgba(232,185,107,0.2)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, br - 7, 0, TAU);
  ctx.strokeStyle = 'rgba(232,185,107,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const keys = 48;
  for (let i = 0; i < keys; i++) {
    const a = (i / keys) * TAU;
    const a2 = a + TAU / keys / 2;
    ctx.beginPath();
    ctx.arc(0, 0, br - 3, a, a2);
    ctx.strokeStyle = i % 2 ? 'rgba(232,185,107,0.22)' : 'rgba(232,185,107,0.08)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Outer rim.
  ctx.beginPath(); ctx.arc(0, 0, WORLD_R + 2, 0, TAU);
  ctx.strokeStyle = 'rgba(12,5,9,0.9)'; ctx.lineWidth = 9; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, WORLD_R + 5, 0, TAU);
  ctx.strokeStyle = 'rgba(232,185,107,0.28)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, WORLD_R - 2, 0, TAU);
  ctx.strokeStyle = 'rgba(255,150,90,0.1)'; ctx.lineWidth = 2; ctx.stroke();

  // Brazier pedestals.
  for (const b of BRAZIERS) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 7, 15, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#241119';
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-5, -8); ctx.lineTo(5, -8); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(232,185,107,0.3)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -8, 7, 2.6, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,50,0.25)';
    ctx.beginPath(); ctx.ellipse(0, -8, 4.5, 1.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  return { canvas, sizeWorld: half * 2 };
}

/* Pre-rendered screen-space scenery (large radial gradients are expensive in
   software renderers, so they are baked once per resize). */
export function buildScenery(W, H, dpr) {
  const make = (draw) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    draw(x, W, H);
    return c;
  };

  const bg = make((x, w, h) => {
    const g = x.createRadialGradient(w / 2, h * 0.44, 40, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#1b0a13');
    g.addColorStop(0.5, '#0d050b');
    g.addColorStop(1, '#040206');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const px = w * (0.32 + i * 0.18);
      const grad = x.createLinearGradient(px, 0, px + 60, h);
      grad.addColorStop(0, 'rgba(150,50,60,0.035)');
      grad.addColorStop(1, 'rgba(150,50,60,0)');
      x.fillStyle = grad;
      x.beginPath();
      x.moveTo(px - 60, -20); x.lineTo(px + 90, -20);
      x.lineTo(px + 190, h + 20); x.lineTo(px + 40, h + 20);
      x.closePath(); x.fill();
    }
  });

  const vignette = make((x, w, h) => {
    const v = x.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.28, w / 2, h * 0.5, Math.max(w, h) * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.65, 'rgba(4,1,5,0.26)');
    v.addColorStop(1, 'rgba(3,1,4,0.78)');
    x.fillStyle = v;
    x.fillRect(0, 0, w, h);
  });

  const edge = (color) => make((x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},0.9)`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  });

  return {
    bg, vignette,
    redEdge: edge('160,0,20'),
    fireEdge: edge('255,50,20'),
  };
}

let _glowCache = null;
export function glowSprite(kind = 'warm') {
  if (!_glowCache) _glowCache = {};
  if (_glowCache[kind]) return _glowCache[kind];
  const colors = {
    warm: ['rgba(255,220,160,0.95)', 'rgba(255,140,60,0.35)', 'rgba(255,80,30,0)'],
    red: ['rgba(255,150,120,0.55)', 'rgba(210,45,40,0.18)', 'rgba(180,20,20,0)'],
    purple: ['rgba(220,170,255,0.5)', 'rgba(120,60,190,0.14)', 'rgba(80,30,120,0)'],
    teal: ['rgba(190,255,240,0.55)', 'rgba(99,230,196,0.16)', 'rgba(40,140,120,0)'],
  }[kind] || null;
  if (!colors) return null;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.45, colors[1]);
  g.addColorStop(1, colors[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  _glowCache[kind] = c;
  return c;
}

/* ============================================================
   DYNAMIC LIGHTING / SCENERY
   ============================================================ */
export function drawBackground(ctx, game) {
  const sc = game.scenery;
  if (sc && sc.bg) {
    ctx.drawImage(sc.bg, 0, 0, game.W, game.H);
    return;
  }
  ctx.fillStyle = '#09040a';
  ctx.fillRect(0, 0, game.W, game.H);
}

export function drawFloor(ctx, game) {
  const f = game.floor;
  if (!f) return;
  const px = f.sizeWorld * game.k;
  ctx.drawImage(f.canvas, game.cx - px / 2, game.cy - px / 2, px, px);
}

export function drawBraziers(ctx, game, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < BRAZIERS.length; i++) {
    const b = BRAZIERS[i];
    const flick = 0.75 + Math.sin(t * 7.3 + i * 2.1) * 0.13 + Math.sin(t * 13.7 + i) * 0.08;
    const spr = glowSprite('warm');
    ctx.globalAlpha = 0.7 * flick;
    const gr = 82;
    ctx.drawImage(spr, b.x - gr / 2, b.y - 9 - gr / 2, gr, gr);
    ctx.globalAlpha = 1;

    for (let f = 0; f < 3; f++) {
      const h = (10 + f * 5) * flick;
      const sway = Math.sin(t * 9 + i * 2 + f) * 2.2;
      ctx.beginPath();
      ctx.moveTo(b.x - 4 + f * 1.5, b.y - 8);
      ctx.quadraticCurveTo(b.x - 2 + sway, b.y - 8 - h * 0.6, b.x + sway * 0.8, b.y - 8 - h);
      ctx.quadraticCurveTo(b.x + 3 + sway, b.y - 8 - h * 0.5, b.x + 4 - f * 1.5, b.y - 8);
      ctx.fillStyle = f === 0 ? 'rgba(255,240,190,0.8)' : f === 1 ? 'rgba(255,140,60,0.65)' : 'rgba(255,70,40,0.4)';
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ============================================================
   TELEGRAPHS
   ============================================================ */
export function drawHazards(ctx, game, t) {
  for (const h of game.hazards) {
    const telegraph = h.delay > 0;
    const p = telegraph ? 1 - h.delay / h.maxDelay : 1;
    ctx.save();
    ctx.translate(h.x, h.y);
    if (telegraph) {
      const pulse = 0.5 + Math.sin(t * 16) * 0.18;
      ctx.globalAlpha = 0.34 + p * 0.35;
      ctx.fillStyle = 'rgba(220,40,40,0.24)';
      ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,90,70,${0.55 + pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,200,150,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, h.r * (1 - p), 0, TAU); ctx.stroke();
      // Warning rune.
      ctx.globalAlpha = 0.5 + pulse * 0.3;
      ctx.strokeStyle = '#ffb37a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 6); ctx.lineTo(0, -8); ctx.lineTo(6, 6);
      ctx.moveTo(-3, 1); ctx.lineTo(3, 1);
      ctx.stroke();
    } else {
      const life = h.life / h.maxLife;
      ctx.globalAlpha = life;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,110,50,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, h.r * 1.35, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,150,0.55)';
      ctx.beginPath(); ctx.arc(0, 0, h.r * 0.7, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,0.8)';
      ctx.beginPath(); ctx.arc(0, 0, h.r * 0.28, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawShockwaves(ctx, game) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of game.shockwaves) {
    const alpha = clamp(s.life / s.maxLife, 0, 1);
    const width = s.width * (0.7 + 0.3 * alpha);
    ctx.strokeStyle = `rgba(255,110,50,${0.28 * alpha})`;
    ctx.lineWidth = width * 2.6;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,160,80,${0.6 * alpha})`;
    ctx.lineWidth = width * 1.15;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,200,${0.8 * alpha})`;
    ctx.lineWidth = Math.max(1, width * 0.3);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,200,150,${0.3 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -s.r * 0.25;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r + width * 0.8, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/* ============================================================
   PLAYER
   ============================================================ */
export function drawPlayer(ctx, p, game, t) {
  if (p.dead) return;
  ctx.save();
  ctx.translate(p.x, p.y);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.ellipse(0, 9, 20, 8, 0, 0, TAU); ctx.fill();

  // Dash afterimages.
  for (const ghost of p.trail) {
    const a = (ghost.life / ghost.maxLife) * 0.3;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(ghost.x - p.x, ghost.y - p.y);
    ctx.rotate(ghost.facing);
    ctx.fillStyle = '#63e6c4';
    ctx.beginPath(); ctx.ellipse(-2, 0, 15, 9, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Facing marker on the floor.
  ctx.save();
  ctx.rotate(p.facing);
  ctx.strokeStyle = 'rgba(232,185,107,0.26)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 29, -0.5, 0.5); ctx.stroke();
  ctx.restore();

  // Ember backlight so the prince reads against the stone.
  const back = glowSprite('red');
  ctx.globalAlpha = 0.55;
  ctx.drawImage(back, -40, -40, 80, 80);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.scale(1.16, 1.16);

  if (p.invuln > 0 && p.hurtTime <= 0) {
    ctx.globalAlpha = 0.62 + Math.sin(t * 38) * 0.28;
  }

  ctx.rotate(p.facing);
  const bob = p.moving ? Math.sin(p.walkPhase * 2) * 1.2 : Math.sin(t * 2.2) * 0.5;

  // Cloak.
  const flap = Math.sin(t * 7 + (p.moving ? 2 : 0)) * (p.moving ? 3.2 : 1.2);
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.quadraticCurveTo(-20, -13 + flap, -27, -2 + flap * 0.5);
  ctx.quadraticCurveTo(-22, 9, -7, 7);
  ctx.closePath();
  const cloak = ctx.createLinearGradient(-26, 0, 0, 0);
  cloak.addColorStop(0, '#5a0d20');
  cloak.addColorStop(0.55, '#8e1730');
  cloak.addColorStop(1, '#3a0a16');
  ctx.fillStyle = cloak;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,120,130,0.25)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Feet.
  const step = Math.sin(p.walkPhase * 2) * 3;
  ctx.fillStyle = '#1c0b10';
  ctx.beginPath(); ctx.ellipse(-2, -5 + (p.moving ? step : 0) * 0.4, 4.5, 2.6, 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-2, 5 - (p.moving ? step : 0) * 0.4, 4.5, 2.6, -0.2, 0, TAU); ctx.fill();

  // Body.
  const body = ctx.createRadialGradient(1, -4, 1, 0, 0, 13);
  body.addColorStop(0, '#6f2333');
  body.addColorStop(0.7, '#3a101d');
  body.addColorStop(1, '#220915');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-1, bob, 12, 9.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(232,185,107,0.34)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Shoulder.
  ctx.fillStyle = '#2b0d17';
  ctx.beginPath(); ctx.arc(2, -7.5, 4.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(232,185,107,0.4)';
  ctx.stroke();

  // Head.
  ctx.fillStyle = '#e7c7ac';
  ctx.beginPath(); ctx.arc(7, bob * 0.7, 6.4, 0, TAU); ctx.fill();
  // Hair.
  ctx.fillStyle = '#1a0b12';
  ctx.beginPath();
  ctx.arc(6.3, bob * 0.7, 6.2, Math.PI * 0.55, Math.PI * 1.62);
  ctx.fill();
  // Laurel.
  ctx.strokeStyle = '#63e6c4';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(7, bob * 0.7, 7.4, -2.1, -0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(7, bob * 0.7, 7.4, -0.3, 1.1); ctx.stroke();
  // Eye glint.
  ctx.fillStyle = '#ffd9c0';
  ctx.beginPath(); ctx.arc(9.4, bob * 0.7 - 1.4, 0.8, 0, TAU); ctx.fill();

  // Blade.
  ctx.save();
  ctx.translate(4, -8.5);
  ctx.rotate(-0.28 + Math.sin(t * 2.4) * 0.03);
  ctx.fillStyle = '#2d1a12';
  ctx.fillRect(-2, -1.4, 7, 2.8);
  const blade = ctx.createLinearGradient(0, 0, 22, 0);
  blade.addColorStop(0, '#d8c8aa');
  blade.addColorStop(0.6, '#f4ead2');
  blade.addColorStop(1, '#9ae9dd');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(5, -1.5); ctx.lineTo(23, -0.6); ctx.lineTo(26, 0); ctx.lineTo(23, 0.6); ctx.lineTo(5, 1.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.restore();

  // Shield.
  if (p.shield > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 0.9);
    ctx.strokeStyle = 'rgba(99,230,196,0.65)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#63e6c4';
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Slash.
  if (p.attackTime > 0) {
    const prog = 1 - p.attackTime / p.attackDuration;
    const combo = p.combo;
    const base = p.attackDir;
    const alpha = Math.sin(Math.min(1, prog * 1.5) * Math.PI) * 0.9;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(base + (combo === 1 ? -1 : 1) * (prog - 0.5) * 1.5);
    ctx.globalAlpha = alpha;
    const reach = combo === 2 ? 100 : 84;
    const spread = combo === 2 ? 1.5 : 1.05;
    const grd = ctx.createLinearGradient(0, 0, reach, 0);
    grd.addColorStop(0, 'rgba(255,90,110,0)');
    grd.addColorStop(0.5, 'rgba(255,160,160,0.55)');
    grd.addColorStop(1, 'rgba(190,255,245,0.95)');
    ctx.strokeStyle = grd;
    ctx.lineWidth = 10 + combo * 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, reach * 0.78, -spread / 2, spread / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, reach * 0.82, -spread / 2, spread / 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ============================================================
   ENEMIES
   ============================================================ */
export function drawShade(ctx, e, t) {
  const spawn = e.spawn > 0 ? 1 - e.spawn / e.spawnMax : 1;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = spawn;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 10, 14, 5, 0, 0, TAU); ctx.fill();

  const hover = Math.sin(t * 3 + e.seed) * 2;
  ctx.translate(0, hover - (1 - spawn) * 22);
  ctx.scale(1.18, 1.18);
  ctx.rotate(e.angle);

  // Aura.
  const aura = glowSprite('purple');
  ctx.globalAlpha = 0.5 * spawn;
  ctx.drawImage(aura, -34, -34, 68, 68);
  ctx.globalAlpha = spawn;

  // Tattered cloak.
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.quadraticCurveTo(-10, -15, -18, -6 + Math.sin(t * 6 + e.seed) * 2);
  ctx.quadraticCurveTo(-8, -3, -16, 2);
  ctx.quadraticCurveTo(-7, 3, -14, 9 + Math.sin(t * 5 + e.seed) * 2);
  ctx.quadraticCurveTo(-4, 6, 4, 9);
  ctx.quadraticCurveTo(8, 4, 6, -8);
  ctx.closePath();
  const cg = ctx.createLinearGradient(-16, 0, 8, 0);
  cg.addColorStop(0, 'rgba(30,16,48,0.2)');
  cg.addColorStop(0.4, '#27123d');
  cg.addColorStop(1, '#3d1a56');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,107,192,0.35)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Hood / skull.
  ctx.fillStyle = '#1b0d29';
  ctx.beginPath(); ctx.arc(2, 0, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9b8d8';
  ctx.beginPath(); ctx.arc(4, -1, 4.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a0b22';
  ctx.beginPath(); ctx.ellipse(4.6, -2.3, 1.5, 1.7, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.6, 1.6, 1.5, 1.7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff5fae';
  ctx.shadowColor = '#ff4f9e';
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(5.2, -2.2, 0.9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(5.2, 1.6, 0.9, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;

  if (e.state === 'wind') {
    ctx.strokeStyle = 'rgba(255,80,100,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 30, -0.7, 0.7); ctx.stroke();
  }
  if (e.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = e.flash * 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function drawArcher(ctx, e, t) {
  const spawn = e.spawn > 0 ? 1 - e.spawn / e.spawnMax : 1;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = spawn;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 9, 13, 5, 0, 0, TAU); ctx.fill();

  ctx.translate(0, -(1 - spawn) * 18);
  ctx.scale(1.16, 1.16);
  ctx.rotate(e.angle);

  // Cloak.
  ctx.fillStyle = '#241320';
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.quadraticCurveTo(-16, 0, -10, 8);
  ctx.lineTo(2, 6);
  ctx.lineTo(0, -6);
  ctx.closePath();
  ctx.fill();

  // Ribcage.
  ctx.strokeStyle = '#cfc0a8';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(2, -5); ctx.moveTo(-5, 0); ctx.lineTo(2, 0); ctx.moveTo(-4, 5); ctx.lineTo(2, 5); ctx.stroke();
  ctx.fillStyle = '#cfc0a8';
  ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();

  // Skull.
  ctx.fillStyle = '#e2d6bf';
  ctx.beginPath(); ctx.arc(5, 0, 5.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a0b12';
  ctx.beginPath(); ctx.arc(7, -2, 1.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(7, 2, 1.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff4b42';
  ctx.shadowColor = '#ff2d2d'; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(7.3, -2, 0.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(7.3, 2, 0.8, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;

  // Bow.
  ctx.strokeStyle = '#a87d45';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(7, 0, 15, -0.95, 0.95); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,220,200,0.5)';
  ctx.lineWidth = 0.7;
  const pull = e.state === 'wind' ? (1 - e.timer / e.maxTimer) * 5 : 0;
  ctx.beginPath(); ctx.moveTo(7 + Math.cos(-0.95) * 15, Math.sin(-0.95) * 15); ctx.lineTo(14 - pull, 0); ctx.lineTo(7 + Math.cos(0.95) * 15, Math.sin(0.95) * 15); ctx.stroke();
  if (e.state === 'wind') {
    ctx.strokeStyle = 'rgba(255,90,80,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(190, 0); ctx.stroke();
  }

  if (e.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = e.flash * 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ============================================================
   BOSS
   ============================================================ */
export function drawBossTelegraphs(ctx, b, t) {
  if (!b) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (b.state === 'chargeWind') {
    const len = 700;
    const dir = b.dir;
    const ex = b.x + Math.cos(dir) * len;
    const ey = b.y + Math.sin(dir) * len;
    const alpha = 0.35 + Math.sin(t * 20) * 0.15;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(dir);
    ctx.fillStyle = `rgba(255,60,50,${alpha * 0.55})`;
    ctx.beginPath();
    ctx.moveTo(20, -34);
    ctx.lineTo(len, -9);
    ctx.lineTo(len, 9);
    ctx.lineTo(20, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,160,120,${alpha + 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(len - 10, 0); ctx.stroke();
    ctx.setLineDash([]);
    // Arrow head.
    ctx.fillStyle = `rgba(255,120,90,${alpha + 0.2})`;
    ctx.beginPath(); ctx.moveTo(len - 8, -18); ctx.lineTo(len + 18, 0); ctx.lineTo(len - 8, 18); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  if (b.state === 'slamRise' || b.state === 'slamAir') {
    const p = b.state === 'slamRise' ? 1 - b.timer / b.maxTimer : 1;
    const r = 128;
    ctx.save();
    ctx.translate(b.target.x, b.target.y);
    const pulse = 0.5 + Math.sin(t * 18) * 0.2;
    ctx.fillStyle = `rgba(220,50,40,${0.1 + p * 0.12})`;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,100,70,${0.4 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,215,160,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * (1 - p * 0.92), 0, TAU); ctx.stroke();
    // Cross.
    ctx.strokeStyle = 'rgba(255,150,100,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0);
    ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  if (b.state === 'sweepWind' || b.state === 'sweep') {
    const p = b.state === 'sweepWind' ? b.timer / b.maxTimer : 1;
    const reach = 225;
    const alpha = b.state === 'sweep' ? 0.55 : 0.18 + (1 - p) * 0.25;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.aim);
    ctx.fillStyle = `rgba(255,75,45,${alpha * 0.34})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, -1.12, 1.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,140,90,${alpha + 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, reach, -1.12, 1.12); ctx.stroke();
    // Sweep edge at current progress.
    if (b.state === 'sweep') {
      ctx.strokeStyle = 'rgba(255,240,200,0.9)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, 0, reach - 18, -1.12 + (b.timer / b.maxTimer) * 2.24 - 0.2, -1.12 + (b.timer / b.maxTimer) * 2.24); ctx.stroke();
    }
    ctx.restore();
  }

  if (b.state === 'summon') {
    const p = 1 - b.timer / b.maxTimer;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = `rgba(170,90,220,${0.35 + p * 0.35})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(0, 0, 110 + Math.sin(t * 6) * 8, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

export function drawBoss(ctx, b, t) {
  if (!b) return;
  const air = b.airZ || 0;
  const alpha = b.state === 'dead' ? clamp(b.deadTime / 2.4, 0, 1) : 1;
  const collapse = b.state === 'dead' ? clamp(b.deadTime / 1.2, 0, 1) : 0;

  // Ground shadow.
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.globalAlpha = 0.62 * alpha;
  ctx.fillStyle = '#000';
  const shrink = 1 - air / 280;
  ctx.beginPath(); ctx.ellipse(0, 16, 62 * shrink, 22 * shrink, 0, 0, TAU); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(b.x, b.y - air);
  ctx.globalAlpha = alpha;
  const breathe = 1 + Math.sin(t * 2.1) * 0.018;
  const hurtShake = b.flash > 0 ? Math.sin(t * 90) * 2.4 * b.flash : 0;
  ctx.translate(hurtShake, 0);
  ctx.scale(breathe * 1.04 * (1 + collapse * 0.15), 1.04 * (1 - collapse * 0.55));

  // Enrage aura.
  if (b.phase >= 2) {
    const aura = glowSprite('red');
    ctx.globalAlpha = b.phase >= 3 ? 0.7 : 0.42;
    ctx.drawImage(aura, -120, -120, 240, 240);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.rotate(b.angle);
  const lean = b.state === 'charge' ? 10 : b.state === 'chargeWind' ? -6 : 0;
  ctx.translate(lean, 0);

  // Hind legs.
  const walk = Math.sin(t * (b.state === 'charge' ? 18 : 5)) * (b.state === 'idle' || b.state === 'charge' ? 5 : 0);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-6, s * 31 + (s > 0 ? walk : -walk));
    ctx.fillStyle = '#1b0e12';
    ctx.beginPath(); ctx.ellipse(-8, 0, 22, 13, 0.12 * s, 0, TAU); ctx.fill();
    const legG = ctx.createLinearGradient(-24, 0, 14, 0);
    legG.addColorStop(0, '#251317');
    legG.addColorStop(0.7, '#40252b');
    legG.addColorStop(1, '#2a161a');
    ctx.fillStyle = legG;
    ctx.beginPath(); ctx.ellipse(2, 0, 15, 9, 0.16 * s, 0, TAU); ctx.fill();
    // Hoof.
    ctx.fillStyle = '#181014';
    ctx.beginPath(); ctx.ellipse(15, 0, 5.5, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(232,185,107,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(15, 0, 5.5, 6, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // Torso.
  const fur = ctx.createRadialGradient(10, -16, 6, 0, 0, 70);
  fur.addColorStop(0, '#6a3c43');
  fur.addColorStop(0.42, '#45252c');
  fur.addColorStop(0.82, '#28141a');
  fur.addColorStop(1, '#180b10');
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(-2, 0, 54, 49, 0, 0, TAU); ctx.fill();
  // Warm rim light.
  ctx.strokeStyle = 'rgba(255,140,100,0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-2, 0, 53, 48, 0, 0, TAU); ctx.stroke();

  // Shoulder masses.
  for (const s of [-1, 1]) {
    const sg = ctx.createRadialGradient(0, s * 32, 2, 0, s * 32, 24);
    sg.addColorStop(0, '#5c343b');
    sg.addColorStop(1, '#241218');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(-10, s * 32, 24, 20, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,120,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Fur strokes.
  ctx.strokeStyle = 'rgba(190,130,120,0.14)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.lineTo(Math.cos(a) * 42, Math.sin(a) * 42);
    ctx.stroke();
  }

  // Battle scars / lava cracks in phase three.
  if (b.phase >= 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,90,40,${0.55 + Math.sin(t * 6) * 0.2})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-34, -20); ctx.lineTo(-10, -9); ctx.lineTo(-16, 9); ctx.lineTo(12, 20);
    ctx.moveTo(16, -28); ctx.lineTo(8, -7); ctx.lineTo(26, 12);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,130,0.65)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  }

  // Gold chain across the chest.
  ctx.strokeStyle = 'rgba(232,185,107,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, -27);
  ctx.quadraticCurveTo(26, 0, 20, 27);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(23 + Math.abs(i) * 1.1, i * 9, 2.2, 0, TAU);
    ctx.stroke();
  }

  // Arms gripping the axe handle.
  ctx.strokeStyle = '#3a2026';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, 28); ctx.lineTo(20, 18); ctx.stroke();
  ctx.strokeStyle = '#2b161b';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(26, -12); ctx.stroke();
  // Gold bracers.
  ctx.strokeStyle = 'rgba(232,185,107,0.55)';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(14, 22); ctx.lineTo(22, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -15); ctx.lineTo(27, -11); ctx.stroke();

  // Axe: a broad labrys silhouette, easy to read at a glance.
  ctx.save();
  let axeAngle = -0.62;
  if (b.state === 'slamRise') axeAngle = -1.85 - (1 - b.timer / b.maxTimer) * 0.55;
  else if (b.state === 'slamAir') axeAngle = -2.25;
  else if (b.state === 'slamLand') axeAngle = 0.42;
  else if (b.state === 'sweepWind') axeAngle = -1.5;
  else if (b.state === 'sweep') axeAngle = -1.1 + (1 - b.timer / b.maxTimer) * 2.7;
  else if (b.state === 'stunned') axeAngle = 0.55;
  ctx.translate(18, 14);
  ctx.rotate(axeAngle);
  ctx.strokeStyle = '#160c0e';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(56, 0); ctx.stroke();
  ctx.strokeStyle = '#5a361f';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(56, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(232,185,107,0.42)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(54, -2); ctx.stroke();
  for (const x of [9, 32, 50]) {
    ctx.strokeStyle = '#c9a45c';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, -3.6); ctx.lineTo(x, 3.6); ctx.stroke();
  }
  // Double blade.
  const bladeG = ctx.createLinearGradient(52, -22, 82, 22);
  bladeG.addColorStop(0, '#b9c2c3');
  bladeG.addColorStop(0.35, '#f1f5f2');
  bladeG.addColorStop(0.7, '#889396');
  bladeG.addColorStop(1, '#4b555a');
  ctx.fillStyle = bladeG;
  ctx.strokeStyle = '#170d10';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(52, side * 2);
    ctx.quadraticCurveTo(62, side * 26, 78, side * 20);
    ctx.quadraticCurveTo(86, side * 10, 72, side * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,220,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(58, side * 5);
    ctx.quadraticCurveTo(66, side * 21, 76, side * 17);
    ctx.stroke();
    ctx.strokeStyle = '#170d10';
    ctx.lineWidth = 2;
  }
  // Central spike.
  ctx.fillStyle = '#dfe6e3';
  ctx.beginPath();
  ctx.moveTo(70, -5); ctx.lineTo(88, 0); ctx.lineTo(70, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore(); // axe

  // Head.
  ctx.save();
  ctx.translate(36, 0);
  const headTilt = b.state === 'stunned' ? 0.22 : 0;
  ctx.rotate(headTilt);
  // Ears.
  ctx.fillStyle = '#2a151a';
  ctx.beginPath(); ctx.ellipse(-3, -20, 9, 4.5, -0.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-3, 20, 9, 4.5, 0.5, 0, TAU); ctx.fill();
  // Skull.
  const headG = ctx.createRadialGradient(7, -5, 2, 0, 0, 27);
  headG.addColorStop(0, '#74464c');
  headG.addColorStop(0.62, '#43252b');
  headG.addColorStop(1, '#221116');
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.ellipse(2, 0, 24, 21, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,110,0.28)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Muzzle.
  ctx.fillStyle = '#4d2b31';
  ctx.beginPath(); ctx.ellipse(20, 0, 14, 11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#332025';
  ctx.beginPath(); ctx.ellipse(30, 0, 6.5, 8, 0, 0, TAU); ctx.fill();
  // Nostrils.
  ctx.fillStyle = '#120a0c';
  ctx.beginPath(); ctx.arc(32, -3.2, 1.6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(32, 3.2, 1.6, 0, TAU); ctx.fill();
  // Nose ring.
  ctx.strokeStyle = '#e2bd74';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(35, 0, 4.6, -1.15, 1.15); ctx.stroke();
  // Brows and eyes.
  ctx.strokeStyle = '#1a0c10';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(8, -15); ctx.lineTo(19, -11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 15); ctx.lineTo(19, 11); ctx.stroke();
  const eyeGlow = b.phase >= 3 ? 1 : 0.8;
  ctx.shadowColor = '#ff3a2a';
  ctx.shadowBlur = 14;
  ctx.fillStyle = `rgba(255,80,45,${0.9 * eyeGlow})`;
  ctx.beginPath(); ctx.arc(14, -10.5, 3.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(14, 10.5, 3.1, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe1ae';
  ctx.beginPath(); ctx.arc(15, -10.5, 1.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(15, 10.5, 1.2, 0, TAU); ctx.fill();
  // Horns — thick ivory curves sweeping back.
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(1, s);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0d0608';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(2, -15);
    ctx.quadraticCurveTo(-20, -34, -42, -44);
    ctx.stroke();
    const hornG = ctx.createLinearGradient(2, -15, -44, -45);
    hornG.addColorStop(0, '#7c634a');
    hornG.addColorStop(0.45, '#c7b08c');
    hornG.addColorStop(0.8, '#efe2c6');
    hornG.addColorStop(1, '#fff4d8');
    ctx.strokeStyle = hornG;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(2, -15);
    ctx.quadraticCurveTo(-20, -34, -42, -44);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(-21, -35, -40, -44);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); // head

  ctx.restore(); // rotate

  // Damage flash.
  if (b.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * b.flash * 0.6;
    const fg = ctx.createRadialGradient(0, 0, 5, 0, 0, 95);
    fg.addColorStop(0, 'rgba(255,255,255,0.9)');
    fg.addColorStop(1, 'rgba(255,180,150,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, 0, 95, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Stun stars.
  if (b.state === 'stunned') {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const a = t * 3.4 + (i * TAU) / 3;
      const x = Math.cos(a) * 30;
      const y = -76 + Math.sin(a) * 8;
      ctx.fillStyle = 'rgba(255,220,140,0.95)';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const aa = (j / 4) * TAU;
        ctx.lineTo(Math.cos(aa) * 4.5, Math.sin(aa) * 4.5);
        ctx.lineTo(Math.cos(aa + 0.39) * 1.8, Math.sin(aa + 0.39) * 1.8);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* ============================================================
   PROJECTILES / PICKUPS / PARTICLES
   ============================================================ */
export function drawProjectiles(ctx, game, t) {
  for (const p of game.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === 'spear') {
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = 'lighter';
      const trail = ctx.createLinearGradient(-46, 0, 10, 0);
      trail.addColorStop(0, 'rgba(255,60,80,0)');
      trail.addColorStop(0.6, 'rgba(255,90,100,0.35)');
      trail.addColorStop(1, 'rgba(255,220,200,0.9)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#fff0df';
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(0, -4.5); ctx.lineTo(-6, 0); ctx.lineTo(0, 4.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(99,230,196,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(6, -1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(6, 1.2); ctx.stroke();
    } else if (p.kind === 'arrow') {
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = 'lighter';
      const trail = ctx.createLinearGradient(-26, 0, 6, 0);
      trail.addColorStop(0, 'rgba(255,40,40,0)');
      trail.addColorStop(1, 'rgba(255,80,50,0.8)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = '#ffb08a';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(1, -3.5); ctx.lineTo(1, 3.5); ctx.closePath(); ctx.fill();
    } else if (p.kind === 'fissure') {
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-30, 0, 34, 0);
      g.addColorStop(0, 'rgba(255,60,30,0)');
      g.addColorStop(0.5, 'rgba(255,90,40,0.55)');
      g.addColorStop(1, 'rgba(255,230,170,0.95)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-34, 0);
      ctx.lineTo(-18, -3);
      ctx.lineTo(-5, 2);
      ctx.lineTo(8, -2);
      ctx.lineTo(22, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,220,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const glow = ctx.createRadialGradient(20, 0, 1, 20, 0, 26);
      glow.addColorStop(0, 'rgba(255,190,110,0.5)');
      glow.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(20, 0, 26, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawPickups(ctx, game, t) {
  for (const o of game.orbs) {
    const bob = Math.sin(t * 4 + o.seed) * 2;
    ctx.save();
    ctx.translate(o.x, o.y + bob);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
    g.addColorStop(0, 'rgba(180,255,235,0.9)');
    g.addColorStop(0.35, 'rgba(99,230,196,0.45)');
    g.addColorStop(1, 'rgba(99,230,196,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9fff1';
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,240,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 8, t * 2, t * 2 + 1.7); ctx.stroke();
    ctx.restore();
  }
}

export function drawParticles(ctx, game) {
  ctx.save();
  for (const p of game.particles) {
    const life = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * life + 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
    } else if (p.type === 'ember') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + life * 0.8), 0, TAU); ctx.fill();
    } else if (p.type === 'dust') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = life * 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.8 - life), 0, TAU); ctx.fill();
    } else if (p.type === 'ring') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.maxRadius * (1 - life), 0, TAU); ctx.stroke();
    } else if (p.type === 'slash') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, -p.spread / 2 + (1 - life) * 0.8, p.spread / 2 + (1 - life) * 0.8);
      ctx.stroke();
      ctx.restore();
    } else if (p.type === 'lightning') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.2 * life;
      ctx.beginPath();
      p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (p.type === 'shard') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + (1 - life) * 4);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.55, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.55, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawTexts(ctx, game) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of game.texts) {
    const life = clamp(d.life / d.maxLife, 0, 1);
    const pop = d.life > d.maxLife * 0.75 ? 1 + (1 - (d.maxLife - d.life) / (d.maxLife * 0.25)) * 0.35 : 1;
    ctx.globalAlpha = Math.min(1, life * 2.2);
    ctx.font = `${d.crit ? '700 ' : '600 '}${Math.round(d.size * pop)}px "Palatino Linotype",Georgia,serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,4,8,0.85)';
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
  }
  ctx.restore();
}

/* ============================================================
   SCREEN FX
   ============================================================ */
export function drawScreenFX(ctx, game, t) {
  const { W, H } = game;
  const sc = game.scenery;

  if (sc && sc.vignette) ctx.drawImage(sc.vignette, 0, 0, W, H);

  // Low health heartbeat.
  if (sc && sc.redEdge && game.player && !game.player.dead && game.player.hp / game.player.maxHp < 0.32) {
    const pulse = 0.5 + Math.sin(t * 5.5) * 0.5;
    ctx.globalAlpha = 0.14 + pulse * 0.15;
    ctx.drawImage(sc.redEdge, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Flash.
  if (game.flash > 0) {
    ctx.fillStyle = game.flashColor;
    ctx.globalAlpha = Math.min(0.6, game.flash * 0.6);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Boss phase 3 heat at edges.
  if (sc && sc.fireEdge && game.boss && game.boss.phase >= 3 && game.boss.state !== 'dead') {
    const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
    ctx.globalAlpha = 0.07 + pulse * 0.05;
    ctx.drawImage(sc.fireEdge, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

export function drawTitleScene(ctx, game, t) {
  // A great bull skull looms behind the title, barely lit by the braziers.
  ctx.save();
  ctx.translate(game.cx, game.cy + 6 * game.k);
  const s = game.k * 2.15;
  ctx.scale(s, s);
  ctx.globalAlpha = 0.52;

  // Ground shadow / shoulders.
  const shade = ctx.createRadialGradient(0, 34, 10, 0, 20, 150);
  shade.addColorStop(0, 'rgba(5,2,4,0.85)');
  shade.addColorStop(1, 'rgba(5,2,4,0)');
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.ellipse(0, 24, 160, 88, 0, 0, TAU); ctx.fill();

  ctx.fillStyle = 'rgba(12,4,8,0.82)';
  ctx.beginPath();
  ctx.moveTo(-96, 76);
  ctx.quadraticCurveTo(-78, 8, -34, -6);
  ctx.lineTo(34, -6);
  ctx.quadraticCurveTo(78, 8, 96, 76);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,185,107,0.1)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Head.
  const headG = ctx.createRadialGradient(8, -16, 6, 0, 0, 86);
  headG.addColorStop(0, 'rgba(48,24,29,0.92)');
  headG.addColorStop(0.65, 'rgba(22,10,14,0.94)');
  headG.addColorStop(1, 'rgba(8,3,6,0.96)');
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.ellipse(0, -17, 62, 55, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,110,0.18)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Muzzle.
  ctx.fillStyle = 'rgba(16,7,10,0.9)';
  ctx.beginPath(); ctx.ellipse(0, 35, 35, 27, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(4,2,3,0.9)';
  ctx.beginPath(); ctx.arc(-9, 40, 3.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(9, 40, 3.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(232,185,107,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 49, 12, -1.1, 1.1); ctx.stroke();

  // Horns.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(5,2,4,0.9)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(44, -42);
    ctx.quadraticCurveTo(96, -80, 72, -116);
    ctx.stroke();
    const hg = ctx.createLinearGradient(44, -42, 72, -116);
    hg.addColorStop(0, 'rgba(90,70,50,0.7)');
    hg.addColorStop(0.55, 'rgba(150,128,96,0.75)');
    hg.addColorStop(1, 'rgba(215,198,160,0.8)');
    ctx.strokeStyle = hg;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(44, -42);
    ctx.quadraticCurveTo(96, -80, 72, -116);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(42, -44);
    ctx.quadraticCurveTo(91, -82, 69, -113);
    ctx.stroke();
    ctx.restore();
  }

  // Eyes.
  const glow = 0.55 + Math.sin(t * 0.9) * 0.2;
  ctx.shadowColor = '#ff2a1a';
  ctx.shadowBlur = 34;
  ctx.fillStyle = `rgba(255,64,38,${glow * 0.9})`;
  ctx.beginPath(); ctx.arc(-24, -20, 5.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(24, -20, 5.5, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,216,160,0.9)';
  ctx.beginPath(); ctx.arc(-23, -20, 2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(25, -20, 2, 0, TAU); ctx.fill();

  // A colossal axe behind the head, seen on the right.
  ctx.save();
  ctx.translate(94, 20);
  ctx.rotate(0.5);
  ctx.strokeStyle = 'rgba(8,4,6,0.9)';
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(-20, 70); ctx.lineTo(10, -90); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,44,28,0.7)';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-20, 70); ctx.lineTo(10, -90); ctx.stroke();
  const blade = ctx.createLinearGradient(-50, -110, 60, -60);
  blade.addColorStop(0, 'rgba(120,130,132,0.6)');
  blade.addColorStop(0.5, 'rgba(235,240,235,0.55)');
  blade.addColorStop(1, 'rgba(70,80,84,0.6)');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(8, -86);
  ctx.quadraticCurveTo(-38, -118, -64, -84);
  ctx.quadraticCurveTo(-38, -58, 6, -72);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.restore();
}
