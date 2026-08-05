# One Bullet Arena — Status

Last updated: 2026-08-06

## Release candidate

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Candidate: **v2.3.0 — Stable Single Path**
- Working branch: `refactor/v2.3-stable-single-path`
- Base release: **v2.2.0**
- Current state: implementation and local deterministic verification complete; GitHub Actions browser verification and deployed-build acceptance are pending.

## Product definition

The active product has one explicit route:

**Menu → Wave combat → automatic bullet return → choose one upgrade → next wave → defeat → retry/menu.**

The active runtime and production build contain no alternate modes, hubs, puzzle objectives, currencies, regions, equipment routes, story routes, or meta progression. The historical implementation remains under `archive/v1.4.1-full`, but it is not imported, cached, or deployed.

## Completed stabilization

### Release and PWA

- Replaced the broken Pages copy command with a deterministic `dist/` build.
- The production build includes HTML, CSS, manifest, icon, service worker, and every active ES module.
- Added deployment-shell verification.
- Service-worker navigation fallback now applies only to document navigation.
- Missing JavaScript, CSS, or icon requests no longer receive `index.html` as an invalid fallback.
- Old One Bullet Arena caches are removed without deleting unrelated origin caches.
- Mutable QA access is exposed only when the page is opened with `?qa=1`.

### Gameplay reliability

- Wave completion now locks combat, automatically recalls the bullet, and then opens one upgrade choice.
- Sniper and Charger telegraphs lock their attack direction before execution.
- Enemy projectiles use sub-stepped collision checks.
- Wave composition is deterministic and enforces caps for Brutes, Snipers, Chargers, and Splitters.
- Spawn selection checks player distance, other enemies, obstacles, HUD zones, and mobile controls.
- Combat collision resolution iterates across bounds, obstacles, HUD zones, and touch controls.
- The Wave Shield upgrade has one meaningful level instead of two ineffective extra stacks.
- Dash and recall readiness reset cleanly at the start of each wave.
- Particle and floating-text collections remain bounded.

### UI / UX

- Reworked the main menu around the one-bullet rule and single progression path.
- Added contextual Wave 1 guidance instead of a separate tutorial route.
- Upgrade cards show current and post-selection values.
- Added clearer bullet, dash, recall, wave, score, health, shield, and arena-state feedback.
- Added useful game-over statistics: score, kills, upgrades, accuracy, run time, and damage taken.
- Added visible audio state and menu/pause mute controls.
- Mobile movement is restricted to the visible fixed joystick area.
- HUD and touch controls reserve collision-safe areas in the fully opened arena.
- Reduced-motion preference disables camera shake and most particles.

### Architecture

- Split the previous gameplay/render/input/UI monolith into focused modules.
- Added centralized configuration and storage modules.
- Replaced the stale mobile browser test with tests against the current API.
- Playwright now discovers all browser spec files instead of silently running one named file.
- The production builder includes only the active application shell; the historical archive remains inert.

## Local verification

Executed on the candidate source:

- JavaScript syntax checks: **passed**.
- Deterministic tests: **11/11 passed**.
- Production build: **passed**.
- Deployment-shell audit: **15 required files verified**.
- Failures, skips, and cancellations in local deterministic verification: **0**.

## Browser verification configured

The GitHub Actions browser suite is configured for:

- Desktop Chromium at `1440×900`.
- Mobile Landscape Chromium at `915×412` with touch enabled.
- Desktop WebKit at `1440×900`.

Coverage includes:

- the single state path;
- automatic bullet return after the final kill;
- one required upgrade between waves;
- locked Sniper telegraph direction;
- automatic arena expansion;
- high-speed bullet tunneling prevention;
- production QA-hook isolation;
- canvas containment and no document scrolling;
- HUD/touch combat-safe zones;
- fixed joystick hit-area behavior;
- screenshots for menu, Wave 1, upgrades, Wave 9, and game over.

## Remaining acceptance checks

These are not marked complete until the Pull Request workflows and real hardware checks are finished:

1. GitHub Actions Verify workflow passes on the candidate commit.
2. GitHub Actions Browser Smoke passes across Chromium, mobile Chromium, and WebKit.
3. The deployed GitHub Pages artifact is opened and checked after merge.
4. A normal manual run reaches at least Wave 15 without QA shortcuts.
5. Chrome Android, Samsung Internet, and Safari iOS are checked on physical devices.
6. Installed PWA launch, offline restart, and cache upgrade from v2.2 are checked on physical devices.
