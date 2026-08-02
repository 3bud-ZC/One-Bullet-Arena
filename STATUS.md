# One Bullet Arena — Status

Last updated: 2026-08-02

## Scope and completion

- Active target: **One Bullet Arena: Corebreak Protocol v1.0**
- Expanded Corebreak Protocol completion: **94%**
- Corebreak Phases 1–3: **implemented and merged through Pull Requests #14–#16**
- Corebreak Phase 4 — Game Modes: **implemented on Pull Request #17**
- Browser build: **v0.12.0**
- Current state: **Pull Request #17 verification passed; final verification after this status commit is required before merge**

## Phase 4 implemented

### Endless Mode

- Unlimited regional waves.
- Region rotation every five waves.
- A unique region guardian every five waves.
- Escalating enemy health, speed, and Elite pressure.
- Upgrade selection after each defeated guardian.
- Persistent attempts, best wave, best score, and guardian count.

### Boss Rush

- Mirror Guardian, Bullet Hunter, and Rift King in sequence.
- Upgrade selection between guardian encounters.
- Completion grants permanent Core Shards.
- Persistent attempts, completions, best time, and least damage.

### Core Contracts

- Five contracts:
  - one heart;
  - no dash;
  - Elite in every wave;
  - bullet slowdown after ricochets;
  - forced Recall Core.
- Each contract has a region, rule set, reward, attempts, completions, and best score.
- Contract rewards settle once and persist in progression.

### Mode hub and records

- Added Arabic Game Modes and Contract selection screens.
- Added persistent normalized mode records.
- Existing Protocol route, Overdrive, Relics, regional enemies, guardians, progression, and mobile controls remain connected.

### Offline integration

- Service-worker cache advanced to **v0.12.0**.
- Game mode data and runtime modules are cached for installed/offline play.

## Verification

- JavaScript syntax checks: **passed** for all modules and service worker.
- Automated tests: **90/90 passed**.
- New tests cover Contract uniqueness, Endless records, Boss Rush records, Contract records, best-value preservation, and malformed-data repair.

## Manual acceptance gate

1. Endless guardian transitions never end the run early.
2. Endless difficulty remains playable and continues beyond wave 15.
3. Boss Rush transitions to the next guardian after each intermission.
4. Boss Rush completion rewards settle once.
5. Every Contract applies its modifier throughout the mission.
6. Mode records persist after reload.
7. Mode screens remain readable on phone landscape.
8. Existing standard modes and Protocol route remain intact.

## Remaining Phase 5 — Production Release

- Interactive tutorial.
- Gamepad support and remapping.
- Audio/visual production pass.
- Unified save export/import including progression, Enemy Codex, guardian mastery, Build Codex, mode records, and settings.
- Browser smoke tests, screenshot regression scaffolding, and performance benchmark.
- Final PWA/mobile polish and **v1.0.0** release.

## Next execution step

**Corebreak Phase 5 — Production Release Candidate**
