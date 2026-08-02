# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current release: **v1.2.2 — Clean Mobile Shell**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- v1.2.0 Combat & Mobile Expansion: **squash-merged through Pull Request #20**
- v1.2.1 Progressive Hazard Hotfix: **squash-merged through Pull Request #21**
- v1.2.2 Clean Mobile Shell: **squash-merged through Pull Request #22**
- v1.2.2 merge commit: `e9a55e23c532fefeb7b10f8e51f85a35622b9020`
- GitHub Pages deployment: **triggered by the Pull Request #22 merge and this status update**
- Current state: **implementation, deterministic verification, browser verification, and viewport checks complete; deployed-build and physical-device acceptance remain**

## v1.2.2 delivered

### Public route cleanup

- Removed the phone-orientation instruction panel from the document.
- Removed the visible `جاهز للعب` status from the public game surface.
- Removed the visible fullscreen button from the public game surface.
- Fullscreen remains available internally through the settings screen and the `F` keyboard shortcut.
- Removed the obsolete 42-pixel mobile toolbar row and every related canvas-height subtraction.
- The public route now renders only the game canvas and its internal game UI.

### Mobile and portrait behavior

- Landscape mobile keeps the full available viewport height.
- Portrait no longer hides the game behind an orientation warning.
- The canvas remains centered, contained, scroll-free, and proportional in portrait and landscape.
- Safe-area handling for notches, rounded corners, and system gesture regions remains enabled.
- External status, orientation, and fullscreen chrome is forced hidden by the final public-shell stylesheet.

### Offline integration

- Package version advanced to **1.2.2**.
- Visible in-game release label advanced to **v1.2.2**.
- Service-worker cache advanced to `one-bullet-arena-v1.2.2`.
- Updated HTML and mobile shell styles are included in the offline application shell.

## Gameplay retained

- Regional missions contain **8 waves**.
- Story runs contain **24 waves**, with eight waves per region.
- Environmental hazards remain progressive:
  - wave 1 safe;
  - wave 2 preview-only;
  - wave 3 first active hazard;
  - waves 4–8 progressively stronger.
- Kinetic Pulse, Phase Shift, Overdrive, Relics, Synergies, regional enemies, three Guardians, Endless, Boss Rush, Core Contracts, PWA, Gamepad, and unified save remain intact.

## Final verification

### Deterministic verification

- JavaScript syntax checks: **passed**.
- Automated deterministic tests: **106/106 passed**.
- Failures: **0**.
- Final Verify workflow for Pull Request #22: **passed**.

### Browser verification

- Playwright Browser Smoke: **14/14 passed**.
- Final Browser Smoke workflow for Pull Request #22: **passed**.
- Coverage confirms:
  - no orientation panel in the document;
  - fullscreen and status controls are never visible;
  - clean desktop game-only route;
  - clean mobile-landscape route across five phone sizes;
  - clean contained portrait route;
  - zero document overflow;
  - gameplay entry and combat techniques;
  - PWA manifest and `v1.2.2` service-worker cache.

## Remaining live acceptance checks

1. Review the deployed v1.2.2 GitHub Pages build after deployment completes.
2. Confirm no top status or orientation text appears on the physical phone used for the original report.
3. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
4. Test the installed PWA after an offline restart.
5. Continue late-wave gameplay and balance review.

## Live refresh note

The service-worker cache advances from v1.2.1 to v1.2.2. If either removed element remains visible, perform a hard refresh on desktop or clear the site's stored data on mobile before reopening the game.
