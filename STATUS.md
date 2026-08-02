# One Bullet Arena — Status

Last updated: 2026-08-02

## Completion

- Overall project completion: **72%**
- Milestone 01 — First Playable Vertical Slice: **100%**
- Milestone 02 — Combat, Arabic presentation, boss, and upgrades: **100%**
- Milestone 02.5 — UI/UX and anime presentation: **100%**
- Milestone 02.6 — Stabilization and balance: **100%**
- Milestone 03A — Visual Identity Overhaul: **100% implemented**
- Current milestone: **Milestone 03B — Persistent Progression**
- Milestone 03B implementation: **100%**
- State: **Pull Request #8 squash-merged to main after successful final verification; GitHub Pages deployment triggered; live browser review is required before milestone acceptance**

## Milestone 03B implemented

- Added a versioned local progression save with validation, normalization, migration-safe defaults, and corrupted-data fallback.
- Added persistent **Core Shards** earned from wave progress, kills, rank, accuracy, speed, and victory.
- Rebuilt the main menu around progression access while preserving the Arabic presentation and direct start flow.
- Added a dedicated **Core Hub** with currency display, unlocking, equipping, mastery statistics, and readable core traits.
- Added five one-bullet-compatible cores:
  - Standard Core: balanced default behavior.
  - Ricochet Core: two extra ricochets, scaling bounce damage, and slightly lower speed.
  - Heavy Core: significantly higher damage and knockback with lower speed and one fewer ricochet.
  - Shock Core: reduced direct damage with a chained strike to a nearby enemy.
  - Recall Core: Magnetic Recall available from the start with a small damage tradeoff.
- Added persistent mastery data per core: runs, victories, and best score.
- Added a result-screen reward summary with rank, selected core, earned shards, balance, and newly unlocked achievements.
- Added a persistent last-20-runs history with result, score, rank, time, accuracy, core, reward, and date.
- Added lifetime statistics for runs, victories, defeats, score, time, shots, hits, kills, ricochets, S ranks, precision runs, and fastest victory.
- Added six achievements with shard rewards and visible progress bars.
- Added save export, import, and confirmed full reset controls.
- Added selected-core identity to the combat HUD and a subtle matching player aura.
- Advanced the browser package to **v0.5.0**.

## Verification

- JavaScript syntax checks: **passed** for all runtime, UI, visual, stabilization, save, and progression modules.
- Automated tests: **28/28 passed**.
- New tests cover:
  - default save creation;
  - malformed-save repair;
  - deterministic reward calculation;
  - core unlock costs and currency deduction;
  - run rewards, mastery, achievements, and lifetime statistics;
  - the 20-run history limit;
  - save export/import round trips;
  - invalid import rejection.
- Pull Request #8: **squash-merged to main**.
- Merge commit: `20729087830f829ce2084fe42bc24b8796380e91`.
- GitHub Actions Verify: **passed** on the final Pull Request #8 commit.
- GitHub Pages deployment: **triggered by the merge and this status update**.
- Live persistence and core-balance review: pending.

## Acceptance gate

Do not close Milestone 03B until:

1. A completed or lost run grants the expected shard reward exactly once.
2. Reloading the page preserves shards, unlocked cores, selected core, achievements, history, and lifetime statistics.
3. All five cores visibly and mechanically match their documented traits.
4. Unlocking a core deducts the correct amount and cannot spend more shards than available.
5. The result screen, Core Hub, history, and achievements remain readable at desktop, fullscreen, and mobile landscape sizes.
6. Save export produces a valid JSON file and importing it restores the expected progression.
7. Invalid or malformed imported files are rejected without destroying the current save.
8. Reset requires confirmation and clears progression without leaving stale core selection or score data.
9. Existing movement, firing, upgrades, boss flow, visual identity, defeat stabilization, and Arabic UI remain intact.
10. The project owner approves the live progression pacing and core balance.

## Known limitations

- Progression is local to the current browser/device; cloud accounts and cross-device synchronization are not implemented.
- Core prices and run-reward values require continued live balancing.
- Achievements currently award shards; cosmetic reward inventory is reserved for a later milestone.
- Real-browser automated gameplay and screenshot regression testing is still pending.
- Final illustrated backgrounds, portraits, and bespoke audio assets are not integrated.
- Daily challenges, upgrade rarity tiers, elite modifiers, additional regions, and additional bosses are not implemented yet.

## Next milestone after acceptance

**Milestone 03C — Replayability Expansion**

Planned scope:

- Common, Rare, Epic, and Legendary upgrade tiers.
- Legendary effects that change run builds while preserving one bullet.
- Distinct elite enemy modifiers instead of health-only elite variants.
- Run challenges and optional objectives.
- Daily seeded challenge mode.
- Current-build inspection during a run.
- Additional progression rewards and cosmetic unlock inventory.
- Core and upgrade balance pass based on live playtesting.
