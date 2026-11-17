'use strict';
/* Game state, day/night clock helpers, camera. */
window.NT = window.NT || {};
NT.createWorld = function (seed) {
  const cfg = NT.config;
  const rng = NT.makeRng(seed * 1000 + 17);
  const city = NT.buildCity(rng);
  return {
    seed, rng, city,
    screen: 'title',            // title | playing | paused | busted | wasted
    timeOfDay: cfg.startTimeOfDay,
    clockFrozen: false,
    elapsed: 0,
    cash: 250,
    dangerAt: -99, dangerX: 0, dangerY: 0,   // last gunshot / scare event
    tracers: [],                // {x1,y1,x2,y2,life}
    floaters: [],               // {x,y,text,life,color}
    camera: { x: 0, y: 0 },
    shake: 0,
  };
};
NT.advanceClock = function (world, dt) {
  if (world.clockFrozen) return;
  world.timeOfDay = (world.timeOfDay + dt / NT.config.dayLengthSec) % 1;
};
NT.phaseOf = function (t) {
  if (t < 0.21) return 'Night';
  if (t < 0.29) return 'Dawn';
  if (t < 0.66) return 'Day';
  if (t < 0.80) return 'Dusk';
  return 'Night';
};
/* 0 in full day, 1 in deep night; smooth shoulders at dawn/dusk. */
NT.darknessOf = function (t) {
  const sun = Math.sin((t - 0.25) * Math.PI * 2); // peaks near mid-afternoon
  if (sun >= 0.25) return 0;
  if (sun <= -0.45) return 1;
  return (0.25 - sun) / 0.7;
};
NT.clockText = function (t) {
  const mins = Math.floor(t * 24 * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return hh + ':' + mm;
};
NT.phaseIcon = function (t) {
  const p = NT.phaseOf(t);
  return p === 'Day' ? '☀' : p === 'Night' ? '☾' : p === 'Dawn' ? '◐' : '◑';
};
NT.updateCamera = function (world, focusX, focusY, dt) {
  const cfg = NT.config;
  const tx = focusX - cfg.viewW / 2, ty = focusY - cfg.viewH / 2;
  const k = Math.min(1, dt * 6 + 0.2);
  world.camera.x += (tx - world.camera.x) * k;
  world.camera.y += (ty - world.camera.y) * k;
  world.camera.x = Math.max(0, Math.min(world.city.worldW - cfg.viewW, world.camera.x));
  world.camera.y = Math.max(0, Math.min(world.city.worldH - cfg.viewH, world.camera.y));
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
};
