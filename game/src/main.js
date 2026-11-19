// Neon Bay — main game: loop, player, camera, missions runtime, police, save.
import { WORLD, DAY_LEN, SPRAY, SPRAY_COST, MISSIONS, VEHICLES } from './config.js';
import { Input } from './input.js';
import { buildCity, spawnTraffic, spawnPeds, updateTraffic, updatePeds, hitBuilding, clampWorld, districtAt } from './world.js';
import { normAngle } from './random.js';
import { makeCar, driveCar, nearestCar, stealCar, repairCar, damageCar, wrecked, vehicleName } from './vehicles.js';
import { addWanted, clearWanted, updateWanted, policeTarget, spawnPolice, updatePolice } from './police.js';
import * as M from './missions.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { Effects } from './effects.js';
import { drawCity, drawCar, drawPed, drawPlayer, drawMarker, drawNightOverlay, drawStreetlamps } from './render.js';
import { drawHUD, drawTitle, drawPause, drawHelp, isNight } from './hud.js';
import { shotFromURL, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
input.attach();

const RACE_POINTS = [{ x: 820, y: 820 }, { x: 2400, y: 420 }, { x: 2400, y: 1980 }, { x: 820, y: 1980 }];
const DELIVERY_POINTS = [{ x: 620, y: 620 }, { x: 2620, y: 1820 }, { x: 1620, y: 320 }];
const TAXI_PICKUP = { x: 1020, y: 920 }, TAXI_DROP = { x: 2620, y: 620 };
const STORY_TARGETS = { 1: { x: 1400, y: 1000 }, 2: { x: 1520, y: 320 }, 3: { x: 420, y: 1920 }, 4: { x: 2720, y: 420 }, 5: { x: 2620, y: 1820 }, 6: { x: 1620, y: 1220 } };

function freshState() {
  const m = M.newMissionState();
  return {
    ...m, wanted: 0, heat: 0, decay: 0, timeH: 8.0,
    player: { x: 1300, y: 1300, angle: 0 }, playerCar: null,
    target: null, racePoints: null, raceIndex: 0, rival: null, rivalIndex: 0,
    deliveryIndex: 0, getaway: null, getawayCd: 0,
    missionText: '', missionSub: '', toast: '', toastT: 0,
    cam: { x: 0, y: 0 }, saveT: 0,
  };
}

class Game {
  constructor() {
    this.state = freshState();
    this.city = buildCity(1337);
    this.traffic = spawnTraffic(mulberry(), 14);
    this.peds = spawnPeds(mulberry(), 26);
    this.policeCars = [];
    this.fx = new Effects();
    this.mode = 'title';
    this.showHelp = false;
    this.last = performance.now();
    this.raceCd = 0;
  }
  spawnCarAt(type, x, y) { const c = makeCar(type, x, y, 0, false); this.traffic.push(c); return c; }
  nearestTrafficCar(type) {
    const s = this.state;
    let best = null, bd = 1e9;
    for (const c of this.traffic) {
      if (type && c.type !== type) continue;
      const d = Math.hypot(c.x - s.player.x, c.y - s.player.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  enterCar(car) {
    const s = this.state;
    if (!car) return false;
    const wasTraffic = car.driver;
    stealCar(car, s.player);
    if (wasTraffic) addWanted(s, 1); // stealing a car is a crime
    s.playerCar = car; s.player.x = car.x; s.player.y = car.y;
    this.toast(`Stole a ${vehicleName(car)} — wanted +1`, 2.5);
    return true;
  }
  exitCar() {
    const s = this.state;
    if (!s.playerCar) return;
    const c = s.playerCar;
    s.player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 40;
    s.player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 40;
    s.playerCar = null;
  }
  toast(text, t = 3) { const s = this.state; s.toast = text; s.toastT = t; }
  ensurePolice() {
    const s = this.state, want = policeTarget(s.wanted);
    while (this.policeCars.length < want) {
      const a = Math.random() * Math.PI * 2;
      this.policeCars.push(spawnPolice(s.player.x + Math.cos(a) * 420, s.player.y + Math.sin(a) * 420));
    }
    while (this.policeCars.length > want) this.policeCars.pop();
  }
  startMission(id) {
    const s = this.state;
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (s.active) { this.toast('Finish the current job first', 2); return false; }
    if (s.completed.includes(id)) { this.toast('Job already done', 2); return false; }
    if (id >= 7 && id <= 10) {
      if (id === 7) { M.startTaxi(s); s.target = TAXI_PICKUP; }
      if (id === 8) {
        M.startRace(s); s.racePoints = RACE_POINTS; s.raceIndex = 0; s.rivalIndex = 0;
        s.rival = makeCar('sport', 900, 880, 0, true); s.rival.color = '#e879f9';
        s.target = RACE_POINTS[0];
      }
      if (id === 9) { M.startDelivery(s); s.deliveryIndex = 0; s.target = DELIVERY_POINTS[0]; }
      if (id === 10) {
        M.startVigilante(s);
        s.getaway = makeCar('sport', s.player.x + 300, s.player.y, 0, true); s.getaway.color = '#111827';
        s.target = null;
      }
    } else {
      s.active = { id, name: def.name, stage: 'go' };
      s.target = STORY_TARGETS[id];
    }
    s.missionText = `JOB ${id}: ${def.name}`;
    s.missionSub = def.desc;
    this.toast(`Job started: ${def.name}`, 3);
    return true;
  }
  nextMission() {
    const s = this.state;
    const next = MISSIONS.find((m) => !s.completed.includes(m.id) && !(s.active && s.active.id === m.id));
    if (next) this.startMission(next.id);
    else this.toast('All 10 jobs done — Neon Bay is yours!', 4);
  }
  completeActive(pay) {
    const s = this.state;
    this.toast(`Job complete! +$${pay}`, 4);
    this.fx.popup(s.player.x, s.player.y - 30, `+$${pay}`);
    s.missionText = ''; s.missionSub = ''; s.target = null; s.racePoints = null; s.rival = null; s.getaway = null;
    saveGame(s);
  }
  update(dt) {
    const s = this.state;
    s.timeH = (s.timeH + (dt * 24) / DAY_LEN) % 24;
    if (s.toastT > 0) s.toastT -= dt;
    updateTraffic(this.traffic, dt, this.city);
    updatePeds(this.peds, dt, this.city);
    this.fx.update(dt);
    // --- player ---
    const px = s.playerCar ? s.playerCar.x : s.player.x;
    const py = s.playerCar ? s.playerCar.y : s.player.y;
    if (s.playerCar) {
      const car = s.playerCar;
      const ev = driveCar(car, input.steer(), input.throttle(), input.held(' '), dt, this.city, this.traffic);
      if (ev.hitWall && Math.abs(car.speed) > 60) this.fx.burst(car.x, car.y, '#fbbf24', 8);
      if (input.held(' ') && Math.abs(car.speed) > 40 && Math.random() < 0.3) this.fx.skid(car.x, car.y);
      // Hit a pedestrian?
      for (const p of this.peds) {
        if (Math.hypot(p.x - car.x, p.y - car.y) < 34 && Math.abs(car.speed) > 30) {
          addWanted(s, 1); this.fx.burst(p.x, p.y, '#ef4444', 12);
          p.x = 1300 + Math.random() * 600; p.y = 1300 + Math.random() * 600;
          this.toast('You hit a pedestrian! Wanted +1', 2.5);
        }
      }
      // Pay 'n Spray: drive in with heat or damage and it is cleared for $200.
      if (car.x > SPRAY.x && car.x < SPRAY.x + SPRAY.w && car.y > SPRAY.y && car.y < SPRAY.y + SPRAY.h) {
        if ((s.wanted > 0 || car.hp < car.maxHp) && s.cash >= SPRAY_COST) {
          const r = M.payNSpray(s, car);
          if (r.ok) { this.toast("Pay 'n Spray: wanted cleared, car repaired −$200", 3.5); this.fx.burst(car.x, car.y, '#fb923c', 16); }
        }
      }
      if (wrecked(car)) { this.toast('Your car is wrecked! Press R to get out.', 3); }
    } else {
      const sp = 150, mx = input.moveX(), my = input.moveY();
      if (mx || my) {
        const len = Math.hypot(mx, my);
        const nx = s.player.x + (mx / len) * sp * dt, ny = s.player.y + (my / len) * sp * dt;
        if (!hitBuilding(this.city, nx, s.player.y, 8)) s.player.x = nx;
        if (!hitBuilding(this.city, s.player.x, ny, 8)) s.player.y = ny;
        s.player.angle = Math.atan2(my, mx);
        const c = clampWorld(s.player.x, s.player.y); s.player.x = c.x; s.player.y = c.y;
      }
    }
    // Enter / exit car
    if (input.wasPressed('e')) {
      if (s.playerCar) this.exitCar();
      else { const c = nearestCar(this.traffic, s.player.x, s.player.y, 90); if (c) this.enterCar(c); }
    }
    if (input.wasPressed('m')) this.nextMission();
    if (input.wasPressed('r') && s.playerCar && wrecked(s.playerCar)) { this.exitCar(); this.toast('You crawl out of the wreck.', 2); }
    // --- police ---
    this.ensurePolice();
    let policeNear = false;
    for (const pc of this.policeCars) {
      const ramming = updatePolice(pc, px, py, dt, this.city);
      if (Math.hypot(pc.x - px, pc.y - py) < 400) policeNear = true;
      if (ramming) {
        if (s.playerCar) { damageCar(s.playerCar, 1); if (Math.random() < 0.2) this.fx.burst(pc.x, pc.y, '#93c5fd', 6); }
        else addWanted(s, 0); // on foot, police just hassle you
      }
    }
    updateWanted(s, dt, policeNear);
    // --- missions ---
    this.updateMissions(dt, px, py);
    // --- camera ---
    const vw = canvas.width, vh = canvas.height;
    s.cam.x = Math.max(0, Math.min(WORLD.w - vw, px - vw / 2));
    s.cam.y = Math.max(0, Math.min(WORLD.h - vh, py - vh / 2));
    // --- autosave ---
    s.saveT += dt;
    if (s.saveT > 5) { s.saveT = 0; saveGame(s); }
  }
  updateMissions(dt, px, py) {
    const s = this.state, m = s.active;
    if (!m) return;
    const near = (t, r = 80) => t && Math.hypot(px - t.x, py - t.y) < r;
    if (m.id >= 1 && m.id <= 6) {
      if (near(s.target, 90)) {
        const r = M.completeStoryJob(s, m.id);
        if (r.ok) { this.completeActive(r.pay); if (r.debtPaid) this.toast('DEBT PAID OFF! Neon Bay is yours.', 5); }
      }
      return;
    }
    if (m.id === 7) {
      if (m.stage === 'pickup' && near(s.target)) { M.taxiPickup(s); s.target = TAXI_DROP; this.toast('Passenger aboard — deliver them!', 2.5); }
      else if (m.stage === 'deliver' && near(s.target)) {
        const r = M.taxiDeliver(s); if (r.ok) this.completeActive(r.pay);
      }
      return;
    }
    if (m.id === 8) {
      // Rival AI follows the checkpoints.
      if (s.rival) {
        const rp = RACE_POINTS[s.rivalIndex];
        const d = Math.hypot(rp.x - s.rival.x, rp.y - s.rival.y);
        const want = Math.atan2(rp.y - s.rival.y, rp.x - s.rival.x);
        s.rival.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, normAngle(want - s.rival.angle)));
        s.rival.speed += (150 - s.rival.speed) * Math.min(1, dt);
        s.rival.x += Math.cos(s.rival.angle) * s.rival.speed * dt;
        s.rival.y += Math.sin(s.rival.angle) * s.rival.speed * dt;
        if (d < 90) {
          M.raceCheckpoint(s, 'rival'); s.rivalIndex += 1;
          if (s.rivalIndex >= 4) { const r = M.raceFinish(s, 'rival'); if (r.ok) { s.missionText = ''; s.target = null; s.racePoints = null; s.rival = null; this.toast('The rival won the race. Job failed.', 4); } }
        }
      }
      if (near(s.target, 95)) {
        M.raceCheckpoint(s, 'player'); s.raceIndex += 1;
        if (s.raceIndex >= 4) {
          const r = M.raceFinish(s, 'player');
          if (r.ok) this.completeActive(r.pay);
        } else { s.target = RACE_POINTS[s.raceIndex]; this.toast(`Checkpoint ${s.raceIndex}/4!`, 2); }
      }
      return;
    }
    if (m.id === 9) {
      if (near(s.target)) {
        const r = M.deliveryDrop(s);
        if (r.ok && r.done) this.completeActive(r.pay);
        else if (r.ok) { s.deliveryIndex += 1; s.target = DELIVERY_POINTS[s.deliveryIndex]; this.toast(`Drop ${s.deliveryIndex}/3 done`, 2); }
      }
      return;
    }
    if (m.id === 10 && s.getaway) {
      const g = s.getaway;
      // Flee: steer away from the player, fast.
      const away = Math.atan2(g.y - py, g.x - px);
      g.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, normAngle(away - g.angle)));
      g.speed += (155 - g.speed) * Math.min(1, dt);
      g.x += Math.cos(g.angle) * g.speed * dt; g.y += Math.sin(g.angle) * g.speed * dt;
      const gc = clampWorld(g.x, g.y); g.x = gc.x; g.y = gc.y;
      const gd = Math.hypot(g.x - px, g.y - py);
      M.getawayFlee(s, gd < 250, dt);
      if (!s.active) { this.toast('The getaway car escaped. Job failed.', 4); s.getaway = null; s.target = null; return; }
      s.getawayCd -= dt;
      if (gd < 58 && s.playerCar && Math.abs(s.playerCar.speed) > 45 && s.getawayCd <= 0) {
        s.getawayCd = 0.5;
        damageCar(s.playerCar, 3);
        const r = M.vigilanteHit(s, 14);
        this.fx.burst(g.x, g.y, '#f97316', 12);
        if (r.ok && r.wrecked) this.completeActive(r.pay);
      }
    }
  }
  render() {
    const s = this.state, vw = canvas.width, vh = canvas.height;
    const night = isNight(s.timeH);
    ctx.clearRect(0, 0, vw, vh);
    if (this.mode === 'title') { drawTitle(ctx, vw, vh, hasSave()); return; }
    drawCity(ctx, this.city, s.cam, vw, vh, night);
    // Mission target marker
    if (s.target) drawMarker(ctx, s.target.x, s.target.y, s.cam, '#facc15', s.active ? s.active.name : '');
    if (s.racePoints) for (const p of s.racePoints) drawMarker(ctx, p.x, p.y, s.cam, '#e879f9');
    if (s.getaway) drawMarker(ctx, s.getaway.x, s.getaway.y, s.cam, '#ef4444', 'GETAWAY');
    for (const p of this.peds) drawPed(ctx, p, s.cam);
    for (const c of this.traffic) drawCar(ctx, c, s.cam, night, c === s.playerCar);
    if (s.rival) drawCar(ctx, s.rival, s.cam, night, false);
    if (s.getaway) drawCar(ctx, s.getaway, s.cam, night, false);
    for (const pc of this.policeCars) drawCar(ctx, pc, s.cam, night, false);
    if (!s.playerCar) drawPlayer(ctx, s.player, s.cam);
    this.fx.draw(ctx, s.cam);
    drawStreetlamps(ctx, s.cam, vw, vh, night);
    drawNightOverlay(ctx, vw, vh, night, s.timeH);
    s.policeCars = this.policeCars;
    drawHUD(ctx, s, vw, vh);
    if (this.mode === 'paused') drawPause(ctx, vw, vh);
    if (this.showHelp) drawHelp(ctx, vw, vh);
  }
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    if (input.wasPressed('p', 'Escape') && this.mode !== 'title') {
      this.mode = this.mode === 'paused' ? 'playing' : 'paused';
    }
    if (input.wasPressed('h') && this.mode !== 'title') this.showHelp = !this.showHelp;
    if (this.mode === 'playing') this.update(dt);
    if (this.mode === 'title' && input.wasPressed('Enter')) {
      this.mode = 'playing';
      const sv = loadGame();
      if (sv && input.keys.has('c')) { /* continue handled below */ }
    }
    if (this.mode === 'title' && input.wasPressed('c')) {
      const sv = loadGame();
      if (sv) { this.applySave(sv); this.mode = 'playing'; }
    }
    this.render();
    input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }
  applySave(sv) {
    const s = this.state;
    s.cash = sv.cash ?? s.cash; s.jobsDone = sv.jobsDone ?? s.jobsDone;
    s.debt = sv.debt ?? s.debt; s.debtPaid = !!sv.debtPaid;
    s.completed = sv.completed ?? []; s.wanted = sv.wanted ?? 0;
    s.timeH = sv.time ?? s.timeH;
    if (sv.px) { s.player.x = sv.px; s.player.y = sv.py; }
  }
  start() {
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    addEventListener('resize', resize); resize();
    const sv = loadGame();
    if (sv) this.applySave(sv);
    const { shot } = shotFromURL();
    if (shot) applyShot(this, shot);
    else if (sv) this.mode = 'title';
    requestAnimationFrame((t) => this.frame(t));
  }
}

function mulberry() {
  let a = 1337;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const game = new Game();
window.__neonBay = game; // play-test hook: state, startMission, enterCar, spawnCarAt
game.start();
export { game };
