'use strict';
/* HUD: health, cash, wanted stars, objective, toast, minimap, clock. */
window.NT = window.NT || {};
NT.toast = function (world, text) { world.toastText = text; world.toastLife = 4.2; };
NT.renderHud = function (world, ctx) {
  const cfg = NT.config, p = world.player, pol = world.police;
  ctx.textAlign = 'left';
  // Cash + health, bottom-left
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(14, cfg.viewH - 86, 216, 72, 8); ctx.fill();
  ctx.fillStyle = '#a5d6a7'; ctx.font = 'bold 22px system-ui';
  ctx.fillText('$' + world.cash.toLocaleString('en-US'), 26, cfg.viewH - 56);
  ctx.fillStyle = '#37474f'; ctx.fillRect(26, cfg.viewH - 44, 190, 13);
  ctx.fillStyle = p.health > 30 ? '#66bb6a' : '#ef5350';
  ctx.fillRect(26, cfg.viewH - 44, 190 * Math.max(0, p.health) / 100, 13);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px system-ui';
  ctx.fillText(p.car ? 'DRIVING — ' + p.car.type.kind.toUpperCase() + '  (E to exit)' : 'ON FOOT — WASD move · F punch · click shoot · E enter car', 26, cfg.viewH - 20);
  // Wanted stars + clock, top-right (clear of the minimap)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(cfg.viewW - 236, 14, 222, 64, 8); ctx.fill();
  ctx.font = '24px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < pol.stars ? '#ffd54f' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', cfg.viewW - 26 - (4 - i) * 30, 44); }
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px system-ui';
  ctx.fillText(NT.phaseIcon(world.timeOfDay) + ' ' + NT.clockText(world.timeOfDay) + ' ' + NT.phaseOf(world.timeOfDay), cfg.viewW - 26, 68);
  ctx.textAlign = 'left';
  // Bust meter
  if (pol.bust > 0.02) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cfg.viewW / 2 - 110, 92, 220, 16);
    ctx.fillStyle = '#ef5350'; ctx.fillRect(cfg.viewW / 2 - 110, 92, 220 * pol.bust, 16);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED METER — MOVE!', cfg.viewW / 2, 85); ctx.textAlign = 'left';
  }
  // Objective banner
  if (world.missions && world.screen === 'playing') {
    const m = world.missions;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const wText = Math.min(760, 30 + ctx.measureText(m.objective).width + 260);
    ctx.beginPath(); ctx.roundRect(cfg.viewW / 2 - wText / 2, 14, wText, 40, 8); ctx.fill();
    ctx.fillStyle = '#ffe082'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(m.objective, cfg.viewW / 2, 39); ctx.textAlign = 'left';
    if (m.bannerLife > 0) {
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(m.banner, cfg.viewW / 2, 140); ctx.textAlign = 'left';
    }
  }
  // Phone-style toast
  if (world.toastLife > 0 && world.toastText) {
    ctx.font = '14px system-ui';
    const tw = Math.min(520, ctx.measureText(world.toastText).width + 44);
    ctx.fillStyle = 'rgba(16,24,32,0.88)';
    ctx.beginPath(); ctx.roundRect(cfg.viewW / 2 - tw / 2, cfg.viewH - 118, tw, 44, 12); ctx.fill();
    ctx.strokeStyle = '#4dd0e1'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e0f7fa'; ctx.textAlign = 'center';
    ctx.fillText('📱 ' + world.toastText, cfg.viewW / 2, cfg.viewH - 90);
    ctx.textAlign = 'left';
  }
  NT.drawMinimap(world, ctx);
};
NT.drawMinimap = function (world, ctx) {
  const cfg = NT.config, city = world.city;
  const mw = 196, mh = 132, x0 = cfg.viewW - mw - 14, y0 = cfg.viewH - mh - 14;
  const sx = mw / city.worldW, sy = mh / city.worldH;
  ctx.fillStyle = 'rgba(10,20,30,0.82)'; ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.fill();
  ctx.fillStyle = '#37474f'; ctx.fillRect(x0, y0, city.cityW * sx, city.cityH * sy);
  ctx.fillStyle = '#e6cf9a'; ctx.fillRect(x0 + city.cityW * sx, y0, cfg.beachW * sx, mh);
  ctx.fillStyle = '#1565c0'; ctx.fillRect(x0 + (city.cityW + cfg.beachW) * sx, y0, cfg.waterW * sx, mh);
  const blip = (x, y, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + x * sx, y0 + y * sy, r || 3, 0, Math.PI * 2); ctx.fill(); };
  for (const lm of city.landmarks) blip(lm.x, lm.y, lm.color, 2.4);
  for (const c of world.police.cars) blip(c.x, c.y, Math.floor(world.elapsed * 5) % 2 ? '#ff5252' : '#448aff', 3);
  if (world.missions && world.missions.marker) blip(world.missions.marker.x, world.missions.marker.y, '#ffeb3b', 4);
  const p = world.player;
  blip(p.x, p.y, '#ffffff', 4);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x0 + p.x * sx, y0 + p.y * sy);
  ctx.lineTo(x0 + p.x * sx + Math.cos(p.angle) * 9, y0 + p.y * sy + Math.sin(p.angle) * 9); ctx.stroke();
  ctx.fillStyle = '#b0bec5'; ctx.font = '10px system-ui'; ctx.fillText('SOLMAR BAY', x0 + 8, y0 + 14);
};
