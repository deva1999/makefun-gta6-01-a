// Deterministic screenshot scenes, selected with ?shot=start|foot|drive|chase&seed=N.
// Each scene builds the real world with the seed, places Kiko and the cast for a composed
// but honest frame — real traffic, real crowds, real police — steps the simulation a
// fixed number of ticks, and reports which screen to draw over it.
import { STEP } from './config.js';
import { avenueX, avenueY } from './city.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './hud.js';
import { startMission } from './missions.js';
import { commitCrime } from './police.js';
import { stepWorld } from './world.js';
import { createCar } from './vehicles.js';

function fakeInput({ throttle = 0, steer = 0, axis = { x: 0, y: 0 } } = {}) {
  return {
    axis: () => axis,
    drive: () => ({ throttle, steer, brake: false, sprint: false }),
    mouse: () => ({ x: 900, y: 300, down: false }),
    takeActions: () => 0,
  };
}

function settle(world, input, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(world, input, STEP);
}

function nearestParked(world, x, y) {
  let best = null; let bestD = Infinity;
  for (const car of world.cars) {
    if (car.driver !== null || car.police) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function putPlayerInCar(world, car, x, y, angle, speed) {
  car.x = x; car.y = y; car.angle = angle; car.speed = speed;
  car.driver = 'player';
  world.player.inCar = car;
  world.player.x = x; world.player.y = y;
}

// Pinned time-of-day per shot state (frozen in shot mode): title at dusk,
// foot/drive in day, chase at night so headlights + police lights show.
export const SHOT_TIMES = { start: 0.76, title: 0.76, foot: 0.45, drive: 0.50, chase: 0.92 };

export function stageShot(name, world) {
  const player = world.player;
  world.timeOfDay = SHOT_TIMES[name] ?? 0.5;
  world.dayNightFrozen = true;
  if (name === 'foot') {
    startMission(world);
    world.missions.messageTimer = 0;
    player.x = avenueX(3) + 26; player.y = avenueY(3) + 44;
    player.angle = 0.4;
    settle(world, fakeInput({ axis: { x: 0, y: 0 } }), 1.6);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    startMission(world);
    world.missions.index = 0;
    world.missions.active = true;
    world.missions.stage = 1; // objective: drive to the marina
    world.missions.messageTimer = 0;
    const car = nearestParked(world, avenueX(4), avenueY(4));
    putPlayerInCar(world, car, avenueX(4) + 11, avenueY(4) + 190, 0, 150);
    settle(world, fakeInput({ throttle: 0.85 }), 1.1);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    world.missions.index = 4;
    world.missions.active = true;
    world.missions.stage = 1; // objective: reach Aero Solmar Gate
    world.missions.done = false;
    const car = nearestParked(world, avenueX(6), avenueY(3));
    putPlayerInCar(world, car, avenueX(6) - 11, avenueY(2) + 60, Math.PI / 2, 205);
    commitCrime(world.wanted, 4);
    world.wanted.stars = 3;
    // Patrol cars already on his tail, close enough to read in the frame.
    const cop1 = createCar(world.random, car.x - 24, car.y - 96, Math.PI / 2, { police: true, driver: 'police', color: '#f4f6f8' });
    const cop2 = createCar(world.random, car.x + 22, car.y - 168, Math.PI / 2, { police: true, driver: 'police', color: '#f4f6f8' });
    cop1.speed = 215; cop2.speed = 208;
    world.cars.push(cop1, cop2);
    settle(world, fakeInput({ throttle: 0.9 }), 0.7);
    world.wanted.stars = 3; // the settle may cool nothing, but keep the frame honest at 3
    return { screen: SCREEN_PLAY };
  }
  // start: the title over a living city — let traffic roll behind the logo.
  player.x = avenueX(5) + 44; player.y = avenueY(2) + 60;
  settle(world, fakeInput(), 2.2);
  return { screen: SCREEN_TITLE };
}
