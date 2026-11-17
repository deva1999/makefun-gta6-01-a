'use strict';
/* Canvas renderer: city, beach, cars, peds, player, police, lighting. */
window.NT = window.NT || {};
function drawCar(ctx, car, world) {
  ctx.save();
  ctx.translate(car.x - world.camera.x, car.y - world.camera.y);
  ctx.rotate(car.angle);
  const w = car.type.w, h = car.type.h;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  ctx.fillStyle = car.dead ? '#37474f' : car.color;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 5); ctx.fill();
  ctx.fillStyle = '#b3e5fc';
  ctx.fillRect(-w * 0.08, -h * 0.34, w * 0.2, h * 0.68);   // windshield band
  ctx.fillStyle = '#263238';
  ctx.fillRect(-w * 0.34, -h * 0.36, w * 0.16, h * 0.72);  // rear glass
  if (car.cop) {
    ctx.fillStyle = '#eceff1'; ctx.fillRect(-w / 2, -h * 0.18, w, h * 0.36);
    const flash = Math.floor(world.elapsed * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff1744' : '#2979ff';
    ctx.fillRect(-4, -3, 8, 6);
  }
  if (car.missionCar) { ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 7); ctx.stroke(); }
  ctx.restore();
}
function drawPerson(ctx, x, y, angle, color, world, ring) {
  ctx.save();
  ctx.translate(x - world.camera.x, y - world.camera.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(1, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (ring) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke(); }
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffccbc';
  ctx.beginPath(); ctx.arc(2.5, 0, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.fillRect(6, -1.4, 6, 2.8); // held pistol direction cue
  ctx.restore();
}
NT.render = function (world, ctx) {
  const cfg = NT.config, city = world.city, cam = world.camera;
  const dark = NT.darknessOf(world.timeOfDay);
  ctx.fillStyle = '#0d47a1'; ctx.fillRect(0, 0, cfg.viewW, cfg.viewH);
  // Water with slow-moving sparkle lines
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(city.cityW + cfg.beachW - cam.x, 0, cfg.waterW, cfg.viewH);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = ((i * 97 + world.elapsed * 12) % (city.worldH)) - cam.y;
    const x = city.cityW + cfg.beachW + 30 + (i % 4) * 80 - cam.x;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y); ctx.stroke();
  }
  // Sand
  ctx.fillStyle = '#e6cf9a';
  ctx.fillRect(city.cityW - cam.x, -cam.y, cfg.beachW, city.worldH);
  ctx.fillStyle = '#d9bd7f';
  for (let i = 0; i < 26; i++) ctx.fillRect(city.cityW + 14 + (i * 53) % (cfg.beachW - 40) - cam.x, (i * 131) % city.worldH - cam.y, 9, 5);
  // Roads
  ctx.fillStyle = '#37474f'; ctx.fillRect(-cam.x, -cam.y, city.cityW, city.cityH);
  ctx.strokeStyle = 'rgba(255,235,59,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([16, 14]);
  for (let r = 0; r <= cfg.gridRows; r++) { const y = r * cfg.pitch + cfg.roadW / 2 - cam.y; ctx.beginPath(); ctx.moveTo(-cam.x, y); ctx.lineTo(city.cityW - cam.x, y); ctx.stroke(); }
  for (let c = 0; c <= cfg.gridCols; c++) { const x = c * cfg.pitch + cfg.roadW / 2 - cam.x; ctx.beginPath(); ctx.moveTo(x, -cam.y); ctx.lineTo(x, city.cityH - cam.y); ctx.stroke(); }
  ctx.setLineDash([]);
  // Blocks: plaza parks or roofed buildings
  for (const b of city.blocks) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (x < -b.w || y < -b.h || x > cfg.viewW || y > cfg.viewH) continue;
    if (b.plaza) {
      ctx.fillStyle = '#558b2f'; ctx.fillRect(x, y, b.w, b.h);
      ctx.fillStyle = '#33691e';
      ctx.beginPath(); ctx.arc(x + b.w * 0.3, y + b.h * 0.35, 13, 0, Math.PI * 2); ctx.arc(x + b.w * 0.68, y + b.h * 0.62, 17, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = b.trim; ctx.fillRect(x - 3, y - 3, b.w + 6, b.h + 6);
      ctx.fillStyle = b.roof; ctx.fillRect(x, y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(x + 10, y + 10, b.w - 20, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let f = 0; f < b.floors; f++) ctx.fillRect(x + 12 + f * 9, y + b.h - 24, 5, 12);
      if (b.landmark) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(b.landmark.toUpperCase(), x + b.w / 2, y + b.h / 2 + 4);
      }
    }
  }
  // Landmark labels for off-block spots (marina / pier)
  ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  for (const lm of city.landmarks) {
    if (lm.block) continue;
    ctx.fillStyle = lm.color;
    ctx.beginPath(); ctx.arc(lm.x - cam.x, lm.y - cam.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#102027'; ctx.fillText(lm.name.toUpperCase(), lm.x - cam.x, lm.y - cam.y - 16);
  }
  // Streetlamps (posts; glow comes in the lighting pass)
  ctx.fillStyle = '#90a4ae';
  for (const l of city.lamps) ctx.fillRect(l.x - cam.x - 1.5, l.y - cam.y - 1.5, 3, 3);
  // Mission marker beacon
  const mk = world.missions && world.missions.marker;
  if (mk && world.screen === 'playing') {
    const bob = Math.sin(world.elapsed * 4) * 5;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(mk.x - cam.x, mk.y - cam.y, 15 + bob * 0.3, 0, Math.PI * 2); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff59d';
    ctx.fillText(mk.label, mk.x - cam.x, mk.y - cam.y - 24 + bob);
  }
  for (const car of world.vehicles.all) if (car !== world.player.car) drawCar(ctx, car, world);
  for (const c of world.police.cars) drawCar(ctx, c, world);
  for (const ped of world.peds) if (!ped.dead) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, world, false);
  if (world.missions) for (const e of world.missions.enemies) if (!e.dead) drawPerson(ctx, e.x, e.y, 0, e.color, world, false);
  const p = world.player;
  if (p) {
    if (p.car) drawCar(ctx, p.car, world);
    else drawPerson(ctx, p.x, p.y, p.angle, '#ff5722', world, true);
  }
  // Tracers
  ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2;
  for (const t of world.tracers) { ctx.beginPath(); ctx.moveTo(t.x1 - cam.x, t.y1 - cam.y); ctx.lineTo(t.x2 - cam.x, t.y2 - cam.y); ctx.stroke(); }
  // Day/night tint
  if (dark > 0.02) {
    const duskWarm = NT.phaseOf(world.timeOfDay) === 'Dusk';
    ctx.fillStyle = duskWarm ? 'rgba(255,110,40,' + (dark * 0.20) + ')' : 'rgba(8,16,64,' + (dark * 0.52) + ')';
    ctx.fillRect(0, 0, cfg.viewW, cfg.viewH);
  }
  if (dark > 0.25) { // light pools + headlights, additive
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(255,214,120,' + a + ')'); g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    for (const l of city.lamps) {
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x > -60 && y > -60 && x < cfg.viewW + 60 && y < cfg.viewH + 60) glow(x, y, 44, 0.30 * dark);
    }
    const cone = (car) => {
      const hx = car.x - cam.x + Math.cos(car.angle) * 20, hy = car.y - cam.y + Math.sin(car.angle) * 20;
      ctx.fillStyle = 'rgba(255,240,180,0.16)';
      ctx.beginPath(); ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(car.angle - 0.24) * 95, hy + Math.sin(car.angle - 0.24) * 95);
      ctx.lineTo(hx + Math.cos(car.angle + 0.24) * 95, hy + Math.sin(car.angle + 0.24) * 95);
      ctx.fill();
    };
    for (const car of world.vehicles.traffic) cone(car);
    for (const c of world.police.cars) cone(c);
    if (p && p.car) cone(p.car);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Floating combat text
  ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  for (const f of world.floaters) { ctx.fillStyle = f.color; ctx.fillText(f.text, f.x - cam.x, f.y - cam.y); }
};
