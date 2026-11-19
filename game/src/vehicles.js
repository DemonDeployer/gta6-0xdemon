// Neon Bay — vehicles: handling, driving physics, stealing, damage.
import { VEHICLES } from './config.js';
import { clamp, dist, normAngle } from './random.js';
import { hitBuilding, clampWorld } from './world.js';

export function makeCar(type, x, y, angle = 0, driver = true) {
  const def = VEHICLES[type];
  return {
    type, x, y, angle, speed: 0, hp: def.hp, maxHp: def.hp,
    driver, color: def.color, id: Math.floor(Math.random() * 1e9),
  };
}
export function vehicleName(car) { return car ? VEHICLES[car.type].name : 'On foot'; }
export function speedKmh(car) { return Math.round(Math.abs(car.speed) * 1.6); }

// Drive one step. Returns events: { hitWall, hitCar } for wanted/damage hooks.
export function driveCar(car, steer, throttle, handbrake, dt, city, others = []) {
  const def = VEHICLES[car.type];
  const ev = { hitWall: false, hitCar: false };
  const grip = def.grip;
  if (throttle > 0) car.speed += def.accel * throttle * dt;
  else if (throttle < 0) car.speed += def.accel * throttle * dt * 0.7;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 40 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  car.speed = clamp(car.speed, -def.top * 0.45, def.top);
  const steerAmt = steer * grip * dt * clamp(Math.abs(car.speed) / 40, 0.25, 1) * (car.speed < 0 ? -1 : 1);
  car.angle = normAngle(car.angle + steerAmt * (handbrake ? 1.4 : 1));
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const L = def.len / 2, W = def.wid / 2;
  const pts = [[L, 0], [-L, 0], [0, W], [0, -W]].map(([px, py]) => ({
    x: nx + px * Math.cos(car.angle) - py * Math.sin(car.angle),
    y: ny + px * Math.sin(car.angle) + py * Math.cos(car.angle),
  }));
  if (pts.some((p) => hitBuilding(city, p.x, p.y, 2))) {
    if (Math.abs(car.speed) > 60) { car.hp -= Math.round(Math.abs(car.speed) / 12); ev.hitWall = true; }
    car.speed *= -0.25;
  } else {
    car.x = nx; car.y = ny;
  }
  for (const o of others) {
    if (o === car || !o.driver) continue;
    if (dist(car.x, car.y, o.x, o.y) < (def.len + VEHICLES[o.type].len) / 2 - 4) {
      if (Math.abs(car.speed) > 40) { car.hp -= 4; o.hp -= 4; ev.hitCar = true; }
      car.speed *= 0.5; o.speed = (o.speed || 0) * 0.5;
    }
  }
  const c = clampWorld(car.x, car.y); car.x = c.x; car.y = c.y;
  return ev;
}

export function nearestCar(cars, x, y, maxDist = 90) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    const d = dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
// Stealing: the player takes a traffic car (driver flees on foot). Returns the car or null.
export function stealCar(car, player) {
  if (!car) return null;
  car.driver = false; // now player-driven; traffic no longer moves it
  return car;
}
export function repairCar(car) { if (car) car.hp = car.maxHp; }
export function damageCar(car, n) { if (car) car.hp = Math.max(0, car.hp - n); }
export function wrecked(car) { return !car || car.hp <= 0; }
