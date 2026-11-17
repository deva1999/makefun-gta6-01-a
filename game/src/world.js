// The world: one state object holding the city, every car, pedestrian and officer, the
// wanted level, the mission chain, effects and the camera — and the step that advances
// them all in a fixed order: player, traffic, pedestrians, police, missions, effects.
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';
import { createRandom, clamp } from './random.js';
import { avenueX, avenueY, createCity } from './city.js';
import { spawnParkedCars, spawnTraffic, stepCar, trafficInput, collideCarWithCity } from './vehicles.js';
import { spawnCrowd, stepPed } from './pedestrians.js';
import { createPlayer, stepPlayer, damagePlayer } from './player.js';
import { createWanted, updatePolice } from './police.js';
import { createMissionState, updateMissions } from './missions.js';
import { readSave, writeSave } from './save.js';

export function createWorld(seed, audio) {
  const random = createRandom(seed);
  const city = createCity(random);
  const cars = [...spawnParkedCars(random, city), ...spawnTraffic(random, city, 16)];
  const world = {
    seed, random, city, cars, audio,
    peds: spawnCrowd(random, 34),
    player: createPlayer(avenueX(5) + 44, avenueY(5) + 36),
    wanted: createWanted(),
    missions: createMissionState(),
    effects: [],
    danger: [],       // points pedestrians flee from, rebuilt each step
    camera: { x: 0, y: 0 },
    time: 0,
    saveGame() { return writeSave(world); },
    applySave(data) {
      world.player.money = data.money;
      world.player.health = clamp(data.health || 100, 10, 100);
      world.player.x = data.x; world.player.y = data.y;
      world.player.carsStolen = data.carsStolen || 0;
      world.missions.index = Math.min(data.missionIndex, 5);
      world.missions.done = !!data.missionDone || world.missions.index >= 5;
    },
    hasSave() { return readSave() !== null; },
    loadSave() { const data = readSave(); if (data) { world.applySave(data); return true; } return false; },
  };
  return world;
}

/** Simple car-to-car bumps: separate overlapping bodies and trade a little speed. */
function collideCars(world) {
  const cars = world.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i]; const b = cars[j];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 30) {
        const push = (30 - d) / 2;
        const nx = dx / d; const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const avg = (a.speed + b.speed) / 2;
        if (Math.abs(a.speed - b.speed) > 90) {
          world.audio.crash(2);
          a.health -= 4; b.health -= 4;
          world.effects.push({ type: 'burst', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, life: 0.3, max: 0.3, color: '#f7d154' });
        }
        a.speed = avg * 0.8; b.speed = avg * 0.8;
      }
    }
  }
}

export function stepWorld(world, input, dt) {
  world.time += dt;
  world.danger.length = 0;
  stepPlayer(world, input, dt);
  if (world.player.inCar && Math.abs(world.player.inCar.speed) > 190) {
    world.danger.push({ x: world.player.x, y: world.player.y });
  }
  // Traffic drives itself; the player's car is stepped in stepPlayer.
  for (const car of world.cars) {
    if (car.driver === 'traffic') {
      stepCar(car, dt, trafficInput(world.random, car, world.cars, dt));
      collideCarWithCity(world.city, car);
      car.x = clamp(car.x, 22, WORLD_WIDTH - 22);
      car.y = clamp(car.y, 22, WORLD_HEIGHT - 22);
    } else if (car.driver === null && Math.abs(car.speed) > 1) {
      stepCar(car, dt, { throttle: 0, steer: 0, brake: true });
    }
  }
  collideCars(world);
  // Pedestrians; hostile rivals report their hits on the player.
  for (const ped of world.peds) {
    const out = { struckPlayer: false };
    stepPed(world.random, world.city, ped, dt, world.danger, world.player.inCar ? null : world.player, out);
    if (out.struckPlayer) damagePlayer(world, 9);
  }
  updatePolice(world.random, world, dt);
  updateMissions(world.random, world, dt);
  // Effects fade.
  for (let i = world.effects.length - 1; i >= 0; i -= 1) {
    world.effects[i].life -= dt;
    if (world.effects[i].life <= 0) world.effects.splice(i, 1);
  }
  // Camera: follow the player (or the car), clamped to the world.
  const focusX = world.player.x; const focusY = world.player.y;
  world.camera.x = clamp(focusX - VIEW_WIDTH / 2, 0, Math.max(0, WORLD_WIDTH - VIEW_WIDTH));
  world.camera.y = clamp(focusY - VIEW_HEIGHT / 2, 0, Math.max(0, WORLD_HEIGHT - VIEW_HEIGHT));
}
