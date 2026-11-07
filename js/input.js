export class Input {
  constructor(canvas, { onPause, onMute } = {}) {
    this.canvas = canvas;
    this.onPause = onPause;
    this.onMute = onMute;

    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false, id: null };
    this.joyCenter = { x: 0, y: 0 };
    this.joyRadius = 44;

    this.attackHeld = false;
    this.attackByPointer = false;
    this.dashQueued = false;
    this.specialQueued = false;
    this.pauseQueued = false;

    this.mouse = { x: 0, y: 0, inside: false, lastMove: -999 };
    this.aimActive = false;
    this.time = 0;

    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  bindKeyboard() {
    const movement = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    ]);
    window.addEventListener('keydown', (e) => {
      if (movement.has(e.code)) {
        this.keys.add(e.code);
        e.preventDefault();
      }
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyJ':
        case 'KeyZ':
          this.attackHeld = true;
          break;
        case 'Space':
          this.dashQueued = true;
          e.preventDefault();
          break;
        case 'KeyK':
        case 'KeyX':
          this.specialQueued = true;
          break;
        case 'Escape':
        case 'KeyP':
          this.pauseQueued = true;
          break;
        case 'KeyM':
          this.onMute?.();
          break;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (movement.has(e.code)) this.keys.delete(e.code);
      if (e.code === 'KeyJ' || e.code === 'KeyZ') {
        this.attackHeld = this.attackByPointer;
      }
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.attackHeld = false;
      this.attackByPointer = false;
    });
  }

  bindMouse() {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = this.canvas.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      if (Math.abs(nx - this.mouse.x) + Math.abs(ny - this.mouse.y) > 2) {
        this.mouse.lastMove = this.time;
        this.aimActive = true;
      }
      this.mouse.x = nx;
      this.mouse.y = ny;
      this.mouse.inside = nx >= 0 && ny >= 0 && nx <= r.width && ny <= r.height;
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) {
        this.attackHeld = true;
        this.attackByPointer = true;
      } else if (e.button === 2) {
        this.specialQueued = true;
        e.preventDefault();
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0 && this.attackByPointer) {
        this.attackHeld = false;
        this.attackByPointer = false;
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('pointerleave', () => { this.mouse.inside = false; });
  }

  bindTouch() {
    const joy = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (joy && knob) {
      const moveKnob = (x, y) => {
        const dx = x - this.joyCenter.x;
        const dy = y - this.joyCenter.y;
        const d = Math.hypot(dx, dy);
        const max = this.joyRadius;
        const k = d > max ? max / d : 1;
        const kx = dx * k, ky = dy * k;
        knob.style.transform = `translate(${kx}px,${ky}px)`;
        this.joy.x = kx / max;
        this.joy.y = ky / max;
      };
      const start = (e) => {
        e.preventDefault();
        if (this.joy.id !== null) return;
        this.joy.id = e.pointerId;
        this.joy.active = true;
        const r = joy.getBoundingClientRect();
        this.joyCenter.x = r.left + r.width / 2;
        this.joyCenter.y = r.top + r.height / 2;
        this.joyRadius = r.width * 0.33;
        joy.setPointerCapture(e.pointerId);
        moveKnob(e.clientX, e.clientY);
        joy.classList.add('active');
      };
      const move = (e) => {
        if (e.pointerId !== this.joy.id) return;
        e.preventDefault();
        moveKnob(e.clientX, e.clientY);
      };
      const end = (e) => {
        if (e.pointerId !== this.joy.id) return;
        this.joy.id = null;
        this.joy.active = false;
        this.joy.x = 0;
        this.joy.y = 0;
        knob.style.transform = 'translate(0,0)';
        joy.classList.remove('active');
      };
      joy.addEventListener('pointerdown', start);
      joy.addEventListener('pointermove', move);
      joy.addEventListener('pointerup', end);
      joy.addEventListener('pointercancel', end);
      joy.addEventListener('lostpointercapture', end);
    }

    document.querySelectorAll('[data-action]').forEach((btn) => {
      const action = btn.dataset.action;
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');
        if (action === 'attack') this.attackHeld = true;
        else if (action === 'dash') this.dashQueued = true;
        else if (action === 'special') this.specialQueued = true;
        try { btn.setPointerCapture(e.pointerId); } catch {}
      };
      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (action === 'attack') this.attackHeld = false;
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
    });
  }

  update(dt) {
    this.time += dt;
    if (this.aimActive && this.time - this.mouse.lastMove > 3.5) this.aimActive = false;
    if (!this.joy.active) {
      this.joy.x = 0;
      this.joy.y = 0;
    }
  }

  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    x += this.joy.x;
    y += this.joy.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, len: Math.min(1, l) };
  }

  consumeDash() {
    const v = this.dashQueued;
    this.dashQueued = false;
    return v;
  }

  consumeSpecial() {
    const v = this.specialQueued;
    this.specialQueued = false;
    return v;
  }

  consumePause() {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  clear() {
    this.keys.clear();
    this.attackHeld = false;
    this.attackByPointer = false;
    this.dashQueued = false;
    this.specialQueued = false;
    this.pauseQueued = false;
  }
}
