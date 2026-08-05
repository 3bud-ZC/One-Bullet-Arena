# One Bullet Arena: Corebreak Protocol

**حلبة الطلقة الواحدة: بروتوكول الكسر** is an Arabic browser roguelite action game built around one strict rule:

> You own one recoverable bullet. Every shot changes the fight, and the same bullet must return before you can fire again.

## Play

- GitHub Pages: `https://3bud-zc.github.io/One-Bullet-Arena/`
- Installable PWA with offline application-shell support.
- Desktop, mobile landscape, keyboard, mouse, touch, and remappable Gamepad controls.

## v1.4.1 features

### Combat

- Recoverable single-bullet combat with ricochets, recall, dash, perfect catches, hit-stop, slow motion, and Overdrive.
- Five Bullet Cores: Standard, Ricochet, Heavy, Shock, and Recall.
- Five Core-specific Overdrive states.
- Common, Rare, Epic, and Legendary upgrades.
- Twenty-five Relics and six advanced Core/Relic Synergies.
- Kinetic Pulse and Phase Shift active techniques.

### Difficulty and pacing

v1.4.1 smooths the eight-wave regional curve so player power, encounter pressure, objectives, and hazards escalate together instead of stacking abruptly.

- Waves 1–2 are onboarding encounters with no Elite, Evolution, or active v1.2 map-mutator pressure.
- Every wave uses a deterministic enemy-threat budget and population cap.
- Elite and Evolution concurrency is capped by local wave and selected difficulty.
- Enemy health, movement speed, hazard timing, and reinforcement cadence scale progressively.
- Recruit remains the lighter learning route, Hunter is the balanced default, Corebreaker is demanding, and One-Hit remains uncompromised.
- Hunter receives controlled checkpoint or critical-health recovery without bypassing Objective Room completion.
- One emergency pressure-relief event may trigger per wave at critical health.
- Encounters that exceed their target duration receive deterministic soft-cap relief instead of becoming attrition stalls.

### Objective rooms

Regional combat includes five deterministic objective types:

- **Circuit Sequence:** strike relays in the required order.
- **Ricochet Lock:** hit a moving lock after reaching the required bounce count.
- **Core Defense:** protect a central Core while enemy pressure continues.
- **Marked Hunt:** eliminate highlighted targets in sequence.
- **Bullet Separation:** keep the bullet safely away from the player for a required duration.

The balanced Hunter profile uses:

- three Circuit Sequence relays;
- reduced Ricochet Lock requirements;
- a 14-second Core Defense objective with four Core health and two assault slots;
- two Marked Hunt targets;
- an eight-second Bullet Separation objective with slower progress decay.

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

Objectives must be completed before wave advancement. Recovery is not awarded while an objective still blocks progression.

### Regions and enemies

- Neon Core District, Reactor Forge, and Void Circuit.
- Twenty-four deterministic arena identities: eight per region.
- Progressive hazards, moving geometry, boost pads, control relays, regional fields, and breakable routes.
- Core enemy roster plus eight region-specific archetypes and deterministic Evolutions.
- Persistent Enemy Codex with encounters, kills, counters, and recommended Cores.

### Guardians and modes

- Mirror Guardian, Bullet Hunter, and Rift King.
- Region Missions and the twenty-four-wave Story Route.
- Three-act Corebreak Protocol.
- Endless Mode, Boss Rush, five Core Contracts, and Daily seeded challenges.
- Persistent Guardian Mastery, Build Codex, achievements, cosmetics, run history, and local records.

### Production features

- Interactive seven-step tutorial.
- Gamepad movement, aiming, actions, and button remapping.
- Compact mobile-landscape HUD and controls with safe-area and browser-toolbar handling.
- Unified save export/import.
- PWA installation and offline reopening after the first complete online load.
- Automated Node verification and Playwright desktop/mobile browser gates.
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

## Local development

Serve the dependency-free runtime over HTTP:

```bash
python3 -m http.server 4173
```

Run deterministic verification:

```bash
npm install
npm run verify
```

Run browser gates and capture screenshots:

```bash
npx playwright install chromium
npm run test:browser
```

## Architecture

The game uses a fixed `1280×720` Canvas simulation. Existing production installers remain connected, while the centralized **Runtime Kernel** provides priority-ordered lifecycle hooks, cancellation gates, per-system state, render cleanup, error isolation, and QA diagnostics.

Objective Rooms, the pacing rebalance, and the final mobile visual cleanup use this shared runtime pipeline. Older direct prototype wrappers will be migrated incrementally behind the existing verification gates rather than through a risky rewrite.

Persistent data remains local to the browser unless exported manually.

## Status

[`STATUS.md`](./STATUS.md) is the single source of truth for verification results, manual acceptance gates, and release state.
