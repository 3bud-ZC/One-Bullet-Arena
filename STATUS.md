# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Milestone: **v2.9.0 — Core Combat Depth**
- Working branch: `feature/v2.9.0-core-combat-depth`
- Production on `main`: **v2.8.0-B — Runtime Event Foundation**
- Milestone 08-A: **closed and accepted**
- Milestone 08-B: **closed and accepted by the owner**
- Implementation: **100% complete on the feature branch**
- Pull Request: **pending**
- Automated verification: **pending PR execution**
- Owner acceptance: **pending after merge and deployment**

## Product scope retained

The release keeps the approved single-path product flow:

`Main Menu → Run → Wave Combat → Upgrade → Harder Wave → Defeat → Retry/Menu`

No modes, bosses, currencies, hubs, meta progression, equipment, story, objectives, or puzzles were added.

## Release identity

- Public release version: `2.9.0-combat`.
- Public release label: `v2.9.0-combat`.
- Release channel: `core-combat-depth`.
- Service Worker cache: `one-bullet-arena-v2.9.0-combat`.
- Internal combat-feedback contract remains `2.7.0-feedback`.
- Gameplay event schema upgraded from version `1` to `2`.

## Strong gameplay changes

### Perfect Catch

- A returning bullet can now be caught skillfully by moving toward it during the visible catch window.
- Dashing through the returning bullet also qualifies.
- Very short recalls cannot trigger Perfect Catch.
- A successful Perfect Catch grants one Precision Shot.

### Precision Shot

- The next fired bullet after a Perfect Catch gains a brighter skill core.
- Precision Shot receives a `35%` damage multiplier and a small velocity bonus.
- Precision state is consumed when fired and is lost when the player takes or blocks damage.

### Bank Shot chain

- Consecutive ricochets build a Bank level up to `5`.
- Each active Bank level adds `6%` skill damage, capped at `30%`.
- Bank levels expire when the chain is not continued.
- Bank kills extend the combo timer and produce dedicated feedback.

### Recall Surge

- Damage dealt while the bullet is returning grows with recall duration.
- The recall skill multiplier is capped at `35%`.
- Long recalls also award Momentum even when the catch is not perfect.

### Momentum and Overdrive

- Skill actions build a visible Momentum meter:
  - ricochets;
  - hits;
  - kills;
  - long recalls;
  - Perfect Catches.
- Combo level increases Momentum gain by up to `35%`.
- Momentum decays slowly after inactivity.
- At `100%`, Overdrive activates automatically for `6.5` seconds.
- Overdrive grants:
  - `25%` skill damage;
  - faster bullet launch;
  - two temporary Magnetic Recall levels;
  - one temporary Quick Dash level;
  - two temporary Bullet Velocity levels;
  - one ready Precision Shot.
- Taking damage reduces Momentum or shortens active Overdrive.

## Visual and UX feedback

- The previous combo strip is replaced by a combined Momentum / Combo / Overdrive panel.
- The player receives a visible catch-window ring during recall.
- The ring changes to the success color when movement alignment qualifies for Perfect Catch.
- Precision-ready and Overdrive states add distinct player auras.
- Precision bullets and Bank chains receive visible projectile cores.
- Added dedicated callouts and expanding-ring effects for:
  - Perfect Catch;
  - Precision Shot;
  - Bank Shot;
  - Overdrive start;
  - Overdrive end.

## Architecture and events

- Added `src/core/combat-depth-runtime.js` above the accepted Event Runtime.
- Base movement, collision, wave composition, enemy AI, arena geometry, and upgrade definitions were not edited.
- Added event schema v2 events for:
  - Perfect Catch;
  - Precision Shot fired;
  - Bank chain;
  - Momentum changes;
  - Overdrive started;
  - Overdrive ended.
- Combat skill state is exposed through the QA snapshot.

## Verification coverage

- Added deterministic rule tests for:
  - Perfect Catch eligibility;
  - combined skill damage;
  - Momentum rewards;
  - bounded Overdrive duration.
- Updated event catalog tests for schema v2.
- Added Playwright coverage for:
  - runtime activation;
  - Perfect Catch and Precision readiness;
  - Precision and Bank kills;
  - Overdrive activation and temporary bonuses.
- Permanent visual review now captures:
  - menu;
  - Momentum HUD;
  - Perfect Catch / Precision Ready;
  - Overdrive;
  - Precision Bank impact;
  - upgrades;
  - Game Over.
- GitHub Pages deployment validates and caches the new runtime.
- The local environment could not clone GitHub because external DNS resolution is unavailable; no unexecuted full-suite result is claimed.

## Owner acceptance after merge

1. Confirm the footer displays `v2.9.0-combat`.
2. Play at least five waves.
3. Recall the bullet from long range and move toward it as it reaches the player.
4. Confirm `PERFECT CATCH` and `PRECISION READY` appear.
5. Fire the Precision Shot and confirm its brighter core.
6. Build several ricochets and confirm the Bank counter and stronger impact feedback.
7. Fill Momentum and confirm Overdrive activates.
8. Test movement, dash, pause, upgrades, Game Over, Retry, and Main Menu.
9. Report any balance, visual, or control regression before the next milestone.
