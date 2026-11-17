// Pedestrians: Solmar locals strolling the pavements and the promenade, chatting in pairs,
// fleeing from gunfire and speeding cars — and, in the warehouse job, the Coral Kings rivals
// who fight back. One walker body serves all of them; flags decide how it behaves.
import { BLOCK, PITCH, ROAD, WORLD_HEIGHT, WORLD_WIDTH } from './config.js';
import { collideCircle } from './city.js';
import { clamp } from './random.js';

const SHIRTS = ['#ff6b6b', '#ffd93d', '#6bcbff', '#95e06c', '#ff9ff3', '#feca57', '#e8e8e8', '#48dbfb', '#ff9f43', '#c8d6e5'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

let nextPedId = 1;
export function createPed(random, x, y, opts = {}) {
  return {
    id: nextPedId++,
    x, y, angle: random.range(0, Math.PI * 2),
    speed: 0, walkPhase: random.range(0, 6),
    shirt: opts.shirt ?? random.pick(SHIRTS),
    skin: random.pick(SKINS),
    health: opts.health ?? 100,
    hostile: !!opts.hostile,
    name: opts.name ?? null,
    state: 'walk', // walk | flee | fight | down
    targetX: x, targetY: y,
    retarget: random.range(0, 3),
    attackCooldown: 0,
    dead: false,
  };
}

/** A pavement point to wander toward: sidewalks ring every block, plus the promenade. */
function wanderTarget(random, ped) {
  if (random.chance(0.16)) { // head for the beach promenade
    return { x: random.range(40, WORLD_WIDTH - 40), y: 8 * PITCH + ROAD + random.range(14, 90) };
  }
  const col = clamp(Math.floor(ped.x / PITCH) + random.int(-1, 1), 0, 10);
  const row = clamp(Math.floor(ped.y / PITCH) + random.int(-1, 1), 0, 7);
  const side = random.int(0, 3);
  const bx = col * PITCH + ROAD; const by = row * PITCH + ROAD;
  if (side === 0) return { x: bx + random.range(0, BLOCK), y: by - 13 };
  if (side === 1) return { x: bx + random.range(0, BLOCK), y: by + BLOCK + 13 };
  if (side === 2) return { x: bx - 13, y: by + random.range(0, BLOCK) };
  return { x: bx + BLOCK + 13, y: by + random.range(0, BLOCK) };
}

export function spawnCrowd(random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const col = random.int(0, 10); const row = random.int(0, 7);
    const x = col * PITCH + ROAD + random.range(0, BLOCK);
    const y = row * PITCH + ROAD - 13 + (random.chance(0.5) ? 0 : BLOCK + 26);
    peds.push(createPed(random, x, clamp(y, 16, WORLD_HEIGHT - 16)));
  }
  for (let i = 0; i < 8; i += 1) { // beach crowd
    peds.push(createPed(random, random.range(60, WORLD_WIDTH - 60), 8 * PITCH + ROAD + random.range(20, 110)));
  }
  return peds;
}

/**
 * Advance one pedestrian. `danger` is a list of {x, y} points to flee (gunfire, a fast car,
 * a fight). Hostile peds close on `foe` and strike. Returns events via `out` flags.
 */
export function stepPed(random, city, ped, dt, danger, foe, out) {
  if (ped.dead) return;
  ped.attackCooldown = Math.max(0, ped.attackCooldown - dt);
  let fleeing = false;
  for (const d of danger) {
    if (Math.hypot(d.x - ped.x, d.y - ped.y) < 110) fleeing = true;
  }
  if (ped.hostile && foe && !foe.dead) {
    ped.state = 'fight';
    const dist = Math.hypot(foe.x - ped.x, foe.y - ped.y);
    const want = Math.atan2(foe.y - ped.y, foe.x - ped.x);
    ped.angle = want;
    if (dist > 30) {
      ped.speed = 165;
      ped.x += Math.cos(want) * ped.speed * dt;
      ped.y += Math.sin(want) * ped.speed * dt;
    } else {
      ped.speed = 0;
      if (ped.attackCooldown <= 0) { ped.attackCooldown = 0.9; out.struckPlayer = true; }
    }
  } else if (fleeing) {
    ped.state = 'flee';
    let ax = 0; let ay = 0;
    for (const d of danger) { ax += ped.x - d.x; ay += ped.y - d.y; }
    ped.angle = Math.atan2(ay, ax);
    ped.speed = 205;
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
  } else {
    ped.state = 'walk';
    ped.retarget -= dt;
    if (ped.retarget <= 0 || Math.hypot(ped.targetX - ped.x, ped.targetY - ped.y) < 12) {
      const t = wanderTarget(random, ped);
      ped.targetX = t.x; ped.targetY = t.y;
      ped.retarget = random.range(4, 10);
    }
    const want = Math.atan2(ped.targetY - ped.y, ped.targetX - ped.x);
    let diff = ((want - ped.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    ped.angle += clamp(diff, -3 * dt, 3 * dt);
    ped.speed = 62;
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
  }
  ped.walkPhase += dt * (ped.speed > 10 ? ped.speed / 14 : 0);
  const pos = { x: ped.x, y: ped.y };
  collideCircle(city, pos, 10);
  ped.x = pos.x; ped.y = pos.y;
}

export function damagePed(ped, amount) {
  if (ped.dead) return false;
  ped.health -= amount;
  if (ped.health <= 0) { ped.dead = true; ped.state = 'down'; return true; }
  return false;
}
