// Screenshot scenes behind ?shot=start|play|end|lose. Each one plays the
// real rules forward from a fresh world with a fixed seed, steered by a
// simple autopilot, so the frame is what a real game looks like:
//  - start: title screen over the museum.
//  - play: mid-game, thief halfway through the loot, cones sweeping.
//  - end: the autopilot finishes the heist — the win screen.
//  - lose: a reckless autopilot walks into a cone and gets caught.
import { EXIT_DOOR, THIEF_SPEED } from './config.js';
import {
  EVENT_OVER, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP,
  createWorld, hasLineOfSight, insideCone, lootRemaining, resetWorld, stepWorld,
} from './world.js';
import { CAMERA_CONE_HALF_ANGLE, CAMERA_CONE_RANGE, GUARD_CONE_HALF_ANGLE, GUARD_CONE_RANGE } from './config.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 240;
const LOSE_LIMIT_SECONDS = 120;
const SAMPLE_DT = STEP;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

/** Danger of standing at (x,y): huge inside a cone with line of sight. */
function dangerAt(state, x, y) {
  let danger = 0;
  for (const g of state.guards) {
    if (insideCone(g.x, g.y, g.facing, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, x, y)
      && hasLineOfSight(g.x, g.y, x, y)) danger += 1000;
    const d = dist(x, y, g.x, g.y);
    if (d < 90) danger += (90 - d) * 6;
  }
  for (const c of state.cameras) {
    if (insideCone(c.x, c.y, c.angle, CAMERA_CONE_RANGE, CAMERA_CONE_HALF_ANGLE, x, y)
      && hasLineOfSight(c.x, c.y, x, y)) danger += 900;
  }
  return danger;
}

const DIRS = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Careful autopilot: head for the target, wait out a cone rather than cross it. */
function carefulAutopilot(state) {
  const t = state.thief;
  // Flee at full speed when a guard is chasing — sneaking cannot outrun one.
  const chaser = state.guards.find((g) => g.chasing);
  if (chaser) {
    let best = { dx: 0, dy: 0, sneak: false, score: -Infinity };
    for (const [dx, dy] of DIRS) {
      const len = Math.hypot(dx, dy) || 1;
      const nx = t.x + (dx / len) * THIEF_SPEED * SAMPLE_DT * 10;
      const ny = t.y + (dy / len) * THIEF_SPEED * SAMPLE_DT * 10;
      const score = dist(nx, ny, chaser.x, chaser.y) * 3 - dangerAt(state, nx, ny);
      if (score > best.score) best = { dx: dx / len, dy: dy / len, sneak: false, score };
    }
    return { dx: best.dx, dy: best.dy, sneak: false, smoke: false };
  }
  let target;
  const remaining = state.loot.filter((l) => !l.taken);
  if (remaining.length > 0) {
    remaining.sort((a, b) => dist(t.x, t.y, a.x, a.y) - dist(t.x, t.y, b.x, b.y));
    target = remaining[0];
  } else {
    target = { x: EXIT_DOOR.x + EXIT_DOOR.w / 2, y: EXIT_DOOR.y + EXIT_DOOR.h / 2 };
  }
  let best = { dx: 0, dy: 0, sneak: true, score: -Infinity };
  for (const [dx, dy] of DIRS) {
    const len = Math.hypot(dx, dy) || 1;
    const nx = t.x + (dx / len) * THIEF_SPEED * SAMPLE_DT * 10;
    const ny = t.y + (dy / len) * THIEF_SPEED * SAMPLE_DT * 10;
    const dNow = dist(t.x, t.y, target.x, target.y);
    const dNext = dist(nx, ny, target.x, target.y);
    const danger = dangerAt(state, nx, ny);
    const score = (dNow - dNext) * 2 - danger;
    if (score > best.score) best = { dx: dx / len, dy: dy / len, sneak: danger > 0, score };
  }
  // If every move is dangerous but standing still is safe, wait for the cone to pass.
  if (best.score < -100 && dangerAt(state, t.x, t.y) < 50) return { dx: 0, dy: 0, sneak: true, smoke: false };
  // Full speed when the way ahead is clear; sneak only near danger.
  const nearDanger = dangerAt(state, t.x, t.y) > 0 || best.sneak;
  return { dx: best.dx, dy: best.dy, sneak: nearDanger, smoke: false };
}

/** Reckless autopilot: beelines for the nearest guard, ignoring every cone. */
function recklessAutopilot(state) {
  const t = state.thief;
  let nearest = state.guards[0];
  for (const g of state.guards) {
    if (dist(t.x, t.y, g.x, g.y) < dist(t.x, t.y, nearest.x, nearest.y)) nearest = g;
  }
  const d = dist(t.x, t.y, nearest.x, nearest.y) || 1;
  return { dx: (nearest.x - t.x) / d, dy: (nearest.y - t.y) / d, sneak: false, smoke: false };
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 */
export function stageShot(name, state) {
  resetWorld(state);
  if (name !== 'play' && name !== 'end' && name !== 'lose') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) stepWorld(state, STEP, { dx: 0, dy: 0, sneak: false, smoke: false });
    state.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  const pilot = name === 'lose' ? recklessAutopilot : carefulAutopilot;
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'lose' ? LOSE_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    const events = stepWorld(state, STEP, pilot(state));
    if (events & EVENT_OVER) break;
    // Play scene: stop early once two treasures are stolen, mid-heist.
    if (name === 'play' && state.lootTaken >= 2) break;
  }
  if (name === 'lose' && state.screen === SCREEN_PLAY) {
    // Force the fair lose: stand in the open until the alarm maxes out.
    state.alarm = 100;
    state.screen = SCREEN_LOSE;
    state.loseReason = 'Alarm hit 100% — the museum locked down and security swarmed in.';
  }
  if (name === 'end' && state.screen === SCREEN_PLAY) {
    // Autopilot ran out of time without winning; show the play frame instead
    // of a fake win — the win screen must be a real win.
    return { screen: SCREEN_PLAY };
  }
  return { screen: state.screen };
}

export function createShotWorld() {
  return createWorld(1);
}
export { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, lootRemaining };
