# One Bullet Arena — Status

Last updated: 2026-08-09

## Current development release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v3.4.0 — Expanding World**
- Production branch: `main`
- Canonical release version: `3.4.0-expanding-world`
- Canonical release label: `v3.4.0-expanding-world`
- Release channel: `expanding-world`
- Service Worker cache: `one-bullet-arena-v3.4.0-expanding-world`
- Previous accepted release: **v3.3.0 — Cinematic Visual Overhaul**
- v3.4 automated verification: **pending latest GitHub Actions result**
- v3.4 manual gameplay/visual acceptance: **pending**
- Production publishing: **GitHub Pages deploys only after `npm run verify:all` succeeds**

## v3.4 scope — Expanding World

This is a gameplay-and-presentation release, not a render-only patch. It intentionally changes world and collision geometry after the original arena progression.

### Fullscreen presentation

- The browser shell now fills `100vw × 100dvh` instead of rendering the game as a centered 16:9 card.
- First direct canvas interaction attempts Browser Fullscreen when permitted.
- `Enter` / `Space` start gestures also request fullscreen when allowed.
- `F` remains the explicit fullscreen toggle.
- QA/browser-test mode does not force fullscreen.

### Expanding arena and camera

The arena now contains eight progression stages:

1. Wave 1 — Central combat room.
2. Wave 3 — Side wings.
3. Wave 6 — Outer corridors.
4. Wave 9 — Original full arena.
5. Wave 13 — Outer sector.
6. Wave 18 — Industrial ring.
7. Wave 25 — Open matrix.
8. Wave 35 — Final belt.

The Wave 35 arena is more than twice the width and height of the original Wave 9 arena.

`src/core/world-expansion-runtime.js` adds:

- smooth player-follow camera;
- directional camera lead;
- stage-dependent zoom;
- screen-to-world pointer conversion so aiming remains correct under the camera;
- player-relative enemy spawning for large maps;
- exploration distance/trail state;
- late-sector minimap showing player, viewport, and explored route;
- expanded-world floor/deck rendering;
- a screen-space combat HUD that remains stable while the world camera moves.

### Late-game encounter director

The previous late-game pressure plateau has been replaced by a five-pattern encounter rotation from Wave 10 onward:

- `rush` — fast Charger pressure;
- `crossfire` — ranged Sniper pressure;
- `swarm` — Splitter-heavy crowd pressure;
- `siege` — Warden/Brute armored pressure;
- `hunters` — mixed elite pressure.

Additional changes:

- active enemy cap increased from 14 to 18;
- enemy count continues to grow after Wave 15 instead of effectively stopping;
- late health, movement speed, and projectile speed continue scaling inside explicit hard caps;
- encounter profiles apply different health/speed/projectile pressure multipliers;
- dangerous enemy counts remain bounded per wave.

### Unified visual language

The runtime chain now unifies the major screens rather than mixing the old UI with the redesigned dashboard:

- cinematic command/checkpoint menu;
- combat HUD;
- upgrade selection;
- pause overlay;
- Game Over / checkpoint continuation;
- wave/sector banners;
- touch controls.

Arabic copy uses RTL rendering while English labels and numeric telemetry use LTR rendering where the new UI layer owns the text.

## Active runtime chain

The final boot chain is:

`UnifiedUI → WorldExpansion → Dashboard → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

Current contracts:

- Unified UI: `3.4.0-unified-ui`.
- World Expansion: `3.4.0-expanding-world`.
- Dashboard: `3.3.6-dashboard-cinematic-command` / `cinematic-command-menu-v11`.
- Visual Overhaul: `3.3.0-visual-overhaul`.
- World2D: `3.2.0-true-2d`.
- Warden: `3.1.0-a-warden`.
- Checkpoint Progression: `3.0.0-checkpoint`.
- Combat Depth: `2.9.0-combat`.
- Gameplay event schema: `4`.
- Checkpoint schema: `1`.

Existing checkpoint schema remains unchanged; saved runs are restored into the arena stage selected by their saved wave.

## Verification added for v3.4

The release gate now includes explicit checks for:

- late-game enemy-count growth and safety caps;
- five rotating encounter profiles;
- eight arena stages and late-stage world dimensions;
- progressive camera zoom and camera clamping;
- camera/exploration/minimap runtime contracts;
- fullscreen viewport CSS;
- world-expansion and unified-UI Service Worker caching;
- final runtime boot through `OneBulletUnifiedUiRuntime`;
- Fresh Menu with no checkpoint;
- Checkpoint Menu and restore flow;
- Wave 35 expanded-world camera capture;
- unified Upgrade Selection;
- unified Pause overlay;
- unified Game Over overlay;
- retained Warden, combat-depth, checkpoint, True2D, and visual-overhaul behavior under the v3.4 runtime chain.

## Production workflow

`.github/workflows/deploy-pages.yml` runs on every push to `main` and performs:

1. dependency installation;
2. Chromium, Firefox, and WebKit Playwright installation;
3. `npm run verify:all`;
4. static-site assembly;
5. release/runtime/fullscreen deployment-contract checks;
6. GitHub Pages deployment.

`concurrency: pages` with `cancel-in-progress: true` means only the newest `main` revision should be treated as the deployment candidate.

## Acceptance gate

Do **not** mark v3.4 accepted until all of the following are true:

- latest Verify workflow is green;
- latest Deploy GitHub Pages workflow is green;
- Fresh Menu loads without runtime errors;
- checkpoint continuation still restores a real saved run;
- Wave 13+ camera movement feels controlled rather than disorienting;
- Wave 18+ visibly reveals space beyond one fixed screen;
- Wave 25/35 minimap and camera remain readable;
- late-wave encounters feel meaningfully different rather than only numerically harder;
- Upgrade, Pause, Game Over, Dashboard, and combat HUD feel like the same product;
- desktop fullscreen behavior works through direct interaction and `F`;
- mobile landscape remains playable.

## Previous accepted baseline

v3.3.0 remains the last fully accepted baseline until the v3.4 acceptance gate above is closed. Its prior automated verification was green and its manual visual acceptance was completed before merge.
