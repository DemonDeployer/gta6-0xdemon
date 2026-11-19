// Neon Bay — shared configuration and constants.
// All tuning values for the city, the player, cars, police and missions live here
// so the rest of the game can stay readable.
export const CFG = {
  // --- city layout ---------------------------------------------------------
  BLOCK: 240,            // size of one city block, in world pixels
  ROAD: 64,              // width of a road
  GRID: 10,              // blocks per side (roads = GRID + 1 each way)
  BEACH_W: 220,          // sand strip on the east edge
  WATER_W: 260,          // sea beyond the sand
  PARK_BX: 4,            // park block column
  PARK_BY: 4,            // park block row
  LOT_BX: 2,             // parking-lot block column
  LOT_BY: 7,             // parking-lot block row

  // --- player --------------------------------------------------------------
  WALK_SPEED: 165,
  RUN_SPEED: 265,
  PLAYER_RADIUS: 13,
  PLAYER_MAX_HEALTH: 100,

  // --- cars ----------------------------------------------------------------
  CAR_LENGTH: 46,
  CAR_WIDTH: 22,
  CAR_ACCEL: 300,
  CAR_BRAKE: 520,
  CAR_MAX_SPEED: 430,
  CAR_MAX_REVERSE: 140,
  CAR_TURN: 2.6,
  CAR_MAX_HEALTH: 100,
  TRAFFIC_SPEED: 95,

  // --- day / night -----------------------------------------------------------
  DAY_LENGTH_SECONDS: 360, // one full in-game day per 6 real minutes
  DAY_START_MINUTES: 10 * 60, // the story opens at 10:00
  NIGHT_START_MINUTES: 20 * 60, // neon comes on at 20:00
  NIGHT_END_MINUTES: 6 * 60,    // dawn at 06:00

  // --- pay 'n spray -----------------------------------------------------------
  SPRAY_COST: 200,        // clears the wanted level and repairs the car
  SPRAY_COOLDOWN_SECONDS: 5,

  // --- police / wanted ------------------------------------------------------
  MAX_WANTED: 5,
  WANTED_DECAY_SECONDS: 9,
  BUST_FINE_RATE: 0.10,  // fraction of cash lost when busted
  COP_RAM_DAMAGE: 9,
  COP_SHOOT_WANTED: 3,  // cops open fire at this wanted level and above

  // --- combat ---------------------------------------------------------------
  PISTOL_DAMAGE: 34,
  PISTOL_RANGE: 420,
  PISTOL_COOLDOWN: 0.28,
  PUNCH_DAMAGE: 22,
  PUNCH_RANGE: 34,
  PUNCH_COOLDOWN: 0.45,

  // --- missions --------------------------------------------------------------
  MISSION_MARKER_RADIUS: 46,
  SAVE_KEY: 'neon-bay-save-v1',
};

// Per-vehicle handling: name, top speed, acceleration and turn rate. The
// player car reads these; traffic keeps its own cruising speed.
export const VEHICLE_STATS = {
  sedan:   { name: 'Bay Sedan',    maxSpeed: 430, accel: 300, turn: 2.6, length: 46, width: 22 },
  sport:   { name: 'Comet GT',     maxSpeed: 520, accel: 360, turn: 3.1, length: 46, width: 22 },
  taxi:    { name: 'Bay Cab',      maxSpeed: 400, accel: 280, turn: 2.6, length: 46, width: 22 },
  police:  { name: 'Bay PD Cruiser', maxSpeed: 470, accel: 330, turn: 2.8, length: 46, width: 22 },
  truck:   { name: 'Hauler Truck', maxSpeed: 340, accel: 220, turn: 2.0, length: 58, width: 26 },
  van:     { name: 'Courier Van',  maxSpeed: 380, accel: 250, turn: 2.2, length: 54, width: 24 },
  bike:    { name: 'Neon Rider',   maxSpeed: 500, accel: 380, turn: 3.6, length: 40, width: 12 },
};

// Sun-soaked day palette for Neon Bay.
export const PALETTE = {
  grass: '#7ec850',
  grassDark: '#6db544',
  sidewalk: '#c9c2b4',
  asphalt: '#3d3d46',
  asphaltDark: '#33333c',
  lane: '#f5d76e',
  sand: '#f2dd9e',
  water: '#2fa8c9',
  waterDeep: '#1d8ab0',
  parkGrass: '#5cb85c',
  parkPath: '#d8c9a3',
  lot: '#55555f',
  buildingRoof: ['#e07856', '#e8a34c', '#7fb3d5', '#c9a0dc', '#f2f2f2', '#8fb8a8', '#d96a6a', '#6a8fd9'],
  buildingWall: '#00000022',
  carColors: ['#d94f4f', '#4f7fd9', '#f2c14e', '#7fd94f', '#9b59b6', '#e67e22', '#ecf0f1', '#2ecc71', '#e74c3c', '#3498db'],
  playerShirt: '#ff5e78',
  copBlue: '#2c4fd7',
  vipGold: '#ffd700',
};

// Mission chain for Danny Cole. Each mission is a small state machine driven
// by missions.js; the fields below are the static script for the story.
export const MISSION_DEFS = [
  {
    id: 'first-gear', title: 'Mission 1 — First Gear',
    intro: 'Danny Cole owes Ms. Voss $50,000. Her first errand: prove you can still drive. Reach the yellow marker.',
    reward: 500, kind: 'goto',
  },
  {
    id: 'the-package', title: 'Mission 2 — The Package',
    intro: 'Pick up the package at the docks marker, then deliver it across town before the timer runs out. No scratches on the client\'s patience.',
    reward: 1200, kind: 'pickup-deliver', timeLimit: 90,
  },
  {
    id: 'the-vip', title: 'Mission 3 — The VIP',
    intro: 'A nervous VIP needs a quiet ride across town. Pick him up, drop him off, and keep the car in one piece — damage over 60% and he walks.',
    reward: 2500, kind: 'vip',
  },
  {
    id: 'heat', title: 'Mission 4 — Heat',
    intro: 'Voss set you up: the Bay PD is on you at 3 stars. Survive the chase for 60 seconds. Lose them, don\'t get busted.',
    reward: 4000, kind: 'survive', timeLimit: 60,
  },
  {
    id: 'the-steal', title: 'Mission 5 — The Steal',
    intro: 'A gold sports car is parked by the marina. Steal it and bring it to the garage. The owner\'s friends will not be polite.',
    reward: 6000, kind: 'steal-car',
  },
  {
    id: 'the-last-job', title: 'Mission 6 — The Last Job',
    intro: 'One last pickup, one last drop, with the whole city hunting you at 4 stars. Finish this and the $50,000 debt is gone.',
    reward: 50000, kind: 'final',
  },
  {
    id: 'taxi-fare', title: 'Side Job — Taxi Fare',
    intro: 'Debt paid, but rent is not. A fare is waiting by the park — pick them up and drop them at the beach before the meter runs out.',
    reward: 900, kind: 'taxi', timeLimit: 75,
  },
  {
    id: 'street-race', title: 'Side Job — Neon Street Race',
    intro: 'The midnight crew races for pink slips. Beat the rival through all four checkpoints — first across the last one takes $3,000.',
    reward: 3000, kind: 'race',
  },
  {
    id: 'delivery-run', title: 'Side Job — Delivery Run',
    intro: 'Three drops, one van, ninety seconds. The courier firm pays $1,800 if every parcel lands on time.',
    reward: 1800, kind: 'delivery', timeLimit: 90,
  },
  {
    id: 'vigilante', title: 'Side Job — Vigilante',
    intro: 'A getaway car is tearing through downtown. Bay PD looks the other way — wreck it by ramming or shooting before it escapes.',
    reward: 2500, kind: 'vigilante', timeLimit: 90,
  },
];

export const DEBT_TOTAL = 50000;
