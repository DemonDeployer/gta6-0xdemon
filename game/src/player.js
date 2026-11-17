// Neon Bay — the player: Danny Cole on foot and behind the wheel.
// On foot: WASD/arrows to walk, Shift to run. E enters the nearest car
// (stealing it raises the wanted level); E again steps out.
import { CFG } from './config.js';
import { isDown, wasPressed } from './input.js';
import { resolveBuildingCollision } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: CFG.PLAYER_MAX_HEALTH,
    car: null,            // the car object Danny is driving, or null
    punchCooldown: 0,
    shootCooldown: 0,
    moving: false,
    wanted: 0,
  };
}

// Nearest car (parked or traffic) within reach of the player.
export function nearestCar(G, maxDist = 58) {
  let best = null, bestD = maxDist;
  for (const car of G.cars) {
    if (car === G.player.car) continue;
    const d = Math.hypot(car.x - G.player.x, car.y - G.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  p.car = car;
  car.driver = 'player';
  car.ai = false;
  car.speed = 0;
  if (car.parked) {
    car.parked = false;
    if (!car.wasStolen) {
      car.wasStolen = true;
      G.addWanted(1, 'Car stolen');
    }
  }
  G.audio.click();
  G.addParticle(car.x, car.y, 'dust', 6);
}

export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  // Step out to the side of the car.
  const side = Math.cos(car.angle + Math.PI / 2);
  const sideY = Math.sin(car.angle + Math.PI / 2);
  p.x = car.x + side * 34;
  p.y = car.y + sideY * 34;
  p.angle = car.angle;
  p.car = null;
  car.driver = null;
  car.speed = 0;
  G.audio.click();
}

export function damagePlayer(G, amount, cause) {
  const p = G.player;
  if (G.state !== 'playing' || p.health <= 0) return;
  p.health -= amount;
  G.shake = Math.max(G.shake, 6);
  if (p.health <= 0) {
    p.health = 0;
    G.wasted(cause || 'You got wasted');
  }
}

// On-foot update: movement, collision, running, punching.
export function updatePlayerOnFoot(G, dt) {
  const p = G.player;
  const input = G.input;
  let dx = 0, dy = 0;
  if (isDown(input, 'w', 'arrowup')) dy -= 1;
  if (isDown(input, 's', 'arrowdown')) dy += 1;
  if (isDown(input, 'a', 'arrowleft')) dx -= 1;
  if (isDown(input, 'd', 'arrowright')) dx += 1;
  const running = isDown(input, 'shift');
  const speed = running ? CFG.RUN_SPEED : CFG.WALK_SPEED;
  p.moving = dx !== 0 || dy !== 0;
  if (p.moving) {
    const len = Math.hypot(dx, dy);
    p.angle = Math.atan2(dy / len, dx / len);
    const nx = p.x + (dx / len) * speed * dt;
    const ny = p.y + (dy / len) * speed * dt;
    p.x = nx; p.y = ny;
    resolveBuildingCollision(G.world, p, CFG.PLAYER_RADIUS);
    if (running && Math.random() < dt * 6) {
      G.addParticle(p.x, p.y + 8, 'dust', 1);
    }
  }
  // Slow health regen out of trouble.
  if (p.health > 0 && p.health < CFG.PLAYER_MAX_HEALTH && G.wanted === 0) {
    p.health = Math.min(CFG.PLAYER_MAX_HEALTH, p.health + 2.5 * dt);
  }
  p.punchCooldown -= dt;
  p.shootCooldown -= dt;
  // Punch: F at close range.
  if (wasPressed(input, 'f') && p.punchCooldown <= 0) {
    p.punchCooldown = CFG.PUNCH_COOLDOWN;
    G.combatPunch();
  }
}
