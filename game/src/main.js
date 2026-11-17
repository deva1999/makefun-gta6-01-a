// Neon Tide: Solmar Bay — boot and the main loop. The world advances in fixed 1/60 s
// steps; screens (title, play, paused, busted, wasted) gate what steps and what draws.
// ?seed=N fixes the city. ?shot=start|foot|drive|chase&seed=N stages a deterministic
// scene for screenshots, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { createInput, ACTION_ENTER_CAR, ACTION_JOB, ACTION_PAUSE, ACTION_PUNCH, ACTION_SAVE, ACTION_MUTE, ACTION_CONFIRM } from './input.js';
import { createRenderer } from './render.js';
import { drawHUD, drawScreen, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './hud.js';
import { createAudio } from './audio.js';
import { enterCar, exitCar, tryPunch, respawnPlayer } from './player.js';
import { startMission } from './missions.js';
import { applyBust } from './police.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(seed, audio);
const renderer = createRenderer(canvas);
const ctx = renderer.ctx;

function announce(message) { status.textContent = message; }

function draw(screen) {
  renderer.drawWorld(world);
  drawHUD(ctx, world, screen);
  drawScreen(ctx, world, screen, world.hasSave());
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    draw(scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let bustedTimer = 0;

  function beginPlay(continued) {
    if (continued) world.loadSave();
    screen = SCREEN_PLAY;
    announce(continued ? 'Welcome back to Solmar Bay.' : 'Neon Tide. Press Enter to take your first job.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { audio.unlock(); announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.'); }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_JOB)) { audio.unlock(); audio.click(); beginPlay(world.hasSave()); }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (actions & (ACTION_CONFIRM | ACTION_JOB)) { respawnPlayer(world); screen = SCREEN_PLAY; }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER_CAR) {
      if (world.player.inCar) exitCar(world);
      else enterCar(world);
    }
    if (actions & ACTION_JOB) startMission(world);
    if (actions & ACTION_PUNCH) tryPunch(world);
    if (actions & ACTION_SAVE) {
      if (world.saveGame()) { world.missions.message = '💾 Saved — cash, story and position kept in this browser.'; world.missions.messageTimer = 3; }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        stepWorld(world, input, STEP);
        accumulator -= STEP;
        if (world.wanted.busted && screen === SCREEN_PLAY) {
          const fine = applyBust(world);
          world.missions.message = `🚔 Busted! Fine $${fine}.`;
          world.missions.messageTimer = 4;
          screen = SCREEN_BUSTED;
          bustedTimer = 0;
          audio.busted();
          break;
        }
        if (world.player.dead && screen === SCREEN_PLAY) { screen = SCREEN_WASTED; audio.busted(); break; }
      }
    } else {
      accumulator = 0;
    }
    const driving = world.player.inCar ? world.player.inCar.speed : null;
    audio.update(1 / 60, driving, screen === SCREEN_PLAY ? world.wanted.stars : 0, screen === SCREEN_TITLE);
    draw(screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });
  announce('Neon Tide: Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
