// World state and rules: movement, patrols, vision cones, line of sight,
// alarm, loot, smoke bombs, sneak, win and lose. No rendering here.
import {
  ALARM_CAMERA_RATE, ALARM_DECAY_RATE, ALARM_GUARD_RATE, ALARM_MAX,
  BLOCKERS, CAMERA_CONE_HALF_ANGLE, CAMERA_CONE_RANGE, CAMERA_DEFS,
  EXIT_DOOR, GUARD_CATCH_RADIUS, GUARD_CHASE_SPEED, GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE, GUARD_DEFS, GUARD_PATROL_SPEED, LOOT_DEFS, LOOT_SCORE,
  ROOM, SMOKE_COUNT, SMOKE_SECONDS, THIEF_RADIUS, THIEF_SNEAK_SPEED,
  THIEF_SPEED, THIEF_START, WALL, WIN_BONUS, makeRng,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';
export const STEP = 1 / 60;
export const EVENT_OVER = 1;
export const EVENT_LOOT = 2;
export const EVENT_SPOTTED = 4;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when segment (x1,y1)-(x2,y2) touches rectangle r. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  const dx = x2 - x1, dy = y2 - y1;
  const hits = [];
  if (dx !== 0) {
    let t = (r.x - x1) / dx; let y = y1 + t * dy;
    if (t >= 0 && t <= 1 && y >= r.y && y <= r.y + r.h) hits.push(t);
    t = (r.x + r.w - x1) / dx; y = y1 + t * dy;
    if (t >= 0 && t <= 1 && y >= r.y && y <= r.y + r.h) hits.push(t);
  }
  if (dy !== 0) {
    let t = (r.y - y1) / dy; let x = x1 + t * dx;
    if (t >= 0 && t <= 1 && x >= r.x && x <= r.x + r.w) hits.push(t);
    t = (r.y + r.h - y1) / dy; x = x1 + t * dx;
    if (t >= 0 && t <= 1 && x >= r.x && x <= r.x + r.w) hits.push(t);
  }
  return hits.length > 0;
}

/** Line of sight between two points: blocked by any pillar or vitrine. */
export function hasLineOfSight(ax, ay, bx, by) {
  for (const b of BLOCKERS) {
    if (segmentHitsRect(ax, ay, bx, by, b)) return false;
  }
  return true;
}

/** True when point (px,py) sits inside a vision cone from (ox,oy). */
export function insideCone(ox, oy, facing, range, halfAngle, px, py) {
  const d = dist(ox, oy, px, py);
  if (d > range) return false;
  if (d < 12) return true;
  return Math.abs(angleDiff(Math.atan2(py - oy, px - ox), facing)) <= halfAngle;
}

function circleHitsBlocker(x, y, r) {
  if (x - r < ROOM.x + WALL || x + r > ROOM.x + ROOM.width - WALL) return true;
  if (y - r < ROOM.y + WALL || y + r > ROOM.y + ROOM.height - WALL) return true;
  for (const b of BLOCKERS) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    if (dist(x, y, cx, cy) < r) return true;
  }
  return false;
}

/** Slide a circle along walls/blockers: try x then y separately. */
function moveCircle(state, x, y, dx, dy) {
  let nx = x + dx;
  if (!circleHitsBlocker(nx, y, THIEF_RADIUS)) x = nx;
  let ny = y + dy;
  if (!circleHitsBlocker(x, ny, THIEF_RADIUS)) y = ny;
  return { x, y };
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  return {
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    alarm: 0,
    score: 0,
    lootTaken: 0,
    smokeLeft: SMOKE_COUNT,
    smokeTimer: 0,
    seen: false,
    seenBy: '',
    loseReason: '',
    message: '',
    messageTimer: 0,
    thief: { x: THIEF_START.x, y: THIEF_START.y, targetX: null, targetY: null, sneaking: false },
    guards: GUARD_DEFS.map((g, i) => ({
      ...g, x: g.waypoints[0].x, y: g.waypoints[0].y,
      leg: 0, facing: i === 2 ? Math.PI / 2 : 0, chasing: false, lastSeen: -99,
    })),
    cameras: CAMERA_DEFS.map((c) => ({ ...c, angle: c.baseAngle, phase: rng() * Math.PI * 2 })),
    loot: LOOT_DEFS.map((l) => ({ ...l, taken: false, bob: rng() * Math.PI * 2 })),
  };
}

export function resetWorld(state) {
  const fresh = createWorld(1);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.screen = SCREEN_PLAY;
}

export function lootRemaining(state) {
  return state.loot.filter((l) => !l.taken).length;
}

/** Who can see the thief right now (guards + cameras), honouring smoke. */
export function whoSeesThief(state) {
  if (state.smokeTimer > 0) return [];
  const seen = [];
  const t = state.thief;
  for (const g of state.guards) {
    if (insideCone(g.x, g.y, g.facing, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, t.x, t.y)
      && hasLineOfSight(g.x, g.y, t.x, t.y)) seen.push({ kind: 'guard', name: g.name, ref: g });
  }
  for (const c of state.cameras) {
    if (insideCone(c.x, c.y, c.angle, CAMERA_CONE_RANGE, CAMERA_CONE_HALF_ANGLE, t.x, t.y)
      && hasLineOfSight(c.x, c.y, t.x, t.y)) seen.push({ kind: 'camera', name: 'Camera', ref: c });
  }
  return seen;
}

function stepGuard(state, g, dt) {
  const t = state.thief;
  if (state.time - g.lastSeen < 1.6 && state.screen === SCREEN_PLAY) {
    g.chasing = true;
    const d = dist(g.x, g.y, t.x, t.y);
    if (d > 1) {
      const sp = GUARD_CHASE_SPEED * dt;
      const moved = moveCircle(state, g.x, g.y, ((t.x - g.x) / d) * sp, ((t.y - g.y) / d) * sp);
      g.x = moved.x; g.y = moved.y;
      g.facing = Math.atan2(t.y - g.y, t.x - g.x);
    }
    return;
  }
  g.chasing = false;
  const wp = g.waypoints[g.leg];
  const d = dist(g.x, g.y, wp.x, wp.y);
  if (d < 6) {
    g.leg = (g.leg + 1) % g.waypoints.length;
    return;
  }
  const sp = GUARD_PATROL_SPEED * dt;
  const nx = g.x + ((wp.x - g.x) / d) * sp;
  const ny = g.y + ((wp.y - g.y) / d) * sp;
  g.facing = Math.atan2(ny - g.y, nx - g.x);
  g.x = nx; g.y = ny;
}

/**
 * Advance the world one step. input: {dx, dy, sneak, smoke, clickX, clickY}.
 * Returns a bitmask of EVENT_*.
 */
export function stepWorld(state, dt, input) {
  if (state.screen !== SCREEN_PLAY) return 0;
  let events = 0;
  state.time += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.smokeTimer > 0) state.smokeTimer -= dt;

  const thief = state.thief;
  if (input.smoke && state.smokeLeft > 0 && state.smokeTimer <= 0) {
    state.smokeLeft -= 1;
    state.smokeTimer = SMOKE_SECONDS;
    state.message = '💨 Smoke! Guards lose you for 3s';
    state.messageTimer = 2;
    events |= EVENT_SPOTTED;
  }
  thief.sneaking = !!input.sneak;
  if (input.clickX !== null && input.clickX !== undefined) {
    thief.targetX = clamp(input.clickX, ROOM.x + WALL + THIEF_RADIUS, ROOM.x + ROOM.width - WALL - THIEF_RADIUS);
    thief.targetY = clamp(input.clickY, ROOM.y + WALL + THIEF_RADIUS, ROOM.y + ROOM.height - WALL - THIEF_RADIUS);
  }
  let mx = 0, my = 0;
  if (input.dx || input.dy) {
    const len = Math.hypot(input.dx, input.dy) || 1;
    mx = input.dx / len; my = input.dy / len;
    thief.targetX = null; thief.targetY = null;
  } else if (thief.targetX !== null) {
    const d = dist(thief.x, thief.y, thief.targetX, thief.targetY);
    if (d < 6) { thief.targetX = null; thief.targetY = null; }
    else { mx = (thief.targetX - thief.x) / d; my = (thief.targetY - thief.y) / d; }
  }
  if (mx || my) {
    const sp = (thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_SPEED) * dt;
    const moved = moveCircle(state, thief.x, thief.y, mx * sp, my * sp);
    thief.x = moved.x; thief.y = moved.y;
  }

  for (const c of state.cameras) {
    c.angle = c.baseAngle + Math.sin(state.time * 0.55 + c.phase) * c.sweep;
  }
  for (const g of state.guards) stepGuard(state, g, dt);

  const seenList = whoSeesThief(state);
  const wasSeen = state.seen;
  state.seen = seenList.length > 0;
  if (state.seen) {
    const worst = seenList[0];
    state.seenBy = worst.kind === 'guard' ? worst.name : 'Security camera';
    for (const g of state.guards) {
      if (seenList.some((s) => s.ref === g)) g.lastSeen = state.time;
    }
    const rate = seenList.some((s) => s.kind === 'guard') ? ALARM_GUARD_RATE : ALARM_CAMERA_RATE;
    state.alarm += rate * (thief.sneaking ? 0.5 : 1) * dt;
    if (!wasSeen) {
      state.message = `👁️ SPOTTED by ${state.seenBy}! Break line of sight!`;
      state.messageTimer = 2;
    }
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM_DECAY_RATE * dt);
  }
  state.alarm = Math.min(ALARM_MAX, state.alarm);

  for (const l of state.loot) {
    if (!l.taken && dist(thief.x, thief.y, l.x, l.y) < 34) {
      l.taken = true;
      state.lootTaken += 1;
      state.score += LOOT_SCORE;
      state.message = `💰 Stole ${l.name}! (+${LOOT_SCORE})`;
      state.messageTimer = 2;
      events |= EVENT_LOOT;
    }
  }

  for (const g of state.guards) {
    if (dist(thief.x, thief.y, g.x, g.y) < GUARD_CATCH_RADIUS + THIEF_RADIUS - 6) {
      state.screen = SCREEN_LOSE;
      state.loseReason = `Caught by ${g.name} — a guard grabbed you in the gallery.`;
      return events | EVENT_OVER;
    }
  }
  if (state.alarm >= ALARM_MAX) {
    state.screen = SCREEN_LOSE;
    state.loseReason = 'Alarm hit 100% — the museum locked down and security swarmed in.';
    return events | EVENT_OVER;
  }
  if (lootRemaining(state) === 0
    && thief.x > EXIT_DOOR.x - 10 && thief.x < EXIT_DOOR.x + EXIT_DOOR.w + 10
    && thief.y > EXIT_DOOR.y - 10 && thief.y < EXIT_DOOR.y + EXIT_DOOR.h + 10) {
    state.screen = SCREEN_WIN;
    state.score += WIN_BONUS + Math.max(0, 300 - Math.floor(state.time) * 2);
    return events | EVENT_OVER;
  }
  return events;
}
