# One Bullet Arena — Status

Last updated: 2026-08-06

## Current milestone

- Milestone: **v2.7.2 — UI/UX Finishing Pass**
- Working branch: `feature/v2.7.2-ui-ux-finishing`
- Production on `main`: **v2.7.1 — UI Layout Refinement**
- Implementation: **90% complete**
- Remaining: **Pull Request CI, cross-browser screenshot review, final-head verification, merge, and owner acceptance**

## Scope executed

This pass responds directly to the owner's deployed desktop screenshots. It preserves movement, collision, combat balance, enemy behavior, waves, upgrades, progression, and the single-path product definition.

## Interface corrections

- Updated UI release identifier to `2.7.2-ui`.
- Updated package version to `2.7.2`.
- Updated Service Worker cache to `one-bullet-arena-v2.7.2-ui`.
- Corrected the visible menu footer so it displays the active UI release instead of the inherited combat-runtime identifier.
- Kept `2.7.0-feedback` as the internal combat-feedback contract.

## HUD finishing

- Removed the redundant `BULLET SYSTEM`, `RUN STATUS`, and `PILOT STATUS` kicker labels that competed with live information.
- Separated the bullet-state pill from the bullet-location title to prevent the `BULLET / FIRED` collision visible in the screenshot.
- Added deterministic technical copy for `READY`, `FIRED`, and `RETURNING` bullet states.
- Reordered the center statistics as fully English technical HUD text:
  - enemies;
  - score;
  - upgrades;
  - arena stage.
- This avoids browser-dependent bidirectional-number reordering caused by mixed Arabic and English on one canvas line.
- Tightened health and dash alignment while retaining the 62 px panel height and 80 px safe-bottom boundary.

## Menu finishing

- Corrected the product label to `ONE BULLET ARENA`.
- Tightened hero-title spacing, CTA position, feature-card row, statistics row, and footer controls.
- Updated the supporting tagline while keeping the Arabic product title and descriptions.
- Kept the menu Arabic-first and the live technical HUD English-only for stable canvas rendering.

## Verification coverage

- Updated `tests/ui-layout.test.js` to verify:
  - `2.7.2-ui` release identifier;
  - deterministic bullet HUD copy;
  - compact geometry and safe height;
  - equal side panels and non-overlap.
- Updated permanent Playwright visual review to verify:
  - `uiLayoutVersion: 2.7.2-ui`;
  - bidirectional-safe HUD statistics;
  - corrected release label;
  - Arabic-menu / English-technical-HUD language mode;
  - menu, combat HUD, impact, upgrades, and game-over screenshots on every browser project.

## Remaining work

1. Open the Pull Request.
2. Run Verify and Browser Smoke.
3. Fix any syntax, boot, rendering, or cross-browser regression.
4. Inspect generated screenshots on desktop Chromium, mobile Chromium, Firefox, and WebKit.
5. Merge only after final-head checks remain green.
6. Refresh GitHub Pages and confirm `v2.7.2-ui` appears in the menu footer.
