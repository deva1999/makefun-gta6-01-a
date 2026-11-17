// The HUD and the screens: money, health, wanted stars, the mission banner and phone
// messages across the top, a live minimap in the corner with the player, traffic,
// police and the objective on it — plus the title, pause, busted and wasted screens.
import { VIEW_HEIGHT, VIEW_WIDTH, WORLD_HEIGHT, WORLD_WIDTH, clockForTime, phaseForTime } from './config.js';
import { currentObjective, MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_HELP = 'help';

function panel(ctx, x, y, w, h, alpha = 0.72) {
  ctx.fillStyle = `rgba(12,20,28,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function drawMinimap(ctx, world) {
  const w = 196; const h = 158;
  const x = VIEW_WIDTH - w - 16; const y = 16;
  const sx = w / WORLD_WIDTH; const sy = h / WORLD_HEIGHT;
  panel(ctx, x - 6, y - 6, w + 12, h + 30, 0.66);
  ctx.fillStyle = '#2c6e7f';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#cfc4ae';
  for (const b of world.city.buildings) ctx.fillRect(x + b.x * sx, y + b.y * sy, Math.max(1.6, b.w * sx), Math.max(1.6, b.h * sy));
  ctx.fillStyle = '#79b657';
  for (const park of world.city.parks) ctx.fillRect(x + park.x * sx, y + park.y * sy, park.w * sx, park.h * sy);
  ctx.fillStyle = '#eedaa4';
  ctx.fillRect(x, y + world.city.beachY * sy, w, 8);
  const obj = currentObjective(world.missions);
  if (obj && obj.x !== null && obj.x !== undefined) {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath(); ctx.arc(x + obj.x * sx, y + obj.y * sy, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,61,0.6)';
    ctx.beginPath(); ctx.arc(x + obj.x * sx, y + obj.y * sy, 7 + Math.sin(world.time * 5) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  for (const car of world.cars) {
    if (car.police) { ctx.fillStyle = Math.sin(world.time * 9 + car.sirenPhase) > 0 ? '#ff3b30' : '#2f7bff'; }
    else if (car.driver === 'player') continue;
    else ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x + car.x * sx - 1.6, y + car.y * sy - 1.6, 3.2, 3.2);
  }
  // The player: a white arrow that turns with him.
  const px = x + world.player.x * sx; const py = y + world.player.y * sy;
  ctx.save();
  ctx.translate(px, py); ctx.rotate(world.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.4); ctx.lineTo(-5, 4.4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', x + 2, y + h + 19);
}

function drawStars(ctx, world) {
  const stars = world.wanted.stars;
  const x = VIEW_WIDTH - 232; const y = 230;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? (Math.sin(world.time * 6) > -0.4 ? '#ffd93d' : '#c9a227') : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', x + i * 30, y);
  }
  if (world.wanted.bust > 0.03 && stars > 0) {
    ctx.fillStyle = 'rgba(12,20,28,0.72)';
    ctx.beginPath(); ctx.roundRect(x - 4, y + 10, 158, 16, 8); ctx.fill();
    ctx.fillStyle = '#ff5147';
    ctx.beginPath(); ctx.roundRect(x - 1, y + 13, 152 * Math.min(1, world.wanted.bust), 10, 5); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('BUSTED?', x + 48, y + 21);
  }
}

function drawClock(ctx, world) {
  const tod = world.timeOfDay ?? 0.5;
  const phase = phaseForTime(tod);
  const icon = phase === 'night' ? '🌙' : phase === 'day' ? '☀️' : phase === 'dusk' ? '🌇' : '🌅';
  panel(ctx, 16, 16, 118, 40, 0.66);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${icon} ${clockForTime(tod)}`, 26, 42);
}

export function drawHUD(ctx, world, screen) {
  if (screen === SCREEN_TITLE) return;
  drawClock(ctx, world);
  // Money and health, bottom-left.
  panel(ctx, 16, VIEW_HEIGHT - 86, 208, 70, 0.66);
  ctx.fillStyle = '#7be495';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${world.player.money}`, 28, VIEW_HEIGHT - 50);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(world.player.inCar ? `🚗 ${world.player.inCar.kind.name}  •  ${Math.round(Math.abs(world.player.inCar.speed) * 0.36)} km/h` : 'ON FOOT — E: steal a car', 28, VIEW_HEIGHT - 30);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.roundRect(120, VIEW_HEIGHT - 66, 92, 10, 5); ctx.fill();
  ctx.fillStyle = world.player.health > 30 ? '#ff5d47' : '#ff2d20';
  ctx.beginPath(); ctx.roundRect(120, VIEW_HEIGHT - 66, 92 * Math.max(0, world.player.health) / 100, 10, 5); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText('HEALTH', 120, VIEW_HEIGHT - 70 + 0); // label sits above the bar via the panel text below
  // Mission banner, top-centre.
  const obj = currentObjective(world.missions);
  const mission = MISSIONS[Math.min(world.missions.index, MISSIONS.length - 1)];
  const title = world.missions.done ? 'NEON TIDE — STORY COMPLETE' : world.missions.active ? `JOB: ${mission.title.toUpperCase()}` : 'NEON TIDE: SOLMAR BAY';
  const label = obj ? obj.label : '';
  const tw = Math.max(ctx.measureText(title).width, ctx.measureText(label).width) + 36;
  panel(ctx, VIEW_WIDTH / 2 - tw / 2, 14, tw, 58, 0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd93d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(title, VIEW_WIDTH / 2, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(label, VIEW_WIDTH / 2, 59);
  // Phone message toast.
  if (world.missions.messageTimer > 0 && world.missions.message) {
    const msg = world.missions.message;
    ctx.font = '13.5px system-ui, sans-serif';
    if (ctx.measureText(msg).width > 950) ctx.font = '11.5px system-ui, sans-serif';
    const mw = Math.min(980, ctx.measureText(msg).width + 30);
    panel(ctx, VIEW_WIDTH / 2 - mw / 2, 84, mw, 34, 0.78);
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText(msg, VIEW_WIDTH / 2, 106);
  }
  drawMinimap(ctx, world);
  drawStars(ctx, world);
  // Controls hint, bottom-right.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11.5px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD move/drive • E car • F punch • Click shoot • Shift sprint • P pause • F5 save', VIEW_WIDTH - 16, VIEW_HEIGHT - 14);
}

function centreLines(ctx, lines) {
  ctx.textAlign = 'center';
  let y = 218;
  for (const [text, font, color] of lines) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, VIEW_WIDTH / 2, y);
    y += parseInt(font.match(/(\d+)px/)[1], 10) + 14;
  }
}

export function drawScreen(ctx, world, screen, hasSave) {
  if (screen === SCREEN_PLAY) return;
  if (screen === SCREEN_TITLE) {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, 'rgba(16,24,48,0.25)');
    grad.addColorStop(0.55, 'rgba(16,24,48,0.05)');
    grad.addColorStop(1, 'rgba(10,14,30,0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('S O L M A R   B A Y', VIEW_WIDTH / 2, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 92px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(255,110,64,0.8)'; ctx.shadowBlur = 34;
    ctx.fillText('NEON TIDE', VIEW_WIDTH / 2, 238);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#bfeef2';
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('An open-world crime story in a sun-soaked city that is not yours — yet.', VIEW_WIDTH / 2, 278);
    panel(ctx, VIEW_WIDTH / 2 - 250, 330, 500, 196, 0.78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16.5px system-ui, sans-serif';
    const menu = [
      hasSave ? '▶  ENTER — Continue Kiko\'s story' : '▶  ENTER / CLICK — Start Kiko\'s story',
      'Steal cars, run jobs for Lucia Maré, dodge the SBPD.',
      'WASD move & drive • E enter car • F punch • Mouse aim, click to shoot',
      'Shift sprint • Space brake • P pause • F5 save • M mute',
      `Story: 5 jobs • Cars stolen, cash and chaos are saved in your browser.`,
    ];
    menu.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, 368 + i * 32));
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12.5px system-ui, sans-serif';
    ctx.fillText('A complete little open world: traffic, crowds, police, combat, missions, a minimap and a bay at sunset.', VIEW_WIDTH / 2, 566);
    return;
  }
  ctx.fillStyle = 'rgba(8,12,22,0.62)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (screen === SCREEN_PAUSED) {
    centreLines(ctx, [
      ['PAUSED', 'bold 54px system-ui, sans-serif', '#ffffff'],
      ['P or Esc to keep playing', '18px system-ui, sans-serif', '#bfeef2'],
      [`Cash $${world.player.money} • Cars stolen ${world.player.carsStolen} • Jobs done ${world.missions.index}/5`, '16px system-ui, sans-serif', '#ffd93d'],
    ]);
  } else if (screen === SCREEN_BUSTED) {
    centreLines(ctx, [
      ['BUSTED', '900 72px system-ui, sans-serif', '#ff5147'],
      ['The SBPD got their hands on Kiko.', '19px system-ui, sans-serif', '#ffffff'],
      ['Fine paid. Released outside Clínica Brisa — press Enter.', '16px system-ui, sans-serif', '#bfeef2'],
    ]);
  } else if (screen === SCREEN_WASTED) {
    centreLines(ctx, [
      ['WASTED', '900 72px system-ui, sans-serif', '#ff5147'],
      ['Kiko wakes up at Clínica Brisa, $100 lighter.', '19px system-ui, sans-serif', '#ffffff'],
      ['Press Enter to get back on the street.', '16px system-ui, sans-serif', '#bfeef2'],
    ]);
  } else if (screen === SCREEN_HELP) {
    centreLines(ctx, [
      ['HOW TO PLAY', 'bold 44px system-ui, sans-serif', '#ffd93d'],
      ['Follow the gold marker. Take jobs with Enter. Steal any car with E.', '17px system-ui, sans-serif', '#ffffff'],
      ['Crimes raise ★ wanted stars; break sight and stay clean to cool down.', '17px system-ui, sans-serif', '#ffffff'],
      ['If police pin you while you are slow, the bust meter fills. Do not let it.', '17px system-ui, sans-serif', '#ffffff'],
    ]);
  }
}
