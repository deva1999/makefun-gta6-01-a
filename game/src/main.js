'use strict';
/* Boot, game loop, screen states, module wiring. */
window.NT = window.NT || {};
(function () {
  const cfg = NT.config;
  const canvas = document.getElementById('game');
  canvas.width = cfg.viewW; canvas.height = cfg.viewH;
  const ctx = canvas.getContext('2d');
  const seed = NT.seedFromUrl();
  const world = NT.createWorld(seed);
  world.audio = NT.createAudio();
  world.input = NT.createInput(canvas);
  world.input.bindWorld(world);
  world.vehicles = NT.buildVehicles(world);
  world.peds = NT.buildPeds(world);
  world.police = NT.createPolice();
  world.player = NT.createPlayer(world);
  world.missions = NT.createMissions(world);
  world.toastText = ''; world.toastLife = 0;
  NT.applySave(world, NT.loadGame());
  world.missions.startJob(world);
  world.camera.x = world.player.x - cfg.viewW / 2;
  world.camera.y = world.player.y - cfg.viewH / 2;
  window.__NT_WORLD = world; // handle for automated playtest harnesses
  const shot = NT.shotName();
  if (shot) NT.applyShot(world, shot);
  let saveTimer = 0, last = performance.now();

  function resetAfterEnd(kind) {
    const p = world.player;
    p.dead = false; p.health = cfg.playerHealth; p.car = null;
    p.x = world.city.cityW * 0.42; p.y = world.city.cityH * 0.52;
    world.police.stars = 0; world.police.heat = 0; world.police.bust = 0; world.police.cars = [];
    if (kind === 'busted') world.cash = Math.max(0, world.cash - 150);
    world.screen = 'playing';
    NT.toast(world, kind === 'busted' ? 'Released. The fine stung.' : 'Patched up at Solmar Clinic.');
    NT.saveGame(world);
  }
  function handleScreenKeys() {
    const pressed = world.input.pressed;
    if (world.screen === 'title' && pressed.has('Enter')) {
      world.screen = 'playing'; world.audio.start();
      NT.toast(world, 'Lucia Maré has work for you. Follow the yellow marker.');
    } else if ((world.screen === 'busted' || world.screen === 'wasted') && pressed.has('Enter')) {
      resetAfterEnd(world.screen);
    } else if (world.screen === 'playing' && (pressed.has('KeyP') || pressed.has('Escape'))) {
      world.screen = 'paused';
    } else if (world.screen === 'paused' && (pressed.has('KeyP') || pressed.has('Escape') || pressed.has('Enter'))) {
      world.screen = 'playing';
    }
  }
  function update(dt) {
    world.elapsed += dt;
    NT.advanceClock(world, dt);
    NT.updatePlayer(world, dt);
    NT.updateTraffic(world, world.vehicles, dt);
    NT.updatePeds(world, world.peds, dt);
    NT.updatePolice(world, dt);
    world.missions.update(world, dt);
    const p = world.player;
    NT.updateCamera(world, p.x, p.y, dt);
    world.audio.setEngine(p.car ? p.car.speed / p.car.type.top : 0, !!p.car);
    saveTimer += dt;
    if (saveTimer > 6) { saveTimer = 0; NT.saveGame(world); }
  }
  function overlay(title, sub, color) {
    ctx.fillStyle = 'rgba(5,10,18,0.62)'; ctx.fillRect(0, 0, cfg.viewW, cfg.viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.font = 'bold 64px system-ui';
    ctx.fillText(title, cfg.viewW / 2, cfg.viewH / 2 - 30);
    ctx.fillStyle = '#eceff1'; ctx.font = '20px system-ui';
    ctx.fillText(sub, cfg.viewW / 2, cfg.viewH / 2 + 14);
    ctx.textAlign = 'left';
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    handleScreenKeys();
    if (world.screen === 'playing') update(dt);
    // decay transient effects in every state so poses stay clean
    world.tracers = world.tracers.filter((t) => (t.life -= dt) > 0);
    world.floaters = world.floaters.filter((f) => (f.life -= dt) > 0);
    if (world.toastLife > 0) world.toastLife -= dt;
    NT.render(world, ctx);
    if (world.screen === 'playing' || world.screen === 'paused') NT.renderHud(world, ctx);
    if (world.screen === 'title') {
      ctx.fillStyle = 'rgba(10,8,24,0.35)'; ctx.fillRect(0, 0, cfg.viewW, cfg.viewH);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff7043'; ctx.font = 'bold 84px system-ui';
      ctx.fillText('NEON TIDE', cfg.viewW / 2, 250);
      ctx.fillStyle = '#4dd0e1'; ctx.font = 'bold 40px system-ui';
      ctx.fillText('S O L M A R   B A Y', cfg.viewW / 2, 305);
      ctx.fillStyle = '#ffffff'; ctx.font = '20px system-ui';
      ctx.fillText('An open-world bay city of hot cars, hotter nights, and Lucia Maré.', cfg.viewW / 2, 360);
      ctx.font = 'bold 22px system-ui'; ctx.fillStyle = '#ffe082';
      ctx.fillText('Press ENTER to start', cfg.viewW / 2, 430);
      ctx.fillStyle = '#cfd8dc'; ctx.font = '15px system-ui';
      ctx.fillText('WASD drive & walk · E enter/exit car · mouse aim, click shoot · F punch · P pause', cfg.viewW / 2, 466);
      ctx.fillText(NT.phaseIcon(world.timeOfDay) + ' ' + NT.clockText(world.timeOfDay) + ' — the bay never sleeps', cfg.viewW / 2, 494);
      ctx.textAlign = 'left';
    } else if (world.screen === 'paused') overlay('PAUSED', 'P / Esc / Enter to resume', '#ffe082');
    else if (world.screen === 'busted') overlay('BUSTED', 'The Solmar PD boxed you in. Press ENTER — fine: $150', '#ef5350');
    else if (world.screen === 'wasted') overlay('WASTED', 'You wake up at Solmar Clinic. Press ENTER', '#b0bec5');
    world.input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
