# One Bullet Arena — Status

Last updated: 2026-08-02

## Completion

- Overall project completion: **96%**
- Milestones 01–03D: **100% implemented**
- Milestone 03E — Final Live UI QA: **100% implemented**
- Milestone 04A — Regions and Run Structure: **100% implemented**
- Milestone 04A.1 — Mobile Browser Optimization: **100% implemented**
- Milestone 04B — Region-Specific Enemies and Enemy Codex: **100% implemented**
- Current state: **Pull Request #13 open; initial GitHub Actions verification passed; final verification and live combat review are required before acceptance**
- Browser build: **v0.8.0**

## Milestone 04B implemented

### Reactor Forge enemies

- Shield Drone:
  - faces the player with a visible frontal energy shield;
  - blocks direct non-ricochet hits from the front;
  - remains vulnerable from behind or after a wall ricochet.
- Furnace Brute:
  - heavy high-health pressure unit;
  - creates temporary heat zones during combat;
  - leaves a larger heat zone when destroyed.
- Magnet Unit:
  - creates a visible magnetic field;
  - pulls the released bullet toward itself inside the field;
  - changes recovery paths without changing player controls.
- Repair Bot:
  - searches for damaged allies;
  - moves toward its repair target;
  - restores bounded health on a visible cooldown beam.

### Void Circuit enemies

- Phase Walker:
  - enters a temporary untargetable phase state;
  - teleports to a new position around the player;
  - exposes itself again after the phase transition.
- Rift Sniper:
  - opens a visible rift exit;
  - fires its projectile from the remote exit instead of its own body;
  - uses arena portals when available.
- Gravity Orb:
  - displays a readable gravity radius;
  - pulls the player and released bullet toward its center;
  - uses stronger fields for Elite variants.
- Mirror Drone:
  - reflects direct unbounced bullets at a new angle;
  - becomes vulnerable after the bullet has ricocheted;
  - displays a reflective split silhouette.

### Region wave integration

- Forge and Void now use dedicated five-wave regional compositions.
- Story Route resets local enemy progression when entering Forge and Void.
- All eight new enemies appear through normal Region Mission and Story Route progression.
- Existing Neon compositions remain unchanged.
- Difficulty health, speed, score, Elite modifiers, challenges, upgrades, and bullet cores remain integrated.

### Visual feedback

- Added eight unique silhouettes and color identities.
- Added shield arcs, heat fields, magnetic ranges, repair beams, phase echoes, rift exits, gravity rings, and mirror facets.
- Added first-discovery notifications with the enemy name and immediate counter advice.
- Added custom health bars and Elite rings.
- New effects remain compatible with mobile performance quality tiers.

### Enemy Codex

- Added a dedicated Arabic Enemy Codex screen from the main menu.
- Added Forge and Void tabs with four entries each.
- Locked entries remain hidden until the enemy is encountered.
- Discovered entries show:
  - description;
  - counter strategy;
  - recommended bullet cores;
  - encounter count;
  - kill count.
- Codex data is normalized and repaired when malformed.
- Codex discovery and kill statistics persist locally across sessions.

### Offline integration

- Service-worker cache advanced to **v0.8.0**.
- Region enemy data and runtime modules are included in the offline application shell.
- Old caches are removed during service-worker activation.

## Verification

- JavaScript syntax checks: **passed** for all existing modules, region enemy modules, and service worker.
- Automated tests: **68/68 passed**.
- New tests cover:
  - eight unique region enemy definitions;
  - four enemies per advanced region;
  - supported region wave compositions;
  - Story Route local-wave resets;
  - discovery and repeat encounter tracking;
  - kill tracking without duplicate encounters;
  - Codex completion values;
  - malformed Codex repair and unsupported-entry removal.
- Pull Request #13: **open**.
- Initial GitHub Actions Verify: **passed**.
- Final verification on this status commit: pending.
- GitHub Pages deployment: pending merge.

## Acceptance gate

Do not close Milestone 04B until:

1. Every Forge enemy appears naturally across a five-wave Forge mission.
2. Every Void enemy appears naturally across a five-wave Void mission.
3. Shield Drone blocks frontal direct shots but accepts rear or ricochet hits.
4. Furnace heat zones are readable, temporary, and do not create unavoidable damage chains.
5. Magnet Unit changes bullet movement without permanently trapping the bullet.
6. Repair Bot never heals above max health and its target beam remains readable.
7. Phase Walker cannot be damaged while phased and always returns to a valid arena position.
8. Rift Sniper shots emerge from visible rift exits and remain dodgeable.
9. Gravity Orb pull remains controllable on desktop and mobile.
10. Mirror Drone reflects direct shots once without creating repeated collision loops.
11. First-discovery alerts do not cover critical mobile controls.
12. Codex locked and discovered layouts remain inside their cards.
13. Encounter and kill totals persist after reload.
14. Existing Neon missions, Story Route, Daily Challenge, boss flow, progression, PWA, and mobile controls remain intact.
15. The project owner approves live enemy balance and readability.

## Known limitations

- Enemy Codex uses its own local storage record and is not yet included in progression export/import.
- Region enemy behaviors have automated data tests but still require real-browser gameplay verification.
- Three unique region bosses are not implemented yet.
- Endless Mode and Boss Rush are not implemented yet.
- Real-device screenshot regression automation is not implemented yet.
- iOS still lacks a dedicated PNG Apple Touch Icon.
- Final bespoke music, portraits, and illustrated background assets are not integrated.

## Next milestone after acceptance

**Milestone 04C — Unique Region Bosses**

Planned scope:

- Mirror Guardian for Neon with directional reflection and decoys.
- Bullet Hunter for Reactor Forge with bullet capture and recovery pressure.
- Rift King for Void Circuit with portals, gravity shifts, and arena segmentation.
- Three phases, intros, achievements, mastery statistics, and region-specific rewards for each boss.
