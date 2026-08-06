# One Bullet Arena — Status

Last updated: 2026-08-06

## Current milestone

- Milestone: **v2.5 — Combat Feel and UI/UX Polish**
- Working branch: `feature/v2.5-combat-ui-polish`
- Pull Request: **#33**
- Current completion: **94%**
- State: **implementation, automated verification, and cross-browser visual review complete; merge and owner acceptance remain**
- Production on `main`: **v2.4.1-controls**
- Candidate release: **v2.5.0-polish**

## Product definition retained

The active game still has one path only:

1. Start a run.
2. Defeat every enemy in the wave.
3. Recover the single bullet automatically after the final kill.
4. Choose one in-run upgrade.
5. Enter the next harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

No alternate modes, hubs, currencies, equipment, objectives, puzzles, bosses, story regions, or meta-progression were added.

## Implemented in v2.5

- Added `src/polish-runtime.js` as a presentation and feedback layer above the stable modular runtime.
- Activated `OneBulletPolishRuntime` as the application runtime.
- Rebuilt the HUD into three compact protected panels.
- Added explicit bullet states: `READY`, `FIRED`, and `RETURNING`.
- Added readable health, dash, recall, enemy-count, score, combo, upgrade-count, and arena-stage information.
- Rebuilt the first-wave tutorial into compact keyboard and touch instruction steps.
- Rebuilt upgrade cards with category icons, current-to-next values, level indicators, and stronger hover hierarchy.
- Added stronger bullet trails, recall tether feedback, muzzle flash, ricochet feedback, and catch feedback.
- Added light hit-stop, impact flash, and controlled screen shake, disabled or reduced under reduced-motion preferences.
- Added distinct death feedback profiles for scout, brute, sniper, charger, and splitter enemies.
- Added `WAVE`, `WAVE CLEARED`, and arena-expansion presentation.
- Refined touch controls with cooldown progress rings and lower visual obstruction.
- Updated release metadata, offline cache, deterministic tests, browser tests, and permanent visual-review captures.

## Verification results

- Verify workflow run **642**: **passed**.
- Browser Smoke workflow run **126**: **passed**.
- Playwright: **48/48 passed**.
- Unexpected failures: **0**.
- Flaky tests: **0**.
- Skipped tests: **0**.
- Browser projects:
  - Desktop Chromium.
  - Mobile Landscape Chromium.
  - Desktop Firefox.
  - Desktop WebKit.
- Permanent review captures generated: **12**.
  - Main menu.
  - Combat HUD and first-wave tutorial.
  - Upgrade-selection cards.
  - All three states captured on every browser project.

## Visual review findings

- HUD panels remain inside the canvas and do not overlap one another.
- The combat arena remains visible below the protected HUD and tutorial areas.
- Mobile joystick and action controls remain outside the main combat focus area.
- Upgrade cards remain readable and fully contained at desktop and mobile-landscape sizes.
- Arabic text, icons, card borders, and status bars render consistently on Chromium, Firefox, and WebKit.
- No blocking visual regression was found.

## Remaining acceptance

1. Merge Pull Request #33 into `main`.
2. Verify the deployed GitHub Pages build receives the new Service Worker cache.
3. Owner playtest for combat feel, readability, and Wave 1–15 balance on a physical desktop and mobile device.
