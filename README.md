# One Bullet Arena

**حلبة الطلقة الواحدة** is a focused Arabic wave-survival action game built around one rule:

> Fight every enemy, clear the wave, choose one upgrade, and enter a harder wave in the same expanding arena.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Desktop browser and mobile landscape support.
- Installable PWA with an offline application shell.

## Core loop

There is one game only and no mode-selection screen:

1. Start the run.
2. Defeat every enemy in the current wave.
3. Recover the single bullet.
4. Choose one of three abilities.
5. Enter the next, harder wave.
6. Continue until defeat.

There are no puzzles, ordered targets, hit-count objectives, relay sequences, alternate win conditions, regions, difficulty presets, bosses, contracts, currencies, hubs, or meta progression.

## One expanding arena

The entire run takes place in one map. New space opens automatically through normal wave progression:

| Wave | Playable space |
| --- | --- |
| 1–2 | Central combat room |
| 3–5 | Side wings opened |
| 6–8 | Outer corridors opened |
| 9+ | Complete arena opened |

No action is required to unlock an area other than clearing the previous wave and choosing an ability.

After Wave 9 the full map remains open. Difficulty continues increasing through enemy population, enemy variety, health, movement speed, and projectile speed.

On mobile, invisible combat-safe zones keep the player and enemies from being hidden under the movement stick, Recall, Dash, or Pause controls.

## Combat

- One recoverable bullet.
- Wall and obstacle ricochets.
- Manual bullet recall.
- Player dash with invulnerability frames.
- Five enemy archetypes introduced gradually:
  - Scout
  - Brute
  - Sniper
  - Charger
  - Splitter
- Gradually increasing wave population, enemy health, movement speed, and projectile speed.
- Enemy population capped at fourteen active enemies.
- Endless wave progression until defeat.

## Run upgrades

Every cleared wave requires one upgrade choice before the next wave begins. The current catalog contains thirteen stackable run abilities covering:

- bullet damage and speed;
- extra ricochets and ricochet damage;
- electrical area damage;
- recall speed and recall damage;
- movement and dash cooldown;
- perfect catches and shields;
- maximum health;
- one final second chance.

Upgrades reset when a new run starts. Only the highest score, highest wave, and audio preferences persist locally.

## Controls

| Action | Desktop | Mobile landscape |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Virtual joystick |
| Aim and fire | Mouse and left click | Touch the aiming side |
| Dash | `Space` or `Shift` | Dash button |
| Recall bullet | `Q` | Recall button |
| Pause | `P` or `Escape` | Pause button |
| Select upgrade | Click a card or press `1`, `2`, `3` | Tap a card |
| Mute | `M` | — |
| Fullscreen | `F` | Browser or installed-app fullscreen |

## Local development

Serve the dependency-free runtime over HTTP:

```bash
python3 -m http.server 4173
```

Run syntax and deterministic tests:

```bash
npm install
npm run verify
```

Run Chromium browser gates and capture desktop/mobile screenshots:

```bash
npx playwright install chromium
npm run test:browser
```

## Active architecture

The production runtime remains intentionally small:

- `src/main.js` — boot, fullscreen, and service-worker registration.
- `src/simple-game.js` — gameplay, rendering, input, waves, and upgrade flow.
- `src/simple-data.js` — enemy, wave, scaling, and upgrade data.
- `src/expanding-arena.js` — automatic arena unlocks, active boundaries, and mobile control-safe zones.
- `src/simple-ui-cleanup.js` — final menu and upgrade-card presentation fixes.
- `src/audio.js` — generated music and sound effects.

The game uses a fixed `1280×720` Canvas simulation contained inside a responsive `16:9` browser shell.

## Archived full version

The previous feature-heavy **v1.4.1 Corebreak Protocol** implementation remains preserved in the Git branch:

```text
archive/v1.4.1-full
```

Its regions, modes, Objective Rooms, Cores, Relics, Guardians, Codices, and supporting tests are not part of the active simple release.

## Status

[`STATUS.md`](./STATUS.md) is the source of truth for verification, visual review, release state, and remaining live acceptance checks.
