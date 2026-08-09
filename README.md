# One Bullet Arena

**One Bullet Arena / حلبة الطلقة الواحدة** is a tactical arcade survival game built around one rule:

> **ONE BULLET. ONE SHOT. RICOCHET. RECOVER. SURVIVE.**

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Desktop browser, fullscreen, and mobile landscape support.
- Installable PWA with an offline application shell.
- English and Arabic interfaces with persisted language selection.

## Core loop

1. Start or continue a run.
2. Defeat every enemy in the current wave.
3. Fire, ricochet, recall, and recover the single bullet.
4. Choose one of three run upgrades.
5. Enter a harder encounter and, at milestone waves, a larger arena sector.
6. Keep moving through the expanding world until defeat.

There are no currencies, hubs, difficulty presets, or meta-progression trees. Progression happens inside the run through upgrades, encounter pressure, skill execution, and world expansion.

## Expanding world

| Waves | World stage |
| --- | --- |
| 1–2 | Central Room |
| 3–5 | Side Wings |
| 6–8 | Outer Corridors |
| 9–12 | Full Arena |
| 13–17 | Outer Sector |
| 18–24 | Industrial Ring |
| 25–34 | Open Matrix |
| 35+ | Final Belt |

Late stages use a world-space camera, directional look-ahead, progressive zoom, player-relative spawning, exploration tracking, and a compact minimap.

## Late-game encounter director

From Wave 10 onward, encounters rotate through distinct bounded pressure profiles:

- **Rush** — fast Charger pressure.
- **Crossfire** — stronger ranged Sniper pressure.
- **Swarm** — Splitter-heavy crowd pressure.
- **Siege** — Wardens and Brutes create armored fights.
- **Hunters** — mixed elite pressure.

The active enemy population continues scaling into the late game up to a bounded cap of **18**.

## Combat

- One recoverable ricochet bullet.
- Manual bullet recall.
- Dash with invulnerability frames.
- Six enemy archetypes: Scout, Brute, Sniper, Charger, Warden, and Splitter.
- Warden directional guard from Wave 7.
- Readable Charger and Sniper telegraphs.
- Cover blocks hostile projectiles.
- Sub-stepped bullet simulation prevents high-speed tunneling.
- Perfect catches, precision shots, bank-shot chains, momentum, and temporary Overdrive reward skilled execution.

## v3.6 Global UI

`3.6.0-global-ui` replaces the old dashboard-style presentation with one canonical production interface owned by `OneBulletGlobalUiRuntime`.

The final presentation includes:

- an action-game command surface rather than a two-panel admin dashboard;
- a dominant current-run / checkpoint wave anchor;
- a single high-priority Continue / Start action;
- compact unboxed run telemetry;
- an eight-stage world progression timeline;
- a procedural bullet-trajectory / arena-topology background;
- a compact combat HUD focused on bullet state, wave pressure, health, shield, and dash;
- tactical minimap presentation for expanded sectors;
- redesigned Upgrade Selection, Pause, Game Over, wave/sector banners, touch controls, and orientation handling;
- shared visual tokens for near-black/graphite surfaces, controlled cyan, semantic amber, checkpoint green, danger red, and restrained glow;
- reduced-motion support for UI motion.

The deterministic **1280×720 logical gameplay canvas remains unchanged** and scales to the viewport.

## English + Arabic localization

The active UI has centralized translations in `src/i18n.js`.

Supported languages:

- English (`en`, LTR)
- العربية (`ar`, RTL)

Behavior:

- preference persists under `one-bullet-language`;
- saved preference wins on startup;
- otherwise Arabic browser locales start in Arabic;
- all other browser locales start in English;
- switching language updates the active interface immediately without a page reload;
- the document `lang` and `dir` attributes update with the selected language;
- functional UI copy does not intentionally mix both languages at the same time;
- game-control keys and technical identifiers remain readable Latin text where appropriate.

Language can be switched from the Main Menu and Pause quick settings, or with `L` while those surfaces are active.

## Run upgrades

Every cleared wave requires one upgrade selection before the next wave begins. Twelve stackable upgrades cover bullet damage and velocity, ricochet depth, electrical area damage, recall, mobility, health, shields, and a final second chance.

## Controls

| Action | Desktop | Mobile landscape |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Virtual joystick |
| Aim and fire | Mouse + left click | Touch aiming side |
| Dash | `Space` or `Shift` | Dash control |
| Recall bullet | `Q` | Recall control |
| Pause | `P` or `Escape` | Pause control |
| Select upgrade | Click or `1`, `2`, `3` | Tap a choice |
| Language | `L` on Menu/Pause | Language selector |
| Mute | `M` / UI control | UI control |
| Fullscreen | Direct play interaction or `F` | Browser/app fullscreen |

## Active architecture

The project keeps accepted gameplay systems isolated while one final layer owns player-facing presentation:

- `src/main.js` — boots `OneBulletGlobalUiRuntime`, exposes QA hooks, handles fullscreen and service-worker updates.
- `src/i18n.js` — locale selection, persistence, translation, number formatting, and document direction.
- `src/ui-system.js` — reusable colors, typography, surfaces, buttons, gauges, glyphs, wrapping, and procedural UI background.
- `src/core/ui-repair-runtime.js` — **canonical final presentation owner**, rewritten for v3.6 as `OneBulletGlobalUiRuntime`; owns Menu, HUD, minimap, touch UI, Pause, Game Over, Upgrade Selection, and banners.
- `src/core/production-art-runtime.js` — retained lower-level arena presentation foundation.
- `src/core/unified-ui-runtime.js` — retained camera-safe-zone and transition compatibility layer; its old UI is overridden by the canonical v3.6 owner.
- `src/core/world-expansion-runtime.js` — expanding world, camera, exploration, player-relative spawning, and encounter integration.
- `src/core/dashboard-polish-runtime.js` — legacy lower presentation layer retained only for runtime compatibility; it no longer owns the active menu.
- `src/core/visual-overhaul-runtime.js` — environmental/combat rendering foundation.
- `src/core/world-2d-runtime.js` — accepted top-down 2D world rendering.
- `src/core/warden-runtime.js` — Warden guard mechanics.
- `src/core/checkpoint-runtime.js` — backward-compatible local checkpoint progression.
- `src/core/combat-depth-runtime.js` — precision, bank-shot, momentum, and Overdrive systems.
- `src/game.js` — base state machine and combat loop.
- `src/game-data.js` — enemy, encounter, wave-scaling, and upgrade data.
- `src/arena.js` — collision geometry and world expansion milestones.

No new UI patch runtime was stacked on top of the old repair layer: the previous final runtime file was rewritten to become the canonical Global UI owner.

## Local development and verification

```bash
npm install
npm run verify
npx playwright install chromium firefox webkit
npm run test:browser
# complete gate
npm run verify:all
```

The browser suite captures English and Arabic menus/checkpoint states, combat HUD, Pause, Upgrade Selection, Game Over, expanded-world/minimap, and mobile landscape. Responsive QA also covers 1280×720, 1920×1080, and 1366×768 desktop/laptop viewports plus approximately 844×390 mobile landscape.

## Saved progression compatibility

The v3.6 visual/localization release intentionally preserves:

- one-bullet physics and ricochet behavior;
- enemy behavior and encounter balance;
- world expansion and camera behavior;
- scoring;
- upgrades;
- controls;
- Warden mechanics;
- existing checkpoint schema and local checkpoint data.

## Status

[`STATUS.md`](./STATUS.md) is the only project status file and the source of truth for release verification and visual QA acceptance.
