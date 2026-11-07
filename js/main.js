import { AudioSystem } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');

// Pick the touch layout before measuring the arena.
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
if (coarse || (hasTouch && window.innerWidth < 1100)) {
  document.body.classList.add('touch');
}

const audio = new AudioSystem();
const ui = new UI();
const input = new Input(canvas, {
  onMute: () => {
    const muted = audio.toggleMuted();
    ui.setMuted(muted);
    if (!muted) {
      audio.init();
      audio.resume();
    }
  },
});
const game = new Game(canvas, audio, input, ui);

ui.setMuted(audio.muted);
ui.setShakeEnabled(true);
game.showTitle();
window.__game = game;
window.__audio = audio;

document.getElementById('btn-run').addEventListener('click', () => game.start('waves'));
document.getElementById('btn-boss').addEventListener('click', () => game.start('boss'));

document.getElementById('pause-btn').addEventListener('click', () => game.pause());
document.getElementById('btn-resume').addEventListener('click', () => game.resume());
document.getElementById('btn-restart').addEventListener('click', () => game.restart());
document.getElementById('btn-title').addEventListener('click', () => game.toTitle());

document.getElementById('mute-btn').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  ui.setMuted(muted);
});
document.getElementById('btn-sound').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  ui.setMuted(muted);
});
document.getElementById('btn-shake').addEventListener('click', () => game.toggleShake());

document.getElementById('btn-again').addEventListener('click', () => game.restart());
document.getElementById('btn-end-title').addEventListener('click', () => game.toTitle());

window.addEventListener('keydown', (e) => {
  if (game.state === 'boon') {
    const map = { Digit1: 0, Numpad1: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2 };
    if (e.code in map) {
      e.preventDefault();
      game.chooseBoon(map[e.code]);
    }
  }
});

// Audio must begin from a user gesture.
const unlock = () => {
  audio.init();
  audio.resume();
};
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.state === 'playing' || game.state === 'bossIntro')) game.pause();
});

// Late touch detection (some browsers report it only after the first tap).
window.addEventListener('touchstart', () => {
  if (!document.body.classList.contains('touch')) {
    document.body.classList.add('touch');
    game.resize();
  }
}, { once: true, passive: true });

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  try {
    while (acc >= STEP && steps < 10) {
      game.update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 10) acc = 0;
    game.render();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
