'use strict';
/* Screenshot poses for ?shot=<name>&seed=<n>: deterministic, clock frozen. */
window.NT = window.NT || {};
NT.shotName = function () {
  const s = new URLSearchParams(location.search).get('shot');
  return NT.config.shotNames.includes(s) ? s : null;
};
NT.applyShot = function (world, name) {
  const cfg = NT.config, city = world.city, p = world.player;
  world.clockFrozen = true;
  world.shotMode = true;
  const avenueY = 4 * cfg.pitch + cfg.roadW / 2;
  const downtownX = 5 * cfg.pitch + cfg.roadW / 2;
  const putInCar = (x, y, angle, speed, kind) => {
    let car = world.vehicles.parked.find((c) => c.type.kind === kind) || world.vehicles.parked[0];
    car.parked = false; car.driver = 'player';
    car.x = x; car.y = y; car.angle = angle; car.speed = speed;
    p.car = car; p.x = x; p.y = y; p.angle = angle;
    return car;
  };
  if (name === 'title') {
    world.timeOfDay = 0.76; world.screen = 'title';
    p.x = downtownX; p.y = avenueY; p.car = null;
  } else if (name === 'foot') {
    world.timeOfDay = 0.45; world.screen = 'playing';
    p.x = downtownX; p.y = avenueY; p.car = null; p.angle = -0.6;
    world.peds.slice(0, 4).forEach((ped, i) => { ped.x = p.x + 40 + i * 22; ped.y = p.y - 26 + i * 14; });
  } else if (name === 'drive') {
    world.timeOfDay = 0.50; world.screen = 'playing';
    putInCar(downtownX - 60, avenueY + 9, 0, 86, 'sedan');
    world.vehicles.traffic.slice(0, 4).forEach((car, i) => {
      car.axis = 'h'; car.angle = i % 2 ? Math.PI : 0;
      car.x = downtownX + (i - 1.5) * 130; car.y = avenueY + (i % 2 ? -9 : 9); car.speed = 55;
    });
  } else if (name === 'chase') {
    world.timeOfDay = 0.92; world.screen = 'playing';
    putInCar(downtownX + 40, avenueY + 9, 0, 130, 'sport');
    world.police.stars = 3; world.police.heat = 3.4;
    for (let i = 0; i < 3; i++) {
      world.police.cars.push({
        x: p.x - 90 - i * 64, y: avenueY + (i % 2 ? -10 : 10),
        angle: 0, speed: 120, type: NT.CAR_TYPES[0], color: '#263238', cop: true, hp: 40,
      });
    }
  }
  world.camera.x = Math.max(0, Math.min(city.worldW - cfg.viewW, p.x - cfg.viewW / 2));
  world.camera.y = Math.max(0, Math.min(city.worldH - cfg.viewH, p.y - cfg.viewH / 2));
};
