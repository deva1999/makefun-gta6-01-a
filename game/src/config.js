// Neon Tide: Solmar Bay — shared constants: the city grid, the palette of a sun-soaked
// coastal city, tuning for the player, cars and police, and the save slot key.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const STEP = 1 / 60;

export const BLOCK = 230;          // one city block, pavement to pavement
export const ROAD = 64;            // road width between blocks
export const PITCH = BLOCK + ROAD; // distance between road centres
export const COLS = 11;            // blocks across
export const ROWS = 8;             // blocks down
export const WORLD_WIDTH = COLS * PITCH + ROAD;
export const WORLD_HEIGHT = ROWS * PITCH + ROAD + 190; // extra strip: beach and bay

export const SAVE_KEY = 'neon-tide-solmar-bay-save-v1';

export const PALETTE = {
  water: '#1f8a9c', waterDeep: '#14616f', foam: '#bfeef2',
  sand: '#eedaa4', sandDark: '#e0c586',
  pavement: '#cfc4ae', pavementEdge: '#b7ab90',
  road: '#3d4148', roadEdge: '#2e3138', lane: '#e8e3cf',
  grass: '#79b657', grassDark: '#67a047',
  plaza: '#e3d3ac',
};

export const BUILDING_COLORS = [
  '#f2e3c6', '#f6cfa5', '#efa8a0', '#f9e08a', '#bfe3dd', '#a8cdea',
  '#f4b8d0', '#ffffff', '#ffd9b3', '#c9e7b8', '#e6c9f0', '#ffe9ec',
];

export const CAR_COLORS = [
  '#e74c3c', '#f39c2f', '#f7e463', '#39c2d7', '#3f7fbf', '#9b59b6',
  '#ecf0f1', '#2ecc71', '#ff7fab', '#95a5a6', '#fd9644', '#4b7bec',
];

export const PLAYER_TUNE = {
  walkSpeed: 148, sprintSpeed: 232, radius: 11, maxHealth: 100,
  punchRange: 30, punchDamage: 34, gunDamage: 26, gunCooldown: 0.22,
};

export const CAR_TUNE = {
  length: 46, width: 22, maxSpeed: 335, maxReverse: 110,
  accel: 300, brake: 520, drag: 0.9, turnRate: 2.6,
};

export const WANTED_TUNE = {
  decaySeconds: 26,       // seconds of staying clean per star
  bustFillSeconds: 2.4,   // police this close, this long, and you are busted
  bustRange: 64,
};

export const DISTRICTS = [
  'Marina Quarter', 'Old Solmar', 'Palm Heights', 'Coral District',
  'The Boardwalk', 'Sunset Flats', 'Harbour East', 'Vista Verde',
];
