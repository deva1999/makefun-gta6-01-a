'use strict';
/* Five-job story chain: fixer Lucia Maré vs the Coral Kings gang. */
window.NT = window.NT || {};
NT.createMissions = function (world) {
  const city = world.city;
  const lm = (name) => city.landmarks.find((l) => l.name === name);
  const m = {
    index: 0, done: false, marker: null, objective: '', targetCar: null,
    enemies: [], catchTime: 0, banner: '', bannerLife: 0,
    jobs: [
      { title: 'Wheels for Lucia', reward: 400, text: 'Steal the marked sports car for Lucia Maré.' },
      { title: 'Run to the Marina', reward: 600, text: 'Drive the car to Solmar Marina.' },
      { title: 'Kings on the Run', reward: 800, text: 'Chase down the Coral Kings driver. Stay on his tail!' },
      { title: 'Trouble at Mercado Sol', reward: 1200, text: 'Clear the Coral Kings out of Mercado Sol.' },
      { title: 'The Getaway', reward: 2000, text: 'Lose yourself at Club Neon Tide. Reach the hideout!' },
    ],
    lm: { marina: lm('Solmar Marina'), mercado: lm('Mercado Sol'), club: lm('Club Neon Tide') },
  };
  m.startJob = function (w) {
    const job = m.jobs[m.index];
    if (!job) { m.done = true; m.objective = 'Free roam — Solmar Bay is yours.'; m.marker = null; return; }
    m.objective = job.title + ': ' + job.text;
    m.banner = 'JOB ' + (m.index + 1) + ' — ' + job.title; m.bannerLife = 4;
    NT.toast(w, 'Lucia Maré: ' + job.text);
    if (m.index === 0) {
      let car = w.vehicles.parked.find((c) => c.type.kind === 'sport') || w.vehicles.parked[0];
      car.missionCar = true; car.color = '#d32f2f';
      car.x = w.city.cityW * 0.55; car.y = 3 * NT.config.pitch + NT.config.roadW / 2;
      m.marker = { x: car.x, y: car.y, label: 'STEAL' };
    } else if (m.index === 1) {
      m.marker = { x: m.lm.marina.x, y: m.lm.marina.y, label: 'MARINA' };
    } else if (m.index === 2) {
      const type = NT.CAR_TYPES[4];
      m.targetCar = { x: w.city.cityW * 0.7, y: 2 * NT.config.pitch + 18, angle: 0, speed: 60, type, color: '#7b1fa2', hp: 30, fleeCar: true };
      w.vehicles.all.push(m.targetCar); w.vehicles.traffic.push(m.targetCar);
      m.marker = { x: m.targetCar.x, y: m.targetCar.y, label: 'TARGET' };
    } else if (m.index === 3) {
      m.enemies = [];
      for (let i = 0; i < 5; i++) {
        m.enemies.push({ x: m.lm.mercado.x + (i - 2) * 26, y: m.lm.mercado.y + ((i % 2) ? 30 : -30), hp: 20, dead: false, color: '#8e24aa', shootCd: 1 + i * 0.4 });
      }
      m.marker = { x: m.lm.mercado.x, y: m.lm.mercado.y, label: 'SHOOTOUT' };
    } else if (m.index === 4) {
      NT.addHeat(w, 3.2, 'the getaway');
      m.marker = { x: m.lm.club.x, y: m.lm.club.y, label: 'HIDEOUT' };
    }
  };
  m.completeJob = function (w) {
    const job = m.jobs[m.index];
    w.cash += job.reward;
    if (w.audio) w.audio.pickup();
    NT.floatText(w, w.player.x, w.player.y - 30, '+$' + job.reward, '#a5d6a7');
    NT.toast(w, 'Job done. Lucia wired you $' + job.reward + '.');
    m.index += 1;
    if (m.targetCar) { m.targetCar.dead = true; m.targetCar = null; }
    m.startJob(w);
    NT.saveGame(w);
  };
  m.onEnterCar = function (w, car) {
    if (m.index === 0 && car.missionCar) m.completeJob(w);
  };
  m.onPunch = function () {};
  m.onShoot = function () {};
  m.update = function (w, dt) {
    if (m.bannerLife > 0) m.bannerLife -= dt;
    if (m.done || !w.player) return;
    const p = w.player;
    if (m.index === 1 && p.car && m.marker && Math.hypot(p.x - m.marker.x, p.y - m.marker.y) < 64) m.completeJob(w);
    else if (m.index === 2 && m.targetCar && !m.targetCar.dead) {
      const t = m.targetCar;
      t.angle = Math.atan2(t.y - p.y, t.x - p.x); // flee directly away, roads forgive
      t.speed = Math.min(t.type.top * 0.72, t.speed + 60 * dt);
      m.marker.x = t.x; m.marker.y = t.y;
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < 46) { m.catchTime += dt; NT.floatText(w, t.x, t.y - 22, 'GOT HIM…', '#ffcc80'); if (m.catchTime > 1.2) m.completeJob(w); }
      else m.catchTime = Math.max(0, m.catchTime - dt);
    } else if (m.index === 3) {
      let alive = 0;
      for (const e of m.enemies) {
        if (e.dead) continue; alive++;
        e.shootCd -= dt;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (e.shootCd <= 0 && d < 210) {
          e.shootCd = 1.3;
          if (!p.car) { p.health -= 4; NT.floatText(w, p.x, p.y - 18, 'HIT', '#ef9a9a'); }
          w.tracers.push({ x1: e.x, y1: e.y, x2: p.x, y2: p.y, life: 0.07 });
          if (w.audio) w.audio.gunshot(true);
        }
      }
      m.objective = m.jobs[3].title + ': Coral Kings left standing: ' + alive;
      if (alive === 0) m.completeJob(w);
    } else if (m.index === 4 && m.marker && Math.hypot(p.x - m.marker.x, p.y - m.marker.y) < 64) {
      w.police.heat = 0; w.police.stars = 0; w.police.cars = [];
      m.completeJob(w);
      NT.toast(w, 'Lucia Maré: The bay is ours tonight. Free roam!');
    }
  };
  return m;
};
