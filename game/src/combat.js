// Neon Bay — combat: pistol (mouse aim, click to shoot), punching, bullets,
// muzzle flash, and the cops' return fire. Shooting a pedestrian, a cop or
// a car in the open is a crime; a punch is only a crime if a cop sees it.
import { CFG } from './config.js';
import { wasClicked } from './input.js';
import { scarePeds } from './pedestrians.js';
import { damagePlayer } from './player.js';

export function combatPunch(G) {
  const p = G.player;
  G.audio.punch();
  // Hit the nearest ped or foot cop in front of the player.
  const range = CFG.PUNCH_RANGE + 14;
  let target = null, bestD = range;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < bestD) { bestD = d; target = ped; }
  }
  let copTarget = null;
  for (const c of G.cops) {
    if (c.kind !== 'foot') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { bestD = d; copTarget = c; }
  }
  if (target) {
    target.state = 'down';
    G.addParticle(target.x, target.y, 'sparks', 6);
    scarePeds(G, target.x, target.y, 200);
    if (G.wanted < 2) G.addWanted(1, 'Assault');
  } else if (copTarget) {
    // Punching a cop is a bad idea: it hurts, and the heat jumps.
    G.cops = G.cops.filter((c) => c !== copTarget);
    G.addParticle(copTarget.x, copTarget.y, 'sparks', 8);
    G.addWanted(2, 'You hit a cop!');
  } else {
    G.addParticle(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24, 'dust', 2);
  }
}

export function combatShoot(G) {
  const p = G.player;
  if (p.car || p.shootCooldown > 0) return;
  p.shootCooldown = CFG.PISTOL_COOLDOWN;
  const mx = G.input.mouse.worldX, my = G.input.mouse.worldY;
  const angle = Math.atan2(my - p.y, mx - p.x);
  p.angle = angle;
  G.audio.gunshot();
  G.addParticle(p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26, 'flash', 3);
  G.bullets.push({
    x: p.x + Math.cos(angle) * 26, y: p.y + Math.sin(angle) * 26,
    vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900,
    life: CFG.PISTOL_RANGE / 900, damage: CFG.PISTOL_DAMAGE,
  });
  scarePeds(G, p.x, p.y, 300);
  G.shake = Math.max(G.shake, 2);
}

// A cop fires at the player; inaccurate on purpose, but it stings.
export function combatCopShot(G, fromX, fromY, toX, toY) {
  const jitter = (Math.random() - 0.5) * 0.35;
  const angle = Math.atan2(toY - fromY, toX - fromX) + jitter;
  G.bullets.push({
    x: fromX, y: fromY,
    vx: Math.cos(angle) * 820, vy: Math.sin(angle) * 820,
    life: 0.6, damage: 8, enemy: true,
  });
  G.audio.gunshot();
  G.addParticle(fromX, fromY, 'flash', 2);
}

function bulletHitsCar(G, b) {
  for (const car of G.cars) {
    const dx = b.x - car.x, dy = b.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = dx * -Math.sin(car.angle) + dy * Math.cos(car.angle);
    if (Math.abs(along) < 26 && Math.abs(side) < 14) return car;
  }
  return null;
}

export function updateBullets(G, dt) {
  // Player fires on click (on foot only).
  if (G.state === 'playing' && wasClicked(G.input)) {
    if (!G.player.car) combatShoot(G);
  }
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Buildings stop bullets.
    if (G.worldHit(b.x, b.y, 2)) {
      b.life = 0;
      G.addParticle(b.x, b.y, 'sparks', 3);
      continue;
    }
    if (b.enemy) {
      const p = G.player;
      const d = Math.hypot(b.x - (p.car ? p.car.x : p.x), b.y - (p.car ? p.car.y : p.y));
      if (d < 20) {
        b.life = 0;
        if (p.car) { p.car.health -= b.damage; }
        else damagePlayer(G, b.damage, 'Shot by the Bay PD');
      }
      continue;
    }
    // Player bullet: peds, foot cops, cop cars.
    for (const ped of G.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(b.x - ped.x, b.y - ped.y) < 14) {
        b.life = 0;
        ped.state = 'down';
        G.addParticle(ped.x, ped.y, 'sparks', 5);
        G.addWanted(1, 'Shooting in public');
        scarePeds(G, ped.x, ped.y, 300);
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const c of G.cops) {
      if (c.kind === 'foot' && Math.hypot(b.x - c.x, b.y - c.y) < 14) {
        b.life = 0;
        G.cops = G.cops.filter((x) => x !== c);
        G.addParticle(c.x, c.y, 'sparks', 6);
        G.addWanted(2, 'You shot a cop!');
        break;
      }
    }
    if (b.life <= 0) continue;
    const car = bulletHitsCar(G, b);
    if (car) {
      b.life = 0;
      car.health -= b.damage;
      G.addParticle(b.x, b.y, 'sparks', 4);
      if (car.driver === 'cop') G.addWanted(1, 'Shooting at the police');
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
}
