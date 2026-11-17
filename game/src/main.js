// Starfall Shield — the wiring: the canvas, the loop, the screens, and the
// screenshot mode (?shot=start|play|storm|over&seed=N), which stages one scene
// and draws a single frame for the camera.
import { FIELD, STEP, CENTER } from './config.js';
import {
  createWorld, resetWorld, step, startWave,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER,
} from './world.js';
import { draw } from './render.js';
import { createInput, mouseAngle } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

const input = createInput(canvas);
const sfx = createAudio();

let best = 0;
try {
  best = Number(localStorage.getItem('starfall-shield-best') || 0) || 0;
} catch {
  best = 0;
}

const world = createWorld(seed);
world.best = best;

function saveBest() {
  try {
    localStorage.setItem('starfall-shield-best', String(world.best));
  } catch {
    // Best score is a nicety; the game plays fine without it.
  }
}

function playEvents(events) {
  for (const event of events) {
    if (event === 'deflect') sfx.deflect(world.combo);
    else if (event === 'clank') sfx.clank();
    else if (event === 'impact') sfx.impact();
    else if (event === 'dust') sfx.dust();
    else if (event === 'powerup') sfx.powerup();
    else if (event === 'dash') sfx.dash();
    else if (event === 'waveclear') sfx.waveClear();
    else if (event === 'gameover') sfx.gameOver();
    else if (event === 'wavestart') sfx.click();
  }
}

function startGame() {
  resetWorld(world, (Date.now() % 2147483647) || 1, world.best);
  world.ambient = false;
  world.screen = SCREEN_PLAY;
  startWave(world);
  sfx.unlock();
  sfx.click();
}

if (shotName) {
  // Screenshot mode: one staged frame, then stop. The camera reads
  // window.__shotDone to know the frame is ready.
  const staged = stageShot(shotName, world, seed);
  world.screen = staged.screen;
  draw(ctx, world);
  window.__shotDone = true;
} else {
  // A handle for play-testing and debugging; the game itself never reads it.
  window.__game = world;
  let last = performance.now();
  let acc = 0;
  let statusTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    // One-shot actions.
    if (input.muteQueued) {
      input.muteQueued = false;
      sfx.toggleMute();
    }
    if (input.startQueued) {
      input.startQueued = false;
      if (world.screen === SCREEN_TITLE) startGame();
      else if (world.screen === SCREEN_OVER) startGame();
    }
    if (input.restartQueued) {
      input.restartQueued = false;
      if (world.screen === SCREEN_PLAY || world.screen === SCREEN_OVER) startGame();
    }
    if (input.pauseQueued) {
      input.pauseQueued = false;
      if (world.screen === SCREEN_PLAY) world.paused = !world.paused;
    }

    if (!world.paused) {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        const turn = (input.left ? -1 : 0) + (input.right ? 1 : 0);
        const angle = mouseAngle(input, CENTER.x, CENTER.y);
        const dash = input.dashQueued;
        input.dashQueued = false;
        const events = step(world, { angle, turn, dash }, STEP);
        playEvents(events);
        if (events.includes('gameover')) saveBest();
      }
    }

    draw(ctx, world);

    statusTimer += dt;
    if (statusTimer > 0.5 && statusEl) {
      statusTimer = 0;
      if (world.screen === SCREEN_PLAY) {
        statusEl.textContent = `Score ${world.score}, wave ${world.wave}, planet hull ${world.planetHp}.`;
      } else if (world.screen === SCREEN_OVER) {
        statusEl.textContent = `Game over. Score ${world.score}, best ${world.best}. Press R to play again.`;
      } else {
        statusEl.textContent = 'Starfall Shield. Click or press Enter to start.';
      }
    }
  }

  requestAnimationFrame(frame);
}
