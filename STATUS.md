# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Milestone: **v3.0.0 — Checkpoint Progression**
- Working branch: `feature/v3.0.0-checkpoint-progression`
- Current production code on `main`: **v2.9.0 — Core Combat Depth**
- Previous release owner acceptance: **confirmed**
- Implementation on feature branch: **100% complete**
- Pull Request: **pending**
- Automated verification: **pending PR execution**
- Visual review: **pending Browser Smoke artifact**
- Owner deployed acceptance: **pending after merge**
- Next milestone: **blocked until owner acceptance**

## Requested product behavior

The owner requested persistent local progression with two explicit choices after death or from the menu:

1. Start a completely new run from Wave 1.
2. Continue from the highest saved wave reached previously.

The checkpoint is taken at the safe start of a wave. It does not resume from the middle of combat and does not preserve active enemies or hostile projectiles.

## Release identity

- Public release version: `3.0.0-checkpoint`.
- Public release label: `v3.0.0-checkpoint`.
- Release channel: `checkpoint-progression`.
- Service Worker cache: `one-bullet-arena-v3.0.0-checkpoint`.
- Checkpoint schema version: `1`.
- Gameplay event schema version: `3`.
- Combat-depth contract remains `2.9.0-combat`.

## Checkpoint persistence

- Added `src/core/checkpoint-store.js`.
- Storage key: `one-bullet-arena-checkpoint-v1`.
- Checkpoints are stored locally in the browser using `localStorage`.
- Storage failures or restricted browser storage do not block gameplay.
- Invalid JSON, incompatible schemas, and malformed checkpoints are ignored safely.
- Numeric and structural values are validated and bounded before use.
- Unknown or invalid upgrade identifiers are removed through the approved upgrade normalizer.
- A lower-wave checkpoint cannot overwrite a higher-wave checkpoint.
- An equal-wave checkpoint may refresh the saved build and statistics.
- A higher-wave checkpoint replaces the previous checkpoint.

## Save timing and restored data

A checkpoint is written automatically at the beginning of Wave 2 and every later wave.

The checkpoint preserves:

- wave number;
- score and run time;
- player health, maximum health, shield, and safe position;
- upgrade stacks and previous upgrade choices;
- shots, hits, kills, upgrade count, and damage taken;
- combo state and best combo;
- Second Chance usage;
- Momentum;
- Precision charge;
- remaining Overdrive duration;
- Perfect Catch, Precision Kill, Bank Kill, and Overdrive statistics.

The checkpoint intentionally does not preserve:

- enemies currently alive;
- hostile projectiles;
- particles and visual effects;
- the bullet in an unsafe mid-flight position;
- a partially completed wave.

On restore, the selected wave starts again with its normal deterministic enemy composition. The player receives brief spawn protection and the bullet starts safely in hand.

## Continue and new-run UX

### Main menu

When a checkpoint is available, the menu shows:

- the saved wave;
- saved upgrade count;
- saved score;
- **Continue from Wave XX**;
- **New Run from Start**;
- **Delete Checkpoint**.

Starting a new run does not erase the higher saved checkpoint.

### Game Over

When a checkpoint is available, Game Over shows:

- **Continue from Wave XX**;
- **Start from Wave 01**;
- **Main Menu**.

Keyboard shortcuts:

- `C`: continue from the checkpoint;
- `N`: start a new run;
- `Enter` on Game Over: continue when a checkpoint exists, otherwise start a new run;
- `R`: start a new run from Game Over.

The physical key codes remain layout-independent for Arabic and English keyboard layouts.

## Architecture and diagnostics

- Added `src/core/checkpoint-runtime.js` above the accepted Combat Depth Runtime.
- Activated `OneBulletCheckpointRuntime` from `src/main.js`.
- QA mode exposes `window.__ONE_BULLET_CHECKPOINT__`.
- Added events:
  - `checkpoint.saved`;
  - `checkpoint.loaded`;
  - `checkpoint.cleared`.
- QA snapshots expose:
  - checkpoint runtime and schema versions;
  - checkpoint availability;
  - saved wave, score, and upgrade count;
  - whether the current run was restored;
  - save timing and local-only storage mode.

## Verification coverage added

### Deterministic tests

- schema and wave validation;
- value clamping and upgrade normalization;
- highest-wave preservation;
- equal-wave refresh;
- malformed and unavailable storage handling;
- capture of persistent state without transient entities;
- checkpoint event catalog and runtime integration;
- Arabic-layout physical `C` and `N` shortcuts;
- release, Service Worker, and Pages artifact consistency.

### Browser tests

- normal Wave 1 start remains unchanged;
- creation of a Wave 5 checkpoint;
- a fresh run does not erase a higher checkpoint;
- checkpoint persistence across page reload;
- restoration of wave, score, health, upgrades, statistics, Momentum, Precision, and Overdrive;
- Game Over continue behavior;
- checkpoint clearing;
- continued compatibility with Core Combat Depth.

### Permanent visual captures

New captures are generated for every browser project:

- checkpoint-aware main menu;
- checkpoint-aware Game Over choices;
- restored-wave confirmation banner.

## Scope retained

The approved product path remains:

`Main Menu → New Run or Continue → Wave Combat → Upgrade → Harder Wave → Defeat → Continue/New Run/Menu`

No multiplayer, currencies, shop, hub, equipment, story, objectives, puzzles, bosses, accounts, cloud saves, or online leaderboard were added.

## Owner acceptance after merge

1. Confirm the footer displays `v3.0.0-checkpoint`.
2. Start a fresh run and reach at least Wave 3 or Wave 5.
3. Choose multiple upgrades and note health, score, and Momentum.
4. Lose the run intentionally.
5. Confirm Game Over offers Continue and New Run separately.
6. Continue and verify the correct wave and build are restored.
7. Return to the menu, refresh or close/reopen the page, and continue again.
8. Start a fresh run and confirm the higher saved checkpoint remains available.
9. Delete the checkpoint and confirm the Continue option disappears.
10. Report any loss of progress, wrong restored value, layout issue, or control regression before the next milestone begins.
