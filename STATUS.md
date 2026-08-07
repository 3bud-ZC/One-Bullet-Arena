# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Milestone: **v3.4.0 — Combat Feel & Game Juice**
- Working branch: `feature/v3.4.0-combat-juice`
- Base branch: `feature/v3.3.0-visual-overhaul`
- Parent PR: **#45 — v3.3.0 Cinematic Visual Overhaul, still awaiting owner merge acceptance**
- v3.4 release identity: **not locked yet; feature verification first**
- Implementation: **feature-complete pending automated/browser verification**
- Gameplay geometry changed: **no**
- Collision geometry changed: **no**
- Enemy/player speed changed: **no**
- Damage/progression values changed by v3.4: **no**
- Checkpoint schema changed: **no**

## v3.4 combat-juice implementation

Added `src/core/combat-juice-runtime.js` above the accepted v3.3 visual runtime.

Delivered feedback layers:

1. directional fire-wave impulse around the player and bullet launch vector;
2. deterministic ricochet shard clouds and expanding bank rings;
3. stronger lethal-hit treatment with impact cores, kill halos, and deterministic debris;
4. dedicated Warden guard-impact treatment without changing guard mechanics;
5. recall-start surge and catch-collapse treatment, including stronger perfect-catch feedback;
6. dash-start wake/pop treatment;
7. player-damage and shield-hit world feedback plus a restrained screen-edge damage vignette;
8. wave-entry ring/sweep treatment, with stronger feedback when the arena expands;
9. lightweight bullet ghost sampling for high-speed readability;
10. bounded event queues and reduced-motion handling for non-essential movement effects.

## Architecture

Active feature chain:

`CombatJuice → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

`CombatJuice` is presentation/game-feel focused. It may raise existing camera shake or hit-stop timers for important impacts, but it does not alter damage, collision geometry, movement speeds, enemy behavior, wave composition, upgrade values, checkpoint data, or progression rules.

## Test coverage added

- `tests/combat-juice.test.js`
  - runtime version contract;
  - bounded impact intensity;
  - deterministic shard generation;
  - presentation-only source contract.
- `tests/browser/combat-juice.spec.js`
  - runtime activation;
  - fire feedback;
  - ricochet feedback;
  - lethal-hit feedback;
  - recall/catch feedback;
  - dash/damage presentation;
  - canvas captures for visual review.
- `package.json` syntax gate now includes the new runtime.
- `sw.js` app shell now includes the new runtime.
- `src/main.js` boots `OneBulletCombatJuiceRuntime`.

## Verification state

- Local syntax check of the new runtime: **passed**.
- Repository CI: **pending**.
- Browser Smoke / Playwright: **pending**.
- Cross-browser capture review: **pending**.
- Canonical v3.4 release version/cache lock: **blocked until feature CI is green**.

## Preserved v3.3 baseline

The parent v3.3 feature previously passed:

- Verify #833: **success**.
- Browser Smoke #171: **success**.
- Playwright: **148/148 passed**.
- Unexpected failures: **0**.
- Flaky tests: **0**.
- Skipped tests: **0**.

v3.4 must preserve that baseline before its release identity can be promoted.

## Current acceptance gate

Do not merge v3.4 yet.

Required before release lock:

1. Verify workflow succeeds on the v3.4 feature head.
2. Browser Smoke succeeds across configured projects.
3. New combat-juice screenshots are manually inspected for clutter/readability.
4. Existing visual-overhaul, Warden, checkpoint, combat-depth, mobile/touch, input, PWA, and release-handshake tests remain green.
5. If successful, promote release identity to `v3.4.0-combat-juice`, rerun the final release CI cycle, then present the result for owner acceptance.
