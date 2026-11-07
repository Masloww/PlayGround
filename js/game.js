import {
  TAU, clamp, lerp, rand, pick, dist, angleTo, angleDiff, formatTime,
} from './util.js';
import { Boss } from './boss.js';
import {
  WORLD_R, buildFloor, buildScenery, drawFloor, drawBackground, drawBraziers, drawHazards,
  drawShockwaves, drawPlayer, drawShade, drawArcher, drawBoss, drawBossTelegraphs,
  drawProjectiles, drawPickups, drawParticles, drawTexts, drawScreenFX, drawTitleScene,
} from './render.js';

const ROMAN = ['I', 'II', 'III', 'IV'];

/* ============================================================
   ENEMY
   ============================================================ */
class Enemy {
  constructor(game, type, x, y, spawn = 0.55) {
    this.game = game;
    this.type = type;
    this.x = x; this.y = y;
    this.r = type === 'archer' ? 15 : 16;
    this.maxHp = type === 'archer' ? 34 : 46;
    this.hp = this.maxHp;
    this.speed = type === 'archer' ? 74 : 96;
    this.angle = rand(0, TAU);
    this.aim = this.angle;
    this.seed = rand(0, 100);
    this.spawnMax = spawn;
    this.spawn = spawn;
    this.state = type === 'archer' ? 'reposition' : 'chase';
    this.timer = 0;
    this.maxTimer = 1;
    this.atkCd = rand(0.5, 1.4);
    this.shootCd = rand(0.8, 1.8);
    this.flash = 0;
    this.kx = 0; this.ky = 0;
    this.dead = false;
    this.hasHit = false;
  }

  update(dt) {
    if (this.dead) return;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.spawn > 0) {
      this.spawn -= dt;
      return;
    }
    const g = this.game;
    const p = g.player;
    if (p.dead) return;
    const d = dist(this.x, this.y, p.x, p.y);
    this.atkCd = Math.max(0, this.atkCd - dt);

    // Knockback drift.
    this.x += this.kx * dt;
    this.y += this.ky * dt;
    const damp = Math.min(1, dt * 7);
    this.kx -= this.kx * damp;
    this.ky -= this.ky * damp;

    if (this.type === 'shade') this.updateShade(dt, d);
    else this.updateArcher(dt, d);

    this.clampInside();
  }

  updateShade(dt, d) {
    const g = this.game;
    const p = g.player;
    switch (this.state) {
      case 'chase': {
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        this.aim = this.angle;
        const wobble = Math.sin(g.time * 2.4 + this.seed) * 0.24;
        const moveAngle = this.angle + wobble;
        this.x += Math.cos(moveAngle) * this.speed * dt;
        this.y += Math.sin(moveAngle) * this.speed * dt;
        if (d < 112 && this.atkCd <= 0) {
          this.state = 'wind';
          this.timer = 0.5;
          this.maxTimer = 0.5;
          this.hasHit = false;
        }
        break;
      }
      case 'wind': {
        this.timer -= dt;
        if (this.timer > 0.12) this.aim = angleTo(this.x, this.y, p.x, p.y);
        this.angle = this.aim;
        if (this.timer <= 0) {
          this.state = 'lunge';
          this.timer = 0.24;
          this.maxTimer = 0.24;
          this.lungeDir = angleTo(this.x, this.y, p.x, p.y);
          this.angle = this.lungeDir;
        }
        break;
      }
      case 'lunge': {
        this.timer -= dt;
        this.x += Math.cos(this.lungeDir) * 430 * dt;
        this.y += Math.sin(this.lungeDir) * 430 * dt;
        if (!this.hasHit && dist(this.x, this.y, p.x, p.y) < this.r + p.r + 3) {
          this.hasHit = true;
          g.damagePlayer(9, this.x, this.y, { knock: 220 });
        }
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = 0.38;
          this.maxTimer = 0.38;
          this.atkCd = 1.15;
        }
        break;
      }
      case 'recover': {
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'chase';
        break;
      }
      default:
        this.state = 'chase';
    }
  }

  updateArcher(dt, d) {
    const g = this.game;
    const p = g.player;
    switch (this.state) {
      case 'reposition': {
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        this.aim = this.angle;
        let desired = 0;
        if (d < 155) desired = this.angle + Math.PI;
        else if (d > 245) desired = this.angle;
        else desired = this.angle + (Math.sin(g.time * 1.3 + this.seed) > 0 ? 1 : -1) * Math.PI / 2;
        this.x += Math.cos(desired) * this.speed * dt;
        this.y += Math.sin(desired) * this.speed * dt;
        this.shootCd -= dt;
        if (this.shootCd <= 0 && d < 300) {
          this.state = 'shootWind';
          this.timer = 0.55;
          this.maxTimer = 0.55;
        }
        break;
      }
      case 'shootWind': {
        this.timer -= dt;
        if (this.timer > 0.12) this.aim = angleTo(this.x, this.y, p.x, p.y);
        this.angle = this.aim;
        if (this.timer <= 0) {
          const a = angleTo(this.x, this.y, p.x, p.y);
          g.spawnProjectile({
            kind: 'arrow',
            x: this.x + Math.cos(a) * 17,
            y: this.y + Math.sin(a) * 17,
            angle: a,
            speed: 305,
            r: 7,
            dmg: 8,
            life: 2.6,
            fromBoss: true,
          });
          g.burst(this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 16, '#ff6a4a', 3, 80, 0.3, 'spark');
          this.state = 'recover';
          this.timer = 0.42;
          this.shootCd = rand(1.9, 2.6);
        }
        break;
      }
      case 'recover': {
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'reposition';
        break;
      }
      default:
        this.state = 'reposition';
    }
  }

  clampInside() {
    const R = 300 - this.r - 2;
    const d = Math.hypot(this.x, this.y);
    if (d > R) {
      this.x = (this.x / d) * R;
      this.y = (this.y / d) * R;
    }
  }

  takeDamage(amount, crit = false, fromAngle = 0) {
    if (this.spawn > 0 || this.dead) return;
    const dmg = Math.round(amount);
    this.hp -= dmg;
    this.flash = 0.7;
    this.game.stats.damage += dmg;
    this.kx += Math.cos(fromAngle) * (crit ? 200 : 110);
    this.ky += Math.sin(fromAngle) * (crit ? 200 : 110);
    this.game.addText(this.x + rand(-8, 8), this.y - 22, `${dmg}`, crit ? '#ffe0a3' : '#ffd9d0', crit ? 20 : 15, crit);
    const color = this.type === 'archer' ? '#d8c8a8' : '#b184d8';
    this.game.burst(this.x, this.y, color, crit ? 8 : 5, 150, 0.45, 'spark');
    this.game.audio.hit(crit);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    const g = this.game;
    const color = this.type === 'archer' ? '#cfc0a8' : '#9a63c9';
    g.burst(this.x, this.y, color, 16, 220, 0.8, 'shard');
    g.burst(this.x, this.y, '#ff7a8a', 8, 120, 0.7, 'dust');
    g.addParticle({
      type: 'ring', x: this.x, y: this.y, vx: 0, vy: 0,
      life: 0.45, maxLife: 0.45, size: 2.5, maxRadius: 42, color: 'rgba(180,120,220,0.7)',
    });
    if (Math.random() < (this.type === 'archer' ? 0.62 : 0.45)) {
      g.orbs.push({ x: this.x, y: this.y, seed: rand(0, 10), life: 14, r: 9, vx: 0, vy: 0 });
    }
    g.audio.hit(true);
    g.shake(0.08);
  }
}

/* ============================================================
   GAME
   ============================================================ */
export class Game {
  constructor(canvas, audio, input, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.input = input;
    this.ui = ui;

    this.W = 0; this.H = 0; this.dpr = 1;
    this.cx = 0; this.cy = 0; this.k = 1; this.Rpx = 300;
    this.floor = null;

    this.state = 'title';
    this.prevState = 'playing';
    this.time = 0;
    this.runTime = 0;
    this.mode = 'waves';
    this.stats = { damage: 0, time: 0, phase: 0 };

    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.hazards = [];
    this.orbs = [];
    this.particles = [];
    this.texts = [];

    this.player = this.makePlayer();
    this.boss = null;

    this.waveIndex = 0;
    this.totalWaves = 2;
    this.waveActive = false;
    this.waveDelay = 0;
    this.pendingBoss = false;

    this.introTimer = 0;
    this.introRoarTimer = 0;
    this.introRoarDone = false;

    this.shakeTrauma = 0;
    this.flash = 0;
    this.flashColor = '#ff1a35';
    this.hitStopTimer = 0;

    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.boons = [];
    this.boonChoices = [];
    this.shakeEnabled = true;
    this.ambientTimer = 0;
    this.isTouch = document.body.classList.contains('touch');
    this.titleTime = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 220));
  }

  makePlayer() {
    return {
      x: 0, y: 150, r: 17,
      speed: 272,
      facing: -Math.PI / 2,
      hp: 100, maxHp: 100,
      dmgMult: 1, critChance: 0.06, lifesteal: 0, chain: false, shield: 0,
      dashMax: 2, dashCharges: 2, dashRecharge: 0.95, dashRegen: 0,
      dashTimer: 0, dashDir: 0, dashCd: 0, dashSpeed: 1150,
      invuln: 0, hurtTime: 0,
      attackCd: 0, attackTime: 0, attackDuration: 0.18, attackDir: 0,
      combo: 0, comboTimer: 0,
      specialCd: 0, specialMax: 2.3,
      walkPhase: 0, moving: false,
      kx: 0, ky: 0,
      trail: [],
      dead: false,
    };
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.isTouch = document.body.classList.contains('touch');
    const portrait = this.H > this.W;
    let topSpace, bottomSpace, sideSpace;
    if (this.isTouch) {
      topSpace = portrait ? 96 : 38;
      bottomSpace = portrait ? 150 : 38;
      sideSpace = 14;
    } else {
      topSpace = 46;
      bottomSpace = 54;
      sideSpace = 90;
    }
    const availW = Math.max(240, this.W - sideSpace * 2);
    const availH = Math.max(180, this.H - topSpace - bottomSpace);
    this.Rpx = clamp(Math.min(availW * 0.5, availH * 0.55, 335), 120, 335);
    this.cx = this.W / 2;
    this.cy = topSpace + availH / 2;
    this.k = this.Rpx / WORLD_R;
    this.floor = buildFloor(this.k, dpr);
    this.scenery = buildScenery(this.W, this.H, dpr);
  }

  screenToWorld(sx, sy) {
    return { x: (sx - this.cx) / this.k, y: (sy - this.cy) / this.k };
  }

  /* ---------------- lifecycle ---------------- */
  showTitle() {
    this.state = 'title';
    this.titleTime = 0;
    this.player = this.makePlayer();
    this.boss = null;
    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.hazards = [];
    this.orbs = [];
    this.particles = [];
    this.texts = [];
    this.boons = [];
    this.shakeTrauma = 0;
    this.flash = 0;
    this.ui.showTitle();
    this.ui.clearCombatUI();
    this.audio.setIntensity(0);
    for (let i = 0; i < 45; i++) this.spawnAmbient(true);
  }

  start(mode) {
    this.mode = mode;
    this.audio.init();
    this.audio.resume();
    this.player = this.makePlayer();
    this.boss = null;
    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.hazards = [];
    this.orbs = [];
    this.particles = [];
    this.texts = [];
    this.boons = [];
    this.boonChoices = [];
    this.waveIndex = 0;
    this.waveActive = false;
    this.waveDelay = 0;
    this.pendingBoss = false;
    this.stats = { damage: 0, time: 0, phase: 0 };
    this.runTime = 0;
    this.shakeTrauma = 0;
    this.flash = 0;
    this.hitStopTimer = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.introTimer = 0;
    this.ambientTimer = 0;
    this.input.clear();

    this.ui.clearCombatUI();
    this.ui.hideTitle();
    this.ui.setHudVisible(true);
    this.ui.setShakeEnabled(this.shakeEnabled);

    if (mode === 'waves') {
      this.state = 'playing';
      this.audio.setIntensity(1);
      this.startWave(0);
    } else {
      this.state = 'boon';
      this.pendingBoss = true;
      this.audio.setIntensity(1);
      this.openBoons({
        eyebrow: 'El Olimpo te observa',
        title: 'Bendición del desafío',
        sub: 'Sin oleadas. Solo tú, el toro y una última ventaja.',
      });
    }
  }

  restart() {
    this.ui.hideEnd();
    this.ui.hidePause();
    this.start(this.mode);
  }

  toTitle() {
    this.ui.hideEnd();
    this.ui.hidePause();
    this.showTitle();
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'bossIntro') return;
    this.prevState = this.state;
    this.state = 'paused';
    this.input.clear();
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.prevState || 'playing';
    this.input.clear();
    this.ui.hidePause();
  }

  toggleShake() {
    this.shakeEnabled = !this.shakeEnabled;
    this.ui.setShakeEnabled(this.shakeEnabled);
  }

  /* ---------------- waves & boons ---------------- */
  startWave(index) {
    this.waveIndex = index;
    this.waveActive = true;
    this.waveDelay = 0;
    const label = `OLEADA ${ROMAN[index]}`;
    this.ui.setWaveLabel(label);
    this.ui.banner(label, index === 0 ? 'Las sombras despiertan' : 'El laberinto aprieta', 1500);
    this.audio.waveStart();
    this.audio.setIntensity(1);

    const counts = index === 0 ? { shade: 5, archer: 0 } : { shade: 4, archer: 2 };
    let i = 0;
    const total = counts.shade + counts.archer;
    for (let s = 0; s < counts.shade; s++, i++) this.spawnRingEnemy('shade', i, total);
    for (let a = 0; a < counts.archer; a++, i++) this.spawnRingEnemy('archer', i, total);
  }

  spawnRingEnemy(type, i, total) {
    const base = rand(0, TAU);
    const angle = base + (i / total) * TAU;
    const d = rand(215, 265);
    const x = clamp(Math.cos(angle) * d, -265, 265);
    const y = clamp(Math.sin(angle) * d, -265, 265);
    this.spawnEnemy(type, x, y, 0.45 + i * 0.13);
  }

  spawnEnemy(type, x, y, spawn = 0.55) {
    const e = new Enemy(this, type, x, y, spawn);
    this.enemies.push(e);
    this.addParticle({
      type: 'ring', x, y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5,
      size: 2.5, maxRadius: 34, color: type === 'archer' ? 'rgba(255,140,90,0.5)' : 'rgba(170,100,220,0.55)',
    });
    this.burst(x, y, type === 'archer' ? '#ffb08a' : '#b184d8', 6, 90, 0.6, 'dust');
  }

  openBoons({ eyebrow, title, sub }) {
    this.state = 'boon';
    this.boonChoices = this.rollBoons();
    this.ui.showBoons(this.boonChoices, { eyebrow, title, sub }, (i) => this.chooseBoon(i));
    this.audio.setIntensity(1);
  }

  rollBoons() {
    const pool = this.boonPool().filter((b) => !this.boons.includes(b.id));
    const source = pool.length >= 3 ? pool : this.boonPool();
    const shuffled = [...source];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
  }

  boonPool() {
    return [
      {
        id: 'ares', name: 'Sangre de Ares', icon: '⚔', short: 'Ares',
        desc: '+25% de daño con la espada del príncipe.',
        flavor: 'Dios de la guerra',
        apply: (p) => { p.dmgMult *= 1.25; },
      },
      {
        id: 'cerbero', name: 'Corazón de Cerbero', icon: '❤', short: 'Cerbero',
        desc: '+35 de vida máxima. La sangre te devuelve 35 puntos ahora.',
        flavor: 'Guardián del Hades',
        apply: (p) => { p.maxHp += 35; p.hp = Math.min(p.maxHp, p.hp + 35); },
      },
      {
        id: 'hermes', name: 'Alas de Hermes', icon: '➤', short: 'Hermes',
        desc: '+1 carga de esquiva y recarga un 20% más rápida.',
        flavor: 'Mensajero veloz',
        apply: (p) => { p.dashMax += 1; p.dashCharges = p.dashMax; p.dashRecharge *= 0.8; },
      },
      {
        id: 'zeus', name: 'Furia de Zeus', icon: 'ϟ', short: 'Zeus',
        desc: 'La Sangre de Estigia encadena un rayo a dos enemigos cercanos.',
        flavor: 'Señor del cielo',
        apply: (p) => { p.chain = true; },
      },
      {
        id: 'atenea', name: 'Égida de Atenea', icon: '◈', short: 'Atenea',
        desc: 'Ganas un escudo que bloquea un golpe. Se renueva al cambiar de fase.',
        flavor: 'Sabiduría y estrategia',
        apply: (p) => { p.shield = Math.max(1, p.shield + 1); },
      },
      {
        id: 'dioniso', name: 'Don de Dioniso', icon: '✷', short: 'Dioniso',
        desc: 'Recuperas 2 de vida con cada golpe de espada que conecte.',
        flavor: 'Dios del vino',
        apply: (p) => { p.lifesteal += 2; },
      },
    ];
  }

  chooseBoon(index) {
    if (this.state !== 'boon') return;
    const boon = this.boonChoices[index];
    if (!boon) return;
    boon.apply(this.player);
    this.boons.push(boon.id);
    this.ui.addBoonTag(boon);
    this.ui.hideBoons();
    this.audio.select();
    this.ui.toast(`${boon.name} — ${boon.desc}`);
    this.input.clear();
    this.state = 'playing';
    if (this.pendingBoss) {
      this.pendingBoss = false;
      this.startBossIntro();
    } else if (this.mode === 'waves') {
      this.startWave(Math.min(this.waveIndex + 1, this.totalWaves - 1));
    }
  }

  /* ---------------- boss ---------------- */
  startBossIntro() {
    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.hazards = [];
    this.orbs = [];
    this.texts = [];
    this.boss = new Boss(this);
    this.boss.x = 0;
    this.boss.y = -330;
    this.player.x = 0;
    this.player.y = 155;
    this.player.facing = -Math.PI / 2;
    this.player.invuln = 999;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.player.dashCharges = this.player.dashMax;
    this.player.specialCd = 0;
    this.state = 'bossIntro';
    this.introTimer = 3.35;
    this.introRoarTimer = 0.55;
    this.introRoarDone = false;
    this.ui.setWaveLabel('');
    this.ui.showBossIntro();
    this.ui.showBossBar(true);
    this.ui.updateBoss(this.boss);
    this.audio.setIntensity(2);
    this.runTime = this.runTime; // intro time is not counted
  }

  updateBossIntro(dt) {
    this.introTimer -= dt;
    if (!this.introRoarDone) {
      this.introRoarTimer -= dt;
      if (this.introRoarTimer <= 0) {
        this.introRoarDone = true;
        this.audio.bossRoar();
        this.shake(0.7);
        this.flashScreen('#ff3a2a', 0.18);
        this.burst(0, -140, '#ff5c2e', 30, 260, 1.1, 'ember');
        this.addShockwave(0, -140, { speed: 420, maxR: 360, dmg: 0, width: 26, color: '#ff7a4a' });
      }
    }
    if (this.boss) this.boss.update(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateAmbient(dt);
    if (this.introTimer <= 0) {
      this.state = 'playing';
      this.player.invuln = 0.6;
      this.ui.hideBossIntro();
      this.ui.banner('ASTERIÓN', 'EL TORO DEL LABERINTO', 1900);
      this.audio.setIntensity(2);
    }
  }

  onBossPhase(phase) {
    this.audio.phase();
    this.audio.setIntensity(phase >= 3 ? 3 : 2);
    this.ui.setWaveLabel('');
    this.flashScreen(phase >= 3 ? '#ff5a2e' : '#ff8a6a', 0.3);
    if (phase === 2) {
      this.ui.banner('FASE II', 'La furia despierta', 1500);
      this.spawnEnemy('shade', -200, -60, 0.5);
      this.spawnEnemy('shade', 200, -60, 0.5);
    } else if (phase === 3) {
      this.ui.banner('FASE III', 'No hay vuelta atrás', 1600);
      this.spawnEnemy('shade', -210, 40, 0.45);
      this.spawnEnemy('shade', 210, 40, 0.45);
      this.spawnEnemy('archer', 0, -220, 0.6);
    }
    if (this.boons.includes('atenea')) this.player.shield = Math.max(1, this.player.shield);
    this.ui.updateBoss(this.boss);
  }

  onBossDefeated() {
    if (this.state === 'victory' || this.state === 'victoryDone') return;
    this.state = 'victory';
    this.victoryTimer = 2.7;
    this.stats.time = this.runTime;
    this.stats.phase = this.boss ? this.boss.phase : 3;
    this.player.invuln = 999;
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
    this.ui.setWaveLabel('');
    this.ui.banner('EL LABERINTO CALLA', 'ASTERIÓN HA CAÍDO', 2400);
    this.audio.setIntensity(0);
    this.audio.victory();
    this.flashScreen('#ffe0a3', 0.35);
  }

  updateVictory(dt) {
    this.victoryTimer -= dt;
    if (this.boss) this.boss.update(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateAmbient(dt);
    this.updateShockwaves(dt);
    if (this.victoryTimer <= 0 && this.state === 'victory') {
      this.state = 'victoryDone';
      this.stats.time = this.runTime;
      this.ui.showEnd(true, this.stats);
    }
  }

  /* ---------------- damages / effects ---------------- */
  damagePlayer(amount, sx, sy, { knock = 260 } = {}) {
    const p = this.player;
    if (this.state !== 'playing' || p.dead || p.invuln > 0 || p.dashTimer > 0) return false;
    if (p.shield > 0) {
      p.shield -= 1;
      p.invuln = 0.75;
      this.audio.hit(true);
      this.addText(p.x, p.y - 34, 'BLOQUEADO', '#8fffe0', 16, true);
      this.burst(p.x, p.y, '#63e6c4', 16, 200, 0.6, 'spark');
      this.addParticle({
        type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4,
        size: 2, maxRadius: 50, color: 'rgba(99,230,196,0.8)',
      });
      this.shake(0.16);
      return false;
    }
    p.hp -= amount;
    p.invuln = 0.78;
    p.hurtTime = 0.22;
    if (sx !== undefined) {
      const a = angleTo(sx, sy, p.x, p.y);
      p.kx += Math.cos(a) * knock;
      p.ky += Math.sin(a) * knock;
    }
    this.addText(p.x, p.y - 32, `-${amount}`, '#ff6b7d', 18, false);
    this.burst(p.x, p.y, '#ff3a58', 12, 200, 0.6, 'spark');
    this.shake(0.55);
    this.flashScreen('#ff102c', 0.32);
    this.hitStop(0.045);
    this.audio.playerHurt();
    if (p.hp <= 0) {
      p.hp = 0;
      this.killPlayer();
    }
    this.ui.updatePlayer(p);
    return true;
  }

  killPlayer() {
    if (this.player.dead) return;
    this.player.dead = true;
    this.state = 'dying';
    this.deathTimer = 2.0;
    this.deathReported = false;
    this.player.trail = [];
    this.audio.death();
    this.audio.setIntensity(0);
    this.shake(1.1);
    this.flashScreen('#7a0018', 0.6);
    this.burst(this.player.x, this.player.y, '#ff4961', 30, 280, 1.2, 'spark');
    this.addShockwave(this.player.x, this.player.y, { speed: 280, maxR: 300, dmg: 0, width: 20, color: '#ff4961' });
  }

  updateDying(dt) {
    this.deathTimer -= dt;
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateShockwaves(dt);
    this.updateAmbient(dt);
    if (this.deathTimer <= 0 && this.state === 'dying') {
      this.state = 'defeat';
      this.stats.time = this.runTime;
      this.stats.phase = this.boss ? this.boss.phase : 0;
      this.ui.showEnd(false, this.stats);
    }
  }

  shake(amount) {
    if (!this.shakeEnabled) return;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
  }

  flashScreen(color, amount) {
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount);
  }

  hitStop(seconds) {
    this.hitStopTimer = Math.max(this.hitStopTimer, seconds);
  }

  burst(x, y, color, count, speed, life, type = 'spark') {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(0.25, 1) * speed;
      let vx = Math.cos(a) * s;
      let vy = Math.sin(a) * s;
      if (type === 'ember') {
        vx *= 0.5;
        vy = -Math.abs(vy) * 0.7 - rand(10, 40);
      } else if (type === 'dust') {
        vx *= 0.35;
        vy *= 0.35;
      }
      this.addParticle({
        type,
        x: x + rand(-6, 6),
        y: y + rand(-6, 6),
        vx, vy,
        life: life * rand(0.6, 1.15),
        maxLife: life,
        size: type === 'dust' ? rand(4, 10) : type === 'shard' ? rand(2.5, 5) : rand(1.4, 3.4),
        color,
        rot: rand(0, TAU),
      });
    }
    this.trimParticles();
  }

  addParticle(p) {
    this.particles.push(p);
  }

  trimParticles() {
    if (this.particles.length > 320) this.particles.splice(0, this.particles.length - 320);
  }

  addText(x, y, text, color, size = 17, crit = false) {
    this.texts.push({
      x, y, text, color, size, crit,
      life: crit ? 0.95 : 0.8,
      maxLife: crit ? 0.95 : 0.8,
      vy: -46,
    });
  }

  addShockwave(x, y, { speed = 420, maxR = 340, dmg = 12, width = 18, color = '#ff7a4a' } = {}) {
    const life = maxR / speed;
    this.shockwaves.push({
      x, y, r: 10, maxR, speed, dmg, width, color,
      life, maxLife: life, hit: false,
    });
  }

  spawnHazard(x, y, r, delay) {
    this.hazards.push({ x, y, r, delay, maxDelay: delay, life: 0.28, maxLife: 0.28, exploded: false });
  }

  spawnProjectile(opts) {
    this.projectiles.push({
      trailTimer: 0,
      pierce: 0,
      hitSet: new Set(),
      ...opts,
    });
  }

  /* ---------------- player ---------------- */
  aimAngle() {
    const p = this.player;
    let base = p.facing;
    if (this.input.aimActive && this.input.mouse.inside) {
      const w = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
      if (Math.hypot(w.x - p.x, w.y - p.y) > 12) base = angleTo(p.x, p.y, w.x, w.y);
    }
    let best = null;
    let bestScore = Infinity;
    const candidates = [...this.enemies];
    if (this.boss && this.boss.state !== 'dead') candidates.push(this.boss);
    for (const t of candidates) {
      if (t.dead || (t.spawn !== undefined && t.spawn > 0)) continue;
      const d = dist(p.x, p.y, t.x, t.y);
      if (d > 195 + t.r) continue;
      const ad = Math.abs(angleDiff(base, angleTo(p.x, p.y, t.x, t.y)));
      const tolerance = this.isTouch ? 1.5 : 0.7;
      if (ad > tolerance) continue;
      const score = d + ad * 60;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    if (best) base = angleTo(p.x, p.y, best.x, best.y);
    return base;
  }

  tryDash() {
    const p = this.player;
    if (p.dashCharges <= 0 || p.dashCd > 0 || p.dead) return;
    const mv = this.input.moveVector();
    let a = p.facing;
    if (mv.len > 0.1) a = Math.atan2(mv.y, mv.x);
    p.dashCharges -= 1;
    p.dashDir = a;
    p.dashTimer = 0.155;
    p.dashCd = 0.13;
    p.invuln = Math.max(p.invuln, 0.23);
    p.facing = a;
    this.audio.dash();
    this.burst(p.x, p.y, '#63e6c4', 8, 130, 0.45, 'spark');
    this.addParticle({
      type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35,
      size: 1.5, maxRadius: 38, color: 'rgba(99,230,196,0.5)',
    });
  }

  tryAttack() {
    const p = this.player;
    if (p.attackCd > 0 || p.dead) return;
    const combo = p.comboTimer > 0 ? (p.combo + 1) % 3 : 0;
    const aim = this.aimAngle();
    p.facing = aim;
    p.combo = combo;
    p.comboTimer = 0.78;
    p.attackCd = 0.295;
    p.attackDuration = combo === 2 ? 0.22 : 0.17;
    p.attackTime = p.attackDuration;
    p.attackDir = aim;

    // Small forward lunge.
    p.x += Math.cos(aim) * 7;
    p.y += Math.sin(aim) * 7;
    this.clampPlayer();

    const baseDmg = [18, 21, 34][combo] * p.dmgMult;
    const crit = Math.random() < p.critChance;
    const dmg = Math.round(baseDmg * (crit ? 1.85 : 1));
    let hitCount = 0;

    for (const e of this.enemies) {
      if (e.dead || e.spawn > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > 96 + e.r) continue;
      const ad = Math.abs(angleDiff(aim, angleTo(p.x, p.y, e.x, e.y)));
      if (ad > 1.12 + e.r / d) continue;
      e.takeDamage(dmg, crit, aim);
      hitCount++;
    }

    if (this.boss && this.boss.state !== 'dead') {
      const b = this.boss;
      const d = dist(p.x, p.y, b.x, b.y);
      const ad = Math.abs(angleDiff(aim, angleTo(p.x, p.y, b.x, b.y)));
      if (d < b.r + 94 && ad < 1.5) {
        b.takeDamage(dmg, { crit, stunBonus: b.state === 'stunned' });
        hitCount++;
      }
    }

    if (hitCount > 0) {
      this.hitStop(combo === 2 ? 0.055 : 0.03);
      this.shake(combo === 2 ? 0.18 : 0.08);
      if (p.lifesteal > 0) {
        p.hp = Math.min(p.maxHp, p.hp + p.lifesteal);
        this.addText(p.x, p.y - 46, `+${p.lifesteal}`, '#8fffe0', 13, false);
      }
    }

    this.audio.slash(combo);
    this.addParticle({
      type: 'slash', x: p.x, y: p.y, vx: 0, vy: 0,
      life: 0.2, maxLife: 0.2,
      size: combo === 2 ? 9 : 6,
      radius: combo === 2 ? 92 : 74,
      spread: combo === 2 ? 1.7 : 1.25,
      angle: aim,
      color: combo === 2 ? 'rgba(255,230,190,0.9)' : 'rgba(255,180,180,0.75)',
    });
  }

  trySpecial() {
    const p = this.player;
    if (p.specialCd > 0 || p.dead) return;
    const aim = this.aimAngle();
    p.facing = aim;
    p.specialCd = p.specialMax;
    this.spawnProjectile({
      kind: 'spear',
      x: p.x + Math.cos(aim) * 22,
      y: p.y + Math.sin(aim) * 22,
      angle: aim,
      speed: 760,
      r: 11,
      dmg: 62 * p.dmgMult,
      life: 1.35,
      pierce: 2,
      chain: p.chain,
      fromBoss: false,
    });
    this.audio.cast();
    this.shake(0.12);
    this.burst(p.x + Math.cos(aim) * 20, p.y + Math.sin(aim) * 20, '#ffc0b0', 10, 180, 0.4, 'spark');
  }

  clampPlayer() {
    const p = this.player;
    const R = 300 - p.r - 2;
    const d = Math.hypot(p.x, p.y);
    if (d > R) {
      p.x = (p.x / d) * R;
      p.y = (p.y / d) * R;
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.dead) return;
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    p.specialCd = Math.max(0, p.specialCd - dt);
    p.attackTime = Math.max(0, p.attackTime - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtTime = Math.max(0, p.hurtTime - dt);
    p.walkPhase += dt * 11;

    for (const ghost of p.trail) ghost.life -= dt;
    p.trail = p.trail.filter((g) => g.life > 0);

    if (p.dashCharges < p.dashMax) {
      p.dashRegen += dt;
      if (p.dashRegen >= p.dashRecharge) {
        p.dashRegen -= p.dashRecharge;
        p.dashCharges++;
      }
    }

    // Knockback.
    p.x += p.kx * dt;
    p.y += p.ky * dt;
    const damp = Math.min(1, dt * 8);
    p.kx -= p.kx * damp;
    p.ky -= p.ky * damp;

    const mv = this.input.moveVector();
    p.moving = mv.len > 0.08;

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.x += Math.cos(p.dashDir) * p.dashSpeed * dt;
      p.y += Math.sin(p.dashDir) * p.dashSpeed * dt;
      p.facing = p.dashDir;
      p.trail.push({ x: p.x, y: p.y, facing: p.facing, life: 0.24, maxLife: 0.24 });
      if (Math.random() < 0.7) {
        this.addParticle({
          type: 'ember', x: p.x - Math.cos(p.dashDir) * 8, y: p.y - Math.sin(p.dashDir) * 8,
          vx: -Math.cos(p.dashDir) * 20, vy: -Math.sin(p.dashDir) * 20,
          life: 0.3, maxLife: 0.3, size: rand(1.5, 3), color: '#63e6c4',
        });
      }
    } else {
      if (p.moving) {
        p.x += mv.x * p.speed * dt;
        p.y += mv.y * p.speed * dt;
      }
      if (this.input.aimActive && this.input.mouse.inside) {
        const w = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
        if (Math.hypot(w.x - p.x, w.y - p.y) > 8) p.facing = angleTo(p.x, p.y, w.x, w.y);
      } else if (p.moving) {
        p.facing = Math.atan2(mv.y, mv.x);
      }
      if (this.input.consumeDash()) this.tryDash();
    }

    if (this.input.attackHeld) this.tryAttack();
    if (this.input.consumeSpecial()) this.trySpecial();

    this.clampPlayer();
  }

  /* ---------------- update ---------------- */
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.input.update(dt);

    if (this.input.consumePause()) {
      if (this.state === 'paused') this.resume();
      else if (this.state === 'playing' || this.state === 'bossIntro') {
        this.pause();
        return;
      }
    }

    if (this.state === 'paused') return;

    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.2);

    switch (this.state) {
      case 'title':
        this.titleTime += dt;
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateAmbient(dt, 0.7);
        if (this.particles.length < 40 && Math.random() < dt * 4) this.spawnAmbient(false);
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'bossIntro':
        this.updateBossIntro(dt);
        break;
      case 'boon':
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateAmbient(dt, 0.5);
        break;
      case 'dying':
        this.updateDying(dt);
        break;
      case 'victory':
        this.updateVictory(dt);
        break;
      case 'defeat':
      case 'victoryDone':
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateAmbient(dt, 0.5);
        break;
      default:
        break;
    }

    if (this.player) this.ui.updatePlayer(this.player);
    if (this.boss) this.ui.updateBoss(this.boss);
  }

  updatePlaying(dt) {
    this.runTime += dt;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    this.updatePlayer(dt);

    for (const e of this.enemies) e.update(dt);
    this.separateEnemies();

    if (this.boss) this.boss.update(dt);

    this.updateProjectiles(dt);
    this.updateShockwaves(dt);
    this.updateHazards(dt);
    this.updateOrbs(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateAmbient(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.mode === 'waves' && !this.boss) {
      if (this.waveActive && this.enemies.length === 0) {
        this.waveActive = false;
        this.waveDelay = 1.6;
        this.ui.banner('OLEADA SUPERADA', this.waveIndex + 1 < this.totalWaves ? 'El laberinto respira' : 'El camino hacia el toro', 1400);
        this.audio.waveStart();
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
        this.addText(this.player.x, this.player.y - 38, '+8', '#8fffe0', 14, false);
      } else if (!this.waveActive && this.waveDelay > 0) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          if (this.waveIndex + 1 < this.totalWaves) {
            this.startWave(this.waveIndex + 1);
          } else {
            this.pendingBoss = true;
            this.openBoons({
              eyebrow: 'Antes de la última puerta',
              title: 'Elige una bendición',
              sub: 'Solo una. El toro no perdona la duda.',
            });
          }
        }
      }
    }
  }

  separateEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.spawn > 0) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.spawn > 0) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d > 0 && d < min) {
          const push = (min - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += Math.cos(pr.angle) * pr.speed * dt;
      pr.y += Math.sin(pr.angle) * pr.speed * dt;

      pr.trailTimer -= dt;
      if (pr.trailTimer <= 0) {
        pr.trailTimer = 0.025;
        this.addParticle({
          type: 'ember',
          x: pr.x - Math.cos(pr.angle) * 14,
          y: pr.y - Math.sin(pr.angle) * 14,
          vx: rand(-15, 15), vy: rand(-15, 15),
          life: 0.28, maxLife: 0.28,
          size: pr.kind === 'spear' ? 2.6 : 1.8,
          color: pr.kind === 'spear' ? '#ff8a7a' : pr.kind === 'fissure' ? '#ff7a3a' : '#ff5a4a',
        });
      }

      if (pr.kind === 'spear') {
        for (const e of this.enemies) {
          if (e.dead || e.spawn > 0 || pr.hitSet.has(e)) continue;
          if (dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
            pr.hitSet.add(e);
            e.takeDamage(pr.dmg, false, pr.angle);
            this.sparkImpact(pr.x, pr.y, '#ffd0b0');
            if (pr.chain) this.chainLightning(e, pr.x, pr.y);
            pr.pierce--;
            if (pr.pierce <= 0) break;
          }
        }
        if (pr.pierce > 0 && this.boss && this.boss.state !== 'dead' && !pr.hitSet.has(this.boss)) {
          if (dist(pr.x, pr.y, this.boss.x, this.boss.y) < pr.r + this.boss.r) {
            pr.hitSet.add(this.boss);
            this.boss.takeDamage(pr.dmg, { crit: false });
            this.sparkImpact(pr.x, pr.y, '#ffd0b0');
            if (pr.chain) this.chainLightning(this.boss, pr.x, pr.y);
            pr.pierce--;
          }
        }
      } else if (pr.fromBoss) {
        if (!pr.dead && dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r) {
          if (this.damagePlayer(pr.dmg, pr.x - Math.cos(pr.angle) * 20, pr.y - Math.sin(pr.angle) * 20, { knock: 200 })) {
            pr.dead = true;
          }
        }
      }

      if (pr.life <= 0 || pr.dead || Math.hypot(pr.x, pr.y) > 330) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  chainLightning(source, x, y) {
    const targets = [];
    for (const e of this.enemies) {
      if (e.dead || e === source || e.spawn > 0) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < 210) targets.push({ t: e, d });
    }
    if (this.boss && this.boss.state !== 'dead' && this.boss !== source) {
      const d = dist(x, y, this.boss.x, this.boss.y);
      if (d < 210) targets.push({ t: this.boss, d });
    }
    targets.sort((a, b) => a.d - b.d);
    let from = { x, y };
    for (let i = 0; i < Math.min(2, targets.length); i++) {
      const target = targets[i].t;
      const points = [[from.x, from.y]];
      for (let s = 1; s < 5; s++) {
        const t = s / 5;
        points.push([lerp(from.x, target.x, t) + rand(-9, 9), lerp(from.y, target.y, t) + rand(-9, 9)]);
      }
      points.push([target.x, target.y]);
      this.addParticle({
        type: 'lightning', x: 0, y: 0, vx: 0, vy: 0,
        life: 0.22, maxLife: 0.22, size: 0, points, color: '#a9f4ff',
      });
      if (target === this.boss) this.boss.takeDamage(24 * this.player.dmgMult, { crit: false });
      else target.takeDamage(24 * this.player.dmgMult, false, angleTo(from.x, from.y, target.x, target.y));
      this.sparkImpact(target.x, target.y, '#a9f4ff');
      from = target;
    }
  }

  sparkImpact(x, y, color) {
    this.burst(x, y, color, 10, 220, 0.45, 'spark');
    this.addParticle({
      type: 'ring', x, y, vx: 0, vy: 0,
      life: 0.28, maxLife: 0.28, size: 2.2, maxRadius: 30, color: 'rgba(255,220,180,0.7)',
    });
  }

  updateShockwaves(dt) {
    const p = this.player;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += s.speed * dt;
      s.life -= dt;
      if (!s.hit && s.dmg > 0 && this.state === 'playing' && !p.dead) {
        const d = dist(s.x, s.y, p.x, p.y);
        if (Math.abs(d - s.r) < s.width * 0.85 + p.r) {
          s.hit = true;
          this.damagePlayer(s.dmg, s.x, s.y, { knock: 280 });
        }
      }
      if (s.life <= 0 || s.r > s.maxR) this.shockwaves.splice(i, 1);
    }
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.delay > 0) {
        h.delay -= dt;
        if (h.delay <= 0) {
          h.exploded = true;
          h.life = 0.3;
          this.audio.explosion();
          this.shake(0.28);
          this.burst(h.x, h.y, '#ffb37a', 20, 260, 0.6, 'spark');
          this.burst(h.x, h.y, '#ff5c2e', 12, 120, 1.0, 'ember');
          this.addParticle({
            type: 'ring', x: h.x, y: h.y, vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4, size: 3, maxRadius: h.r * 1.3, color: 'rgba(255,140,70,0.8)',
          });
          if (dist(h.x, h.y, p.x, p.y) < h.r + p.r) {
            this.damagePlayer(14, h.x, h.y, { knock: 340 });
          }
        }
      } else {
        h.life -= dt;
        if (h.life <= 0) this.hazards.splice(i, 1);
      }
    }
  }

  updateOrbs(dt) {
    const p = this.player;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      const d = dist(o.x, o.y, p.x, p.y);
      if (d < 175) {
        const speed = 90 + (175 - d) * 2.8;
        const a = angleTo(o.x, o.y, p.x, p.y);
        o.x += Math.cos(a) * speed * dt;
        o.y += Math.sin(a) * speed * dt;
      }
      if (d < 24 && !p.dead) {
        p.hp = Math.min(p.maxHp, p.hp + 4);
        this.addText(p.x, p.y - 40, '+4', '#8fffe0', 13, false);
        this.burst(p.x, p.y, '#8fffe0', 8, 130, 0.45, 'spark');
        this.audio.pickup();
        this.orbs.splice(i, 1);
      } else if (o.life <= 0) {
        this.orbs.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const damp = Math.min(1, dt * 2.5);
      p.vx -= p.vx * damp;
      p.vy -= p.vy * damp;
      if (p.type === 'ember') p.vy -= 9 * dt;
      if (p.type === 'dust') p.vy -= 3 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - dt * 4);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  updateAmbient(dt, scale = 1) {
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 0.1 / scale;
      if (this.particles.length < 260) {
        this.spawnAmbient(false);
        if (this.boss && this.boss.phase >= 3 && Math.random() < 0.5) this.spawnAmbient(false);
      }
    }
  }

  spawnAmbient(initial) {
    const a = rand(0, TAU);
    const d = Math.sqrt(Math.random()) * (initial ? 300 : 280);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const fromEdge = d > 235;
    if (Math.random() < 0.55 || fromEdge) {
      this.addParticle({
        type: 'ember', x, y: y + rand(-10, 10),
        vx: rand(-6, 6), vy: rand(-28, -10),
        life: rand(1.4, 3.2), maxLife: 3.2,
        size: rand(0.8, 2.3),
        color: pick(['#ff8c42', '#ff5c2e', '#ffd27a']),
      });
    } else {
      this.addParticle({
        type: 'dust', x, y,
        vx: rand(-5, 5), vy: rand(-6, 2),
        life: rand(1.8, 3.5), maxLife: 3.5,
        size: rand(3, 9),
        color: 'rgba(200,140,120,0.5)',
      });
    }
  }

  /* ---------------- render ---------------- */
  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    drawBackground(ctx, this, t);

    const trauma = this.shakeEnabled ? this.shakeTrauma * this.shakeTrauma : 0;
    const ox = (Math.random() * 2 - 1) * trauma * 15;
    const oy = (Math.random() * 2 - 1) * trauma * 15;

    ctx.save();
    ctx.translate(ox, oy);
    drawFloor(ctx, this);
    ctx.restore();

    ctx.save();
    ctx.translate(this.cx + ox, this.cy + oy);
    ctx.scale(this.k, this.k);

    drawBraziers(ctx, this, t);

    if (this.state === 'title') {
      drawParticles(ctx, this);
      ctx.restore();
      drawTitleScene(ctx, this, this.titleTime);
      drawScreenFX(ctx, this, t);
      return;
    }

    drawBossTelegraphs(ctx, this.boss, t);
    drawHazards(ctx, this, t);
    drawShockwaves(ctx, this);
    drawPickups(ctx, this, t);

    for (const e of this.enemies) {
      if (e.type === 'shade') drawShade(ctx, e, t);
      else drawArcher(ctx, e, t);
    }

    if (this.boss) drawBoss(ctx, this.boss, t);
    drawPlayer(ctx, this.player, this, t);
    drawProjectiles(ctx, this, t);
    drawParticles(ctx, this);
    drawTexts(ctx, this);

    ctx.restore();
    drawScreenFX(ctx, this, t);
  }
}
