// A small seeded random source, so a screenshot scene (or a replay) can be
// staged exactly the same way every time. Real play seeds it from the clock.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(a, b) {
      return a + next() * (b - a);
    },
    int(a, b) {
      return a + Math.floor(next() * (b - a + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    chance(p) {
      return next() < p;
    },
    // Pick one entry from a weighted table of [value, weight] pairs.
    weighted(table) {
      let total = 0;
      for (const [, w] of table) total += w;
      let roll = next() * total;
      for (const [value, w] of table) {
        roll -= w;
        if (roll <= 0) return value;
      }
      return table[table.length - 1][0];
    },
  };
}
