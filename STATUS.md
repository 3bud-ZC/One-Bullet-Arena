# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.7.1 — UI Layout Refinement**
- Pull Request #37: **squash-merged into `main`**
- Release merge commit: `ce87ef95a76a5fa2d82609594ce61e3282176f25`
- UI implementation: **100% complete**
- Desktop deployment and owner visual acceptance: **confirmed**
- Automated verification state: **pending; GitHub Actions did not launch for the app-authored PR/merge events**
- Mobile physical-device acceptance: **pending**
- Overall release acceptance: **98%**

## User-reported problem resolved

The combat HUD occupied too much vertical space and visually covered the upper arena. The previous three panels used 88 px height, several text rows, thick progress bars, and strong glow.

## Released UI architecture

- Added `src/ui-layout-runtime.js` above the stable combat-feedback runtime.
- Activated `OneBulletUiLayoutRuntime` from `src/main.js`.
- UI layout identifier: `2.7.1-ui`.
- Package version: `2.7.1`.
- Service Worker cache: `one-bullet-arena-v2.7.1-ui`.
- Combat runtime identifier remains `2.7.0-feedback`; movement, collision, combat balance, waves, upgrades, and progression were not changed.

## Released HUD improvements

- Reduced each primary HUD panel from 88 px to 62 px.
- Reduced the normal HUD safe-bottom boundary to 80 px.
- Rebuilt the top HUD into three compact tactical panels:
  - bullet state and recall readiness;
  - wave, enemies, score, upgrades, and arena stage;
  - health, shield state, and dash readiness.
- Replaced large side accent bars with restrained top accents.
- Reduced panel glow, internal padding, progress-bar thickness, and secondary-text size.
- Compressed secondary run information into one line while preserving the main wave and health hierarchy.
- Added responsive deterministic panel geometry with equal side widths and consistent gaps.

## Released contextual UI improvements

- Replaced the wide three-step tutorial with one compact instruction at a time.
- Reduced the combo meter to a 23 px strip.
- Suppressed the combo strip while the first-wave tutorial is active.
- Reduced feedback-callout dimensions and prevented tutorial/callout overlap.
- Preserved desktop and mobile-landscape controls.

## Owner acceptance evidence

- The owner opened and played the deployed game after refreshing the release.
- Desktop screenshots confirmed the updated main menu and the compact combat HUD during Wave 3.
- The arena remained visible below the HUD without the previous large upper obstruction.
- The owner explicitly approved the changes and reported that the game and visual changes were enjoyable.

## Verification coverage included

- Added `tests/ui-layout.test.js` for:
  - UI release identifier;
  - HUD height and safe-bottom target;
  - equal side-panel widths;
  - deterministic gaps;
  - non-overlap at desktop and narrower logical widths.
- Added `src/ui-layout-runtime.js` to JavaScript syntax verification.
- Updated the permanent Playwright visual-review test to assert:
  - `uiLayoutVersion: 2.7.1-ui`;
  - `hudLayoutRevision: compact-safe-zone-hud`;
  - `hudPanelHeight: 62`;
  - `hudSafeBottom: 80`;
  - reduced glow and compact tutorial flags.

## Remaining acceptance

1. Run GitHub Actions manually if automated CI confirmation is required.
2. Perform one physical mobile-landscape playtest and confirm the HUD and touch controls remain readable.
