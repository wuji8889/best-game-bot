// Starfall Shield — the game's state and its rules. Everything the player does
// and everything that happens to the planet goes through one fixed step, so a
// screenshot scene can be staged by stepping the same world forward, and real
// play is the same code with a human steering.
import {
  FIELD, CENTER, PLANET, SHIELD, METEOR, METEOR_KINDS, FRAGMENT, DUST,
  POWER_KINDS, POWER, COMBO, STEP, waveSpec, waveKinds,
} from './config.js';
import { makeRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function angleDiff(a, b) {
  return wrapAngle(a - b);
}

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: rng.range(0, FIELD.width),
      y: rng.range(0, FIELD.height),
      r: rng.range(0.6, 2.1),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.4, 1.6),
    });
  }
  return stars;
}

function makeNebulae(rng) {
  const hues = [
    { x: 0.2, y: 0.22, r: 320, color: '88, 60, 180' },
    { x: 0.82, y: 0.78, r: 360, color: '20, 120, 140' },
    { x: 0.78, y: 0.16, r: 260, color: '160, 60, 90' },
  ];
  return hues.map((h) => ({
    x: h.x * FIELD.width + rng.range(-40, 40),
    y: h.y * FIELD.height + rng.range(-40, 40),
    r: h.r,
    color: h.color,
  }));
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    rng,
    time: 0,
    screen: SCREEN_TITLE,
    paused: false,
    ambient: true,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    waveSpawned: 0,
    waveTotal: 0,
    spawnTimer: 0,
    waveState: 'spawning',
    clearTimer: 0,
    banner: null,
    planetHp: PLANET.maxHp,
    shield: { angle: -Math.PI / 2, dashTimer: 0, dashCooldown: 0, wideTimer: 0 },
    slowTimer: 0,
    magnetTimer: 0,
    dustTimer: 3,
    meteors: [],
    dust: [],
    powers: [],
    particles: [],
    floaters: [],
    stars: makeStars(rng),
    nebulae: makeNebulae(rng),
    shake: 0,
    stats: { deflected: 0, hits: 0, dustCaught: 0 },
  };
  return world;
}

export function resetWorld(world, seed, best) {
  const fresh = createWorld(seed);
  fresh.best = best || 0;
  Object.assign(world, fresh);
}

function spawnParticles(world, x, y, count, color, speed, life) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: world.rng.range(life * 0.5, life),
      maxLife: life,
      size: world.rng.range(1.5, 4),
      color,
    });
  }
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function meteorSpeed(world, kind, spec) {
  const base = METEOR.baseSpeed + METEOR.speedPerWave * (world.wave - 1);
  return base * METEOR_KINDS[kind].speed * spec.speedMult;
}

function spawnMeteor(world, spec, kind) {
  const angle = world.rng.range(0, Math.PI * 2);
  placeMeteor(world, kind, METEOR.spawnRadius, angle, 1);
}

// Place a meteor already in flight at `dist` from the planet, at `angle`
// around it, moving inward — for staging a screenshot scene at a wave.
export function placeMeteor(world, kind, dist, angle, speedScale) {
  const rng = world.rng;
  const spec = waveSpec(world.wave);
  const x = CENTER.x + Math.cos(angle) * dist;
  const y = CENTER.y + Math.sin(angle) * dist;
  const def = METEOR_KINDS[kind];
  const radius = rng.range(def.radiusMin, def.radiusMax);
  const speed = meteorSpeed(world, kind, spec) * (speedScale || 1);
  const dx = CENTER.x - x;
  const dy = CENTER.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const drift = rng.range(-METEOR.drift, METEOR.drift);
  const px = -dy / d;
  const py = dx / d;
  world.meteors.push({
    kind, x, y,
    vx: (dx / d) * speed + px * drift,
    vy: (dy / d) * speed + py * drift,
    r: radius,
    hp: def.hp,
    maxHp: def.hp,
    score: def.score,
    damage: def.damage,
    speed,
    rot: rng.range(0, Math.PI * 2),
    rotSpeed: rng.range(-1.6, 1.6),
    trail: [],
    cracked: false,
    deflected: false,
  });
}

function spawnFragment(world, parent) {
  const rng = world.rng;
  const a = Math.atan2(parent.y - CENTER.y, parent.x - CENTER.x);
  for (const side of [-1, 1]) {
    const spread = a + side * rng.range(0.35, 0.7);
    const speed = parent.speed * FRAGMENT.speed * rng.range(0.9, 1.2);
    world.meteors.push({
      kind: 'fragment',
      x: parent.x, y: parent.y,
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed,
      r: FRAGMENT.radius,
      hp: 1, maxHp: 1,
      score: FRAGMENT.score,
      damage: FRAGMENT.damage,
      speed,
      rot: rng.range(0, Math.PI * 2),
      rotSpeed: rng.range(-2, 2),
      trail: [],
      cracked: false,
      // Fragments are the debris of a deflect: already flying away, never
      // a threat, so they count as deflected from birth.
      deflected: true,
    });
  }
}

function spawnDust(world, asPower) {
  const rng = world.rng;
  // Drift in from a random edge, across the field.
  const side = rng.int(0, 3);
  let x;
  let y;
  if (side === 0) { x = -20; y = rng.range(40, FIELD.height - 40); }
  else if (side === 1) { x = FIELD.width + 20; y = rng.range(40, FIELD.height - 40); }
  else if (side === 2) { x = rng.range(40, FIELD.width - 40); y = -20; }
  else { x = rng.range(40, FIELD.width - 40); y = FIELD.height + 20; }
  const tx = rng.range(120, FIELD.width - 120);
  const ty = rng.range(120, FIELD.height - 120);
  const d = Math.hypot(tx - x, ty - y) || 1;
  const speed = DUST.speed * rng.range(0.8, 1.3);
  const item = {
    x, y,
    vx: ((tx - x) / d) * speed,
    vy: ((ty - y) / d) * speed,
    r: DUST.radius,
    t: 0,
  };
  if (asPower) {
    item.power = rng.pick(POWER_KINDS);
    world.powers.push(item);
  } else {
    world.dust.push(item);
  }
}

function startWave(world) {
  const spec = waveSpec(world.wave);
  world.waveTotal = spec.total;
  world.waveSpawned = 0;
  world.spawnTimer = 0.8;
  world.waveState = 'spawning';
  return spec;
}

function shieldOrbit(world) {
  const s = world.shield;
  const lunge = s.dashTimer > 0 ? SHIELD.dashLunge * (s.dashTimer / SHIELD.dashTime) : 0;
  return SHIELD.orbit + lunge;
}

function shieldArc(world) {
  return world.shield.wideTimer > 0 ? SHIELD.arcWide : SHIELD.arc;
}

function shieldPos(world) {
  const orbit = shieldOrbit(world);
  return {
    x: CENTER.x + Math.cos(world.shield.angle) * orbit,
    y: CENTER.y + Math.sin(world.shield.angle) * orbit,
  };
}

// True when the meteor sits on the shield's arc right now.
function onShield(world, m) {
  const dx = m.x - CENTER.x;
  const dy = m.y - CENTER.y;
  const d = Math.hypot(dx, dy);
  const orbit = shieldOrbit(world);
  if (Math.abs(d - orbit) > m.r + SHIELD.thickness / 2 + 6) return false;
  const a = Math.atan2(dy, dx);
  const spread = shieldArc(world) / 2 + m.r / orbit;
  return Math.abs(angleDiff(a, world.shield.angle)) < spread;
}

function comboMult(world) {
  return Math.min(1 + Math.floor(world.combo / 2), COMBO.maxMult);
}

function deflectMeteor(world, m, events) {
  const s = world.shield;
  const a = Math.atan2(m.y - CENTER.y, m.x - CENTER.x);
  // Armored meteors push through once: the first hit only cracks them and
  // knocks them back toward the planet, so they come around for a second hit.
  if (m.kind === 'armored' && m.hp === 2) {
    m.hp = 1;
    m.cracked = true;
    const speed = m.speed * 0.45;
    m.vx = -Math.cos(a) * speed;
    m.vy = -Math.sin(a) * speed;
    events.push('clank');
    addFloater(world, m.x, m.y, 'CRACKED!', '#ffd166');
    spawnParticles(world, m.x, m.y, 10, '#ffd166', 120, 0.5);
    return;
  }
  const mult = comboMult(world);
  const gained = m.score * mult;
  world.score += gained;
  world.combo += 1;
  world.comboTimer = COMBO.window;
  world.stats.deflected += 1;
  const dashing = s.dashTimer > 0;
  if (dashing && (m.kind === 'rock' || m.kind === 'swift' || m.kind === 'splitter' || m.kind === 'fragment')) {
    world.score += 5;
    spawnParticles(world, m.x, m.y, 26, '#7df9ff', 260, 0.7);
    addFloater(world, m.x, m.y, `+${gained + 5}`, '#7df9ff');
    m.gone = true;
  } else {
    // Bounce away from the planet, keeping some sideways motion.
    const speed = Math.max(m.speed * 0.85, 90);
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    const side = (m.vx * tx + m.vy * ty) >= 0 ? 1 : -1;
    m.vx = Math.cos(a) * speed + tx * side * m.speed * 0.3;
    m.vy = Math.sin(a) * speed + ty * side * m.speed * 0.3;
    m.deflected = true;
    spawnParticles(world, m.x, m.y, 16, '#7df9ff', 200, 0.6);
    addFloater(world, m.x, m.y, `+${gained}`, '#7df9ff');
    if (m.kind === 'splitter') spawnFragment(world, m);
  }
  events.push('deflect');
}

function planetHit(world, m, events) {
  world.planetHp = Math.max(0, world.planetHp - m.damage);
  world.combo = 0;
  world.comboTimer = 0;
  world.stats.hits += 1;
  world.shake = Math.min(world.shake + 9, 14);
  spawnParticles(world, m.x, m.y, 30, '#ff9f43', 260, 0.8);
  spawnParticles(world, m.x, m.y, 12, '#ff5e57', 180, 0.6);
  addFloater(world, m.x, m.y, `-${m.damage} HULL`, '#ff5e57');
  events.push('impact');
  m.gone = true;
  if (world.planetHp <= 0) {
    world.screen = SCREEN_OVER;
    if (world.score > world.best) world.best = world.score;
    events.push('gameover');
  }
}

function applyPower(world, kind, x, y, events) {
  if (kind === 'wide') {
    world.shield.wideTimer = POWER.wideSeconds;
    addFloater(world, x, y, 'WIDE SHIELD', '#7df9ff');
  } else if (kind === 'slow') {
    world.slowTimer = POWER.slowSeconds;
    addFloater(world, x, y, 'SLOW TIME', '#c77dff');
  } else if (kind === 'repair') {
    world.planetHp = Math.min(PLANET.maxHp, world.planetHp + POWER.repairHp);
    addFloater(world, x, y, `+${POWER.repairHp} HULL`, '#7bed9f');
  } else if (kind === 'magnet') {
    world.magnetTimer = POWER.magnetSeconds;
    addFloater(world, x, y, 'MAGNET', '#ffd166');
  }
  events.push('powerup');
  spawnParticles(world, x, y, 20, '#ffd166', 200, 0.7);
}

// One fixed step. `steer` is { angle: radians|null, turn: -1|0|1, dash: bool }.
// Returns the event names this step raised, for sounds and the HUD.
export function step(world, steer, dt) {
  const events = [];
  world.time += dt;

  // Timers.
  const s = world.shield;
  if (s.dashTimer > 0) s.dashTimer -= dt;
  if (s.dashCooldown > 0) s.dashCooldown -= dt;
  if (s.wideTimer > 0) s.wideTimer -= dt;
  if (world.slowTimer > 0) world.slowTimer -= dt;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.banner) {
    world.banner.timer -= dt;
    if (world.banner.timer <= 0) world.banner = null;
  }

  // Steering: keys swing the shield, otherwise it chases the pointer.
  if (steer.turn !== 0) {
    s.angle = wrapAngle(s.angle + steer.turn * SHIELD.turnSpeed * dt);
  } else if (steer.angle !== null && steer.angle !== undefined) {
    const diff = angleDiff(steer.angle, s.angle);
    const maxTurn = SHIELD.turnSpeed * dt;
    s.angle = wrapAngle(s.angle + Math.max(-maxTurn, Math.min(maxTurn, diff)));
  }
  if (steer.dash && s.dashCooldown <= 0 && world.screen === SCREEN_PLAY) {
    s.dashTimer = SHIELD.dashTime;
    s.dashCooldown = SHIELD.dashCooldown;
    events.push('dash');
  }

  // The title screen is a living backdrop: slow meteors drift by and fade at
  // the planet, never hurting it, while the shield turns on its own.
  if (world.ambient) {
    s.angle = wrapAngle(s.angle + dt * 0.35);
    if (world.meteors.length < 7 && world.rng.chance(dt * 0.7)) {
      spawnMeteor(world, waveSpec(1), world.rng.pick(['rock', 'swift']));
    }
    for (const m of world.meteors) {
      m.x += m.vx * dt * 0.6;
      m.y += m.vy * dt * 0.6;
      m.rot += m.rotSpeed * dt;
      const d = Math.hypot(m.x - CENTER.x, m.y - CENTER.y);
      if (d < PLANET.radius + m.r) m.gone = true;
    }
    world.meteors = world.meteors.filter((m) => !m.gone);
    updateParticles(world, dt);
    updateFloaters(world, dt);
    return events;
  }

  if (world.screen !== SCREEN_PLAY) {
    updateParticles(world, dt);
    updateFloaters(world, dt);
    return events;
  }

  // Wave spawning.
  const spec = waveSpec(world.wave);
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.waveSpawned < world.waveTotal) {
      spawnMeteor(world, spec, world.rng.weighted(waveKinds(world.wave)));
      world.waveSpawned += 1;
      world.spawnTimer = spec.interval * world.rng.range(0.8, 1.2);
    }
    if (world.waveSpawned >= world.waveTotal) world.waveState = 'fighting';
  } else if (world.waveState === 'fighting') {
    if (world.meteors.length === 0) {
      const bonus = 100 * world.wave;
      world.score += bonus;
      world.banner = { text: `WAVE ${world.wave} CLEAR`, sub: `+${bonus}`, timer: 2.5 };
      world.waveState = 'clear';
      world.clearTimer = 2.5;
      events.push('waveclear');
    }
  } else if (world.waveState === 'clear') {
    world.clearTimer -= dt;
    if (world.clearTimer <= 0) {
      world.wave += 1;
      startWave(world);
      events.push('wavestart');
    }
  }

  // Stardust and power-up orbs drift in on their own timer.
  world.dustTimer -= dt;
  if (world.dustTimer <= 0) {
    const asPower = world.rng.chance(DUST.powerChance) && world.powers.length === 0;
    spawnDust(world, asPower);
    world.dustTimer = world.rng.range(DUST.spawnEveryMin, DUST.spawnEveryMax);
  }

  // Meteors: home gently toward the planet, move, trail, deflect or hit it.
  // The homing is what makes them a threat: a straight line from the edge
  // with a sideways drift would otherwise sail past the planet and never
  // come back, stalling the wave.
  const slow = world.slowTimer > 0 ? POWER.slowFactor : 1;
  for (const m of world.meteors) {
    if (!m.deflected) {
      const dx = CENTER.x - m.x;
      const dy = CENTER.y - m.y;
      const dd = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(m.vx, m.vy) || 1;
      const blend = Math.min(1, 1.5 * dt);
      m.vx += ((dx / dd) * speed - m.vx) * blend;
      m.vy += ((dy / dd) * speed - m.vy) * blend;
    }
    m.x += m.vx * slow * dt;
    m.y += m.vy * slow * dt;
    m.rot += m.rotSpeed * dt;
    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 7) m.trail.shift();
    const d = Math.hypot(m.x - CENTER.x, m.y - CENTER.y);
    if (d > METEOR.spawnRadius + 140) {
      // Far outside the field, moving away: gone, whatever it is.
      m.gone = true;
      continue;
    }
    if (m.deflected) continue;
    if (onShield(world, m)) {
      deflectMeteor(world, m, events);
      if (world.screen !== SCREEN_PLAY) break;
      continue;
    }
    if (d < PLANET.radius + m.r * 0.6) {
      planetHit(world, m, events);
      if (world.screen !== SCREEN_PLAY) break;
    }
  }
  world.meteors = world.meteors.filter((m) => !m.gone);

  // Stardust: drift, magnet pull, collect on the shield.
  const sp = shieldPos(world);
  for (const item of [...world.dust, ...world.powers]) {
    item.t += dt;
    if (world.magnetTimer > 0) {
      const dx = sp.x - item.x;
      const dy = sp.y - item.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < POWER.magnetRadius) {
        const pull = 320 * (1 - d / POWER.magnetRadius);
        item.vx += (dx / d) * pull * dt;
        item.vy += (dy / d) * pull * dt;
      }
    }
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    const d = Math.hypot(item.x - CENTER.x, item.y - CENTER.y);
    const orbit = shieldOrbit(world);
    const a = Math.atan2(item.y - CENTER.y, item.x - CENTER.x);
    const onArc = Math.abs(d - orbit) < item.r + SHIELD.thickness / 2 + 8
      && Math.abs(angleDiff(a, world.shield.angle)) < shieldArc(world) / 2 + 0.25;
    if (onArc) {
      item.gone = true;
      if (item.power) {
        applyPower(world, item.power, item.x, item.y, events);
      } else {
        world.score += DUST.score;
        world.stats.dustCaught += 1;
        events.push('dust');
        spawnParticles(world, item.x, item.y, 12, '#c77dff', 160, 0.5);
        addFloater(world, item.x, item.y, `+${DUST.score}`, '#c77dff');
      }
    } else if (d < PLANET.radius + 4 || item.x < -60 || item.x > FIELD.width + 60 || item.y < -60 || item.y > FIELD.height + 60) {
      item.gone = true;
    }
  }
  world.dust = world.dust.filter((i) => !i.gone);
  world.powers = world.powers.filter((i) => !i.gone);

  updateParticles(world, dt);
  updateFloaters(world, dt);
  return events;
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

function updateFloaters(world, dt) {
  for (const f of world.floaters) {
    f.life -= dt;
    f.y -= 34 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);
}

export { startWave, shieldOrbit, shieldArc, shieldPos, comboMult, wrapAngle };
