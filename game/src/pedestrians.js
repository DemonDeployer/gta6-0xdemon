// Neon Bay — pedestrians: city folk strolling the sidewalks.
// They walk along sidewalk lines, turn at intersections, and run away from
// speeding cars, gunshots and the player's fists. Running one over is a crime.
import { CFG } from './config.js';
import { randomRoadPoint, worldWidth, worldHeight } from './world.js';

const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

export function makePed(x, y) {
  return {
    x, y,
    angle: Math.random() * Math.PI * 2,
    speed: 34 + Math.random() * 30,
    shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
    skin: ['#f1c27d', '#e0ac69', '#8d5524', '#ffdbac'][Math.floor(Math.random() * 4)],
    state: 'walk',       // walk | flee | down
    fleeTimer: 0,
    targetAngle: Math.random() * Math.PI * 2,
    bob: Math.random() * 10,
    vip: false,
  };
}

export function spawnPed(G, x, y) {
  const p = makePed(x, y);
  G.peds.push(p);
  return p;
}

export function seedPeds(G, count = 26) {
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(Math.random);
    // Offset onto the sidewalk beside the road.
    spawnPed(G, p.x + 46, p.y + 46);
  }
}

// A scare source (fast car, gunshot, punch) makes nearby peds flee.
export function scarePeds(G, x, y, radius) {
  for (const p of G.peds) {
    if (p.state === 'down') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) {
      p.state = 'flee';
      p.fleeTimer = 2.5 + Math.random() * 2;
      p.targetAngle = Math.atan2(p.y - y, p.x - x);
    }
  }
}

export function updatePeds(G, dt) {
  const p0 = G.player;
  for (const p of G.peds) {
    if (p.state === 'down') continue;
    p.bob += dt * 8;
    if (p.state === 'flee') {
      p.fleeTimer -= dt;
      if (p.fleeTimer <= 0) p.state = 'walk';
      p.angle = p.targetAngle;
      p.x += Math.cos(p.angle) * 150 * dt;
      p.y += Math.sin(p.angle) * 150 * dt;
      continue;
    }
    // Ambling: keep walking, occasionally pick a new direction at random.
    if (Math.random() < dt * 0.12) {
      p.targetAngle = p.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) * (Math.random() < 0.7 ? 1 : 2);
    }
    let diff = p.targetAngle - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    // Stay on sidewalks / open ground: never walk through a building or the sea.
    if (!G.worldHit(nx, ny, 10) && nx > 10 && nx < worldWidth() - 280 && ny > 10 && ny < worldHeight() - 10) {
      p.x = nx; p.y = ny;
    } else {
      p.targetAngle = p.angle + Math.PI / 2;
    }
    // A fast car bearing down scares them off the road.
    const car = p0.car;
    if (car && Math.abs(car.speed) > 130) {
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      if (d < 130) {
        p.state = 'flee';
        p.fleeTimer = 2;
        p.targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
      }
    }
  }
  // Car-vs-pedestrian: running someone over is a crime and hurts.
  const car = p0.car;
  if (car && Math.abs(car.speed) > 40) {
    for (const p of G.peds) {
      if (p.state === 'down') continue;
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      if (d < 26) {
        p.state = 'down';
        G.addParticle(p.x, p.y, 'sparks', 5);
        G.addWanted(1, 'Pedestrian hit');
        G.shake = Math.max(G.shake, 5);
        G.audio.crash(0.6);
        scarePeds(G, p.x, p.y, 260);
      }
    }
  }
  // Keep the crowd topped up near the player.
  if (G.peds.length < 22 && Math.random() < dt * 0.8) {
    const rp = randomRoadPoint(Math.random, p0.x, p0.y, 420);
    spawnPed(G, rp.x + 46, rp.y + 46);
  }
  // Drop far-away downed peds so the array stays small.
  G.peds = G.peds.filter((p) => p.state !== 'down' ||
    Math.hypot(p.x - p0.x, p.y - p0.y) < 700);
}
