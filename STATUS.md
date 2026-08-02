# One Bullet Arena — Status

Last updated: 2026-08-02

## Scope and completion

The approved scope has expanded from the previous arena-only release into **One Bullet Arena: Corebreak Protocol**, including unique bosses, a branching roguelite route, run economy, Relics, Overdrive, additional modes, tutorial, platform polish, and production release work.

- Previous v0.8 arena scope: **96% complete**
- Expanded Corebreak Protocol v1.0 scope: **76% complete**
- Milestones 01–04B: **implemented**
- Corebreak Phase 1 — The Three Guardians: **implemented on Pull Request #14**
- Browser build: **v0.9.0**
- Current state: **Pull Request #14 initial verification passed with 73/73 tests; final verification after this status commit is required before merge**

## Corebreak Phase 1 implemented

### Mirror Guardian — Neon

- Three combat phases.
- Direct unbounced shots are reflected during the shield phase.
- Mirror decoys intercept and redirect the bullet.
- Final phase periodically reverses player movement with an explicit warning.
- Unique silhouette, health HUD, phase banners, particles, and shard rewards.

### Bullet Hunter — Reactor Forge

- Hunts the released bullet instead of only chasing the player.
- Captures the bullet inside a visible magnetic cage and releases it automatically to prevent soft locks.
- Creates a bounded vulnerability window after release.
- Final phase accepts normal damage only during recall or the release vulnerability window.
- Uses aimed spreads, radial attacks, and dash pressure across three phases.

### Rift King — Void Circuit

- Uses paired portals that transport and rotate the bullet trajectory.
- Applies readable gravity pull and push phases to the player and bullet.
- Final phase divides the arena with alternating spectral collapse lines.
- Uses targeted spreads and radial attacks with increasing pressure.

### Boss mastery and rewards

- Added persistent local mastery for all three guardians.
- Records encounters, victories, best time, highest cleared difficulty, and no-damage wins.
- Grants permanent Core Shards after each victory.
- Grants a larger one-time first-victory mastery bonus.
- Added a dedicated Arabic Guardian Mastery screen from the main menu.
- Boss mastery data is normalized and repaired if malformed.

### Offline integration

- Service-worker application shell advanced to **v0.9.0**.
- Boss data and runtime modules are cached for installed and offline play.

## Verification

- JavaScript syntax checks: **passed** for all existing modules, boss expansion modules, and the service worker.
- Automated tests: **73/73 passed** on the initial Pull Request #14 run.
- New tests cover:
  - one unique three-phase boss per region;
  - health scaling for difficulty and Story Route;
  - phase thresholds;
  - encounter and victory mastery;
  - first-victory rewards;
  - best-time and difficulty preservation;
  - no-damage wins;
  - malformed mastery repair.

## Manual acceptance gate

1. Mirror Guardian reflects direct shots without repeated collision loops.
2. Decoys remain readable on desktop and mobile.
3. Movement inversion starts and ends cleanly without leaving controls reversed.
4. Bullet Hunter capture always releases the bullet and never creates a soft lock.
5. Phase-three Bullet Hunter weakness is understandable and achievable with every Core.
6. Rift King portal transport preserves a recoverable bullet trajectory.
7. Gravity and segmentation remain controllable on mobile.
8. Boss rewards are granted once and persist after reload.
9. Guardian Mastery cards stay within the screen at supported resolutions.
10. Existing region enemies, progression, Daily Challenge, PWA, and mobile controls remain intact.

## Remaining Corebreak Protocol phases

### Phase 2 — Roguelite Run Map and Economy

- Branching node map.
- Combat, Elite, Forge, Shop, Recovery, Mystery, Challenge, and Boss nodes.
- Temporary Broken Energy currency.
- Route choices and deterministic seeded layouts.

### Phase 3 — Advanced Builds

- Bullet Overdrive per Core.
- Approximately 25 gameplay-changing Relics.
- Additional Synergies.
- Build Codex and Relic discovery.

### Phase 4 — Game Modes

- Story Run on the branching route.
- Endless Mode.
- Boss Rush.
- Core Contracts.
- Mode-specific local records.

### Phase 5 — Production Release

- Interactive tutorial.
- Gamepad and remapping.
- Audio and visual production pass.
- Complete save export including Codex and mastery data.
- Browser gameplay tests, screenshot regression, and performance benchmark.
- Final PWA/mobile polish and v1.0.0 release.

## Next execution step

**Corebreak Phase 2 — Branching Roguelite Run Map and In-Run Economy**
