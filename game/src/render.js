// Neon Bay — renderer: everything the camera sees, drawn on one canvas.
// Ground, roads with lane dashes, sidewalks, the park, the beach and sea,
// pseudo-3D buildings with soft shadows, cars, pedestrians, the player,
// skid marks, particles, bullets, the mission marker beacon and the
// waypoint arrow that always points at the objective.
import { CFG, PALETTE, VEHICLE_STATS } from './config.js';
import { worldWidth, worldHeight, roadCenter } from './world.js';

// True between 20:00 and 06:00 game time: neon on, headlights on.
export function isNight(G) {
  const m = G.clockMinutes;
  return m >= CFG.NIGHT_START_MINUTES || m < CFG.NIGHT_END_MINUTES;
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const stats = VEHICLE_STATS[car.type] || VEHICLE_STATS.sedan;
  const L = stats.length;
  const Wd = stats.width;
  if (car.type === 'bike') {
    // Motorbike: slim body, wheels, rider.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-L / 2 + 3, -Wd / 2 + 4, L, Wd);
    ctx.fillStyle = '#1c2733';
    ctx.beginPath(); ctx.arc(-L / 2 + 4, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(L / 2 - 4, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-L / 2 + 6, -Wd / 2, L - 12, Wd, 4);
    ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.beginPath(); ctx.arc(2, 0, 5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(L / 2 - 2, -2, 2, 4);
    ctx.restore();
    return;
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-L / 2 + 3, -Wd / 2 + 4, L, Wd);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 6);
  ctx.fill();
  // Cabin / windshield.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  const cabL = car.type === 'truck' ? 14 : car.type === 'van' ? 26 : 20;
  ctx.fillRect(-cabL / 2 + 2, -Wd / 2 + 4, cabL, Wd - 8);
  if (car.type === 'van') {
    // Cargo doors.
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(L / 2 - 16, -Wd / 2 + 3, 12, Wd - 6);
  }
  // Roof stripe for taxis, light bar for police.
  if (car.type === 'taxi') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-L / 2 + 6, -2, 10, 4);
  }
  if (car.type === 'police') {
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-6, -Wd / 2 - 1, 12, 5);
    ctx.fillStyle = '#2f7bff';
    ctx.fillRect(-6, Wd / 2 - 4, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.textAlign = 'left';
  }
  if (car.type === 'sport') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-L / 2 + 4, -Wd / 2 + 3, L - 8, 3);
  }
  // Headlights + brake lights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(L / 2 - 2, -Wd / 2 + 2, 2, 4);
  ctx.fillRect(L / 2 - 2, Wd / 2 - 6, 2, 4);
  ctx.fillStyle = car.brakeLight ? '#ff2222' : '#aa2222';
  ctx.fillRect(-L / 2, -Wd / 2 + 2, 2, 4);
  ctx.fillRect(-L / 2, Wd / 2 - 6, 2, 4);
  ctx.restore();
}

function drawPedShape(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = p.shirt;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(12, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(p.bob) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 7, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.arc(0, bob * 0.3, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(0, -9 + bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
  if (p.vip) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -2, 14, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerShape(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 8, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.angle);
  // Pistol arm when aiming with the mouse.
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(8, -2, 12, 4);
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath(); ctx.arc(0, -2, 6.5, Math.PI, 0); ctx.fill(); // hair
  ctx.restore();
}

function drawBuilding(ctx, b, t) {
  const h = b.height;
  const ox = -h * 0.22, oy = -h * 0.3;
  // Soft shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
  // Side walls (fake height).
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + ox, b.y + b.h + oy);
  ctx.lineTo(b.x + b.w + ox, b.y + b.h + oy); ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + ox, b.y + oy);
  ctx.lineTo(b.x + b.w + ox, b.y + b.h + oy); ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath(); ctx.fill();
  // Roof.
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x + ox, b.y + oy, b.w, b.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + ox, b.y + oy, b.w, b.h);
  // Rooftop detail: AC box / helipad ring on tall buildings.
  if (h > 60) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(b.x + ox + b.w / 2, b.y + oy + b.h / 2, Math.min(b.w, b.h) * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(b.x + ox + b.w / 2, b.y + oy + b.h / 2, Math.min(b.w, b.h) * 0.22, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(b.x + ox + 10, b.y + oy + 10, 16, 12);
  }
}

export function renderWorld(ctx, G, W, H) {
  const cam = G.camera;
  const p = G.player;
  const px = p.car ? p.car.x : p.x, py = p.car ? p.car.y : p.y;
  ctx.save();
  // Screen shake.
  if (G.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  }
  ctx.translate(W / 2 - cam.x, H / 2 - cam.y);
  const view = { x0: cam.x - W / 2 - 60, y0: cam.y - H / 2 - 60, x1: cam.x + W / 2 + 60, y1: cam.y + H / 2 + 60 };

  // Ground.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  // Beach + sea.
  const w = G.world;
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(w.beach.x, 0, w.beach.w, worldHeight());
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(w.water.x, 0, w.water.w, worldHeight());
  ctx.fillStyle = PALETTE.waterDeep;
  for (let i = 0; i < 5; i++) {
    const wy = ((G.time * 22 + i * 260) % worldHeight());
    ctx.fillRect(w.water.x + 30 + i * 44, wy, 90, 5);
  }
  // Marina dock.
  ctx.fillStyle = '#8a6d3b';
  ctx.fillRect(w.marina.x - 10, w.marina.y - 6, w.marina.w, 12);

  // Roads: asphalt bands + centre dashes.
  const P = CFG.BLOCK + CFG.ROAD;
  ctx.fillStyle = PALETTE.asphalt;
  for (let i = 0; i <= CFG.GRID; i++) {
    const c = roadCenter(i);
    ctx.fillRect(view.x0, c - CFG.ROAD / 2, view.x1 - view.x0, CFG.ROAD);
    ctx.fillRect(c - CFG.ROAD / 2, view.y0, CFG.ROAD, view.y1 - view.y0);
  }
  ctx.fillStyle = PALETTE.lane;
  for (let i = 0; i <= CFG.GRID; i++) {
    const c = roadCenter(i);
    for (let d = 0; d < worldWidth(); d += 46) {
      if (d > view.x0 - 46 && d < view.x1) ctx.fillRect(d, c - 1.5, 22, 3);
      if (d > view.y0 - 46 && d < view.y1) ctx.fillRect(c - 1.5, d, 3, 22);
    }
  }
  // Sidewalk rings around blocks.
  ctx.fillStyle = PALETTE.sidewalk;
  for (let bx = 0; bx < CFG.GRID; bx++) {
    for (let by = 0; by < CFG.GRID; by++) {
      const x0 = bx * P + CFG.ROAD - 7, y0 = by * P + CFG.ROAD - 7;
      ctx.fillRect(x0, y0, CFG.BLOCK + 14, 14);
      ctx.fillRect(x0, y0 + CFG.BLOCK, CFG.BLOCK + 14, 14);
      ctx.fillRect(x0, y0, 14, CFG.BLOCK + 14);
      ctx.fillRect(x0 + CFG.BLOCK, y0, 14, CFG.BLOCK + 14);
    }
  }
  // Park.
  if (w.park) {
    ctx.fillStyle = PALETTE.parkGrass;
    ctx.fillRect(w.park.x, w.park.y, w.park.w, w.park.h);
    ctx.fillStyle = PALETTE.parkPath;
    ctx.fillRect(w.park.x, w.park.y + w.park.h / 2 - 8, w.park.w, 16);
    ctx.fillRect(w.park.x + w.park.w / 2 - 8, w.park.y, 16, w.park.h);
    ctx.fillStyle = '#3f8fdb';
    ctx.beginPath(); ctx.arc(w.park.x + w.park.w * 0.7, w.park.y + w.park.h * 0.3, 26, 0, Math.PI * 2); ctx.fill();
  }
  // Parking lot.
  for (const lot of w.lots) {
    ctx.fillStyle = PALETTE.lot;
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const lx = lot.x + 26 + (i % 3) * 70, ly = lot.y + 30 + Math.floor(i / 3) * 90;
      ctx.strokeRect(lx, ly, 44, 66);
    }
  }
  // Pay 'n Spray garage on the lot: green roof, big sign, drive-in zone.
  if (w.garage) {
    const g = w.garage;
    ctx.fillStyle = '#1e7d46';
    ctx.fillRect(g.x + 40, g.y + 16, 160, 54);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(g.x + 40, g.y + 16, 160, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("PAY 'N SPRAY", g.x + 120, g.y + 40);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('$200 — LOSE THE HEAT', g.x + 120, g.y + 58);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(30,125,70,0.9)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(g.x + 8, g.y + 8, g.w - 16, g.h - 16);
    ctx.setLineDash([]);
  }
  // District names painted on the ground.
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  for (const d of w.districts) {
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(d.name, d.x, d.y);
  }
  ctx.textAlign = 'left';
  // Trees.
  for (const t of w.trees) {
    if (t.x < view.x0 || t.x > view.x1 || t.y < view.y0 || t.y > view.y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(t.x + 3, t.y + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f9e44';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37b24d';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // Buildings (only those in view).
  for (const b of w.buildings) {
    if (b.x > view.x1 || b.x + b.w < view.x0 || b.y > view.y1 || b.y + b.h < view.y0) continue;
    drawBuilding(ctx, b, G.time);
  }
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.4)';
  ctx.lineWidth = 5;
  for (const s of G.skidmarks) {
    ctx.globalAlpha = Math.min(1, s.life / 3);
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
    ctx.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Mission marker beacon.
  const target = G.mission.target;
  if (target) {
    const pulse = 1 + Math.sin(G.time * 4) * 0.12;
    ctx.fillStyle = 'rgba(255,215,0,0.18)';
    ctx.beginPath(); ctx.arc(target.x, target.y, 44 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(target.x, target.y, 40 * pulse, 0, Math.PI * 2); ctx.stroke();
    // Light column.
    const grad = ctx.createLinearGradient(target.x, target.y - 190, target.x, target.y);
    grad.addColorStop(0, 'rgba(255,215,0,0)');
    grad.addColorStop(1, 'rgba(255,215,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(target.x - 8, target.y - 190, 16, 190);
    // Floating diamond.
    ctx.fillStyle = '#ffd700';
    ctx.save();
    ctx.translate(target.x, target.y - 90 + Math.sin(G.time * 3) * 6);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
  }
  // Cars, sorted so lower ones draw on top.
  const cars = [...G.cars].sort((a, b) => a.y - b.y);
  for (const car of cars) drawCarShape(ctx, car);
  // Pedestrians.
  for (const ped of G.peds) drawPedShape(ctx, ped);
  // Foot cops.
  for (const cop of G.cops) {
    if (cop.kind !== 'foot') continue;
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 8, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.copBlue;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(-7, -4, 14, 4); // cap
    ctx.restore();
  }
  // Player (on foot only; in a car the car is the player).
  if (!p.car) drawPlayerShape(ctx, p);
  // Bullets.
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Particles.
  for (const pt of G.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    if (pt.kind === 'smoke') {
      ctx.fillStyle = 'rgba(120,120,120,' + (a * 0.5) + ')';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (2 - a), 0, Math.PI * 2); ctx.fill();
    } else if (pt.kind === 'sparks') {
      ctx.fillStyle = 'rgba(255,200,60,' + a + ')';
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    } else if (pt.kind === 'flash') {
      ctx.fillStyle = 'rgba(255,240,150,' + a + ')';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 4, 0, Math.PI * 2); ctx.fill();
    } else if (pt.kind === 'fire') {
      ctx.fillStyle = 'rgba(255,' + Math.floor(120 * a) + ',30,' + a + ')';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 3, 0, Math.PI * 2); ctx.fill();
    } else { // dust
      ctx.fillStyle = 'rgba(200,190,160,' + (a * 0.45) + ')';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Night: darkness falls, then pools of light — headlights, lit windows,
  // neon signs on tall buildings, and streetlamp glow at intersections.
  if (isNight(G)) {
    ctx.fillStyle = 'rgba(8,10,38,0.46)';
    ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    // Headlight cones from every car.
    for (const car of G.cars) {
      const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
      const grad = ctx.createLinearGradient(car.x, car.y, car.x + fx * 190, car.y + fy * 190);
      grad.addColorStop(0, 'rgba(255,244,180,0.30)');
      grad.addColorStop(1, 'rgba(255,244,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(car.x + fx * 20, car.y + fy * 20);
      ctx.lineTo(car.x + fx * 190 - fy * 42, car.y + fy * 190 + fx * 42);
      ctx.lineTo(car.x + fx * 190 + fy * 42, car.y + fy * 190 - fx * 42);
      ctx.closePath(); ctx.fill();
    }
    // Lit windows and neon on the buildings in view.
    const NEON = ['#ff2d95', '#00e5ff', '#39ff88', '#ffea00'];
    let ni = 0;
    for (const b of w.buildings) {
      if (b.x > view.x1 || b.x + b.w < view.x0 || b.y > view.y1 || b.y + b.h < view.y0) continue;
      const ox = -b.height * 0.22, oy = -b.height * 0.3;
      ctx.fillStyle = 'rgba(255,214,110,0.9)';
      const wins = 2 + ((b.x + b.y) % 3);
      for (let k = 0; k < wins; k++) {
        ctx.fillRect(b.x + ox + 12 + k * 26, b.y + oy + 12 + (k % 2) * 20, 10, 8);
      }
      if (b.height > 55) {
        ctx.fillStyle = NEON[ni++ % NEON.length];
        ctx.globalAlpha = 0.9;
        ctx.fillRect(b.x + ox + 10, b.y + oy + 4, Math.max(24, b.w - 20), 6);
        ctx.globalAlpha = 1;
      }
    }
    // Streetlamp pools at the intersections in view.
    for (let i = 0; i <= CFG.GRID; i++) {
      for (let j = 0; j <= CFG.GRID; j++) {
        const lx = roadCenter(i), ly = roadCenter(j);
        if (lx < view.x0 || lx > view.x1 || ly < view.y0 || ly > view.y1) continue;
        const lg = ctx.createRadialGradient(lx, ly, 4, lx, ly, 80);
        lg.addColorStop(0, 'rgba(255,220,130,0.20)');
        lg.addColorStop(1, 'rgba(255,220,130,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(lx, ly, 80, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // Waypoint arrow at the screen edge, pointing at the mission marker.
  if (target) {
    const dx = target.x - px, dy = target.y - py;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const edge = 46;
    let ax = W / 2 + Math.cos(ang) * (Math.min(W, H) / 2 - edge);
    let ay = H / 2 + Math.sin(ang) * (Math.min(W, H) / 2 - edge);
    // If the marker is on screen, float the arrow above it instead.
    const sx = target.x - cam.x + W / 2, sy = target.y - cam.y + H / 2;
    if (sx > 60 && sx < W - 60 && sy > 60 && sy < H - 60) { ax = sx; ay = sy - 66; }
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-4, 0); ctx.lineTo(-10, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(dist) + 'm', ax, ay + 26);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Day vignette: warm sun-soaked light, darker at the corners.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(255,240,200,0)');
  vg.addColorStop(1, 'rgba(20,20,60,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
