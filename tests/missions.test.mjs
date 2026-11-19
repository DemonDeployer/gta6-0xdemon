// Neon Bay — node unit tests for mission logic (game/src/missions.js).
// Run: node tests/missions.test.mjs — exits non-zero on any failure.
import {
  newMissionState, completeStoryJob, startTaxi, taxiPickup, taxiDeliver,
  startRace, raceCheckpoint, raceFinish, startDelivery, deliveryDrop,
  startVigilante, getawayFlee, vigilanteHit, payNSpray,
} from '../game/src/missions.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.log(`FAIL ${name}`); }
}

// 1. Taxi: pickup then deliver pays $900.
{
  const s = newMissionState();
  startTaxi(s);
  check('taxi deliver without pickup fails', taxiDeliver(s).ok === false);
  check('taxi pickup ok', taxiPickup(s).ok === true && s.active.stage === 'deliver');
  const r = taxiDeliver(s);
  check('taxi deliver pays $900', r.ok === true && r.pay === 900 && s.cash === 1400);
  check('taxi counts as a job', s.jobsDone === 1 && s.completed.includes(7));
}
// 2. Race: player win pays $3,000; rival win fails the job.
{
  const s = newMissionState();
  startRace(s);
  raceCheckpoint(s, 'player'); raceCheckpoint(s, 'player');
  check('race checkpoints track player', s.active.checkpoints === 2 && s.active.rival === 0);
  const r = raceFinish(s, 'player');
  check('race player win pays $3000', r.ok === true && r.win === true && r.pay === 3000 && s.cash === 3500);
  const s2 = newMissionState();
  startRace(s2);
  raceCheckpoint(s2, 'rival');
  const r2 = raceFinish(s2, 'rival');
  check('race rival win fails job', r2.ok === true && r2.win === false && r2.failed === true && s2.failed.includes(8) && s2.cash === 500);
}
// 3. Delivery: 3 drops pay $1,800.
{
  const s = newMissionState();
  startDelivery(s);
  check('delivery drop 1 not done', deliveryDrop(s).done === false && s.active.drops === 1);
  deliveryDrop(s);
  const r = deliveryDrop(s);
  check('delivery 3rd drop pays $1800', r.ok === true && r.done === true && r.pay === 1800 && s.cash === 2300);
  check('delivery counts as a job', s.jobsDone === 1 && s.completed.includes(9));
}
// 4. Vigilante: getaway flees; wrecking it pays $2,500.
{
  const s = newMissionState();
  startVigilante(s);
  const f = getawayFlee(s, false, 1);
  check('getaway flees when player far', f.ok === true && f.fled === false && s.active.distance > 0);
  check('vigilante hit damages getaway', vigilanteHit(s, 30).hp === 70);
  const r = vigilanteHit(s, 70);
  check('vigilante wreck pays $2500', r.ok === true && r.wrecked === true && r.pay === 2500 && s.cash === 3000);
}
// 5. Debt pays off at mission 6.
{
  const s = newMissionState();
  for (const id of [1, 2, 3, 4, 5]) completeStoryJob(s, id);
  check('debt reduced by jobs 1-5', s.debt === 5000 - (400 + 600 + 800 + 1000 + 1200) && s.debtPaid === false);
  const r = completeStoryJob(s, 6);
  check('mission 6 pays off debt', r.ok === true && r.debtPaid === true && s.debt === 0 && s.jobsDone === 6);
  check('repeating a done job fails', completeStoryJob(s, 6).ok === false);
}
// 6. Pay 'n Spray: wanted 3 -> 0, health 40 -> 100, cash $500 -> $300.
{
  const s = newMissionState();
  s.wanted = 3;
  const car = { hp: 40, maxHp: 100 };
  const r = payNSpray(s, car);
  check("pay'n spray clears wanted + repairs for $200", r.ok === true && s.wanted === 0 && car.hp === 100 && s.cash === 300);
  check("pay'n spray refuses when broke", payNSpray({ ...s, cash: 100 }, car).ok === false);
}

console.log(`\n${pass} passed, ${fail} failed (18 checks)`);
if (fail > 0) process.exit(1);
