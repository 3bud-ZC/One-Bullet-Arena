# One Bullet Arena — Status

Last updated: 2026-08-05

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current release: **v1.4.0 — Runtime Kernel & Objective Rooms**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- Combat & Mobile Expansion: **merged through Pull Requests #20–#22**
- Regional Map Overhaul: **merged through Pull Request #23**
- Mobile & Browser UI Stabilization: **merged through Pull Request #24**
- v1.4.0 Runtime Kernel & Objective Rooms: **squash-merged through Pull Request #25**
- v1.4.0 merge commit: `04cc044fdf22cbc3cea5c119c205b6cbdfd07aa7`
- GitHub Pages deployment: **triggered by the Pull Request #25 merge and this status update**
- Current state: **implementation, deterministic verification, Chromium browser verification, containment checks, screenshot review, documentation, and merge complete; deployed-build acceptance and physical-device acceptance remain**

## v1.4.0 delivered

### Centralized Runtime Kernel foundation

- Added one outer runtime lifecycle pipeline for all new systems and incremental migration of older systems.
- Runtime systems register with stable IDs and deterministic priority ordering.
- Added lifecycle hooks covering:
  - run reset, start, and finish;
  - wave start and wave advancement;
  - boss start;
  - update and rendering;
  - arena rendering;
  - bullet fire, catch, and ricochet;
  - enemy kills;
  - player damage.
- Added cancellable lifecycle gates. Objective Rooms use the wave-advancement gate to stop the upgrade screen until the room objective is complete.
- Added per-system runtime state, cleanup callbacks, recent-event diagnostics, and isolated error reporting.
- A failing runtime system is recorded without preventing later registered systems from executing.
- The QA route exposes `game.runtime.snapshot()` for registered-system, event, and error inspection.

### First architecture migration

- Migrated the final mobile visual-cleanup layer away from another direct `prototype.draw` wrapper.
- Legacy technique suppression now runs in `beforeRender` and restores Canvas state through a cleanup callback.
- Terminal-screen and mobile-notice finalization now run in `afterRender`.
- Existing production installers remain connected to avoid a risky full rewrite.
- Future systems must use the Runtime Kernel; older wrappers can be migrated incrementally behind the existing test gates.

### Five Objective Room types

1. **Circuit Sequence — تسلسل الدائرة**
   - Strike arena relays in the required order.
   - Incorrect relay hits show direct feedback without resetting completed progress.
   - The advanced wave-seven version contains four relays.

2. **Ricochet Lock — قفل الارتداد**
   - Hit a moving lock only after reaching the required bullet-bounce count.
   - Required bounces and hit count scale with the local regional wave.

3. **Core Defense — دفاع النواة**
   - Protect a central Core until its stabilization timer completes.
   - Assault enemies pressure the Core instead of only chasing the player.
   - Core damage adds a time penalty and score penalty without creating an unrecoverable room.

4. **Marked Hunt — مطاردة الهدف**
   - Eliminate highlighted enemies in the required sequence.
   - Killing an unmarked enemy applies a small score penalty and preserves the active target.

5. **Bullet Separation — فصل الطلقة**
   - Keep the single bullet outside a minimum distance from the player for the required duration.
   - Progress decays gradually when the bullet is caught or returns too close.

### Deterministic regional schedule

Each eight-wave regional cycle uses the following room structure:

- Wave 1: standard onboarding combat with no extra objective.
- Wave 2: Circuit Sequence.
- Wave 3: Ricochet Lock.
- Wave 4: Core Defense.
- Wave 5: Marked Hunt.
- Wave 6: Bullet Separation.
- Wave 7: advanced Circuit Sequence.
- Wave 8: regional lockdown combat without an extra objective.

Story mode resets this schedule when entering the next region, so Neon, Forge, and Void each introduce their objectives progressively.

### Objective integration

- Objectives initialize after the existing region, wave-composition, map, and hazard systems finish preparing the wave.
- Objective points are repositioned away from blocking arena geometry.
- Active objectives keep deterministic combat pressure when the normal enemy group is cleared early.
- Reinforcement type and Elite promotion no longer depend on `Math.random`.
- Objective completion grants a wave-scaled score reward and records run-level objective counters.
- Boss encounters clear active objective state.
- Wave upgrades remain blocked until the active objective reports `complete`.
- Objective instructions reuse the existing wave banner once; the compact objective panel appears after that banner clears.
- Objective progress uses explicit left-to-right numeric rendering inside the Arabic interface.

### Mobile and browser presentation

- Objective HUD is centered below the three compact mobile top panels.
- The panel remains outside the movement stick and action-button clusters.
- Objective world elements use readable color, glow, numbering, and target markers.
- Stable screenshots confirm `0 / 3` rather than an RTL-reversed value.
- No duplicate objective description or overlapping bullet-status panel remains.

### Offline integration

- Package version advanced to **1.4.0**.
- Service-worker cache advanced to `one-bullet-arena-v1.4.0`.
- Runtime Kernel, Objective Room data, and Objective Room runtime modules are included in the offline application shell.
- Browser release gates verify that the new assets are reachable.

## Gameplay retained

- Twenty-four regional arena identities remain active.
- Regional missions remain eight waves and story runs remain twenty-four waves.
- Progressive hazards, moving geometry, relays, fields, combat techniques, Overdrive, Relics, Synergies, regional enemies, Evolutions, three Guardians, Endless, Boss Rush, Core Contracts, Gamepad, unified save, PWA, and offline support remain connected.

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed** for every runtime module, service worker, and Playwright configuration.
- Automated deterministic tests: **131/131 passed**.
- Failures: **0**.
- Final Verify workflow on the Pull Request #25 documentation/status commit: **passed**.
- New Runtime Kernel coverage verifies:
  - stable priority ordering;
  - duplicate-system rejection;
  - progression cancellation;
  - render cleanup ordering;
  - failure isolation and diagnostics;
  - lifecycle coverage metadata.
- New Objective Room coverage verifies:
  - five unique Arabic room definitions;
  - safe first and final local waves;
  - schedule reset across all three story regions;
  - progressive objective pressure;
  - cloned regional points;
  - mechanic-specific room state.

### Browser verification

- Playwright Browser Smoke: **26/26 passed** on Desktop Chromium and Mobile Landscape Chromium.
- Failures, flaky tests, and skipped tests: **0**.
- Final Browser Smoke workflow on the Pull Request #25 documentation/status commit: **passed**.
- Coverage confirms:
  - Runtime Kernel availability and registered systems;
  - zero runtime diagnostic errors;
  - real wave-two Circuit Sequence creation;
  - active objective state and three live relays;
  - blocked wave advancement before completion;
  - successful upgrade transition after completion;
  - desktop and mobile objective containment;
  - existing direct route, menu, command center, Core Hub, gameplay, result screen, viewport matrix, and PWA gates remain operational.

### Visual QA completed

- Reviewed the stable wave-two objective on Desktop Chromium.
- Reviewed the same room on Mobile Landscape Chromium.
- Confirmed:
  - the objective panel appears after the wave-introduction banner;
  - the objective instruction is not duplicated;
  - the panel does not overlap bullet, Core, region, health, score, or wave HUD panels;
  - numeric progress reads `0 / 3`;
  - all three world relays remain readable;
  - touch controls and objective elements remain inside the viewport.

## Remaining live acceptance checks

These require the deployed build, extended play, or physical hardware and are not marked complete:

1. Complete every Objective Room type through normal player input rather than QA state setup.
2. Review Core Defense duration, Core health, reinforcement pressure, and recovery penalties in waves 4 and 12.
3. Review Ricochet Lock bounce requirements with all five Bullet Cores.
4. Review Marked Hunt visibility during high enemy density and Evolutions.
5. Review Bullet Separation with Recall Core and magnetic-recall upgrades.
6. Complete an eight-wave regional mission and a twenty-four-wave story run with objective gating enabled.
7. Test the deployed GitHub Pages build after deployment completes.
8. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
9. Test installed PWA launch and offline restart using cache v1.4.0.
10. Continue migrating older direct prototype wrappers into Runtime Kernel systems in later architecture milestones.

## Live refresh note

The service-worker cache advances from v1.3.1 to v1.4.0. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the previous gameplay build remains visible.
