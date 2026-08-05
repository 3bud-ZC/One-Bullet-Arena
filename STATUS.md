# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release candidate: **v2.4.0 — Modular Runtime and UX Stabilization**
- Pull Request: **#31**
- Working branch: `refactor/v2.3-complete-stabilization`
- Current state: **implementation, deterministic verification, cross-browser verification, PWA packaging, gameplay reliability fixes, and UI/UX restructuring complete; physical-device and deployed-build acceptance remain**

## Product definition

The active game has one explicit path only:

1. Start one run.
2. Defeat every enemy in the current wave.
3. Recover the single bullet automatically after the final kill.
4. Choose one of three in-run upgrades.
5. Enter the next, harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

There is no alternate mode, hub, puzzle route, objective branch, currency, inventory, or meta-progression path in the active runtime.

## Active architecture

The browser boots `OneBulletRuntime` from `src/game-runtime.js`.

Active modules:

- `src/main.js` — application entry point and PWA registration.
- `src/game-runtime.js` — active orchestration layer and focused gameplay/UX overrides.
- `src/game.js` — stable reusable combat engine.
- `src/input-controller.js` — keyboard, pointer, multi-touch, and lifecycle input.
- `src/spawn-system.js` — deterministic scored spawn selection.
- `src/ui-renderer.js` — UI primitives, upgrade comparisons, cooldown bars, and touch layout.
- `src/game-data.js` — enemy, upgrade, scaling, and wave data.
- `src/arena.js` — arena stages, safe zones, geometry, and iterative collision solving.
- `src/audio.js` — generated music, sound effects, mute state, and persistence.

The active runtime does not use constructor-time installers, prototype monkey patches, or competing game modes.

## Gameplay reliability completed

- The final enemy kill starts an automatic bullet recall instead of leaving the wave apparently blocked.
- Upgrade selection opens only after the returning bullet reaches the player.
- Sniper aim direction is locked when the firing telegraph begins.
- Charger direction is locked when the charge telegraph begins.
- Telegraph visuals display the locked attack line, allowing a real dodge window.
- Wave Shield has one effective level instead of repeated ineffective stacks.
- Dangerous enemy pressure remains bounded while every generated wave retains a Scout baseline.
- Spawn selection scores multiple candidates and avoids:
  - the player;
  - existing enemies;
  - arena obstacles;
  - HUD panels;
  - mobile Move, Recall, Dash, and Pause controls.
- Collision recovery now runs iterative passes across bounds, obstacles, HUD zones, and mobile-control zones.
- High-speed bullet movement remains sub-stepped to prevent tunneling.
- Enemy population and particle count remain capped.

## UI/UX completed

- The main menu now explains the single loop as **Fire → Recover → Upgrade**.
- Wave 1 contains a contextual tutorial instead of a separate instruction screen.
- The HUD now exposes:
  - bullet state;
  - recall progress;
  - Dash cooldown;
  - health and shield;
  - wave and enemy count;
  - score;
  - upgrade count;
  - arena stage;
  - mute state.
- Upgrade cards show the current value and the value after selection.
- Game Over shows score, time, kills, best combo, shots, hits, upgrades, and damage taken.
- The visible mobile joystick and its activation area now use the same fixed circular layout.
- Touch movement no longer overwrites the aiming pointer used by another touch.
- Portrait mobile orientation guidance was restored as page-level guidance without adding an alternate game screen.
- Keyboard focus is visible.
- Reduced-motion preferences reduce particles, shake persistence, and shell effects.
- HUD and mobile controls are protected combat-safe areas.

## Release, PWA, and CI completed

- GitHub Pages packages every runtime, style, manifest, icon, and Service Worker asset.
- Deployment verifies all modular runtime files before publishing.
- Service Worker navigation fallback is limited to navigation requests and no longer returns HTML for missing JavaScript or CSS assets.
- Cache version: `one-bullet-arena-v2.4.0-stable`.
- The mutable QA runtime is exposed only through `?qa=1`.
- The repository currently has no lockfile, so CI consistently uses `npm install --ignore-scripts --no-audit --no-fund`.
- Playwright installs every browser that the configuration executes.

## Automated verification

### Deterministic verification

- JavaScript syntax checks: **passed**.
- Deterministic tests: **13/13 passed**.
- Verify workflow run **606**: **passed**.
- Failures, skipped tests, and cancelled tests: **0**.

Coverage includes:

- release version;
- gradual enemy progression and bounded pressure;
- upgrade stack boundaries and current/next effect descriptions;
- automatic arena expansion;
- obstacle collision recovery;
- HUD and mobile safe zones;
- iterative combat collision resolution;
- spawn avoidance for players, enemies, obstacles, and UI.

### Browser verification

- Browser Smoke workflow run **113**: **passed**.
- Playwright tests: **36/36 passed** across four projects.
- Projects:
  - Desktop Chromium at `1440×900`.
  - Mobile Landscape Chromium at `915×412` with touch enabled.
  - Desktop Firefox at `1440×900`.
  - Desktop WebKit at `1440×900`.
- Failures, flaky tests, and skipped tests: **0**.

Browser coverage confirms:

- only the modular single-path runtime boots;
- one action starts Wave 1;
- one upgrade is required between waves;
- the bullet recalls automatically after the last enemy;
- Sniper and Charger telegraphs retain their locked directions;
- the arena expands at Waves 3, 6, and 9;
- high-speed bullets cannot tunnel through enemies;
- mobile control zones keep combat entities clear;
- the Canvas remains contained without document scrolling;
- production does not expose the mutable QA object.

## Remaining acceptance checks

These checks require the merged/deployed build or physical hardware and are not marked complete:

1. Play a normal run through at least Wave 15 without QA shortcuts.
2. Confirm subjective pacing at Waves 8–15 and near the fourteen-enemy cap.
3. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
4. Test simultaneous movement, aiming, firing, recall, and Dash on a real multi-touch device.
5. Install the PWA, launch it offline, and confirm cache replacement from v2.2/v2.3 to v2.4.
6. Verify the final GitHub Pages deployment after Pull Request #31 is merged.

## Refresh note

After deployment, use a hard refresh on desktop or clear stored site data on mobile if an older Service Worker build remains visible.
