# One Bullet Arena — Status

Last updated: 2026-08-09

## Current development release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v3.5.0 — Production Art**
- Production branch: `main`
- Canonical release version: `3.5.0-production-art`
- Canonical release label: `v3.5.0-production-art`
- Release channel: `production-art`
- Service Worker cache: `one-bullet-arena-v3.5.0-production-art`
- Previous gameplay foundation: **v3.4.0 — Expanding World**
- Last fully accepted baseline: **v3.3.0 — Cinematic Visual Overhaul**
- v3.5 automated verification: **pending latest GitHub Actions result**
- v3.5 manual gameplay/visual acceptance: **pending**
- Production publishing: **GitHub Pages deploys only after `npm run verify:all` succeeds**

## v3.5 scope — Production Art

v3.5 is a presentation overhaul built on top of the v3.4 expanding-world gameplay foundation. It does not remove the checkpoint, camera, world-expansion, encounter-director, Warden, or combat-depth systems.

### New production-art runtime

`src/core/production-art-runtime.js` is now the final runtime and extends `OneBulletUnifiedUiRuntime`.

It owns the final presentation for:

- Main Menu / checkpoint dashboard;
- Run Intelligence / progression rail;
- combat HUD;
- late-sector tactical minimap;
- arena presentation pass;
- Pause overlay;
- Game Over overlay;
- Upgrade Selection;
- production typography, panels, buttons, states, and visual hierarchy.

Production-art contract:

- runtime: `3.5.0-production-art`;
- revision: `production-command-suite-v1`;
- dashboard: production mission-control composition;
- combat HUD: compact screen-space command HUD;
- arena: extra sector framing/details without replacing world geometry;
- overlays: one shared production visual language.

### Main Menu redesign

The old oversized dashboard composition is no longer the final renderer. The v3.5 menu uses:

- compact left-aligned product identity;
- explicit checkpoint/new-run status module;
- one primary mission panel with clear current-wave hierarchy;
- three telemetry tiles for upgrades, run score, and save state;
- one dominant Continue/Start action;
- independent secondary New Run and Delete Save actions;
- Run Intelligence rail for Best Wave, High Score, Checkpoint, and world-expansion progress;
- restrained keyboard hints instead of a large footer toolbar.

### Combat presentation

The production HUD keeps gameplay visible and reserves only three compact top modules:

- bullet / recall state;
- current wave / encounter / enemy telemetry;
- health / shield / dash state.

The tactical minimap remains available in expanded sectors and uses the same production visual system.

### Fullscreen + expanding world retained from v3.4

The v3.4 gameplay foundation remains active:

- browser shell fills `100vw × 100dvh`;
- direct interaction and `Enter` / `Space` can request Browser Fullscreen;
- `F` remains the manual fullscreen toggle;
- eight arena stages unlock at Waves 1, 3, 6, 9, 13, 18, 25, and 35;
- camera follows the player with stage-dependent zoom;
- pointer aiming is transformed from screen space to world space;
- enemies spawn relative to the player in large sectors;
- minimap tracks viewport, player, and exploration;
- HUD/touch safe zones remain protected in world space.

### Late-game encounter director retained

From Wave 10 onward, the five encounter profiles remain active:

- `rush`;
- `crossfire`;
- `swarm`;
- `siege`;
- `hunters`.

The enemy cap remains 18 and late health/speed/projectile pressure continues scaling inside explicit safety caps.

## Active runtime chain

The boot chain is now:

`ProductionArt → UnifiedUI → WorldExpansion → Dashboard → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

Current contracts:

- Production Art: `3.5.0-production-art` / `production-command-suite-v1`.
- Unified UI: `3.4.0-unified-ui`.
- World Expansion: `3.4.0-expanding-world`.
- Dashboard foundation: `3.3.7-dashboard-command-deck` / `command-deck-v12`.
- Visual Overhaul: `3.3.0-visual-overhaul`.
- World2D: `3.2.0-true-2d`.
- Warden: `3.1.0-a-warden`.
- Checkpoint Progression: `3.0.0-checkpoint`.
- Combat Depth: `2.9.0-combat`.
- Gameplay event schema: `4`.
- Checkpoint schema: `1`.

Existing checkpoint data remains compatible.

## v3.5 verification coverage

The release gate now covers:

- syntax checking of `production-art-runtime.js`;
- production runtime boot from `src/main.js`;
- Service Worker caching of production art;
- canonical v3.5 release metadata;
- production menu without a checkpoint;
- production checkpoint continuation menu;
- production Game Over flow;
- restored checkpoint gameplay;
- Wave 35 expanded-world camera under production art;
- production dashboard, combat HUD, arena pass, and overlay snapshot contracts;
- retained fullscreen, checkpoint, camera-safe-zone, Warden, encounter, and world-expansion behavior.

## Production workflow

`.github/workflows/deploy-pages.yml` runs on every push to `main` and performs:

1. dependency installation;
2. Playwright browser installation;
3. `npm run verify:all`;
4. static-site assembly;
5. production-art/release/fullscreen deployment-contract checks;
6. GitHub Pages deployment.

Only the newest `main` revision should be treated as the deployment candidate.

## Acceptance gate

Do **not** mark v3.5 accepted until all of the following are true:

- latest Verify workflow is green;
- latest Browser Smoke workflow is green;
- latest Deploy GitHub Pages workflow is green;
- Fresh Menu renders without runtime errors;
- checkpoint continuation restores the saved run;
- Dashboard is manually accepted on desktop fullscreen;
- combat HUD remains readable without covering the arena;
- Pause, Game Over, Upgrade Selection, Dashboard, and combat HUD look like one product;
- Waves 13/18/25/35 remain readable while the world expands and camera moves;
- desktop fullscreen and mobile landscape remain playable.
