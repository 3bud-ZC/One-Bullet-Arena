# One Bullet Arena

**حلبة الطلقة الواحدة** is an Arabic wave-survival action game built around one rule: the player owns one recoverable ricochet bullet.

## Play

- Production: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Desktop browsers and mobile landscape.
- Installable PWA with a verified offline application shell.

## Single progression path

The active game intentionally has one route only:

1. Start a run.
2. Defeat every enemy in the wave.
3. The single bullet returns automatically after the last kill.
4. Choose exactly one of three in-run upgrades.
5. Enter the next, harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

There are no modes, hubs, puzzle objectives, currencies, regions, equipment screens, story routes, or meta progression in the active runtime.

## Gameplay

- One recoverable bullet with sub-stepped collision simulation.
- Manual recall during combat and automatic recall after wave completion.
- Ricochets from arena walls and cover.
- Dash with invulnerability frames.
- Five gradually introduced enemy archetypes: Scout, Brute, Sniper, Charger, and Splitter.
- Locked attack telegraphs: Snipers and Chargers commit to the direction shown before attacking.
- Deterministic wave composition with per-archetype safety caps.
- Maximum of fourteen active enemies.
- One automatically expanding arena at Waves 3, 6, and 9.
- Twelve meaningful in-run upgrades; all reset at the start of a new run.

## Controls

| Action | Desktop | Mobile landscape |
| --- | --- | --- |
| Move | `WASD` or arrows | Fixed left joystick |
| Aim and fire | Mouse / click | Tap outside the joystick |
| Recall bullet | `Q` | Recall button |
| Dash | `Space` or `Shift` | Dash button |
| Pause | `P` or `Escape` | Pause button |
| Select upgrade | Click or `1`, `2`, `3` | Tap a card |
| Mute | `M` or menu/pause control | Menu/pause control |
| Fullscreen | `F` | Installed-app/browser fullscreen |

## Architecture

The active runtime is split into focused ES modules:

- `src/game.js` — state orchestration and gameplay simulation.
- `src/game-data.js` — enemies, progression, upgrade definitions, and previews.
- `src/arena.js` — arena geometry, collisions, and UI-safe combat zones.
- `src/input.js` — keyboard, mouse, pointer, and fixed-joystick input.
- `src/render.js` — world, combat entities, telegraphs, and effects.
- `src/ui.js` — menu, HUD, upgrade cards, pause, game over, and touch controls.
- `src/audio.js` — generated music and sound effects.
- `src/storage.js` — safe local persistence and legacy-key migration.
- `src/config.js` — release constants and shared visual/physics configuration.

The historical feature-heavy implementation remains preserved under `archive/v1.4.1-full`. It is not imported by the active runtime and is not included in the service-worker shell or the generated production build.

## Local verification

Node.js 20 or newer is required.

```bash
npm install
npm run verify
npx playwright install chromium webkit
npm run test:browser
```

`npm run verify` performs syntax checks, deterministic tests, a production build, and a deployment-shell audit. Browser tests cover Desktop Chromium, Mobile Landscape Chromium, and Desktop WebKit.

## Deployment

GitHub Pages deploys only the generated `dist/` directory. The build script copies an explicit allowlist of active runtime files, and the deploy workflow runs verification before upload.

See [`STATUS.md`](./STATUS.md) for the current release and acceptance state.
