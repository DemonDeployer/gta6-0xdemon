// Neon Bay — wanted level + police response.
import { WANTED_MAX } from './config.js';
import { clamp, dist, normAngle } from './random.js';
import { makeCar } from './vehicles.js';

export function addWanted(state, n) {
  state.wanted = clamp(state.wanted + n, 0, WANTED_MAX);
  state.heat = 1; // fresh crime resets the cool-down timer
}
export function clearWanted(state) { state.wanted = 0; state.heat = 0; }

// Wanted decays after 25s without a new crime (only when no police are close).
export function updateWanted(state, dt, policeNear) {
  if (state.wanted <= 0) return;
  if (state.heat > 0) { state.heat -= dt; return; }
  if (policeNear) return;
  state.decay = (state.decay || 0) + dt;
  if (state.decay > 25) { state.wanted -= 1; state.decay = 0; }
}

// How many police cars the wanted level calls for.
export function policeTarget(wanted) { return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4; }

export function spawnPolice(x, y, angle = 0) { return makeCar('police', x, y, angle, true); }

// Chase AI: steer toward the player, ram on contact. Returns true if ramming.
export function updatePolice(car, px, py, dt, city) {
  const d = dist(car.x, car.y, px, py);
  const want = Math.atan2(py - car.y, px - car.x);
  const diff = normAngle(want - car.angle);
  car.angle = normAngle(car.angle + clamp(diff, -2.4 * dt, 2.4 * dt));
  const target = d > 300 ? 185 : d > 90 ? 165 : 120;
  car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx; car.y = ny;
  const c = { x: clamp(car.x, 20, 3180), y: clamp(car.y, 20, 2380) };
  car.x = c.x; car.y = c.y;
  return d < 52;
}
