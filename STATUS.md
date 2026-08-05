# One Bullet Arena — Status

Last updated: 2026-08-05

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v2.1.0 — Automatic Expanding Arena**
- Pull Request: **#28**
- Working branch: `feature/expanding-arena-core-loop`
- Previous simple release: **v2.0.0**
- Previous full release preserved at: `archive/v1.4.1-full`
- Current state: **implementation, deterministic verification, Chromium verification, PWA integration, documentation, and desktop/mobile visual review complete; final documentation-commit gates and merge remain**

## Final game definition

The active game contains one explicit loop:

1. Start one run.
2. Fight every enemy in the current wave.
3. Recover the single bullet.
4. Choose one of three abilities.
5. Enter the next, harder wave.
6. Continue until defeat.

There is one map and one game. No alternate mode, objective route, or puzzle can block normal wave progression.

## Automatic arena expansion

The same arena opens automatically according to the current wave:

| Waves | Arena stage |
| --- | --- |
| 1–2 | Central combat room |
| 3–5 | Side wings opened |
| 6–8 | Outer corridors opened |
| 9+ | Complete arena opened |

- Clearing enemies and choosing an ability are the only requirements for entering the next wave.
- Expansion never requires ordered hits, relay activation, hit counters, target sequences, survival timers, or any other objective.
- Player, enemies, bullet ricochets, and enemy projectiles are constrained to the currently unlocked combat space.
- New geometry is ordinary combat cover only.
- After Wave 9, the complete arena remains active for all later waves.

## Difficulty progression

Difficulty increases through combat pressure only:

- enemy population grows gradually from three enemies;
- population remains capped at fourteen active enemies;
- Brute, Sniper, Charger, and Splitter enemies enter the roster gradually;
- enemy health increases within a bounded scale;
- enemy movement and projectile speed increase within bounded scales;
- the player receives one ability choice after every cleared wave.

There are no mode-specific modifiers or separate difficulty settings.

## Mobile combat visibility

The complete arena reaches underneath the touch-control layer, so dedicated combat-safe zones are enforced around:

- the movement stick;
- Recall;
- Dash;
- Pause.

Enemy spawn points avoid these zones. The player and enemies are moved out of them during gameplay so combat entities do not become hidden behind the controls. The bullet and visual effects may pass beneath the controls without blocking player readability.

## Removed systems remain absent

- Region and difficulty selection.
- Story Route and Corebreak Protocol.
- Daily Challenge, Endless, Boss Rush, and Contracts.
- Objective Rooms and Guardians.
- Hit-order puzzles, relay sequences, marked targets, defense timers, and separation objectives.
- Bullet Cores, Relics, Synergies, Overdrive, and active combat techniques.
- Command Center, Codices, mastery systems, achievements, cosmetics, currencies, and run history.
- Persistent build progression and unified backup UI.

The complete v1.4.1 implementation remains available only in the archive branch.

## Active runtime

The browser loads only:

- `src/main.js`
- `src/simple-game.js`
- `src/simple-data.js`
- `src/expanding-arena.js`
- `src/simple-ui-cleanup.js`
- `src/audio.js`
- `simple-game.css`

The service worker caches only the active game shell and uses:

```text
one-bullet-arena-v2.1.0-simple
```

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed**.
- Automated deterministic tests: **16/16 passed**.
- Failures, skipped tests, and cancelled tests: **0**.
- Coverage verifies:
  - release version `2.1.0-simple`;
  - readable three-enemy first wave;
  - gradual enemy-roster introduction;
  - monotonic capped population growth;
  - bounded enemy scaling;
  - unique run-upgrade catalog and upgrade-choice behavior;
  - arena stages at Waves 1, 3, 6, and 9;
  - strictly increasing playable area;
  - all arena stages contained inside the fixed Canvas;
  - combat geometry contains no objective or puzzle fields;
  - four isolated mobile touch-control safety zones;
  - returned progression data is protected from external mutation.

### Browser verification

- Playwright Browser Smoke: **18/18 passed**.
- Browsers/viewports:
  - Desktop Chromium at `1440×900`.
  - Mobile Landscape Chromium at `915×412` with touch enabled.
- Failures, flaky tests, and skipped tests: **0**.
- Coverage confirms:
  - only the simple expanding-arena runtime boots;
  - allowed states contain no mode, hub, objective, or puzzle screens;
  - one action starts Wave 1;
  - clearing a wave forces one upgrade selection;
  - choosing the upgrade starts the next wave;
  - arena stages advance automatically at Waves 3, 6, and 9;
  - playable area grows at every unlock;
  - the player and bullet remain inside the active boundaries;
  - mobile touch controls reserve clear combat space;
  - the document does not scroll;
  - the Canvas remains contained on desktop and mobile.

### Visual QA completed

Reviewed:

- Wave 1 central room on Desktop Chromium.
- Wave 9 complete arena on Desktop Chromium.
- Wave 1 central room on Mobile Landscape Chromium.
- Wave 9 complete arena on Mobile Landscape Chromium.
- Menu and upgrade selection on both projects.

Confirmed:

- Wave 1 visibly begins in a smaller central combat room;
- Wave 9 visibly uses the complete arena;
- locked space is dark and does not look like an interactive puzzle;
- the expansion border clearly defines the current playable space;
- combat cover remains simple and readable;
- no objective panel, sequence marker, puzzle instruction, region banner, or mode UI appears;
- mobile enemies no longer overlap the movement stick, Recall, Dash, or Pause buttons;
- HUD and controls remain inside the viewport.

## Remaining acceptance checks

These require merged/deployed play or physical hardware and are not marked complete:

1. Complete a normal run from Wave 1 through Wave 10 without QA shortcuts.
2. Confirm the expansions at Waves 3, 6, and 9 feel correctly timed during real play.
3. Review whether the central room is comfortable with the first two waves.
4. Review enemy pressure and readability near the fourteen-enemy cap.
5. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
6. Test installed PWA launch and offline restart with cache v2.1.0.
7. Verify the GitHub Pages deployment after Pull Request #28 is merged.

## Refresh note

The service-worker cache changes from `one-bullet-arena-v2.0.0-simple` to `one-bullet-arena-v2.1.0-simple`. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the previous map remains visible.
