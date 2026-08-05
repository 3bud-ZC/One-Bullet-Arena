# One Bullet Arena

**حلبة الطلقة الواحدة** is a focused Arabic wave-survival action game with one rule:

> Defeat every enemy, choose one ability, and enter a harder wave in the same expanding arena.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Desktop browser and mobile landscape support.
- Installable PWA with an offline application shell.

## Core loop

There is one game and no mode-selection screen:

1. Start the run.
2. Defeat every enemy in the current wave.
3. Recover the single bullet.
4. Choose one of three abilities.
5. Enter the next, harder wave.
6. Continue until defeat.

There are no puzzles, ordered targets, objectives, regions, difficulty presets, bosses, currencies, hubs, or meta progression.

## One expanding arena

| Waves | Playable space |
| --- | --- |
| 1–2 | Central combat room |
| 3–5 | Side wings opened |
| 6–8 | Outer corridors opened |
| 9+ | Complete arena opened |

Clearing enemies and choosing an ability are the only requirements for progression. After Wave 9, the full arena remains open while combat pressure continues increasing.

## Combat

- One recoverable ricochet bullet.
- Manual bullet recall.
- Dash with invulnerability frames.
- Five enemy archetypes introduced gradually: Scout, Brute, Sniper, Charger, and Splitter.
- Bounded increases to enemy population, health, movement speed, and projectile speed.
- A maximum of fourteen active enemies.
- Readable Charger and Sniper attack telegraphs.
- Cover blocks enemy projectiles.
- Sub-stepped bullet simulation prevents high-speed tunneling.

## Run abilities

Every cleared wave requires one ability selection before the next wave begins. Twelve stackable abilities cover:

- bullet damage and velocity;
- extra ricochets and ricochet damage;
- electrical area damage;
- recall speed and recall damage;
- movement speed and dash cooldown;
- health, wave shields, and one final second chance.

Abilities reset when a new run starts. Highest score, highest wave, and audio preferences persist locally. Data from v2.1 is migrated automatically.

## Controls

| Action | Desktop | Mobile landscape |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Virtual joystick |
| Aim and fire | Mouse and left click | Touch the aiming side |
| Dash | `Space` or `Shift` | Dash button |
| Recall bullet | `Q` | Recall button |
| Pause | `P` or `Escape` | Pause button |
| Select ability | Click a card or press `1`, `2`, `3` | Tap a card |
| Mute | `M` | — |
| Fullscreen | `F` | Browser or installed-app fullscreen |

## Local development

```bash
python3 -m http.server 4173
npm install
npm run verify
npx playwright install chromium
npm run test:browser
```

## Active architecture

The active release has no runtime installers or monkey-patch layers:

- `src/main.js` — boot, legacy-storage migration, fullscreen, and service-worker registration.
- `src/game.js` — game state, combat, rendering, input, waves, and ability selection.
- `src/game-data.js` — enemies, wave scaling, and ability data.
- `src/arena.js` — pure arena geometry, collisions, expansion stages, and mobile safe zones.
- `src/audio.js` — active generated music and sound effects only.
- `game.css` — responsive browser shell and safe-area handling.

The game uses a fixed `1280×720` Canvas simulation contained inside a responsive `16:9` shell. No external fonts or gameplay assets are required.

## Archived full version

The previous feature-heavy v1.4.1 implementation remains preserved in:

```text
archive/v1.4.1-full
```

Its modes, regions, Objective Rooms, Cores, Relics, Guardians, and supporting systems are not part of the active game.

## Status

[`STATUS.md`](./STATUS.md) is the source of truth for verification, visual review, release state, and remaining live acceptance checks.
