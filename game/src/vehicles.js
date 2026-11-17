'use strict';
/* Car types, lane-following traffic, parked cars, player car handling. */
window.NT = window.NT || {};
NT.CAR_TYPES = [
  { kind: 'sedan', w: 34, h: 17, top: 150, accel: 130, colors: ['#c0c6cc', '#5b7fa6', '#8e3b46', '#3f6d4e', '#d9d9d9'] },
  { kind: 'taxi', w: 34, h: 17, top: 145, accel: 125, colors: ['#f2c230', '#f2c230'] },
  { kind: 'hatch', w: 30, h: 16, top: 138, accel: 140, colors: ['#7fb069', '#e07a5f', '#81b29a', '#f2cc8f'] },
  { kind: 'truck', w: 44, h: 20, top: 112, accel: 92, colors: ['#9e9e9e', '#607d8b', '#795548'] },
  { kind: 'sport', w: 36, h: 16, top: 205, accel: 210, colors: ['#d32f2f', '#7b1fa2', '#1565c0', '#f9a825'] },
];
function spawnOnRoad(rng, city, cfg, horizontal) {
  const laneOff = cfg.roadW / 4;
  if (horizontal) {
    const row = Math.floor(rng() * (cfg.gridRows + 1));
    const dir = rng() < 0.5 ? 1 : -1;
    const y = row * cfg.pitch + cfg.roadW / 2 + (dir > 0 ? laneOff : -laneOff);
    return { x: rng() * city.cityW, y, angle: dir > 0 ? 0 : Math.PI, axis: 'h', dir };
  }
  const col = Math.floor(rng() * (cfg.gridCols + 1));
  const dir = rng() < 0.5 ? 1 : -1;
  const x = col * cfg.pitch + cfg.roadW / 2 + (dir > 0 ? -laneOff : laneOff);
  return { x, y: rng() * city.cityH, angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2, axis: 'v', dir };
}
NT.buildVehicles = function (world) {
  const cfg = NT.config, rng = world.rng, city = world.city;
  const traffic = [], parked = [];
  for (let i = 0; i < cfg.trafficCount; i++) {
    const type = NT.rngPick(rng, NT.CAR_TYPES);
    const s = spawnOnRoad(rng, city, cfg, rng() < 0.62);
    traffic.push({ ...s, type, color: NT.rngPick(rng, type.colors), speed: type.top * NT.rngRange(rng, 0.35, 0.6), parked: false, hp: 30 });
  }
  for (let i = 0; i < cfg.parkedCount; i++) {
    const type = NT.rngPick(rng, NT.CAR_TYPES);
    const s = spawnOnRoad(rng, city, cfg, rng() < 0.5);
    parked.push({ ...s, x: s.x, y: s.y, speed: 0, type, color: NT.rngPick(rng, type.colors), parked: true, hp: 30 });
  }
  return { traffic, parked, all: traffic.concat(parked) };
};
NT.updateTraffic = function (world, vehicles, dt) {
  const city = world.city;
  for (const car of vehicles.traffic) {
    if (car.driver === 'player' || car.dead) continue;
    let target = car.type.top * 0.5;
    // slow for a car ahead in the same lane
    for (const other of vehicles.all) {
      if (other === car || other.dead) continue;
      const dx = other.x - car.x, dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 52 && side < 13) target = Math.min(target, other.speed || 0);
    }
    if (world.player && world.player.car === car) target = 0;
    car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), car.type.accel * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.x < -60) car.x = city.cityW + 50; if (car.x > city.cityW + 60) car.x = -50;
    if (car.y < -60) car.y = city.cityH + 50; if (car.y > city.cityH + 60) car.y = -50;
  }
};
/* Drive the car the player sits in. keys: {up,down,left,right} */
NT.driveCar = function (world, car, keys, dt) {
  const t = car.type;
  if (keys.up) car.speed += t.accel * dt;
  else if (keys.down) car.speed -= (car.speed > 4 ? t.accel * 1.4 : t.accel * 0.7) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = Math.max(-t.top * 0.35, Math.min(t.top, car.speed));
  const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  if (Math.abs(car.speed) > 2) car.angle += steer * dt * 1.9 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 60);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = world.city.collide(nx, ny, NT.config.carRadius);
  if ((fixed.x !== nx || fixed.y !== ny) && Math.abs(car.speed) > 90) { world.shake = 7; car.hp -= 4; }
  car.x = fixed.x; car.y = fixed.y;
  if (world.city.isWater(car.x)) { car.speed *= 0.92; }
  return Math.abs(car.speed);
};
