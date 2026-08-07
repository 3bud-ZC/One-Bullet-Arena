# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Milestone: **v3.1.0-A — Warden Enemy**
- Working branch: `feature/v3.1.0-a-warden-enemy`
- Pull Request: **#43 open**
- Current production code on `main`: **v3.0.0 — Checkpoint Progression**
- Implementation on feature branch: **100% complete**
- Latest verified feature head before this status update: `ff86bdd8ebb151450236d8713652f4fd56ba6ee2`
- Verify #794: **success**
- Browser Smoke #160: **success**
- Playwright: **140/140 passed**
- Unexpected failures: **0**
- Flaky tests: **0**
- Skipped tests: **0**
- Permanent visual captures: **52**
- Warden-specific captures inspected: **12/12**
- Merge: **pending final CI on the status-update head**
- Owner deployed acceptance: **pending after merge**
- GitHub Pages public deployment: **not independently confirmed from the assistant environment**
- Next enemy-expansion part: **blocked until owner accepts the Warden release**

## Release identity

- Public release version: `3.1.0-a-warden`.
- Public release label: `v3.1.0-a-warden`.
- Release channel: `enemy-expansion-warden`.
- Service Worker cache: `one-bullet-arena-v3.1.0-a-warden`.
- Gameplay event schema: `4`.
- Checkpoint schema remains `1`.
- Combat Depth contract remains `2.9.0-combat`.
- Checkpoint Progression contract remains `3.0.0-checkpoint`.

## Warden enemy delivered

- The Warden unlocks at Wave 7.
- Wave composition introduces one Warden at controlled intervals and never floods the arena with shield units.
- The Warden has a distinct hexagonal body, cyan core, frontal shield arc, health bar, and two-segment guard bar.
- Its frontal guard rotates gradually toward the player instead of snapping instantly.
- Direct frontal bullet impacts are blocked and reflected as real ricochets.
- A normal frontal impact removes one of two guard points.
- Precision Shot, Bank level 2 or higher, or active Overdrive removes both guard points in one impact.
- A broken guard stays disabled for `3.2` seconds before restoring.
- Side and rear attacks bypass the guard and deal `1.2x` damage.
- Guard reflections integrate with Bank Shot and Momentum rather than cancelling the existing skill systems.
- Block, break, restore, and flank interactions have dedicated visual feedback and combat callouts.

## Architecture and events

- Added `src/core/warden-runtime.js` above the accepted Checkpoint Runtime.
- Activated `OneBulletWardenRuntime` from `src/main.js`.
- Added pure helpers for guard hit-zone classification and shield reflection mathematics.
- Added gameplay events:
  - `warden.guard-blocked`;
  - `warden.guard-broken`;
  - `warden.guard-restored`.
- QA snapshots expose Warden runtime activation, unlock wave, active count, guard strength, break timer, and block count.
- Service Worker and GitHub Pages validation include the Warden runtime.
- Existing checkpoint saves remain compatible because enemy entities are not serialized in checkpoints.

## Verification completed

### Deterministic tests

- Warden unlock and deterministic Wave 7 composition.
- Front, side, and rear hit-zone classification.
- Shield reflection direction and speed preservation.
- Guard strength and break-duration bounds.
- Release, event schema, Service Worker, Pages, checkpoint, UI, and keyboard contracts.

### Browser tests

- Warden runtime activation.
- Wave 7 integration.
- Frontal block without health loss.
- Reflected bullet direction and Bank increment.
- Precision guard break.
- Damage during the broken-guard window.
- Flank bypass with `1.2x` damage.
- Guard restoration and restore event.
- Continued compatibility with checkpoint save/reload/continue, Combat Depth, movement, touch controls, upgrades, and the PWA shell.

### Visual review

The final visual set was reviewed on:

- Desktop Chromium;
- Mobile Landscape Chromium;
- Desktop Firefox;
- Desktop WebKit.

Warden-specific captures cover:

1. active two-point frontal guard;
2. one-point guard after a normal block;
3. broken guard with countdown and danger presentation.

The visual tests freeze simulation updates while capturing states, preventing a block screenshot from advancing into a different guard state. No blocking clipping, overlap, mobile-control obstruction, or cross-browser inconsistency was found.

## Scope retained

The product path remains:

`Main Menu → New Run or Continue → Wave Combat → Upgrade → Harder Wave → Defeat → Continue/New Run/Menu`

No new mode, boss, currency, shop, hub, equipment, story, objective, puzzle, account, cloud save, or online leaderboard was added.

## Owner acceptance after merge

1. Confirm the menu footer displays `v3.1.0-a-warden`.
2. Continue from an existing checkpoint or play normally until Wave 7.
3. Identify the cyan hexagonal Warden and its two-point guard bar.
4. Fire directly into the front shield and confirm the bullet reflects without damaging health.
5. Hit the front twice, or use Precision / Bank 2+ / Overdrive, and confirm the guard breaks.
6. Damage the Warden during the `3.2`-second broken window.
7. Attack from the side or rear and confirm the flank feedback appears.
8. Confirm movement, recall, dash, upgrades, checkpoint saving, death, and Continue still work normally.
9. Report any balance, readability, collision, or control issue before the Orbiter milestone begins.
