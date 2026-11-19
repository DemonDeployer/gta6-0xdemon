// Neon Bay — config: world size, districts, vehicles, missions, tuning.
// Plain data + constants only; no DOM, no network.
export const WORLD = { w: 3200, h: 2400, road: 96, block: 400, tile: 400 };
export const DAY_LEN = 360; // seconds per full day (6-minute days)
export const NIGHT_START = 20, NIGHT_END = 6; // night is 20:00–06:00
export const START_CASH = 500;
export const DEBT = 5000; // story debt, paid off by finishing mission 6
export const SPRAY_COST = 200;
export const WANTED_MAX = 5;

export const DISTRICTS = [
  { name: 'Downtown', x: 1100, y: 700, w: 1000, h: 800, color: '#1c2436', label: '#7dd3fc' },
  { name: 'Docks', x: 0, y: 1600, w: 900, h: 800, color: '#232030', label: '#fbbf24' },
  { name: 'Bay Park', x: 1100, y: 0, w: 900, h: 600, color: '#14261c', label: '#86efac' },
  { name: 'Marina', x: 2400, y: 1400, w: 800, h: 1000, color: '#14202e', label: '#67e8f9' },
  { name: 'Neon Beach', x: 2400, y: 0, w: 800, h: 900, color: '#2a1f33', label: '#f472b6' },
  { name: "Pay 'n Spray", x: 700, y: 1100, w: 300, h: 300, color: '#33241a', label: '#fb923c' },
];
// Pay 'n Spray garage (on the parking lot, west of Downtown)
export const SPRAY = { x: 820, y: 1250, w: 140, h: 90 };

export const VEHICLES = {
  sedan:  { name: 'Sedan',  top: 150, accel: 90,  grip: 2.6, len: 46, wid: 22, color: '#3b82f6', hp: 100 },
  sport:  { name: 'Sport',  top: 210, accel: 130, grip: 3.1, len: 46, wid: 22, color: '#ef4444', hp: 90 },
  taxi:   { name: 'Taxi',   top: 155, accel: 95,  grip: 2.7, len: 46, wid: 22, color: '#facc15', hp: 100 },
  truck:  { name: 'Truck',  top: 110, accel: 60,  grip: 2.0, len: 62, wid: 26, color: '#94a3b8', hp: 140 },
  van:    { name: 'Van',    top: 125, accel: 70,  grip: 2.2, len: 54, wid: 24, color: '#a78bfa', hp: 120 },
  bike:   { name: 'Bike',   top: 175, accel: 120, grip: 3.6, len: 34, wid: 12, color: '#22d3ee', hp: 60 },
  police: { name: 'Police', top: 185, accel: 115, grip: 3.0, len: 48, wid: 22, color: '#e2e8f0', hp: 120 },
};
export const VEHICLE_TYPES = Object.keys(VEHICLES);

// Mission catalogue: 10 jobs. 1–6 story (debt paid at 6), 7–10 side jobs.
export const MISSIONS = [
  { id: 1, name: 'First Wheels', pay: 400,  desc: 'Steal a car and bring it to the Downtown garage.' },
  { id: 2, name: 'Bay Park Drop', pay: 600, desc: 'Drive the package to Bay Park without wrecking the car.' },
  { id: 3, name: 'Docks Hustle', pay: 800, desc: 'Pick up the crate at the Docks and lose any heat.' },
  { id: 4, name: 'Neon Nights', pay: 1000, desc: 'Cruise Neon Beach after dark and photograph the strip.' },
  { id: 5, name: 'Marina Meet', pay: 1200, desc: 'Meet the contact at the Marina and drive them home.' },
  { id: 6, name: 'Pay the Debt', pay: 1500, desc: 'One last run for the boss. Finish it and the debt is gone.' },
  { id: 7, name: 'Taxi Fare', pay: 900, desc: 'Pick up a passenger and deliver them across town.' },
  { id: 8, name: 'Neon Street Race', pay: 3000, desc: 'Beat the rival through 4 checkpoints. Lose and the job fails.' },
  { id: 9, name: 'Delivery Run', pay: 1800, desc: 'Three drops around the city. Deliver them all.' },
  { id: 10, name: 'Vigilante', pay: 2500, desc: 'Chase the getaway car and wreck it before it escapes.' },
];

export const CONTROLS = [
  ['W / Up', 'Accelerate (drive) / walk up'],
  ['S / Down', 'Brake / reverse (drive) / walk down'],
  ['A D / Left Right', 'Steer / walk'],
  ['E', 'Enter / exit car (steal nearest car)'],
  ['Space', 'Handbrake'],
  ['M', 'Start next mission'],
  ['P / Esc', 'Pause'],
  ['H', 'Toggle help'],
  ['R', 'Restart after wreck / game over'],
];
