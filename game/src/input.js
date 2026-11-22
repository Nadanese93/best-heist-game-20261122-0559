// Keyboard + mouse input: WASD/arrows move, click walks to a point,
// Shift sneaks, E throws a smoke bomb, M mutes, Enter/Space starts or restarts.
import { toggleMute } from './audio.js';

export function createInput(canvas) {
  const keys = new Set();
  let click = null;
  let smokeQueued = false;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === 'e') smokeQueued = true;
    if (event.key.toLowerCase() === 'm') toggleMute();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  canvas.addEventListener('pointerdown', (event) => { click = canvasPoint(event); });
  window.addEventListener('blur', () => keys.clear());

  return {
    /** Movement vector + sneak + smoke for this frame; consumes queued clicks. */
    readFrame() {
      let dx = 0, dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      const frame = {
        dx, dy,
        sneak: keys.has('shift'),
        smoke: smokeQueued,
        clickX: click ? click.x : null,
        clickY: click ? click.y : null,
      };
      smokeQueued = false;
      click = null;
      return frame;
    },
    confirmPressed() {
      return keys.has('enter') || keys.has(' ');
    },
    consumeConfirm() {
      keys.delete('enter');
      keys.delete(' ');
    },
  };
}
