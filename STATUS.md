# One Bullet Arena — Status

Last updated: 2026-08-05

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v2.0.0 — Simple Core Loop Reset**
- Pull Request: **#27**
- Working branch: `feature/simple-core-loop-v2`
- Previous full release preserved at: `archive/v1.4.1-full`
- Repository cleanup commit: `6a05e52ac0a9980328ee5da1978498fe0ea9cc83`
- Current state: **implementation, active-repository cleanup, deterministic verification, Chromium verification, PWA integration, documentation, and desktop/mobile visual review complete; final documentation-commit gates and merge remain**

## Product reset

The active game has returned to one explicit loop:

1. Start one run.
2. Clear the current wave.
3. Recover the single bullet.
4. Choose one of three abilities.
5. Start the next wave.
6. Continue until defeat.

There is no alternate mode or progression route.

## Removed from the active release

- Region and difficulty selection.
- Story Route and Corebreak Protocol.
- Daily Challenge, Endless, Boss Rush, and Contracts.
- Objective Rooms and Guardians.
- Bullet Cores, Relics, Synergies, Overdrive, and combat techniques.
- Command Center, Codices, mastery systems, achievements, cosmetics, and run history.
- Persistent build progression, currencies, and unified backup UI.
- Legacy runtime installers, UI layers, data modules, and their obsolete tests.

The complete v1.4.1 implementation remains available only in the archive branch.

## Active gameplay

- One fixed arena.
- One recoverable bullet.
- Wall and obstacle ricochets.
- Manual recall using `Q` or the mobile Recall button.
- Dash using `Space`, `Shift`, or the mobile Dash button.
- Five enemy archetypes introduced gradually.
- Wave population capped at fourteen enemies.
- Bounded scaling for enemy health, speed, and projectile speed.
- Endless wave progression until player defeat.
- Highest score and highest wave stored locally.

## Upgrade flow

- Every cleared wave enters the upgrade screen.
- The next wave cannot begin until one ability is selected.
- Three unique available abilities are offered.
- Maxed abilities are removed from later selections.
- Thirteen run abilities cover:
  - damage;
  - bullet velocity;
  - ricochets;
  - shock damage;
  - recall;
  - movement;
  - dash cooldown;
  - perfect catches;
  - health;
  - shields;
  - one second chance.
- All selected abilities reset when a new run starts.

## Active runtime and repository

The browser loads only:

- `src/main.js`
- `src/simple-game.js`
- `src/simple-data.js`
- `src/simple-ui-cleanup.js`
- `src/audio.js`
- `simple-game.css`

The service worker caches only the active game shell and uses:

```text
one-bullet-arena-v2.0.0-simple
```

Legacy gameplay source files, legacy CSS layers, old Node tests, and old browser specs have been deleted from the v2 working branch.

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed**.
- Automated deterministic tests: **10/10 passed**.
- Failures, skipped tests, and cancelled tests: **0**.
- Coverage verifies:
  - release version;
  - readable three-enemy first wave;
  - gradual enemy-roster introduction;
  - monotonic capped population growth;
  - bounded enemy scaling;
  - unique run-upgrade catalog;
  - stack normalization;
  - removal of maxed abilities;
  - three unique upgrade choices;
  - empty choices after all abilities are maxed.

### Browser verification

- Playwright Browser Smoke: **12/12 passed**.
- Browsers/viewports:
  - Desktop Chromium at `1440×900`.
  - Mobile Landscape Chromium at `915×412` with touch enabled.
- Failures, flaky tests, and skipped tests: **0**.
- Coverage confirms:
  - only the simple runtime boots;
  - allowed states contain no mode or hub screens;
  - one action starts Wave 1;
  - Wave 1 contains three enemies;
  - clearing a wave forces an upgrade selection;
  - choosing an upgrade starts Wave 2;
  - the document does not scroll;
  - the Canvas remains inside both viewports;
  - no legacy UI stylesheet is loaded.

### Visual QA completed

Reviewed the menu, upgrade selection, and active gameplay on desktop and mobile landscape.

Confirmed:

- the menu contains only Play and How to Play;
- arena geometry is hidden behind menu screens;
- the upgrade screen shows three large readable cards;
- Arabic upgrade levels render as `current level X of Y` rather than reversed slash values;
- the gameplay HUD contains only wave, score, health, bullet, dash, recall, and upgrade count;
- mobile movement, Recall, Dash, and Pause controls remain inside the viewport;
- no old hub, mode selector, objective panel, region banner, or meta-progression UI appears.

## Remaining acceptance checks

These require the merged/deployed build or extended physical play and are not marked complete:

1. Complete several runs through at least Wave 10 using normal player input.
2. Review upgrade balance and repeated-choice variety during long runs.
3. Review enemy pressure and arena readability near the fourteen-enemy cap.
4. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
5. Test installed PWA launch and offline restart with cache v2.0.0.
6. Verify the GitHub Pages deployment after Pull Request #27 is merged.

## Refresh note

The service-worker cache changes from `one-bullet-arena-v1.4.1` to `one-bullet-arena-v2.0.0-simple`. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the previous Corebreak build remains visible.
