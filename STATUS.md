# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v3.0.0 — Checkpoint Progression**
- Pull Request #42: **squash-merged into `main`**
- Release merge commit: `dbf91fc793bbaefb534f3afbf6761ad76d195c66`
- Final tested feature head: `0577bc8cb8e833b56f872e3d4dc50b9e88fcf349`
- Implementation: **100% complete**
- Verify #767: **success**
- Browser Smoke #154: **success**
- Playwright: **116/116 passed**
- Unexpected failures: **0**
- Flaky tests: **0**
- Skipped tests: **0**
- Permanent visual captures: **40**
- New checkpoint captures inspected: **12/12**
- Owner deployed acceptance: **pending**
- GitHub Pages public deployment: **not independently confirmed from the assistant environment**
- Next milestone: **blocked until owner acceptance**

## Requested product behavior delivered

The player now has two explicit progression choices:

1. Start a completely new run from Wave 1.
2. Continue from the highest saved wave reached previously.

The checkpoint is taken at the safe start of a wave. It never resumes from the middle of combat and never restores unsafe active enemies, hostile projectiles, particles, or a mid-flight bullet.

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
- Checkpoints are stored locally in the current browser profile using `localStorage`.
- Checkpoints survive refresh, browser close, and offline launches on the same profile.
- Restricted or unavailable storage never prevents a normal new run.
- Invalid JSON, malformed values, and incompatible schemas are ignored safely.
- Values are validated and bounded before restoration.
- Unknown upgrade identifiers are removed using the approved upgrade normalizer.
- A lower-wave checkpoint cannot overwrite a higher checkpoint.
- An equal-wave checkpoint may refresh the stored build and statistics.
- A higher-wave checkpoint replaces the previous checkpoint.

## Save timing and restored progression

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

On restore:

- the saved wave starts again with its normal enemy composition;
- the bullet starts safely in hand;
- the player position is constrained to the active arena;
- brief spawn protection is applied;
- the saved build, health, score, statistics, and Combat Depth state are restored.

## Continue and New Run UX

### Main menu

When a checkpoint exists, the menu shows:

- saved wave;
- saved upgrade count;
- saved score;
- **Continue from Wave XX**;
- **New Run from Start**;
- **Delete Checkpoint**.

Starting a new run does not delete the higher saved checkpoint.

### Game Over

When a checkpoint exists, Game Over shows:

- **Continue from Wave XX**;
- **Start from Wave 01**;
- **Main Menu**.

Keyboard shortcuts:

- `C`: continue from checkpoint;
- `N`: start a new run;
- `Enter` on Game Over: continue when a checkpoint exists, otherwise start a new run;
- `R`: start a new run from Game Over.

Physical key codes remain stable with Arabic and English keyboard layouts.

## Architecture and diagnostics

- Added `src/core/checkpoint-runtime.js` above the accepted Combat Depth Runtime.
- Activated `OneBulletCheckpointRuntime` from `src/main.js`.
- QA mode exposes `window.__ONE_BULLET_CHECKPOINT__`.
- Added events:
  - `checkpoint.saved`;
  - `checkpoint.loaded`;
  - `checkpoint.cleared`.
- QA snapshots expose checkpoint availability, saved wave, saved score, saved upgrades, restore status, schema, storage mode, and save timing.

## Verification completed

### Deterministic coverage

- schema and required-wave validation;
- numeric clamping and upgrade normalization;
- highest-wave preservation and equal-wave refresh;
- malformed and unavailable storage handling;
- persistent-state capture without transient entities;
- checkpoint event catalog and runtime activation;
- Arabic-layout physical `C` and `N` shortcuts;
- release, Service Worker, and Pages artifact consistency.

### Browser coverage

- normal Wave 1 start remains unchanged;
- creation of a Wave 5 checkpoint;
- a fresh run does not erase a higher checkpoint;
- checkpoint persistence across page reload;
- restoration of wave, score, health, upgrades, statistics, Momentum, Precision, and Overdrive;
- Game Over continue behavior;
- checkpoint clearing;
- compatibility with Core Combat Depth, movement, touch controls, wave progression, upgrades, and the existing PWA shell.

The final suite passed on:

- Desktop Chromium;
- Mobile Landscape Chromium;
- Desktop Firefox;
- Desktop WebKit.

The final visual review contains 28 existing release captures and 12 checkpoint-specific captures covering the checkpoint menu, checkpoint-aware Game Over, and restored-wave confirmation across all four browser projects. No blocking clipping, overlap, responsive-layout, or directionality issue was found.

## Scope retained

The product path is now:

`Main Menu → New Run or Continue → Wave Combat → Upgrade → Harder Wave → Defeat → Continue/New Run/Menu`

No multiplayer, currencies, shop, hub, equipment, story, objectives, puzzles, bosses, accounts, cloud saves, or online leaderboard were added.

## Owner acceptance gate

1. Confirm the footer displays `v3.0.0-checkpoint`.
2. Start a new run and reach at least Wave 3 or Wave 5.
3. Choose multiple upgrades and note health, score, and Momentum.
4. Lose intentionally and confirm Continue and New Run are separate choices.
5. Continue and verify the correct wave and build are restored.
6. Return to the menu, refresh or close/reopen the page, and continue again.
7. Start a new run and confirm the higher checkpoint remains available.
8. Delete the checkpoint and confirm the Continue option disappears.
9. Report any lost progress, wrong restored value, layout issue, or control regression before the next milestone begins.
