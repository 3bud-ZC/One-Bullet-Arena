# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current release: **v1.2.0 — Combat & Mobile Expansion**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- v1.2.0 expansion: **squash-merged through Pull Request #20**
- Merge commit: `84a4d822f35ccda977b3ff1e360861a3f40518e8`
- GitHub Pages deployment: **triggered by the PR #20 merge and this status update**
- Current state: **implementation, deterministic verification, browser verification, phone viewport matrix, and screenshot review complete; live owner and physical-device acceptance remains**

## v1.2.0 delivered

### Direct public game URL

- Removed the external website header, title block, source-code link, build badge, toolbar, and footer instructions from the public route.
- The GitHub Pages URL now opens directly into the game canvas.
- Preserved hidden accessibility and fullscreen hooks required by the existing runtime.
- Added a dedicated full-viewport shell using dynamic viewport units and safe-area insets.
- Prevented document scrolling, overscroll, text selection, touch callouts, and accidental browser zoom inside the game surface.
- Preserved the internal 16:9 game aspect ratio without stretching or cropping.

### Longer runs

- Regional missions increased from **5 to 8 waves**.
- Story runs increased from **12 to 24 waves**.
- Story progression now dedicates eight waves to each region:
  - waves 1–8: Neon;
  - waves 9–16: Reactor Forge;
  - waves 17–24: Void Circuit.
- Daily runs remain five waves to preserve their compact repeatable format.
- Added denser assault compositions and reinforcement pressure in waves 6–8.
- Boss thresholds and HUD wave counters use the expanded mission targets.

### Active combat techniques

- Added **Kinetic Pulse**:
  - damages and pushes nearby enemies;
  - destroys nearby enemy projectiles;
  - applies limited Guardian damage;
  - gains shield and range improvements at higher technique tiers.
- Added **Phase Shift**:
  - swaps the player with the free bullet;
  - performs a directional blink while the bullet is held;
  - grants a short invulnerability window;
  - gains shield protection at higher technique tiers.
- Desktop controls:
  - `R`: Kinetic Pulse;
  - `C`: Phase Shift.
- Added dedicated touch buttons for both techniques with mirrored left-handed layouts.
- Added three technique tiers unlocked through longer regional progression.
- Tier three technique use contributes to Overdrive charging.

### Enemy evolution system

- Added four deterministic combat evolutions for eligible later-wave enemies:
  - **Armored Shell:** absorbs the first direct bullet impact;
  - **Blink Drive:** relocates periodically around the player;
  - **Volatile Core:** explodes on death and affects nearby units;
  - **Rage Engine:** accelerates below half health.
- Evolutions exclude early-wave, mini, and Elite enemies to avoid stacking unreadable modifiers.
- Added distinct rings, icons, telegraphs, floating text, and impact effects for each evolution.

### Dynamic regional map mutators

- Neon:
  - moving Laser Sweep;
  - periodic Pulse Gates.
- Reactor Forge:
  - alternating Heat Cycle;
  - moving Piston Line.
- Void Circuit:
  - alternating Gravity Tide;
  - Rift Storm that changes bullet trajectory.
- Mutators rotate deterministically by local regional wave.
- Added visible telegraphs and performance-safe effects for every mutator.

### Mobile browser stabilization

- Removed the obsolete 42-pixel toolbar reservation from the direct mobile shell.
- Gameplay now uses the complete available landscape height.
- Preserved safe areas for notches, rounded corners, and system gesture regions.
- Added automated landscape checks at:
  - 740×360;
  - 844×390;
  - 873×393;
  - 915×412;
  - 932×430.
- Added portrait orientation gating instead of rendering a clipped game.
- Verified touch controls, technique buttons, HUD panels, direct shell containment, and zero document overflow in Chromium mobile emulation.
- Very wide displays may retain side letterboxing to preserve the correct 16:9 game geometry.

### UI and announcement fixes

- Updated visible menu copy to **v1.2.0**.
- Prevented active-technique notices from overlapping major region or challenge announcements.
- Kept one primary combat announcement visible at a time.
- Retained the compact edge HUD and removed all external page chrome.

### Offline integration

- Package version advanced to **1.2.0**.
- Service-worker cache advanced to `one-bullet-arena-v1.2.0`.
- Direct-shell styles and all v1.2 runtime/data modules are included in the offline application shell.

## Final verification

### Deterministic verification

- JavaScript syntax checks: **passed** for all runtime modules, Playwright configuration, and service worker.
- Automated deterministic tests: **102/102 passed**.
- Failures: **0**.
- Final Verify workflow on the Pull Request #20 status commit: **passed**.
- Coverage includes:
  - expanded mission lengths;
  - story region transitions;
  - eight regional compositions;
  - combat technique cooldowns and tiers;
  - deterministic enemy evolutions;
  - map-mutator rotation;
  - left-handed mobile technique layout.

### Browser verification

- Playwright Browser Smoke: **14/14 passed**.
- Final Browser Smoke workflow on the Pull Request #20 status commit: **passed**.
- Desktop Chromium coverage includes:
  - direct full-viewport route;
  - menu, Command Center, and Core Hub navigation;
  - real gameplay entry;
  - both combat techniques;
  - expanded HUD and map-mutator rendering;
  - zero document overflow.
- Mobile landscape coverage includes:
  - full-height gameplay;
  - direct-shell containment;
  - touch-enabled HUD and ability controls;
  - the five-size phone viewport matrix;
  - portrait orientation gate;
  - PWA and service-worker assets.

## Visual QA completed

- The first browser run exposed a remaining legacy 42-pixel mobile toolbar subtraction and a possible technique/banner overlap.
- Both defects were fixed before merge.
- Final desktop and mobile screenshots confirm:
  - no external page header, source link, build badge, or footer;
  - direct game-only presentation;
  - full-height mobile landscape gameplay;
  - contained movement, dash, recall, Overdrive, build, pause, and new technique controls;
  - readable compact HUD;
  - visible map mutators;
  - one major announcement at a time;
  - no previous black bottom strip or document scrolling.

## Remaining live acceptance checks

These require physical hardware or extended owner play and are not represented as completed automated verification:

1. Review the deployed v1.2.0 GitHub Pages build after deployment completes.
2. Test Chrome Android and Samsung Internet on physical phones.
3. Test Safari iOS landscape, including address-bar collapse and safe-area behavior.
4. Test the installed PWA after an offline restart.
5. Test a physical Gamepad alongside the two new keyboard techniques.
6. Complete an eight-wave regional mission and a twenty-four-wave Story run.
7. Review late-wave balance, enemy evolution frequency, map-mutator damage, and technique cooldowns.
8. Confirm touch-control comfort on at least one small and one large physical phone.

## Live refresh note

The service-worker cache advances from v1.0.1 to v1.2.0. If the previous page shell or interface remains visible, use a hard refresh on desktop or clear the site's stored data on mobile before reopening the game.
