// Starfall Shield — the numbers that tune the game. One place for every size,
// speed, score and wave value, so tuning never means hunting through the logic.
export const FIELD = { width: 1280, height: 800 };
export const CENTER = { x: 640, y: 400 };

export const PLANET = {
  x: 640,
  y: 400,
  radius: 72,
  maxHp: 100,
};

export const SHIELD = {
  orbit: 158, // distance from the planet centre to the shield arc
  arc: 1.25, // radians of arc the shield covers (~72 degrees)
  arcWide: 1.95, // arc while the Wide Shield power-up runs
  thickness: 16,
  turnSpeed: 7.5, // radians per second, the fastest the shield can swing
  dashCooldown: 2.5, // seconds between dashes
  dashTime: 0.18, // seconds a dash lasts
  dashLunge: 46, // extra orbit radius during a dash
};

// Meteors fly in from the dark toward the planet. Each kind has its own size,
// speed, score and damage; the wave table decides which kinds show up.
export const METEOR_KINDS = {
  rock: { radiusMin: 14, radiusMax: 20, speed: 1.0, hp: 1, score: 10, damage: 10 },
  swift: { radiusMin: 9, radiusMax: 12, speed: 1.7, hp: 1, score: 15, damage: 8 },
  splitter: { radiusMin: 16, radiusMax: 17, speed: 0.9, hp: 1, score: 20, damage: 12 },
  armored: { radiusMin: 22, radiusMax: 23, speed: 0.75, hp: 2, score: 30, damage: 14 },
};
export const FRAGMENT = { radius: 9, speed: 1.1, score: 5, damage: 6 };

export const METEOR = {
  spawnRadius: 560, // meteors appear this far from the planet centre
  baseSpeed: 72, // pixels per second at wave 1
  speedPerWave: 9, // extra pixels per second each wave
  drift: 14, // sideways drift, pixels per second at most
};

// Stardust drifts across the field; catch it with the shield. One in a few is a
// power-up orb instead.
export const DUST = {
  radius: 9,
  score: 25,
  speed: 26,
  spawnEveryMin: 4,
  spawnEveryMax: 7,
  powerChance: 0.16,
};

export const POWER_KINDS = ['wide', 'slow', 'repair', 'magnet'];
export const POWER = {
  wideSeconds: 8,
  slowSeconds: 6,
  slowFactor: 0.45,
  repairHp: 20,
  magnetSeconds: 8,
  magnetRadius: 280,
};

export const COMBO = {
  window: 2.5, // seconds a deflect stays "recent" for the combo chain
  maxMult: 5,
};

// A wave is a batch of meteors; clear it for a bonus, then the next wave comes
// faster and harder. Every fifth wave is a storm.
export function waveSpec(n) {
  const total = Math.round((10 + 4 * n) * (n % 5 === 0 ? 1.6 : 1));
  const interval = Math.max(0.35, 1.15 - 0.06 * n) * (n % 5 === 0 ? 0.55 : 1);
  const speedMult = 1 + 0.07 * (n - 1);
  return { total, interval, speedMult, storm: n % 5 === 0 };
}

// Which meteor kinds a wave can spawn, as weights. New kinds join as the
// waves climb: swift from wave 2, splitter from wave 3, armored from wave 4.
export function waveKinds(n) {
  const kinds = [['rock', 10]];
  if (n >= 2) kinds.push(['swift', 4 + n]);
  if (n >= 3) kinds.push(['splitter', 2 + n]);
  if (n >= 4) kinds.push(['armored', 1 + n]);
  return kinds;
}

export const STEP = 1 / 60; // the world's fixed step, seconds
