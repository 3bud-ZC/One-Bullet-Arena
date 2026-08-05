# One Bullet Arena — Status

Last updated: 2026-08-06

## Release candidate

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Candidate: **v2.3.0 — Stable Single Path**
- Pull Request: **#30 — refactor: stabilize the complete single-path game**
- Working branch: `refactor/v2.3-stable-single-path`
- Base release: **v2.2.0**
- Current state: implementation, deterministic verification, production-build verification, Chromium/WebKit browser regression, and final visual review complete; merge, deployed-build acceptance, and physical-device checks remain.

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
- Player and enemy projectiles use sub-stepped collision checks.
- Wave composition is deterministic and enforces caps for Brutes, Snipers, Chargers, and Splitters.
- Spawn selection checks player distance, other enemies, obstacles, HUD zones, and mobile controls.
- Combat collision resolution iterates across bounds, obstacles, HUD zones, and touch controls.
- The Wave Shield upgrade has one meaningful level instead of two ineffective extra stacks.
- Dash and recall readiness reset cleanly at the start of each wave.
- Pointer input continues safely when a browser rejects pointer capture.
- Particle and floating-text collections remain bounded.

### UI / UX

- Reworked the main menu around the one-bullet rule and single progression path.
- Added contextual Wave 1 guidance instead of a separate tutorial route.
- Upgrade cards show current and post-selection values.
- Added clearer bullet, dash, recall, wave, score, health, shield, and arena-state feedback.
- Added useful game-over statistics: score, kills, upgrades, hits/shots, run time, and damage taken.
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

## Verification results

### Deterministic and build verification

- GitHub Actions **Verify**: passed on commit `12ad44093c1e270165808e8be2bc931cdc6f5edf`.
- JavaScript syntax checks: **passed**.
- Deterministic tests: **11/11 passed**.
- Production build: **passed**.
- Deployment-shell audit: **15 required files verified**.
- Failures, skips, and cancellations: **0**.

### Browser regression

GitHub Actions **Browser Smoke** passed on commit `12ad44093c1e270165808e8be2bc931cdc6f5edf` across:

- Desktop Chromium at `1440×900`.
- Mobile Landscape Chromium at `915×412` with touch enabled.
- Desktop WebKit at `1440×900`.

Results:

- Total test/project cases: **33**.
- Passed: **31**.
- Failed: **0**.
- Flaky: **0**.
- Intentionally skipped: **2** — the hardware-style joystick gesture test is mobile-only and is skipped in the two desktop projects.

Coverage confirms:

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
- safe fallback when pointer capture is rejected.

### Visual review

Final generated screenshots were reviewed for Desktop Chromium, Mobile Landscape Chromium, and Desktop WebKit:

- main menu;
- Wave 1;
- upgrade selection;
- fully opened Wave 9 arena;
- game-over screen.

Confirmed:

- Arabic text remains readable and unclipped.
- Upgrade cards remain fully inside the landscape viewport.
- HUD and touch controls do not cover combat entities.
- Wave 9 remains readable with the full enemy roster.
- Retry and menu actions remain visible on game over.
- Game-over statistics use hits/shots rather than a misleading accuracy percentage.

## Remaining acceptance checks

These are not marked complete until the release is merged and checked on production or physical hardware:

1. Merge Pull Request #30 after the final documentation-only workflow run passes.
2. Confirm the generated `dist/` build deploys successfully to GitHub Pages.
3. Open and inspect the deployed production URL after cache propagation.
4. Complete a normal manual run through at least Wave 15 without QA shortcuts.
5. Check Chrome Android, Samsung Internet, and Safari iOS on physical devices.
6. Check installed PWA launch, offline restart, and cache upgrade from v2.2 on physical devices.
