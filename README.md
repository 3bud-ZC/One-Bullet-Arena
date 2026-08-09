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

## v3.6.2 Dashboard Command

`3.6.2-dashboard-command` refines the canonical `OneBulletGlobalUiRuntime` into a premium tactical command surface inspired by the game's one-bullet / ricochet identity.

The dashboard now includes:

- a compact ONE BULLET ARENA identity header with the `PRECISION. DODGE. SURVIVE.` tagline;
- one unified utility family for language, audio, fullscreen, and settings;
- a dominant **Current Run** surface driven by the real checkpoint, wave, score, upgrades, and sector state;
- a lightweight procedural tactical radar that fills the former dead center without adding a fake gameplay mechanic;
- a compact real-data stat strip for Score, Upgrades, and Checkpoint state;
- a controlled gold Continue / Start CTA with smaller New Run and destructive checkpoint actions;
- a structured **Run Snapshot** for Wave, Score, Upgrades, Best Wave, High Score, and Sector;
- a data-driven eight-stage World Progression path sourced from the existing stage thresholds;
- a two-step localized checkpoint-delete confirmation while keeping the existing checkpoint storage semantics;
- a matching Run End / Game Over presentation using the same tactical visual system;
- a dedicated stacked touch/mobile dashboard instead of shrinking the desktop two-column composition;
- no production FPS/debug overlay.

The deterministic **1280×720 logical gameplay canvas remains unchanged** and scales to the browser viewport.

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
- document `lang` and `dir` update with the selected language;
- the AR / EN selector mirrors correctly in RTL and clearly marks the active locale;
- dashboard stat strips, progression, Game Over metrics, icons, and functional metadata mirror in Arabic while numeric game values remain readable;
- functional UI copy does not intentionally mix both languages at the same time;
- game-control keys remain Latin where appropriate.

Language can be switched from the Main Menu and Pause surfaces, or with `L` while those surfaces are active.

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
- `src/ui-system.js` — reusable visual tokens, typography, angular surfaces, button states, gauges, procedural glyphs, wrapping, and tactical background rendering.
- `src/core/ui-repair-runtime.js` — **canonical final presentation owner**; owns Dashboard, HUD, minimap, touch UI, Pause, Game Over, Upgrade Selection, banners, and the responsive mobile dashboard.
- `src/core/production-art-runtime.js` — retained lower-level arena presentation foundation.
- `src/core/unified-ui-runtime.js` — retained camera-safe-zone and transition compatibility layer; its old UI is overridden by the canonical Global UI owner.
- `src/core/world-expansion-runtime.js` — expanding world, camera, exploration, player-relative spawning, and encounter integration.
- `src/core/dashboard-polish-runtime.js` — legacy lower presentation layer retained only for runtime compatibility; it no longer owns the active dashboard.
- `src/core/visual-overhaul-runtime.js` — environmental/combat rendering foundation.
- `src/core/world-2d-runtime.js` — accepted top-down 2D world rendering.
- `src/core/warden-runtime.js` — Warden guard mechanics.
- `src/core/checkpoint-runtime.js` — backward-compatible local checkpoint progression.
- `src/core/combat-depth-runtime.js` — precision, bank-shot, momentum, and Overdrive systems.
- `src/game.js` — base state machine and combat loop.
- `src/game-data.js` — enemy, encounter, wave-scaling, and upgrade data.
- `src/arena.js` — collision geometry and world expansion milestones.

No new presentation runtime was stacked on top of the existing Global UI; the canonical owner itself was refined.

## Local development and verification

```bash
npm install
npm run verify
npx playwright install chromium firefox webkit
npm run test:browser
# complete gate
npm run verify:all
```

The browser suite captures English and Arabic dashboard/checkpoint states, combat HUD, Pause, Upgrade Selection, Game Over, expanded-world/minimap, orientation handling, and mobile landscape. Dashboard visual QA generates coverage for **1366×768, 1440×900, 1600×900, 1920×1080, 2560×1440, 1280×720**, plus approximately **844×390 mobile landscape**.

## Saved progression compatibility

The v3.6.2 dashboard release intentionally preserves:

- existing checkpoint schema and saved local checkpoint data;
- Continue Run / checkpoint restore behavior;
- scoring, best-wave, and high-score state;
- upgrades and run progression;
- one-bullet physics and ricochet behavior;
- enemy behavior and encounter balance;
- world expansion and camera behavior;
- controls and Warden mechanics.

## Status

[`STATUS.md`](./STATUS.md) is the only project status file and the source of truth for release verification and visual QA acceptance.