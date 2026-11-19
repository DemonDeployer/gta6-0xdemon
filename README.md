# Neon Bay

[![Neon Bay](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/DemonDeployer/gta6-0xdemon/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/DemonDeployer/gta6-0xdemon/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, running in a desktop web browser from its own files. Explore a neon coastal city on foot and by car, steal cars, outrun the police, and work 10 jobs to pay off a $5,000 debt.

Competition: [Neon Bay on make.fun](https://make.fun/bounty/gta6-01)

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: plain canvas 2D, everything loads from files inside `game/`.

## Controls

- **W / Up** — accelerate (drive) / walk up
- **S / Down** — brake / reverse (drive) / walk down
- **A D / Left Right** — steer / walk
- **E** — enter or exit a car (steal the nearest car)
- **Space** — handbrake
- **M** — start the next mission
- **P / Esc** — pause
- **H** — help screen
- **R** — climb out of a wrecked car

## The city

Downtown, the Docks, Bay Park, the Marina, and Neon Beach, with a day/night cycle (6-minute days). After 20:00 the neon signs light up, windows glow, streetlamps shine, and headlight cones cut through the dark. Seven vehicle types with distinct handling: sedan, sport, taxi, truck, van, bike, and police. Traffic cars and pedestrians fill the streets; any car can be stolen and driven.

Crimes raise your wanted level (up to 5 stars) and the police respond with chases and rams. Drive into the **Pay 'n Spray** garage on the parking lot and pay $200 to clear your wanted level and fully repair your car.

## Missions — 10 jobs

1. First Wheels — $400
2. Bay Park Drop — $600
3. Docks Hustle — $800
4. Neon Nights — $1,000
5. Marina Meet — $1,200
6. Pay the Debt — $1,500 (the debt is paid off here)
7. Taxi Fare — $900 (pick up a passenger, deliver them)
8. Neon Street Race — $3,000 (4 checkpoints against a rival; lose and the job fails)
9. Delivery Run — $1,800 (3 drops around the city)
10. Vigilante — $2,500 (chase the getaway car and wreck it)

Progress (cash, jobs done, debt) saves automatically and persists across reloads. The HUD shows a minimap, Jobs x/10 counter, a sun/moon clock, a speedometer with the current vehicle name, cash, car health, and wanted level.
