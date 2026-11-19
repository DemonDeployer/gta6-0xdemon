// Neon Bay — procedural city: roads, blocks, buildings, beach, park, lot.
// The world is a fixed grid so every system (traffic, police, missions, the
// minimap) can ask the same questions: is this point on a road? does this
// circle hit a building? where is the nearest road centre?
import { CFG, PALETTE } from './config.js';

export function pitch() { return CFG.BLOCK + CFG.ROAD; }

// World extents in pixels.
export function worldWidth() { return (CFG.GRID + 1) * CFG.ROAD + CFG.GRID * CFG.BLOCK + CFG.BEACH_W + CFG.WATER_W; }
export function worldHeight() { return (CFG.GRID + 1) * CFG.ROAD + CFG.GRID * CFG.BLOCK; }

// Centre of road number i (0..GRID) on one axis.
export function roadCenter(i) { return i * pitch() + CFG.ROAD / 2; }

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld() {
  const rand = mulberry32(20261118);
  const world = {
    buildings: [],   // {x, y, w, h, height, color, roof}
    trees: [],       // {x, y, r}
    lots: [],        // parking lot rects {x, y, w, h}
    park: null,      // {x, y, w, h}
    beach: null,     // {x, y, w, h}
    water: null,     // {x, y, w, h}
    hospital: null,  // respawn point {x, y}
    marina: null,    // east-coast landmark {x, y}
    garage: null,    // Pay 'n Spray: drive in, pay, lose the heat {x, y, w, h}
    districts: [],   // named neighbourhoods, drawn on the ground {x, y, name}
  };

  const P = pitch();
  const beachX = (CFG.GRID + 1) * CFG.ROAD + CFG.GRID * CFG.BLOCK;
  world.beach = { x: beachX, y: 0, w: CFG.BEACH_W, h: worldHeight() };
  world.water = { x: beachX + CFG.BEACH_W, y: 0, w: CFG.WATER_W, h: worldHeight() };
  world.marina = { x: beachX + 60, y: roadCenter(2), w: 120, h: 40 };

  // Blocks: each grid cell is either buildings, the park, or the parking lot.
  for (let bx = 0; bx < CFG.GRID; bx++) {
    for (let by = 0; by < CFG.GRID; by++) {
      const x0 = bx * P + CFG.ROAD;
      const y0 = by * P + CFG.ROAD;
      const w = CFG.BLOCK, h = CFG.BLOCK;
      if (bx === CFG.PARK_BX && by === CFG.PARK_BY) {
        world.park = { x: x0, y: y0, w, h };
        for (let t = 0; t < 14; t++) {
          world.trees.push({ x: x0 + 25 + rand() * (w - 50), y: y0 + 25 + rand() * (h - 50), r: 9 + rand() * 7 });
        }
        continue;
      }
      if (bx === CFG.LOT_BX && by === CFG.LOT_BY) {
        world.lots.push({ x: x0, y: y0, w, h });
        continue;
      }
      // 1–4 buildings per block, leaving sidewalk gaps inside the block.
      const count = 1 + Math.floor(rand() * 3.5);
      const cols = count > 2 ? 2 : 1;
      const rows = Math.ceil(count / cols);
      for (let i = 0; i < count; i++) {
        const cx = i % cols, cy = Math.floor(i / cols);
        const bw = w / cols - 34, bh = h / rows - 34;
        const bx0 = x0 + 17 + cx * (w / cols);
        const by0 = y0 + 17 + cy * (h / rows);
        const height = 22 + rand() * 78;
        const color = PALETTE.buildingRoof[Math.floor(rand() * PALETTE.buildingRoof.length)];
        world.buildings.push({ x: bx0, y: by0, w: bw, h: bh, height, color });
      }
      // A couple of street trees on block corners.
      if (rand() < 0.6) world.trees.push({ x: x0 + 14, y: y0 + 14, r: 8 + rand() * 4 });
      if (rand() < 0.6) world.trees.push({ x: x0 + w - 14, y: y0 + h - 14, r: 8 + rand() * 4 });
    }
  }

  // Hospital (respawn point) sits on the west edge, block (0, 0) corner.
  world.hospital = { x: roadCenter(0), y: roadCenter(0) };
  // Pay 'n Spray occupies the parking-lot block: drive onto the lot and the
  // shop clears your wanted level and repairs the car for a flat fee.
  const lotBx = CFG.LOT_BX, lotBy = CFG.LOT_BY;
  world.garage = {
    x: lotBx * P + CFG.ROAD, y: lotBy * P + CFG.ROAD,
    w: CFG.BLOCK, h: CFG.BLOCK,
  };
  // Named districts, so the city reads as a place with neighbourhoods.
  world.districts = [
    { x: roadCenter(2), y: roadCenter(2), name: 'DOWNTOWN' },
    { x: roadCenter(8), y: roadCenter(2), name: 'DOCKS' },
    { x: roadCenter(5), y: roadCenter(5), name: 'BAY PARK' },
    { x: roadCenter(2), y: roadCenter(8), name: 'PAY \'N SPRAY' },
    { x: roadCenter(8), y: roadCenter(8), name: 'MARINA' },
    { x: beachX + CFG.BEACH_W / 2, y: roadCenter(5), name: 'NEON BEACH' },
  ];
  return world;
}

// --- queries ---------------------------------------------------------------

// True when the point is on asphalt (a road band in either direction).
export function isRoad(x, y) {
  const P = pitch();
  const inBand = (v) => {
    const m = ((v % P) + P) % P;
    return m < CFG.ROAD;
  };
  return inBand(x) || inBand(y);
}

// True when the point is on a sidewalk ring around a block.
export function isSidewalk(x, y) {
  if (isRoad(x, y)) return false;
  const P = pitch();
  const mx = ((x % P) + P) % P, my = ((y % P) + P) % P;
  return mx < CFG.ROAD + 14 || mx > P - 14 || my < CFG.ROAD + 14 || my > P - 14;
}

// Circle-vs-building collision. Returns the building hit, or null.
export function hitBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of buildings and the world bounds. Mutates pos {x, y}.
export function resolveBuildingCollision(world, pos, r) {
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - cx, dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * r;
        pos.y = cy + (dy / d) * r;
      } else {
        pos.y = b.y - r; // centre inside the rect: push out the top
      }
      return b;
    }
  }
  pos.x = Math.max(r, Math.min(worldWidth() - CFG.WATER_W - r, pos.x));
  pos.y = Math.max(r, Math.min(worldHeight() - r, pos.y));
  return null;
}

// Nearest point on a road centreline (used for spawning traffic and peds).
export function nearestRoadPoint(x, y) {
  const P = pitch();
  const snap = (v) => {
    const i = Math.round((v - CFG.ROAD / 2) / P);
    const c = Math.max(0, Math.min(CFG.GRID, i));
    return roadCenter(c);
  };
  // Pick whichever axis is closer to a road centre.
  const dx = Math.abs(x - snap(x));
  const dy = Math.abs(y - snap(y));
  if (dx <= dy) return { x: snap(x), y };
  return { x, y: snap(y) };
}

// A random point on a road, optionally far from (fx, fy).
export function randomRoadPoint(rand, fx = -1, fy = -1, minDist = 0) {
  for (let tries = 0; tries < 40; tries++) {
    const horizontal = rand() < 0.5;
    const road = Math.floor(rand() * (CFG.GRID + 1));
    const along = CFG.ROAD + rand() * (worldHeight() - CFG.ROAD * 2);
    const p = horizontal
      ? { x: along, y: roadCenter(road) }
      : { x: roadCenter(road), y: along };
    if (minDist > 0 && fx >= 0) {
      const d = Math.hypot(p.x - fx, p.y - fy);
      if (d < minDist) continue;
    }
    return p;
  }
  return { x: roadCenter(3), y: roadCenter(3) };
}

// Lane offset for right-hand traffic on a road heading `angle`.
export function laneOffset(angle) {
  return { x: Math.cos(angle + Math.PI / 2) * 15, y: Math.sin(angle + Math.PI / 2) * 15 };
}
