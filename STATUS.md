# One Bullet Arena — Status

Last updated: 2026-08-02

## Completion

- Overall project completion: **84%**
- Milestone 01 — First Playable Vertical Slice: **100%**
- Milestone 02 — Combat, Arabic presentation, boss, and upgrades: **100%**
- Milestone 02.5 — UI/UX and anime presentation: **100%**
- Milestone 02.6 — Stabilization and balance: **100%**
- Milestone 03A — Visual Identity Overhaul: **100% implemented**
- Milestone 03B — Persistent Progression: **100% implemented**
- Current milestone: **Milestone 03C — Replayability Expansion**
- Milestone 03C implementation: **100%**
- State: **Pull Request #9 squash-merged to main after successful final verification; GitHub Pages deployment triggered; live browser and balance review are required before milestone acceptance**

## Milestone 03C implemented

### Upgrade rarity and build systems

- Added four upgrade rarity tiers: Common, Rare, Epic, and Legendary.
- Rarity probability scales with wave progression and receives a small bonus during Daily Challenges.
- Rare and Epic selections strengthen supported numerical upgrade effects.
- Added six one-stack Legendary upgrades:
  - Ghost Round.
  - Vengeful Return.
  - Final Detonation.
  - Time Core.
  - Chain Lightning.
  - Nuclear Gamble.
- Added four named core/upgrade synergies:
  - Angle Master.
  - Storm Loop.
  - Recall Hunter.
  - Siege Core.
- Added an in-run Build Inspector available from the pause menu or the `B` key.
- Build Inspector shows the selected core, upgrades, rarity, stack levels, active synergies, and current challenge progress.

### Elite enemy modifiers

- Elite enemies now receive deterministic functional modifiers rather than health-only scaling.
- Added six Elite modifiers:
  - Explosive: damages nearby units and the player on death.
  - Regenerator: restores health after avoiding damage.
  - Armored: requires a ricochet before direct bullet damage is accepted.
  - Summoner: periodically creates mini Scouts.
  - Bullet Hunter: moves toward the released bullet.
  - Accelerator: increases the movement speed of nearby enemies.
- Added modifier icons, colored auras, score rewards, and Elite kill tracking.

### Run challenges and Daily Challenge

- Added six optional run challenges:
  - Complete a run without taking damage.
  - Kill three enemies with one shot.
  - Reach eight ricochets in one shot.
  - Win without dashing.
  - Win with 30 shots or fewer.
  - Kill three Elite enemies.
- Successful challenges grant bonus Core Shards.
- Added a deterministic Daily Challenge generated from the local calendar date.
- Each Daily Challenge fixes:
  - challenge objective;
  - bullet core;
  - upgrade sequence seed;
  - Elite modifier sequence;
  - daily mutator.
- Added four daily mutators: Elite Rush, Fragile Core, Ricochet Storm, and Overclocked.
- Added daily attempts, best score, best time, completion state, and consecutive-day streak tracking.

### Cosmetic inventory

- Added cosmetic slots for player aura, bullet, trail, dash, and HUD theme.
- Added eleven cosmetic items with unlock requirements based on:
  - completed challenges;
  - Daily Challenge wins;
  - consecutive daily streak;
  - Legendary upgrade selections;
  - Elite kills.
- Cosmetics are presentation-only and do not change combat power.
- Added a dedicated Arabic Cosmetics screen and persistent cosmetic selection.

### Persistence and presentation

- Progression save schema advanced from version 1 to version 2.
- Replayability data now participates in save export, import, malformed-data repair, and full reset.
- Added final settlement logic so challenge bonuses, Daily forced cores, Elite kills, Legendary selections, history details, and cosmetic unlocks are recorded exactly once.
- Result screens now show challenge completion, bonus shards, Daily status, and newly unlocked cosmetics.
- Combat HUD now shows the current run challenge and live progress.
- Main menu now provides direct access to Daily Challenge and Cosmetics.
- Browser package advanced to **v0.6.0**.

## Verification

- JavaScript syntax checks: **passed** for all runtime, UI, visual, progression, replayability, and persistence modules.
- Automated tests: **42/42 passed**.
- New tests cover:
  - deterministic seeded random generation;
  - rarity thresholds and deterministic upgrade decoration;
  - Legendary upgrade catalogue integrity;
  - synergy activation;
  - deterministic Elite modifier assignment;
  - all six challenge objectives;
  - stable Daily Challenge generation by date;
  - cosmetic unlock rules;
  - version-two save migration and replayability export/import;
  - malformed replayability data repair;
  - challenge reward settlement;
  - Daily forced-core history;
  - idempotent reward processing;
  - cosmetic unlock settlement.
- Pull Request #9: **squash-merged to main**.
- Merge commit: `d69b4134b42a71c5465e168e179d933bb313959a`.
- GitHub Actions Verify: **passed** on the final Pull Request #9 commit.
- GitHub Pages deployment: **triggered by the merge and this status update**.
- Live gameplay, layout, and balance review: pending.

## Acceptance gate

Do not close Milestone 03C until:

1. Upgrade cards display the correct rarity and Legendary cards remain visually readable.
2. Each Legendary upgrade produces its documented gameplay effect.
3. All four synergies activate only after the required core and upgrades are present.
4. Every Elite modifier is identifiable and behaves correctly without breaking collision readability.
5. Challenge progress updates during the run and bonus shards are granted exactly once.
6. Daily Challenge content remains identical after reload on the same date.
7. Daily attempts, best score, completion, and streak persist correctly.
8. Daily forced cores work even when the core is not permanently unlocked and are recorded correctly in history.
9. Build Inspector opens and closes correctly from keyboard and pause controls.
10. Cosmetic unlocks and selections persist through reload, export, and import.
11. Desktop, fullscreen, and mobile landscape layouts remain usable.
12. Existing combat, visual identity, progression, boss, defeat stabilization, and Arabic RTL behavior remain intact.
13. The project owner approves rarity rates, challenge rewards, Elite difficulty, and Daily pacing.

## Known limitations

- Progression remains local to the current browser/device; cloud accounts and cross-device synchronization are not implemented.
- Daily Challenges are deterministic and local; global leaderboards are not implemented.
- Rarity probabilities, Elite frequency, challenge rewards, and Legendary power require live balance testing.
- Real-browser automated gameplay and screenshot regression testing is still pending.
- Final illustrated backgrounds, portraits, and bespoke audio assets are not integrated.
- Additional regions, enemies, bosses, Endless Mode, and Boss Rush are not implemented yet.

## Next milestone after acceptance

**Milestone 04 — Content Expansion**

Planned scope:

- Three larger themed regions with distinct arena mechanics.
- New region-specific enemy types.
- Three additional bosses.
- Region and difficulty selection.
- Longer run structure.
- Endless Mode.
- Boss Rush Mode.
- Additional music, ambience, and balance refinement.
