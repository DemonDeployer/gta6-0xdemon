// Neon Bay — main: game state, the loop, wiring, save/load, camera,
// particles, busted/wasted, and the ?scene= hooks used for screenshots and
// play-testing (title / street / chase / mission).
import { CFG, MISSION_DEFS } from './config.js';
import { buildWorld, hitBuilding, roadCenter } from './world.js';
import { createInput, isDown, wasPressed, endFrame } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayerOnFoot, enterCar, exitCar, nearestCar, damagePlayer } from './player.js';
import { updateVehicles, seedParkedCars, spawnTrafficCar, makeCar } from './vehicles.js';
import { updatePeds, seedPeds } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { combatPunch, updateBullets, combatCopShot } from './combat.js';
import { createMissionState, startMission, updateMissions, retryMission } from './missions.js';
import { drawHud, drawTitle, drawPause, drawBusted, drawWasted } from './hud.js';
import { renderWorld } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const G = {
  state: 'title',          // title | playing | paused | busted | wasted
  time: 0,
  money: 0,
  health: 100,
  wanted: 0,
  wantedTimer: 0,
  world: buildWorld(),
  player: createPlayer(roadCenter(1), roadCenter(1)),
  cars: [],
  peds: [],
  cops: [],
  bullets: [],
  particles: [],
  skidmarks: [],
  mission: createMissionState(),
  camera: { x: roadCenter(1), y: roadCenter(1) },
  shake: 0,
  flash: null,
  endReason: '',
  lastFine: 0,
  hasSave: false,
  input: null,
  audio: createAudio(),
};

// --- helpers other modules call through G -----------------------------------
G.worldHit = (x, y, r) => hitBuilding(G.world, x, y, r);
G.addWanted = (stars, reason) => addWanted(G, stars, reason);
G.combatPunch = () => combatPunch(G);
G.combatCopShot = (x, y, tx, ty) => combatCopShot(G, x, y, tx, ty);
G.flashMessage = (text, color = '#ffffff') => { G.flash = { text, color, until: G.time + 3.5 }; };
G.addParticle = (x, y, kind, n = 4) => {
  for (let i = 0; i < n; i++) {
    G.particles.push({
      x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90,
      kind, size: 3 + Math.random() * 5,
      life: 0.4 + Math.random() * 0.5, maxLife: 0.9,
    });
  }
  if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
};

// --- save / load -------------------------------------------------------------
G.saveGame = () => {
  try {
    const p = G.player;
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      money: G.money,
      missionIndex: G.mission.index,
      x: p.car ? p.car.x : p.x,
      y: p.car ? p.car.y : p.y,
      health: p.health,
    }));
    G.hasSave = true;
  } catch { /* storage unavailable: play on without saving */ }
};

function loadSave() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
G.hasSave = !!loadSave();

// --- busted / wasted ----------------------------------------------------------
function payFine() {
  const fine = Math.floor(G.money * CFG.BUST_FINE_RATE);
  G.money -= fine;
  G.lastFine = fine;
  return fine;
}

G.busted = (reason) => {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  G.endReason = reason;
  payFine();
  G.wanted = 0;
  G.cops = [];
  G.audio.busted();
  G.audio.setEngine(0, false);
  if (G.mission.stage === 'active' || G.mission.stage === 'deliver' || G.mission.stage === 'pickup') {
    G.mission.stage = 'failed';
    G.mission.target = null;
  }
};

G.wasted = (reason) => {
  if (G.state !== 'playing') return;
  G.state = 'wasted';
  G.endReason = reason;
  payFine();
  G.wanted = 0;
  G.cops = [];
  G.audio.busted();
  G.audio.setEngine(0, false);
  if (G.mission.stage === 'active' || G.mission.stage === 'deliver' || G.mission.stage === 'pickup') {
    G.mission.stage = 'failed';
    G.mission.target = null;
  }
};

function respawn() {
  const p = G.player;
  if (p.car) { p.car.driver = null; p.car = null; }
  p.x = G.world.hospital.x;
  p.y = G.world.hospital.y;
  p.health = CFG.PLAYER_MAX_HEALTH;
  p.angle = -Math.PI / 2;
  G.camera.x = p.x; G.camera.y = p.y;
  G.state = 'playing';
  if (G.mission.stage === 'failed') retryMission(G);
}

// --- new game / continue -------------------------------------------------------
function newGame() {
  G.money = 0;
  G.wanted = 0;
  G.cars = []; G.peds = []; G.cops = []; G.bullets = []; G.particles = []; G.skidmarks = [];
  G.player = createPlayer(roadCenter(1), roadCenter(1));
  G.mission = createMissionState();
  seedParkedCars(G);
  seedPeds(G, 26);
  for (let i = 0; i < 12; i++) spawnTrafficCar(G, G.player.x, G.player.y);
  G.camera.x = G.player.x; G.camera.y = G.player.y;
  G.state = 'playing';
  startMission(G, 0);
}

function continueGame() {
  const s = loadSave();
  if (!s) { newGame(); return; }
  G.money = s.money || 0;
  G.wanted = 0;
  G.cars = []; G.peds = []; G.cops = []; G.bullets = []; G.particles = []; G.skidmarks = [];
  G.player = createPlayer(s.x || roadCenter(1), s.y || roadCenter(1));
  G.player.health = s.health || CFG.PLAYER_MAX_HEALTH;
  G.mission = createMissionState();
  seedParkedCars(G);
  seedPeds(G, 26);
  for (let i = 0; i < 12; i++) spawnTrafficCar(G, G.player.x, G.player.y);
  G.camera.x = G.player.x; G.camera.y = G.player.y;
  G.state = 'playing';
  startMission(G, Math.min(s.missionIndex || 0, MISSION_DEFS.length - 1));
}

// --- screenshot / test scenes (?scene=...) --------------------------------------
function applyScene(name) {
  newGame();
  const p = G.player;
  if (name === 'title') { G.state = 'title'; return; }
  if (name === 'street') {
    // On foot at a busy junction, traffic and pedestrians around.
    p.x = roadCenter(5); p.y = roadCenter(5);
    for (let i = 0; i < 6; i++) spawnTrafficCar(G, p.x, p.y);
    G.camera.x = p.x; G.camera.y = p.y;
    return;
  }
  if (name === 'chase') {
    // Driving with a 3-star chase on: cop cars right behind.
    const car = makeCar(roadCenter(4), roadCenter(5), 0, { type: 'sport', color: '#e74c3c' });
    G.cars.push(car);
    enterCar(G, car);
    car.speed = 300;
    G.wanted = 3;
    for (let i = 0; i < 3; i++) {
      const cop = makeCar(roadCenter(4) - 70 - i * 55, roadCenter(5) + (i % 2 ? 26 : -26), 0,
        { ai: true, driver: 'cop', type: 'police', color: '#1c2733', speed: 320 });
      G.cars.push(cop);
      G.cops.push({ kind: 'car', car: cop, shootTimer: 1 });
    }
    G.camera.x = car.x; G.camera.y = car.y;
    return;
  }
  if (name === 'mission') {
    // Mission 2 in progress: package picked up, racing the timer to deliver.
    G.mission.index = 1;
    startMission(G, 1);
    G.mission.stage = 'deliver';
    G.mission.banner = null; // skip the intro card in this staged shot
    G.mission.timer = 74;
    G.mission.target = { x: roadCenter(1), y: roadCenter(8) };
    const car = makeCar(roadCenter(5), roadCenter(5), Math.PI / 2, { type: 'sedan', color: '#4f7fd9' });
    G.cars.push(car);
    enterCar(G, car);
    car.speed = 240;
    G.camera.x = car.x; G.camera.y = car.y;
    return;
  }
  if (name === 'mission1') {
    // Mission 1: player in a car just short of the marker, for play-testing.
    const car = makeCar(roadCenter(7) - 220, roadCenter(6), 0, { type: 'sedan', color: '#2ecc71' });
    G.cars.push(car);
    enterCar(G, car);
    G.mission.stage = 'active';
    G.camera.x = car.x; G.camera.y = car.y;
    return;
  }
}

// --- input wiring ---------------------------------------------------------------
G.input = createInput(canvas);

// --- main loop -------------------------------------------------------------------
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;
  const W = canvas.width, H = canvas.height;
  const input = G.input;

  if (input.anyKey) { G.audio.unlock(); input.anyKey = false; }
  // Mouse position in world coordinates (for aiming).
  input.mouse.worldX = input.mouse.x + G.camera.x - W / 2;
  input.mouse.worldY = input.mouse.y + G.camera.y - H / 2;

  // --- state transitions -----------------------------------------------------
  if (G.state === 'title') {
    if (wasPressed(input, 'enter')) { G.audio.click(); newGame(); }
    else if (wasPressed(input, 'c') && G.hasSave) { G.audio.click(); continueGame(); }
  } else if (G.state === 'playing') {
    if (wasPressed(input, 'p') || wasPressed(input, 'escape')) { G.state = 'paused'; G.audio.click(); }
    else if (wasPressed(input, 'm')) { G.audio.toggleMusic(); }
    else if (wasPressed(input, 'enter')) {
      if (G.mission.stage === 'brief') {
        G.mission.stage = 'active';
        if (G.mission.banner) G.mission.banner.until = 0; // skip the intro card
      } else if (G.mission.stage === 'failed') retryMission(G);
    }
    // Enter / exit cars.
    if (wasPressed(input, 'e')) {
      if (G.player.car) exitCar(G);
      else {
        const car = nearestCar(G);
        if (car) enterCar(G, car);
      }
    }
    // --- world updates -------------------------------------------------------
    if (G.player.car) updateVehicles(G, dt);
    else { updatePlayerOnFoot(G, dt); updateVehicles(G, dt); }
    updatePeds(G, dt);
    updatePolice(G, dt);
    updateBullets(G, dt);
    updateMissions(G, dt);
    G.audio.siren(dt, G.wanted);
    G.audio.music(dt);
    // Camera follows the player (or their car), smoothly.
    const px = G.player.car ? G.player.car.x : G.player.x;
    const py = G.player.car ? G.player.car.y : G.player.y;
    G.camera.x += (px - G.camera.x) * Math.min(1, dt * 5);
    G.camera.y += (py - G.camera.y) * Math.min(1, dt * 5);
  } else if (G.state === 'paused') {
    if (wasPressed(input, 'p') || wasPressed(input, 'escape') || wasPressed(input, 'enter')) {
      G.state = 'playing'; G.audio.click();
    } else if (wasPressed(input, 'r')) {
      retryMission(G); G.state = 'playing';
    } else if (wasPressed(input, 'm')) { G.audio.toggleMusic(); }
    G.audio.setEngine(0, false);
  } else if (G.state === 'busted' || G.state === 'wasted') {
    if (wasPressed(input, 'enter')) { G.audio.click(); respawn(); }
  }

  // --- particles & shake decay (all states) ----------------------------------
  for (const pt of G.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const s of G.skidmarks) s.life -= dt;
  G.skidmarks = G.skidmarks.filter((s) => s.life > 0);
  G.shake = Math.max(0, G.shake - dt * 26);

  // --- render ------------------------------------------------------------------
  ctx.clearRect(0, 0, W, H);
  if (G.state === 'title') {
    drawTitle(ctx, G, W, H);
  } else {
    renderWorld(ctx, G, W, H);
    drawHud(ctx, G, W, H);
    if (G.state === 'paused') drawPause(ctx, W, H);
    else if (G.state === 'busted') drawBusted(ctx, G, W, H);
    else if (G.state === 'wasted') drawWasted(ctx, G, W, H);
  }
  endFrame(input);
}

// Boot: a fresh world behind the title screen, then the loop.
seedParkedCars(G);
seedPeds(G, 26);
for (let i = 0; i < 12; i++) spawnTrafficCar(G, G.player.x, G.player.y);
const scene = new URLSearchParams(location.search).get('scene');
if (scene) applyScene(scene);
requestAnimationFrame(frame);

// Test hooks for the headless play-test (not part of the game UI).
window.__neonBay = G;
