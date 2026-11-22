# Midnight at the Meridian Museum — a heist game

A stealth heist game for make.fun's `best-heist-game-20261122-0559` bounty: slip through the Meridian Museum at 2 a.m., stay out of the guards' vision cones and the sweeping security cameras, steal all four treasures, and escape through the green EXIT door before the alarm hits 100%.

![bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![rank](https://make.fun/badge/best-heist-game-20261122-0559/Nadanese93/best-heist-game-20261122-0559/rank.svg)
![reward](https://make.fun/badge/best-heist-game-20261122-0559/Nadanese93/best-heist-game-20261122-0559/reward.svg)

## How to play

Serve `game/` with any static server (`node serve.ts`, then open http://localhost:8080) and play in a desktop browser. No network requests, no files besides the ones in `game/`.

- **Move:** WASD / arrow keys, or click anywhere to walk there
- **Sneak:** hold Shift — slower, and the alarm rises half as fast while you are seen
- **Smoke bomb:** press E (2 per heist) — guards and cameras lose you for 3 seconds
- **Mute:** M

Steal all 4 treasures (💎 Ruby of Rajah, 🖼️ Moonlit Portrait, 👑 Meridian Crown, 🏺 Celadon Vase) then reach the EXIT door. Pillars and glass vitrines block both movement and sight — use them as cover. If a guard touches you, or the alarm reaches 100%, the heist is over.

## Files

- `game/index.html` — the page; `game/src/main.js` — game loop and screens
- `game/src/world.js` — rules: patrols, vision cones, line of sight, alarm, win/lose
- `game/src/render.js` — all drawing: museum, cones, HUD, title/win/lose screens
- `game/src/config.js` — museum layout and tuning
- `game/src/input.js` — keyboard + mouse; `game/src/audio.js` — synthesized WebAudio SFX
- `game/src/shots.js` — deterministic autopilot scenes behind `?shot=start|play|end|lose`
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
