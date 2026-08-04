# One Bullet Arena: Corebreak Protocol

**حلبة الطلقة الواحدة: بروتوكول الكسر** is an Arabic browser roguelite action game built around one strict rule:

> You own one recoverable bullet. Every shot changes the fight, and the same bullet must return before you can fire again.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Installable PWA with offline application-shell support.
- Desktop, mobile landscape, keyboard, mouse, touch, and remappable Gamepad controls.

## v1.4.0 features

### Combat

- Recoverable single-bullet combat with ricochets, recall, dash, perfect catches, hit-stop, slow motion, and Overdrive.
- Five bullet Cores: Standard, Ricochet, Heavy, Shock, and Recall.
- Five Core-specific Overdrive states.
- Common, Rare, Epic, and Legendary upgrades.
- Twenty-five gameplay-changing Relics and six advanced Core/Relic Synergies.
- Kinetic Pulse and Phase Shift active techniques.

### Objective rooms

Combat waves no longer rely only on eliminating every enemy. Regional progression now introduces deterministic objective rooms:

- **Circuit Sequence:** strike relays in the required order.
- **Ricochet Lock:** hit a moving lock after reaching the required bounce count.
- **Core Defense:** protect a central Core while enemy pressure continues.
- **Marked Hunt:** eliminate highlighted targets in sequence.
- **Bullet Separation:** keep the bullet safely away from the player for a required duration.

The local eight-wave schedule keeps wave one readable and wave eight focused on regional lockdown:

| Local wave | Room structure |
| --- | --- |
| 1 | Standard onboarding combat |
| 2 | Circuit Sequence |
| 3 | Ricochet Lock |
| 4 | Core Defense |
| 5 | Marked Hunt |
| 6 | Bullet Separation |
| 7 | Advanced Circuit Sequence |
| 8 | Lockdown combat without an extra objective |

Objectives scale by local wave, preserve combat pressure, display direct world telegraphs, award score, and must be completed before wave advancement.

### Regions and enemies

- Neon Core District.
- Reactor Forge.
- Void Circuit.
- Twenty-four deterministic arena identities: eight per region.
- Progressive hazards, moving geometry, boost pads, control relays, region fields, and breakable routes.
- Core enemy roster plus eight region-specific archetypes and deterministic Evolutions.
- Persistent Enemy Codex with encounters, kills, counters, and recommended Cores.

### Guardians

- Mirror Guardian: reflection, decoys, and movement inversion.
- Bullet Hunter: bullet capture, pursuit, and recall vulnerability windows.
- Rift King: portals, gravity shifts, and arena segmentation.
- Persistent Guardian Mastery records and rewards.

### Roguelite systems

- Three-act branching Corebreak Protocol route.
- Combat, Elite, Forge, Shop, Recovery, Mystery, Challenge, and Boss nodes.
- Temporary Broken Energy economy inside each Protocol run.
- Persistent Core Shards, achievements, cosmetics, mastery, run history, Daily Challenge, and local records.
- Build Codex for Relics, Synergies, and Overdrive usage.

### Modes

- Region Missions.
- Story Route.
- Corebreak Protocol.
- Endless Mode with scaling waves and guardian gates.
- Boss Rush.
- Five Core Contracts.
- Daily seeded challenge.

### Production features

- Interactive seven-step tutorial.
- Gamepad movement, aiming, actions, and button remapping.
- Compact mobile-landscape HUD and controls with safe areas, browser-toolbar handling, left-handed layout, and quality tiers.
- Full unified save export/import covering progression, Codices, mastery, mode records, and settings.
- PWA installation and offline reopening after the first complete online load.
- Automated Node verification plus Playwright desktop/mobile smoke screenshots.
- Runtime performance monitor and quality-specific frame budgets.

## Controls

| Action | Keyboard / mouse | Mobile | Gamepad default |
| --- | --- | --- | --- |
| Move | `WASD` or arrows | Virtual stick | Left stick |
| Aim | Mouse | Drag on aim side | Right stick |
| Fire | Left click | Release aim touch | Button 0 |
| Dash | `Space` / `Shift` | Dash button | Button 1 |
| Recall | `Q` | Recall button | Button 2 |
| Overdrive | `E` | Overdrive button | Button 3 |
| Kinetic Pulse | `R` | Pulse button | Remappable |
| Phase Shift | `C` | Phase button | Remappable |
| Build inspection | `V` | Build button | Button 4 |
| Pause | `P` / `Escape` | Pause button | Button 9 |
| Fullscreen | `F` | Settings / installed mode | — |

Gamepad buttons can be remapped inside the game.

## Local development

The production game has no runtime framework dependency. Serve the repository over HTTP:

```bash
python3 -m http.server 4173
```

Run deterministic syntax and unit verification:

```bash
npm install
npm run verify
```

Run browser smoke tests and capture desktop/mobile screenshots:

```bash
npx playwright install chromium
npm run test:browser
```

## Architecture

The game uses a fixed `1280×720` Canvas simulation. Existing production systems remain connected through modular installers, while v1.4.0 introduces a centralized outer **Runtime Kernel** for new work and incremental migration.

The Runtime Kernel provides:

- stable priority-ordered systems;
- run, wave, boss, update, render, bullet, enemy, damage, and result lifecycle hooks;
- cancellation gates for progression rules;
- per-system runtime state;
- render cleanup functions;
- isolated system errors and QA diagnostics.

Objective Rooms and the final mobile visual cleanup now use this shared pipeline instead of adding another independent `prototype.draw` or `prototype.update` wrapper. Older installers will be migrated incrementally rather than through a risky full rewrite.

Persistent data is normalized before use and remains local to the player's browser unless exported manually.

## Status

[`STATUS.md`](./STATUS.md) is the single source of truth for verification results, manual acceptance gates, and release state.
