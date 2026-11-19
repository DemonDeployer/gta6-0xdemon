// Neon Bay — mission logic. Pure functions, no DOM, no imports:
// the same file runs in the browser and in the node unit tests.
export const MISSION_PAY = { 1: 400, 2: 600, 3: 800, 4: 1000, 5: 1200, 6: 1500, 7: 900, 8: 3000, 9: 1800, 10: 2500 };
export const TAXI_PAY = 900, RACE_PAY = 3000, DELIVERY_PAY = 1800, VIGILANTE_PAY = 2500;

export function newMissionState() {
  return {
    cash: 500, jobsDone: 0, debt: 5000, debtPaid: false,
    active: null, // { id, name, stage, ... } or null
    completed: [], failed: [],
  };
}
// Finish a story job (1–6). At job 6 the debt is paid off.
export function completeStoryJob(state, id) {
  if (state.active && state.active.id !== id) return { ok: false, reason: 'another job active' };
  if (state.completed.includes(id)) return { ok: false, reason: 'already done' };
  const pay = MISSION_PAY[id] || 0;
  state.cash += pay;
  state.debt = Math.max(0, state.debt - pay);
  state.jobsDone += 1;
  state.completed.push(id);
  state.active = null;
  if (id === 6) { state.debt = 0; state.debtPaid = true; }
  return { ok: true, pay, debt: state.debt, debtPaid: state.debtPaid };
}

// --- 7. Taxi Fare -----------------------------------------------------------
export function startTaxi(state) {
  state.active = { id: 7, name: 'Taxi Fare', stage: 'pickup', passenger: false };
  return state.active;
}
export function taxiPickup(state) {
  const m = state.active;
  if (!m || m.id !== 7 || m.stage !== 'pickup') return { ok: false, reason: 'no pickup waiting' };
  m.stage = 'deliver'; m.passenger = true;
  return { ok: true, stage: 'deliver' };
}
export function taxiDeliver(state) {
  const m = state.active;
  if (!m || m.id !== 7 || m.stage !== 'deliver' || !m.passenger) return { ok: false, reason: 'no passenger aboard' };
  state.cash += TAXI_PAY; state.jobsDone += 1; state.completed.push(7); state.active = null;
  return { ok: true, pay: TAXI_PAY, cash: state.cash };
}

// --- 8. Neon Street Race ----------------------------------------------------
export function startRace(state) {
  state.active = { id: 8, name: 'Neon Street Race', stage: 'racing', checkpoints: 0, rival: 0, total: 4 };
  return state.active;
}
export function raceCheckpoint(state, who) {
  const m = state.active;
  if (!m || m.id !== 8 || m.stage !== 'racing') return { ok: false, reason: 'no race running' };
  if (who === 'player') m.checkpoints += 1; else m.rival += 1;
  return { ok: true, player: m.checkpoints, rival: m.rival };
}
export function raceFinish(state, winner) {
  const m = state.active;
  if (!m || m.id !== 8 || m.stage !== 'racing') return { ok: false, reason: 'no race running' };
  if (winner === 'player') {
    state.cash += RACE_PAY; state.jobsDone += 1; state.completed.push(8); state.active = null;
    return { ok: true, win: true, pay: RACE_PAY, cash: state.cash };
  }
  state.failed.push(8); state.active = null;
  return { ok: true, win: false, pay: 0, failed: true };
}

// --- 9. Delivery Run --------------------------------------------------------
export function startDelivery(state) {
  state.active = { id: 9, name: 'Delivery Run', stage: 'delivering', drops: 0, total: 3 };
  return state.active;
}
export function deliveryDrop(state) {
  const m = state.active;
  if (!m || m.id !== 9 || m.stage !== 'delivering') return { ok: false, reason: 'no delivery running' };
  m.drops += 1;
  if (m.drops >= m.total) {
    state.cash += DELIVERY_PAY; state.jobsDone += 1; state.completed.push(9); state.active = null;
    return { ok: true, done: true, pay: DELIVERY_PAY, cash: state.cash };
  }
  return { ok: true, done: false, drops: m.drops };
}

// --- 10. Vigilante ----------------------------------------------------------
export function startVigilante(state) {
  state.active = { id: 10, name: 'Vigilante', stage: 'chase', getawayHp: 100, fled: false };
  return state.active;
}
// The getaway car flees: each tick it gains distance unless the player is close.
export function getawayFlee(state, playerClose, dt) {
  const m = state.active;
  if (!m || m.id !== 10 || m.stage !== 'chase') return { ok: false, reason: 'no chase running' };
  m.distance = (m.distance || 0) + (playerClose ? -20 * dt : 45 * dt);
  if (m.distance > 900) { m.fled = true; m.stage = 'escaped'; state.failed.push(10); state.active = null; return { ok: true, fled: true }; }
  return { ok: true, fled: false, distance: m.distance };
}
export function vigilanteHit(state, dmg) {
  const m = state.active;
  if (!m || m.id !== 10 || m.stage !== 'chase') return { ok: false, reason: 'no chase running' };
  m.getawayHp = Math.max(0, m.getawayHp - dmg);
  if (m.getawayHp <= 0) {
    state.cash += VIGILANTE_PAY; state.jobsDone += 1; state.completed.push(10); state.active = null;
    return { ok: true, wrecked: true, pay: VIGILANTE_PAY, cash: state.cash };
  }
  return { ok: true, wrecked: false, hp: m.getawayHp };
}

// --- Pay 'n Spray ----------------------------------------------------------
export function payNSpray(state, car) {
  if (state.cash < 200) return { ok: false, reason: 'not enough cash' };
  state.cash -= 200;
  if (car) car.hp = car.maxHp;
  state.wanted = 0;
  return { ok: true, cost: 200, cash: state.cash, hp: car ? car.hp : null };
}
