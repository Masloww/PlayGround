import { formatTime } from './util.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'),
      title: $('title-screen'),
      bossHud: $('boss-hud'),
      bossFill: $('boss-fill'),
      bossFrost: $('boss-frost'),
      bossPhase: $('boss-phase'),
      waveChip: $('wave-chip'),
      hpFill: $('hp-fill'),
      hpGhost: $('hp-ghost'),
      hpText: $('hp-text'),
      dashPips: $('dash-pips'),
      specialCd: $('special-cd'),
      boonList: $('boon-list'),
      banner: $('banner'),
      bannerMain: $('banner-main'),
      bannerSub: $('banner-sub'),
      toast: $('toast'),
      controlHint: $('control-hint'),
      boonScreen: $('boon-screen'),
      boonEyebrow: $('boon-eyebrow'),
      boonTitle: $('boon-title'),
      boonSub: $('boon-sub'),
      boonCards: $('boon-cards'),
      bossIntro: $('boss-intro'),
      pause: $('pause-screen'),
      end: $('end-screen'),
      endPanel: document.querySelector('#end-screen .end-panel'),
      endEyebrow: $('end-eyebrow'),
      endTitle: $('end-title'),
      endText: $('end-text'),
      statTime: $('stat-time'),
      statDamage: $('stat-damage'),
      statPhase: $('stat-phase'),
      btnAgain: $('btn-again'),
      muteBtn: $('mute-btn'),
      btnSound: $('btn-sound'),
      btnShake: $('btn-shake'),
    };
    this.lastHp = -1;
    this.lastDash = -1;
    this.lastSpecial = -1;
    this.lastBossHp = -1;
    this.lastBossPhase = 0;
    this.bannerTimer = null;
    this.toastTimer = null;
    this.introTimer = null;
    this.hintTimer = null;
  }

  showTitle() {
    this.el.title.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.boonScreen.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.end.classList.add('hidden');
    this.el.bossIntro.classList.remove('show');
    this.el.bossIntro.classList.add('hidden');
    this.el.bossHud.classList.remove('visible');
    this.el.bossHud.classList.add('hidden');
  }

  hideTitle() {
    this.el.title.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    if (this.el.controlHint) {
      this.el.controlHint.classList.remove('fade');
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => this.el.controlHint.classList.add('fade'), 9000);
    }
  }

  setHudVisible(v) {
    this.el.hud.classList.toggle('hidden', !v);
  }

  clearCombatUI() {
    this.el.boonList.innerHTML = '';
    this.el.bossHud.classList.add('hidden');
    this.el.bossHud.classList.remove('visible', 'phase-2', 'phase-3');
    this.el.waveChip.classList.remove('visible');
    this.el.banner.classList.remove('show');
    this.el.toast.classList.remove('show');
    this.el.boonScreen.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.end.classList.add('hidden');
    this.el.bossIntro.classList.remove('show');
    this.el.bossIntro.classList.add('hidden');
    this.el.endPanel.classList.remove('lost', 'won');
    this.lastHp = this.lastDash = this.lastSpecial = this.lastBossHp = -1;
    this.lastBossPhase = 0;
  }

  updatePlayer(p) {
    if (!p) return;
    const pct = Math.max(0, Math.min(1, p.hp / p.maxHp));
    const hpWidth = (pct * 100).toFixed(1) + '%';
    if (hpWidth !== this.lastHp) {
      this.el.hpFill.style.width = hpWidth;
      this.el.hpGhost.style.width = hpWidth;
      this.el.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;
      this.lastHp = hpWidth;
    }
    if (p.dashMax !== this.lastDash) {
      let html = '';
      for (let i = 0; i < p.dashMax; i++) html += '<span class="pip"></span>';
      this.el.dashPips.innerHTML = html;
      this.lastDash = p.dashMax;
    }
    const pips = this.el.dashPips.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('on', i < p.dashCharges);
    }
    const cd = p.specialCd > 0 ? p.specialCd / p.specialMax : 0;
    const cdRounded = Math.round(cd * 20);
    if (cdRounded !== this.lastSpecial) {
      this.el.specialCd.style.transform = `scaleY(${cd})`;
      this.lastSpecial = cdRounded;
    }
  }

  showBossBar(show) {
    this.el.bossHud.classList.toggle('hidden', !show);
    this.el.bossHud.classList.toggle('visible', show);
  }

  updateBoss(boss) {
    if (!boss) return;
    const pct = Math.max(0, boss.hp / boss.maxHp) * 100;
    const w = pct.toFixed(1) + '%';
    if (w !== this.lastBossHp) {
      this.el.bossFill.style.width = w;
      this.lastBossHp = w;
    }
    if (boss.phase !== this.lastBossPhase) {
      this.el.bossPhase.textContent = ['FASE I', 'FASE II', 'FASE III'][boss.phase - 1] || 'FASE I';
      this.el.bossHud.classList.toggle('phase-2', boss.phase === 2);
      this.el.bossHud.classList.toggle('phase-3', boss.phase >= 3);
      this.lastBossPhase = boss.phase;
    }
  }

  setWaveLabel(text) {
    this.el.waveChip.textContent = text;
    this.el.waveChip.classList.toggle('visible', !!text);
  }

  banner(sub, main, duration = 1500) {
    const b = this.el.banner;
    this.el.bannerSub.textContent = sub || '';
    this.el.bannerMain.textContent = main || '';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), duration);
  }

  toast(text, duration = 2200) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  }

  showBoons(choices, { eyebrow, title, sub }, onPick) {
    this.el.boonEyebrow.textContent = eyebrow;
    this.el.boonTitle.textContent = title;
    this.el.boonSub.textContent = sub;
    this.el.boonCards.innerHTML = '';
    choices.forEach((b, i) => {
      const card = document.createElement('button');
      card.className = 'boon-card';
      card.type = 'button';
      card.innerHTML = `
        <span class="boon-key">${i + 1}</span>
        <span class="boon-icon"><span>${b.icon}</span></span>
        <span class="boon-name">${b.name}</span>
        <span class="boon-desc">${b.desc}</span>
        <span class="boon-flavor">${b.flavor}</span>
      `;
      card.addEventListener('click', () => onPick(i), { once: true });
      this.el.boonCards.appendChild(card);
    });
    this.el.boonScreen.classList.remove('hidden');
    this.el.boonScreen.style.animation = 'none';
    void this.el.boonScreen.offsetWidth;
    this.el.boonScreen.style.animation = '';
  }

  hideBoons() {
    this.el.boonScreen.classList.add('hidden');
  }

  addBoonTag(boon) {
    const tag = document.createElement('span');
    tag.className = 'boon-tag';
    tag.innerHTML = `<i>${boon.icon}</i>${boon.short || boon.name}`;
    this.el.boonList.appendChild(tag);
  }

  clearBoonTags() {
    this.el.boonList.innerHTML = '';
  }

  showBossIntro() {
    this.el.bossIntro.classList.remove('hidden');
    this.el.bossIntro.classList.add('show');
    this.el.bossHud.classList.remove('hidden');
    this.el.bossHud.classList.add('visible');
    this.el.bossHud.classList.remove('phase-2', 'phase-3');
  }

  hideBossIntro() {
    this.el.bossIntro.classList.remove('show');
    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(() => this.el.bossIntro.classList.add('hidden'), 420);
  }

  showPause() {
    this.el.pause.classList.remove('hidden');
  }

  hidePause() {
    this.el.pause.classList.add('hidden');
  }

  showEnd(victory, stats) {
    this.el.end.classList.remove('hidden');
    this.el.endPanel.classList.remove('lost', 'won');
    this.el.endPanel.classList.add(victory ? 'won' : 'lost');
    if (victory) {
      this.el.endEyebrow.textContent = 'El laberinto se inclina';
      this.el.endTitle.textContent = 'Asterión ha caído';
      this.el.endText.textContent = 'La puerta se abre entre ceniza y sangre. Por ahora, el inframundo te deja pasar.';
      this.el.btnAgain.textContent = 'Descender de nuevo';
    } else {
      this.el.endEyebrow.textContent = 'El laberinto reclama otro nombre';
      this.el.endTitle.textContent = 'Has caído';
      this.el.endText.textContent = 'Pero la sangre recuerda. Aprende el ritmo de sus cuernos y vuelve a levantarte.';
      this.el.btnAgain.textContent = 'Volver a intentarlo';
    }
    this.el.statTime.textContent = formatTime(stats.time);
    this.el.statDamage.textContent = Math.round(stats.damage).toLocaleString('es-ES');
    const phase = stats.phase >= 1 ? ['I', 'II', 'III'][Math.min(3, stats.phase) - 1] : '—';
    this.el.statPhase.textContent = stats.phase ? `Fase ${phase}` : '—';
  }

  hideEnd() {
    this.el.end.classList.add('hidden');
  }

  setMuted(muted) {
    this.el.muteBtn.classList.toggle('muted', muted);
    this.el.btnSound.innerHTML = `Sonido: <strong>${muted ? 'silenciado' : 'activado'}</strong>`;
  }

  setShakeEnabled(enabled) {
    this.el.btnShake.innerHTML = `Sacudida: <strong>${enabled ? 'activada' : 'desactivada'}</strong>`;
  }
}
