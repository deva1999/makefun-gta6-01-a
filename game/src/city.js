'use strict';
/* Seeded city grid: blocks, roads, landmarks, beach + bay, streetlamps. */
window.NT = window.NT || {};
NT.buildCity = function (rng) {
  const cfg = NT.config;
  const cityW = cfg.gridCols * cfg.pitch + cfg.roadW;
  const cityH = cfg.gridRows * cfg.pitch + cfg.roadW;
  const worldW = cityW + cfg.beachW + cfg.waterW;
  const worldH = cityH;
  const roofPalette = ['#8d6e63', '#a1887f', '#90a4ae', '#b0a18e', '#7f8c9b', '#c2a878', '#96705a', '#6d8a96'];
  const blocks = [];
  for (let r = 0; r < cfg.gridRows; r++) {
    for (let c = 0; c < cfg.gridCols; c++) {
      blocks.push({
        c, r,
        x: cfg.roadW + c * cfg.pitch,
        y: cfg.roadW + r * cfg.pitch,
        w: cfg.blockSize, h: cfg.blockSize,
        roof: NT.rngPick(rng, roofPalette),
        trim: NT.rngPick(rng, ['#5d4037', '#546e7a', '#6d4c41', '#455a64']),
        floors: 2 + Math.floor(rng() * 5),
        plaza: rng() < 0.12,
      });
    }
  }
  const blockAt = (c, r) => blocks[r * cfg.gridCols + c];
  const landmarks = [
    { name: 'Mercado Sol', block: blockAt(2, 2), color: '#ffb74d' },
    { name: 'Hotel Brisa', block: blockAt(5, 1), color: '#81d4fa' },
    { name: 'Torre Coral', block: blockAt(3, 5), color: '#f48fb1' },
    { name: 'Solmar Marina', block: null, x: cityW + cfg.beachW * 0.45, y: cityH * 0.30, color: '#4dd0e1' },
    { name: 'Bahia Market', block: blockAt(8, 3), color: '#aed581' },
    { name: 'Club Neon Tide', block: blockAt(6, 6), color: '#ba68c8' },
    { name: 'Solmar Clinic', block: blockAt(1, 6), color: '#e0e0e0' },
    { name: 'Old Fort Pier', block: null, x: cityW + cfg.beachW * 0.8, y: cityH * 0.72, color: '#ffcc80' },
  ];
  for (const lm of landmarks) if (lm.block) { lm.x = lm.block.x + lm.block.w / 2; lm.y = lm.block.y + lm.block.h / 2; lm.block.landmark = lm.name; }
  const lamps = [];
  for (let r = 0; r <= cfg.gridRows; r++) {
    for (let c = 0; c <= cfg.gridCols; c++) {
      if ((c + r) % 2 === 0) lamps.push({ x: c * cfg.pitch + cfg.roadW / 2, y: r * cfg.pitch + cfg.roadW / 2 });
    }
  }
  const isRoad = (x, y) => {
    if (x < 0 || y < 0 || x > cityW || y > cityH) return false;
    const mx = x % cfg.pitch, my = y % cfg.pitch;
    return mx < cfg.roadW || my < cfg.roadW;
  };
  const isSand = (x) => x >= cityW && x < cityW + cfg.beachW;
  const isWater = (x) => x >= cityW + cfg.beachW;
  const buildingRectAt = (x, y) => {
    for (const b of blocks) {
      if (b.plaza) continue;
      if (x > b.x + 6 && x < b.x + b.w - 6 && y > b.y + 6 && y < b.y + b.h - 6) return b;
    }
    return null;
  };
  // Push a circle out of building footprints; returns corrected point.
  const collide = (x, y, rad) => {
    for (const b of blocks) {
      if (b.plaza) continue;
      const x0 = b.x + 4, y0 = b.y + 4, x1 = b.x + b.w - 4, y1 = b.y + b.h - 4;
      if (x > x0 - rad && x < x1 + rad && y > y0 - rad && y < y1 + rad) {
        const dl = x - (x0 - rad), dr = (x1 + rad) - x, dtp = y - (y0 - rad), db = (y1 + rad) - y;
        const m = Math.min(dl, dr, dtp, db);
        if (m === dl) x = x0 - rad; else if (m === dr) x = x1 + rad;
        else if (m === dtp) y = y0 - rad; else y = y1 + rad;
      }
    }
    return { x: Math.max(rad, Math.min(worldW - rad, x)), y: Math.max(rad, Math.min(worldH - rad, y)) };
  };
  return { blocks, landmarks, lamps, cityW, cityH, worldW, worldH, isRoad, isSand, isWater, buildingRectAt, collide };
};
