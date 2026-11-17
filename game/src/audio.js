// All of the game's sound, made with the Web Audio API and no audio files:
// short oscillator tones with a quick envelope, so the game stays a handful of
// static files. Everything is guarded: with no audio device, or before the
// player has interacted, it simply stays silent.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  // One tone: `freq` slides to `slideTo` over `dur` seconds, then stops.
  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c || !master) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const now = c.currentTime;
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol || 0.5, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Silence is always an acceptable fallback.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    deflect(combo) {
      const base = 620 + Math.min(combo, 8) * 45;
      tone(base, 0.09, 'triangle', 0.5);
      tone(base * 1.5, 0.07, 'sine', 0.25);
    },
    clank() {
      tone(180, 0.12, 'square', 0.3, 120);
    },
    impact() {
      tone(110, 0.28, 'sine', 0.7, 45);
      tone(70, 0.2, 'triangle', 0.4, 40);
    },
    dust() {
      tone(880, 0.08, 'sine', 0.35);
      setTimeout(() => tone(1318, 0.1, 'sine', 0.3), 55);
    },
    powerup() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.4), i * 70));
    },
    dash() {
      tone(280, 0.16, 'sawtooth', 0.18, 940);
    },
    waveClear() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.4), i * 90));
    },
    gameOver() {
      [392, 311, 233, 175].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.45), i * 160));
    },
    click() {
      tone(740, 0.05, 'sine', 0.25);
    },
  };
}
