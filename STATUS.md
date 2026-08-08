# One Bullet Arena — Status

Last updated: 2026-08-08

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Live baseline on `main`: **v3.3.0 — Cinematic Visual Overhaul**
- Current milestone: **v3.5 — Art Direction & Viewport Refinement**
- Working branch: `feature/v3.5.0-art-direction-refinement`
- Pull Request: **#48 — draft, awaiting owner visual acceptance**
- Current canonical release identity: `3.3.0-visual-overhaul`
- v3.5 release promotion: **not locked yet; keep v3.3 identity until owner acceptance**
- Implementation status: **95% complete**
- Automated verification: **green**
- Manual capture review: **complete for the current interface pass**
- Gameplay geometry changed: **no**
- Collision geometry changed: **no**
- Combat balance/progression changed: **no**
- Merge to `main`: **pending owner visual acceptance**

## Live deployment baseline

- PR #45 (`v3.3.0-visual-overhaul`) is merged to `main`.
- GitHub Pages deployment was repaired through PR #47 after the deploy workflow was found to be hard-coded to the older Warden boot runtime.
- The Pages build gate now tracks the active visual runtime chain instead of the obsolete v3.1 boot check.

## v3.5 work completed

### Desktop viewport

- Added `art-direction.css` as a dedicated presentation layer.
- Desktop browser mode fills **100vw × 100dvh** without requiring the Fullscreen API.
- Removed the boxed browser shell, outer rounded container, large browser-frame border, and desktop shell padding.
- The canvas and game frame occupy the full available browser viewport on desktop.
- Existing mobile-landscape behavior remains available through the lower responsive layer.

### Dashboard / HUD

- Added `OneBulletArtDirectionRuntime` above `OneBulletVisualOverhaulRuntime`.
- Rebuilt the gameplay HUD as three restrained tactical modules:
  - left: bullet state + recall readiness;
  - center: game identity + wave + enemies + score + upgrades + arena stage;
  - right: HP + segmented Dash/Shield state.
- Reduced duplicate borders, repeated chrome, and excessive glow.

### Map / arena

- Replaced the noisy floor-detail pass with a cleaner sector grid and restrained radar rings.
- Simplified arena borders to structural lines plus four corner brackets.
- Added visual **Locked Sectors** around early arena stages so unused screen space reads as future deck/expansion space rather than empty black area.
- Locked sectors show subtle grid/hatching, structural boundaries, and next-unlock information where space allows.
- Arena expansion geometry remains unchanged.

### Shapes / obstacles

- Replaced nested rounded obstacle frames with cleaner chamfered tactical blocks.
- Reduced decorative bolts, repeated inner borders, and stripe noise.
- Existing obstacle rectangles and collision data remain unchanged.

### Overlay/frame cleanup

- Removed the extra VisualOverhaul wrapper frame from Upgrade Selection.
- Removed the extra wrapper frame from Pause and Game Over while retaining Checkpoint behavior.
- Removed the redundant VisualOverhaul touch-control ring layer.
- Simplified banner presentation using the accepted lower visual-design presentation.

### Checkpoint / main menu redesign

- Added `OneBulletInterfaceRedesignRuntime` above the ArtDirection layer.
- Rebuilt the main menu as a tactical command-center composition inspired by the approved visual references.
- Added a stronger Arabic title hierarchy with restrained radar framing.
- Rebuilt checkpoint presentation around clear Continue / New Run decisions.
- Added three structured checkpoint cards for Save / Continue / Choose.
- Rebuilt checkpoint, best-wave, and high-score cells as compact tactical stat modules.
- Kept Delete Checkpoint visually separated as a destructive action.
- Improved Arabic RTL wrapping so menu card copy no longer truncates incorrectly.

### Upgrade screen redesign

- Rebuilt Upgrade Selection as three large category-driven tactical cards.
- Added visual upgrade categories including `VITALITY`, `DEFENSE`, `MOTION`, `RECALL`, `RICOCHET`, `IMPACT`, and `BALLISTICS`.
- Each category now has its own accent color, glyph, header treatment, and level indicators.
- Added hover lift/glow without changing selection behavior.
- Reworked current/next level presentation to explicit `CURRENT` and `NEXT` values to avoid RTL arrow reversal.
- Improved RTL text wrapping for names and descriptions.
- Upgrade values, stack limits, and gameplay effects remain unchanged.

## Active runtime chain

`InterfaceRedesign → ArtDirection → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- `InterfaceRedesign` is presentation/UI only.
- `ArtDirection` is presentation/render only.
- `VisualOverhaul` remains active beneath both layers.
- World2D, Warden, Checkpoint, CombatDepth, event schema, save schema, combat values, and progression contracts are unchanged.

## Final automated verification for current interface pass

Verified code head: `2155f7a0650b8938b21bee7353e90d4ca27282c0`.

- Verify #905: **success**.
- Browser Smoke #199: **success**.
- Playwright tests: **168 total**.
- Expected/passed: **167**.
- Unexpected failures: **0**.
- Flaky: **0**.
- Skipped: **1** — intentional mobile skip for the desktop-only viewport-dimension assertion.
- Browser coverage includes desktop Chromium, Firefox, WebKit, and mobile landscape.
- Desktop viewport assertion confirms the game frame and canvas match the browser viewport while `document.fullscreenElement` is false.
- Interface captures cover fresh menu, checkpoint menu, combat, Upgrade Selection, Pause, mobile landscape, and cross-browser states.

## Manual capture review

Current capture review confirms:

- the checkpoint/menu hierarchy is substantially closer to the approved tactical reference direction;
- Continue and New Run choices are visually distinct;
- checkpoint feature cards and stat cells remain readable without nested-frame clutter;
- Upgrade cards have clear category identity and hierarchy;
- `CURRENT 0 / NEXT 1` level copy renders correctly after the RTL polish fix;
- early arena stages retain meaningful Locked Sectors;
- dashboard, map, and redesigned interfaces remain visually consistent;
- no blocking clipping or browser regression was found;
- no gameplay or collision geometry changed.

## Remaining work before v3.5 release lock

- Owner hands-on review of the current visual pass.
- Inspect unusual desktop aspect ratios during owner review; the gameplay simulation remains the fixed 1280×720 logical world while the desktop presentation fills the browser viewport.
- Apply any owner-reported spacing, scaling, darkness, glow, or readability corrections.
- Promote release metadata from v3.3 to the final v3.5 identity only after visual acceptance.
- Run one final Verify + Browser Smoke gate after the release identity is locked.
- Merge PR #48 and deploy GitHub Pages only after owner approval.

## Owner acceptance gate

1. Confirm the game fills the browser content area without using Fullscreen mode.
2. Check the three-module top dashboard during active combat.
3. Start Wave 1 and inspect Locked Sectors, arena border, and obstacles.
4. Inspect the redesigned fresh menu and checkpoint menu.
5. Inspect multiple Upgrade offers and confirm category colors, Arabic copy, `CURRENT/NEXT`, level dots, and hover states are clear.
6. Check Pause, Game Over, checkpoint continuation, and mobile landscape.
7. Report any stretching, excessive darkness, glow, clutter, clipping, unreadable labels, or spacing issue before merge.
