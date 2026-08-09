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

## v3.7.0 High-Resolution Presentation

`3.7.0-hires-ui` separates **simulation resolution**, **Canvas render resolution**, and **application UI rendering**.

### Rendering architecture

- Gameplay simulation remains exactly **1280×720 logical coordinates**.
- The arena, player, enemies, bullets, particles, combat effects, telegraphs, world camera, touch controls, and other world-space graphics remain Canvas2D.
- The gameplay Canvas is rendered through a DPR-aware backing store and a single logical-to-physical transform.
- The Canvas is always presented with a centered **16:9 contain** model; non-16:9 screens letterbox rather than stretch geometry.
- Main Dashboard, desktop HUD, Pause, Upgrade Selection, Game Over, settings, language controls, run statistics, and world progression are semantic **HTML + CSS + SVG**.
- The late-game minimap is a DOM/SVG projection of the real exploration/camera state on desktop.

This removes the previous dependency on a 1280×720 rasterized Canvas for text-heavy player-facing UI while preserving deterministic gameplay coordinates.

### HiDPI Canvas

`src/render/canvas-viewport.js` owns display geometry and backing-store sizing:

- reads `window.devicePixelRatio`;
- clamps effective DPR using a performance ceiling and backing-pixel budget;
- resizes on browser resize, orientation change, fullscreen transitions, visual viewport changes, and DPR changes;
- maps logical 1280×720 drawing commands to the physical backing store with `ctx.setTransform()`;
- keeps image smoothing enabled for the non-pixel-art renderer;
- uses consistent round caps/joins and a bounded miter limit.

Pointer and touch input continues to map from the CSS Canvas rectangle into logical game coordinates before the existing world-camera mapping is applied.

### DOM presentation system

The active presentation owner remains `OneBulletGlobalUiRuntime`; no additional “final UI” runtime was stacked on top.

New presentation modules:

- `src/ui/dom-ui.js` — semantic UI controller driven directly from current game state.
- `src/ui/icons.js` — reusable inline SVG icon library using `currentColor` and consistent vector geometry.
- `styles/tokens.css` — color, surface, radius, spacing, shadow, typography, and motion tokens.
- `styles/ui.css` — premium Dashboard/HUD/overlay/component system.
- `styles/responsive.css` — laptop, low-height, mobile-landscape, and reduced-motion composition.

The DOM layer uses real buttons, focus-visible states, ARIA labels, CSS Grid/Flexbox, logical CSS properties, tabular numeric telemetry, transform-based HUD gauges, restrained blur, and layered surfaces.

### Typography and localization

The UI uses browser text rendering instead of Canvas text for migrated screens. This improves anti-aliasing, Arabic shaping, kerning, baseline handling, wrapping, accessibility, and scaling at 100–200% display scale.

No external runtime font dependency was introduced. The font stack prioritizes modern system UI families and professional Arabic fallbacks so the offline/PWA contract remains intact.

Localization remains centralized in `src/i18n.js`:

- English (`en`, LTR)
- العربية (`ar`, RTL)
- preference stored under `one-bullet-language`
- active UI updates without reload
- document `lang` and `dir` follow the selected language
- layout uses logical properties and progression direction mirrors in RTL

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

Late stages use a world-space camera, directional look-ahead, progressive zoom, player-relative spawning, exploration tracking, and a compact SVG minimap in the desktop HUD.

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
| Fullscreen | `F` / UI control | Browser/app fullscreen |

## Active architecture

- `src/main.js` — boots `OneBulletGlobalUiRuntime`, exposes QA hooks, handles fullscreen and service-worker updates.
- `src/render/canvas-viewport.js` — canonical HiDPI Canvas sizing, contain geometry, backing-store and input-coordinate conversion.
- `src/ui/dom-ui.js` — crisp DOM application UI bound to real game state.
- `src/ui/icons.js` — vector SVG icon system.
- `src/i18n.js` — locale selection, persistence, translation, number formatting, and document direction.
- `src/core/ui-repair-runtime.js` — **canonical final presentation owner**; bridges the Canvas world to the DOM UI and removes obsolete Canvas ownership of migrated surfaces.
- `src/core/production-art-runtime.js` — retained lower-level arena presentation foundation.
- `src/core/unified-ui-runtime.js` — retained camera-safe-zone and transition compatibility layer; its old screen UI is overridden by the canonical Global UI owner.
- `src/core/world-expansion-runtime.js` — expanding world, camera, exploration, player-relative spawning, and encounter integration.
- `src/core/checkpoint-runtime.js` — backward-compatible local checkpoint progression.
- `src/core/combat-depth-runtime.js` — precision, bank-shot, momentum, and Overdrive systems.
- `src/game.js` — base state machine and combat loop.
- `src/game-data.js` — enemy, encounter, wave-scaling, and upgrade data.
- `src/arena.js` — collision geometry and world expansion milestones.

## Local development and verification

```bash
npm install
npm run verify
npx playwright install chromium firefox webkit
npm run test:browser
npm run verify:all
```

Browser verification covers the Dashboard at **1280×720, 1366×768, 1440×900, 1600×900, 1920×1080, and 2560×1440**, non-16:9 desktop sizes including **1792×832 and 1680×1050**, explicit HiDPI device scale, mobile landscape around **844×390**, pointer mapping, localization, Pause, Upgrade Selection, Game Over, and combat HUD states.

## Saved progression compatibility

The v3.7 presentation architecture intentionally preserves:

- checkpoint schema and existing local checkpoint data;
- Continue Run / checkpoint restore behavior;
- scoring, best-wave, and high-score state;
- upgrades and run progression;
- one-bullet physics and ricochet behavior;
- enemy behavior and encounter balance;
- world expansion and camera behavior;
- controls and Warden mechanics.

## Status

[`STATUS.md`](./STATUS.md) is the only project status file and remains the source of truth for release verification and visual QA acceptance.
