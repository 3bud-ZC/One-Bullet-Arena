# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.9.0 — Core Combat Depth**
- Pull Request #41: **squash-merged into `main`**
- Release merge commit: `e5a492da199e290b21df642b2dc3aa6b7720cabe`
- Final tested feature head: `a7f54ae173d7f8f6e6ef79b926b1b8a9cc762908`
- Implementation: **100% complete**
- Verify #739: **success**
- Browser Smoke #150: **success**
- Playwright: **96/96 passed**
- Unexpected failures: **0**
- Flaky tests: **0**
- Skipped tests: **0**
- Final visual review: **28/28 captures inspected**
- Owner deployed gameplay acceptance: **pending**
- GitHub Pages public deployment: **not independently confirmed from the assistant environment**
- Next milestone: **blocked until owner acceptance**

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
- Gameplay event schema: `2`.

## Released combat mechanics

### Perfect Catch

- A returning bullet can be caught skillfully by moving toward it during the visible catch window.
- Dashing through the returning bullet also qualifies.
- Recalls shorter than the minimum distance do not trigger the skill reward.
- A successful Perfect Catch grants one Precision Shot.

### Precision Shot

- The next bullet fired after a Perfect Catch receives a distinct skill core.
- Precision Shot gains `35%` skill damage and a launch-velocity bonus.
- The charge is consumed when fired and is lost when the player takes or blocks damage.

### Bank Shot chain

- Consecutive ricochets build a Bank level up to `5`.
- Each Bank level adds `6%` skill damage, capped at `30%`.
- The Bank chain expires when it is not continued.
- Bank kills extend combo time and generate dedicated feedback.

### Recall Surge

- Damage dealt while the bullet returns grows with recall duration.
- The recall-duration multiplier is capped at `35%`.
- Long recalls build Momentum even without a Perfect Catch.

### Momentum and Overdrive

- Ricochets, hits, kills, long recalls, and Perfect Catches build Momentum.
- Combo level increases Momentum gain by up to `35%`.
- Momentum decays slowly after inactivity.
- Reaching `100%` activates Overdrive for `6.5` seconds.
- Overdrive grants:
  - `25%` skill damage;
  - faster bullet launch;
  - two temporary Magnetic Recall levels;
  - one temporary Quick Dash level;
  - two temporary Bullet Velocity levels;
  - one ready Precision Shot.
- Taking damage drains Momentum or shortens active Overdrive.

## Released visual feedback

- Added a combined Momentum / Combo / Overdrive HUD.
- Added a visible catch-window ring during recall.
- The catch ring changes to the success color when movement alignment qualifies.
- Added distinct Precision-ready and Overdrive player auras.
- Added Precision and Bank projectile cores.
- Added callouts and expanding-ring effects for:
  - Perfect Catch;
  - Precision Shot;
  - Bank Shot;
  - Overdrive start;
  - Overdrive end.

## Architecture and events

- Added `src/core/combat-depth-runtime.js` above the accepted Event Runtime.
- Base movement, collision, enemy AI, wave composition, arena geometry, and upgrade definitions were not modified.
- Added schema-v2 events for Perfect Catch, Precision Shot, Bank chains, Momentum changes, and Overdrive lifecycle.
- Combat skill state is exposed through the QA snapshot.

## Verification completed

- Deterministic tests cover Perfect Catch eligibility, composed skill damage, Momentum rewards, and bounded Overdrive duration.
- Browser tests cover runtime activation, Perfect Catch, Precision and Bank kills, Overdrive activation, and temporary bonuses.
- Final Playwright execution passed on:
  - Desktop Chromium;
  - Mobile Landscape Chromium;
  - Desktop Firefox;
  - Desktop WebKit.
- The final visual set contains seven states per browser project:
  - menu;
  - Momentum HUD;
  - Perfect Catch / Precision Ready;
  - Overdrive;
  - Precision Bank impact;
  - upgrade selection;
  - Game Over.
- The Precision Bank capture was stabilized by retaining a surviving enemy so the screenshot remains in combat.
- No blocking layout, state-transition, control, or cross-browser regression was found in automated review.

## Owner acceptance gate

1. Confirm the menu footer displays `v2.9.0-combat`.
2. Play at least five waves.
3. Fire the bullet to long range, recall it, and move toward it as it reaches the player.
4. Confirm `PERFECT CATCH` and `PRECISION READY` appear.
5. Fire the Precision Shot and inspect its brighter core and impact.
6. Build multiple ricochets and confirm the Bank counter and damage feedback.
7. Fill Momentum and confirm Overdrive activates for a limited duration.
8. Test movement, dash, pause/resume, upgrades, Game Over, Retry, and Main Menu.
9. Report any balance, visual, or control issue before the next milestone begins.
