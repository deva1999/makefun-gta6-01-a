// The city of Solmar Bay: a grid of pastel blocks between straight avenues, a beach and
// the bay along the south edge, parks, palms and named landmarks. Generation is seeded,
// so every visit — and every screenshot — sees the same streets. Buildings are solid
// rectangles the player and cars collide with; roads are everything else.
import { BLOCK, BUILDING_COLORS, COLS, PALETTE, PITCH, ROAD, ROWS, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';

export const LANDMARKS = [
  { name: 'Solmar Marina', col: 1, row: 7 },
  { name: 'Hotel Coraluz', col: 5, row: 0 },
  { name: 'Torre Brisa', col: 8, row: 1 },
  { name: 'Mercado Sol', col: 3, row: 3 },
  { name: 'Bahia Mall', col: 7, row: 4 },
  { name: 'Portside Warehouse', col: 9, row: 6 },
  { name: 'Aero Solmar Gate', col: 0, row: 0 },
  { name: 'Plaza del Faro', col: 5, row: 5 },
];

/** World x of the centre of the vertical avenue to the left of block column `col`. */
export function avenueX(col) { return col * PITCH + ROAD / 2; }
/** World y of the centre of the horizontal avenue above block row `row`. */
export function avenueY(row) { return row * PITCH + ROAD / 2; }
/** True when a point sits on a road (avenues plus the beachfront promenade). */
export function isRoad(x, y) {
  if (y > ROWS * PITCH + ROAD) return x >= 0 && x <= WORLD_WIDTH;
  const mx = ((x % PITCH) + PITCH) % PITCH;
  const my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD || my < ROAD;
}

export function createCity(random) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const parks = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const bx = col * PITCH + ROAD;
      const by = row * PITCH + ROAD;
      const landmark = LANDMARKS.find((l) => l.col === col && l.row === row);
      if ((col * 7 + row * 13) % 11 === 4) { // a park block: grass, palms, no buildings
        parks.push({ x: bx, y: by, w: BLOCK, h: BLOCK });
        for (let i = 0; i < 7; i += 1) palms.push({ x: bx + random.range(24, BLOCK - 24), y: by + random.range(24, BLOCK - 24), s: random.range(0.8, 1.25) });
        continue;
      }
      const count = landmark ? 1 : random.int(2, 4);
      for (let i = 0; i < count; i += 1) {
        const w = count === 1 ? BLOCK - 36 : random.range(58, 104);
        const h = count === 1 ? BLOCK - 36 : random.range(58, 104);
        const x = count === 1 ? bx + 18 : bx + 10 + (i % 2) * (BLOCK / 2) + random.range(0, 14);
        const y = count === 1 ? by + 18 : by + 10 + Math.floor(i / 2) * (BLOCK / 2) + random.range(0, 14);
        buildings.push({
          x, y, w: Math.min(w, bx + BLOCK - x - 8), h: Math.min(h, by + BLOCK - y - 8),
          height: landmark ? random.range(46, 64) : random.range(14, 52),
          color: landmark ? '#fff3d6' : random.pick(BUILDING_COLORS),
          roof: random.pick(['#c96f4a', '#a8573f', '#d9d3c3', '#7fb3c8', '#e0a458']),
          name: landmark ? landmark.name : null,
        });
      }
      for (let i = 0; i < random.int(1, 3); i += 1) {
        palms.push({ x: bx + random.range(8, BLOCK - 8), y: by + BLOCK - 12, s: random.range(0.75, 1.1) });
      }
    }
  }
  for (let col = 0; col <= COLS; col += 1) for (let row = 0; row <= ROWS; row += 1) {
    lamps.push({ x: col * PITCH + 8, y: row * PITCH + 8 });
  }
  // Beach palms along the sand.
  for (let x = 60; x < WORLD_WIDTH - 40; x += random.range(90, 170)) {
    palms.push({ x, y: ROWS * PITCH + ROAD + random.range(26, 66), s: random.range(0.9, 1.4) });
  }
  return { buildings, palms, lamps, parks, beachY: ROWS * PITCH + ROAD, palette: PALETTE };
}

/** Push a circle (the player, a pedestrian) out of every building it overlaps. */
export function collideCircle(city, pos, radius) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - nx; const dy = pos.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 0.001) { pos.y = b.y - radius; continue; }
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * radius;
      pos.y = ny + (dy / d) * radius;
    }
  }
  pos.x = Math.max(radius, Math.min(WORLD_WIDTH - radius, pos.x));
  pos.y = Math.max(radius, Math.min(WORLD_HEIGHT - radius, pos.y));
}

/** True when a circle overlaps any building. */
export function circleHitsBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
  }
  return false;
}
