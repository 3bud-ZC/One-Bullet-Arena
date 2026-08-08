# One Bullet Arena — Status

Last updated: 2026-08-08

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Live baseline on `main`: **v3.3.0 — Cinematic Visual Overhaul**
- Current milestone: **v3.5 — Art Direction, Interface, Graphics & Environment Refinement**
- Working branch: `feature/v3.5.0-art-direction-refinement`
- Pull Request: **#48 — draft, awaiting owner visual acceptance**
- Current canonical release identity: `3.3.0-visual-overhaul`
- v3.5 release promotion: **not locked yet; keep v3.3 identity until owner acceptance**
- Implementation status: **99% complete**
- Previous environment verification baseline: **green**
- Current dashboard redesign verification: **awaiting CI for the latest head**
- Current dashboard visual acceptance: **pending owner review**
- Gameplay geometry changed: **no**
- Collision geometry changed: **no**
- Combat balance/progression changed: **no**
- Merge to `main`: **pending owner visual acceptance and branch synchronization**

## v3.5 presentation stack

`EnvironmentArt → GraphicsRefinement → InterfaceRedesign → ArtDirection → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

The presentation stack is render/UI only. It does not mutate combat geometry, balance, progression, save schema, wave composition, arena bounds, or obstacle collision rectangles.

## Dashboard redesign pass — 2026-08-08

Dashboard code/test head before this STATUS update: `55727ed39f6eb67f3765ab4e8df687749db7c622`.

- Rebuilt the menu hierarchy as **`checkpoint-command-center-v4`**.
- Replaced the oversized two-line Arabic title with a restrained single-line title and compact subtitle.
- Removed the three large instructional cards (`احفظ / استكمل / اختر`) that duplicated checkpoint behavior and competed with the primary action.
- Rebuilt checkpoint mode around one large checkpoint hero panel plus a separate run-record side rail.
- Made **Continue** the only dominant primary action.
- Moved **New Run** and **Delete Checkpoint** into the secondary side rail so destructive/alternate actions no longer compete with Continue.
- Promoted the current Wave identity while keeping Upgrades and Run Score as compact supporting metrics.
- Consolidated High Score, Best Wave, and Checkpoint state into compact record rows.
- Rebuilt the fresh-run menu with the same hierarchy, a compact Fire → Ricochet → Recall flow, one dominant Start action, and a separate pilot-record rail.
- Preserved existing Continue / New Run / Delete Checkpoint actions and click regions.
- Updated Node source assertions and Playwright visual-capture expectations for the v4 menu revision.
- No gameplay, collision, progression, checkpoint schema, or arena geometry values were changed.

## Viewport, UI, and map refinement delivered

- Desktop browser presentation fills **100vw × 100dvh** without requiring Fullscreen API.
- Gameplay HUD uses three restrained tactical modules for bullet state, wave/run state, and HP/Dash/Shield state.
- Main menu and checkpoint presentation use the new v4 hero-and-record-rail command-center hierarchy.
- Upgrade Selection uses large category-driven cards with distinct VITALITY / DEFENSE / MOTION / RECALL / RICOCHET / IMPACT / BALLISTICS identities.
- Arabic RTL wrapping and CURRENT/NEXT level display were corrected.
- Early arena stages use Locked Sectors instead of empty black surrounding space.
- Arena borders and obstacle presentation were simplified and made more tactical.

## Graphics refinement delivered

- Player rebuilt as a tactical interceptor with layered hull, wing plates, reactor core, muzzle rail, engine exhaust, dash trails, and readiness arcs.
- Recoverable bullet rebuilt as a reactor-core projectile with layered rings, stronger trackable trail, recall tether, and directional muzzle flash.
- Enemy silhouettes are differentiated by geometry as well as color: Scout diamond drone, Brute armored chassis, Sniper hex platform, Charger directional wedge, Splitter segmented pentagon, and Warden octagonal boss chassis.
- Hostile shots are directional energy bolts rather than generic glowing circles.
- Obstacles retain the existing collision rectangles while receiving restrained inset/marker detailing.

## Environment art refinement delivered

- Added `OneBulletEnvironmentArtRuntime` above the graphics layer.
- Added modular industrial deck plating and low-contrast material variation inside the playable arena.
- Added stage-specific landmarks so arena expansion has a visual identity instead of only changing bounds:
  - Wave 1 / Stage 1: **Core Reactor Deck**;
  - Wave 3 / Stage 2: **Wing Relay Network**;
  - Wave 6 / Stage 3: **Corridor Grid**;
  - Wave 9+ / Stage 4: **Full Arena Open**.
- Added relay nodes, reactor rings, corridor gates, bridge rails, deck labels, conduit paths, and restrained animated energy-flow indicators.
- Added low-opacity machinery modules to Locked Sectors so closed space reads as inactive industrial structure rather than decorative hatch only.
- Added perimeter rail detail and stage indicators around active arena bounds.
- Added additional obstacle material insets and orientation markers without changing collision data.
- Environment detail intentionally stays below player/enemy/projectile contrast during combat.

## Last fully verified visual baseline

Verified environment code head: `25df1ff8bb3bc6b2311c457ef2f02ef8ebe6d61d`.

- Verify #959: **success**.
- Browser Smoke #226: **success**.
- Playwright: **192 total / 191 expected passed**.
- Unexpected failures: **0**.
- Flaky: **0**.
- Skipped: **1** — intentional mobile skip for the desktop-only viewport assertion.
- Coverage included desktop Chromium, Firefox, WebKit, and mobile landscape.
- Dedicated environment captures covered Wave 1, Wave 3, Wave 6, Wave 9+, and dense mixed-enemy combat.

This verification predates the v4 dashboard pass and must not be treated as verification of the latest head.

## Manual capture review baseline

The previous environment pass was reviewed across desktop and mobile-landscape states and showed no blocking clipping, combat-readability, or browser regression. The new v4 dashboard capture still requires owner review after the latest Browser Smoke run produces artifacts.

## Branch synchronization

The v3.5 feature branch currently diverges from `main`: it contains the v3.5 presentation work but is **4 commits behind `main`** due to post-v3.3 maintenance applied after this feature branch was created. Those maintenance changes must be synchronized before release lock so the v3.5 branch does not drop production fixes.

## Remaining work before v3.5 release lock

- Wait for the latest Verify and Browser Smoke results for the v4 dashboard head.
- Review the new fresh-menu and checkpoint-menu captures on desktop and mobile landscape.
- Apply any requested final dashboard spacing, typography, density, brightness, or CTA-priority corrections.
- Synchronize the four post-v3.3 `main` maintenance commits into the v3.5 branch and resolve STATUS documentation overlap safely.
- Promote canonical release metadata to the final v3.5 identity only after owner acceptance.
- Run one final release-identity Verify + Browser Smoke gate.
- Merge PR #48 and deploy GitHub Pages only after owner approval.
