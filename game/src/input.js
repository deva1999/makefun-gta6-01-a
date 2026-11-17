'use strict';
/* Keyboard + mouse input. WASD/arrows, E, F, mouse aim/shoot, pause. */
window.NT = window.NT || {};
NT.createInput = function (canvas) {
  const input = {
    keys: { up: false, down: false, left: false, right: false, shift: false, punch: false },
    pressed: new Set(),
    mouse: { x: 640, y: 360, down: false },
  };
  const map = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'shift', ShiftRight: 'shift', KeyF: 'punch',
  };
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const k = map[e.code];
    if (k) input.keys[k] = true;
    if (!e.repeat) input.pressed.add(e.code);
    if (world0) world0.audio.start();
  });
  addEventListener('keyup', (e) => { const k = map[e.code]; if (k) input.keys[k] = false; });
  let world0 = null;
  input.bindWorld = (w) => { world0 = w; };
  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (NT.config.viewW / r.width), y: (e.clientY - r.top) * (NT.config.viewH / r.height) };
  };
  canvas.addEventListener('mousemove', (e) => { const p = toGame(e); input.mouse.x = p.x; input.mouse.y = p.y; });
  canvas.addEventListener('mousedown', (e) => { input.mouse.down = true; if (world0) world0.audio.start(); });
  addEventListener('mouseup', () => { input.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  input.endFrame = () => input.pressed.clear();
  return input;
};
