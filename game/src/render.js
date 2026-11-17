// Rendering: a sun-soaked top-down city with pseudo-3D buildings (walls extruded toward
// the south-east sun shadow, roofs above), striped avenues, palms, the beach and the bay.
// Everything is drawn from the world state each frame; nothing is pre-rendered or loaded.
import { BLOCK, PITCH, ROAD, ROWS, VIEW_HEIGHT, VIEW_WIDTH, WORLD_WIDTH } from './config.js';
import { currentObjective } from './missions.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGround(ctx, world, cam) {
  const { city } = world;
  const p = city.palette;
  ctx.fillStyle = p.pavement;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // Parks
  ctx.fillStyle = p.grass;
  for (const park of city.parks) ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
  // Roads: avenues first as long strips, then intersection squares blend in.
  ctx.fillStyle = p.road;
  for (let col = 0; col <= 11; col += 1) ctx.fillRect(col * PITCH - cam.x, -cam.y, ROAD, ROWS * PITCH + ROAD);
  for (let row = 0; row <= ROWS; row += 1) ctx.fillRect(-cam.x, row * PITCH - cam.y, WORLD_WIDTH, ROAD);
  // Lane dashes
  ctx.fillStyle = p.lane;
  for (let col = 0; col <= 11; col += 1) {
    for (let y = 10; y < ROWS * PITCH; y += 34) if (((y / 34) | 0) % 2 === 0) ctx.fillRect(col * PITCH + ROAD / 2 - 2 - cam.x, y - cam.y, 4, 18);
  }
  for (let row = 0; row <= ROWS; row += 1) {
    for (let x = 10; x < WORLD_WIDTH; x += 34) if (((x / 34) | 0) % 2 === 0) ctx.fillRect(x - cam.x, row * PITCH + ROAD / 2 - 2 - cam.y, 18, 4);
  }
  // Crosswalks at a few intersections
  ctx.fillStyle = 'rgba(240,240,230,0.5)';
  for (let col = 0; col <= 11; col += 2) for (let row = 0; row <= ROWS; row += 3) {
    for (let i = 0; i < 4; i += 1) ctx.fillRect(col * PITCH + 6 + i * 14 - cam.x, row * PITCH + ROAD - 8 - cam.y, 8, 5);
  }
  // Beach and bay along the south edge
  const beachY = city.beachY - cam.y;
  ctx.fillStyle = p.sand;
  ctx.fillRect(0, beachY, VIEW_WIDTH, 96);
  ctx.fillStyle = p.sandDark;
  ctx.fillRect(0, beachY, VIEW_WIDTH, 6);
  const waterGrad = ctx.createLinearGradient(0, beachY + 96, 0, beachY + 200);
  waterGrad.addColorStop(0, p.water); waterGrad.addColorStop(1, p.waterDeep);
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, beachY + 96, VIEW_WIDTH, VIEW_HEIGHT - beachY);
  ctx.strokeStyle = p.foam;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= VIEW_WIDTH; x += 16) {
    const y = beachY + 96 + Math.sin((x + world.time * 40) / 46) * 3.5;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Promenade strip between road and sand
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(0, beachY - 4, VIEW_WIDTH, 8);
}

function drawBuildings(ctx, world, cam) {
  for (const b of world.city.buildings) {
    const x = b.x - cam.x; const y = b.y - cam.y;
    if (x + b.w < -80 || y + b.h < -80 || x > VIEW_WIDTH + 80 || y > VIEW_HEIGHT + 80) continue;
    const lift = b.height * 0.55;
    // Sun shadow to the south-east
    ctx.fillStyle = 'rgba(60,40,20,0.20)';
    ctx.fillRect(x + 10, y + 12, b.w, b.h);
    // Walls (extruded downward by height)
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h + lift);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(x, y + b.h, b.w, lift);
    ctx.fillRect(x + b.w - 7, y, 7, b.h + lift);
    // Roof
    ctx.fillStyle = b.roof;
    ctx.fillRect(x + 3, y + 3, b.w - 6, b.h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 3, y + 3, b.w - 6, 5);
    // Windows hint on the wall strip
    ctx.fillStyle = 'rgba(40,60,80,0.35)';
    const floors = Math.max(1, Math.floor(lift / 11));
    for (let f = 0; f < floors; f += 1) {
      for (let wx = x + 9; wx < x + b.w - 10; wx += 15) ctx.fillRect(wx, y + b.h + 4 + f * 11, 7, 5);
    }
    if (b.name) {
      ctx.fillStyle = 'rgba(30,30,40,0.85)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = b.name.toUpperCase();
      const w = ctx.measureText(label).width + 14;
      roundRect(ctx, x + b.w / 2 - w / 2, y + b.h / 2 - 11, w, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(label, x + b.w / 2, y + b.h / 2 + 3);
    }
  }
}

function drawPalms(ctx, world, cam) {
  for (const palm of world.city.palms) {
    const x = palm.x - cam.x; const y = palm.y - cam.y;
    if (x < -30 || y < -30 || x > VIEW_WIDTH + 30 || y > VIEW_HEIGHT + 30) continue;
    ctx.fillStyle = 'rgba(60,40,20,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 5, y + 6, 13 * palm.s, 6 * palm.s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6b42';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.quadraticCurveTo(x + 2, y, x + 4, y - 6); ctx.stroke();
    ctx.strokeStyle = '#3f9e4d';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + palm.s;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 6);
      ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 9 * palm.s, y - 6 + Math.sin(a) * 6 * palm.s - 3, x + 4 + Math.cos(a) * 15 * palm.s, y - 6 + Math.sin(a) * 10 * palm.s);
      ctx.stroke();
    }
  }
}

export function drawCar(ctx, car, cam, time) {
  const x = car.x - cam.x; const y = car.y - cam.y;
  if (x < -70 || y < -70 || x > VIEW_WIDTH + 70 || y > VIEW_HEIGHT + 70) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(40,30,10,0.28)';
  roundRect(ctx, -21, -8 + 5, 50, 24, 7); ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -24, -11, 50, 22, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, -24, -11, 50, 7, 7); ctx.fill();
  // Cabin and glass
  ctx.fillStyle = '#22303c';
  roundRect(ctx, -6, -9, 20, 18, 4); ctx.fill();
  ctx.fillStyle = '#9fd4e8';
  roundRect(ctx, 8, -8, 6, 16, 2); ctx.fill();
  roundRect(ctx, -12, -8, 5, 16, 2); ctx.fill();
  // Wheels
  ctx.fillStyle = '#14161a';
  for (const [wx, wy] of [[-16, -12], [15, -12], [-16, 9], [15, 9]]) ctx.fillRect(wx, wy, 9, 4 + (wy < 0 ? 0 : 0));
  // Headlights at speed, brake lights when slowing
  if (Math.abs(car.speed) > 12) {
    ctx.fillStyle = 'rgba(255,244,180,0.85)';
    ctx.fillRect(25, -8, 3, 4); ctx.fillRect(25, 4, 3, 4);
  }
  if (car.police) {
    ctx.fillStyle = '#1d2733';
    roundRect(ctx, -24, -11, 50, 6, 6); ctx.fill();
    roundRect(ctx, -24, 5, 50, 6, 6); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD', 1, 3);
    const phase = Math.sin(time * 9 + car.sirenPhase) > 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#2f7bff';
    ctx.beginPath(); ctx.arc(-2, 0, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = phase ? '#2f7bff' : '#ff3b30';
    ctx.beginPath(); ctx.arc(5, 0, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = phase ? 'rgba(255,59,48,0.20)' : 'rgba(47,123,255,0.20)';
    ctx.beginPath(); ctx.arc(1, 0, 26, 0, Math.PI * 2); ctx.fill();
  }
  if (car.smoke > 0.15) {
    ctx.fillStyle = `rgba(70,70,70,${0.25 * car.smoke})`;
    ctx.beginPath(); ctx.arc(20 + Math.sin(time * 7 + car.id) * 3, -4, 6 + car.smoke * 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, ped, cam) {
  const x = ped.x - cam.x; const y = ped.y - cam.y;
  if (x < -30 || y < -30 || x > VIEW_WIDTH + 30 || y > VIEW_HEIGHT + 30) return;
  ctx.fillStyle = 'rgba(40,30,10,0.22)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (ped.dead) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(1.35);
    ctx.fillStyle = ped.shirt;
    roundRect(ctx, -10, -5, 20, 10, 4); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(13, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(ped.walkPhase) * 1.6;
  ctx.fillStyle = ped.hostile ? '#5b2a86' : '#3a4a5a';
  ctx.fillRect(x - 5, y + 3 + bob * 0.3, 4, 8); // legs
  ctx.fillRect(x + 1, y + 3 - bob * 0.3, 4, 8);
  ctx.fillStyle = ped.shirt;
  roundRect(ctx, -7, -6 + bob * 0.4, 14, 12, 5); ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(x, y - 9 + bob * 0.4, 5.4, 0, Math.PI * 2); ctx.fill();
  if (ped.hostile) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 19);
  }
}

function drawPlayer(ctx, world, cam) {
  const p = world.player;
  if (p.inCar || p.dead) return;
  const x = p.x - cam.x; const y = p.y - cam.y;
  const bob = Math.sin(p.walkPhase) * 1.8;
  ctx.fillStyle = 'rgba(40,30,10,0.25)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 6, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#173f35';
  ctx.fillRect(x - 6, y + 3 + bob * 0.3, 5, 9);
  ctx.fillRect(x + 1, y + 3 - bob * 0.3, 5, 9);
  ctx.fillStyle = '#ff7847'; // Kiko's coral shirt — visible in every screenshot
  roundRect(ctx, -8, -7 + bob * 0.4, 16, 13, 5); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ff7847';
  ctx.fillRect(6, 4, 9, 4); // gun arm toward aim
  ctx.fillStyle = '#222';
  ctx.fillRect(14, 5, 6, 2.4);
  ctx.restore();
  ctx.fillStyle = '#8d5524';
  ctx.beginPath(); ctx.arc(x, y - 10 + bob * 0.4, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#123c33';
  ctx.beginPath(); ctx.arc(x, y - 12 + bob * 0.4, 6, Math.PI, Math.PI * 2); ctx.fill(); // cap
}

function drawObjective(ctx, world, cam) {
  const obj = currentObjective(world.missions);
  if (!obj || obj.x === null || obj.x === undefined) return;
  const x = obj.x - cam.x; const y = obj.y - cam.y;
  const pulse = 1 + Math.sin(world.time * 5) * 0.18;
  if (x < -40 || y < -40 || x > VIEW_WIDTH + 40 || y > VIEW_HEIGHT + 40) {
    // Off-screen: an edge arrow pointing the way.
    const cx = Math.max(30, Math.min(VIEW_WIDTH - 30, x));
    const cy = Math.max(70, Math.min(VIEW_HEIGHT - 30, y));
    const a = Math.atan2(y - VIEW_HEIGHT / 2, x - VIEW_WIDTH / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(255,217,61,0.20)';
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd93d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 20 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd93d';
  ctx.beginPath();
  ctx.moveTo(x, y + 16); ctx.lineTo(x - 9, y - 8); ctx.lineTo(x + 9, y - 8);
  ctx.closePath(); ctx.fill();
}

function drawEffects(ctx, world, cam) {
  for (const fx of world.effects) {
    const t = fx.life / fx.max;
    if (fx.type === 'tracer') {
      ctx.strokeStyle = `rgba(255,230,120,${t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx.x - cam.x, fx.y - cam.y);
      ctx.lineTo(fx.x2 - cam.x, fx.y2 - cam.y);
      ctx.stroke();
    } else {
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = t * 0.8;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + fx.life * 9;
        const r = (1 - t) * 22;
        ctx.beginPath(); ctx.arc(fx.x - cam.x + Math.cos(a) * r, fx.y - cam.y + Math.sin(a) * r, 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    ctx,
    drawWorld(world) {
      const cam = world.camera;
      drawGround(ctx, world, cam);
      drawPalms(ctx, world, cam);
      drawBuildings(ctx, world, cam);
      for (const ped of world.peds) drawPed(ctx, ped, cam);
      for (const car of world.cars) drawCar(ctx, car, cam, world.time);
      drawPlayer(ctx, world, cam);
      drawEffects(ctx, world, cam);
      drawObjective(ctx, world, cam);
    },
  };
}
