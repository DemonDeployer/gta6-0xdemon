// Neon Bay — missions: Danny Cole's ten-job chain against a $50,000 debt to
// fixer Ms. Voss (six story jobs, then four side jobs once the debt is paid).
// Each mission is a small state machine: a marker on the map, an objective line,
// a timer where the job has one, and a pass/fail outcome that pays cash and
// unlocks the next job. Failing lets you retry.
import { CFG, MISSION_DEFS, DEBT_TOTAL } from './config.js';
import { roadCenter } from './world.js';
import { makeCar } from './vehicles.js';
import { makePed } from './pedestrians.js';

// Fixed road-junction points, spread across the city, used as markers.
function junction(gx, gy) { return { x: roadCenter(gx), y: roadCenter(gy) }; }

const MARKERS = {
  firstGear: () => junction(7, 6),
  packagePickup: () => junction(9, 2),
  packageDeliver: () => junction(1, 8),
  vipPickup: () => junction(3, 7),
  vipDeliver: () => junction(8, 1),
  survive: () => junction(5, 5),
  stealCar: () => junction(9, 2),
  garage: () => junction(2, 2),
  finalPickup: () => junction(8, 8),
  finalDeliver: () => junction(1, 1),
  taxiPickup: () => junction(4, 4),
  taxiDrop: () => junction(9, 5),
  raceCheckpoints: () => [junction(2, 8), junction(8, 8), junction(8, 2), junction(5, 5)],
  deliveryDrops: () => [junction(1, 3), junction(6, 9), junction(9, 6)],
  vigilanteSpawn: () => junction(6, 3),
};

export function createMissionState() {
  return {
    index: 0,            // which mission of MISSION_DEFS is active (10 = all done)
    stage: 'idle',       // idle | brief | active | done | failed | complete
    timer: 0,            // countdown for timed jobs
    target: null,        // {x, y} current marker
    targetCar: null,     // mission 5's gold car / vigilante getaway car
    vipPed: null,        // mission 3's VIP pedestrian
    farePed: null,       // taxi job's passenger
    vipAboard: false,
    banner: null,        // {title, sub, until} big centre banner
    briefTimer: 0,       // seconds left on the intro card
    debtPaid: false,
    checkpoints: null,   // race: ordered checkpoint list
    checkpointIndex: 0,  // race: next checkpoint
    drops: null,         // delivery: ordered drop list
    dropIndex: 0,        // delivery: next drop
  };
}

export function currentDef(G) {
  return MISSION_DEFS[G.mission.index] || null;
}

export function missionTarget(G) {
  return G.mission.target;
}

export function missionObjectiveText(G) {
  const m = G.mission;
  const def = currentDef(G);
  if (!def) return 'Debt paid — Neon Bay is yours. Free roam.';
  if (m.stage === 'brief') return def.title + ' — press ENTER to start';
  if (m.stage === 'failed') return 'Mission failed — press ENTER to retry';
  if (m.stage === 'done') return 'Job complete!';
  switch (def.kind) {
    case 'taxi':
      return (m.stage === 'pickup' || m.stage === 'active')
        ? 'Pick up the fare by the park'
        : 'Drop the fare at the beach — ' + Math.ceil(m.timer) + 's left';
    case 'race':
      return 'Race checkpoint ' + (m.checkpointIndex + 1) + ' / ' + (m.checkpoints ? m.checkpoints.length : 4) + ' — beat the rival!';
    case 'delivery':
      return 'Delivery ' + (m.dropIndex + 1) + ' / ' + (m.drops ? m.drops.length : 3) + ' — ' + Math.ceil(m.timer) + 's left';
    case 'vigilante':
      return 'Wreck the getaway car — ' + Math.ceil(m.timer) + 's left';
    case 'goto': return 'Reach the yellow marker';
    case 'pickup-deliver':
      return m.stage === 'pickup' ? 'Pick up the package' : 'Deliver the package — ' + Math.ceil(m.timer) + 's left';
    case 'vip':
      if (m.stage === 'pickup') return 'Pick up the VIP (drive to him)';
      return 'Drive the VIP to the drop-off — keep the car above 40%';
    case 'survive': return 'Survive the chase — ' + Math.ceil(m.timer) + 's left';
    case 'steal-car':
      return m.targetCar && G.player.car === m.targetCar
        ? 'Deliver the gold car to the garage'
        : 'Steal the gold sports car at the marina';
    case 'final':
      return m.stage === 'pickup' ? 'Pick up the cash' : 'Deliver the cash — the whole city is hunting you';
    default: return def.title;
  }
}

function setMarker(G, point) {
  G.mission.target = point;
}

function showBanner(G, title, sub, seconds = 4) {
  G.mission.banner = { title, sub, until: G.time + seconds };
}

export function startMission(G, index) {
  const m = G.mission;
  const def = MISSION_DEFS[index];
  if (!def) { m.stage = 'complete'; m.target = null; return; }
  m.index = index;
  m.stage = 'brief';
  m.briefTimer = 5;
  m.timer = def.timeLimit || 0;
  m.vipAboard = false;
  m.targetCar = null;
  m.vipPed = null;
  m.farePed = null;
  m.garageSet = false;
  m.checkpoints = null;
  m.checkpointIndex = 0;
  m.drops = null;
  m.dropIndex = 0;
  showBanner(G, def.title, def.intro, 5);
  switch (def.kind) {
    case 'goto': setMarker(G, MARKERS.firstGear()); break;
    case 'pickup-deliver': setMarker(G, MARKERS.packagePickup()); break;
    case 'vip': {
      setMarker(G, MARKERS.vipPickup());
      const at = MARKERS.vipPickup();
      const vip = makePed(at.x + 30, at.y + 30);
      vip.vip = true; vip.shirt = '#ffd700'; vip.speed = 0;
      G.peds.push(vip);
      m.vipPed = vip;
      break;
    }
    case 'survive':
      setMarker(G, MARKERS.survive());
      G.wanted = 3;
      G.wantedTimer = 0;
      break;
    case 'steal-car': {
      setMarker(G, MARKERS.stealCar());
      const at = MARKERS.stealCar();
      const car = makeCar(at.x + 60, at.y, 0, { parked: true, type: 'sport', color: '#ffd700' });
      G.cars.push(car);
      m.targetCar = car;
      break;
    }
    case 'final': setMarker(G, MARKERS.finalPickup()); break;
    case 'taxi': {
      setMarker(G, MARKERS.taxiPickup());
      const at = MARKERS.taxiPickup();
      const fare = makePed(at.x + 30, at.y + 30);
      fare.shirt = '#1abc9c'; fare.speed = 0;
      G.peds.push(fare);
      m.farePed = fare;
      break;
    }
    case 'race': {
      m.checkpoints = MARKERS.raceCheckpoints();
      m.checkpointIndex = 0;
      setMarker(G, m.checkpoints[0]);
      // A rival racer lines up beside the player and runs the same route.
      const at = m.checkpoints[0];
      const rival = makeCar(at.x - 40, at.y + 40, 0, {
        ai: true, driver: 'rival', type: 'sport', color: '#9b59b6', speed: 0,
      });
      G.cars.push(rival);
      m.targetCar = rival;
      break;
    }
    case 'delivery': {
      m.drops = MARKERS.deliveryDrops();
      m.dropIndex = 0;
      setMarker(G, m.drops[0]);
      break;
    }
    case 'vigilante': {
      const at = MARKERS.vigilanteSpawn();
      const car = makeCar(at.x, at.y, 0, {
        ai: true, driver: 'getaway', type: 'sport', color: '#111111', speed: 240,
      });
      G.cars.push(car);
      m.targetCar = car;
      setMarker(G, at);
      break;
    }
    default: break;
  }
}

function completeMission(G) {
  const m = G.mission;
  const def = currentDef(G);
  G.money += def.reward;
  G.audio.missionDone();
  G.audio.pickup();
  const storyLast = m.index === 5; // Mission 6 pays the $50,000 debt
  const last = m.index >= MISSION_DEFS.length - 1;
  const isSideJob = m.index > 5;
  showBanner(G, isSideJob ? 'SIDE JOB COMPLETE' : 'MISSION COMPLETE',
    '+' + def.reward.toLocaleString('en-US') + ' — ' + def.title, 4);
  m.stage = 'done';
  m.target = null;
  m.debtPaid = m.debtPaid || storyLast;
  G.saveGame();
  // The race rival and the getaway car leave the scene once the job is done.
  if ((def.kind === 'race' || def.kind === 'vigilante') && m.targetCar) {
    G.cars = G.cars.filter((c) => c !== m.targetCar);
    m.targetCar = null;
  }
  if (storyLast) {
    showBanner(G, 'DEBT PAID!', 'Danny Cole is free of Ms. Voss. Neon Bay is yours now — side jobs pay cash.', 6);
    G.flashMessage('Debt paid: $50,000 / $50,000', '#ffd700');
  }
  // The next job unlocks after the banner; main.js advances on a timer.
  m.doneTimer = 3;
}

function failMission(G, reason) {
  const m = G.mission;
  const def = currentDef(G);
  G.audio.missionFail();
  showBanner(G, 'MISSION FAILED', reason, 4);
  m.stage = 'failed';
  m.target = null;
  if (m.vipPed) { G.peds = G.peds.filter((p) => p !== m.vipPed); m.vipPed = null; }
  if (m.farePed) { G.peds = G.peds.filter((p) => p !== m.farePed); m.farePed = null; }
  if ((def.kind === 'race' || def.kind === 'vigilante') && m.targetCar) {
    G.cars = G.cars.filter((c) => c !== m.targetCar);
    m.targetCar = null;
  }
  m.vipAboard = false;
}

function reached(G, point) {
  const p = G.player;
  const x = p.car ? p.car.x : p.x;
  const y = p.car ? p.car.y : p.y;
  return Math.hypot(x - point.x, y - point.y) < CFG.MISSION_MARKER_RADIUS;
}

export function updateMissions(G, dt) {
  const m = G.mission;
  const def = currentDef(G);
  if (!def) return;

  if (m.stage === 'brief') {
    m.briefTimer -= dt;
    if (m.briefTimer <= 0) m.stage = 'active';
    return;
  }
  if (m.stage === 'done') {
    m.doneTimer -= dt;
    if (m.doneTimer <= 0) startMission(G, m.index + 1);
    return;
  }
  if (m.stage === 'failed') return; // main.js retries on Enter
  // 'active' is the first leg; 'deliver' is the second leg of multi-leg jobs.
  if (m.stage !== 'active' && m.stage !== 'deliver') return;

  // Timed jobs.
  if (def.timeLimit) {
    const runsNow =
      def.kind === 'survive' ||
      def.kind === 'delivery' ||
      def.kind === 'vigilante' ||
      (def.kind === 'pickup-deliver' && m.stage === 'deliver') ||
      (def.kind === 'taxi' && m.stage === 'deliver');
    if (runsNow) {
      m.timer -= dt;
      if (m.timer <= 0) {
        if (def.kind === 'survive') completeMission(G);
        else if (def.kind === 'vigilante') failMission(G, 'The getaway car escaped.');
        else if (def.kind === 'taxi') failMission(G, 'The fare walked away — too slow.');
        else if (def.kind === 'delivery') failMission(G, 'Out of time — parcels undelivered.');
        else failMission(G, 'Too slow — the client walked away.');
        return;
      }
    }
  }

  switch (def.kind) {
    case 'goto':
      if (reached(G, m.target)) completeMission(G);
      break;
    case 'pickup-deliver':
      if (m.stage === 'pickup' || m.stage === 'active') {
        // 'active' doubles as the pickup leg for this kind.
        if (reached(G, m.target)) {
          G.audio.pickup();
          G.flashMessage('Package collected — deliver it fast!', '#ffd700');
          m.stage = 'deliver';
          m.timer = def.timeLimit;
          setMarker(G, MARKERS.packageDeliver());
        }
      } else if (m.stage === 'deliver') {
        if (reached(G, m.target)) completeMission(G);
      }
      break;
    case 'vip':
      if (m.stage === 'pickup' || m.stage === 'active') {
        if (G.player.car && reached(G, m.target)) {
          G.audio.pickup();
          G.flashMessage('VIP aboard — drive smooth!', '#ffd700');
          if (m.vipPed) { G.peds = G.peds.filter((p) => p !== m.vipPed); m.vipPed = null; }
          m.vipAboard = true;
          m.stage = 'deliver';
          setMarker(G, MARKERS.vipDeliver());
        }
      } else if (m.stage === 'deliver') {
        if (G.player.car && G.player.car.health < 40) {
          failMission(G, 'The car is wrecked — the VIP walked away.');
        } else if (reached(G, m.target)) {
          completeMission(G);
        }
      }
      break;
    case 'survive':
      // Timer handled above; just survive.
      break;
    case 'steal-car': {
      const drivingTarget = G.player.car === m.targetCar;
      if (drivingTarget && !m.garageSet) {
        m.garageSet = true;
        setMarker(G, MARKERS.garage());
        G.flashMessage('Got it — now lose the heat and reach the garage', '#ffd700');
      }
      if (drivingTarget && m.garageSet && reached(G, m.target)) completeMission(G);
      break;
    }
    case 'final':
      if (m.stage === 'pickup' || m.stage === 'active') {
        if (reached(G, m.target)) {
          G.audio.pickup();
          G.flashMessage('Cash grabbed — 4 stars! Run!', '#ff5e5e');
          m.stage = 'deliver';
          G.wanted = 4;
          setMarker(G, MARKERS.finalDeliver());
        }
      } else if (m.stage === 'deliver') {
        if (reached(G, m.target)) completeMission(G);
      }
      break;
    case 'taxi':
      if (m.stage === 'pickup' || m.stage === 'active') {
        if (G.player.car && reached(G, m.target)) {
          G.audio.pickup();
          G.flashMessage('Fare aboard — to the beach, fast!', '#1abc9c');
          if (m.farePed) { G.peds = G.peds.filter((p) => p !== m.farePed); m.farePed = null; }
          m.stage = 'deliver';
          m.timer = def.timeLimit;
          setMarker(G, MARKERS.taxiDrop());
        }
      } else if (m.stage === 'deliver') {
        if (G.player.car && reached(G, m.target)) completeMission(G);
      }
      break;
    case 'race': {
      // The rival runs the same checkpoints; lose if it finishes first.
      const rival = m.targetCar;
      if (rival && rival.health > 0) {
        if (rival.raceIndex === undefined) rival.raceIndex = 0;
        const rt = m.checkpoints[rival.raceIndex];
        if (rt) {
          driveChaseCar(G, rival, rt.x, rt.y, dt, 330);
          if (Math.hypot(rival.x - rt.x, rival.y - rt.y) < CFG.MISSION_MARKER_RADIUS) {
            rival.raceIndex++;
            if (rival.raceIndex >= m.checkpoints.length) {
              failMission(G, 'The rival crossed the line first.');
              return;
            }
          }
        }
      }
      if (reached(G, m.target)) {
        G.audio.pickup();
        m.checkpointIndex++;
        if (m.checkpointIndex >= m.checkpoints.length) {
          completeMission(G);
        } else {
          setMarker(G, m.checkpoints[m.checkpointIndex]);
          G.flashMessage('Checkpoint ' + m.checkpointIndex + ' / ' + m.checkpoints.length, '#ffd700');
        }
      }
      break;
    }
    case 'delivery':
      if (reached(G, m.target)) {
        G.audio.pickup();
        m.dropIndex++;
        if (m.dropIndex >= m.drops.length) {
          completeMission(G);
        } else {
          setMarker(G, m.drops[m.dropIndex]);
          G.flashMessage('Parcel ' + m.dropIndex + ' / ' + m.drops.length + ' delivered', '#ffd700');
        }
      }
      break;
    case 'vigilante': {
      // The getaway car flees from the player; wreck it to finish the job.
      const car = m.targetCar;
      if (car && car.health > 0) {
        const px = G.player.car ? G.player.car.x : G.player.x;
        const py = G.player.car ? G.player.car.y : G.player.y;
        const away = Math.atan2(car.y - py, car.x - px);
        const tx = car.x + Math.cos(away) * 400;
        const ty = car.y + Math.sin(away) * 400;
        driveChaseCar(G, car, tx, ty, dt, 300);
        setMarker(G, { x: car.x, y: car.y });
      }
      if (car && car.health <= 0) {
        G.flashMessage('Getaway car wrecked — Bay PD owes you one', '#7fd94f');
        completeMission(G);
      }
      break;
    }
    default:
      break;
  }
}

// Steer an AI mission car toward a point at a target speed, with simple
// building bounce. Used by the race rival and the vigilante getaway car.
function driveChaseCar(G, car, tx, ty, dt, targetSpeed) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (G.worldHit(car.x, car.y, 20)) {
    car.speed *= 0.4;
    car.angle += Math.PI / 2;
    car.x -= Math.cos(car.angle) * car.speed * dt;
    car.y -= Math.sin(car.angle) * car.speed * dt;
  }
}

export function retryMission(G) {
  startMission(G, G.mission.index);
}

export function debtProgress(G) {
  let earned = 0;
  for (let i = 0; i < Math.min(G.mission.index, MISSION_DEFS.length); i++) earned += MISSION_DEFS[i].reward;
  return { earned: Math.min(earned, DEBT_TOTAL), total: DEBT_TOTAL };
}
