// Neon Bay — HUD and screens, all drawn on the main canvas: health bar,
// cash, wanted stars, minimap, objective line, speedometer, banners, and the
// title / pause / busted / wasted screens.
import { CFG, PALETTE, MISSION_DEFS } from './config.js';
import { missionObjectiveText, currentDef, debtProgress } from './missions.js';
import { worldWidth, worldHeight } from './world.js';
import { isNight } from './render.js';
import { vehicleName } from './vehicles.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawStars(ctx, x, y, wanted) {
  for (let i = 0; i < CFG.MAX_WANTED; i++) {
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = i < wanted ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const sx = x + i * 30;
    ctx.strokeText('★', sx, y);
    ctx.fillText('★', sx, y);
  }
}

export function drawMinimap(ctx, G, x, y, size) {
  const ww = worldWidth(), wh = worldHeight();
  const s = size / Math.max(ww, wh);
  ctx.save();
  ctx.translate(x, y);
  // Frame.
  roundRect(ctx, -4, -4, size + 8, size + 8, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  // Ground.
  ctx.fillStyle = '#5a9e3f';
  ctx.fillRect(0, 0, size, size);
  // Water + beach.
  const beachX = (ww - CFG.BEACH_W - CFG.WATER_W) * s;
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(beachX, 0, CFG.BEACH_W * s, size);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(beachX + CFG.BEACH_W * s, 0, CFG.WATER_W * s, size);
  // Park.
  if (G.world.park) {
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(G.world.park.x * s, G.world.park.y * s, G.world.park.w * s, G.world.park.h * s);
  }
  // Roads.
  ctx.fillStyle = '#3d3d46';
  const P = CFG.BLOCK + CFG.ROAD;
  for (let i = 0; i <= CFG.GRID; i++) {
    const c = i * P + CFG.ROAD / 2;
    ctx.fillRect(0, c * s - (CFG.ROAD * s) / 2, size, CFG.ROAD * s);
    ctx.fillRect(c * s - (CFG.ROAD * s) / 2, 0, CFG.ROAD * s, size);
  }
  // Mission marker (pulsing).
  const target = G.mission.target;
  if (target) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(target.x * s, target.y * s, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cops (blue) and the player (white with black ring).
  for (const cop of G.cops) {
    const cx = cop.kind === 'car' ? cop.car.x : cop.x;
    const cy = cop.kind === 'car' ? cop.car.y : cop.y;
    ctx.fillStyle = '#4f7fd9';
    ctx.beginPath();
    ctx.arc(cx * s, cy * s, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pay 'n Spray garage (green $) and the getaway car (red) when relevant.
  if (G.world.garage) {
    ctx.fillStyle = '#1e7d46';
    ctx.fillRect((G.world.garage.x + G.world.garage.w / 2) * s - 4, (G.world.garage.y + G.world.garage.h / 2) * s - 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('$', (G.world.garage.x + G.world.garage.w / 2) * s - 2.5, (G.world.garage.y + G.world.garage.h / 2) * s + 3);
  }
  if (G.mission.targetCar && G.mission.index === 9) {
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(G.mission.targetCar.x * s, G.mission.targetCar.y * s, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Race checkpoints (orange) and the taxi fare (cyan).
  if (G.mission.checkpoints) {
    ctx.fillStyle = '#ff8c00';
    for (let i = G.mission.checkpointIndex; i < G.mission.checkpoints.length; i++) {
      ctx.beginPath();
      ctx.arc(G.mission.checkpoints[i].x * s, G.mission.checkpoints[i].y * s, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (G.mission.farePed) {
    ctx.fillStyle = '#1abc9c';
    ctx.beginPath();
    ctx.arc(G.mission.farePed.x * s, G.mission.farePed.y * s, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = G.player;
  const px = p.car ? p.car.x : p.x, py = p.car ? p.car.y : p.y;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px * s, py * s, 4.5, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, G, W, H) {
  const p = G.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: health bar + cash.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 14, 12, 210, 58, 8); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('DANNY COLE', 24, 30);
  ctx.fillStyle = '#222';
  roundRect(ctx, 24, 36, 150, 12, 6); ctx.fill();
  ctx.fillStyle = p.health > 30 ? '#4ade80' : '#ef4444';
  roundRect(ctx, 24, 36, 150 * Math.max(0, p.health / CFG.PLAYER_MAX_HEALTH), 12, 6); ctx.fill();
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('$' + G.money.toLocaleString('en-US'), 24, 64);
  // Top-right: wanted stars + in-game clock (sun by day, moon by night).
  drawStars(ctx, W - 178, 40, G.wanted);
  const hh = Math.floor(G.clockMinutes / 60);
  const mm = Math.floor(G.clockMinutes % 60);
  const clockText = (isNight(G) ? '☾ ' : '☀ ') + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  ctx.font = 'bold 15px sans-serif';
  const cw = ctx.measureText(clockText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, W - cw - 30, 48, cw + 16, 24, 7); ctx.fill();
  ctx.fillStyle = isNight(G) ? '#9db8ff' : '#ffd76e';
  ctx.fillText(clockText, W - cw - 22, 65);
  // Top-centre: objective.
  const obj = missionObjectiveText(G);
  ctx.font = 'bold 15px sans-serif';
  const ow = ctx.measureText(obj).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W / 2 - ow / 2 - 12, 12, ow + 24, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.fillText(obj, W / 2 - ow / 2, 33);
  // Debt progress under the objective, on its own dark pill so the road
  // markings never strike through the text.
  const debt = debtProgress(G);
  ctx.font = '12px sans-serif';
  const debtText = 'Debt to Ms. Voss: $' + debt.earned.toLocaleString('en-US') + ' / $' + debt.total.toLocaleString('en-US');
  const dw = ctx.measureText(debtText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W / 2 - dw / 2 - 10, 46, dw + 20, 20, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(debtText, W / 2 - dw / 2, 60);
  // Jobs progress: 6 story jobs, then 4 side jobs.
  const jobsDone = Math.min(G.mission.index, MISSION_DEFS.length);
  const jobsText = 'Jobs: ' + jobsDone + ' / ' + MISSION_DEFS.length + (G.mission.debtPaid ? ' · debt paid — side jobs pay cash' : '');
  ctx.font = '12px sans-serif';
  const jw = ctx.measureText(jobsText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W / 2 - jw / 2 - 10, 70, jw + 20, 20, 7); ctx.fill();
  ctx.fillStyle = G.mission.debtPaid ? '#7ee787' : 'rgba(255,255,255,0.9)';
  ctx.fillText(jobsText, W / 2 - jw / 2, 84);
  // Bottom-left: minimap.
  drawMinimap(ctx, G, 18, H - 178, 160);
  // Bottom-right: speed while driving, car health if in a car.
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.45);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, W - 150, H - 78, 136, 62, 8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(kmh + '', W - 26, H - 40);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText('km/h', W - 26, H - 24);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(vehicleName(p.car), W - 138, H - 64);
    ctx.fillStyle = p.car.health > 30 ? '#4ade80' : '#ef4444';
    roundRect(ctx, W - 138, H - 56, 112 * Math.max(0, p.car.health / 100), 6, 3); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, W - 218, H - 44, 204, 30, 8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText('E — enter car   ·   F — punch', W - 206, H - 24);
  }
  // Flash message under the objective pills.
  if (G.flash && G.time < G.flash.until) {
    ctx.font = 'bold 16px sans-serif';
    const fw = ctx.measureText(G.flash.text).width;
    ctx.fillStyle = G.flash.color;
    ctx.fillText(G.flash.text, W / 2 - fw / 2, 112);
  }
  // Mission banner (centre).
  const b = G.mission.banner;
  if (b && G.time < b.until) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const bw = Math.min(W - 80, 640);
    roundRect(ctx, W / 2 - bw / 2, H / 2 - 92, bw, 108, 10); ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.title, W / 2, H / 2 - 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px sans-serif';
    wrapText(ctx, b.sub, W / 2, H / 2 - 24, bw - 40, 20);
    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
}

// --- full screens -----------------------------------------------------------

function screenBackdrop(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e1a2e');
  g.addColorStop(0.55, '#123a5c');
  g.addColorStop(1, '#f27059');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawTitle(ctx, G, W, H) {
  screenBackdrop(ctx, W, H);
  // Sun + skyline silhouette.
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath(); ctx.arc(W * 0.78, H * 0.24, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(10,20,40,0.85)';
  const base = H * 0.72;
  const skyline = [0.22, 0.34, 0.18, 0.42, 0.28, 0.5, 0.24, 0.36, 0.3, 0.44, 0.2];
  let x = 0;
  const bw = W / skyline.length;
  skyline.forEach((h) => { ctx.fillRect(x, base - H * h, bw - 6, H * h + H * 0.3); x += bw; });
  ctx.fillStyle = '#2fa8c9';
  ctx.fillRect(0, H * 0.86, W, H * 0.14);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('NEON BAY', W / 2, H * 0.26);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('An open-world crime story', W / 2, H * 0.32);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#e8e8e8';
  const story = 'Danny Cole, getaway driver, owes fixer Ms. Voss $50,000. Six story jobs, four side jobs, and a city that never sleeps — day turns to neon night.';
  wrapText(ctx, story, W / 2, H * 0.40, 560, 20);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#cfe8ff';
  const controls = 'WASD / Arrows — walk & drive · SHIFT — run · E — enter / exit car · SPACE — handbrake · Mouse — aim · Click — shoot · F — punch · P — pause · M — music · Pay \'n Spray ($200) clears your wanted level';
  wrapText(ctx, controls, W / 2, H * 0.52, 640, 20);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = G.time % 1 < 0.6 ? '#ffd700' : '#ffffff';
  ctx.fillText('Press ENTER to start', W / 2, H * 0.64);
  if (G.hasSave) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press C to continue your saved game', W / 2, H * 0.70);
  }
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('A fully original city, characters and story. No network needed — everything runs from these files.', W / 2, H * 0.94);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', W / 2, H * 0.4);
  ctx.font = '16px sans-serif';
  ctx.fillText('P / Esc — resume · M — music · R — restart mission', W / 2, H * 0.48);
  ctx.fillText('Progress saves automatically after every mission.', W / 2, H * 0.54);
  ctx.textAlign = 'left';
}

export function drawBusted(ctx, G, W, H) {
  ctx.fillStyle = 'rgba(10,20,60,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4f7fd9';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('BUSTED!', W / 2, H * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px sans-serif';
  ctx.fillText(G.endReason || 'The Bay PD caught you.', W / 2, H * 0.48);
  ctx.fillText('Fine paid: $' + (G.lastFine || 0).toLocaleString('en-US') + ' — you wake up at Bay General Hospital.', W / 2, H * 0.54);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Press ENTER to get back out there', W / 2, H * 0.64);
  ctx.textAlign = 'left';
}

export function drawWasted(ctx, G, W, H) {
  ctx.fillStyle = 'rgba(40,0,0,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('WASTED', W / 2, H * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px sans-serif';
  ctx.fillText(G.endReason || 'You did not make it.', W / 2, H * 0.48);
  ctx.fillText('You wake up at Bay General Hospital, lighter by $' + (G.lastFine || 0).toLocaleString('en-US') + '.', W / 2, H * 0.54);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Press ENTER to get back out there', W / 2, H * 0.64);
  ctx.textAlign = 'left';
}
