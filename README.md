# One Bullet Arena: Corebreak Protocol

**حلبة الطلقة الواحدة: بروتوكول الكسر** is an Arabic browser roguelite action game built around one strict rule:

> You own one recoverable bullet. Every shot changes the fight, and the same bullet must return before you can fire again.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Installable PWA with offline application-shell support.
- Desktop, mobile landscape, keyboard, mouse, touch, and remappable Gamepad controls.

## v1.0.0 features

### Combat

- Recoverable single-bullet combat with ricochets, recall, dash, perfect catches, hit-stop, slow motion, and Overdrive.
- Five bullet Cores: Standard, Ricochet, Heavy, Shock, and Recall.
- Five Core-specific Overdrive states.
- Common, Rare, Epic, and Legendary upgrades.
- Twenty-five gameplay-changing Relics and six advanced Core/Relic Synergies.

### Regions and enemies

- Neon Core District.
- Reactor Forge.
- Void Circuit.
- Region mechanics include portals, lasers, conveyors, heat, gravity wells, and breakable structures.
- Core enemy roster plus eight region-specific archetypes.
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
- Mobile landscape controls with safe areas, browser-toolbar handling, left-handed layout, and quality tiers.
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
| Build inspection | `V` | Build button | Button 4 |
| Pause | `P` / `Escape` | Pause button | Button 9 |
| Fullscreen | `F` | Toolbar / installed mode | — |

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

The game uses a fixed `1280×720` Canvas simulation with modular prototype installers for presentation, progression, replayability, regions, mobile controls, enemies, guardians, routes, builds, modes, and release systems. Persistent data is normalized before use and remains local to the player's browser unless exported manually.

## Status

[`STATUS.md`](./STATUS.md) is the single source of truth for verification results, manual acceptance gates, and release state.
