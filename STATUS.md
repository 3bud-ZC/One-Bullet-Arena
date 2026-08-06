# One Bullet Arena — Status

Last updated: 2026-08-06

## Current milestone

- Milestone: **v2.7 — Combat Feel & Feedback**
- Working branch: `feature/v2.7-combat-feel-feedback`
- Production on `main`: **v2.6.0-visual**
- Current milestone completion: **82%**
- State: **implementation and verification coverage complete; CI and cross-browser visual review remain**

## Product definition retained

The active game still has one path only:

1. Start a run.
2. Defeat every enemy in the wave.
3. Recover the single bullet automatically after the final kill.
4. Choose one in-run upgrade.
5. Enter the next harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

No alternate modes, hubs, currencies, equipment, objectives, puzzles, bosses, story regions, or meta-progression were added.

## Implemented combat-feedback architecture

- Added `src/combat-feedback-runtime.js` above the stable visual, movement-hotfix, polish, and modular game runtimes.
- Activated `OneBulletCombatFeedbackRuntime` from `src/main.js`.
- Runtime identifier: `2.7.0-feedback`.
- Package version: `2.7.0`.
- Service Worker cache: `one-bullet-arena-v2.7.0-feedback`.
- The new layer changes presentation and feedback only; movement, collision, waves, enemy timing, damage, upgrades, and progression remain unchanged.

## Combat impact improvements

- Added deterministic enemy-specific impact profiles for scout, brute, sniper, charger, and splitter enemies.
- Added stronger lethal profiles with more directional sparks, larger shock rings, heavier shake, and slightly longer impact freeze.
- Added directional impact rays based on bullet velocity.
- Added dedicated muzzle-cone feedback on every successful shot.
- Added ricochet spark fans that follow the reflected bullet direction.
- Preserved reduced-motion behavior by suppressing optional camera shake and dash echoes.

## Recall and movement feedback

- Added recall-start rings around the distant bullet.
- Added moving energy packets along the magnetic return tether.
- Added a catch pulse and radial glow when the returning bullet reaches the player.
- Added a distinct long-recall callout for catches from significant distance.
- Added short-lived dash afterimages without changing dash speed, duration, cooldown, or invulnerability.

## HUD and screen feedback

- Added a compact combo-momentum meter with stable rank thresholds:
  - `LOCKED IN` at combo 3;
  - `CHAINED` at combo 5;
  - `RELENTLESS` at combo 8;
  - `OVERDRIVE` at combo 12.
- Added contextual combat callouts for waves, upgrades, long recalls, shields, player damage, and run termination.
- Added shield-hit arcs and directional hull-hit arcs.
- Added damage-edge vignette and a restrained low-health border pulse.
- Added a wave-entry radial sweep.

## Verification coverage added

- Added deterministic unit coverage for:
  - release identifier;
  - lethal versus non-lethal impact scaling;
  - unknown-enemy fallback behavior;
  - combo rank thresholds.
- Updated the browser boot contract for the active v2.7 runtime and all feedback capability flags.
- Added browser coverage for manual recall feedback while preserving bullet mechanics.
- Expanded impact tests to require active feedback events after normal and lethal hits.
- Expanded permanent cross-browser visual review from four to five states per browser:
  - main menu;
  - combat HUD;
  - lethal impact feedback;
  - upgrade cards;
  - game-over report.

## Remaining work

1. Open the Pull Request.
2. Run Verify and Browser Smoke against the branch.
3. Fix any syntax, state, rendering, or cross-browser regression.
4. Inspect all generated screenshots across desktop Chromium, mobile Chromium, Firefox, and WebKit.
5. Merge only after final-head checks remain green.
6. Refresh GitHub Pages and perform owner physical-device acceptance.
