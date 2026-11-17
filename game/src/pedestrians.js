'use strict';
/* Wandering pedestrians who flee from gunfire and fast cars. */
window.NT = window.NT || {};
NT.buildPeds = function (world) {
  const cfg = NT.config, rng = world.rng, city = world.city;
  const shirts = ['#ef5350', '#42a5f5', '#66bb6a', '#ffee58', '#ab47bc', '#ff7043', '#26a69a', '#ec407a'];
  const peds = [];
  for (let i = 0; i < cfg.pedCount; i++) {
    peds.push({
      x: NT.rngRange(rng, 30, city.cityW - 30), y: NT.rngRange(rng, 30, city.cityH - 30),
      angle: rng() * Math.PI * 2, speed: NT.rngRange(rng, 22, 40),
      color: NT.rngPick(rng, shirts), hp: 10, flee: 0, retarget: rng() * 3, dead: false,
    });
  }
  return peds;
};
NT.updatePeds = function (world, peds, dt) {
  const player = world.player;
  for (const p of peds) {
    if (p.dead) continue;
    const sinceShot = world.elapsed - world.dangerAt;
    const dDanger = Math.hypot(p.x - world.dangerX, p.y - world.dangerY);
    if (sinceShot < 2.5 && dDanger < 190) p.flee = 2.5;
    if (player && player.car && Math.abs(player.car.speed) > 95) {
      if (Math.hypot(p.x - player.car.x, p.y - player.car.y) < 70) p.flee = Math.max(p.flee, 1.2);
    }
    p.retarget -= dt;
    if (p.flee > 0) {
      p.flee -= dt;
      const sx = sinceShot < 2.5 ? world.dangerX : (player ? player.x : p.x);
      const sy = sinceShot < 2.5 ? world.dangerY : (player ? player.y : p.y);
      p.angle = Math.atan2(p.y - sy, p.x - sx);
      p.x += Math.cos(p.angle) * 105 * dt;
      p.y += Math.sin(p.angle) * 105 * dt;
    } else {
      if (p.retarget <= 0) { p.retarget = 2 + world.rng() * 3; p.angle = world.rng() * Math.PI * 2; }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    }
    const fixed = world.city.collide(p.x, p.y, 8);
    if (fixed.x !== p.x || fixed.y !== p.y) p.angle += Math.PI / 2;
    p.x = fixed.x; p.y = fixed.y;
    // getting run over hurts
    if (player && player.car && Math.abs(player.car.speed) > 60 &&
        Math.hypot(p.x - player.car.x, p.y - player.car.y) < 20 && !p.hitCooldown) {
      p.hp -= 10; p.hitCooldown = 1.5; NT.addHeat(world, 1, 'hit-and-run');
      if (p.hp <= 0) p.dead = true;
    }
    if (p.hitCooldown) p.hitCooldown -= dt;
  }
};
