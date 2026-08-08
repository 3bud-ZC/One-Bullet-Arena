# One Bullet Arena — Status

Last updated: 2026-08-08

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Live baseline on `main`: **v3.3.0 — Cinematic Visual Overhaul**
- Current milestone: **v3.5 — Art Direction, Interface & Graphics Refinement**
- Working branch: `feature/v3.5.0-art-direction-refinement`
- Pull Request: **#48 — draft, awaiting owner visual acceptance**
- Current canonical release identity: `3.3.0-visual-overhaul`
- v3.5 release promotion: **not locked yet; keep v3.3 identity until owner acceptance**
- Implementation status: **98% complete**
- Automated verification: **green**
- Manual capture review: **complete for current graphics pass**
- Gameplay geometry changed: **no**
- Collision geometry changed: **no**
- Combat balance/progression changed: **no**
- Merge to `main`: **pending owner visual acceptance**

## Live deployment baseline

- PR #45 (`v3.3.0-visual-overhaul`) is merged to `main`.
- GitHub Pages deployment was repaired through PR #47 after the deploy workflow was found to be hard-coded to the older Warden boot runtime.
- The Pages build gate tracks the active presentation runtime chain.

## v3.5 work completed

### Desktop viewport

- Desktop browser mode fills **100vw × 100dvh** without requiring the Fullscreen API.
- Removed boxed 16:9 browser chrome, desktop shell padding, and the large outer rounded frame.
- Existing mobile-landscape responsive behavior remains supported.

### Dashboard / HUD

- Rebuilt gameplay HUD as three restrained tactical modules: bullet/recall, run/wave, HP/dash/shield.
- Reduced duplicate borders, repeated chrome, and excessive glow.

### Map / arena

- Added cleaner sector-grid treatment, restrained radar rings, simplified arena borders, and visual Locked Sectors.
- Locked Sectors make unavailable early-stage space read as future deck structure without becoming playable space.
- Arena bounds and expansion geometry remain unchanged.

### Shapes / obstacles

- Replaced nested rounded obstacle styling with chamfered tactical blocks.
- Added restrained inset detailing and central tactical markers while preserving the same rectangles and collision data.

### Checkpoint / main menu redesign

- Added `OneBulletInterfaceRedesignRuntime` above the ArtDirection layer.
- Rebuilt fresh menu and checkpoint menu as a tactical command-center composition.
- Improved Continue/New Run hierarchy, checkpoint cards, stat cells, delete action separation, and Arabic RTL wrapping.

### Upgrade screen redesign

- Rebuilt Upgrade Selection as large category-driven cards.
- Added distinct `VITALITY`, `DEFENSE`, `MOTION`, `RECALL`, `RICOCHET`, `IMPACT`, and `BALLISTICS` identities.
- Added category colors/glyphs, stronger hover state, level dots, explicit `CURRENT`/`NEXT`, and improved Arabic wrapping.
- Upgrade values, stack limits, and gameplay effects remain unchanged.

### Combat graphics refinement

- Added `OneBulletGraphicsRefinementRuntime` as the new top presentation runtime.
- Rebuilt the player as a layered **tactical interceptor** silhouette with hull, wing plates, reactor core, muzzle rail, engine exhaust, dash trails, and restrained readiness arcs.
- Rebuilt the recoverable bullet as a brighter **reactor-core projectile** with a cleaner rotating core, layered energy rings, improved trail, recall tether, and directional muzzle flash.
- Rebuilt enemy silhouettes so combat types are identifiable by geometry as well as color:
  - Scout: rotating diamond drone;
  - Brute: armored square chassis with side armor;
  - Sniper: hexagonal ranged platform with forward rail;
  - Charger: aggressive directional wedge;
  - Splitter: segmented pentagonal core;
  - Warden: large octagonal boss chassis with rotating inner frame and external guard rails.
- Rebuilt hostile shots as directional energy bolts with readable motion trails instead of generic glowing circles.
- Added restrained enemy outer threat arcs without changing hitboxes.
- Graphics pass remains presentation-only: no player/enemy speed, health, damage, radius, collision, spawn, wave, or progression values changed.

## Active runtime chain

`GraphicsRefinement → InterfaceRedesign → ArtDirection → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- `GraphicsRefinement`, `InterfaceRedesign`, and `ArtDirection` are presentation-only.
- `VisualOverhaul` remains active beneath them.
- World2D, Warden, Checkpoint, CombatDepth, event schema, save schema, combat values, and progression contracts are unchanged.

## Final automated verification for current graphics pass

Verified code head: `3fda1278879d84ee606de69d6e06523e5703d35a`.

- Verify #927: **success**.
- Browser Smoke #210: **success**.
- Playwright tests: **180 total**.
- Expected/passed: **179**.
- Unexpected failures: **0**.
- Flaky: **0**.
- Skipped: **1** — intentional mobile skip for the desktop-only viewport-dimension assertion.
- Browser coverage includes desktop Chromium, Firefox, WebKit, and mobile landscape.
- Dedicated graphics captures cover menu, mixed enemy combat lineup, recoverable bullet/recall state, hostile projectile, and Warden presentation across configured browser projects.

## Manual capture review

Current capture review confirms:

- player silhouette is more readable and visually distinct from enemies;
- Scout, Brute, Sniper, Charger, and Splitter can be differentiated by silhouette instead of color alone;
- Warden reads as a larger boss-class target;
- the bullet remains visually dominant enough to track during recall without overpowering the scene;
- hostile projectile direction is easier to read;
- the new graphics remain coherent with the tactical HUD, Locked Sectors, and map styling;
- no blocking clipping or browser regression was found;
- no gameplay or collision geometry changed.

## Remaining work before v3.5 release lock

- Owner hands-on visual review of the current graphics pass.
- Apply any requested final polish to silhouettes, brightness, scaling, map darkness, or VFX density.
- Inspect unusual desktop aspect ratios during owner review.
- Promote release metadata from v3.3 to the final v3.5 identity only after visual acceptance.
- Run one final Verify + Browser Smoke gate after the release identity is locked.
- Merge PR #48 and deploy GitHub Pages only after owner approval.

## Owner acceptance gate

1. Inspect the new player interceptor during movement and Dash.
2. Fire, ricochet, recall, and catch the bullet and verify its path stays readable.
3. Fight Scout / Brute / Sniper / Charger / Splitter together and judge silhouette clarity.
4. Inspect the Warden and confirm it visually reads as boss-class.
5. Check hostile projectiles during dense combat.
6. Check Dashboard, map, Upgrade, Menu/Checkpoint, Pause, Game Over, and mobile landscape together with the new graphics.
7. Report any excessive glow, darkness, clutter, tiny details, confusing silhouette, stretching, or readability issue before merge.
