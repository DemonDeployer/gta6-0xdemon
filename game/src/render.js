// Neon Bay — canvas rendering: city, cars, people, night lighting, effects.
import { WORLD, DISTRICTS, SPRAY, VEHICLES } from './config.js';

export function drawCity(ctx, city, cam, vw, vh, night) {
  const x0 = cam.x, y0 = cam.y, x1 = cam.x + vw, y1 = cam.y + vh;
  // Ground
  ctx.fillStyle = '#10141f'; ctx.fillRect(0, 0, vw, vh);
  // Districts
  for (const d of DISTRICTS) {
    if (d.x > x1 || d.x + d.w < x0 || d.y > y1 || d.y + d.h < y0) continue;
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x - x0, d.y - y0, d.w, d.h);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = night ? d.label : 'rgba(148,163,184,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, d.x + d.w / 2 - x0, d.y + d.h / 2 - y0);
  }
  // Water (bay, east edge)
  ctx.fillStyle = night ? '#0a1a2e' : '#155e75';
  ctx.fillRect(2950 - x0, 0, WORLD.w - 2950, WORLD.h);
  ctx.fillStyle = '#fcd34d'; ctx.fillRect(2920 - x0, 0, 30, WORLD.h); // beach sand
  // Roads
  ctx.fillStyle = night ? '#1e293b' : '#334155';
  for (let gx = 0; gx <= WORLD.w / WORLD.block; gx++) ctx.fillRect(gx * WORLD.block - x0, 0, WORLD.road, WORLD.h);
  for (let gy = 0; gy <= WORLD.h / WORLD.block; gy++) ctx.fillRect(0, gy * WORLD.block - y0, WORLD.w, WORLD.road);
  // Road centre dashes
  ctx.fillStyle = night ? '#475569' : '#94a3b8';
  for (let gx = 0; gx <= WORLD.w / WORLD.block; gx++) {
    for (let y = 0; y < WORLD.h; y += 64) ctx.fillRect(gx * WORLD.block + WORLD.road / 2 - 2 - x0, y - y0, 4, 28);
  }
  for (let gy = 0; gy <= WORLD.h / WORLD.block; gy++) {
    for (let x = 0; x < WORLD.w; x += 64) ctx.fillRect(x - x0, gy * WORLD.block + WORLD.road / 2 - 2 - y0, 28, 4);
  }
  // Trees
  for (const t of city.trees) {
    if (t.x < x0 - 20 || t.x > x1 + 20 || t.y < y0 - 20 || t.y > y1 + 20) continue;
    ctx.fillStyle = night ? '#14532d' : '#166534';
    ctx.beginPath(); ctx.arc(t.x - x0, t.y - y0, t.r, 0, Math.PI * 2); ctx.fill();
  }
  // Buildings
  for (const b of city.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = b.hue; ctx.fillRect(b.x - x0, b.y - y0, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(b.x - x0, b.y - y0, b.w, b.h);
    // Windows light up at night
    const cols = Math.max(1, Math.floor(b.w / 22)), rows = Math.max(1, Math.floor(b.h / 22));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const lit = night ? ((i * 7 + j * 13 + (b.x | 0)) % 5 < 2) : false;
      ctx.fillStyle = lit ? '#fde68a' : 'rgba(148,163,184,0.25)';
      ctx.fillRect(b.x - x0 + 6 + i * 22, b.y - y0 + 6 + j * 22, 10, 12);
    }
    if (b.neon) { // neon sign strip on the roof edge
      ctx.fillStyle = b.neon; ctx.globalAlpha = night ? 0.95 : 0.45;
      ctx.fillRect(b.x - x0, b.y - y0 - 3, b.w, 5); ctx.globalAlpha = 1;
    }
  }
  // Neon signs (glow at night)
  for (const s of city.signs) {
    if (s.x < x0 - 60 || s.x > x1 + 60 || s.y < y0 - 60 || s.y > y1 + 60) continue;
    ctx.globalAlpha = night ? 1 : 0.35;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color; ctx.shadowBlur = night ? 16 : 4;
    ctx.fillRect(s.x - x0, s.y - y0, s.w, s.h);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // Pay 'n Spray garage
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(SPRAY.x - x0, SPRAY.y - y0, SPRAY.w, SPRAY.h);
  ctx.fillStyle = '#fb923c'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("PAY 'N SPRAY", SPRAY.x + SPRAY.w / 2 - x0, SPRAY.y + 20 - y0);
  ctx.fillStyle = '#fdba74'; ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('$200 · clears wanted · full repair', SPRAY.x + SPRAY.w / 2 - x0, SPRAY.y + 38 - y0);
  ctx.fillStyle = '#431407'; ctx.fillRect(SPRAY.x + 14 - x0, SPRAY.y + 48 - y0, SPRAY.w - 28, 30);
}

export function drawCar(ctx, car, cam, night, isPlayer) {
  const def = VEHICLES[car.type];
  const x = car.x - cam.x, y = car.y - cam.y;
  ctx.save(); ctx.translate(x, y); ctx.rotate(car.angle);
  // Headlight cones at night
  if (night) {
    ctx.fillStyle = 'rgba(253,230,138,0.13)';
    ctx.beginPath(); ctx.moveTo(def.len / 2, -8); ctx.lineTo(def.len / 2 + 150, -52); ctx.lineTo(def.len / 2 + 150, 52); ctx.lineTo(def.len / 2, 8); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-def.len / 2 + 3, -def.wid / 2 + 3, def.len, def.wid);
  ctx.fillStyle = car.color;
  ctx.beginPath(); ctx.roundRect(-def.len / 2, -def.wid / 2, def.len, def.wid, 6); ctx.fill();
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.beginPath(); ctx.roundRect(-def.len / 6, -def.wid / 2 + 3, def.len / 3, def.wid - 6, 4); ctx.fill();
  if (car.type === 'police') {
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-def.len / 2 + 4, -def.wid / 2, 10, def.wid);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-def.len / 2 + 8, -def.wid / 2, 5, 5);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(-def.len / 2 + 8, def.wid / 2 - 5, 5, 5);
  }
  if (car.type === 'taxi') { ctx.fillStyle = '#111827'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  // Damage smoke
  if (car.hp < car.maxHp * 0.4) { ctx.fillStyle = 'rgba(100,116,139,0.7)'; ctx.beginPath(); ctx.arc(-def.len / 2 + 6, 0, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (isPlayer) {
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, def.len / 2 + 8, 0, Math.PI * 2); ctx.stroke();
  }
  // Health bar above damaged cars
  if (car.hp < car.maxHp) {
    ctx.fillStyle = '#111827'; ctx.fillRect(x - 20, y - def.wid / 2 - 12, 40, 5);
    ctx.fillStyle = car.hp > car.maxHp * 0.5 ? '#4ade80' : '#ef4444';
    ctx.fillRect(x - 20, y - def.wid / 2 - 12, 40 * (car.hp / car.maxHp), 5);
  }
}

export function drawPed(ctx, p, cam) {
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y - 2, 2, 0, Math.PI * 2); ctx.fill();
}

export function drawPlayer(ctx, p, cam) {
  const x = p.x - cam.x, y = p.y - cam.y;
  ctx.fillStyle = '#f97316';
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(x, y - 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
}

export function drawMarker(ctx, x, y, cam, color, label) {
  const sx = x - cam.x, sy = y - cam.y;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 10, sy + 6); ctx.lineTo(sx - 10, sy + 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  if (label) {
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.fillText(label, sx, sy - 20);
  }
}

export function drawNightOverlay(ctx, vw, vh, night, timeH) {
  if (!night) return;
  const dark = timeH >= 20 || timeH < 5 ? 0.34 : 0.22;
  ctx.fillStyle = `rgba(8,10,40,${dark})`;
  ctx.fillRect(0, 0, vw, vh);
}

export function drawStreetlamps(ctx, cam, vw, vh, night) {
  if (!night) return;
  ctx.fillStyle = 'rgba(253,230,138,0.10)';
  for (let gx = 0; gx <= 8; gx++) for (let gy = 0; gy <= 6; gy++) {
    const x = gx * 400 + 48 - cam.x, y = gy * 400 + 48 - cam.y;
    if (x < -80 || x > vw + 80 || y < -80 || y > vh + 80) continue;
    ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
  }
}
