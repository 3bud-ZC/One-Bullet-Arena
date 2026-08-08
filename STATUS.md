# One Bullet Arena — Status

Last updated: 2026-08-08

## Current release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.3.0 — Cinematic Visual Overhaul**
- Production branch: `main`
- Pull Request: **#45 — merged on 2026-08-07**
- Merge commit: `89180967be3f64f8b6ee6e8a5f18a3d5338b963f`
- Pages publishing fix: `6828f382c636ca708ec78c0ae3993a4bcc354459`
- Canonical release version: `3.3.0-visual-overhaul`
- Canonical release label: `v3.3.0-visual-overhaul`
- Release channel: `cinematic-visual-overhaul`
- Service Worker cache: `one-bullet-arena-v3.3.0-visual-overhaul`
- v3.3 implementation: **complete and merged**
- v3.3 automated verification baseline: **green**
- v3.3 manual visual acceptance: **accepted before merge**
- Production publishing: **enabled from `main` through GitHub Pages workflow**

## Post-release maintenance — 2026-08-08

- Added the missing dedicated combat-impact profile for the Wave 7 Warden so successful Warden hits no longer fall back to the Scout impact profile.
- Added a regression test asserting the Warden keeps distinct impact color, spark count, radius, and shake weight.
- Corrected the README enemy roster from five archetypes to six and documented the Warden's directional guard behavior.
- Removed stale release-state documentation that incorrectly described PR #45 as draft/unmerged and owner acceptance as pending.

These maintenance changes do not alter arena geometry, collision geometry, enemy health, movement speed, wave composition, upgrade values, checkpoint schemas, or progression rules.

## Visual overhaul delivered

- Added `src/core/visual-overhaul-runtime.js` above the accepted True 2D runtime.
- Strengthened the industrial arena with ambient deck nodes, stage-aware energy accents, floor scan/detail passes, stronger physical borders, corner framing, and obstacle material detail.
- Added enemy health/threat arcs and clearer impact readability without changing enemy hitboxes.
- Added hostile projectile glow without changing projectile collision geometry.
- Added player dash-ready and shield visual layers without changing movement or defensive values.
- Added a readable bullet recall tether, additional bullet glow, and a secondary aiming-reticle treatment.
- Added stronger cinematic framing for the main menu, combat HUD, upgrade selection, pause, Game Over, banners, and touch controls.
- Strengthened the browser shell with a richer sci-fi frame and background treatment while preserving mobile-landscape behavior.
- `prefers-reduced-motion` support remains active for non-essential motion and shell effects.

## Architecture

The active runtime chain is:

`VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- `VisualOverhaul` remains render-only.
- `World2D` contract: `3.2.0-true-2d`.
- Warden contract: `3.1.0-a-warden`.
- Checkpoint Progression contract: `3.0.0-checkpoint`.
- Combat Depth contract: `2.9.0-combat`.
- Gameplay event schema: `4`.
- Checkpoint schema: `1`.
- Existing checkpoint saves remain compatible.

## v3.3 release verification baseline

Verified release-content head: `ecf635a7213f28cb9dca2584164ef4d747f8f013`.

- Verify #833: **success**.
- Browser Smoke #171: **success**.
- Playwright: **148/148 passed**.
- Unexpected failures: **0**.
- Flaky tests: **0**.
- Skipped tests: **0**.
- Final Browser Smoke artifact generated successfully.
- Final menu capture reported `v3.3.0-visual-overhaul`.
- Combat, checkpoint, Warden, keyboard/input, touch/mobile, PWA, service-worker, and release-handshake coverage was green at the release gate.

## Production workflow

`.github/workflows/deploy-pages.yml` runs on every push to `main` and performs:

1. dependency installation;
2. Chromium, Firefox, and WebKit Playwright installation;
3. `npm run verify:all`;
4. static-site assembly and release-handshake checks;
5. GitHub Pages deployment.

The deployment uses `concurrency: pages` with `cancel-in-progress: true`, so the newest `main` revision is the authoritative deployment candidate.

## Current development rule

All new game development and bug fixes should start from the current `main` branch, preserve unrelated production behavior, include targeted verification where practical, and keep this file synchronized with material release-state changes.
