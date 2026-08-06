# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.8.0-A — Release & Stability Foundation**
- Pull Request #39: **squash-merged into `main`**
- Release merge commit: `3399d4514063a0e0f859a6082849187101f853e8`
- Implementation: **100% complete**
- Pull Request review: **complete; mergeable and scoped to release plumbing**
- Automated GitHub Actions: **not launched by the app-authored PR event**
- Owner deployed acceptance: **pending**
- Milestone 08-B: **blocked until owner acceptance**

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

## Verification coverage

- Added deterministic tests for:
  - canonical release identity;
  - package/runtime/worker consistency;
  - cache-name consistency;
  - update lifecycle requirements;
  - release handshake;
  - network-first offline fallback.
- Updated UI tests for the `2.8.0-a` release identity.
- Updated permanent browser visual assertions while preserving the combat runtime contract.
- Repository diff was reviewed before merge: 13 changed files, limited to release metadata, Service Worker lifecycle, CI/deployment, tests, and status documentation.
- The execution environment could not clone GitHub because external DNS resolution is unavailable; no unexecuted automated result is claimed.

## Owner acceptance gate

1. Run **Deploy GitHub Pages** manually from the GitHub Actions tab if the site does not update automatically.
2. Open the deployed game normally and confirm the footer displays `v2.8.0-a`.
3. Refresh once normally; the new worker should take control without manually clearing storage.
4. Close and reopen the game while online and verify it starts.
5. After one successful online load, disconnect the network and verify offline startup.
6. Play one desktop run and confirm movement, firing, recall, dash, upgrade selection, and wave progression are unchanged.
7. Report the result before Milestone 08-B begins.
