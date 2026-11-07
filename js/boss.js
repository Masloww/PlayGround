import { TAU, clamp, dist, angleTo, rand, angleDiff, easeOutCubic, randInt } from './util.js';

/**
 * ASTERIÓN — El Toro del Laberinto.
 * Three phases, telegraphed attacks, a punishable wall charge and summoned shades.
 */
export class Boss {
  constructor(game) {
    this.game = game;
    this.x = 0;
    this.y = -330;
    this.r = 60;
    this.maxHp = 1250;
    this.hp = this.maxHp;
    this.phase = 1;
    this.state = 'intro';
    this.timer = 3.0;
    this.maxTimer = 3.0;
    this.angle = Math.PI / 2;
    this.aim = Math.PI / 2;
    this.dir = Math.PI / 2;
    this.target = { x: 0, y: 0 };
    this.airZ = 0;
    this.flash = 0;
    this.invuln = true;
    this.contactCd = 0;
    this.pendingPhase = 0;
    this.deadTime = 0;
    this.deathReported = false;
    this.hasHit = false;
    this.lastAttack = '';
    this.attackCount = 0;
    this.introStart = -330;
    this.introEnd = -120;
    this.hitFlash = 0;
    this.queuedPillars = [];
  }

  get phaseSpeed() { return 1 + (this.phase - 1) * 0.18; }
  get windMul() { return this.phase === 3 ? 0.82 : this.phase === 2 ? 0.92 : 1; }

  setState(state, time = 0) {
    this.state = state;
    this.timer = time;
    this.maxTimer = Math.max(0.0001, time);
    this.airZ = 0;
    this.hasHit = false;

    if (state === 'chargeWind') {
      this.dir = angleTo(this.x, this.y, this.game.player.x, this.game.player.y);
      this.angle = this.dir;
      this.game.audio.charge();
      this.game.burst(this.x, this.y - 10, '#ff8c42', 10, 110, 0.6, 'ember');
    } else if (state === 'charge') {
      this.game.audio.bossRoar();
      this.game.shake(0.22);
    } else if (state === 'slamRise') {
      const p = this.game.player;
      this.target.x = clamp(p.x, -180, 180);
      this.target.y = clamp(p.y, -180, 180);
      this.aim = angleTo(this.x, this.y, this.target.x, this.target.y);
      this.angle = this.aim;
    } else if (state === 'slamLand') {
      this.landSlam();
    } else if (state === 'sweepWind') {
      this.aim = angleTo(this.x, this.y, this.game.player.x, this.game.player.y);
      this.angle = this.aim;
    } else if (state === 'sweep') {
      this.game.audio.slash(2);
      this.game.hitStop(0.03);
    } else if (state === 'summon') {
      this.game.audio.bossRoar();
      this.game.shake(0.3);
      this.summonAdds();
    } else if (state === 'pillars') {
      this.queuedPillars = [0.32, 1.02, 1.72];
      this.game.audio.charge();
    } else if (state === 'roar') {
      this.invuln = true;
      this.game.audio.bossRoar();
      this.game.shake(0.75);
      this.game.addShockwave(this.x, this.y, { speed: 520, maxR: 350, dmg: 10, width: 22, color: '#ff7a4a' });
      this.game.burst(this.x, this.y, '#ff5c2e', 26, 300, 1.0, 'ember');
      this.game.flashScreen('#ff3a2a', 0.25);
      this.queuedPillars = [];
    } else if (state === 'stunned') {
      this.game.audio.slam();
      this.game.shake(0.6);
      this.game.hitStop(0.06);
    }
  }

  update(dt) {
    if (!this.game || this.state === 'dead') {
      if (this.state === 'dead') this.updateDead(dt);
      return;
    }
    this.flash = Math.max(0, this.flash - dt * 5);
    this.contactCd = Math.max(0, this.contactCd - dt);

    const p = this.game.player;

    if (this.pendingPhase && this.state !== 'roar' && this.state !== 'stunned') {
      this.startRoar();
    }

    switch (this.state) {
      case 'intro': {
        this.timer -= dt;
        const t = clamp(1 - this.timer / this.maxTimer, 0, 1);
        this.y = this.introStart + (this.introEnd - this.introStart) * easeOutCubic(t);
        this.angle = Math.PI / 2;
        this.aim = this.angle;
        if (this.timer <= 0) {
          this.invuln = false;
          this.setState('idle', 0.6);
        }
        break;
      }
      case 'idle': {
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        this.aim = this.angle;
        const d = dist(this.x, this.y, p.x, p.y);
        const spd = 72 * this.phaseSpeed;
        if (d > 140) {
          this.x += Math.cos(this.angle) * spd * dt;
          this.y += Math.sin(this.angle) * spd * dt;
        } else if (d < 95) {
          this.x -= Math.cos(this.angle) * spd * 0.6 * dt;
          this.y -= Math.sin(this.angle) * spd * 0.6 * dt;
        } else {
          this.x += Math.cos(this.angle + Math.PI / 2) * spd * 0.35 * dt;
          this.y += Math.sin(this.angle + Math.PI / 2) * spd * 0.35 * dt;
        }
        this.clampInside();
        this.contactDamage(dt);
        this.timer -= dt;
        if (this.timer <= 0) this.chooseAttack();
        break;
      }
      case 'chargeWind': {
        this.timer -= dt;
        if (this.timer > this.maxTimer * 0.42) {
          this.dir = angleTo(this.x, this.y, p.x, p.y);
        }
        this.angle = this.dir;
        this.aim = this.dir;
        if (Math.random() < dt * 22) {
          this.game.burst(this.x + rand(-30, 30), this.y + rand(-20, 20), '#ff8c42', 1, 60, 0.5, 'ember');
        }
        if (this.timer <= 0) this.setState('charge', 0.95);
        break;
      }
      case 'charge': {
        this.timer -= dt;
        const spd = 760 * this.phaseSpeed;
        this.x += Math.cos(this.dir) * spd * dt;
        this.y += Math.sin(this.dir) * spd * dt;
        this.angle = this.dir;
        if (Math.random() < dt * 45) {
          this.game.burst(this.x - Math.cos(this.dir) * 40, this.y - Math.sin(this.dir) * 40, '#9a6a54', 1, 40, 0.7, 'dust');
        }
        if (!this.hasHit && dist(this.x, this.y, p.x, p.y) < this.r + p.r + 10) {
          this.hasHit = true;
          this.game.damagePlayer(22, this.x, this.y, { knock: 460 });
          this.game.burst(p.x, p.y, '#ff4961', 16, 260, 0.7, 'spark');
        }
        const d = Math.hypot(this.x, this.y);
        if (d > 300 - this.r) {
          this.x = (this.x / d) * (300 - this.r);
          this.y = (this.y / d) * (300 - this.r);
          this.game.addShockwave(this.x, this.y, { speed: 440, maxR: 300, dmg: 12, width: 18 });
          this.game.burst(this.x, this.y, '#ffb37a', 26, 280, 0.9, 'spark');
          this.game.burst(this.x, this.y, '#7a5a4a', 14, 120, 1.1, 'dust');
          this.game.hitStop(0.07);
          this.game.shake(0.8);
          this.game.flashScreen('#ffd7b0', 0.16);
          this.setState('stunned', 1.7);
        } else if (this.timer <= 0) {
          this.setState('idle', 0.5);
        }
        break;
      }
      case 'stunned': {
        this.timer -= dt;
        this.contactDamage(dt);
        if (Math.random() < dt * 12) {
          this.game.burst(this.x + rand(-40, 40), this.y + rand(-20, 10), '#ffd27a', 1, 30, 0.5, 'ember');
        }
        if (this.timer <= 0) {
          this.setState('idle', 0.45);
        }
        break;
      }
      case 'slamRise': {
        this.timer -= dt;
        if (this.timer <= 0) this.setState('slamAir', 0.36);
        break;
      }
      case 'slamAir': {
        this.timer -= dt;
        const t = clamp(1 - this.timer / this.maxTimer, 0, 1);
        this.airZ = Math.sin(t * Math.PI) * 82;
        this.x = this.target.x;
        this.y = this.target.y;
        if (this.timer <= 0) {
          this.airZ = 0;
          this.setState('slamLand', 0.55);
        }
        break;
      }
      case 'slamLand': {
        this.timer -= dt;
        this.contactDamage(dt);
        if (this.timer <= 0) this.setState('idle', 0.55);
        break;
      }
      case 'sweepWind': {
        this.timer -= dt;
        this.angle = this.aim;
        if (this.timer <= 0) this.setState('sweep', 0.28);
        break;
      }
      case 'sweep': {
        this.timer -= dt;
        this.angle = this.aim;
        if (!this.hasHit) {
          const d = dist(this.x, this.y, p.x, p.y);
          const ad = Math.abs(angleDiff(this.aim, angleTo(this.x, this.y, p.x, p.y)));
          if (d < 218 && ad < 1.18) {
            this.hasHit = true;
            this.game.damagePlayer(20, this.x, this.y, { knock: 380 });
            this.game.burst(p.x, p.y, '#ff8c5a', 18, 260, 0.6, 'spark');
          }
        }
        if (this.timer <= 0) {
          // Fissures erupt from the arena floor.
          const base = angleTo(this.x, this.y, p.x, p.y);
          for (let i = -1; i <= 1; i++) {
            this.game.spawnProjectile({
              kind: 'fissure',
              x: this.x + Math.cos(this.aim) * 30,
              y: this.y + Math.sin(this.aim) * 30,
              angle: base + i * 0.36,
              speed: 400,
              r: 13,
              dmg: 12,
              life: 1.1,
              fromBoss: true,
            });
          }
          this.game.addShockwave(this.x, this.y, { speed: 380, maxR: 220, dmg: 8, width: 14, color: '#ff7a4a' });
          this.setState('sweepRec', 0.45);
        }
        break;
      }
      case 'sweepRec': {
        this.timer -= dt;
        if (this.timer <= 0) this.setState('idle', 0.4);
        break;
      }
      case 'summon': {
        this.timer -= dt;
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        if (this.timer <= 0) this.setState('idle', 0.5);
        break;
      }
      case 'pillars': {
        this.timer -= dt;
        const elapsed = this.maxTimer - this.timer;
        while (this.queuedPillars.length && elapsed >= this.queuedPillars[0]) {
          this.queuedPillars.shift();
          this.spawnPillars();
        }
        if (Math.random() < dt * 14) {
          this.game.burst(this.x, this.y - 20, '#ff5c2e', 1, 80, 0.6, 'ember');
        }
        if (this.timer <= 0) this.setState('idle', 0.4);
        break;
      }
      case 'roar': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.invuln = false;
          this.setState('idle', 0.25);
        }
        break;
      }
      default: {
        this.setState('idle', 0.5);
      }
    }
  }

  updateDead(dt) {
    this.deadTime += dt;
    this.flash = Math.max(0, this.flash - dt * 2);
    if (Math.random() < dt * 24) {
      this.game.burst(this.x + rand(-55, 55), this.y + rand(-45, 30), '#ff8c42', 1, 80, 1.2, 'ember');
    }
    if (this.deadTime > 1.15 && !this.deathReported) {
      this.deathReported = true;
      this.game.onBossDefeated();
    }
  }

  chooseAttack() {
    const options = [
      { name: 'charge', w: 3.0 },
      { name: 'slam', w: 3.0 },
      { name: 'sweep', w: 2.6 },
    ];
    if (this.phase >= 2 && this.game.enemies.length < 4) options.push({ name: 'summon', w: 1.6 });
    if (this.phase >= 3) options.push({ name: 'pillars', w: 2.2 });
    for (const o of options) {
      if (o.name === this.lastAttack) o.w *= 0.35;
    }
    const total = options.reduce((s, o) => s + o.w, 0);
    let roll = Math.random() * total;
    let chosen = options[0].name;
    for (const o of options) {
      roll -= o.w;
      if (roll <= 0) { chosen = o.name; break; }
    }
    this.lastAttack = chosen;
    this.attackCount++;
    const wind = this.windMul;
    if (chosen === 'charge') this.setState('chargeWind', 0.7 * wind);
    else if (chosen === 'slam') this.setState('slamRise', 0.55 * wind);
    else if (chosen === 'sweep') this.setState('sweepWind', 0.78 * wind);
    else if (chosen === 'summon') this.setState('summon', 1.05);
    else if (chosen === 'pillars') this.setState('pillars', 2.35);
    else this.setState('idle', 0.5);
  }

  startRoar() {
    this.phase = this.pendingPhase;
    this.pendingPhase = 0;
    this.airZ = 0;
    this.setState('roar', 1.15);
    this.game.onBossPhase(this.phase);
  }

  landSlam() {
    this.game.shake(0.95);
    this.game.hitStop(0.07);
    this.game.audio.slam();
    this.game.flashScreen('#ff9a6a', 0.14);
    this.game.burst(this.target.x, this.target.y, '#ffb37a', 34, 380, 0.9, 'spark');
    this.game.burst(this.target.x, this.target.y, '#8a5a44', 22, 160, 1.2, 'dust');
    this.game.addShockwave(this.target.x, this.target.y, { speed: 480, maxR: 350, dmg: 15, width: 20 });
    const p = this.game.player;
    if (dist(this.target.x, this.target.y, p.x, p.y) < 133 + p.r) {
      this.game.damagePlayer(24, this.target.x, this.target.y, { knock: 480 });
    }
  }

  summonAdds() {
    const count = this.phase >= 3 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const d = 130 + rand(0, 110);
      const x = clamp(this.x + Math.cos(a) * d, -240, 240);
      const y = clamp(this.y + Math.sin(a) * d, -240, 240);
      this.game.spawnEnemy('shade', x, y);
    }
  }

  spawnPillars() {
    const p = this.game.player;
    for (let i = 0; i < 2; i++) {
      const ox = i === 0 ? 0 : rand(-70, 70);
      const oy = i === 0 ? 0 : rand(-70, 70);
      const x = clamp(p.x + ox, -270, 270);
      const y = clamp(p.y + oy, -270, 270);
      this.game.spawnHazard(x, y, 54, 0.75);
    }
  }

  contactDamage() {
    if (this.contactCd > 0 || this.state === 'charge' || this.state === 'intro' || this.state === 'dead') return;
    const p = this.game.player;
    if (dist(this.x, this.y, p.x, p.y) < this.r + p.r - 4) {
      this.contactCd = 0.85;
      this.game.damagePlayer(10, this.x, this.y, { knock: 300 });
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

  takeDamage(amount, { crit = false, stunBonus = false } = {}) {
    if (this.state === 'dead' || this.invuln) return 0;
    const mult = stunBonus ? 1.55 : 1;
    const dmg = Math.round(amount * mult);
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 0.55;
    this.game.stats.damage += dmg;
    this.game.addText(this.x + rand(-25, 25), this.y - 55 - rand(0, 18), `${dmg}`, crit ? '#ffe0a3' : '#ffd4c4', crit ? 25 : 18, crit);
    this.game.burst(this.x + rand(-30, 30), this.y + rand(-30, 20), crit ? '#ffe0a3' : '#ff8c6a', crit ? 12 : 6, 170, 0.5, 'spark');
    this.game.audio.hit(crit);
    this.game.hitStop(crit ? 0.07 : 0.035);
    this.game.shake(crit ? 0.26 : 0.12);

    if (this.hp <= 0) {
      this.die();
      return dmg;
    }
    if (this.hp <= this.maxHp * 0.6 && this.phase < 2) this.pendingPhase = 2;
    else if (this.hp <= this.maxHp * 0.3 && this.phase < 3) this.pendingPhase = 3;
    return dmg;
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deadTime = 0;
    this.airZ = 0;
    this.invuln = true;
    this.queuedPillars = [];
    this.game.hitStop(0.15);
    this.game.shake(1.2);
    this.game.flashScreen('#ffe0a3', 0.5);
    this.game.audio.bossRoar();
    this.game.audio.slam();
    this.game.burst(this.x, this.y, '#ffe0a3', 60, 420, 1.4, 'spark');
    this.game.burst(this.x, this.y, '#ff5c2e', 50, 280, 1.8, 'ember');
    this.game.addShockwave(this.x, this.y, { speed: 300, maxR: 500, dmg: 0, width: 34, color: '#ffe0a3' });
  }
}
