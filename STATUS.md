# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.8.0-A — Release & Stability Foundation**
- Pull Request #39: **squash-merged into `main`**
- Release merge commit: `3399d4514063a0e0f859a6082849187101f853e8`
- Implementation: **100% complete**
- Owner desktop gameplay acceptance: **confirmed**
- Owner visual acceptance: **confirmed through Wave 14 and upgrade selection**
- Automated GitHub Actions: **not launched by the app-authored PR event**
- Overall release acceptance: **98%**
- Milestone 08-A: **closed and accepted**
- Milestone 08-B: **approved to begin**

## Scope retained

This is a stability-only increment. It does not change movement, combat, collision, enemies, waves, upgrades, arena balance, controls, or visual layout.

## Release identity foundation

- Added `src/release-config.js` as the canonical release-data source.
- Added `src/release.js` as the ES-module adapter used by the game runtime.
- Public release version: `2.8.0-a`.
- Public release label: `v2.8.0-a`.
- Service Worker cache: `one-bullet-arena-v2.8.0-a`.
- Release schema version: `1`.
- Package version matches the canonical release version.
- Menu footer reads the canonical release label.

## Version contracts

- `version` remains the internal combat runtime contract (`2.7.0-feedback`).
- `releaseVersion` identifies the deployed game build (`2.8.0-a`).
- `uiLayoutVersion` identifies the active UI release (`2.8.0-a`).
- The separation prevents UI/release changes from breaking gameplay-contract checks.

## Service Worker stability

- The Service Worker imports the canonical release config instead of containing a handwritten cache version.
- Registration uses `updateViaCache: none`.
- Registration performs an explicit update check.
- A newly activated worker causes at most one safe reload for the current release.
- Same-origin shell requests use network-first delivery with release-cache fallback.
- Activation deletes only obsolete One Bullet Arena caches.
- A `GET_RELEASE_INFO` message handshake is available for diagnostics.
- QA mode exposes `window.__ONE_BULLET_RELEASE__`.

## CI and deployment stability

- Verify and Browser Smoke support manual `workflow_dispatch` execution.
- Deploy GitHub Pages retains manual execution support.
- The Pages artifact validates the existence of release metadata files.
- Deployment validation checks the expected release identifier and Service Worker import.

## Verification and owner acceptance

- Added deterministic tests for canonical release identity, package/runtime/worker consistency, cache consistency, update lifecycle, release handshake, and network-first offline fallback.
- Updated UI and permanent browser assertions for the `2.8.0-a` release.
- Repository diff was reviewed before merge and remained limited to release metadata, Service Worker lifecycle, CI/deployment, tests, and documentation.
- The owner supplied deployed gameplay screenshots covering Waves 2, 7, and 14, multiple arena stages, enemy density, bullet ready/fired states, shield/dash states, wave transition, and upgrade selection.
- The owner explicitly confirmed the game is excellent after the release-stability update.
- No movement, firing, recall, dash, wave progression, or upgrade-selection regression was reported.
- Automated cross-browser CI remains unclaimed because the app-authored PR event did not launch GitHub Actions.

## Next milestone

**Milestone 08-B — Runtime Event Foundation**

This increment will introduce a typed internal event bus and stable game-state contracts for future combat, enemy, wave, audio, feedback, and analytics systems. It must not change visible gameplay behavior. Owner acceptance will again be required before Milestone 08-C begins.
