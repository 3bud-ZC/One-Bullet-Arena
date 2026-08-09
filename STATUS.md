# One Bullet Arena — Status

Last updated: 2026-08-09

## Current release candidate

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.6.2 — Dashboard Command**
- Canonical version: `3.6.2-dashboard-command`
- Canonical label: `v3.6.2-dashboard-command`
- Release channel: `global-ui`
- Service Worker cache: `one-bullet-arena-v3.6.2-dashboard-command`
- Canonical presentation owner: `OneBulletGlobalUiRuntime`
- UI revision: `dashboard-reference-v2`
- QA branch: `dashboard-reference-polish`
- Gameplay coordinate system: **1280×720 logical canvas preserved**
- Checkpoint schema: **1 — unchanged**

## Dashboard Command scope

v3.6.2 refines the existing Global UI instead of stacking another presentation runtime. The redesign is implemented inside the canonical `src/core/ui-repair-runtime.js` owner and preserves the accepted gameplay, camera, world-expansion, checkpoint, combat-depth, Warden, encounter, and scoring systems.

### Dashboard

The dashboard now uses a premium tactical command composition inspired by the one-bullet / ricochet identity:

- compact game identity header with procedural mark, title, tagline, and version;
- unified Language / Audio / Fullscreen / Settings controls;
- dominant Current Run surface with real sector, wave, score, upgrades, and checkpoint state;
- lightweight procedural tactical radar with concentric rings, hex target geometry, scanner, and deterministic presentation markers;
- compact Score / Upgrades / Checkpoint stat strip;
- controlled gold Continue / Start CTA;
- lower-emphasis New Run and destructive Delete Checkpoint actions;
- two-step localized checkpoint-delete confirmation rather than immediate deletion;
- Run Snapshot with real Wave, Score, Upgrades, Best Wave, High Score, Sector, and checkpoint readiness;
- data-driven eight-stage World Progression sourced from existing stage thresholds;
- subtle local-save indicator when a checkpoint actually exists;
- normal production dashboard contains no FPS/debug readout.

### Game Over / Run End

Game Over now uses the same tactical visual system as the dashboard:

- strong run-end focal point;
- real reached wave and final score;
- real high score, upgrades, sector, and checkpoint status;
- Continue from Checkpoint is primary only when continuation actually exists;
- New Run and Main Menu remain secondary;
- arena remains visible behind controlled dimming.

### Visual system

`src/ui-system.js` remains the shared presentation system and now carries the dashboard command refinements:

- near-black/navy foundation;
- controlled cyan structural accents;
- semantic amber primary-action/progression state;
- green checkpoint/positive state;
- restrained red danger state;
- improved muted-text contrast;
- angular tactical surfaces;
- reusable button hover/focus/pressed treatment;
- procedural settings/check glyphs;
- subtle grid, radial lighting, tactical arcs, route line, and vignette background depth.

No external icon/font/UI dependency was added.

## Localization

`src/i18n.js` remains the single localization source.

Supported locales:

- English (`en`, LTR)
- العربية (`ar`, RTL)

Behavior verified in the redesigned surfaces:

- persisted locale key remains `one-bullet-language`;
- language changes update the active interface without reload;
- document `lang` and `dir` continue to follow the selected locale;
- AR / EN selector is explicit and mirrors correctly in RTL;
- functional Sector/Wave metadata is localized;
- dashboard stat strips and Game Over metrics mirror logically in Arabic;
- icons/text order follows direction;
- numeric values remain readable and are not semantically reversed;
- checkpoint deletion confirmation is localized in both languages.

## Responsive behavior

Desktop keeps the main Current Run + Run Snapshot composition and full-width progression track.

Touch/mobile uses a dedicated stacked dashboard instead of shrinking the desktop two-column layout:

1. Current Run / sector / wave + compact radar;
2. real run stat strip;
3. Continue / Start and compact secondary actions;
4. compact Run Snapshot;
5. World Progression.

This keeps the primary action reachable and prevents the snapshot/progression from becoming unreadably small on mobile landscape.

## Gameplay and saved-run compatibility

This release intentionally does **not** change:

- movement balance;
- bullet physics or ricochet behavior;
- enemy stats or spawn balance;
- encounter director;
- damage formulas;
- upgrades or progression rules;
- world expansion thresholds;
- camera logic;
- Warden mechanics;
- score/high-score/best-wave semantics;
- checkpoint storage schema.

Existing local checkpoint data remains compatible. Continue Run, New Run, checkpoint restore, and the existing checkpoint clearing implementation remain the source of truth; the redesign only adds a two-step confirmation before invoking checkpoint clear.

## Automated verification

Product HEAD used for visual acceptance before documentation update: `2bd934340849a5fb4dd0da287bee7b92210b8aa0`.

### Verify #1199 — SUCCESS

GitHub Actions ran the repository Verify workflow successfully.

Observed result:

- syntax/static verification: passed;
- Node test suite: **85 tests, 85 passed, 0 failed**;
- release identity: `3.6.2-dashboard-command`.

### Browser Smoke #430 — SUCCESS

GitHub Actions ran the full Playwright Browser Smoke workflow successfully on the same product HEAD.

The browser artifact includes dashboard and game-state screenshots across Chromium/Firefox/WebKit coverage and the repository's existing runtime, checkpoint, touch-safe-zone, combat, Warden, fullscreen, localization, and visual contracts.

Documentation commits are required to pass the same Verify and Browser Smoke gates again before merge.

## Visual QA

Final Browser Smoke artifact reviewed from run #430.

Manually inspected and accepted:

- English dashboard — 1920×1080;
- Arabic dashboard — 1920×1080;
- English dashboard — 1366×768;
- Arabic dashboard — 1280×720;
- Arabic mobile landscape dashboard — approximately 844×390;
- English Pause;
- Arabic Pause;
- English Upgrade Selection;
- Arabic Upgrade Selection;
- English Game Over / Run End.

Additional dashboard captures generated by the automated visual matrix:

- 1440×900;
- 1600×900;
- 2560×1440.

The manually inspected states showed no clipping, accidental overlap, normal-dashboard debug UI, giant dead center area, or browser-scroll issue in the captured state. Arabic dashboard composition is mirrored rather than treated as translated LTR text. Mobile landscape uses the dedicated stacked composition.

## Acceptance status

Current status: **verified release candidate, pending final documentation gate and merge/deployment to `main`.**

Acceptance already demonstrated on the product HEAD:

- Current Run is the dominant dashboard focus;
- Continue / Start is visually dominant without spanning the entire viewport;
- Run Snapshot is compact and aligned;
- World Progression communicates completed/current/future sectors;
- utility controls form one coherent visual family;
- Arabic and English dashboard layouts are both represented in visual QA;
- Game Over belongs to the same product language;
- mobile landscape no longer uses the desktop side-by-side composition;
- existing gameplay and saved-run semantics remain isolated from the presentation redesign.

The final production acceptance requirement is a green Verify + Browser Smoke on the documentation HEAD, followed by a successful GitHub Pages deployment of `3.6.2-dashboard-command` from `main`.