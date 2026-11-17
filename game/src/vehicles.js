// Cars: arcade physics (throttle, brake, steering that firms up with speed), traffic that
// drives itself around the avenue grid keeping to the right-hand lane, and the shared
// body every driver — player, traffic or police — steers through the same step function.
import { CAR_COLORS, CAR_TUNE, COLS, PITCH, ROAD, ROWS } from './config.js';
import { avenueX, avenueY, circleHitsBuilding } from './city.js';
import { angleLerp, clamp } from './random.js';

let nextCarId = 1;
export const CAR_KINDS = [
  { name: 'Brisa Coupe', top: 1.0, grip: 1.0 },
  { name: 'Solmar Sedan', top: 0.92, grip: 1.0 },
  { name: 'Palma Pickup', top: 0.85, grip: 1.1 },
  { name: 'Coraluz Cabrio', top: 1.05, grip: 0.95 },
  { name: 'Mercado Van', top: 0.78, grip: 1.15 },
  { name: 'Faro GT', top: 1.18, grip: 0.9 },
];

export function createCar(random, x, y, angle, opts = {}) {
  const kind = opts.kind ?? CAR_KINDS[random.int(0, CAR_KINDS.length - 1)];
  return {
    id: nextCarId++, kind,
    x, y, angle, speed: 0,
    color: opts.color ?? random.pick(CAR_COLORS),
    police: !!opts.police,
    driver: opts.driver ?? null, // 'player' | 'traffic' | 'police' | null (parked)
    health: 100, smoke: 0,
    steer: 0, throttle: 0,
    // traffic route state
    laneDir: opts.laneDir ?? (angle === 0 || angle === Math.PI ? 'h' : 'v'),
    targetSpeed: random.range(120, 185),
    stuckTimer: 0,
    sirenPhase: random.range(0, 6),
  };
}

/** Parked cars sprinkled on avenues and in front of landmarks, ready to steal. */
export function spawnParkedCars(random, city) {
  const cars = [];
  const spots = [];
  for (let i = 0; i < 46; i += 1) {
    const vertical = random.chance(0.5);
    const col = random.int(0, COLS);
    const row = random.int(0, ROWS);
    const along = random.range(50, 240);
    const x = vertical ? avenueX(col) + (random.chance(0.5) ? -ROAD / 2 + 13 : ROAD / 2 - 13) : avenueX(col) + along - 120;
    const y = vertical ? avenueY(row) + along - 120 : avenueY(row) + (random.chance(0.5) ? -ROAD / 2 + 13 : ROAD / 2 - 13);
    if (circleHitsBuilding(city, x, y, 20)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < 60)) continue;
    spots.push({ x, y });
    cars.push(createCar(random, x, y, vertical ? Math.PI / 2 : 0, { driver: null }));
  }
  return cars;
}

/** Traffic cars already rolling on the avenues, in the correct lane for their heading. */
export function spawnTraffic(random, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = random.chance(0.5);
    const col = random.int(0, COLS);
    const row = random.int(0, ROWS);
    const dir = random.chance(0.5) ? 1 : -1;
    let x; let y; let angle;
    if (vertical) { // heading south (dir 1) keeps the west lane; north keeps the east lane
      x = avenueX(col) + (dir > 0 ? -11 : 11);
      y = random.range(40, ROWS * PITCH);
      angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = random.range(40, COLS * PITCH);
      y = avenueY(row) + (dir > 0 ? 11 : -11);
      angle = dir > 0 ? 0 : Math.PI;
    }
    if (circleHitsBuilding(city, x, y, 20)) continue;
    const car = createCar(random, x, y, angle, { driver: 'traffic', laneDir: vertical ? 'v' : 'h' });
    car.speed = car.targetSpeed * 0.8;
    cars.push(car);
  }
  return cars;
}

/** One physics step for any car. Input is {throttle -1..1, steer -1..1, brake}. */
export function stepCar(car, dt, input) {
  const tune = CAR_TUNE;
  const top = tune.maxSpeed * car.kind.top * (car.health < 30 ? 0.55 : 1);
  if (input.brake) {
    car.speed -= Math.sign(car.speed) * tune.brake * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  } else if (input.throttle > 0) {
    car.speed += tune.accel * input.throttle * dt * (car.speed < 0 ? 2.2 : 1);
  } else if (input.throttle < 0) {
    car.speed += tune.accel * 0.7 * input.throttle * dt * (car.speed > 0 ? 2.2 : 1);
  }
  car.speed -= car.speed * tune.drag * dt * 0.55;
  car.speed = clamp(car.speed, -tune.maxReverse * car.kind.top, top);
  const speedRatio = clamp(Math.abs(car.speed) / 160, 0, 1);
  const steerAuthority = (0.35 + 0.65 * speedRatio) * car.kind.grip;
  car.steer = input.steer;
  if (Math.abs(car.speed) > 2) {
    car.angle += input.steer * tune.turnRate * steerAuthority * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 120, 0.25, 1);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.smoke = car.health < 45 ? Math.min(1, car.smoke + dt) : Math.max(0, car.smoke - dt);
}

/** Keep a car out of buildings: slide along the wall and bleed speed. Returns impact speed. */
export function collideCarWithCity(city, car) {
  let impact = 0;
  const r = 15;
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(car.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(car.y, b.y + b.h));
    const dx = car.x - nx; const dy = car.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      impact = Math.max(impact, Math.abs(car.speed));
      const d = Math.sqrt(d2) || 1;
      car.x = nx + (dx / d) * r;
      car.y = ny + (dy / d) * r;
      car.speed *= -0.25;
      car.health -= impact * 0.03;
    }
  }
  car.x = clamp(car.x, 20, 99999); // world clamp happens in world step
  return impact;
}

/** Traffic brain: follow the lane, slow for the car ahead, turn at some intersections. */
export function trafficInput(random, car, cars, dt) {
  let throttle = car.speed < car.targetSpeed ? 0.75 : 0;
  let steer = 0;
  // Car ahead in my lane?
  const fx = Math.cos(car.angle); const fy = Math.sin(car.angle);
  for (const other of cars) {
    if (other === car) continue;
    const dx = other.x - car.x; const dy = other.y - car.y;
    const ahead = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (ahead > 0 && ahead < 62 && side < 16) { throttle = car.speed > other.speed + 6 ? -0.4 : 0; break; }
  }
  // Near an intersection centre, maybe turn onto the crossing avenue.
  const nearCol = Math.round((car.x - ROAD / 2) / PITCH);
  const nearRow = Math.round((car.y - ROAD / 2) / PITCH);
  const ix = avenueX(nearCol); const iy = avenueY(nearRow);
  if (Math.hypot(car.x - ix, car.y - iy) < 14 && random.chance(0.012)) {
    car.turning = random.chance(0.5) ? 1 : -1;
  }
  if (car.turning) {
    steer = car.turning;
    throttle = Math.min(throttle, 0.45);
    const target = car.laneDir === 'v'
      ? (car.turning > 0 ? (fx > 0 ? 0 : Math.PI) : (fx > 0 ? 0 : Math.PI))
      : (car.turning > 0 ? Math.PI / 2 : -Math.PI / 2);
    // Finish the turn when the heading roughly matches the new axis.
    const diff = Math.abs(((car.angle - target) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (diff < 0.25) { car.laneDir = car.laneDir === 'v' ? 'h' : 'v'; car.turning = 0; }
  } else {
    // Hold the lane centre line.
    const laneOffset = car.laneDir === 'v'
      ? (Math.sin(car.angle) > 0 ? -11 : 11)
      : (Math.cos(car.angle) > 0 ? 11 : -11);
    const line = car.laneDir === 'v' ? avenueX(Math.round((car.x - ROAD / 2) / PITCH)) + laneOffset : car.x;
    const lineY = car.laneDir === 'h' ? avenueY(Math.round((car.y - ROAD / 2) / PITCH)) + laneOffset : car.y;
    const want = Math.atan2(lineY - car.y + fy * 60, line - car.x + fx * 60);
    let diff = ((want - car.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    steer = clamp(diff * 2.2, -1, 1);
    car.angle = angleLerp(car.angle, car.angle + diff, 0); // heading kept by steer alone
  }
  return { throttle, steer, brake: throttle < 0 && car.speed > 30 };
}
