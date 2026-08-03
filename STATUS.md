# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Release candidate: **v1.3.0 — Regional Map Overhaul**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- v1.2.0 Combat & Mobile Expansion: **merged through Pull Request #20**
- v1.2.1 Progressive Hazard Curve: **merged through Pull Request #21**
- v1.2.2 Clean Mobile Shell: **merged through Pull Request #22**
- v1.3.0 Map Overhaul: **implemented in Pull Request #23; final merge pending release gates**
- Current state: **implementation, deterministic verification, Chromium browser verification, viewport checks, and wave-one screenshot review complete; late-wave live balance and physical-device acceptance remain**

## v1.3.0 delivered

### Twenty-four arena identities

Each region now owns eight deterministic arena layouts instead of reusing a small group of static maps.

- **Neon District:** Arrival Grid, Signal Crossing, Ricochet Rail, Prism Gate, Dual Circuit, Siege Station, Sector Lockdown, and Core Plaza.
- **Reactor Forge:** Maintenance Deck, Coolant Channel, Piston Gallery, Smelting Room, Ore Crane, Pressure Grid, Reactor Lock, and Upper Foundry.
- **Void Circuit:** Rift Edge, Silent Orbit, Phase Corridor, Broken Constellation, Gravity Ring, Fracture Lanes, Singularity Lock, and Void Heart.

Story mode resets the local arena curve when entering each region, so every region introduces its map language before reaching its final lockdown layout.

### Four-stage arena progression

- **Waves 1–2 — Introduction:** open geometry, readable ricochet lanes, and at most one slow moving element.
- **Waves 3–4 — Route control:** moving barriers, boost lanes, and the first interactive fields.
- **Waves 5–6 — Pressure:** orbiting structures, shutters, multiple fields, and route changes during combat.
- **Waves 7–8 — Lockdown:** multiple synchronized barriers, control relays, and maximum regional complexity before the Guardian.

The environmental hazard curve remains independent and progressive:

- wave 1 has no active environmental hazard;
- wave 2 is preview-only;
- wave 3 begins at low intensity;
- waves 4–8 increase progressively.

### Moving arena geometry

- Added collision-aware walls that move horizontally, vertically, in orbit, or as side shutters.
- Player, enemies, and the single bullet use the existing collision system against the moving structures.
- Lockdown maps change available paths during combat rather than using decorative motion only.
- Guardian encounters use the final regional layout with reduced structure movement speed for readability.
- Destroying supported breakable cover temporarily opens a route and displays direct combat feedback.

### Interactive counterplay

- Added **boost pads** that accelerate the free bullet while preserving its direction.
- Added **control relays** that can be struck by the bullet to:
  - suspend the active regional hazard temporarily;
  - move barriers farther away and open paths;
  - award score and visual feedback.
- Clearing every relay in an arena grants a full-control bonus.
- Relay positions are reserved away from desktop HUD panels and mobile touch-control zones.

### Region-specific fields

- **Neon signal fields:** gradually accelerate and steer the bullet.
- **Forge coolant fields:** reduce enemy movement while they are inside the zone.
- **Forge steam fields:** cyclically push the player, enemies, and free bullet.
- **Void slow fields:** reduce bullet velocity.
- **Void fast fields:** accelerate the bullet and change route planning.

### Visual identity and performance

- Neon receives animated circuit traces and scanning energy marks.
- Reactor Forge receives industrial plates, rivets, heat sparks, and steam presentation.
- Void Circuit receives star particles, orbital rings, and phase-field effects.
- Map ambience scales down automatically in Balanced and Performance modes.
- Touch devices use reduced decorative density while retaining all gameplay objects and telegraphs.

### Offline integration

- Package version advanced to **1.3.0**.
- Visible in-game release label advanced to **v1.3.0**.
- Service-worker cache advanced to `one-bullet-arena-v1.3.0`.
- Map data, runtime, and relay-safety modules are included in the offline application shell.

## Gameplay retained

- Regional missions contain **8 waves**.
- Story runs contain **24 waves**, with eight waves per region.
- Daily runs remain compact.
- Kinetic Pulse, Phase Shift, Overdrive, Relics, Synergies, advanced enemies, Evolutions, three Guardians, Endless, Boss Rush, Core Contracts, Gamepad, unified save, PWA, and clean mobile shell remain connected.

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed** for every runtime module, Playwright configuration, and service worker.
- Automated deterministic tests: **115/115 passed**.
- Failures: **0**.
- Coverage includes:
  - eight unique maps per region;
  - deterministic map generation;
  - increasing map complexity;
  - readable early layouts and interactive late layouts;
  - distinct regional field types;
  - bounded moving-wall trajectories;
  - safe relay positions outside HUD and touch-control zones;
  - v1.2 environmental-hazard progression and all previous systems.

### Browser verification

- Playwright Browser Smoke: **14/14 passed** on the latest Pull Request #23 implementation commit.
- Desktop Chromium and mobile-landscape Chromium passed.
- Coverage confirms:
  - clean full-viewport public route;
  - real gameplay entry into the overhauled arena;
  - combat techniques remain operational;
  - zero document overflow;
  - five mobile landscape viewport sizes remain contained;
  - portrait route remains clean and contained;
  - v1.3.0 PWA cache and map modules are reachable.

### Visual QA completed

- Desktop and mobile-landscape screenshots of the first Neon arena were reviewed.
- Confirmed:
  - boost pads remain visible without masking enemies;
  - ambient effects do not overpower the HUD;
  - mobile movement and action controls remain fully contained;
  - the direct game-only shell remains clean;
  - no runtime error appears during real gameplay entry.

## Remaining live acceptance checks

These require the deployed build, extended play, or physical hardware and are not marked complete:

1. Complete an eight-wave mission in each region and review every arena identity.
2. Review moving-wall speed and route availability in waves 5–8.
3. Confirm relay positions and interactions on a physical small and large phone.
4. Review Forge steam/coolant balance and Void phase-field balance.
5. Test the final lockdown arena during each Guardian fight.
6. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
7. Test the installed PWA after an offline restart.
8. Review sustained performance during late-wave enemy density and maximum map complexity.

## Live refresh note

The service-worker cache advances from v1.2.2 to v1.3.0. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the old map set remains visible.
