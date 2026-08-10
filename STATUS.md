# One Bullet Arena — Status

Last updated: 2026-08-10

## Current release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.8.0 — Smooth Runtime**
- Canonical version: `3.8.0-smooth-runtime`
- Canonical label: `v3.8.0-smooth-runtime`
- Release channel: `smooth-runtime`
- Service Worker cache: `one-bullet-arena-v3.8.0-smooth-runtime`
- Canonical presentation/runtime owner: `OneBulletGlobalUiRuntime`
- Production branch: `main`
- Pull request: **#52 — merged**
- Runtime merge commit: `e0db3466cafac5d265ca07b489cfdb90e7edee9c`
- Gameplay coordinate system: **1280×720 logical coordinates preserved**
- Checkpoint schema: **1 — unchanged**
- Release status: **merged to main; production Pages convergence is the remaining deployment gate**

## Local audit - 2026-08-10

- Working folder inspected: `C:\Users\Abud\Desktop\GitHub\One-Bullet-Arena-main`.
- Current folder does not contain Git metadata, so local branch/commit status could not be verified from this checkout copy.
- Architecture confirmed as a static browser game/PWA using Canvas gameplay with semantic DOM/SVG UI.
- Runtime owner confirmed: `OneBulletGlobalUiRuntime` in `src/core/ui-repair-runtime.js`.
- Local Windows issue fixed: Playwright no longer depends on unavailable `python3 -m http.server`; browser tests now use `node ./scripts/static-server.js 4173`.
- Added `scripts/static-server.js`, a no-cache Node static file server used for local/browser verification.
- Added the static server to `npm run check` so syntax errors in the local server fail the normal verification gate.
- Installed npm dependencies locally; npm audit reported `found 0 vulnerabilities`.
- Verification passed locally:
  - `npm run verify`: passed, including syntax checks and **104/104 Node tests**.
  - `npm run test:browser`: passed with **185 passed, 51 skipped, 0 failed** across configured Playwright browser projects.
- Scope boundary: production GitHub Pages convergence was not checked in this local audit.

## Local UI/gameplay polish - 2026-08-10

- Dashboard presentation updated for a cleaner professional layout in English and Arabic:
  - reduced oversized card heights and dashboard width;
  - tightened run/snapshot/progression spacing;
  - added explicit RTL grid ordering for the run hero, snapshot panel, metrics, actions, and progression labels;
  - improved upgrade card legibility and Arabic alignment for the three upgrade choices.
- Arabic runtime behavior rechecked in the game HUD, dashboard, world progression, and upgrade selection.
- Player/enemy presentation cleaned:
  - removed the always-on player readiness halo;
  - reduced strong player, bullet, enemy, and telegraph glow/shadow values;
  - kept dash/catch/recall feedback as momentary animation rather than permanent aura.
- Local visual evidence captured:
  - `output/playwright/dashboard-en-audit.png`
  - `output/playwright/dashboard-ar-audit.png`
  - `output/playwright/combat-clean-audit.png`
  - `output/playwright/upgrade-ar-audit.png`
- Verification passed locally after the polish:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - Targeted dashboard/RTL/browser visual run: `npx playwright test tests/browser/render-quality.spec.js tests/browser/visual-review.spec.js tests/browser/global-ui-responsive.spec.js --project=desktop-chromium --project=mobile-landscape --workers=1` passed with **10 passed, 10 skipped, 0 failed**.
  - Targeted gameplay/control run: `npx playwright test tests/browser/core-loop.spec.js tests/browser/movement-controls.spec.js tests/browser/unified-ui.spec.js --project=desktop-chromium --project=mobile-landscape --workers=1` passed with **32/32**.
- Note: the same dashboard/visual subset timed out under heavier parallel capture before passing with `--workers=1`; no assertion failure remained in the serialized rerun.

## Local dashboard/gameplay redesign - 2026-08-10

- Reworked the dashboard beyond the earlier polish pass:
  - menu canvas/world art is hidden while the dashboard is open, removing the old map backdrop, center arrow, and trajectory visuals behind the UI;
  - run stats are now clear dashboard tiles instead of the old orbit-centered composition;
  - Arabic progression stays aligned left-to-right like English while labels remain RTL;
  - Arabic and English numeric output now uses English digits consistently through `i18n.number`.
- Upgrade flow changed to the requested cadence:
  - normal wave clears continue directly into the next wave;
  - upgrade cards are offered only every 5 waves;
  - tests now assert the wave-5 reward path and 5-wave arena expansion cadence.
- Progression/maps updated:
  - arena stages now open at waves `1, 5, 10, 15, 20, 25, 30, 35`;
  - later sectors are larger so the camera/exploration loop matters more;
  - a small bullet locator appears when the bullet is far away and not recalling.
- Upgrades were strengthened and expanded:
  - stronger damage, ricochet, recall, shock, dash, movement, health, and shield scaling;
  - added `phase-round`, `field-medic`, and `dash-impact`;
  - upgrade cards now use upgrade-specific icon families and accent colors.
- Gameplay cleanup:
  - fixed a movement bug where player Y movement was applied twice;
  - removed entity ground shadows and canvas glow blur from the active character/enemy render layers;
  - added simple obstacle-aware enemy steering so scouts/brutes/chargers/snipers do not only rush in a straight line;
  - charger telegraph direction remains locked before execution.
- Local visual evidence captured:
  - `output/playwright/dashboard-redesign-en.png`
  - `output/playwright/dashboard-redesign-ar.png`
  - `output/playwright/upgrade-redesign-ar.png`
  - `output/playwright/combat-no-shadow-map.png`
- Verification passed locally after redesign:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js --workers=1 --reporter=line`: **40/40 passed** across configured browser projects.
  - `npx playwright test tests/browser/event-foundation.spec.js tests/browser/ui-repair.spec.js tests/browser/unified-ui.spec.js --workers=1 --reporter=line`: **30 passed, 6 skipped, 0 failed** across configured browser projects.
  - Desktop Chromium targeted runs passed for: `visual-overhaul`, `global-ui-responsive`, `smooth-runtime`, `checkpoint-progression`, `checkpoint-visual`, `combat-depth`, `keyboard-controls`, `movement-controls`, `touch-safe-arena`, `warden-enemy`, `warden-visual`, `world-2d-visual`, `render-quality` visual matrix, and `visual-review`.
- Note: one monolithic `npm run test:browser -- --workers=1 --reporter=line` command timed out in this local desktop shell before producing useful output; the affected and heavy browser suites above were rerun in smaller serialized batches with no remaining assertion failure.

## Gameplay visibility hotfix - 2026-08-10

- Fixed a regression where the gameplay HUD entered `playing` but the Canvas render layer stayed hidden after leaving the redesigned dashboard.
- Root cause: the dashboard hide rule used `body[data-game-state="menu"]`, while the high-frequency DOM performance bridge updated `#game-ui-layer[data-state]` without also updating `body.dataset.gameState`.
- Fix:
  - `src/ui/dom-performance-bridge.js` now keeps `document.body.dataset.gameState` synchronized on state transitions;
  - `styles/ui.css` includes a protective fallback that forces `.game-render-layer` visible whenever the UI layer is in `playing`, `paused`, `upgrade`, or `gameover`.
- Local non-QA browser evidence captured: `output/playwright/gameplay-visible-hotfix.png`.
- Verification after hotfix:
  - ordinary `http://127.0.0.1:4173/` page starts gameplay with `body=playing`, `#game-ui-layer=playing`, and `.game-render-layer` opacity `1`;
  - `npm run verify`: passed, including **104/104 Node tests**.

## Physics/effects cleanup - 2026-08-10

- Reworked bullet catch feedback from map effects into gameplay physics:
  - catching a returning bullet now pushes nearby enemies away from the player and briefly staggers their steering pressure;
  - the catch impulse also applies to enemies still in their spawn entry window so early close-pressure waves feel responsive;
  - enemy catch cooldown handling now guards against undefined cooldown values.
- Added the new `kinetic-catch` upgrade:
  - localized in English and Arabic;
  - included in upgrade cards/icons/effect text;
  - stacks strengthen the catch knockback radius and force.
- Cleaned active combat visuals:
  - removed large catch/radial glow fills, spawn rings, shield halos, dash circles, Warden guard rings, and center-platform/floor rings;
  - impact, recall, catch, shield, precision, overdrive, and muzzle feedback now use short directional strokes instead of circular map effects;
  - kill bursts and mini-splitter particles were reduced further.
- Local visual evidence captured:
  - `output/playwright/physics-catch-pass-clean.png`
  - `output/playwright/physics-catch-canvas-clean.png`
- Verification after cleanup:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/combat-depth.spec.js tests/browser/visual-overhaul.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **17/17 passed**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/visual-overhaul.spec.js tests/browser/world-2d-visual.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **14/14 passed**.

## Player/enemy visual cleanup - 2026-08-10

- Removed the two external side markers that appeared beside the player from shield, catch, precision, overdrive, and catch-recovery presentation layers.
- Rebuilt the player body as a stronger armored directional craft with integrated hull plates, a clearer cyan core, and a sharper bullet muzzle, without external halos.
- Removed circular enemy health/alert rings from the active visual-overhaul layer; enemy health remains readable through compact bars.
- Replaced remaining fallback circular charger, shield-block, second-chance, and muzzle-flash effects with directional lines or text-only feedback.
- Local visual evidence captured:
  - `output/playwright/player-enemy-clean-pass.png`
  - `output/playwright/player-enemy-clean-canvas.png`
- Verification after cleanup:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/visual-overhaul.spec.js tests/browser/world-2d-visual.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **14/14 passed**.

## Runtime architecture

v3.8 preserves the accepted DOM + HiDPI presentation architecture while replacing render-frame-dependent gameplay timing with an explicit simulation/render boundary.

- Browser rendering remains driven by native `requestAnimationFrame()` with no artificial 60 FPS render cap.
- Gameplay simulation advances through a bounded **120 Hz fixed timestep**.
- The fixed-step accumulator allows at most **8 catch-up simulation steps** after a stall and discards excessive backlog rather than entering a spiral of death.
- Simulation cadence is independent of 60/120/144/165/240 Hz presentation cadence.
- Player, bullet, enemies, hostile projectiles, camera-linked presentation, and other moving visuals interpolate between simulation transforms while collision/gameplay truth remain simulation-owned.
- Visibility/focus timing resets prevent background-tab time from becoming a giant gameplay delta.

## Adaptive rendering quality

Rendering quality is visual-only and does not alter enemy count, AI, collision, damage, movement speed, bullet speed, wave progression, checkpoint state, or scoring rules.

| Tier | DPR ceiling | Backing-pixel budget |
| --- | ---: | ---: |
| ULTRA | 2.50 | 8.5 Mpx |
| HIGH | 2.25 | 7.2 Mpx |
| BALANCED | 1.75 | 5.2 Mpx |
| PERFORMANCE | 1.35 | 3.3 Mpx |

`AUTO` is the default and uses sustained frame-pacing pressure/headroom windows plus cooldown hysteresis. Expensive backing-store changes are deferred to safe presentation states.

## High-DPI / DOM presentation

The rendering contract remains:

1. **Simulation:** 1280×720 logical coordinates.
2. **Canvas display:** centered 16:9 contain rectangle.
3. **Canvas backing store:** CSS display size × effective quality-aware DPR.
4. **Application UI:** semantic HTML + CSS + SVG where practical.

`src/render/canvas-viewport.js` remains the single owner of display geometry, pointer/touch mapping, backing-store dimensions, DPR constraints, and backing-pixel budgets.

DOM-owned surfaces remain the Dashboard, desktop HUD, utility/settings controls, World Progression, late-game minimap, Pause, Upgrade Selection, and Game Over. Canvas remains responsible for world/gameplay rendering and touch gameplay controls.

## Smooth-runtime performance work

- `src/performance/frame-pacer.js` owns fixed-step accumulation and frame-pacing telemetry.
- `src/performance/quality-manager.js` owns AUTO/manual quality profiles and hysteresis.
- `src/ui/dom-performance-bridge.js` caches high-frequency DOM/minimap nodes and invalidates exploration geometry only when required.
- HUD synchronization is dirty-state/cadence limited instead of rebuilding at every high-refresh render opportunity.
- Particle/trail work is time/simulation based rather than emitted once per render frame.
- QA telemetry tracks frame-time distribution, display cadence, simulation steps, long frames, effective DPR, quality tier, particles, enemies, and DOM/minimap writes.

## Input / gameplay compatibility

Input mapping continues to use the Canvas CSS rectangle rather than physical backing-store pixels:

`screen coordinate → contained Canvas rectangle → 1280×720 logical coordinate → world/camera transform`

v3.8 preserves checkpoint compatibility, scoring semantics, one-bullet physics/ricochet, enemy behavior, encounter balance, upgrades, world expansion, Warden mechanics, controls, and saved progression.

## Browser/UI behavior

- English and Arabic remain centralized in `src/i18n.js`.
- RTL document direction and logical CSS remain active.
- Browser typography and SVG icons remain the presentation source for migrated application UI.
- Mobile landscape remains a dedicated compact composition rather than a scaled desktop dashboard.
- `prefers-reduced-motion` remains supported.
- PWA/service-worker installation remains local-first and offline-capable.

## Final pre-merge verification

Final cleanup head `5b1e1b83925bfa3a6ea570e616024d96a222fa7b` passed both required PR gates before merge:

- **Verify #1309:** success; Node/source verification green.
- **Browser Smoke #481:** **236 Playwright cases total — 185 expected/passed, 51 intentionally skipped by project/capability conditions, 0 failed, 0 flaky**.
- Browser projects: desktop Chromium, mobile landscape Chromium, desktop Firefox, desktop WebKit.
- Visual evidence checked at desktop 2560×1440, dense Wave 67 combat, and Arabic mobile landscape; no clipping or leaked `FPS N/A` overlay was present in the v3.8 artifact.

The earlier accepted runtime head `8dc142b35a203f535dfba036145ee5ad87918f5a` also passed **Verify #1304 with 104/104 Node tests** and **Browser Smoke #476 with the same 236-case / 0-failure browser contract**.

The WebKit telemetry regression was fixed at the contract level: tests require live positive finite frame-time telemetry and actual rAF activity without assuming an arbitrary minimum sample count within one headless-runner wall-clock window. Fixed simulation cadence and encounter/performance constraints remain enforced.

## Repository / CI cleanup

- Verify no longer runs twice for the same feature-branch change through both `push` and `pull_request` events.
- Browser Smoke is a pull-request/manual quality gate; production Pages deployment runs the full `verify:all` source/browser gate again before publishing.
- GitHub Pages no longer writes a synthetic diagnostics commit after every deployment.
- Generated `_site/`, Playwright results/reports, verification output, coverage output, dependency folders, and logs are ignored by Git.
- GitHub Actions workflow dependencies were updated to their supported major generations used by this repository.
- Deployment builds a clean `_site` artifact from tracked application files and creates `release.json` with version/channel/source SHA.
- Live deployment verification polls `release.json` and `src/release-config.js` and requires the exact version, `smooth-runtime` channel, and production commit SHA before the Pages workflow succeeds.
- The obsolete `deployment-proof` branch tip was reset to the current production history, removing its stale `verification/workflow-status.json` payload; the workflow will not recreate that diagnostics payload.
- The merged feature branch tip was synchronized to production so it no longer holds the old unsquashed release stack as an active branch tip.

Historical source filenames such as `movement-hotfix-runtime.js`, `visual-design-runtime.js`, and inherited core runtime layers are **active dependencies**, not orphaned files. They remain reachable in the import/inheritance graph. Deleting them merely because their names are historical would break the game; generated/stale artifacts were cleaned instead.

## Production deployment gate

PR #52 has been squash-merged into `main`. The source of truth on `main` now reports `3.8.0-smooth-runtime`, channel `smooth-runtime`.

Production is considered converged only when the Pages workflow for the latest `main` commit completes all of the following:

1. installs dependencies and Playwright browsers;
2. completes `npm run verify:all` successfully;
3. builds the clean Pages artifact;
4. deploys through the `github-pages` environment;
5. reads the live `release.json` and `src/release-config.js` back from GitHub Pages and confirms the exact v3.8 version/channel/source SHA.

A browser tab that was already open on v3.7 may briefly retain the old document until the new Pages artifact has converged. The service worker uses a versioned cache, `skipWaiting()`, `clients.claim()`, network-first same-origin fetching with reload semantics, and a guarded `controllerchange` reload so an installed PWA/browser session can move to the new release without preserving the old application shell indefinitely.

## Remaining known limitations

- Touch gameplay controls intentionally remain Canvas-rendered because they are coupled to gameplay safe zones/input semantics; they use the HiDPI renderer and logical input mapper.
- No bundled WOFF2 family is introduced; system/local font fallbacks preserve offline behavior without an external runtime font dependency.
- Quality tiers intentionally cap effective DPR/backing pixels on very large/high-density screens. Effective DPR can therefore be lower than device DPR to prevent excessive GPU/memory cost.

No known release-blocking runtime defect remains in the merged v3.8 code. The remaining release condition is the automated production Pages convergence check described above.
