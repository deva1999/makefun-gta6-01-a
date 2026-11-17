// Keyboard and mouse input: WASD/arrows to move and drive, E to enter or leave a car,
// Enter to take a job, Space to brake, F to punch, mouse aim with click to shoot,
// P or Esc to pause, M to mute, F5 to save. Actions are edge-triggered one-shot flags.
export const ACTION_ENTER_CAR = 1;
export const ACTION_JOB = 2;
export const ACTION_PAUSE = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SAVE = 16;
export const ACTION_MUTE = 32;
export const ACTION_CONFIRM = 64;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0; let mouseY = 0; let mouseDown = false;

  const ACTION_KEYS = {
    KeyE: ACTION_ENTER_CAR, Enter: ACTION_JOB, KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
    KeyF: ACTION_PUNCH, F5: ACTION_SAVE, KeyM: ACTION_MUTE, Space: ACTION_CONFIRM,
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F5' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat && ACTION_KEYS[e.code]) actions |= ACTION_KEYS[e.code];
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
  canvas.addEventListener('click', () => { actions |= ACTION_CONFIRM; });

  return {
    down(code) { return keys.has(code); },
    axis() {
      return {
        x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
        y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0),
      };
    },
    drive() {
      return {
        throttle: (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0),
        steer: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
        brake: keys.has('Space'),
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      };
    },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeActions() { const a = actions; actions = 0; return a; },
    /** Test/autopilot hook used by the screenshot scenes: hold keys without a keyboard. */
    setVirtual(codes) { keys.clear(); for (const c of codes) keys.add(c); },
  };
}
