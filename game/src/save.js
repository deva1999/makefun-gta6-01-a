'use strict';
/* localStorage save: cash, mission progress, player position. */
window.NT = window.NT || {};
NT.saveGame = function (world) {
  try {
    const data = {
      cash: world.cash,
      missionIndex: world.missions ? world.missions.index : 0,
      x: Math.round(world.player ? world.player.x : 0),
      y: Math.round(world.player ? world.player.y : 0),
    };
    localStorage.setItem(NT.config.saveKey, JSON.stringify(data));
  } catch (e) { /* storage may be unavailable; the game still runs */ }
};
NT.loadGame = function () {
  try {
    const raw = localStorage.getItem(NT.config.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (e) { return null; }
};
NT.applySave = function (world, data) {
  if (!data) return;
  if (Number.isFinite(data.cash)) world.cash = data.cash;
  if (world.player && Number.isFinite(data.x) && Number.isFinite(data.y)) {
    const fixed = world.city.collide(data.x, data.y, NT.config.playerRadius);
    world.player.x = fixed.x; world.player.y = fixed.y;
  }
  if (world.missions && Number.isInteger(data.missionIndex)) {
    world.missions.index = Math.max(0, Math.min(world.missions.jobs.length, data.missionIndex));
  }
};
