# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Release candidate: **v1.3.1 — Mobile & Browser UI Stabilization**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- Combat & Mobile Expansion: **merged through Pull Requests #20–#22**
- Regional Map Overhaul: **merged through Pull Request #23**
- v1.3.1 Mobile & Browser UI Stabilization: **implemented in Pull Request #24; final merge pending release gates**
- Current state: **implementation, deterministic tests, Chromium browser tests, viewport checks, and screenshot review complete; deployed-build and physical-device acceptance remain**

## v1.3.1 delivered

### Compact mobile HUD

- Replaced the oversized inherited mobile HUD with three compact top panels.
- Bullet and dash status remain on the upper left.
- Core and Overdrive charge remain in the upper center.
- Region, difficulty, health, score, and wave progress remain on the upper right.
- Wave progress is forced to the unambiguous `current / total` order, such as `1 / 8`.
- Combo and challenge feedback use short temporary strips instead of large permanent panels.
- Opaque final redraws prevent ghost or duplicate HUD panels from older UI layers.

### Touch-control rebuild

- Added a final capture-phase touch-input layer so one touch activates only one intended action.
- Rebuilt the compact action cluster for:
  - Dash;
  - bullet recall;
  - Kinetic Pulse;
  - Phase Shift;
  - Overdrive;
  - pause;
  - Build Inspector.
- Reduced the movement-stick footprint and kept its floating origin inside safe bounds.
- Right-handed and left-handed layouts remain mirrored and supported.
- Removed old technique-circle artifacts at their drawing source instead of masking them with black overlays.
- Kept aim-on-release, multi-touch movement and aiming, haptics, control scale, and opacity settings connected.

### Responsive result screen

- Rebuilt victory and defeat screens into a contained 1280×720 layout.
- All eight performance statistics remain visible.
- Rank, active core, rewards, current balance, and challenge result remain visible.
- Replay, Core Hub, and Main Menu actions remain fully inside the canvas on short browser and phone-landscape viewports.
- Terminal screens receive a final opaque redraw so map introductions, combat overlays, or technique notices cannot appear above the result UI.

### Browser and safe-area handling

- Added final `visualViewport` width and height synchronization.
- Added short-browser and touch-device compact-mode detection.
- Added final `100dvh`, iOS, notch, rounded-corner, and gesture-area containment rules.
- The public route remains fixed, scroll-free, and game-only.
- Canvas containment remains proportional without horizontal or vertical overflow.

### Offline integration

- Package version advanced to **1.3.1**.
- Service-worker cache advanced to `one-bullet-arena-v1.3.1`.
- Mobile UI stylesheet, loader, runtime, and visual cleanup modules are included in the offline application shell.

## Gameplay retained

- Twenty-four regional arena identities remain active.
- Regional missions remain eight waves and story runs remain twenty-four waves.
- Progressive hazards, moving geometry, relays, fields, combat techniques, Overdrive, Relics, Synergies, regional enemies, Evolutions, three Guardians, Endless, Boss Rush, Core Contracts, Gamepad, unified save, PWA, and offline support remain connected.

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed** for every runtime module, service worker, and Playwright configuration.
- Automated deterministic tests: **120/120 passed**.
- Failures: **0**.
- New coverage verifies:
  - current-first mobile wave progress;
  - all touch controls remain inside 1280×720;
  - left-handed mirroring;
  - compact result containment;
  - short and touch viewport classification.

### Browser verification

- Playwright Browser Smoke: **18/18 passed** on Desktop Chromium and Mobile Landscape Chromium.
- Coverage confirms:
  - no document overflow;
  - full canvas containment;
  - clean direct public route;
  - five phone-landscape viewport sizes;
  - clean portrait containment;
  - real gameplay entry;
  - compact mobile HUD and controls;
  - compact result screen and working result actions;
  - reachable v1.3.1 PWA and mobile UI assets.

### Visual QA completed

- Reviewed Desktop and Mobile Landscape gameplay screenshots.
- Reviewed Desktop and Mobile Landscape result screenshots.
- Confirmed:
  - wave order is `1 / 8`, not `8 / 1`;
  - no duplicate top-right wave panel;
  - no black circles behind technique controls;
  - touch controls remain inside the phone viewport;
  - result buttons are fully visible;
  - no map title or combat overlay appears above terminal screens.

## Remaining live acceptance checks

These require the deployed build or physical hardware and are not marked complete:

1. Review the deployed GitHub Pages build after deployment completes.
2. Test the exact physical phone and browser used for the original screenshots.
3. Test Chrome Android, Samsung Internet, and Safari iOS.
4. Verify multi-touch movement, aiming, and every action button on physical hardware.
5. Test browser toolbar expansion and collapse during gameplay.
6. Test installed PWA launch and offline restart.
7. Continue late-wave performance and balance review.

## Live refresh note

The service-worker cache advances from v1.3.0 to v1.3.1. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the old HUD or result screen remains visible.
