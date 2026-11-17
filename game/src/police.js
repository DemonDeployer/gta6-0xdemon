// Neon Bay — the Bay PD: wanted level, cop cars that chase and ram, foot
// cops that chase and bust. Wanted stars rise with crimes and decay when the
// player stays out of sight; getting caught costs cash and a trip to the
// hospital (busted) or the same when wasted on foot.
import { CFG } from './config.js';
import { makeCar } from './vehicles.js';
import { damagePlayer } from './player.js';
import { randomRoadPoint } from './world.js';

export function spawnCopCar(G) {
  const p = randomRoadPoint(Math.random, G.player.x, G.player.y, 520);
  const car = makeCar(p.x, p.y, Math.atan2(G.player.y - p.y, G.player.x - p.x), {
    ai: true, driver: 'cop', type: 'police', color: '#1c2733', speed: 200,
  });
  G.cars.push(car);
  G.cops.push({ kind: 'car', car, shootTimer: 0 });
  return car;
}

export function spawnFootCop(G) {
  const p = randomRoadPoint(Math.random, G.player.x, G.player.y, 320);
  const cop = {
    kind: 'foot', x: p.x, y: p.y, angle: 0,
    speed: 185, shootTimer: 1 + Math.random(),
  };
  G.cops.push(cop);
  return cop;
}

// Crime entry point: every system that commits a crime calls this.
export function addWanted(G, stars, reason) {
  if (G.state !== 'playing') return;
  const before = G.wanted;
  G.wanted = Math.min(CFG.MAX_WANTED, G.wanted + stars);
  G.wantedTimer = 0;
  if (G.wanted > before) {
    G.flashMessage(reason + ' — Wanted +' + stars + '★', '#ff5e5e');
    G.audio.siren(1, G.wanted);
  }
}

export function updateWanted(G, dt) {
  // Wanted decays only while no cop can see the player.
  const copNear = G.cops.some((c) => {
    const x = c.kind === 'car' ? c.car.x : c.x;
    const y = c.kind === 'car' ? c.car.y : c.y;
    return Math.hypot(x - G.player.x, y - G.player.y) < 520;
  });
  if (G.wanted > 0 && !copNear) {
    G.wantedTimer += dt;
    if (G.wantedTimer > CFG.WANTED_DECAY_SECONDS) {
      G.wantedTimer = 0;
      G.wanted -= 1;
      if (G.wanted === 0) G.flashMessage('You lost the cops', '#7fd94f');
    }
  } else {
    G.wantedTimer = 0;
  }
  // Spawn pressure matches the wanted level: 1 cop per star (cars), plus
  // foot cops when the player is on foot and wanted >= 2.
  const wantCars = G.wanted;
  const copCars = G.cops.filter((c) => c.kind === 'car').length;
  if (copCars < wantCars && Math.random() < dt * 1.2) spawnCopCar(G);
  const wantFoot = G.player.car ? 0 : Math.max(0, G.wanted - 1);
  const footCops = G.cops.filter((c) => c.kind === 'foot').length;
  if (footCops < wantFoot && Math.random() < dt * 1.0) spawnFootCop(G);
  // Despawn cops when the heat is gone.
  if (G.wanted === 0) {
    G.cops = G.cops.filter((c) => {
      const x = c.kind === 'car' ? c.car.x : c.x;
      const y = c.kind === 'car' ? c.car.y : c.y;
      return Math.hypot(x - G.player.x, y - G.player.y) < 500;
    });
    // Parked cop cars left behind get cleaned up in vehicles.js culling.
  }
}

function steerToward(car, tx, ty, dt, turnRate) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
}

export function updatePolice(G, dt) {
  updateWanted(G, dt);
  const p = G.player;
  for (const cop of G.cops) {
    if (cop.kind === 'car') {
      const car = cop.car;
      if (car.health <= 0) continue;
      // Chase: fast, aggressive, steers straight at the player.
      const targetSpeed = 320 + G.wanted * 30;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 0.9);
      steerToward(car, p.x, p.y, dt, 2.4);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (!G.worldHit(car.x, car.y, 20)) {
        // free
      } else {
        car.speed *= 0.4;
        car.x -= Math.cos(car.angle) * car.speed * dt;
        car.y -= Math.sin(car.angle) * car.speed * dt;
      }
      // Ram the player's car: damage + shake on contact.
      if (p.car) {
        const d = Math.hypot(car.x - p.car.x, car.y - p.car.y);
        if (d < 46) {
          damagePlayer(G, CFG.COP_RAM_DAMAGE * dt * 2, 'Busted by the Bay PD');
          p.car.health -= 14 * dt;
          G.shake = Math.max(G.shake, 5);
          if (Math.random() < dt * 6) G.addParticle(car.x, car.y, 'sparks', 3);
        }
      } else {
        // On foot: a cop car that touches the player busts them.
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d < 30) G.busted('The Bay PD caught you');
      }
      // Cops shoot at high wanted levels.
      if (G.wanted >= CFG.COP_SHOOT_WANTED) {
        cop.shootTimer -= dt;
        if (cop.shootTimer <= 0) {
          cop.shootTimer = 1.4 + Math.random();
          G.combatCopShot(car.x, car.y, p.x, p.y);
        }
      }
    } else {
      // Foot cop: runs at the player, busts on contact.
      const d = Math.hypot(p.x - cop.x, p.y - cop.y);
      cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      if (d > 26) {
        cop.x += Math.cos(cop.angle) * cop.speed * dt;
        cop.y += Math.sin(cop.angle) * cop.speed * dt;
      } else {
        G.busted('A Bay PD officer caught you');
      }
      if (G.wanted >= CFG.COP_SHOOT_WANTED && d < 380) {
        cop.shootTimer -= dt;
        if (cop.shootTimer <= 0) {
          cop.shootTimer = 1.8 + Math.random();
          G.combatCopShot(cop.x, cop.y, p.x, p.y);
        }
      }
    }
  }
  // Remove destroyed cop cars from the chase list.
  G.cops = G.cops.filter((c) => c.kind !== 'car' || c.car.health > 0);
}
