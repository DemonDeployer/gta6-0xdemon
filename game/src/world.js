// Neon Bay — the city: roads, buildings, districts, traffic + pedestrian spawns.
// Roads are a grid (every 400px); buildings fill the blocks between them.
import { WORLD, DISTRICTS, VEHICLES, VEHICLE_TYPES } from './config.js';
import { mulberry32, rngInt, rngPick, clamp } from './random.js';

export function isRoad(x, y) {
  const rx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const ry = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  return rx < WORLD.road || ry < WORLD.road || rx > WORLD.block - 0 || ry > WORLD.block - 0;
}
export function onRoad(x, y) {
  const rx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const ry = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  return rx < WORLD.road / 2 + 24 || ry < WORLD.road / 2 + 24;
}
export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return null;
}
export function isWater(x, y) { return x > 2950 || (y < 120 && x > 2400); } // bay east edge + beach shallows

export function buildCity(seed = 1337) {
  const rng = mulberry32(seed);
  const buildings = [];
  for (let bx = 0; bx < WORLD.w / WORLD.block; bx++) {
    for (let by = 0; by < WORLD.h / WORLD.block; by++) {
      const x0 = bx * WORLD.block + WORLD.road + 14;
      const y0 = by * WORLD.block + WORLD.road + 14;
      const bw = WORLD.block - WORLD.road - 28;
      const bh = WORLD.block - WORLD.road - 28;
      // Skip the Pay 'n Spray lot and the park's open green.
      if (bx === 2 && by === 3) continue;
      if (bx >= 3 && bx <= 4 && by === 0) continue; // Bay Park green
      const n = rngInt(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const w = rngInt(rng, 60, Math.max(70, Math.floor(bw / n)));
        const h = rngInt(rng, 60, Math.max(70, Math.floor(bh / 1)));
        const x = x0 + (i * bw) / n + rngInt(rng, 0, 20);
        const y = y0 + rngInt(rng, 0, Math.max(0, bh - h));
        const d = districtAt(x + w / 2, y + h / 2);
        buildings.push({
          x, y, w: Math.min(w, bw), h: Math.min(h, bh),
          tall: d && d.name === 'Downtown' ? rng() < 0.7 : rng() < 0.15,
          hue: rngPick(rng, ['#2b3247', '#33283f', '#24303a', '#3a2f2a', '#262b3a']),
          neon: rng() < 0.35 ? rngPick(rng, ['#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#e879f9']) : null,
        });
      }
    }
  }
  // Neon signs along the beach strip + downtown.
  const signs = [];
  for (let i = 0; i < 26; i++) {
    signs.push({
      x: rngInt(rng, 2450, 3050), y: rngInt(rng, 80, 850),
      color: rngPick(rng, ['#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#e879f9', '#facc15']),
      w: rngInt(rng, 40, 90), h: 10,
    });
  }
  for (let i = 0; i < 18; i++) {
    signs.push({
      x: rngInt(rng, 1150, 2050), y: rngInt(rng, 750, 1450),
      color: rngPick(rng, ['#22d3ee', '#f472b6', '#a3e635', '#e879f9']),
      w: rngInt(rng, 36, 80), h: 10,
    });
  }
  // Trees in Bay Park + along the beach.
  const trees = [];
  for (let i = 0; i < 60; i++) trees.push({ x: rngInt(rng, 1150, 1950), y: rngInt(rng, 60, 560), r: rngInt(rng, 8, 16) });
  for (let i = 0; i < 24; i++) trees.push({ x: rngInt(rng, 2450, 2900), y: rngInt(rng, 900, 1350), r: rngInt(rng, 8, 14) });
  return { buildings, signs, trees, seed };
}

// Point inside a building? (collision for cars + player)
export function hitBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}
export function clampWorld(x, y) {
  return { x: clamp(x, 20, WORLD.w - 20), y: clamp(y, 20, WORLD.h - 20) };
}

// --- traffic + pedestrians -------------------------------------------------
export function spawnTraffic(rng, n = 14) {
  const cars = [];
  const types = ['sedan', 'sedan', 'sport', 'taxi', 'truck', 'van', 'bike', 'van', 'taxi', 'bike'];
  for (let i = 0; i < n; i++) {
    const horizontal = rng() < 0.5;
    const gx = rngInt(rng, 0, 7), gy = rngInt(rng, 0, 5);
    const x = horizontal ? rngInt(rng, 60, WORLD.w - 60) : gx * WORLD.block + WORLD.road / 2;
    const y = horizontal ? gy * WORLD.block + WORLD.road / 2 : rngInt(rng, 60, WORLD.h - 60);
    const type = rngPick(rng, types);
    cars.push({
      id: i, type, x, y, angle: horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 0, targetSpeed: rngInt(rng, 55, 95), hp: VEHICLES[type].hp, driver: true, color: VEHICLES[type].color,
    });
  }
  return cars;
}
export function spawnPeds(rng, n = 26) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    peds.push({
      x: rngInt(rng, 60, WORLD.w - 60), y: rngInt(rng, 60, WORLD.h - 60),
      angle: rng() * Math.PI * 2, speed: rngInt(rng, 18, 34),
      color: rngPick(rng, ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#e2e8f0']),
      t: rng() * 10,
    });
  }
  return peds;
}
export function updateTraffic(cars, dt, city) {
  for (const c of cars) {
    if (!c.driver) continue; // parked / stolen-from cars sit still
    c.speed += (c.targetSpeed - c.speed) * Math.min(1, dt * 0.8);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // Stay on roads: if the next step leaves the road band, turn at the intersection.
    if (!onRoad(nx, ny) || hitBuilding(city, nx, ny, 12)) {
      const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      c.angle += turn;
      c.speed *= 0.4;
    } else { c.x = nx; c.y = ny; }
    if (c.x < 40 || c.x > WORLD.w - 40 || c.y < 40 || c.y > WORLD.h - 40) c.angle += Math.PI;
  }
}
export function updatePeds(peds, dt, city) {
  for (const p of peds) {
    p.t -= dt;
    if (p.t <= 0) { p.angle = Math.random() * Math.PI * 2; p.t = 2 + Math.random() * 5; }
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (!hitBuilding(city, nx, ny, 6)) { p.x = nx; p.y = ny; }
    else p.angle += Math.PI / 2;
    const c = clampWorld(p.x, p.y); p.x = c.x; p.y = c.y;
  }
}
