'use strict';
/* Neon Tide: Solmar Bay - central tuning constants. */
window.NT = window.NT || {};
NT.config = {
  viewW: 1280,
  viewH: 720,
  dayLengthSec: 240,          // one full day/night cycle
  startTimeOfDay: 0.71,       // late afternoon, sliding toward dusk
  gridCols: 11,
  gridRows: 8,                // 11 x 8 = 88 city blocks
  pitch: 160,                 // block + road pitch in world px
  roadW: 36,
  blockSize: 124,             // pitch - roadW
  beachW: 340,                // sand strip east of the grid
  waterW: 420,                // bay beyond the sand
  playerSpeed: 118,
  playerSprint: 188,
  playerRadius: 9,
  playerHealth: 100,
  carRadius: 15,
  trafficCount: 26,
  parkedCount: 22,
  pedCount: 30,
  policeMax: 6,
  bustFillSec: 2.6,           // boxed in at low speed for this long = busted
  saveKey: 'neon-tide-solmar-bay-save-v1',
  shotNames: ['title', 'foot', 'drive', 'chase'],
};
