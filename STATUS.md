# One Bullet Arena — Status

Last updated: 2026-08-05

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current release: **v2.2.0 — Clean Core Stabilization**
- Pull Request #29: **squash-merged into `main`**
- v2.2.0 merge commit: `93767ce997b4d4569bd52e7c5fa79bb300c68380`
- Previous release: **v2.1.0**
- Previous full release preserved at: `archive/v1.4.1-full`
- GitHub Pages deployment: **triggered by the Pull Request #29 merge and this status update**
- Current state: **implementation, repository cleanup, deterministic verification, Chromium verification, PWA update, documentation, desktop/mobile visual review, and merge complete; deployed-build and physical-device acceptance remain**

## Product definition

The active game keeps one explicit loop:

1. Start one run.
2. Defeat every enemy in the current wave.
3. Recover the single bullet.
4. Choose one of three abilities.
5. Enter the next, harder wave.
6. Continue until defeat.

There is one map and one game. No alternate mode, puzzle, objective route, or meta progression can block the wave loop.

## Clean runtime architecture

The active game now boots directly into one `OneBulletGame` runtime.

Active files:

- `src/main.js`
- `src/game.js`
- `src/game-data.js`
- `src/arena.js`
- `src/audio.js`
- `game.css`

Removed from the active branch:

- `src/simple-game.js`
- `src/simple-data.js`
- `src/expanding-arena.js`
- `src/simple-ui-cleanup.js`
- `simple-game.css`
- their superseded Node and browser tests

There are no constructor-time gameplay installers or prototype monkey patches. Arena progression and UI behavior are part of the direct runtime.

## Gameplay and stability changes

- First two waves use Scouts only.
- Brute unlocks at Wave 3, Sniper at Wave 4, Charger at Wave 6, and Splitter at Wave 8.
- Active enemy population grows gradually and remains capped at fourteen.
- Enemy health, movement speed, and projectile speed use bounded scaling.
- The arena still opens automatically at Waves 3, 6, and 9.
- High-speed bullet motion is sub-stepped to prevent tunneling through enemies and cover.
- Circle/rectangle resolution now recovers correctly when an entity center is inside geometry.
- Enemy projectiles collide with cover.
- Snipers display a firing telegraph before releasing a projectile.
- Chargers retain a visible charge telegraph.
- Overlapping enemies separate from each other.
- Splitter children respect the global active-enemy cap.
- Particle count is bounded.
- Ability selection avoids repeating the previous three cards when alternatives exist.
- Twelve active in-run abilities remain; no mode-specific or persistent build abilities exist.

## Browser, mobile, accessibility, and PWA

- External Google Fonts were removed.
- The portrait rotation banner was removed completely.
- The document contains only the game shell, Canvas, script, and an invisible accessibility live region.
- The responsive shell uses `100dvh`, safe areas, and no document scrolling.
- Four mobile combat-safe zones keep entities out from underneath Move, Recall, Dash, and Pause controls.
- State changes and wave starts are announced through `aria-live` without adding visible page chrome.
- Existing v2.1 highest score, highest wave, and audio preferences are migrated automatically.
- The offline application shell caches only active v2.2 files.
- Service-worker cache: `one-bullet-arena-v2.2.0-clean`.

## Automated verification

### Deterministic tests

- JavaScript syntax checks: **passed**.
- Deterministic tests: **15/15 passed**.
- Failures, skipped tests, and cancelled tests: **0**.
- Final Verify workflow on the Pull Request #29 documentation commit: **passed**.
- Coverage includes:
  - release version;
  - readable Scout-only opening waves;
  - gradual enemy unlocks;
  - monotonic capped population;
  - bounded enemy scaling;
  - active ability catalog and stack normalization;
  - upgrade-card repeat avoidance;
  - automatic arena expansion;
  - increasing playable area;
  - absence of objective data;
  - isolated arena data;
  - recovery from center-inside-obstacle collisions;
  - non-overlapping touch safe zones;
  - combat-entity removal from every touch zone.

### Browser tests

- Playwright Browser Smoke: **18/18 passed**.
- Projects:
  - Desktop Chromium at `1440×900`.
  - Mobile Landscape Chromium at `915×412` with touch enabled.
- Failures, flaky tests, and skipped tests: **0**.
- Final Browser Smoke workflow on the Pull Request #29 documentation commit: **passed**.
- Coverage confirms:
  - only the clean runtime boots;
  - no mode, hub, puzzle, or objective state exists;
  - Wave 1 starts with three enemies;
  - one ability is required between waves;
  - the arena expands at Waves 3, 6, and 9;
  - high-speed bullets cannot tunnel through an enemy;
  - mobile safe zones keep combat entities visible;
  - the Canvas remains contained without document scrolling;
  - no external font is loaded;
  - Portrait contains no rotation banner or external page chrome.

## Visual QA completed

Reviewed on both desktop and mobile landscape:

- main menu;
- Wave 1;
- ability-selection screen;
- fully opened Wave 9 arena;
- game-over screen.

Confirmed:

- Arabic text renders without clipping;
- the HUD is compact and readable;
- the menu contains one primary Play action;
- ability cards remain inside the screen;
- Wave 1 and Wave 9 geometry are visually distinct;
- touch controls remain inside the viewport;
- enemies stay clear of touch controls;
- game-over actions remain visible;
- no old UI layer, rotation instruction, objective panel, or mode selector appears.

## Remaining acceptance checks

These require the deployed build or physical hardware and are not marked complete:

1. Complete a normal run through Wave 10 without QA shortcuts.
2. Confirm the slower enemy unlock curve feels correct during real play.
3. Review Wave 9+ pressure near the fourteen-enemy cap.
4. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
5. Test installed PWA launch and offline restart with cache v2.2.0.
6. Verify the deployed GitHub Pages build after deployment completes.

## Refresh note

The service-worker cache changes from `one-bullet-arena-v2.1.0-simple` to `one-bullet-arena-v2.2.0-clean`. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if an older build remains visible.
