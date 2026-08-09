# One Bullet Arena — Status

Last updated: 2026-08-09

## Current release candidate

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.7.0 — High-Resolution Presentation**
- Canonical version: `3.7.0-hires-ui`
- Canonical label: `v3.7.0-hires-ui`
- Release channel: `hires-ui`
- Service Worker cache: `one-bullet-arena-v3.7.0-hires-ui`
- Canonical presentation owner: `OneBulletGlobalUiRuntime`
- UI revision: `dom-hidpi-presentation-v1`
- Production branch: `main`
- Feature branch: `feat/3.7.0-hires-ui`
- Gameplay coordinate system: **1280×720 logical coordinates preserved**
- Checkpoint schema: **1 — unchanged**
- Candidate status: **implementation complete; verification gate pending**

## High-DPI rendering architecture

v3.7 separates three concerns that were previously coupled:

1. **Simulation:** remains 1280×720 logical coordinates.
2. **Canvas display:** a centered 16:9 CSS rectangle calculated from the available viewport.
3. **Canvas backing store:** CSS display size multiplied by an effective DPR.

`src/render/canvas-viewport.js` is the single owner of display/backing-store sizing. The effective DPR is bounded by both a maximum DPR and a backing-pixel budget so high-resolution rendering does not allocate unbounded surfaces on 4K/HiDPI displays.

The renderer applies one logical-to-physical transform with `ctx.setTransform()`. Gameplay positions, collision geometry, physics, ricochet calculations, camera coordinates, spawn logic, and saved data are not multiplied by DPR.

The Canvas uses a 16:9 contain model. Non-16:9 viewports letterbox instead of independently stretching width and height, so circles remain circular and line geometry is not distorted.

Resize handling covers browser resize, fullscreen change, orientation change, visual viewport change, and devicePixelRatio changes detected while rendering. Canvas image smoothing is enabled and line caps/joins are normalized for the non-pixel-art visual style.

## DOM UI migration

The existing `OneBulletGlobalUiRuntime` remains the final presentation owner. No additional final/super UI runtime was added.

Migrated from low-resolution Canvas drawing to semantic browser UI:

- Main Dashboard / Current Run;
- utility toolbar and language/audio/fullscreen/settings controls;
- run statistics, Run Snapshot, and World Progression;
- desktop Combat HUD and desktop late-game minimap;
- Pause;
- Upgrade Selection;
- Game Over.

The Canvas continues to own arena/environment geometry, player/enemy/projectile rendering, bullet trail and particles, telegraphs/targeting/impacts/world effects, camera/world rendering, and touch movement/aim controls. Touch controls intentionally remain on Canvas because they are coupled to gameplay safe zones and input semantics; they now render through the HiDPI backing store rather than a stretched 1280×720 bitmap.

## DOM/UI system

New modules:

- `src/ui/dom-ui.js` — state-bound semantic UI controller;
- `src/ui/icons.js` — reusable inline SVG icon system;
- `styles/tokens.css` — shared surfaces, color, spacing, radius, typography, motion, and shadow tokens;
- `styles/ui.css` — Dashboard/HUD/overlay/component styling;
- `styles/responsive.css` — laptop, low-height desktop, mobile landscape, and reduced-motion rules.

The presentation layer uses real `<button>` controls, focus-visible keyboard states, ARIA labels, CSS Grid/Flexbox, CSS logical properties for LTR/RTL, transform-based HUD gauge updates via CSS custom properties, tabular numeric telemetry, restrained backdrop blur with fallback surfaces, and soft elevation rather than full tactical wireframes.

## SVG icon system

UI controls use one vector icon family with a shared `viewBox`, `currentColor`, consistent stroke width, and rounded caps/joins. World Progression and the desktop minimap use SVG geometry, keeping lines, nodes, viewport rectangles, paths, and player markers vector-sharp at arbitrary display scale.

## Typography

Migrated screens use browser text rendering instead of Canvas text. This improves anti-aliasing, Arabic shaping, kerning, baselines, text wrapping, accessibility, and browser zoom/display-scale quality.

Typography is tokenized from readable label sizes through display/hero metrics. No external runtime font URL was added. The UI prioritizes modern system UI fonts and professional Arabic fallbacks so offline/PWA behavior remains deterministic. A packaged WOFF2 family is not included in this release candidate.

## Localization / RTL

`src/i18n.js` remains the single localization source. Supported locales are English (`en`, LTR) and العربية (`ar`, RTL). The saved preference key remains `one-bullet-language`; active UI updates without reload; document `lang` and `dir` follow locale; logical CSS properties avoid duplicate coordinate layouts; World Progression mirrors in RTL; numeric telemetry uses tabular numerals.

## Pointer / touch mapping

Input remains based on the actual Canvas CSS rectangle:

`screen coordinate → contained Canvas rectangle → 1280×720 logical coordinate → existing world-camera transform`

The HiDPI backing-store size is not used as gameplay input space. The DOM UI root is `pointer-events: none`; only real interactive controls opt into pointer events, so gameplay center input remains targetable by the Canvas while menus/buttons capture their own interaction.

## Responsive behavior

Desktop uses a spacious Dashboard with a dominant Current Run surface, compact Run Snapshot, vector World Progression, and compact utility toolbar. Laptop and low-height desktop states reduce decorative scale while keeping readable typography. Mobile landscape around 844×390 uses a dedicated compact composition instead of shrinking the desktop layout; the HUD remains a top rail so lower touch zones stay available.

## Service Worker / deployment

The application-shell cache includes the DOM UI JavaScript, Canvas viewport module, SVG icon module, and all UI CSS. The cache identity is incremented to `one-bullet-arena-v3.7.0-hires-ui`, and the Pages workflow copies the new `styles/` directory and validates channel `hires-ui`.

## Gameplay compatibility

This release intentionally does **not** change movement balance, collision rules, bullet physics/ricochet, enemy stats/spawn balance, encounter director, damage formulas, upgrades/progression rules, world expansion thresholds, camera behavior, Warden mechanics, scoring semantics, or checkpoint schema.

## Verification gates

Implementation adds contracts for logical dimensions, contained 16:9 geometry, DPR/backing-store behavior and pixel budget, pointer mapping, DOM UI ownership/semantics, SVG icons, localization/RTL, responsive Dashboard/HUD, gameplay input pass-through, resize/fullscreen-change handling, mobile mapping, screenshot matrix, and explicit deviceScaleFactor=2 HiDPI rendering.

Exact CI results and run identifiers will be recorded here after the candidate passes the repository verification gates.

## Required visual QA matrix

Automated screenshot evidence is configured for English Dashboard at 1280×720, 1366×768, 1440×900, 1600×900, 1920×1080, and 2560×1440; non-16:9 1792×832 and 1680×1050; Arabic Dashboard at 1920×1080; explicit HiDPI 1440×900 at device scale factor 2; Combat HUD; Pause; Upgrade Selection; Game Over; and Arabic mobile landscape around 844×390.

## Real remaining limitations

- Touch gameplay controls remain Canvas-rendered by design because they are coupled to gameplay safe zones/input; they benefit from the HiDPI renderer but are not semantic DOM controls yet.
- No bundled WOFF2 font family is included; presentation uses system/local fallback stacks to preserve the offline contract without an unverified font license or external runtime dependency.
- Visual screenshot artifacts still require the browser CI gate and manual inspection before the release can be marked production accepted.
