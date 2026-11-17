'use strict';
/* The player: on-foot movement, sprint, fists, pistol, stealing cars. */
window.NT = window.NT || {};
NT.createPlayer = function (world) {
  return {
    x: world.city.cityW * 0.42, y: world.city.cityH * 0.52,
    angle: 0, health: NT.config.playerHealth, car: null,
    punchCd: 0, shootCd: 0, dead: false,
  };
};
NT.nearestCar = function (world, maxDist) {
  const p = world.player; let best = null, bd = maxDist;
  for (const car of world.vehicles.all.concat(world.police.cars)) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
};
NT.updatePlayer = function (world, dt) {
  const p = world.player, input = world.input, cfg = NT.config;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  if (p.car) {
    NT.driveCar(world, p.car, input.keys, dt);
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
    if (input.pressed.has('KeyE')) {
      p.car.parked = true; p.car.speed = 0;
      p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 24;
      p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 24;
      p.car = null; NT.toast(world, 'On foot.');
    }
    return;
  }
  let mx = 0, my = 0;
  if (input.keys.up) my -= 1; if (input.keys.down) my += 1;
  if (input.keys.left) mx -= 1; if (input.keys.right) mx += 1;
  const sprint = input.keys.shift;
  if (mx || my) {
    const len = Math.hypot(mx, my), sp = sprint ? cfg.playerSprint : cfg.playerSpeed;
    const nx = p.x + (mx / len) * sp * dt, ny = p.y + (my / len) * sp * dt;
    const fixed = world.city.collide(nx, ny, cfg.playerRadius);
    p.x = fixed.x; p.y = fixed.y;
  }
  // Face the mouse when it has moved; otherwise face travel direction.
  const wx = world.camera.x + input.mouse.x, wy = world.camera.y + input.mouse.y;
  p.angle = Math.atan2(wy - p.y, wx - p.x);
  if (input.pressed.has('KeyE')) {
    const car = NT.nearestCar(world, 40);
    if (car) {
      const wasParked = car.parked;
      car.parked = false; car.driver = 'player';
      if (world.vehicles.traffic.includes(car)) {
        const i = world.vehicles.traffic.indexOf(car); // traffic car becomes player car
        world.vehicles.all[world.vehicles.all.indexOf(car)] = car;
      }
      p.car = car; p.x = car.x; p.y = car.y;
      NT.toast(world, wasParked ? 'You took the ' + car.type.kind + '.' : 'Carjacked a ' + car.type.kind + '!');
      if (world.audio) world.audio.engineStart();
      if (!wasParked || car.missionCar) NT.addHeat(world, 1.2, 'grand theft auto');
      if (world.missions) world.missions.onEnterCar(world, car);
    }
  }
  if (input.keys.punch && p.punchCd <= 0) {
    p.punchCd = 0.34;
    if (world.audio) world.audio.punch();
    const tx = p.x + Math.cos(p.angle) * 20, ty = p.y + Math.sin(p.angle) * 20;
    for (const ped of world.peds) {
      if (!ped.dead && Math.hypot(ped.x - tx, ped.y - ty) < 18) {
        ped.hp -= 5; ped.flee = 2;
        NT.floatText(world, ped.x, ped.y - 14, 'POW', '#ffee58');
        NT.addHeat(world, 0.6, 'assault');
        if (ped.hp <= 0) ped.dead = true;
      }
    }
    if (world.missions) world.missions.onPunch(world, tx, ty);
  }
  if (input.mouse.down && p.shootCd <= 0) NT.shoot(world);
  if (p.health <= 0 && !p.dead) { p.dead = true; world.screen = 'wasted'; if (world.audio) world.audio.wasted(); }
};
NT.shoot = function (world) {
  const p = world.player;
  p.shootCd = 0.22;
  if (world.audio) world.audio.gunshot();
  world.dangerAt = world.elapsed; world.dangerX = p.x; world.dangerY = p.y;
  const spread = (world.rng() - 0.5) * 0.05;
  const a = p.angle + spread, range = 330;
  let endX = p.x + Math.cos(a) * range, endY = p.y + Math.sin(a) * range, bestT = 1, hit = null;
  const test = (obj, rad) => {
    const dx = obj.x - p.x, dy = obj.y - p.y;
    const t = dx * Math.cos(a) + dy * Math.sin(a);
    if (t < 0 || t > range) return;
    const side = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    if (side < rad && t / range < bestT) { bestT = t / range; hit = obj; }
  };
  for (const ped of world.peds) if (!ped.dead) test(ped, 9);
  for (const e of (world.missions ? world.missions.enemies : [])) if (!e.dead) test(e, 10);
  for (const car of world.vehicles.all) if (!car.dead && car !== p.car) test(car, 15);
  for (const c of world.police.cars) test(c, 15);
  if (hit) { endX = hit.x; endY = hit.y; hit.hp -= 10; if (hit.hp <= 0) { hit.dead = true; NT.floatText(world, hit.x, hit.y - 16, 'DOWN', '#ef9a9a'); } }
  world.tracers.push({ x1: p.x + Math.cos(a) * 14, y1: p.y + Math.sin(a) * 14, x2: endX, y2: endY, life: 0.09 });
  NT.addHeat(world, 0.8, 'shots fired');
  if (world.missions) world.missions.onShoot(world, hit);
};
NT.floatText = function (world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color || '#ffffff', life: 1.1 });
};
