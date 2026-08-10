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
