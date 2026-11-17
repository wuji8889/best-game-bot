// Starfall Shield — everything the player sees, drawn on one canvas. The game
// is a dark sky, a warm amber planet, a bright cyan shield and hot meteors; the
// HUD, the title and the game-over screen are drawn here too, so a screenshot
// shows the whole loop at a glance.
import { FIELD, CENTER, PLANET, SHIELD, METEOR_KINDS } from './config.js';
import { shieldOrbit, shieldArc, shieldPos, comboMult } from './world.js';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

const METEOR_FILL = {
  rock: '#6b5a4e',
  swift: '#e8e0c8',
  splitter: '#8a6fb0',
  armored: '#3d4450',
  fragment: '#7a6a5c',
};
const POWER_COLOR = { wide: '#7df9ff', slow: '#c77dff', repair: '#7bed9f', magnet: '#ffd166' };
const POWER_LETTER = { wide: 'W', slow: 'S', repair: '+', magnet: 'M' };

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, '#050810');
  g.addColorStop(0.55, '#0a1424');
  g.addColorStop(1, '#0d1b2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const n of world.nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, `rgba(${n.color}, 0.16)`);
    ng.addColorStop(1, `rgba(${n.color}, 0)`);
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (const s of world.stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(world.time * s.speed + s.phase));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#dfe9ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(ctx, world) {
  const { x, y, radius } = PLANET;
  const hp = world.planetHp / PLANET.maxHp;
  // Atmosphere glow.
  const glow = ctx.createRadialGradient(x, y, radius * 0.9, x, y, radius * 1.7);
  glow.addColorStop(0, 'rgba(255, 180, 80, 0.30)');
  glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 1.8, y - radius * 1.8, radius * 3.6, radius * 3.6);
  // Body.
  const body = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
  body.addColorStop(0, '#ffd166');
  body.addColorStop(0.55, '#f4842c');
  body.addColorStop(1, '#8a3c00');
  ctx.fillStyle = body;
  circle(ctx, x, y, radius);
  ctx.fill();
  // Cloud bands.
  ctx.save();
  circle(ctx, x, y, radius);
  ctx.clip();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#fff3d6';
  ctx.fillRect(x - radius, y - radius * 0.45, radius * 2, radius * 0.16);
  ctx.fillRect(x - radius, y + radius * 0.12, radius * 2, radius * 0.12);
  ctx.fillRect(x - radius, y + radius * 0.5, radius * 2, radius * 0.1);
  ctx.globalAlpha = 1;
  // Craters.
  ctx.fillStyle = 'rgba(120, 50, 0, 0.35)';
  circle(ctx, x - radius * 0.3, y + radius * 0.2, radius * 0.16);
  ctx.fill();
  circle(ctx, x + radius * 0.35, y - radius * 0.3, radius * 0.11);
  ctx.fill();
  circle(ctx, x + radius * 0.15, y + radius * 0.45, radius * 0.09);
  ctx.fill();
  // Damage cracks as the hull falls.
  if (hp < 0.5) {
    ctx.strokeStyle = 'rgba(40, 10, 0, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.5, y - radius * 0.1);
    ctx.lineTo(x - radius * 0.1, y + radius * 0.25);
    ctx.lineTo(x + radius * 0.2, y + radius * 0.05);
    ctx.stroke();
  }
  if (hp < 0.25) {
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.45, y - radius * 0.5);
    ctx.lineTo(x + radius * 0.2, y - radius * 0.1);
    ctx.lineTo(x + radius * 0.55, y + radius * 0.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 60, 40, 0.25)';
    circle(ctx, x, y, radius);
    ctx.fill();
  }
  ctx.restore();
  // Rim light.
  ctx.strokeStyle = 'rgba(255, 220, 150, 0.55)';
  ctx.lineWidth = 2;
  circle(ctx, x, y, radius);
  ctx.stroke();
}

function drawOrbitRing(ctx, world) {
  ctx.strokeStyle = 'rgba(125, 249, 255, 0.10)';
  ctx.lineWidth = 1.5;
  circle(ctx, CENTER.x, CENTER.y, shieldOrbit(world));
  ctx.stroke();
}

function drawShield(ctx, world) {
  const orbit = shieldOrbit(world);
  const arc = shieldArc(world);
  const a = world.shield.angle;
  const dashing = world.shield.dashTimer > 0;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = dashing ? '#ffffff' : '#35e0ff';
  ctx.shadowBlur = dashing ? 30 : 18;
  ctx.strokeStyle = dashing ? '#eafcff' : '#7df9ff';
  ctx.lineWidth = SHIELD.thickness + (dashing ? 6 : 0);
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, orbit, a - arc / 2, a + arc / 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, orbit, a - arc / 2, a + arc / 2);
  ctx.stroke();
  // End caps.
  for (const side of [-1, 1]) {
    const ea = a + side * arc / 2;
    circle(ctx, CENTER.x + Math.cos(ea) * orbit, CENTER.y + Math.sin(ea) * orbit, 5);
    ctx.fillStyle = '#eafcff';
    ctx.fill();
  }
  ctx.restore();
}

function drawMeteor(ctx, m) {
  // Trail.
  if (m.trail.length > 1) {
    ctx.save();
    for (let i = 1; i < m.trail.length; i += 1) {
      const p = m.trail[i];
      ctx.globalAlpha = (i / m.trail.length) * 0.35;
      ctx.fillStyle = '#ff9f43';
      circle(ctx, p.x, p.y, m.r * (i / m.trail.length) * 0.8);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rot);
  ctx.fillStyle = METEOR_FILL[m.kind] || '#6b5a4e';
  ctx.beginPath();
  // A lumpy rock, not a perfect circle.
  const points = 9;
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const rr = m.r * (0.85 + 0.15 * Math.sin(a * 3 + m.rot * 2));
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Hot leading rim (the side facing the planet).
  const la = Math.atan2(CENTER.y - m.y, CENTER.x - m.x) - m.rot;
  ctx.strokeStyle = 'rgba(255, 159, 67, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, m.r * 0.92, la - 0.7, la + 0.7);
  ctx.stroke();
  // Craters.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  circle(ctx, -m.r * 0.3, m.r * 0.15, m.r * 0.22);
  ctx.fill();
  circle(ctx, m.r * 0.35, -m.r * 0.25, m.r * 0.16);
  ctx.fill();
  if (m.kind === 'armored') {
    ctx.fillStyle = 'rgba(220, 230, 255, 0.5)';
    circle(ctx, -m.r * 0.5, -m.r * 0.4, 2);
    ctx.fill();
    circle(ctx, m.r * 0.5, m.r * 0.45, 2);
    ctx.fill();
  }
  if (m.cracked) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-m.r * 0.6, -m.r * 0.5);
    ctx.lineTo(0, 0);
    ctx.lineTo(m.r * 0.5, m.r * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  if (m.kind === 'armored' && m.hp === 2) {
    // A second hit is needed: show the little armour pips.
    ctx.fillStyle = '#ffd166';
    circle(ctx, m.x - 8, m.y - m.r - 8, 3);
    ctx.fill();
    circle(ctx, m.x + 8, m.y - m.r - 8, 3);
    ctx.fill();
  }
}

function drawDust(ctx, item) {
  const pulse = 0.75 + 0.25 * Math.sin(item.t * 5);
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.t * 0.8);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#c77dff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e0aaff';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(3.5, -3.5);
  ctx.lineTo(11, 0);
  ctx.lineTo(3.5, 3.5);
  ctx.lineTo(0, 11);
  ctx.lineTo(-3.5, 3.5);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-3.5, -3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPower(ctx, item) {
  const color = POWER_COLOR[item.power] || '#ffd166';
  const pulse = 1 + 0.12 * Math.sin(item.t * 6);
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  circle(ctx, 0, 0, 13);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a1424';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(POWER_LETTER[item.power] || '?', 0, 1);
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, p.size);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText('SCORE', 24, 20);
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText(String(world.score), 24, 36);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.6)';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 24, 80);
  const mult = comboMult(world);
  if (mult > 1) {
    ctx.fillStyle = '#7df9ff';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`COMBO ×${mult}`, 24, 102);
  }
  // Wave, top centre.
  const spec = world.wave % 5 === 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = spec ? '#ff5e57' : 'rgba(223, 233, 255, 0.85)';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(spec ? `WAVE ${world.wave} — STORM!` : `WAVE ${world.wave}`, FIELD.width / 2, 22);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.55)';
  ctx.font = `bold 13px ${FONT}`;
  const left = world.waveState === 'spawning'
    ? `${world.waveTotal - world.waveSpawned} incoming`
    : world.waveState === 'fighting'
      ? `${world.meteors.length} to clear`
      : 'wave clear';
  ctx.fillText(left, FIELD.width / 2, 50);
  // Hull, top right.
  const hp = world.planetHp / PLANET.maxHp;
  const barX = FIELD.width - 250;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText('PLANET HULL', barX, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(barX, 38, 170, 14);
  ctx.fillStyle = hp > 0.5 ? '#7bed9f' : hp > 0.25 ? '#ffd166' : '#ff5e57';
  ctx.fillRect(barX, 38, 170 * hp, 14);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.85)';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`${world.planetHp}`, barX + 176, 36);
  // Dash, bottom centre.
  const s = world.shield;
  const ready = s.dashCooldown <= 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = ready ? '#7df9ff' : 'rgba(223, 233, 255, 0.45)';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(ready ? 'DASH READY  [click / space]' : 'DASH …', FIELD.width / 2, FIELD.height - 28);
  if (!ready) {
    const frac = 1 - s.dashCooldown / SHIELD.dashCooldown;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(FIELD.width / 2 - 60, FIELD.height - 12, 120, 5);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(FIELD.width / 2 - 60, FIELD.height - 12, 120 * frac, 5);
  }
  // Active power-ups, bottom left.
  const chips = [];
  if (s.wideTimer > 0) chips.push(`WIDE ${Math.ceil(s.wideTimer)}s`);
  if (world.slowTimer > 0) chips.push(`SLOW ${Math.ceil(world.slowTimer)}s`);
  if (world.magnetTimer > 0) chips.push(`MAGNET ${Math.ceil(world.magnetTimer)}s`);
  if (chips.length) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(chips.join('   '), 24, FIELD.height - 30);
  }
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const a = Math.min(1, world.banner.timer / 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 46px ${FONT}`;
  ctx.shadowColor = '#f4842c';
  ctx.shadowBlur = 24;
  ctx.fillText(world.banner.text, FIELD.width / 2, FIELD.height / 2 - 120);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7df9ff';
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText(world.banner.sub, FIELD.width / 2, FIELD.height / 2 - 74);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 14, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 72px ${FONT}`;
  ctx.shadowColor = '#f4842c';
  ctx.shadowBlur = 30;
  ctx.fillText('STARFALL SHIELD', FIELD.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(223, 233, 255, 0.9)';
  ctx.font = `24px ${FONT}`;
  ctx.fillText('The last shield of a small amber planet.', FIELD.width / 2, 268);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.75)';
  ctx.font = `18px ${FONT}`;
  ctx.fillText('Swing the shield with your mouse or ← → to deflect the meteors.', FIELD.width / 2, 330);
  ctx.fillText('Catch stardust for points. Click or Space to dash. Don’t let them hit the planet.', FIELD.width / 2, 360);
  ctx.fillStyle = '#7df9ff';
  ctx.font = `bold 26px ${FONT}`;
  const blink = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 440);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`BEST SCORE ${world.best}`, FIELD.width / 2, 492);
  }
  ctx.fillStyle = 'rgba(223, 233, 255, 0.45)';
  ctx.font = `15px ${FONT}`;
  ctx.fillText('P pause   ·   M mute   ·   R restart', FIELD.width / 2, 560);
  ctx.restore();
}

function drawGameOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 6, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff5e57';
  ctx.font = `bold 54px ${FONT}`;
  ctx.shadowColor = '#ff2e2e';
  ctx.shadowBlur = 26;
  ctx.fillText('THE PLANET HAS FALLEN', FIELD.width / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(`SCORE ${world.score}`, FIELD.width / 2, 330);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.85)';
  ctx.font = `22px ${FONT}`;
  ctx.fillText(`You held the line for ${world.wave} wave${world.wave === 1 ? '' : 's'}  ·  ${world.stats.deflected} meteors deflected`, FIELD.width / 2, 388);
  if (world.score > 0 && world.score >= world.best) {
    ctx.fillStyle = '#7bed9f';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText('NEW BEST!', FIELD.width / 2, 432);
  } else {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`BEST ${world.best}`, FIELD.width / 2, 432);
  }
  const blink = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#7df9ff';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 500);
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 14, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dfe9ff';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.fillStyle = 'rgba(223, 233, 255, 0.7)';
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Press P to resume', FIELD.width / 2, FIELD.height / 2 + 36);
  ctx.restore();
}

export function draw(ctx, world) {
  ctx.save();
  if (world.shake > 0.2) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);
  drawPlanet(ctx, world);
  drawOrbitRing(ctx, world);
  for (const item of world.dust) drawDust(ctx, item);
  for (const item of world.powers) drawPower(ctx, item);
  drawShield(ctx, world);
  for (const m of world.meteors) drawMeteor(ctx, m);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (world.screen === 'play' || world.screen === 'over') drawHud(ctx, world);
  drawBanner(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'over') drawGameOver(ctx, world);
  else if (world.paused) drawPaused(ctx);
}
