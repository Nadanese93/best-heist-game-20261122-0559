// Game entry: animation loop, screen flow, click-to-start/restart,
// and the ?shot= scenes used for screenshots (a real staged game).
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';
import { createInput } from './input.js';
import { overlayButtonRect, renderGame } from './render.js';
import {
  EVENT_LOOT, EVENT_OVER, EVENT_SPOTTED, SCREEN_LOSE, SCREEN_PLAY,
  SCREEN_TITLE, SCREEN_WIN, STEP, createWorld, resetWorld, stepWorld,
} from './world.js';
import {
  playClickSound, playLoseSound, playLootSound, playSmokeSound,
  playSpottedSound, playWinSound,
} from './audio.js';
import { createShotWorld, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

let state = createWorld(Date.now() % 2147483647);
let last = performance.now();
let accumulator = 0;

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  if (state.screen !== SCREEN_PLAY && pointInRect(x, y, overlayButtonRect())) {
    playClickSound();
    resetWorld(state);
    input.consumeConfirm();
  }
});

function handleEvents(events) {
  if (events & EVENT_LOOT) playLootSound();
  if (events & EVENT_SPOTTED) {
    if (state.smokeTimer > 0) playSmokeSound();
    else if (state.seen) playSpottedSound();
  }
  if (events & EVENT_OVER) {
    if (state.screen === SCREEN_WIN) playWinSound();
    if (state.screen === SCREEN_LOSE) playLoseSound();
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.screen !== SCREEN_PLAY && input.confirmPressed()) {
    playClickSound();
    resetWorld(state);
    input.consumeConfirm();
  }
  if (state.screen === SCREEN_PLAY) {
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      handleEvents(stepWorld(state, STEP, input.readFrame()));
    }
  } else {
    input.readFrame();
  }
  renderGame(ctx, state);
  requestAnimationFrame(frame);
}

if (shotName) {
  // Screenshot mode: stage the named scene deterministically, draw once.
  state = createShotWorld();
  stageShot(shotName, state);
  renderGame(ctx, state);
  document.title = `shot:${shotName}`;
} else {
  requestAnimationFrame(frame);
}
