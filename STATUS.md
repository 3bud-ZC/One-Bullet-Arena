# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.5.0-polish — Combat Feel and UI/UX Polish**
- Pull Request #33: **squash-merged into `main`**
- Release merge commit: `398ca2e6ee1bfc43278b1b826a8e9000256b043f`
- Code implementation: **100% complete**
- Automated verification: **100% complete**
- Cross-browser visual review: **100% complete**
- Overall release acceptance: **97%**
- Remaining: **deployed GitHub Pages confirmation and owner physical-device playtest**

## Product definition retained

The active game still has one path only:

1. Start a run.
2. Defeat every enemy in the wave.
3. Recover the single bullet automatically after the final kill.
4. Choose one in-run upgrade.
5. Enter the next harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

No alternate modes, hubs, currencies, equipment, objectives, puzzles, bosses, story regions, or meta-progression were added.

## Released in v2.5

- Added `src/polish-runtime.js` as a presentation and combat-feedback layer above the stable modular runtime.
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
- Updated release metadata and the Service Worker cache to `one-bullet-arena-v2.5.0-polish`.
- Added permanent visual-review captures to the browser test suite.

## Verification results

- Final Verify workflow run **644**: **passed**.
- Final Browser Smoke workflow run **127**: **passed**.
- Playwright: **48/48 passed**.
- Unexpected failures: **0**.
- Flaky tests: **0**.
- Skipped tests: **0**.
- Browser projects:
  - Desktop Chromium.
  - Mobile Landscape Chromium.
  - Desktop Firefox.
  - Desktop WebKit.
- Permanent review captures generated and inspected: **12**.
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

## Remaining owner acceptance

1. Open the GitHub Pages game and confirm the footer displays `v2.5.0-polish`.
2. Hard-refresh or clear site data if the old Service Worker remains active.
3. Test desktop controls and combat feedback through Wave 15.
4. Test mobile landscape controls, card readability, and combat-space visibility on a physical device.
5. Report any balance, readability, animation, or input issue with the wave number and device/browser.
