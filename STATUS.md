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
- Implementation status: **85% complete**
- Automated verification: **green**
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
- Desktop browser mode now fills **100vw × 100dvh** without requiring the Fullscreen API.
- Removed the boxed browser shell, outer rounded container, large browser-frame border, and desktop shell padding.
- The canvas and game frame now occupy the full available browser viewport on desktop.
- Existing mobile-landscape behavior remains available through the lower responsive layer.

### Dashboard / HUD

- Added `OneBulletArtDirectionRuntime` above `OneBulletVisualOverhaulRuntime`.
- Rebuilt the gameplay HUD as three restrained tactical modules instead of nested/glowing frame stacks:
  - left: bullet state + recall readiness;
  - center: game identity + wave + enemies + score + upgrades + arena stage;
  - right: HP + segmented Dash/Shield state.
- Reduced duplicate borders, repeated chrome, and excessive glow.

### Map / arena

- Replaced the noisy floor-detail pass with a cleaner sector grid and restrained radar rings.
- Simplified arena borders to structural lines plus four corner brackets.
- Added visual **Locked Sectors** around early arena stages so unused screen space reads as future deck/expansion space rather than empty black area.
- Locked sectors show subtle grid/hatching, structural boundaries, and next-unlock information where space allows.
- Arena expansion geometry itself is unchanged: the locked sectors remain visual only.

### Shapes / obstacles

- Replaced nested rounded obstacle frames with cleaner chamfered tactical blocks.
- Reduced decorative bolts, repeated inner borders, and stripe noise.
- Existing obstacle rectangles and collision data are unchanged.

### Overlay/frame cleanup

- Removed the extra VisualOverhaul wrapper frame from Upgrade Selection.
- Removed the extra wrapper frame from Pause.
- Removed the extra wrapper frame from Game Over while retaining Checkpoint behavior.
- Removed the redundant VisualOverhaul touch-control ring layer.
- Simplified banner presentation by using the accepted lower visual-design presentation.
- Checkpoint/main menu bypasses the extra VisualOverhaul menu wrapper.

## Active runtime chain

`ArtDirection → VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- `ArtDirection` is presentation/render only.
- `VisualOverhaul` remains active beneath it.
- World2D, Warden, Checkpoint, CombatDepth, event schema, save schema, combat values, and progression contracts are unchanged.

## Final automated verification for current v3.5 head

Verified code head: `8c451423d5b68d9e1d905d231ecfb04b4bcc2fba`.

- Verify #883: **success**.
- Browser Smoke #188: **success**.
- Playwright tests: **164 total**.
- Expected/passed: **163**.
- Unexpected failures: **0**.
- Flaky: **0**.
- Skipped: **1** — intentional mobile skip for the desktop-only viewport-dimension assertion.
- Browser coverage includes desktop Chromium, Firefox, WebKit, and mobile landscape.
- Desktop viewport assertion confirms the game frame and canvas match the browser viewport while `document.fullscreenElement` is false.

## Manual capture review

Reviewed generated captures for:

1. desktop menu;
2. desktop combat with the new three-module dashboard;
3. early-stage arena with visual Locked Sectors;
4. chamfered obstacles and reduced arena-frame noise;
5. Upgrade Selection without the duplicate outer frame;
6. Pause without the duplicate outer frame;
7. mobile-landscape combat;
8. cross-browser Chromium / Firefox / WebKit rendering.

Current result:

- the dashboard is substantially cleaner and closer to the approved tactical reference direction;
- early arena stages no longer sit inside a mostly empty black screen;
- locked space is visually meaningful without becoming playable space;
- obstacle silhouettes are cleaner;
- overlay screens have less frame-on-frame clutter;
- no blocking clipping or automated browser regression was found;
- no gameplay or collision geometry changed.

## Remaining work before v3.5 release lock

- Owner hands-on review of the new desktop browser presentation.
- Further checkpoint/menu art-direction refinement if requested after live comparison.
- Further Upgrade card styling/alignment if the owner wants an even closer match to the supplied visual references.
- Inspect unusual desktop aspect ratios during owner review; the gameplay simulation remains the fixed 1280×720 logical world while the desktop presentation intentionally fills the browser viewport.
- Promote release metadata from v3.3 to the final v3.5 identity only after visual acceptance, then run the final release-identity Verify + Browser Smoke gate.

## Owner acceptance gate

1. Confirm the game fills the browser content area without using Fullscreen mode.
2. Check that the top dashboard is readable and not visually dominant.
3. Start Wave 1 and confirm the Locked Sectors make the surrounding map feel intentional rather than empty.
4. Reach Waves 3, 6, and 9 and inspect arena expansion transitions.
5. Inspect obstacle shapes and arena borders during active combat.
6. Inspect Upgrade, Pause, Game Over, Checkpoint, and mobile-landscape screens.
7. Report any stretching, excessive darkness, glow, clutter, clipping, unreadable labels, or spacing issue before merge.
