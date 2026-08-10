# One Bullet Arena — Status

Last updated: 2026-08-10

## Current release candidate

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.8.0 — Smooth Runtime**
- Canonical version: `3.8.0-smooth-runtime`
- Canonical label: `v3.8.0-smooth-runtime`
- Release channel: `smooth-runtime`
- Service Worker cache: `one-bullet-arena-v3.8.0-smooth-runtime`
- Canonical presentation/runtime owner: `OneBulletGlobalUiRuntime`
- Production branch: `main`
- Feature branch: `feat/3.8.0-smooth-runtime`
- Pull request: **#52**
- Gameplay coordinate system: **1280×720 logical coordinates preserved**
- Checkpoint schema: **1 — unchanged**
- Candidate status: **runtime implementation accepted by source/browser gates; final post-cleanup gates and production deployment pending**

## Runtime architecture

v3.8 preserves the accepted v3.7 DOM + HiDPI presentation architecture and replaces render-frame-dependent gameplay timing with an explicit simulation/render boundary.

- Browser rendering remains driven by native `requestAnimationFrame()` with no artificial 60 FPS render cap.
- Gameplay simulation advances through a bounded **120 Hz fixed timestep**.
- The fixed-step accumulator allows at most **8 catch-up simulation steps** after a stall and discards excessive backlog rather than entering a spiral of death.
- Simulation cadence is independent of 60/120/144/165/240 Hz presentation cadence.
- Player, bullet, enemies, hostile projectiles, camera-linked presentation, and other moving visuals interpolate between simulation transforms for smooth presentation while collision and gameplay truth remain simulation-owned.
- Visibility/focus timing resets prevent background-tab time from becoming a giant gameplay delta.

## Adaptive rendering quality

Rendering quality is visual-only. It does not alter enemy count, AI, collision, damage, movement speed, bullet speed, wave progression, checkpoint state, or scoring rules.

Current quality ceilings:

| Tier | DPR ceiling | Backing-pixel budget |
| --- | ---: | ---: |
| ULTRA | 2.50 | 8.5 Mpx |
| HIGH | 2.25 | 7.2 Mpx |
| BALANCED | 1.75 | 5.2 Mpx |
| PERFORMANCE | 1.35 | 3.3 Mpx |

`AUTO` remains the default. It reacts to measured frame pacing using sustained pressure/headroom windows and cooldown hysteresis instead of rapidly oscillating tiers. Expensive backing-store changes are deferred to safe presentation states.

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
- HUD synchronization is dirty-state/cadence limited rather than rebuilt at every high-refresh render opportunity.
- Particle/trail work is time/simulation based rather than emitted once per render frame.
- QA telemetry tracks frame-time distribution, display cadence, simulation steps, long frames, effective DPR, quality tier, particles, enemies, and DOM/minimap writes.

## Input / gameplay compatibility

Input mapping continues to use the Canvas CSS rectangle rather than physical backing-store pixels:

`screen coordinate → contained Canvas rectangle → 1280×720 logical coordinate → world/camera transform`

The v3.8 runtime intentionally preserves checkpoint compatibility, scoring semantics, one-bullet physics/ricochet, enemy behavior, encounter balance, upgrades, world expansion, Warden mechanics, controls, and saved progression.

## Browser/UI behavior

- English and Arabic remain centralized in `src/i18n.js`.
- RTL document direction and logical CSS remain active.
- Browser typography and SVG icons remain the presentation source instead of low-resolution Canvas text for migrated application UI.
- Mobile landscape remains a dedicated compact composition rather than a scaled desktop dashboard.
- `prefers-reduced-motion` remains supported.
- PWA/service-worker installation remains local-first and offline-capable.

## Verified runtime gate

The runtime/test head `8dc142b35a203f535dfba036145ee5ad87918f5a` passed the release validation that preceded the final CI/document cleanup:

- **Verify #1304:** 104/104 Node tests passed; 0 failed.
- **Browser Smoke #476:** 236 Playwright cases total — 185 expected/passed, 51 intentionally skipped by project/capability conditions, 0 failed, 0 flaky.
- Browser coverage includes Chromium, Firefox, WebKit, high-refresh/fixed-step contracts, HiDPI/responsive presentation, input mapping, localization, gameplay states, dense late-wave stress scenes, and frame-pacing telemetry.

The WebKit telemetry regression was fixed at the contract level: tests now require live positive finite frame-time telemetry and actual rAF activity without assuming that every headless browser/runner must collect an arbitrary minimum number of samples in the same wall-clock window. Performance requirements such as fixed simulation cadence and encounter caps remain enforced.

## Repository / CI cleanup

The final release cleanup removes sources of workflow noise and stale generated output without deleting runtime dependencies:

- Verify no longer runs twice for the same feature-branch change through both `push` and `pull_request` events.
- Browser Smoke is a pull-request/manual quality gate; production deployment runs the full `verify:all` browser/source gate again before publishing.
- GitHub Pages deployment no longer writes a synthetic `deployment-proof` branch after each publish.
- Generated `_site/`, Playwright results/reports, verification output, coverage output, dependency folders, and logs are ignored by Git.
- Official GitHub Actions were moved to current supported major generations used by this repository workflow.
- Deployment builds a clean `_site` artifact from the tracked application shell instead of publishing working-tree/test output.
- Live deployment verification polls both `release.json` and `src/release-config.js` and requires the exact version, channel, and deployed commit SHA before the Pages workflow succeeds.

Historical source filenames such as `movement-hotfix-runtime.js`, `visual-design-runtime.js`, and the inherited core runtime layers are **not orphaned files**. They remain reachable in the active inheritance/import graph, so deleting them only because their names are old would break the game. Generated/stale artifacts are cleaned/ignored instead; active dependencies are retained until a deliberate architecture-flattening refactor replaces them safely.

## Production state before merge

At this checkpoint the public GitHub Pages site may still show **v3.7.0-hires-ui** because PR #52 has not yet been merged into `main`. This is expected and is not treated as a successful v3.8 deployment.

The release is accepted only after all of the following occur on the final cleanup head:

1. final PR Verify succeeds;
2. final PR Browser Smoke succeeds;
3. PR #52 is merged to `main`;
4. the Pages build completes `npm run verify:all` successfully;
5. the deployed `release.json` and `release-config.js` report `3.8.0-smooth-runtime`, channel `smooth-runtime`, and the exact production commit SHA.

## Remaining known limitations

- Touch gameplay controls intentionally remain Canvas-rendered because they are coupled to gameplay safe zones and input semantics; they use the HiDPI renderer and logical input mapper.
- No bundled WOFF2 family is introduced; system/local font fallbacks preserve offline behavior without adding an external runtime font dependency.
- Quality tiers intentionally cap effective DPR/backing pixels on very large or high-density screens. Effective DPR can therefore be lower than the device DPR to prevent excessive GPU/memory cost.

No other known release-blocking runtime defect remains at this checkpoint. The only open gate is final post-cleanup CI followed by merge and production convergence verification.
