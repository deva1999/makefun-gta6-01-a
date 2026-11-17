// Kiko, the player: walking and sprinting on foot with building collision, stepping
// into any car (parked, traffic or even a patrol car) to steal it, driving it with the
// shared car physics, and fighting — fists up close, a pistol toward the mouse. Crimes
// committed in sight of the city feed the wanted system.
import { PLAYER_TUNE, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';
import { collideCircle } from './city.js';
import { stepCar, collideCarWithCity } from './vehicles.js';
import { damagePed } from './pedestrians.js';
import { commitCrime } from './police.js';
import { clamp } from './random.js';

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, angle: -Math.PI / 2,
    radius: PLAYER_TUNE.radius,
    health: PLAYER_TUNE.maxHealth, money: 120,
    inCar: null, walkPhase: 0, gunCooldown: 0, punchCooldown: 0,
    carsStolen: 0, shotsFired: 0, dead: false,
    respawnTimer: 0,
  };
}

function nearestCar(world, x, y, maxDist) {
  let best = null; let bestD = maxDist;
  for (const car of world.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(world) {
  const player = world.player;
  const car = nearestCar(world, player.x, player.y, 40);
  if (!car) return false;
  if (car.driver === 'traffic') { // yank the driver out: a witnessed theft
    commitCrime(world.wanted, 1);
    player.carsStolen += 1;
  } else if (car.police) {
    commitCrime(world.wanted, 2);
    player.carsStolen += 1;
  } else if (car.driver === null) {
    player.carsStolen += 1;
    if (world.wanted.stars > 0 || Math.random() < 0.25) commitCrime(world.wanted, 1);
  }
  car.driver = 'player';
  car.speed = 0;
  player.inCar = car;
  world.audio.door();
  return true;
}

export function exitCar(world) {
  const player = world.player;
  const car = player.inCar;
  if (!car) return;
  car.driver = null;
  player.inCar = null;
  player.x = car.x + Math.cos(car.angle - Math.PI / 2) * 26;
  player.y = car.y + Math.sin(car.angle - Math.PI / 2) * 26;
  const pos = { x: player.x, y: player.y };
  collideCircle(world.city, pos, player.radius);
  player.x = pos.x; player.y = pos.y;
  world.audio.door();
}

function shoot(world, targetX, targetY) {
  const player = world.player;
  player.gunCooldown = PLAYER_TUNE.gunCooldown;
  player.shotsFired += 1;
  world.audio.shot();
  const angle = Math.atan2(targetY - player.y, targetX - player.x);
  player.angle = angle;
  world.effects.push({ type: 'tracer', x: player.x, y: player.y, x2: player.x + Math.cos(angle) * 46, y2: player.y + Math.sin(angle) * 46, life: 0.07, max: 0.07 });
  world.danger.push({ x: player.x, y: player.y });
  commitCrime(world.wanted, 2);
  // Hitscan: nearest ped or car body along the ray, up to 340 px.
  let bestT = 340; let hitPed = null; let hitCar = null;
  const dx = Math.cos(angle); const dy = Math.sin(angle);
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const px = ped.x - player.x; const py = ped.y - player.y;
    const t = px * dx + py * dy;
    if (t < 0 || t > bestT) continue;
    if (Math.abs(-px * dy + py * dx) < 13) { bestT = t; hitPed = ped; hitCar = null; }
  }
  for (const car of world.cars) {
    if (car === player.inCar) continue;
    const px = car.x - player.x; const py = car.y - player.y;
    const t = px * dx + py * dy;
    if (t < 0 || t > bestT) continue;
    if (Math.abs(-px * dy + py * dx) < 17) { bestT = t; hitCar = car; hitPed = null; }
  }
  if (hitPed) {
    const killed = damagePed(hitPed, PLAYER_TUNE.gunDamage);
    world.audio.hit();
    if (killed) { commitCrime(world.wanted, 1); world.effects.push({ type: 'burst', x: hitPed.x, y: hitPed.y, life: 0.4, max: 0.4, color: '#c0392b' }); }
    if (hitPed.hostile) hitPed.state = 'fight';
  } else if (hitCar) {
    hitCar.health -= PLAYER_TUNE.gunDamage * 0.7;
    world.effects.push({ type: 'burst', x: player.x + dx * bestT, y: player.y + dy * bestT, life: 0.25, max: 0.25, color: '#f7d154' });
  }
}

function punch(world) {
  const player = world.player;
  player.punchCooldown = 0.34;
  world.audio.punch();
  world.danger.push({ x: player.x, y: player.y });
  for (const ped of world.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - player.x, ped.y - player.y) < PLAYER_TUNE.punchRange) {
      const killed = damagePed(ped, PLAYER_TUNE.punchDamage);
      ped.x += Math.cos(player.angle) * 14; ped.y += Math.sin(player.angle) * 14;
      if (!ped.hostile) commitCrime(world.wanted, 1);
      if (killed) world.effects.push({ type: 'burst', x: ped.x, y: ped.y, life: 0.4, max: 0.4, color: '#c0392b' });
      if (ped.hostile) ped.state = 'fight';
    }
  }
}

/** Advance the player one step: driving if seated, else on foot with combat. */
export function stepPlayer(world, input, dt) {
  const player = world.player;
  player.gunCooldown = Math.max(0, player.gunCooldown - dt);
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  if (player.dead) {
    player.respawnTimer -= dt;
    return;
  }
  if (player.inCar) {
    const car = player.inCar;
    const drive = input.drive();
    const before = Math.abs(car.speed);
    stepCar(car, dt, drive);
    const impact = collideCarWithCity(world.city, car);
    if (impact > 150 && before > 150) {
      world.audio.crash(impact / 60);
      world.effects.push({ type: 'burst', x: car.x, y: car.y, life: 0.35, max: 0.35, color: '#f39c2f' });
      commitCrime(world.wanted, 1);
    }
    car.x = clamp(car.x, 22, WORLD_WIDTH - 22);
    car.y = clamp(car.y, 22, WORLD_HEIGHT - 22);
    player.x = car.x; player.y = car.y; player.angle = car.angle;
    // Running someone down is a serious crime and the city notices.
    for (const ped of world.peds) {
      if (ped.dead) continue;
      if (Math.abs(car.speed) > 60 && Math.hypot(ped.x - car.x, ped.y - car.y) < 20) {
        damagePed(ped, 100);
        commitCrime(world.wanted, 2);
        world.audio.crash(2);
      }
    }
    return;
  }
  const axis = input.axis();
  const drive = input.drive();
  const speed = drive.sprint ? PLAYER_TUNE.sprintSpeed : PLAYER_TUNE.walkSpeed;
  const len = Math.hypot(axis.x, axis.y) || 1;
  player.vx = (axis.x / len) * speed * (axis.x || axis.y ? 1 : 0);
  player.vy = (axis.y / len) * speed * (axis.x || axis.y ? 1 : 0);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const pos = { x: player.x, y: player.y };
  collideCircle(world.city, pos, player.radius);
  player.x = pos.x; player.y = pos.y;
  const mouse = input.mouse();
  const cam = world.camera;
  const worldMouseX = mouse.x + cam.x;
  const worldMouseY = mouse.y + cam.y;
  if (axis.x || axis.y) player.angle = Math.atan2(axis.y, axis.x);
  else if (mouse.down) player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
  player.walkPhase += dt * (Math.hypot(player.vx, player.vy) > 5 ? 11 : 0);
  if (mouse.down && player.gunCooldown <= 0) shoot(world, worldMouseX, worldMouseY);
}

export function tryPunch(world) {
  if (!world.player.inCar && world.player.punchCooldown <= 0 && !world.player.dead) punch(world);
}

export function damagePlayer(world, amount) {
  const player = world.player;
  if (player.dead) return;
  player.health -= amount;
  world.audio.hit();
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
    player.respawnTimer = 2.6;
    if (player.inCar) { player.inCar.driver = null; player.inCar = null; }
  }
}

/** Wasted or busted, Kiko wakes at Clínica Brisa with a lighter wallet. */
export function respawnPlayer(world) {
  const player = world.player;
  player.dead = false;
  player.health = PLAYER_TUNE.maxHealth;
  player.x = 5 * 294 + 32; player.y = 2 * 294 + 32;
  player.money = Math.max(0, player.money - 100);
  world.wanted.stars = 0; world.wanted.heat = 0; world.wanted.bust = 0; world.wanted.busted = false;
}
