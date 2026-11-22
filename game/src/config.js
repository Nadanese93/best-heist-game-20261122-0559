// Museum layout and tuning for Midnight at the Meridian Museum.
// One big room: walls, pillars and glass vitrines block both movement and
// sight, so every loot has at least one safe approach behind cover.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const HUD_HEIGHT = 84;
export const ROOM = { x: 0, y: HUD_HEIGHT, width: 1280, height: 720 - HUD_HEIGHT };
export const WALL = 16;

export const THIEF_SPEED = 175;
export const THIEF_SNEAK_SPEED = 95;
export const THIEF_RADIUS = 15;
export const GUARD_PATROL_SPEED = 58;
export const GUARD_CHASE_SPEED = 98;
export const GUARD_CATCH_RADIUS = 24;
export const GUARD_CONE_RANGE = 235;
export const GUARD_CONE_HALF_ANGLE = 0.56;
export const CAMERA_CONE_RANGE = 285;
export const CAMERA_CONE_HALF_ANGLE = 0.48;
export const ALARM_GUARD_RATE = 30;
export const ALARM_CAMERA_RATE = 24;
export const ALARM_DECAY_RATE = 11;
export const ALARM_MAX = 100;
export const SMOKE_SECONDS = 3;
export const SMOKE_COUNT = 2;
export const LOOT_SCORE = 250;
export const WIN_BONUS = 500;

// Solid cover: blocks movement and line of sight.
export const BLOCKERS = [
  { x: 296, y: 236, w: 44, h: 44, label: 'pillar' },
  { x: 940, y: 236, w: 44, h: 44, label: 'pillar' },
  { x: 296, y: 540, w: 44, h: 44, label: 'pillar' },
  { x: 940, y: 540, w: 44, h: 44, label: 'pillar' },
  { x: 560, y: 168, w: 160, h: 56, label: 'vitrine' },
  { x: 560, y: 580, w: 160, h: 56, label: 'vitrine' },
  { x: 140, y: 330, w: 64, h: 120, label: 'vitrine' },
  { x: 1076, y: 330, w: 64, h: 120, label: 'vitrine' },
];

export const LOOT_DEFS = [
  { id: 'ruby', name: 'Ruby of Rajah', emoji: '💎', x: 205, y: 175 },
  { id: 'painting', name: 'Moonlit Portrait', emoji: '🖼️', x: 1075, y: 175 },
  { id: 'crown', name: 'Meridian Crown', emoji: '👑', x: 770, y: 408 },
  { id: 'vase', name: 'Celadon Vase', emoji: '🏺', x: 1075, y: 625 },
];

export const EXIT_DOOR = { x: 1176, y: 636, w: 88, h: 68 };
export const THIEF_START = { x: 84, y: 648 };

export const GUARD_DEFS = [
  { id: 'g1', name: 'Guard Mara', emoji: '💂', waypoints: [{ x: 250, y: 310 }, { x: 1030, y: 310 }] },
  { id: 'g2', name: 'Guard Bram', emoji: '💂', waypoints: [{ x: 1000, y: 520 }, { x: 300, y: 520 }] },
  { id: 'g3', name: 'Guard Sela', emoji: '💂', waypoints: [{ x: 640, y: 180 }, { x: 640, y: 540 }] },
];

export const CAMERA_DEFS = [
  { id: 'c1', x: 58, y: 122, baseAngle: Math.PI / 2, sweep: 0.85 },
  { id: 'c2', x: 1222, y: 122, baseAngle: Math.PI / 2, sweep: 0.85 },
];

/** Deterministic RNG (mulberry32) so ?shot= frames are reproducible. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
