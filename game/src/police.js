'use strict';
/* Five-star wanted system, chasing police cars, bust meter. */
window.NT = window.NT || {};
NT.createPolice = function () {
  return { stars: 0, heat: 0, bust: 0, cars: [], spawnTimer: 0, decayTimer: 0 };
};
NT.addHeat = function (world, amount, why) {
  const pol = world.police;
  pol.heat += amount;
  pol.decayTimer = 0;
  const want = Math.min(5, Math.floor(pol.heat));
  if (want > pol.stars) {
    pol.stars = want;
    if (world.audio) world.audio.sirenBurst();
    NT.toast(world, 'Wanted level: ' + '★'.repeat(pol.stars) + (why ? ' (' + why + ')' : ''));
  }
};
NT.updatePolice = function (world, dt) {
  const pol = world.police, player = world.player;
  if (!player) return;
  pol.decayTimer += dt;
  if (pol.decayTimer > 14 && pol.stars > 0) { // lay low long enough and heat fades
    pol.decayTimer = 0; pol.heat = Math.max(0, pol.heat - 1); pol.stars = Math.min(pol.stars, Math.floor(pol.heat));
    if (pol.stars === 0) NT.toast(world, 'You lost the cops.');
  }
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  const wantCars = pol.stars === 0 ? 0 : Math.min(NT.config.policeMax, pol.stars + 1);
  pol.spawnTimer -= dt;
  if (pol.cars.length < wantCars && pol.spawnTimer <= 0) {
    pol.spawnTimer = 1.6;
    const a = world.rng() * Math.PI * 2, d = 430;
    const sx = Math.max(20, Math.min(world.city.worldW - 20, px + Math.cos(a) * d));
    const sy = Math.max(20, Math.min(world.city.worldH - 20, py + Math.sin(a) * d));
    pol.cars.push({ x: sx, y: sy, angle: a + Math.PI, speed: 0, type: NT.CAR_TYPES[0], color: '#263238', cop: true, hp: 40 });
  }
  pol.cars = pol.cars.filter((c) => !c.dead);
  if (pol.stars === 0 && pol.cars.length) { // stand down: they peel away
    for (const c of pol.cars) { c.x += Math.cos(c.angle) * 60 * dt; c.y += Math.sin(c.angle) * 60 * dt; }
    pol.cars = pol.cars.filter((c) => Math.hypot(c.x - px, c.y - py) < 700);
    pol.bust = Math.max(0, pol.bust - dt);
    return;
  }
  let nearest = Infinity;
  for (const c of pol.cars) {
    const dx = px - c.x, dy = py - c.y;
    const dist = Math.hypot(dx, dy); nearest = Math.min(nearest, dist);
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const top = 168 + pol.stars * 9;
    const want = dist > 26 ? top : top * 0.3;
    c.speed += Math.sign(want - c.speed) * Math.min(Math.abs(want - c.speed), 170 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const fixed = world.city.collide(nx, ny, NT.config.carRadius);
    c.x = fixed.x; c.y = fixed.y;
    if (dist < 30 && Math.abs(c.speed) > 120 && player.car && Math.abs(player.car.speed) < 40) {
      player.health -= 6 * dt; world.shake = Math.max(world.shake, 3);
    }
  }
  // Bust meter: boxed in by a close cop while barely moving.
  const playerSpeed = player.car ? Math.abs(player.car.speed) : 0;
  if (nearest < 64 && playerSpeed < 22 && pol.stars > 0) {
    pol.bust += dt / NT.config.bustFillSec;
    if (pol.bust >= 1) { pol.bust = 1; world.screen = 'busted'; if (world.audio) world.audio.busted(); }
  } else {
    pol.bust = Math.max(0, pol.bust - dt * 0.7);
  }
};
