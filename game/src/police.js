// The wanted system and the Solmar Bay PD: crimes raise stars, stars bring patrol cars
// that hunt the player's position and try to box the car in, and standing still in reach
// of the law fills the bust meter. Lose sight of them, stay clean, and the stars fade.
import { WANTED_TUNE } from './config.js';
import { createCar, stepCar } from './vehicles.js';
import { clamp } from './random.js';

export function createWanted() {
  return { stars: 0, cleanTimer: 0, bust: 0, busted: false, heat: 0 };
}

/** Record a crime: severity 1 (car theft seen, reckless hit) to 3 (shooting an officer). */
export function commitCrime(wanted, severity) {
  wanted.heat = Math.min(5, wanted.heat + severity * 0.6);
  const stars = Math.min(5, Math.max(wanted.stars, Math.ceil(wanted.heat)));
  if (stars !== wanted.stars) wanted.stars = stars;
  wanted.cleanTimer = 0;
}

export function wantedForStars(stars) {
  return { cars: [0, 1, 2, 3, 4, 6][stars], speed: [0, 0.86, 0.92, 0.98, 1.04, 1.1][stars] };
}

function spawnPoint(random, player) {
  const angle = random.range(0, Math.PI * 2);
  const dist = random.range(430, 560);
  return {
    x: clamp(player.x + Math.cos(angle) * dist, 40, 3300),
    y: clamp(player.y + Math.sin(angle) * dist, 40, 2600),
    angle,
  };
}

/**
 * Keep the police fleet at the size the stars demand and steer each patrol car at the
 * player (or at the player's car). Patrol cars use the same physics as every other car.
 */
export function updatePolice(random, world, dt) {
  const { wanted, player } = world;
  const target = wantedForStars(wanted.stars);
  const fleet = world.cars.filter((c) => c.police && c.driver === 'police');
  while (fleet.length < target.cars) {
    const s = spawnPoint(random, player);
    const car = createCar(random, s.x, s.y, s.angle, { police: true, driver: 'police', color: '#f4f6f8' });
    world.cars.push(car);
    fleet.push(car);
  }
  for (let i = fleet.length - 1; i >= 0; i -= 1) {
    const car = fleet[i];
    if (wanted.stars === 0 && Math.hypot(car.x - player.x, car.y - player.y) > 700) {
      world.cars.splice(world.cars.indexOf(car), 1);
      continue;
    }
    const tx = player.inCar ? player.inCar.x : player.x;
    const ty = player.inCar ? player.inCar.y : player.y;
    const dist = Math.hypot(tx - car.x, ty - car.y);
    const want = Math.atan2(ty - car.y, tx - car.x);
    let diff = ((want - car.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const steer = clamp(diff * 2.4, -1, 1);
    const topSpeedRatio = target.speed;
    let throttle = 0.9;
    if (dist < 46) throttle = 0.1;           // alongside: match pace, crowd the player
    if (Math.abs(diff) > 2.4) throttle = -0.5; // facing away: reverse out and turn
    stepCar(car, dt, { throttle, steer, brake: false });
    car.speed = clamp(car.speed, -120, 335 * topSpeedRatio + 26);
    car.sirenPhase += dt * 9;
  }
  // Bust pressure: a slow or on-foot player with police in arm's reach is getting caught.
  const playerSpeed = player.inCar ? Math.abs(player.inCar.speed) : Math.hypot(player.vx, player.vy);
  let near = 0;
  for (const car of fleet) {
    if (Math.hypot(car.x - player.x, car.y - player.y) < WANTED_TUNE.bustRange) near += 1;
  }
  if (wanted.stars > 0 && near > 0 && playerSpeed < 55) {
    wanted.bust += dt / WANTED_TUNE.bustFillSeconds;
    if (wanted.bust >= 1) { wanted.busted = true; }
  } else {
    wanted.bust = Math.max(0, wanted.bust - dt * 0.7);
  }
  // Staying clean cools the heat; stars drop one at a time.
  if (wanted.stars > 0 && near === 0) {
    wanted.cleanTimer += dt;
    if (wanted.cleanTimer > WANTED_TUNE.decaySeconds) {
      wanted.cleanTimer = 0;
      wanted.stars -= 1;
      wanted.heat = wanted.stars;
    }
  } else if (near > 0) {
    wanted.cleanTimer = 0;
  }
}

/** After a bust: fine paid, stars cleared, a short walk from the station. */
export function applyBust(world) {
  const fine = Math.min(world.player.money, 150 + world.wanted.stars * 120);
  world.player.money -= fine;
  world.wanted.stars = 0;
  world.wanted.heat = 0;
  world.wanted.bust = 0;
  world.wanted.busted = false;
  world.wanted.cleanTimer = 0;
  return fine;
}
