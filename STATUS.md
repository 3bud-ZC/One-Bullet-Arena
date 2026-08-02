# One Bullet Arena — Status

Last updated: 2026-08-02

## Scope and completion

The active target is **One Bullet Arena: Corebreak Protocol v1.0**.

- Expanded Corebreak Protocol completion: **88%**
- Legacy arena systems through Milestone 04B: **implemented**
- Corebreak Phase 1 — The Three Guardians: **implemented and merged through Pull Request #14**
- Corebreak Phase 2 — Branching Route and In-Run Economy: **implemented and merged through Pull Request #15**
- Corebreak Phase 3 — Advanced Builds: **implemented on Pull Request #16**
- Browser build: **v0.11.0**
- Current state: **Pull Request #16 initial verification passed with 85/85 tests; final verification after this status commit is required before merge**

## Phase 3 implemented

### Bullet Overdrive

- Added one Overdrive identity for each of the five bullet Cores.
- Charge is earned from ricochets, perfect catches, dashes, kills, and combo play.
- Activation uses `E` on keyboard or a dedicated mobile button.
- Core-specific effects modify speed, damage, ricochet scaling, shock chains, heavy impacts, or recall damage.
- Added a dedicated HUD meter, activation banner, timer, VFX, and persistent activation statistics.

### Relics

- Added exactly **25 gameplay-changing Relics** across Common, Rare, Epic, and Legendary tiers.
- Relics modify targeting, distance damage, ricochet scaling, recall pull and speed, area explosions, shock range, healing, enemy projectiles, Broken Energy, first-shot damage, Overdrive duration, and chain extension.
- Relics drop from Elite, Challenge, and Guardian nodes.
- Added a random Relic purchase inside Protocol shops.
- Duplicate Relics are prevented within the same run.

### Advanced Synergies

- Added six Core/Relic combinations:
  - Maze Master;
  - Storm Ring;
  - Return Hunter;
  - Siege Core;
  - Critical Collapse;
  - Perfect Engine.
- Synergies activate only when the correct Core and every required Relic are present.
- Newly completed Synergies display an Arabic discovery banner.

### Build Codex

- Added a persistent Arabic Build Codex.
- Records discovered Relics, pick counts, discovered Synergies, and Overdrive activations.
- Locked Relics remain hidden until discovered.
- Added current-run Build inspection with Relics and active Synergies.
- Data is normalized and repaired when malformed.

### Offline integration

- Service-worker cache advanced to **v0.11.0**.
- Advanced build data and runtime modules are cached for installed/offline play.

## Verification

- JavaScript syntax checks: **passed** for all modules and service worker.
- Automated tests: **85/85 passed** on the initial Pull Request #16 run.
- New tests cover:
  - 25 unique Relics;
  - five distinct Overdrive configurations;
  - deterministic non-duplicate Relic choices;
  - exclusion of owned Relics;
  - complete Core/Relic Synergy requirements;
  - Build Codex discovery and accumulated pick counts;
  - malformed Codex repair.

## Manual acceptance gate

1. Overdrive charge and activation remain understandable at desktop and mobile sizes.
2. Every Core-specific Overdrive preserves the one-bullet rule.
3. Relic drops occur once after eligible Protocol nodes.
4. Area damage cannot recursively create unbounded kill loops.
5. Recall pull and speed do not make the bullet unrecoverable.
6. Shop Relic purchase deducts Broken Energy exactly once.
7. Build Codex cards remain inside the screen.
8. Current-run Build inspection returns to the correct state.
9. Existing route, guardians, region enemies, progression, and mobile controls remain intact.

## Remaining Corebreak Protocol phases

### Phase 4 — Game Modes

- Endless Mode.
- Boss Rush.
- Core Contracts.
- Mode-specific local records.

### Phase 5 — Production Release

- Interactive tutorial.
- Gamepad and remapping.
- Audio and visual production pass.
- Unified save export including Enemy Codex, guardian mastery, Build Codex, and mode records.
- Browser gameplay tests, screenshot regression, and performance benchmark.
- Final PWA/mobile polish and v1.0.0 release.

## Next execution step

**Corebreak Phase 4 — Endless Mode, Boss Rush, Core Contracts, and Mode Records**
