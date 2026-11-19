// Neon Bay — screenshot scenes (?shot=title|street|night|race&seed=N).
// Used by the screenshot captures and the play-test; never loads anything.
import { startRace, startVigilante, startTaxi } from './missions.js';
import { addWanted } from './police.js';
import { makeCar } from './vehicles.js';

export function shotFromURL() {
  try {
    const q = new URLSearchParams(location.search);
    return { shot: q.get('shot') || '', seed: Number(q.get('seed') || 1) };
  } catch { return { shot: '', seed: 1 }; }
}

// Configure the live game state for a named shot. Returns the shot name or ''.
export function applyShot(game, name) {
  const s = game.state;
  if (name === 'title') { game.mode = 'title'; return 'title'; }
  game.mode = 'playing';
  if (name === 'street') {
    // Day street driving downtown, in a sedan, traffic around.
    s.timeH = 10.5;
    game.enterCar(game.nearestTrafficCar('sedan') || game.spawnCarAt('sedan', 1250, 848));
    s.playerCar.speed = 90;
    game.startMission(2);
    return 'street';
  }
  if (name === 'night') {
    // Night chase: 22:00, wanted 3, police on the tail, neon lit.
    s.timeH = 22.2;
    game.enterCar(game.spawnCarAt('sport', 2600, 448));
    s.playerCar.speed = 120;
    addWanted(s, 3);
    game.ensurePolice();
    game.startMission(4);
    return 'night';
  }
  if (name === 'race') {
    // Street race in progress: rival beside the player, checkpoint 1 ahead.
    s.timeH = 19.4;
    game.enterCar(game.spawnCarAt('sport', 900, 820));
    s.playerCar.speed = 110;
    game.startMission(8);
    return 'race';
  }
  return '';
}
export { startRace, startVigilante, startTaxi, makeCar };
