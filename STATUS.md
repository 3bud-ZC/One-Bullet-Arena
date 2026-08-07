# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v3.2.0 — True 2D Arena and Gameplay Feel**
- Pull Request #44: **squash-merged into `main`**
- Release merge commit: `37cc2334aedcc7167bf75c3670866f21fdf4469d`
- Final tested feature head: `17a4d8fbe8a3a4a2bde49180aa16d11288260bb7`
- Implementation: **100% complete**
- Verify #817: **success**
- Browser Smoke #166: **success**
- Playwright: **144/144 passed**
- Unexpected failures: **0**
- Flaky tests: **0**
- Skipped tests: **0**
- Permanent visual captures: **64**
- New True 2D captures inspected: **12/12**
- Owner deployed acceptance: **pending**
- GitHub Pages public deployment: **not independently confirmed from the assistant environment**
- Next milestone: **blocked until owner accepts the True 2D release**

## Release identity

- Public release version: `3.2.0-true-2d`.
- Public release label: `v3.2.0-true-2d`.
- Release channel: `visual-world-2d`.
- Service Worker cache: `one-bullet-arena-v3.2.0-true-2d`.
- Gameplay event schema remains `4`.
- Checkpoint schema remains `1`.
- Warden contract remains `3.1.0-a-warden`.
- Checkpoint Progression contract remains `3.0.0-checkpoint`.
- Combat Depth contract remains `2.9.0-combat`.

## True 2D world delivered

- Replaced the flat abstract arena presentation with a layered top-down industrial combat deck.
- Added deterministic floor tiles with stage-aware accents and readable panel seams.
- Added horizontal and vertical combat lanes with animated route markings.
- Added a central mechanical platform, rotating rings, and stage-dependent floor details.
- Added corner machinery, embedded perimeter lights, stronger locked-space separation, and an arena drop shadow.
- Arena borders now read as physical walls with thickness, an inner rim, warning lights, and controlled glow.
- Obstacles now have top faces, side faces, floor shadows, inset panels, and hazard markings.
- Enemies, the Warden, hostile projectiles, the player, and the bullet now have grounded shadows.
- Player and bullet lighting creates local depth without hiding combat-critical information.
- The active arena, enemies, bullet, hazards, and controls retain their original gameplay geometry.

## Gameplay feel improvements

- Replaced random frame jitter with deterministic impact shake.
- World shake no longer moves the HUD, upgrade cards, pause screen, Game Over screen, or touch controls.
- Added visual-only motion smoothing that does not alter movement speed or collision behavior.
- Added controlled player lean, movement echoes, motion trails, and dash readability.
- Added a projected bullet trail, bullet shadow, and clearer flight direction.
- Added a compact desktop aiming reticle that reflects whether the bullet is ready or currently in the arena.
- Reduced-motion mode continues to disable or reduce non-essential movement effects.

## Architecture

- Added `src/core/world-2d-runtime.js` above the accepted Warden Runtime.
- Activated `OneBulletWorld2DRuntime` from `src/main.js`.
- Runtime chain is now:

  `World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- Added pure helpers for deterministic tile variation and frame-rate-independent visual smoothing.
- Service Worker and release validation include the new runtime.
- Checkpoint saves remain compatible because no persistent schema or gameplay entity data changed.
- No base collision bounds, obstacle rectangles, movement speeds, enemy speeds, wave composition, damage values, or upgrade values were changed.

## Verification completed

### Deterministic coverage

- True 2D release and runtime contract.
- Frame-rate-independent smoothing approaches targets without overshoot.
- Floor tile variants are deterministic and bounded.
- Runtime remains render-only and does not mutate gameplay geometry.
- Release, Service Worker, runtime chain, event schema, checkpoint, UI, keyboard, movement, Warden, and wave contracts.

### Browser coverage

- New runtime activation and release diagnostics.
- Core wave loop, upgrades, defeat, and retry/menu behavior.
- Movement and physical keyboard controls under Arabic and English layouts.
- Touch movement and safe combat zones.
- Checkpoint creation, reload, restoration, clearing, and Game Over continue.
- Perfect Catch, Precision, Bank Shot, Momentum, and Overdrive.
- Warden block, guard break, flank damage, and guard restoration.
- Existing PWA shell and release handshake.

The final suite passed on:

- Desktop Chromium;
- Mobile Landscape Chromium;
- Desktop Firefox;
- Desktop WebKit.

### Visual review

The full permanent visual set contains **64 captures**. The new True 2D review contains **12 captures** covering:

1. layered main-menu arena preview;
2. active combat map with multiple enemy silhouettes and physical obstacles;
3. Wave 7 Warden combat map with bullet flight and guard readability;
4. all three states across all four Playwright projects.

Manual inspection confirmed:

- no HUD or overlay movement during world shake;
- no clipping or overlap in the desktop layouts;
- touch controls remain outside the primary combat focus on mobile landscape;
- arena tiles, walls, obstacles, player, bullet, and enemies remain readable;
- Arabic text remains correctly directed and contained;
- Chromium, Firefox, and WebKit render the map consistently;
- no blocking visual regression was found.

## Scope retained

The product path remains:

`Main Menu → New Run or Continue → Wave Combat → Upgrade → Harder Wave → Defeat → Continue/New Run/Menu`

No new enemy, mode, boss, currency, shop, hub, equipment, story, objective, puzzle, account, cloud save, or online leaderboard was added.

## Owner acceptance gate

1. Confirm the menu footer displays `v3.2.0-true-2d`.
2. Start a new run and inspect the floor tiles, lanes, center platform, wall depth, and obstacle faces.
3. Move continuously in all directions and confirm movement still feels responsive while the visual lean and echoes remain smooth.
4. Fire, ricochet, recall, and catch the bullet while checking the new trail, shadow, and aiming reticle.
5. Take damage and land heavy hits to confirm the world shakes while the HUD stays fixed.
6. Reach or continue to Wave 7 and verify the Warden remains readable against the new map.
7. Test mobile landscape and confirm the movement, Recall, Dash, and Pause controls do not hide enemies or projectiles.
8. Test checkpoint Continue, upgrades, defeat, and returning to the menu.
9. Report any performance drop, visual clutter, dark area, unreadable enemy, control regression, or collision mismatch before the next milestone begins.
