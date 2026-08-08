# One Bullet Arena

**حلبة الطلقة الواحدة** is an Arabic wave-survival action game built around one rule:

> You only own one bullet. Fire it, use the arena, recover it, and survive the next wave.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Desktop browser and mobile landscape support.
- Full-viewport browser presentation with Fullscreen API entry on direct play interaction and `F` as a manual toggle.
- Installable PWA with an offline application shell.

## Core loop

There is one focused game loop and no mode-selection screen:

1. Start or continue the run.
2. Defeat every enemy in the current wave.
3. Recover and reuse the single ricochet bullet.
4. Choose one of three run upgrades.
5. Enter a harder encounter and, at milestone waves, a larger arena sector.
6. Continue exploring and fighting until defeat.

There are no currencies, hubs, difficulty presets, or meta-progression trees. Progression happens inside the run through upgrades, enemy pressure, encounter patterns, and world expansion.

## Expanding world

The arena is no longer finished at Wave 9. The world keeps opening as the run develops, and the late-game sectors are larger than the screen so the camera follows the player and reveals new space through movement.

| Waves | World stage |
| --- | --- |
| 1–2 | Central combat room |
| 3–5 | Side wings |
| 6–8 | Outer corridors |
| 9–12 | Original full arena |
| 13–17 | Outer sector |
| 18–24 | Industrial ring |
| 25–34 | Open matrix |
| 35+ | Final belt |

Late stages use a world-space camera, directional look-ahead, progressive zoom, player-relative spawning, and a minimap showing the current viewport and explored route.

## Late-game encounter director

From Wave 10 onward, encounters rotate through distinct pressure profiles instead of repeating one composition with slightly larger numbers:

- **Rush** — more Chargers and fast pressure.
- **Crossfire** — stronger ranged pressure from Snipers.
- **Swarm** — Splitter-heavy crowd control pressure.
- **Siege** — Wardens and Brutes create slower armored fights.
- **Hunters** — mixed elite pressure from several dangerous archetypes.

Enemy population now continues increasing into the late game up to a bounded maximum of **18 active enemies**, with stronger but capped health, movement-speed, and projectile-speed scaling.

## Combat

- One recoverable ricochet bullet.
- Manual bullet recall.
- Dash with invulnerability frames.
- Six enemy archetypes: Scout, Brute, Sniper, Charger, Warden, and Splitter.
- The Warden enters from Wave 7 with a directional guard that rewards flanking or guard-breaking shots.
- Readable Charger and Sniper attack telegraphs.
- Cover blocks hostile projectiles.
- Sub-stepped bullet simulation prevents high-speed tunneling.
- Perfect catches, precision shots, bank-shot chains, momentum, and temporary Overdrive reward skilled execution.

## Run upgrades

Every cleared wave requires one upgrade selection before the next wave begins. Twelve stackable upgrades cover:

- bullet damage and velocity;
- extra ricochets and ricochet damage;
- electrical area damage;
- recall speed and recall damage;
- movement speed and dash cooldown;
- health, wave shields, and one final second chance.

Run upgrades reset when a new run starts. Checkpoint progression, highest score, highest wave, and audio preferences persist locally.

## Unified interface

The current runtime uses one visual language across:

- main/checkpoint menu;
- combat HUD;
- wave/sector banners;
- upgrade selection;
- pause;
- Game Over and checkpoint continuation;
- desktop and touch controls.

Arabic copy uses RTL rendering while English labels and numeric telemetry use LTR rendering.

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
| Fullscreen | First direct play interaction or `F` | Supported browser/app fullscreen |

## Local development

```bash
python3 -m http.server 4173
npm install
npm run verify
npx playwright install chromium firefox webkit
npm run test:browser
```

## Active architecture

The current release uses a layered runtime so gameplay systems can evolve without rewriting accepted lower-level mechanics:

- `src/main.js` — final runtime boot, legacy-storage migration, fullscreen, and service-worker registration.
- `src/core/unified-ui-runtime.js` — unified upgrade, pause, Game Over, banner, and touch UI.
- `src/core/world-expansion-runtime.js` — camera, expanded world, player-relative spawning, minimap, exploration state, and combat HUD.
- `src/core/dashboard-polish-runtime.js` — cinematic command/checkpoint menu.
- `src/core/visual-overhaul-runtime.js` — environmental and combat rendering layer.
- `src/core/world-2d-runtime.js` — accepted top-down 2D world rendering.
- `src/core/warden-runtime.js` — Warden guard mechanics.
- `src/core/checkpoint-runtime.js` — local checkpoint progression.
- `src/core/combat-depth-runtime.js` — precision, bank-shot, momentum, and Overdrive systems.
- `src/game.js` — base state machine and combat loop.
- `src/game-data.js` — enemy definitions, encounter director, wave scaling, and upgrades.
- `src/arena.js` — arena sectors, collision geometry, and expansion milestones.
- `game.css` — full-viewport shell and mobile orientation handling.

The simulation keeps its deterministic `1280×720` logical coordinate system while the browser shell fills the available viewport. No external fonts or required gameplay image assets are needed.

## Archived full version

The previous feature-heavy v1.4.1 implementation remains preserved in:

```text
archive/v1.4.1-full
```

Its mode system and meta-progression are not part of the active game.

## Status

[`STATUS.md`](./STATUS.md) is the source of truth for verification, release state, and live acceptance checks.
