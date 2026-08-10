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

## v3.8.0 Smooth Runtime

`3.8.0-smooth-runtime` preserves the accepted v3.7 High-Resolution Presentation and upgrades motion, frame pacing, game feel, adaptive rendering, and high-wave runtime efficiency.

### Game-loop architecture

- Rendering remains driven directly by the browser's native `requestAnimationFrame()` cadence. There is no artificial 60 FPS render cap.
- Gameplay simulation now advances through a bounded **120 Hz fixed timestep**.
- Render cadence and simulation cadence are independent, so 60, 120, 144, 165, and 240 Hz displays do not change gameplay speed.
- A fixed-step accumulator limits catch-up work to eight simulation steps after a stall and discards excessive backlog instead of entering a spiral of death.
- Player, bullet, enemies, hostile projectiles, and world camera render from visual interpolation between the previous and current simulation transforms; collision continues to use simulation state only.
- Visibility/state transitions reset frame timing so returning from a background tab cannot inject a giant delta.

### Adaptive rendering quality

Rendering quality is a visual-only system with `AUTO`, `ULTRA`, `HIGH`, `BALANCED`, and `PERFORMANCE` modes.

- `AUTO` is the default and adapts from measured frame pacing rather than relying only on device labels.
- Quality changes use sustained pressure/headroom windows plus cooldown hysteresis, preventing rapid tier oscillation.
- Tiers may adjust DPR ceiling, backing-pixel budget, particle density/cap, trail history, ambient detail, shadows, and DOM/HUD update cadence.
- Tiers never modify enemy count, AI, damage, collision, bullet speed, movement speed, encounter rules, or wave progression.
- Expensive backing-store changes are deferred until a safe state such as menu/pause/wave transition rather than repeatedly resizing during combat.
- The manual preference is persisted under `one-bullet-render-quality`.

### High-resolution rendering architecture

Gameplay simulation remains exactly **1280×720 logical coordinates** while the display backing store scales independently through the accepted HiDPI architecture.

- Arena, player, enemies, bullets, particles, combat effects, telegraphs, world camera, touch controls, and world-space graphics remain Canvas2D.
- The Canvas uses a DPR-aware backing store and a single logical-to-physical transform.
- Presentation remains a centered **16:9 contain** model; non-16:9 screens letterbox instead of distorting geometry.
- Dashboard, desktop HUD, Pause, Upgrade Selection, Game Over, settings, language controls, run statistics, progression, and minimap remain semantic **HTML + CSS + SVG**.
- The existing PWA/offline and checkpoint contracts remain intact.

`src/render/canvas-viewport.js` owns display geometry, input mapping, HiDPI backing size, and the safe quality-aware DPR/pixel budget.

### DOM and minimap performance

The active presentation owner remains `OneBulletGlobalUiRuntime`; no additional cosmetic UI runtime is stacked on top.

High-refresh rendering no longer implies equally expensive DOM work:

- HUD synchronization is dirty-state and cadence limited instead of rebuilding at every 120–240 Hz render opportunity.
- Frequently updated gauge nodes are cached and use CSS custom properties.
- Minimap DOM nodes are cached.
- Exploration SVG path geometry is rebuilt only when the exploration trail or world bounds actually change.
- Player/camera minimap markers remain live without reconstructing the whole path.
- QA-only telemetry reports average/median/p95/p99 frame time, estimated display refresh, simulation steps per frame, long frames, effective DPR, quality tier, particles, enemies, and DOM/minimap write counts.

### Game feel and motion

The v3.8 pass deliberately changes presentation, not gameplay balance:

- procedural player lean remains and now renders through fixed-step interpolation;
- dash adds restrained direction-aware compression, wake, and time-based particles without delaying the command;
- the one bullet receives refresh-independent trail sampling, clearer launch/flight presentation, magnetic recall motion, ricochet micro-impact, and catch feedback;
- enemy materialization and Sniper/Charger telegraphs expose progress from their real gameplay timers;
- hostile projectiles receive a directional threat streak;
- camera follow keeps the existing exponential damping/look-ahead model while screen shake uses time-based coherent motion rather than render-frame jitter;
- the old oversized Canvas wave banner is replaced by a short semantic DOM announcement;
- low health, bullet state, dashboard orbit, CTA response, and screen transitions receive restrained CSS motion with `prefers-reduced-motion` support.

Particles and trails are time/simulation based rather than emitted once per render frame, so a 240 Hz display does not create four times the decorative work of a 60 Hz display.

### Typography and localization

Browser typography, SVG icons, English/Arabic localization, RTL layout, and document `lang`/`dir` remain centralized in the v3.7 DOM architecture. No external runtime font dependency was introduced, preserving offline/PWA behavior.

Localization remains centralized in `src/i18n.js`:

- English (`en`, LTR)
- العربية (`ar`, RTL)
- preference stored under `one-bullet-language`
- active UI updates without reload
- document `lang` and `dir` follow the selected language

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

- `src/main.js` — boots `OneBulletGlobalUiRuntime`, exposes QA hooks, and handles fullscreen/service-worker updates.
- `src/performance/frame-pacer.js` — fixed-step accumulator plus QA frame-pacing metrics.
- `src/performance/quality-manager.js` — AUTO/manual rendering-quality profiles and hysteresis.
- `src/render/canvas-viewport.js` — canonical HiDPI Canvas sizing, contain geometry, quality-aware backing-store limits, and input-coordinate conversion.
- `src/ui/dom-ui.js` — crisp DOM application UI bound to real game state.
- `src/ui/dom-performance-bridge.js` — cached high-frequency gauge/minimap nodes and exploration-path invalidation.
- `src/ui/icons.js` — vector SVG icon system.
- `src/i18n.js` — locale selection, persistence, translation, number formatting, and document direction.
- `src/core/ui-repair-runtime.js` — **canonical presentation/runtime owner**; owns the fixed-step/render bridge, interpolation, adaptive quality integration, DOM dirty synchronization, and Canvas/DOM state synchronization.
- `src/core/production-art-runtime.js` — retained lower-level arena presentation foundation.
- `src/core/world-expansion-runtime.js` — expanding world, camera, exploration, player-relative spawning, and encounter integration.
- `src/core/checkpoint-runtime.js` — backward-compatible local checkpoint progression.
- `src/core/combat-depth-runtime.js` — precision, bank-shot, momentum, and Overdrive systems.
- `src/game.js` — base state machine and combat mechanics.
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

Browser verification covers Chromium, Firefox, WebKit, HiDPI/mobile landscape, 1920×1080 and 2560×1440 presentation captures, dense Wave 67 stress scenes, Dashboard EN/AR, combat HUD, Sniper/Charger telegraphs, bullet flight/recall, dash, low health, DOM wave announcement, Pause, Upgrade Selection, and Game Over. Engine contracts additionally compare deterministic simulation across synthetic 60/120/144/165/240 Hz render schedules.

## Saved progression compatibility

The v3.8 runtime intentionally preserves:

- checkpoint schema and existing local checkpoint data;
- Continue Run / checkpoint restore behavior;
- scoring, best-wave, and high-score state;
- upgrades and run progression;
- one-bullet physics and ricochet behavior;
- enemy behavior and encounter balance;
- world expansion rules and accepted camera behavior;
- controls and Warden mechanics.

## Status

[`STATUS.md`](./STATUS.md) is the only project status file and remains the source of truth for release verification, performance QA, browser QA, and visual acceptance.
