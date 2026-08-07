# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Milestone: **v3.3.0 — Cinematic Visual Overhaul**
- Working branch: `feature/v3.3.0-visual-overhaul`
- Pull Request: **#45 — draft during final verification and owner acceptance**
- Canonical release version: `3.3.0-visual-overhaul`
- Canonical release label: `v3.3.0-visual-overhaul`
- Release channel: `cinematic-visual-overhaul`
- Service Worker cache: `one-bullet-arena-v3.3.0-visual-overhaul`
- Implementation: **100% complete**
- Gameplay geometry changed: **no**
- Collision geometry changed: **no**
- Combat balance or progression changed: **no**
- Owner acceptance: **pending**

## Visual overhaul delivered

- Added `src/core/visual-overhaul-runtime.js` above the accepted True 2D runtime.
- Strengthened the industrial arena with ambient deck nodes, stage-aware energy accents, floor scan/detail passes, stronger physical borders, corner framing, and obstacle material detail.
- Added enemy health/threat arcs and clearer impact readability without changing enemy hitboxes.
- Added hostile projectile glow without changing projectile collision geometry.
- Added player dash-ready and shield visual layers without changing movement or defensive values.
- Added a readable bullet recall tether, additional bullet glow, and a secondary aiming-reticle treatment.
- Added stronger cinematic framing for the main menu, combat HUD, upgrade selection, pause, Game Over, banners, and touch controls.
- Strengthened the browser shell with a richer sci-fi frame and background treatment while preserving mobile-landscape behavior.
- `prefers-reduced-motion` support remains active for non-essential motion and shell effects.

## Architecture

The active runtime chain for this milestone is:

`VisualOverhaul → World2D → Warden → Checkpoint → CombatDepth → EventFoundation → UI/Combat runtime`

- `VisualOverhaul` is render-only.
- `World2D` remains the accepted lower visual/world contract at `3.2.0-true-2d`.
- Warden contract remains `3.1.0-a-warden`.
- Checkpoint Progression contract remains `3.0.0-checkpoint`.
- Combat Depth contract remains `2.9.0-combat`.
- Gameplay event schema remains `4`.
- Checkpoint schema remains `1`.
- Existing checkpoint saves remain compatible.
- Base arena bounds, obstacle rectangles, player speed, enemy speed, wave composition, damage values, and upgrade values remain unchanged.

## Verification completed before final release-identity lock

Verified feature head: `d1624894f86164fa7fda88c042ce60a8595cce81`.

- Verify #831: **success**.
- Browser Smoke #170: **success**.
- Playwright: **148/148 passed**.
- Unexpected browser-test failures: **0**.
- New visual-overhaul coverage captures menu, combat, bullet recall, and upgrade states across the configured browser projects.
- Existing combat, checkpoint, Warden, input, mobile, PWA, and release-handshake coverage continued to pass.

## Manual visual review

The generated Playwright captures were inspected after Browser Smoke #170.

Reviewed states included:

1. desktop main menu;
2. desktop active combat;
3. desktop bullet recall;
4. desktop upgrade selection;
5. mobile-landscape combat;
6. Firefox combat rendering.

The review found no blocking visual regression:

- menu hierarchy and framing remain readable;
- active combat entities remain distinct from the strengthened map;
- the recall tether is clearly visible without obscuring combat;
- upgrade cards remain legible;
- mobile controls stay outside the primary combat focus;
- Firefox rendering remains consistent with Chromium;
- no blocking clipping or overlap was observed in the reviewed captures.

## Final v3.3 verification gate

The canonical v3.3 identity and its test expectations are now aligned. The final CI cycle must run on the release-identity head that contains this status update.

Merge remains blocked unless:

- Verify succeeds;
- Browser Smoke succeeds;
- the final release reports `v3.3.0-visual-overhaul`;
- no new visual, input, checkpoint, combat, Warden, PWA, or cross-browser regression appears.

## Owner acceptance gate

1. Confirm the menu footer displays `v3.3.0-visual-overhaul`.
2. Start a new run and inspect arena depth, floor detail, border framing, obstacle material treatment, and combat contrast.
3. Move and dash continuously and confirm the player remains readable and responsive.
4. Fire, ricochet, recall, and catch the bullet and verify the trail, recall tether, glow, and reticle remain clear.
5. Fight mixed enemy groups and confirm threat/health arcs help readability rather than adding clutter.
6. Reach or continue to Wave 7 and verify the Warden remains readable against the upgraded arena.
7. Check HUD, upgrades, pause, Game Over, and checkpoint Continue/New Run/Menu behavior.
8. Test mobile landscape and confirm movement, Recall, Dash, and Pause controls do not hide enemies or projectiles.
9. Report any performance drop, excessive glow, visual clutter, dark area, unreadable entity, control regression, or collision mismatch before PR #45 is merged.
