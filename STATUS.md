# One Bullet Arena — Status

Last updated: 2026-08-02

## Scope and completion

The active target is **One Bullet Arena: Corebreak Protocol v1.0**.

- Expanded Corebreak Protocol completion: **82%**
- Legacy arena systems through Milestone 04B: **implemented**
- Corebreak Phase 1 — The Three Guardians: **implemented and merged through Pull Request #14**
- Corebreak Phase 2 — Branching Route and In-Run Economy: **implemented on Pull Request #15**
- Browser build: **v0.10.0**
- Current state: **Pull Request #15 initial verification passed with 79/79 tests; final verification after this status commit is required before merge**

## Phase 1 — The Three Guardians

- Mirror Guardian for Neon with reflection, decoys, and temporary movement inversion.
- Bullet Hunter for Reactor Forge with bullet capture, automatic safe release, and bounded vulnerability windows.
- Rift King for Void Circuit with paired portals, gravity shifts, and arena segmentation.
- Three phases, intros, region-specific HUDs, mastery statistics, permanent shard rewards, and first-victory bonuses.

## Phase 2 — Branching Roguelite Route

### Route structure

- Added a dedicated **Corebreak Protocol** entry from the main menu.
- Added a deterministic three-act route across Neon, Reactor Forge, and Void Circuit.
- Each act contains three branching choice rows followed by its region guardian.
- The active row exposes multiple choices while completed rows remain visible.

### Node types

- Combat.
- Elite.
- Forge.
- Core Shop.
- Recovery.
- Mystery Event.
- Challenge Room.
- Boss.

### In-run economy

- Added temporary **Broken Energy** currency.
- Broken Energy is earned from combat, Elite, Challenge, and Boss nodes.
- It is spent inside Forge, Shop, and selected Mystery Event decisions.
- The currency exists only for the active run and does not alter permanent Core Shards.

### Combat and rewards

- Combat nodes use existing regional arenas and enemy compositions.
- Elite nodes enhance every spawned enemy and increase the reward.
- Challenge nodes use deterministic no-damage, limited-shot, or ricochet objectives.
- Cleared combat nodes open a temporary upgrade choice before returning to the route.
- Region guardians act as chapter gates.
- Completing the final guardian settles the protocol as a full victory.

### Services and events

- Forge purchases add bounce, damage, or recall upgrades.
- Shop purchases provide healing, shields, or random upgrades.
- Recovery nodes offer healing, shielding, or energy salvage.
- Mystery Events provide safe and risky economy decisions.
- All purchases prevent negative Broken Energy balances.

### Offline integration

- Service-worker cache advanced to **v0.10.0**.
- Route data and runtime modules are available in installed/offline mode.

## Verification

- JavaScript syntax checks: **passed** for all existing modules, route modules, and service worker.
- Automated tests: **79/79 passed** on the initial Pull Request #15 run.
- New tests cover:
  - deterministic three-act generation;
  - one boss row per act;
  - active-row exposure;
  - node completion and route progression;
  - Broken Energy rewards and safe spending;
  - act advancement after guardians;
  - full protocol completion;
  - deterministic challenge selection.

## Manual acceptance gate

1. Route nodes remain readable on desktop and phone landscape.
2. Only nodes in the active row can be selected.
3. Combat, Elite, and Challenge encounters return to the reward screen after clearing.
4. Broken Energy rewards and purchases display the correct balance.
5. Forge and Shop effects apply once and do not duplicate.
6. Recovery and Mystery nodes always return to the route.
7. Guardian victories advance to the next region instead of ending the run early.
8. Final Rift King victory ends the protocol and shows the normal victory result.
9. Defeat exits the protocol cleanly without preserving temporary currency.
10. Existing standard Region Missions, Story Route, Daily Challenge, and mobile controls remain intact.

## Remaining Corebreak Protocol phases

### Phase 3 — Advanced Builds

- Bullet Overdrive for every Core.
- Approximately 25 gameplay-changing Relics.
- Additional Synergies.
- Relic discovery and Build Codex.

### Phase 4 — Game Modes

- Endless Mode.
- Boss Rush.
- Core Contracts.
- Mode-specific local records.

### Phase 5 — Production Release

- Interactive tutorial.
- Gamepad and remapping.
- Audio and visual production pass.
- Unified save export including Enemy Codex and boss mastery.
- Browser gameplay tests, screenshot regression, and performance benchmark.
- Final PWA/mobile polish and v1.0.0 release.

## Next execution step

**Corebreak Phase 3 — Bullet Overdrive, Relics, Synergies, and Build Codex**
