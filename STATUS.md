# One Bullet Arena — Status

Last updated: 2026-08-09

## Current development release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v3.5.1 — UI Repair**
- Production branch: `main`
- Canonical release version: `3.5.1-ui-repair`
- Canonical release label: `v3.5.1-ui-repair`
- Release channel: `ui-repair`
- Service Worker cache: `one-bullet-arena-v3.5.1-ui-repair`
- Presentation foundation: **v3.5.0 — Production Art**
- Gameplay foundation: **v3.4.0 — Expanding World**
- Automated verification: **pending latest GitHub Actions result**
- Manual visual acceptance: **pending**
- Production publishing: **GitHub Pages deploys only after `npm run verify:all` succeeds**

## v3.5.1 scope — Focused UI Repair

v3.5.1 is a focused interface correction on top of the Production Art and Expanding World systems. It intentionally does not modify arena geometry, world expansion, camera behavior, checkpoints, encounter composition, enemy behavior, damage, movement, or progression.

### UI Repair runtime

`src/core/ui-repair-runtime.js` is now the final boot runtime and extends `OneBulletProductionArtRuntime`.

It owns only these high-value UI surfaces:

- Main Menu / checkpoint dashboard;
- combat HUD;
- tactical minimap;
- Pause overlay;
- Game Over overlay;
- Upgrade Selection.

It does **not** override arena rendering or the simulation update loop.

UI Repair contract:

- runtime: `3.5.1-ui-repair`;
- revision: `production-ui-repair-v1`;
- density: `balanced-production`;
- outer desktop margin target: 58px;
- main/rail gap target: 20px;
- dashboard grid: 780px main mission surface + 364px Run Intelligence rail;
- compact three-module combat HUD;
- reduced Pause and Game Over modal footprints;
- equal-baseline Upgrade cards.

### Dashboard corrections

The repaired dashboard replaces the oversized and loosely aligned composition with:

- compact left-aligned product identity;
- explicit checkpoint/new-run state at the top right;
- one coherent mission surface;
- a contained Current Wave hero block rather than a large empty panel;
- three equal telemetry tiles for Upgrades, Run Score, and Save state;
- one dominant Continue/Start action;
- New Run and Delete Save as balanced secondary actions;
- wider Run Intelligence rows with stable label/value separation;
- integrated World Progression showing the current sector and next expansion wave;
- restrained keyboard hints instead of a large footer panel.

### Combat HUD corrections

The repaired combat HUD reduces obstruction while keeping essential information visible:

- bullet/recall module: 268×54;
- wave/encounter module: 352×54;
- health/shield/dash module: 268×54;
- compact tactical minimap in late sectors;
- stable screen-space placement while the world camera moves.

### Overlay corrections

- Pause: reduced to a 520×360 tactical modal with three metrics and two secondary actions.
- Game Over: reduced to a 640×500 modal with four run metrics and explicit checkpoint state.
- Upgrade Selection: three equal 344×420 cards with consistent title, description, effect, level, and selection baselines.

## Retained production/gameplay foundations

v3.5.0 Production Art remains below UI Repair and still owns the arena presentation layer. v3.4 Expanding World remains the gameplay foundation, including:

- fullscreen `100vw × 100dvh` browser shell;
- eight world-expansion stages at Waves 1, 3, 6, 9, 13, 18, 25, and 35;
- player-follow camera and stage-dependent zoom;
- screen-to-world pointer aiming;
- player-relative spawning in large sectors;
- exploration tracking;
- five late-game encounter patterns: rush, crossfire, swarm, siege, hunters;
- active enemy cap of 18;
- camera-aware HUD/touch collision safe zones.

## Active runtime chain

The boot chain is now:

`UIRepair → ProductionArt → UnifiedUI → WorldExpansion → Dashboard → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

Current contracts:

- UI Repair: `3.5.1-ui-repair` / `production-ui-repair-v1`.
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

## v3.5.1 verification coverage

The release gate now covers:

- syntax checking of `ui-repair-runtime.js`;
- final runtime boot through `OneBulletUiRepairRuntime`;
- Service Worker caching of both Production Art and UI Repair runtimes;
- canonical `3.5.1-ui-repair` release/cache identity;
- Fresh Menu without a checkpoint;
- checkpoint dashboard and restore flow;
- repaired Game Over flow;
- repaired Upgrade Selection;
- repaired compact combat HUD;
- Wave 35 expanded-world camera under the repaired UI;
- retained Production Art, fullscreen, checkpoint, Warden, camera-safe-zone, encounter, and world-expansion behavior.

## Production workflow

`.github/workflows/deploy-pages.yml` runs on every push to `main` and performs:

1. dependency installation;
2. Playwright browser installation;
3. `npm run verify:all`;
4. static-site assembly;
5. runtime/release/fullscreen deployment-contract checks including `ui-repair-runtime.js`;
6. GitHub Pages deployment.

Only the newest `main` revision should be treated as the deployment candidate.

## Acceptance gate

Do **not** mark v3.5.1 accepted until all of the following are true:

- latest Verify workflow is green;
- latest Browser Smoke workflow is green;
- latest Deploy GitHub Pages workflow is green;
- deployed footer reports `v3.5.1-ui-repair` rather than a stale v3.4/v3.5 cache;
- Fresh Menu renders without runtime errors;
- checkpoint continuation restores the saved run;
- Dashboard is manually accepted on desktop fullscreen;
- combat HUD remains readable without covering the arena;
- Pause, Game Over, Upgrade Selection, Dashboard, and combat HUD look like one product;
- Waves 13/18/25/35 remain readable while the world expands and camera moves;
- desktop fullscreen and mobile landscape remain playable.
