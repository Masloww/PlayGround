/**
 * Procedural audio: no external assets. Everything is synthesized with WebAudio.
 * The music is a slow, dark phrygian drone with a heartbeat that intensifies
 * as Asterión loses control.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.delay = null;
    this.noiseBuffer = null;
    this.started = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('labsangre.muted') === '1'; } catch {}
    this.intensity = 0;
    this.bpm = 76;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.drone = null;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch { return; }

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.75;
    this.sfxGain.connect(this.master);

    // Atmospheric feedback delay for bells.
    this.delay = ctx.createDelay(1.2);
    this.delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.24;
    this.delay.connect(fb);
    fb.connect(this.delay);
    this.delay.connect(wet);
    wet.connect(this.musicGain);

    this.noiseBuffer = this.makeNoise(2.2);
    this.buildDrone();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 120);
    this.started = true;
    this.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  buildDrone() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 2.5;
    filter.connect(g);
    g.connect(this.musicGain);

    const freqs = [73.42, 110, 146.83];
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.detune.value = i === 0 ? -7 : i === 1 ? 5 : 0;
      const og = ctx.createGain();
      og.gain.value = i === 2 ? 0.18 : 0.32;
      o.connect(og);
      og.connect(filter);
      o.start();
      return o;
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.drone = { g, filter, oscs, lfo };
    this.droneFilter = filter;
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('labsangre.muted', muted ? '1' : '0'); } catch {}
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  toggleMuted() { return this.setMuted(!this.muted); }

  setIntensity(level) {
    this.intensity = Math.max(0, Math.min(3, level));
    this.bpm = [70, 78, 88, 102][this.intensity];
    if (this.droneFilter) {
      const target = 180 + this.intensity * 90;
      this.droneFilter.frequency.setTargetAtTime(target, this.ctx.currentTime, 1.2);
    }
    const targetGain = [0.32, 0.48, 0.6, 0.72][this.intensity];
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 1.0);
  }

  stopMusic() {
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.8);
    this.intensity = 0;
  }

  /* ---------------- music scheduler ---------------- */
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.05;
    const stepDur = 60 / this.bpm / 2;
    while (this.nextTime < now + 0.3) {
      this.arrangeStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  arrangeStep(step, t, stepDur) {
    const level = this.intensity;
    if (level > 0) {
      // Heartbeat: low thump every half bar.
      if (step % 8 === 0 || (level >= 3 && step % 8 === 3)) {
        this.kick(t, level >= 3 ? 0.16 : 0.12);
      }
      if (level >= 2 && step % 8 === 6) this.tom(t, 98, 0.05);
      if (level >= 2 && step % 2 === 1) this.hat(t, level >= 3 ? 0.025 : 0.016);
    }
    // Sparse mournful bells.
    if (step % 16 === 0 || (level >= 3 && step % 16 === 10)) {
      const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23];
      const f = scale[(Math.random() * scale.length) | 0];
      this.bell(t, f, level === 0 ? 0.05 : 0.035);
    }
  }

  kick(t, gain) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.34);
  }

  tom(t, freq, gain) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.18);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.24);
  }

  hat(t, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t); src.stop(t + 0.06);
  }

  bell(t, freq, gain) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay);
    o.start(t); o.stop(t + 2.5);
  }

  /* ---------------- sfx helpers ---------------- */
  noiseBurst({ t = 0, dur = 0.15, freq = 1200, endFreq = 400, type = 'bandpass', gain = 0.2, q = 1.2 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  tone({ t = 0, dur = 0.2, freq = 220, endFreq = 110, type = 'sine', gain = 0.15, filter = 0 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filter;
      o.connect(f); f.connect(g);
    } else o.connect(g);
    g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }
  ready() { return !!(this.ctx && this.ctx.state === 'running' && !this.muted); }

  slash(combo = 0) {
    if (!this.ready()) return;
    const t = this.now();
    this.noiseBurst({ t, dur: 0.14, freq: 2400 + combo * 400, endFreq: 500, gain: 0.13, q: 0.9 });
    this.tone({ t, dur: 0.1, freq: 520 + combo * 90, endFreq: 260, type: 'triangle', gain: 0.045 });
  }

  hit(heavy = false) {
    if (!this.ready()) return;
    const t = this.now();
    this.noiseBurst({ t, dur: 0.1, freq: 900, endFreq: 140, gain: heavy ? 0.24 : 0.14, type: 'lowpass', q: 0.7 });
    this.tone({ t, dur: 0.12, freq: heavy ? 170 : 140, endFreq: 55, type: 'triangle', gain: heavy ? 0.16 : 0.09 });
  }

  playerHurt() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.35, freq: 190, endFreq: 55, type: 'sawtooth', gain: 0.12, filter: 500 });
    this.noiseBurst({ t, dur: 0.22, freq: 700, endFreq: 120, gain: 0.16, type: 'lowpass' });
  }

  dash() {
    if (!this.ready()) return;
    const t = this.now();
    this.noiseBurst({ t, dur: 0.24, freq: 500, endFreq: 2800, gain: 0.1, type: 'bandpass', q: 0.6 });
    this.tone({ t, dur: 0.15, freq: 300, endFreq: 640, type: 'sine', gain: 0.035 });
  }

  cast() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.24, freq: 880, endFreq: 220, type: 'sawtooth', gain: 0.07, filter: 1400 });
    this.noiseBurst({ t, dur: 0.2, freq: 3200, endFreq: 900, gain: 0.08, q: 1.6 });
  }

  pickup() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.18, freq: 620, endFreq: 940, type: 'sine', gain: 0.06 });
    this.tone({ t: t + 0.05, dur: 0.25, freq: 930, endFreq: 1240, type: 'sine', gain: 0.035 });
  }

  select() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.4, freq: 392, endFreq: 523, type: 'triangle', gain: 0.06 });
    this.tone({ t: t + 0.08, dur: 0.5, freq: 587, endFreq: 784, type: 'sine', gain: 0.04 });
  }

  heavyStep() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.16, freq: 80, endFreq: 40, type: 'sine', gain: 0.09 });
  }

  charge() {
    if (!this.ready()) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 340;
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 0.75);
    this.noiseBurst({ t, dur: 0.7, freq: 200, endFreq: 1200, gain: 0.05, type: 'bandpass', q: 0.5 });
  }

  bossRoar() {
    if (!this.ready()) return;
    const t = this.now();
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      const base = [72, 108, 144][i];
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 0.52, t + 1.2);
      o.detune.value = (i - 1) * 14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime([0.1, 0.06, 0.035][i], t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(220, t + 1.2);
      o.connect(f); f.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 1.4);
    }
    this.noiseBurst({ t, dur: 1.1, freq: 500, endFreq: 120, gain: 0.13, type: 'lowpass' });
  }

  slam() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.7, freq: 95, endFreq: 25, type: 'sine', gain: 0.3 });
    this.noiseBurst({ t, dur: 0.55, freq: 700, endFreq: 80, gain: 0.2, type: 'lowpass' });
  }

  explosion() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.45, freq: 130, endFreq: 35, type: 'triangle', gain: 0.18 });
    this.noiseBurst({ t, dur: 0.35, freq: 1600, endFreq: 160, gain: 0.15, type: 'lowpass', q: 0.6 });
  }

  waveStart() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.7, freq: 146.83, endFreq: 146.83, type: 'sawtooth', gain: 0.045, filter: 420 });
    this.tone({ t: t + 0.15, dur: 0.9, freq: 220, endFreq: 220, type: 'triangle', gain: 0.04 });
    this.noiseBurst({ t, dur: 0.6, freq: 400, endFreq: 1000, gain: 0.04 });
  }

  death() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 1.6, freq: 220, endFreq: 45, type: 'sawtooth', gain: 0.12, filter: 500 });
    this.tone({ t: t + 0.1, dur: 1.4, freq: 164, endFreq: 41, type: 'triangle', gain: 0.08 });
  }

  victory() {
    if (!this.ready()) return;
    const t = this.now();
    const notes = [146.83, 220, 293.66, 349.23, 440, 587.33];
    notes.forEach((f, i) => {
      this.tone({ t: t + i * 0.13, dur: 1.8, freq: f, endFreq: f, type: 'triangle', gain: 0.05 });
      this.tone({ t: t + i * 0.13, dur: 1.2, freq: f * 2, endFreq: f * 2, type: 'sine', gain: 0.025 });
    });
    this.noiseBurst({ t, dur: 1.2, freq: 1200, endFreq: 3000, gain: 0.05 });
  }

  phase() {
    if (!this.ready()) return;
    const t = this.now();
    this.tone({ t, dur: 0.6, freq: 98, endFreq: 196, type: 'sawtooth', gain: 0.08, filter: 700 });
    this.tone({ t: t + 0.08, dur: 0.8, freq: 147, endFreq: 294, type: 'triangle', gain: 0.05 });
  }
}
