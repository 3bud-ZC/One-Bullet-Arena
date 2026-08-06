# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Milestone: **v2.8.0-A — Release & Stability Foundation**
- Working branch: `feature/v2.8.0-a-release-stability`
- Production on `main`: **v2.7.2 — UI/UX Finishing Pass**
- Implementation: **100% complete**
- Pull Request: **pending**
- Automated GitHub Actions: **pending PR/manual execution**
- Owner acceptance: **pending after merge and deployment**

## Scope

This is a stability-only increment. It does not change movement, combat, collision, enemies, waves, upgrades, arena balance, controls, or visual layout.

## Release identity foundation

- Added `src/release-config.js` as the canonical release-data source.
- Added `src/release.js` as the ES-module adapter used by the game runtime.
- Public release version: `2.8.0-a`.
- Public release label: `v2.8.0-a`.
- Service Worker cache: `one-bullet-arena-v2.8.0-a`.
- Release schema version: `1`.
- Package version now matches the canonical release version.
- Menu footer now reads the canonical release label.

## Version contracts

- `version` remains the internal combat runtime contract (`2.7.0-feedback`).
- `releaseVersion` identifies the deployed game build (`2.8.0-a`).
- `uiLayoutVersion` identifies the active UI release (`2.8.0-a`).
- This separation prevents UI releases from breaking gameplay-contract tests.

## Service Worker stability

- The Service Worker imports the canonical release config instead of containing a handwritten cache version.
- Added `updateViaCache: none` during registration.
- Added an explicit `registration.update()` check.
- Added one-time reload handling when a newly activated worker takes control.
- Changed same-origin shell requests to network-first with release-cache fallback.
- Old One Bullet Arena caches are deleted during activation while unrelated caches remain untouched.
- Added a `GET_RELEASE_INFO` message handshake for diagnostics.
- QA mode exposes `window.__ONE_BULLET_RELEASE__`.

## CI and deployment stability

- Added `workflow_dispatch` to Verify and Browser Smoke workflows.
- Kept manual deployment support in Deploy GitHub Pages.
- Pages artifact validation now checks that release metadata files exist.
- Deployment validation checks the expected release identifier and Service Worker release import.

## Verification coverage

- Added `tests/release.test.js` for:
  - canonical release identity;
  - package/runtime/worker consistency;
  - cache-name consistency;
  - update lifecycle requirements;
  - release handshake;
  - network-first offline fallback.
- Updated UI tests for the `2.8.0-a` release identity.
- Updated permanent browser visual assertions for release metadata while retaining the combat runtime contract.
- The execution environment could not clone GitHub because external DNS resolution is unavailable; no unexecuted CI result is claimed.

## Owner acceptance after merge

1. Open the deployed game normally and confirm the footer displays `v2.8.0-a`.
2. Refresh once normally; the new worker should take control without requiring manual storage clearing.
3. Close and reopen the game while online and verify it still starts.
4. Disconnect the network after one successful load, reopen the page, and verify offline startup.
5. Play one desktop run and confirm movement, firing, recall, dash, upgrade selection, and wave progression are unchanged.
6. Report the result before Milestone 08-B begins.
