// The screenshot scenes behind ?shot=start|play|storm|over. Each one stages a
// real world state and steps the real rules forward, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The storm scene starts at wave 5 with the
// score, hull and deflects a real player would carry there, then plays on.
import { STEP, CENTER, PLANET, SHIELD } from './config.js';
import {
  createWorld, resetWorld, step, startWave, placeMeteor,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER,
} from './world.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 14;
const STORM_SECONDS = 7;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 60;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// The meteor that will reach the planet soonest, still a threat.
function nearestThreat(world) {
  let best = null;
  let bestTime = Infinity;
  for (const m of world.meteors) {
    if (m.deflected || m.gone) continue;
    const d = Math.hypot(m.x - CENTER.x, m.y - CENTER.y) - PLANET.radius;
    const speed = Math.hypot(m.vx, m.vy) || 1;
    const t = d / speed;
    if (t < bestTime) {
      bestTime = t;
      best = m;
    }
  }
  return best;
}

function nearestDust(world) {
  let best = null;
  let bestD = Infinity;
  for (const item of [...world.dust, ...world.powers]) {
    const d = Math.hypot(item.x - CENTER.x, item.y - CENTER.y);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

// Steer the shield at the nearest threat; catch stardust when nothing is
// close; dash when a small meteor is right on the shield.
function autopilotSteer(world) {
  const threat = nearestThreat(world);
  let angle = null;
  if (threat) {
    angle = Math.atan2(threat.y - CENTER.y, threat.x - CENTER.x);
  } else {
    const dust = nearestDust(world);
    if (dust) angle = Math.atan2(dust.y - CENTER.y, dust.x - CENTER.x);
  }
  let dash = false;
  if (threat && world.shield.dashCooldown <= 0) {
    const d = Math.hypot(threat.x - CENTER.x, threat.y - CENTER.y);
    const orbit = SHIELD.orbit;
    const a = Math.atan2(threat.y - CENTER.y, threat.x - CENTER.x);
    const small = threat.kind === 'rock' || threat.kind === 'swift' || threat.kind === 'fragment';
    if (small && Math.abs(d - orbit) < 55 && Math.abs(angleDiff(a, world.shield.angle)) < 0.18) dash = true;
  }
  return { angle, turn: 0, dash };
}

function stageStorm(world, seed) {
  resetWorld(world, seed, world.best);
  world.ambient = false;
  world.screen = SCREEN_PLAY;
  // A real mid-game position: four waves cleared, some hull lost, a healthy score.
  world.score = 1150;
  world.wave = 5;
  world.planetHp = 80;
  world.stats.deflected = 68;
  world.stats.dustCaught = 5;
  world.stats.hits = 2;
  startWave(world);
  const kinds = ['rock', 'rock', 'swift', 'rock', 'splitter', 'swift', 'rock', 'armored', 'rock', 'swift', 'rock', 'splitter', 'rock', 'swift'];
  for (let i = 0; i < kinds.length; i += 1) {
    const angle = (i / kinds.length) * Math.PI * 2 + world.rng.range(-0.2, 0.2);
    const dist = world.rng.range(190, 520);
    placeMeteor(world, kinds[i], dist, angle, world.rng.range(0.9, 1.15));
  }
  // A couple of stardust motes and a power-up orb in flight.
  for (let i = 0; i < 2; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const d = world.rng.range(260, 420);
    world.dust.push({
      x: CENTER.x + Math.cos(a) * d, y: CENTER.y + Math.sin(a) * d,
      vx: world.rng.range(-20, 20), vy: world.rng.range(-20, 20),
      r: 9, t: world.rng.range(0, 2),
    });
  }
  world.powers.push({
    x: CENTER.x + 260, y: CENTER.y - 180,
    vx: -14, vy: 10, r: 9, t: 0.5, power: 'wide',
  });
  for (let i = 0; i < STORM_SECONDS / STEP; i += 1) {
    step(world, autopilotSteer(world), STEP);
    if (world.screen === SCREEN_OVER) break;
  }
  return { screen: world.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY };
}

/**
 * Set `world` to the named scene (start, play, storm or over; any other name
 * is start) and return the screen to draw over it.
 */
export function stageShot(name, world, seed) {
  if (name === 'storm') return stageStorm(world, seed);
  if (name === 'over') {
    resetWorld(world, seed, world.best);
    world.ambient = false;
    world.screen = SCREEN_PLAY;
    startWave(world);
    // Phase 1: a real run, played well through wave 3, building a score.
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      step(world, autopilotSteer(world), STEP);
      if (world.screen === SCREEN_OVER) break;
      if (world.wave >= 4) break;
    }
    // Phase 2: the shield stops tracking and just sits there — the planet falls.
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      step(world, { angle: null, turn: 0, dash: false }, STEP);
      if (world.screen === SCREEN_OVER) break;
    }
    return { screen: SCREEN_OVER };
  }
  if (name === 'play') {
    resetWorld(world, seed, world.best);
    world.ambient = false;
    world.screen = SCREEN_PLAY;
    startWave(world);
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      step(world, autopilotSteer(world), STEP);
      if (world.screen === SCREEN_OVER) break;
    }
    return { screen: world.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY };
  }
  // start: the title screen over a living sky.
  resetWorld(world, seed, world.best);
  world.ambient = true;
  world.screen = SCREEN_TITLE;
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    step(world, { angle: null, turn: 0, dash: false }, STEP);
  }
  return { screen: SCREEN_TITLE };
}

export { createWorld };
