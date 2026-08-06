# One Bullet Arena — Status

Last updated: 2026-08-06

## Current milestone

- Milestone: **v2.7.1 — UI Layout Refinement**
- Working branch: `feature/v2.7.1-ui-layout-refinement`
- Production on `main`: **v2.7.0-feedback**
- Milestone implementation: **85% complete**
- Remaining: **CI, cross-browser screenshot review, final-head verification, merge, and owner device acceptance**

## User-reported problem

The combat HUD occupied too much vertical space and visually covered the upper arena. The three panels used 88 px height, several text rows, thick progress bars, and strong glow, which reduced playable visibility and made the information hierarchy feel crowded.

## Implemented UI architecture

- Added `src/ui-layout-runtime.js` above the stable combat-feedback runtime.
- Activated `OneBulletUiLayoutRuntime` from `src/main.js`.
- UI layout identifier: `2.7.1-ui`.
- Package version: `2.7.1`.
- Service Worker cache: `one-bullet-arena-v2.7.1-ui`.
- Combat runtime identifier remains `2.7.0-feedback` so the patch changes presentation only.

## HUD improvements

- Reduced each primary HUD panel from 88 px to 62 px.
- Reduced the normal HUD safe-bottom boundary to 80 px.
- Rebuilt the top HUD as three compact tactical panels:
  - bullet state and recall readiness;
  - wave, enemies, score, upgrades, and arena stage;
  - health, shield state, and dash readiness.
- Replaced the large left accent bars with restrained top accents.
- Reduced panel glow, internal padding, progress-bar thickness, and secondary-text size.
- Kept high-priority information visually dominant while compressing secondary data into one line.
- Added deterministic panel geometry with equal side widths and consistent gaps.

## Contextual interface improvements

- Replaced the wide three-step tutorial panel with one compact contextual instruction at a time.
- Reduced the combo meter to a 23 px strip and suppressed it while the first-wave tutorial is active.
- Reduced combat callout dimensions and prevented tutorial/callout overlap.
- Kept desktop and mobile-landscape controls, movement behavior, collision, combat balance, waves, upgrades, and progression unchanged.

## Verification coverage

- Added `tests/ui-layout.test.js` for:
  - UI release identifier;
  - maximum HUD height and safe-bottom target;
  - equal side-panel widths;
  - deterministic panel gaps;
  - non-overlap on desktop and narrower logical widths.
- Added the UI runtime to JavaScript syntax verification.
- Existing browser smoke and visual-review suites remain active and will validate the new runtime across Chromium, mobile Chromium, Firefox, and WebKit.

## Remaining work

1. Open the Pull Request.
2. Run Verify and Browser Smoke.
3. Fix any syntax, boot, layout, or rendering regression.
4. Inspect combat-HUD screenshots on all four browser projects.
5. Merge only after final-head checks remain green.
6. Refresh GitHub Pages and perform owner desktop/mobile acceptance.
