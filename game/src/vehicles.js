// Neon Bay — vehicles: traffic AI, parked cars, and player driving physics.
// Cars are simple arcade bodies: position, heading, speed, health. Traffic
// follows the road grid in lanes, stops for the car ahead, and turns at
// intersections. The player's car accelerates, brakes, steers and drifts.
import { CFG, PALETTE } from './config.js';
import { isDown } from './input.js';
import { damagePlayer } from './player.js';
import { isRoad, laneOffset, randomRoadPoint, roadCenter, worldWidth, worldHeight } from './world.js';

let carId = 1;

export function makeCar(x, y, angle, opts = {}) {
  return {
    id: carId++,
    x, y, angle,
    speed: opts.speed || 0,
    color: opts.color || PALETTE.carColors[Math.floor(Math.random() * PALETTE.carColors.length)],
    type: opts.type || 'sedan',       // sedan | sport | taxi | police | truck
    ai: !!opts.ai,
    driver: opts.driver || null,      // 'player' | 'traffic' | 'cop' | null (parked)
    parked: !!opts.parked,
    wasStolen: false,
    health: CFG.CAR_MAX_HEALTH,
    targetAngle: angle,
    stopped: false,
    honkTimer: 0,
    smokeTimer: 0,
    brakeLight: false,
  };
}

export function spawnTrafficCar(G, nearX, nearY) {
  const p = randomRoadPoint(Math.random, nearX, nearY, 500);
  const horizontal = Math.abs(p.y - roadCenter(Math.round((p.y - CFG.ROAD / 2) / (CFG.BLOCK + CFG.ROAD)))) < 2;
  const angle = horizontal
    ? (Math.random() < 0.5 ? 0 : Math.PI)
    : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  const off = laneOffset(angle);
  const type = Math.random() < 0.08 ? 'taxi' : (Math.random() < 0.08 ? 'truck' : 'sedan');
  const car = makeCar(p.x + off.x, p.y + off.y, angle, {
    ai: true, driver: 'traffic', speed: CFG.TRAFFIC_SPEED * (0.8 + Math.random() * 0.4), type,
    color: type === 'taxi' ? '#f2c14e' : undefined,
  });
  G.cars.push(car);
  return car;
}

export function spawnParkedCar(G, x, y, angle, color) {
  const car = makeCar(x, y, angle, { parked: true, color });
  G.cars.push(car);
  return car;
}

// Scatter parked cars in the parking lot and along road edges at start.
export function seedParkedCars(G) {
  const lot = G.world.lots[0];
  if (lot) {
    for (let i = 0; i < 6; i++) {
      const x = lot.x + 40 + (i % 3) * 70;
      const y = lot.y + 50 + Math.floor(i / 3) * 90;
      spawnParkedCar(G, x, y, Math.PI / 2);
    }
  }
  for (let i = 0; i < 10; i++) {
    const p = randomRoadPoint(Math.random);
    const angle = Math.random() < 0.5 ? 0 : Math.PI / 2;
    const off = laneOffset(angle);
    // Park just off the road edge so it reads as kerbside parking.
    const px = p.x + off.x * 1.6, py = p.y + off.y * 1.6;
    if (isRoad(px, py)) continue;
    spawnParkedCar(G, px, py, angle);
  }
}

// --- traffic AI ------------------------------------------------------------

// Is there a car ahead of `car` within `dist` along its heading?
function carAhead(G, car, dist) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  for (const o of G.cars) {
    if (o === car) continue;
    const dx = o.x - car.x, dy = o.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    if (along > 0 && along < dist && side < 26) return o;
  }
  return null;
}

function updateTrafficCar(G, car, dt) {
  // At an intersection, sometimes turn onto the crossing road.
  const onH = Math.abs(car.y - Math.round((car.y - CFG.ROAD / 2) / (CFG.BLOCK + CFG.ROAD)) * (CFG.BLOCK + CFG.ROAD) - CFG.ROAD / 2) < 6;
  const onV = Math.abs(car.x - Math.round((car.x - CFG.ROAD / 2) / (CFG.BLOCK + CFG.ROAD)) * (CFG.BLOCK + CFG.ROAD) - CFG.ROAD / 2) < 6;
  if ((onH || onV) && Math.random() < dt * 0.25) {
    const turns = [0, Math.PI / 2, -Math.PI / 2];
    car.targetAngle = car.angle + turns[Math.floor(Math.random() * turns.length)];
  }
  // Steer toward the target heading.
  let diff = car.targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
  // Stop for the car ahead, or for a pedestrian crossing.
  const ahead = carAhead(G, car, 78);
  const pedAhead = G.peds.some((p) => {
    const dx = p.x - car.x, dy = p.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(dx * -Math.sin(car.angle) + dy * Math.cos(car.angle));
    return along > 0 && along < 60 && side < 24;
  });
  const wantSpeed = (ahead || pedAhead) ? 0 : CFG.TRAFFIC_SPEED;
  car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 1.8);
  car.stopped = car.speed < 4 && (ahead || pedAhead);
  // Keep to the lane: nudge back toward the road centre line.
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const off = laneOffset(car.angle);
  const cx = car.x - off.x, cy = car.y - off.y;
  const roadX = Math.round((cx - CFG.ROAD / 2) / (CFG.BLOCK + CFG.ROAD)) * (CFG.BLOCK + CFG.ROAD) + CFG.ROAD / 2;
  const roadY = Math.round((cy - CFG.ROAD / 2) / (CFG.BLOCK + CFG.ROAD)) * (CFG.BLOCK + CFG.ROAD) + CFG.ROAD / 2;
  const horizontal = Math.abs(fy) < 0.7;
  if (horizontal) car.y += (roadY - car.y) * Math.min(1, dt * 1.2);
  else car.x += (roadX - car.x) * Math.min(1, dt * 1.2);

  car.x += fx * car.speed * dt;
  car.y += fy * car.speed * dt;
  // Wrap around the world edges so traffic never runs dry.
  if (car.x < -60) car.x = worldWidth() - CFG.WATER_W + 40;
  if (car.x > worldWidth() - CFG.WATER_W + 60) car.x = -40;
  if (car.y < -60) car.y = worldHeight() + 40;
  if (car.y > worldHeight() + 60) car.y = -40;
  car.brakeLight = car.speed < 20 && (ahead || pedAhead);
}

// --- player driving ---------------------------------------------------------

export function updatePlayerCar(G, dt) {
  const car = G.player.car;
  if (!car) return;
  const input = G.input;
  const forward = isDown(input, 'w', 'arrowup');
  const back = isDown(input, 's', 'arrowdown');
  const left = isDown(input, 'a', 'arrowleft');
  const right = isDown(input, 'd', 'arrowright');

  if (forward) car.speed += CFG.CAR_ACCEL * dt;
  else if (back) {
    if (car.speed > 8) car.speed -= CFG.CAR_BRAKE * dt; // brake
    else car.speed -= CFG.CAR_ACCEL * 0.55 * dt;        // reverse
  } else {
    car.speed -= Math.sign(car.speed) * 90 * dt;        // drag
    if (Math.abs(car.speed) < 6) car.speed = 0;
  }
  car.speed = Math.max(-CFG.CAR_MAX_REVERSE, Math.min(CFG.CAR_MAX_SPEED, car.speed));
  car.brakeLight = back && car.speed > 8;

  // Steering scales with speed; reversing flips it. Handbrake (space) drifts.
  const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
  const spd = Math.abs(car.speed);
  const grip = isDown(input, ' ') ? 0.45 : 1;
  if (steerInput !== 0 && spd > 4) {
    car.angle += steerInput * CFG.CAR_TURN * (spd / CFG.CAR_MAX_SPEED) * 1.6 * Math.sign(car.speed) * dt * grip * 2.2;
    if (spd > 180 && Math.random() < dt * 14) {
      // Skid marks + tyre smoke while cornering hard.
      const bx = car.x - Math.cos(car.angle) * 18, by = car.y - Math.sin(car.angle) * 18;
      G.skidmarks.push({ x: bx, y: by, angle: car.angle, life: 5 });
      if (G.skidmarks.length > 220) G.skidmarks.shift();
      G.addParticle(bx, by, 'smoke', 1);
    }
  }
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  car.x += fx * car.speed * dt;
  car.y += fy * car.speed * dt;

  // Collide with buildings: bounce off with damage.
  const hit = G.worldHit(car.x, car.y, 20);
  if (hit) {
    const impact = Math.abs(car.speed);
    if (impact > 60) {
      car.health -= impact * 0.06;
      G.audio.crash(Math.min(1, impact / 400));
      G.shake = Math.max(G.shake, Math.min(12, impact / 30));
      G.addParticle(car.x, car.y, 'sparks', 8);
      if (impact > 200) damagePlayer(G, impact * 0.02, 'You crashed');
    }
    car.speed *= -0.25;
    car.x -= fx * car.speed * dt * 2;
    car.y -= fy * car.speed * dt * 2;
  }
  car.x = Math.max(20, Math.min(worldWidth() - CFG.WATER_W - 20, car.x));
  car.y = Math.max(20, Math.min(worldHeight() - 20, car.y));

  // Smoking wreck.
  if (car.health < 40) {
    car.smokeTimer -= dt;
    if (car.smokeTimer <= 0) {
      car.smokeTimer = 0.12;
      G.addParticle(car.x, car.y - 6, 'smoke', 1);
    }
  }
  if (car.health <= 0) {
    car.health = 0;
    G.addParticle(car.x, car.y, 'fire', 10);
    G.audio.crash(1);
    G.player.car = null;
    car.driver = null;
    car.speed = 0;
    damagePlayer(G, 15, 'Your car blew up');
  }
  G.audio.setEngine(Math.abs(car.speed) / CFG.CAR_MAX_SPEED, true);
}

// --- car-vs-car --------------------------------------------------------------

export function resolveCarCollisions(G, dt) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 90) {
          G.audio.crash(Math.min(1, impact / 400));
          G.addParticle((a.x + b.x) / 2, (a.y + b.y) / 2, 'sparks', 6);
          G.shake = Math.max(G.shake, 4);
          a.health -= impact * 0.04;
          b.health -= impact * 0.04;
          a.speed *= 0.6; b.speed *= 0.6;
          if (a.driver === 'player' || b.driver === 'player') {
            damagePlayer(G, impact * 0.015, 'Car crash');
          }
        }
      }
    }
  }
}

export function updateVehicles(G, dt) {
  // Keep a healthy amount of traffic near the player.
  const near = G.cars.filter((c) => c.ai && c.driver === 'traffic').length;
  if (near < 14 && Math.random() < dt * 1.5) spawnTrafficCar(G, G.player.x, G.player.y);
  for (const car of G.cars) {
    if (car.ai && car.driver === 'traffic') updateTrafficCar(G, car, dt);
    else if (car.ai && car.driver === 'cop') { /* police.js drives cop cars */ }
  }
  updatePlayerCar(G, dt);
  resolveCarCollisions(G, dt);
  // Cull dead wrecks far away (keep the world tidy).
  G.cars = G.cars.filter((c) => c.health > 0 || c.driver === 'player' ||
    Math.hypot(c.x - G.player.x, c.y - G.player.y) < 900);
}
