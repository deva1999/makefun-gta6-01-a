// The save: one localStorage slot holding money, story progress, position, health and
// the car Kiko was last driving. Saving happens on every job done and on demand (F5);
// the title screen offers Continue when a save exists. Corrupt saves are ignored.
import { SAVE_KEY } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch { return null; }
}

export function writeSave(world) {
  try {
    const p = world.player;
    const data = {
      money: p.money,
      missionIndex: world.missions.index,
      missionDone: world.missions.done,
      x: Math.round(p.x), y: Math.round(p.y),
      health: Math.round(p.health),
      carsStolen: p.carsStolen, jobsDone: world.missions.index,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage off */ }
}
