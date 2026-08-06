# One Bullet Arena — Status

Last updated: 2026-08-06

## Current milestone

- Milestone: **v2.5 — Combat Feel and UI/UX Polish**
- Working branch: `feature/v2.5-combat-ui-polish`
- Current completion: **72%**
- State: **implementation complete for the first integrated pass; automated verification and visual review pending**
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

## Implemented in v2.5 candidate

- Added `src/polish-runtime.js` as a presentation and feedback layer above the stable modular runtime.
- Activated `OneBulletPolishRuntime` as the application runtime.
- Rebuilt the HUD into three compact protected panels.
- Added explicit bullet states: `READY`, `FIRED`, and `RETURNING`.
- Added readable health, dash, recall, enemy-count, score, combo, upgrade-count, and arena-stage information.
- Rebuilt the first-wave tutorial into compact keyboard/touch instruction steps.
- Rebuilt upgrade cards with category icons, current-to-next values, level indicators, and stronger hover hierarchy.
- Added stronger bullet trails, recall tether feedback, muzzle flash, ricochet feedback, and catch feedback.
- Added light hit-stop, impact flash, and controlled screen shake, disabled or reduced under reduced-motion preferences.
- Added distinct death feedback profiles for scout, brute, sniper, charger, and splitter enemies.
- Added `WAVE`, `WAVE CLEARED`, and arena-expansion presentation.
- Refined touch controls with cooldown progress rings and lower visual obstruction.
- Updated release metadata, offline cache, deterministic tests, and browser tests for v2.5.

## Verification added

- Unit coverage for release consistency.
- Unit coverage for bullet HUD states.
- Unit coverage for upgrade visual categories.
- Browser assertions for the polished runtime, compact HUD, and icon/value upgrade cards.
- Browser assertions for hit feedback and the final-enemy wave-clear state.
- Existing combat, progression, WASD, mobile-safe-zone, PWA, cross-browser, and security tests remain required.

## Remaining work

1. Run Verify and Browser Smoke on the Pull Request.
2. Fix any deterministic or cross-browser regression.
3. Review uploaded screenshots at desktop and mobile landscape sizes.
4. Adjust layout if cards, HUD, tutorial, or touch controls overlap.
5. Merge only after all automated checks pass.
6. Perform owner acceptance for feel, readability, and Wave 1–15 balance.
