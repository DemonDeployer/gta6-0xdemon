// Neon Bay — HUD: minimap, cash, wanted stars, speedometer, clock, jobs counter.
import { WORLD, DISTRICTS, SPRAY, MISSIONS } from './config.js';
import { vehicleName, speedKmh } from './vehicles.js';

export function clockLabel(timeH) {
  const h = Math.floor(timeH) % 24, m = Math.floor((timeH % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function isNight(timeH) { return timeH >= 20 || timeH < 6; }

export function drawHUD(ctx, s, vw, vh) {
  const night = isNight(s.timeH);
  // Top-left: cash, jobs, debt
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(2,6,23,0.72)'; ctx.fillRect(10, 10, 250, 86);
  ctx.fillStyle = '#4ade80'; ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`$${Math.floor(s.cash).toLocaleString('en-US')}`, 20, 36);
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`Jobs ${s.jobsDone}/10`, 20, 58);
  ctx.fillStyle = s.debtPaid ? '#4ade80' : '#fbbf24';
  ctx.fillText(s.debtPaid ? 'DEBT PAID OFF' : `Debt $${Math.floor(s.debt).toLocaleString('en-US')}`, 20, 78);
  // Wanted stars
  ctx.fillStyle = 'rgba(2,6,23,0.72)'; ctx.fillRect(10, 104, 250, 34);
  ctx.font = 'bold 18px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < s.wanted ? '#facc15' : '#334155';
    ctx.fillText('★', 20 + i * 26, 128);
  }
  ctx.fillStyle = '#e2e8f0'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(s.wanted > 0 ? 'WANTED' : 'clean', 155, 127);
  // Clock (sun/moon)
  ctx.fillStyle = 'rgba(2,6,23,0.72)'; ctx.fillRect(vw - 150, 10, 140, 40);
  ctx.font = 'bold 20px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = night ? '#c4b5fd' : '#fde68a';
  ctx.fillText(`${night ? '☾' : '☀'} ${clockLabel(s.timeH)}`, vw - 80, 38);
  // Mission banner
  if (s.missionText) {
    ctx.fillStyle = 'rgba(2,6,23,0.8)'; ctx.fillRect(vw / 2 - 260, 10, 520, 44);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(s.missionText, vw / 2, 28);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(s.missionSub || '', vw / 2, 46);
  }
  drawMinimap(ctx, s, vw, vh);
  // Speedometer (bottom-right)
  const car = s.playerCar;
  ctx.fillStyle = 'rgba(2,6,23,0.72)'; ctx.fillRect(vw - 190, vh - 78, 180, 68);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(car ? `${speedKmh(car)}` : '0', vw - 30, vh - 42);
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('km/h', vw - 30, vh - 22);
  ctx.textAlign = 'left'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#67e8f9';
  ctx.fillText(vehicleName(car), vw - 180, vh - 42);
  if (car) { // car health bar
    ctx.fillStyle = '#111827'; ctx.fillRect(vw - 180, vh - 18, 160, 8);
    ctx.fillStyle = car.hp > car.maxHp * 0.5 ? '#4ade80' : car.hp > car.maxHp * 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillRect(vw - 180, vh - 18, 160 * (car.hp / car.maxHp), 8);
  }
  // Controls hint (bottom-left)
  ctx.fillStyle = 'rgba(2,6,23,0.55)'; ctx.fillRect(10, vh - 34, 430, 24);
  ctx.fillStyle = '#cbd5e1'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('WASD drive · E enter/exit car · M mission · P pause · H help', 18, vh - 17);
  // Toast message
  if (s.toast && s.toastT > 0) {
    ctx.fillStyle = 'rgba(2,6,23,0.85)'; ctx.fillRect(vw / 2 - 200, vh - 120, 400, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s.toast, vw / 2, vh - 98);
  }
}

function drawMinimap(ctx, s, vw, vh) {
  const mw = 200, mh = 150, mx = vw - mw - 10, my = 56;
  const sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(2,6,23,0.8)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(mx, my, mw, mh);
  for (const d of DISTRICTS) { ctx.fillStyle = d.color; ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy); }
  ctx.fillStyle = '#334155';
  for (let gx = 0; gx <= 8; gx++) ctx.fillRect(mx + gx * 400 * sx, my, 2, mh);
  for (let gy = 0; gy <= 6; gy++) ctx.fillRect(mx, my + gy * 400 * sy, mw, 2);
  // Pay 'n Spray icon
  ctx.fillStyle = '#fb923c'; ctx.fillRect(mx + SPRAY.x * sx - 3, my + SPRAY.y * sy - 3, 6, 6);
  // Mission target
  if (s.target) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(mx + s.target.x * sx, my + s.target.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
  // Race checkpoints
  if (s.racePoints) for (const p of s.racePoints) { ctx.fillStyle = '#e879f9'; ctx.fillRect(mx + p.x * sx - 3, my + p.y * sy - 3, 6, 6); }
  // Getaway car
  if (s.getaway) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(mx + s.getaway.x * sx, my + s.getaway.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
  // Police (blue) + traffic (grey)
  for (const c of s.policeCars || []) { ctx.fillStyle = '#3b82f6'; ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4); }
  // Player (green, on top)
  const px = s.playerCar ? s.playerCar.x : s.player.x, py = s.playerCar ? s.playerCar.y : s.player.y;
  ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(mx + px * sx, my + py * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
}

export function drawTitle(ctx, vw, vh, hasSave) {
  ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, vw, vh);
  // Neon skyline bars
  const cols = ['#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#e879f9'];
  for (let i = 0; i < 24; i++) {
    const w = 30 + ((i * 37) % 50), h = 120 + ((i * 91) % 220);
    ctx.fillStyle = '#131a2e'; ctx.fillRect(i * 56, vh - h - 120, w, h);
    ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.85;
    ctx.fillRect(i * 56, vh - h - 124, w, 4); ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f472b6'; ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 30;
  ctx.fillText('NEON BAY', vw / 2, 190); ctx.shadowBlur = 0;
  ctx.fillStyle = '#67e8f9'; ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('an open-world driving game', vw / 2, 232);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Steal cars. Outrun the cops. Pay off the debt. 10 jobs. One neon city.', vw / 2, 268);
  ctx.fillStyle = '#facc15'; ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press ENTER to play' + (hasSave ? '  ·  C to continue saved game' : ''), vw / 2, 330);
  ctx.fillStyle = '#94a3b8'; ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD drive / walk · E enter or exit a car · M start mission · P pause', vw / 2, 366);
  ctx.fillText('Pay \'n Spray ($200) clears your wanted level and repairs your car.', vw / 2, 392);
  ctx.fillText('Day/night cycle · 7 vehicles · traffic & pedestrians · police chases', vw / 2, 418);
}

export function drawPause(ctx, vw, vh) {
  ctx.fillStyle = 'rgba(2,6,23,0.75)'; ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', vw / 2, vh / 2 - 40);
  ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#cbd5e1';
  ctx.fillText('P / Esc to resume · progress auto-saves', vw / 2, vh / 2);
}

export function drawHelp(ctx, vw, vh) {
  ctx.fillStyle = 'rgba(2,6,23,0.92)'; ctx.fillRect(vw / 2 - 300, 60, 600, 480);
  ctx.textAlign = 'left'; ctx.fillStyle = '#facc15'; ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('NEON BAY — how to play', vw / 2 - 280, 100);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'Walk with WASD. Press E near a car to steal and drive it.',
    'Press M to start the next job. Follow the yellow marker.',
    'Crimes raise your wanted level (stars). Police will chase you.',
    "Pay 'n Spray ($200) clears wanted and fully repairs your car.",
    'Missions 1–6 pay off your $5,000 debt. Jobs 7–10 are side jobs:',
    '  7 Taxi Fare $900 · 8 Race $3,000 · 9 Delivery $1,800 · 10 Vigilante $2,500',
    'The city changes after 20:00 — neon, headlights, lit windows.',
    'Your cash, jobs and debt save automatically. Press H to close.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, vw / 2 - 280, 135 + i * 28));
  ctx.fillStyle = '#facc15'; ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('Jobs:', vw / 2 - 280, 135 + lines.length * 28 + 10);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '14px system-ui, sans-serif';
  MISSIONS.forEach((m, i) => ctx.fillText(`${m.id}. ${m.name} — $${m.pay}`, vw / 2 - 280, 135 + lines.length * 28 + 36 + i * 20));
}
