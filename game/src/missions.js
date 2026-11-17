// The story of Neon Tide: five jobs for fixer Lucia Maré, told in phone briefs. Kiko,
// a broke boat mechanic, steals, runs and fights his way from the marina to one last
// sunset getaway. Each mission is a chain of stages — go somewhere, drive, pick up,
// fight, escape — and finishing one pays cash, unlocks the next and saves the game.
import { avenueX, avenueY } from './city.js';
import { createPed } from './pedestrians.js';
import { commitCrime } from './police.js';

export const MISSIONS = [
  {
    id: 'first-wheels', title: 'First Wheels', giver: 'Lucia Maré',
    brief: 'Kiko — the marina crew left a coupe by Plaza del Faro. Take it. Bring it to me at Solmar Marina, south-west. Try not to scratch it.',
    reward: 250,
    stages: [
      { type: 'steal', label: 'Steal a car (walk up and press E)', x: avenueX(5) + 40, y: avenueY(5) + 30 },
      { type: 'goto', label: 'Drive to Lucia at Solmar Marina', x: avenueX(1) + 30, y: avenueY(7) + 120, needsCar: true },
    ],
  },
  {
    id: 'beach-run', title: 'Beach Run', giver: 'Lucia Maré',
    brief: 'A cooler was left under the palms at the east boardwalk. Pick it up, drop it at Mercado Sol. The Kings are watching the beach — move.',
    reward: 400,
    stages: [
      { type: 'goto', label: 'Pick up the cooler at the boardwalk', x: avenueX(9) + 60, y: avenueY(8) + 60 },
      { type: 'goto', label: 'Deliver the cooler to Mercado Sol', x: avenueX(3) + 40, y: avenueY(3) + 40 },
    ],
  },
  {
    id: 'heat-check', title: 'Heat Check', giver: 'Lucia Maré',
    brief: 'Bad news: a camera caught your face on that run. The PD is already rolling. Lose them — break sight, stay clean, let the stars fade.',
    reward: 350,
    stages: [
      { type: 'escape', label: 'Lose the police (let the wanted stars fade)' },
    ],
  },
  {
    id: 'warehouse-job', title: 'Warehouse Job', giver: 'Lucia Maré',
    brief: 'The Coral Kings took our Portside Warehouse. Take it back: three of them are inside. Fists or the pistol — your call, mechanic.',
    reward: 650,
    stages: [
      { type: 'goto', label: 'Go to the Portside Warehouse', x: avenueX(9) + 50, y: avenueY(6) + 60 },
      { type: 'fight', label: 'Clear the warehouse: beat the Coral Kings (0/3)', x: avenueX(9) + 50, y: avenueY(6) + 60, count: 3 },
      { type: 'goto', label: 'Meet Lucia outside the warehouse', x: avenueX(9) - 60, y: avenueY(6) + 30 },
    ],
  },
  {
    id: 'sunset-run', title: 'Sunset Run', giver: 'Lucia Maré',
    brief: 'Last job. The marina takings are in a bag at the warehouse. Grab it and reach Aero Solmar Gate before dark — every patrol in the bay will know your car.',
    reward: 1200,
    stages: [
      { type: 'goto', label: 'Collect the bag at the Portside Warehouse', x: avenueX(9) + 50, y: avenueY(6) + 60 },
      { type: 'goto', label: 'Reach Aero Solmar Gate — do not get busted', x: avenueX(0) + 60, y: avenueY(0) + 60, needsCar: true },
    ],
  },
];

export function createMissionState() {
  return { index: 0, stage: 0, active: false, done: false, rivalsSpawned: false, rivalsBeaten: 0, message: '', messageTimer: 0 };
}

/** The current objective for the HUD: {label, x, y} or null in free roam between jobs. */
export function currentObjective(state) {
  if (state.done) return { label: 'Story complete — Solmar Bay is yours. Free roam!', x: null, y: null };
  const mission = MISSIONS[state.index];
  if (!state.active) return { label: `New job: "${mission.title}" — press Enter to take it`, x: null, y: null };
  const stage = mission.stages[state.stage];
  return { label: stage.label, x: stage.x ?? null, y: stage.y ?? null };
}

function announce(state, text, seconds = 5) { state.message = text; state.messageTimer = seconds; }

export function startMission(world) {
  const state = world.missions;
  if (state.done || state.active) return;
  state.active = true;
  state.stage = 0;
  state.rivalsSpawned = false;
  state.rivalsBeaten = 0;
  const mission = MISSIONS[state.index];
  announce(state, `📱 ${mission.giver}: ${mission.brief}`, 9);
  world.audio.missionDone();
  if (mission.id === 'heat-check') commitCrime(world.wanted, 3);
}

/**
 * Advance the active mission against the world. Called every step; uses world.events
 * flags set by the player step (enteredCar) and plain positions for the rest.
 */
export function updateMissions(random, world, dt) {
  const state = world.missions;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (!state.active || state.done) return;
  const mission = MISSIONS[state.index];
  const stage = mission.stages[state.stage];
  const player = world.player;
  const near = stage.x !== undefined && Math.hypot(player.x - stage.x, player.y - stage.y) < 42;

  let stageDone = false;
  if (stage.type === 'steal') {
    if (player.inCar) stageDone = true;
    else if (near) stageDone = false;
  } else if (stage.type === 'goto') {
    if (near && (!stage.needsCar || player.inCar)) stageDone = true;
  } else if (stage.type === 'escape') {
    if (world.wanted.stars === 0) stageDone = true;
  } else if (stage.type === 'fight') {
    if (!state.rivalsSpawned && near) {
      state.rivalsSpawned = true;
      for (let i = 0; i < stage.count; i += 1) {
        const ped = createPed(random, stage.x + random.range(-70, 70), stage.y + random.range(-50, 50), { hostile: true, health: 70, shirt: '#8e44ad', name: 'Coral King' });
        ped.missionRival = true;
        world.peds.push(ped);
      }
      announce(state, 'Coral Kings: "Wrong warehouse, mechanic!"', 4);
      commitCrime(world.wanted, 1);
    }
    if (state.rivalsSpawned) {
      const beaten = world.peds.filter((p) => p.missionRival && p.dead).length;
      state.rivalsBeaten = beaten;
      stage.label = `Clear the warehouse: beat the Coral Kings (${beaten}/${stage.count})`;
      if (beaten >= stage.count) stageDone = true;
    }
  }

  if (!stageDone) return;
  // Sunset Run's pickup lights the city up.
  if (mission.id === 'sunset-run' && state.stage === 0) commitCrime(world.wanted, 4);
  state.stage += 1;
  world.audio.pickup();
  if (state.stage >= mission.stages.length) {
    state.active = false;
    state.stage = 0;
    state.index += 1;
    player.money += mission.reward;
    world.audio.cash();
    if (state.index >= MISSIONS.length) {
      state.done = true;
      announce(state, `🏆 Story complete! Final job paid $${mission.reward}. Solmar Bay is yours, Kiko.`, 10);
    } else {
      announce(state, `✔ Job done: "${mission.title}" — $${mission.reward} paid. Press Enter for the next job.`, 8);
    }
    world.saveGame();
  } else {
    announce(state, `▸ ${mission.stages[state.stage].label}`, 5);
  }
}
