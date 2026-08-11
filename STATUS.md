# One Bullet Arena — Status

Last updated: 2026-08-11

## Current release

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Release: **v3.12.1 — Health Readability**
- Canonical version: `3.12.1-health-readability`
- Canonical label: `v3.12.1-health-readability`
- Release channel: `smooth-runtime`
- Service Worker cache: `one-bullet-arena-v3.12.1-health-readability`
- Canonical presentation/runtime owner: `OneBulletGlobalUiRuntime`
- Production branch: `main`
- Gameplay coordinate system: **1280×720 logical coordinates preserved**
- Checkpoint schema: **1 — unchanged**

## Enemy health presentation - 2026-08-12 (v3.12.1)

The v3.12 curved health arcs were rejected and are removed. Scope was the health
display only; gameplay, navigation, damage, balance, boss mechanics, maps and
the dashboard are untouched.

### What was wrong

The arcs hugged the silhouette closely enough that they read as part of the
enemy's geometry rather than as an indicator, and in groups the overlapping
curves became noise instead of information.

### Regular enemies

A small horizontal bar directly under the body, scaled to enemy radius and
clamped to 18-46px so it never rivals the silhouette. 1-HP enemies never show
one. Multi-HP enemies show one only after taking damage; it holds for 1.9s from
the last hit and then fades over 0.45s, and any further damage immediately
re-reveals and resets it. The reveal timer is decayed on the fixed simulation
step, not on render, and is never read by gameplay.

The first attempt used a pure dark track, which vanished against the arena floor
and left only the fill visible — showing how much health remained but not out of
how much. The track is now a faint light fill over a dark base so the full
length reads on both the floor and the lighter structure tops.

### Warden

Health uses the same compact bar and the same reveal rule. Guard remains
permanently visible as a separate, thinner cyan track, because it is a live
mechanic the player must read at all times.

### Guardians

No body-attached bar at all. A dedicated HUD bar sits top-centre directly under
the wave block, showing the localised Guardian name, health fill, and a phase
label that turns green during the `stalk` vulnerability window and red while the
Guardian is sealed. It appears only while a Guardian is alive and is torn down
on death or any state change.

### Two real bugs found by screenshot review

1. `domSignature()` did not include Guardian health or phase, so the DOM sync
   would have shown the bar on spawn and then left it frozen at full health for
   the entire encounter. Health is now bucketed into the signature so the bar
   animates without forcing a DOM write every frame.
2. `dom-performance-bridge.js` **replaces** `controller.sync`, `syncHud`,
   `syncMinimap` and `setGauge` on the instance rather than wrapping them, so
   the `syncGuardian()` call added to `dom-ui.js` was dead code in production.
   The call now lives in the bridge. This is the third release in which a
   subclass or wrapper silently shadowed an edited method; verifying against the
   live object rather than the source is what caught it.

## Sector Guardians, combat audio, readability - 2026-08-11 (v3.12.0)

### Scan findings

Played waves 1/3/6/10/15/20/25/30+ through `?qa=1`. Two defects stood out.

1. **The two most important combat sounds were never played.** `hit` and `kill`
   were fully defined in the AudioEngine's sound table and nothing in the
   codebase ever called them, so landing a shot and killing an enemy — the
   events the player most needs confirmation of — were silent.
2. **Every enemy above 1 HP carried a permanent detached health bar**, so a
   dense wave was a field of floating stripes overlapping each other and the
   enemies they described.

### Sector Guardians

Milestone encounters at waves 10, 20 and 30 — where a sector opens, which is a
beat the player already recognises. A Guardian is a normal enemy with a larger
body, a phase machine and a guard arc, so it reuses the existing navigation,
collision, spawn, damage and render paths wholesale. No new runtime class, no
boss framework, no change to the inheritance chain.

Each is a different answer to the one-bullet loop rather than a bigger health
pool:

- **Sentinel** — rotating guard arc; read the rotation and hit the open side.
- **Bastion** — refuses direct damage entirely; only a ricochet hurts it, which
  forces arena geometry into the fight.
- **Harrier** — fast and evasive; punished by recall timing rather than by aim.

The phase loop is stalk → wind → strike. Stalk is the vulnerability window and
is deliberately the longest phase (65% of the cycle), so the encounter is mostly
an opportunity rather than mostly waiting. The wind-up is a 0.95s telegraph with
a contracting ring, and the lane is locked when the telegraph begins so the
attack is dodged by reading it, not by reacting at the last instant. Guardians
scale with the run through phase pressure and escort composition, with health
scaling capped at 1.6x so a late Guardian is not simply a longer version of the
same fight. Waves carry a thinned five-enemy escort so the Guardian is the
fight rather than a large enemy hidden inside a crowd.

### Audio

Rate limiting per cue and a hard 14-voice ceiling, plus a dynamics compressor on
the master bus, because dense combat could previously stack a dozen voices in a
few milliseconds. The vocabulary was rebuilt so pitch direction carries meaning:
the bullet leaving the player rises, the bullet returning falls and resolves
upward on the catch, and enemy events sit lower and drier so the single bullet
stays the most audible object in a wave. New cues for recall, catch, perfect
catch, precision, overdrive, milestone, and the three Guardian events.

### Readability

Health bars now appear only once an enemy has actually been damaged, and are
drawn as a segmented arc hugging the body rather than a detached rectangle, so
the information sits on the thing it describes. Guardians always show theirs,
because their health is the encounter's clock.

### Upgrade balance

v3.11 doubled reward frequency without touching power, so by wave 20 a build
carried roughly twice the upgrades the curve was tuned against. Enemy health now
carries a term driven by **upgrades actually earned** rather than by a hard-coded
assumption about cadence, which keeps the two in step at any interval. Speed and
shot speed are deliberately untouched — those govern the player's reaction time,
and tightening them is how an arcade game stops being fair. No individual
upgrade was nerfed.

### Verification note

`npm run verify` passed while the Guardian spawn path was still broken: a phase
constant lived in `movement-hotfix-runtime.js` but was referenced from
`game.js`, and no Node test spawns a Guardian. Actually playing a Guardian wave
surfaced the `ReferenceError` immediately. The constants moved to `game-data.js`.

### Not done in this pass

The full combat-VFX language (directional streaks, ricochet marks, controlled
fragments, silhouette deformation) was not built. Game-feel work landed on the
audio and impact-weight side — escalating bank-chain shake, weighted catch and
perfect-catch response, Guardian defeat impulse — but the particle and streak
system was not rewritten. See the report for why.

## Responsiveness and upgrade economy - 2026-08-11 (v3.11.0)

Scope was performance/responsiveness and the upgrade economy. The v3.9 dashboard
and the v3.10 map, enemy, and encounter identity work are untouched.

### The heaviness was two separate faults, neither of them frame rate

Measured before changing anything, with a harness that drives real fixed-step
simulation rather than staged scenes.

1. **`findRangedAttackPoint` cost ~137ms per call** — about 73x a full path
   solve (1.9ms). It rebuilt the 112-point waypoint graph on entry, and then
   called `findNavigationPath` per candidate *without* passing waypoints, so the
   graph was rebuilt again inside each of ~136 Dijkstra solves. It runs whenever
   a sniper's firing lane is blocked, so it presented as a hard freeze rather
   than a slow frame. It now reuses the caller's cached graph and only route-
   solves the six best candidates after cheap filtering: **137ms → 5.4ms**.
2. **Route replans bunched onto single ticks.** `targetMoved` compares against
   the same player position for every enemy, so the whole wave crossed the 92px
   threshold together and ran Dijkstra on one tick. A shared per-tick replan
   budget spreads them; only a stuck enemy bypasses it, and an enemy that has
   merely consumed its route still steers straight at the target meanwhile.

The camera was a third, separate contributor to the *feel*: lead of 80-143px was
applied to an already-smoothed direction and then chased at response 5.5 (a
~180ms time constant). The two filters compounded. Lead is halved and the follow
roughly doubled in stiffness, which keeps anticipation while staying under the
player.

Player movement itself was never the problem — it is direct position
integration with no inertia.

### Measurements

Dense wave 32, 18 enemies, Chromium. Simulation budget at 120Hz is 8.33ms.

| Metric | Before | After |
|---|---|---|
| Simulation tick, median | 0.1 ms | 0.1 ms |
| Simulation tick, p95 | 0.7 ms | 1.2 ms |
| Simulation tick, max | 20.3 ms | 6.2 ms |
| Ticks over the 8.33ms budget (of 600) | 1 | **0** |
| `findRangedAttackPoint` per call | 136.9 ms | 5.4 ms |
| Camera offset while moving | 83 px | 41 px |
| Camera settle after reversal | 133 ms | 50 ms |

Heap growth over 5s of dense combat was 0 MB before and after, so allocation
churn was never a factor.

Note on methodology: a first harness reported a 656px camera offset and no
settle. That was measurement error — it drove the player into the arena wall,
where the camera legitimately stops following. The numbers above oscillate
around the arena centre instead.

### Upgrade cadence

- Rewards moved from every 5 completed waves to every 3: waves 3, 6, 9, 12, 15,
  18. Sector unlocks are unchanged at every 5 waves; the two cadences are now
  deliberately independent.
- A wave-15 run now has 5 selections instead of 3.
- No upgrade values, stack caps, or enemy scaling were changed in this pass. The
  cadence change alone roughly doubles build development rate, and altering
  power at the same time would make the result impossible to read.

### Existing checkpoint catch-up

Checkpoints written before this release earned rewards at the old rate. On
resume, the difference is granted as a debt spent through the real upgrade
panel, one selection at a time — nothing is auto-picked and no saved stack is
modified.

- `schemaVersion` stays at 1 on purpose. Bumping it would make
  `sanitizeCheckpoint` reject every existing save, which is the outcome to
  avoid. `cadenceVersion` is a new optional field, absent on old saves.
- The debt is computed once from the checkpoint's completed waves, then
  recorded. Afterwards the stored value wins, including when it is zero, so a
  reload cannot re-grant it. It is persisted immediately after each selection.
- Verified end to end on a synthetic v3.10 wave-15 save: resumes owing 2, shows
  three upgrade panels on the next wave clear (one earned, two owed), and
  persists `owedUpgrades: 0`.

Two overrides had to be found for this to work at all, both cases of a subclass
silently shadowing the method being edited: `updateEnemies` is overridden in
`movement-hotfix-runtime.js`, and `event-runtime.js` overrode
`openUpgradeSelection()` without forwarding arguments, which dropped the flag
that re-opens the panel for a chained catch-up reward.

### Not done in this pass

The player/bullet lifecycle game-feel work and the combat-effects quality pass
were not completed. They remain the largest outstanding gameplay work.

## Arena identity pass - 2026-08-11 (v3.10.0)

Gameplay-facing pass. The v3.9 Command Deck established the product identity;
this brings the game itself to that standard. Simulation architecture,
checkpoints (schema 1, unchanged), navigation, Warden guard mechanics,
one-bullet physics, recall, upgrades, controls, localisation, and the DOM/SVG
UI are all unchanged.

### What the scan found

Played waves 1, 5, 10, 15, 20, 25, 30, 35 and 42 through `?qa=1` with real
fixed-step simulation rather than staged scenes. Five substantive weaknesses:

1. **Sectors 3-7 were the same room.** They shared one identical central
   obstacle cluster and only bolted extra blocks onto the perimeter as bounds
   grew. Every obstacle in the game was one of two rectangle shapes.
2. **Late waves were mostly wave-1 enemies.** `buildWaveComposition` filled any
   remainder with scouts and capped interesting archetypes at 2-3, so wave 36
   was 11 scouts out of 18 — roughly 60% trash.
3. **Encounters were phase-locked to sector unlocks.** Both cycle every 5
   waves, and the index was a plain `(wave - 10) % 5`, so every sector was
   entered on the same encounter for the entire run.
4. **The Warden had no visual identity at all.** It had no `ENEMY_STYLE` entry,
   so it fell back to the scout palette, and no shape branch, so it fell back to
   the splitter's pentagon. The game's guard enemy rendered as a pink splitter.
5. **Sector accents repeated every third sector**, because a three-entry accent
   table was indexed `stage % 3` across eight sectors.

### World and maps

- All eight sectors rebuilt with their own composition language: duel chamber,
  asymmetric wings, long parallel corridors, open bowl ringed by cover,
  diagonal cascade, heavy industrial masses with choke points, a lattice of
  identical pillars, and concentric belts.
- Obstacle **count** is deliberately unchanged (2/4/6/8/10/12/14/16). Navigation
  builds up to eight waypoints per obstacle and runs Dijkstra over the result,
  so cost is quadratic in obstacle count. Identity comes from arrangement and
  proportion, never from adding clutter.
- Sector accents expanded from 3 to 8 — one per sector — and floor value now
  darkens with depth, so later sectors read as further in rather than wider.
- `arenaStage.name` is now a stable slug; player-facing names come from
  `stage.<id>` in i18n.

`tests/arena-stages.test.js` validates every layout: obstacles inside bounds,
no overlapping rectangles (which produce ambiguous push-out directions), spawn
pocket clear, every corner routable by the widest enemy, the obstacle budget
respected, themes unique, and no sector repeating more than half of the
previous sector's geometry. It caught two real faults in the first draft — a
centre pillar sitting on the spawn point, and the same pillar sealing the
middle corridor with 42px and 32px gaps where a brute needs ~54px.

### Enemies

- Added the missing Warden style and gave it its own silhouette: an octagonal
  bunker with its guard arc drawn on the facing it actually blocks, scaled by
  `guardStrength` and flipped to danger colour when broken, so "flank it or
  break it" is readable from the shape.
- Splitter moved off the shared pentagon to a seamed hexagon whose seam
  oscillates — the tell that it breaks in two.
- Per-archetype motion character replaced one shared rotation: scouts flutter,
  brutes are near-immobile, snipers hold almost still, chargers stay locked to
  their facing, splitters shake. Presentation only — it reads `enemy.phase` and
  writes nothing back, and the pulse only ever contracts, so a drawn body is
  never larger than the collision radius it claims.

### Progression

- Encounters now define composition through archetype weights rather than
  tinting three stat multipliers, so an encounter name predicts the fight.
  Crossfire deliberately excludes Wardens and Siege brings them, preserving the
  contrast the previous design intended.
- Scout share falls from 56% at wave 10 to 11% by wave 35 instead of staying
  the majority.
- Encounter index advances an extra step per completed cycle, so each sector is
  entered on a different encounter.

### Release delivery

Reviewing the diff surfaced a shipping bug: neither `sw.js` nor
`release-config.js` changed in this pass, so the service worker's byte
comparison would have found no update, and the v3.9 cache-first asset strategy
would have kept serving the old bundle to returning players indefinitely. The
version bump to `3.10.0-arena-identity` is what makes this release reachable.
Any future asset-only change carries the same requirement.

### Verification

- `npm run verify`: **131/131** Node tests.
- Full Playwright matrix via `--workers=1`.
- Replayed the full progression after the change: no non-finite coordinates and
  no console errors at any sampled wave.

## Dashboard redesign and startup optimisation - 2026-08-11 (v3.9.0)

Scope was the main menu and the startup path only. Gameplay, checkpoints,
progression, controls, localisation, the DOM/SVG UI architecture, and the Canvas
runtime are unchanged.

### Dashboard

- The menu was a muted teal card grid that shared no visual language with the
  game. Colour, backdrop, and motifs are now taken from the running game: the
  backdrop uses the arena floor gradient drawn in `world-2d-runtime`, and cyan
  `#62d5f3` / gold `#ffd441` are the canvas `ART` constants. Gold is reserved for
  the bullet — the trajectory, the sector head, and the primary action.
- Composition replaced, not restyled. Two large cards and a five-row metric list
  gave way to a brand lockup, a two-figure run readout (wave and score set at
  display scale with a hairline divider), a launch column, and the sector track.
  No card chrome, and hierarchy comes from type scale rather than borders.
- Signature element: world progression is drawn as one continuous **ricochet**.
  Eight sector vertices alternate between the top and bottom of the band, joined
  by straight segments; travelled segments are gold, the rest dashed and dim,
  and the bullet head sits on the current sector. Sector captions sit on the same
  side as their vertex. Progress and the bullet's flight path are the same line.
- Sector markers are positioned HTML rather than SVG shapes. The track SVG
  stretches with `preserveAspectRatio="none"`, which would otherwise squash the
  circles into ellipses — the previous code worked around this by hiding the SVG
  nodes and faking them at a fixed height, which a zigzag track cannot use.
- Removed duplicated data: the ledger's `Checkpoint` figure always repeated the
  wave figure, because the menu already sources its wave from the checkpoint.
- Fixed the `bullet` icon, which was a pencil outline and read as "edit" on the
  control that fires the game's only bullet.
- Secondary actions are flex, so `New Run` fills the row when
  `Delete Checkpoint` is hidden instead of leaving an empty half.

### Startup

Two independent bottlenecks were measured and fixed. Hosting stayed on GitHub
Pages; neither cause was the host.

1. **Service worker.** Every same-origin GET went network-first while also
   bypassing the HTTP cache, so a fully warm repeat visit still waited on ~45
   round trips before the dashboard could paint. Assets are now cache-first, and
   because each cache is keyed by release version and `activate()` deletes the
   others, a hit is always current. Matching uses `ignoreSearch` so shell entries
   answer the `?v=` URLs `index.html` requests — previously they missed and every
   asset was stored twice. Navigation is stale-while-revalidate.
2. **Module waterfall.** The runtime is a 22-module-deep inheritance chain, so
   the browser discovered roughly one level per round trip. `index.html` now
   declares `modulepreload` for the 39-module graph, turning the waterfall into
   one parallel batch. `tokens.css` moved from an `@import` inside `game.css` to
   a direct `<link>` for the same reason.

Update delivery is unchanged in strength: the browser still re-checks `sw.js`
and its imported `release-config.js` on every navigation, and a release bump
installs a new worker, a new cache, and triggers the existing `controllerchange`
reload.

A branded boot state is inlined in `index.html` — critical CSS and markup, no
extra request — and is dismissed by the `data-game-state` attribute the DOM UI
already sets, so no script is needed to remove it. It replaces the blank dark
screen during whatever initialisation time remains.

### Measurements

Chromium, latency injected server-side so service-worker fetches are throttled
too (CDP page throttling does not apply to them). "Dashboard usable" is when the
menu has painted real localised content.

| Scenario | FCP before | FCP after | Dashboard usable before | after |
|---|---|---|---|---|
| First visit, 0 ms RTT | 1432 ms | 84 ms | 1389 ms | 136 ms |
| First visit, 300 ms RTT | 6316 ms | 692 ms | 6138 ms | 2877 ms |
| Repeat visit, 0 ms RTT | 532 ms | 204 ms | 440 ms | 303 ms |
| **Repeat visit, 300 ms RTT** | **5892 ms** | **196 ms** | **5815 ms** | **272 ms** |

The warm repeat visit on a slow link — the case the report described — improved
about 21×. First visit on a slow link is still ~2.9 s to interactive; that is
request count against latency and would need bundling, which the project's
no-build-step constraint rules out.

### Verification

- `npm run verify`: passed, **121/121** Node tests.
- Full Playwright matrix (desktop Chromium, mobile landscape, Firefox, WebKit)
  via `npx playwright test --workers=1`.
- Screenshot review at 1440×900, 1280×720, and 740×360 mobile landscape, each in
  English and Arabic and in both fresh-run and checkpoint states. No clipping,
  overflow, or layout jumps. The RTL sector counter needed a fix: it carried
  `dir="ltr"`, which made `margin-inline-start: auto` resolve against the
  element's own direction and stop reaching the far edge.

## Enemy AI reliability pass - 2026-08-11

- Starting source-of-truth commit verified from `origin/main`: `07510b41b8a2b5813b9d05fd1acf5faab57dcebc` (`fix: restore enemy pursuit and attack pressure`).
- Runtime architecture preserved: production still boots through `OneBulletGlobalUiRuntime`; 1280x720 logical simulation, DOM/SVG application UI, fixed-step simulation, world expansion, Warden mechanics, checkpoints, controls, localization, and adaptive visual quality remain intact.
- Root enemy AI issues reproduced locally in `?qa=1`: obstacle-blocked enemies kept orbiting/strafe-sliding at nearly fixed distance, fragile axis fallback did not create useful routes, blocked snipers could preserve range without useful fire, chargers could evaluate telegraphs from invalid lanes, and late-stage spawn scoring favored excessive distance.
- Navigation change: added deterministic lightweight visibility-graph routing in `src/enemy-navigation.js` with cached obstacle waypoints, direct-path preference, route hysteresis, target-move replanning, stuck/progress tracking, and physical-wall versus navigation-clearance checks.
- Enemy movement changes:
  - Scouts, Brutes, Splitters, mini Scouts, and Wardens now use pursuit routing when direct approach is blocked; near-contact orbit is reduced so pressure continues.
  - Snipers keep standoff identity but seek reachable line-of-fire positions before shooting when cover blocks useful engagement.
  - Chargers reject blocked charge lanes, route before committing, and step charges through collision checks so they do not tunnel through obstacles.
  - Knockback/stagger movement now goes through the same collision-aware movement path and resets stale navigation state.
  - Enemy separation remains deterministic and stable under dense overlap tests.
- Spawn changes: `selectSpawnPoint` now scores reachable engagement-band candidates around the player in addition to arena perimeter candidates; it keeps player safety distance, obstacle/safe-zone clearance, and enemy spacing while preventing late-arena spawns from being needlessly far away.
- Cleanup performed: updated the existing telegraph-lock browser test to use valid unobstructed sniper/charger lanes while the new blocked-lane tests assert the new rejection behavior; added `src/enemy-navigation.js` to the service-worker app shell and Pages artifact validation so the new runtime module is release/offline-safe.
- Automated coverage added:
  - `tests/enemy-navigation.test.js` covers direct pursuit, vertical/horizontal obstacle routing, stuck recovery, solid geometry rejection, crowd separation stability, spawn safety, late-arena engagement distance, knockback recovery, sniper firing-position selection, charger lane rejection, and Warden guard preservation.
  - `tests/browser/enemy-navigation.spec.js` covers actual QA-runtime gameplay for obstacle routing, sniper repositioning, charger blocked-lane rejection, dense late-wave finite coordinates, obstacle avoidance, and pressure.
- Verification completed locally:
  - `npm run check`: passed.
  - `npm test`: passed, **116/116 Node tests**.
  - `npm run verify`: passed after final browser-test adjustment.
  - `npm run test:browser -- --workers=1`: passed, **205 passed, 51 skipped, 0 failed** across desktop Chromium, mobile landscape Chromium, desktop Firefox, and desktop WebKit.
  - `npm run verify:all` was run with the repository default 10 workers; it completed Node verification but the browser phase hit runner saturation/timeouts. The same full Playwright matrix then passed through the npm browser script with `--workers=1`.
- Browser QA/performance evidence:
  - Reproduced before fix: Wave 1 Scout, Wave 5 Brute, Wave 10 Splitter, Wave 30 Charger, and blocked Sniper scenarios stalled at obstacle-adjacent distances instead of converging.
  - After fix: controlled browser scenarios reached engagement without obstacle overlap or non-finite coordinates; no browser console/page errors were observed.
  - Dense performance diagnostics stayed capped at 18 enemies with finite frame telemetry; desktop Chromium same-runner candidate remained valid under the existing performance test, and mobile/Firefox/WebKit dense diagnostics passed.
- Publication status: pending final correction commit and push at the time of this status edit; final published `main` commit is the commit containing this section.

## Local audit - 2026-08-10

- Working folder inspected: `C:\Users\Abud\Desktop\GitHub\One-Bullet-Arena-main`.
- Current folder does not contain Git metadata, so local branch/commit status could not be verified from this checkout copy.
- Architecture confirmed as a static browser game/PWA using Canvas gameplay with semantic DOM/SVG UI.
- Runtime owner confirmed: `OneBulletGlobalUiRuntime` in `src/core/ui-repair-runtime.js`.
- Local Windows issue fixed: Playwright no longer depends on unavailable `python3 -m http.server`; browser tests now use `node ./scripts/static-server.js 4173`.
- Added `scripts/static-server.js`, a no-cache Node static file server used for local/browser verification.
- Added the static server to `npm run check` so syntax errors in the local server fail the normal verification gate.
- Installed npm dependencies locally; npm audit reported `found 0 vulnerabilities`.
- Verification passed locally:
  - `npm run verify`: passed, including syntax checks and **104/104 Node tests**.
  - `npm run test:browser`: passed with **185 passed, 51 skipped, 0 failed** across configured Playwright browser projects.
- Scope boundary: production GitHub Pages convergence was not checked in this local audit.

## Local UI/gameplay polish - 2026-08-10

- Dashboard presentation updated for a cleaner professional layout in English and Arabic:
  - reduced oversized card heights and dashboard width;
  - tightened run/snapshot/progression spacing;
  - added explicit RTL grid ordering for the run hero, snapshot panel, metrics, actions, and progression labels;
  - improved upgrade card legibility and Arabic alignment for the three upgrade choices.
- Arabic runtime behavior rechecked in the game HUD, dashboard, world progression, and upgrade selection.
- Player/enemy presentation cleaned:
  - removed the always-on player readiness halo;
  - reduced strong player, bullet, enemy, and telegraph glow/shadow values;
  - kept dash/catch/recall feedback as momentary animation rather than permanent aura.
- Local visual evidence captured:
  - `output/playwright/dashboard-en-audit.png`
  - `output/playwright/dashboard-ar-audit.png`
  - `output/playwright/combat-clean-audit.png`
  - `output/playwright/upgrade-ar-audit.png`
- Verification passed locally after the polish:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - Targeted dashboard/RTL/browser visual run: `npx playwright test tests/browser/render-quality.spec.js tests/browser/visual-review.spec.js tests/browser/global-ui-responsive.spec.js --project=desktop-chromium --project=mobile-landscape --workers=1` passed with **10 passed, 10 skipped, 0 failed**.
  - Targeted gameplay/control run: `npx playwright test tests/browser/core-loop.spec.js tests/browser/movement-controls.spec.js tests/browser/unified-ui.spec.js --project=desktop-chromium --project=mobile-landscape --workers=1` passed with **32/32**.
- Note: the same dashboard/visual subset timed out under heavier parallel capture before passing with `--workers=1`; no assertion failure remained in the serialized rerun.

## Local dashboard/gameplay redesign - 2026-08-10

- Reworked the dashboard beyond the earlier polish pass:
  - menu canvas/world art is hidden while the dashboard is open, removing the old map backdrop, center arrow, and trajectory visuals behind the UI;
  - run stats are now clear dashboard tiles instead of the old orbit-centered composition;
  - Arabic progression stays aligned left-to-right like English while labels remain RTL;
  - Arabic and English numeric output now uses English digits consistently through `i18n.number`.
- Upgrade flow changed to the requested cadence:
  - normal wave clears continue directly into the next wave;
  - upgrade cards are offered only every 5 waves;
  - tests now assert the wave-5 reward path and 5-wave arena expansion cadence.
- Progression/maps updated:
  - arena stages now open at waves `1, 5, 10, 15, 20, 25, 30, 35`;
  - later sectors are larger so the camera/exploration loop matters more;
  - a small bullet locator appears when the bullet is far away and not recalling.
- Upgrades were strengthened and expanded:
  - stronger damage, ricochet, recall, shock, dash, movement, health, and shield scaling;
  - added `phase-round`, `field-medic`, and `dash-impact`;
  - upgrade cards now use upgrade-specific icon families and accent colors.
- Gameplay cleanup:
  - fixed a movement bug where player Y movement was applied twice;
  - removed entity ground shadows and canvas glow blur from the active character/enemy render layers;
  - added simple obstacle-aware enemy steering so scouts/brutes/chargers/snipers do not only rush in a straight line;
  - charger telegraph direction remains locked before execution.
- Local visual evidence captured:
  - `output/playwright/dashboard-redesign-en.png`
  - `output/playwright/dashboard-redesign-ar.png`
  - `output/playwright/upgrade-redesign-ar.png`
  - `output/playwright/combat-no-shadow-map.png`
- Verification passed locally after redesign:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js --workers=1 --reporter=line`: **40/40 passed** across configured browser projects.
  - `npx playwright test tests/browser/event-foundation.spec.js tests/browser/ui-repair.spec.js tests/browser/unified-ui.spec.js --workers=1 --reporter=line`: **30 passed, 6 skipped, 0 failed** across configured browser projects.
  - Desktop Chromium targeted runs passed for: `visual-overhaul`, `global-ui-responsive`, `smooth-runtime`, `checkpoint-progression`, `checkpoint-visual`, `combat-depth`, `keyboard-controls`, `movement-controls`, `touch-safe-arena`, `warden-enemy`, `warden-visual`, `world-2d-visual`, `render-quality` visual matrix, and `visual-review`.
- Note: one monolithic `npm run test:browser -- --workers=1 --reporter=line` command timed out in this local desktop shell before producing useful output; the affected and heavy browser suites above were rerun in smaller serialized batches with no remaining assertion failure.

## Gameplay visibility hotfix - 2026-08-10

- Fixed a regression where the gameplay HUD entered `playing` but the Canvas render layer stayed hidden after leaving the redesigned dashboard.
- Root cause: the dashboard hide rule used `body[data-game-state="menu"]`, while the high-frequency DOM performance bridge updated `#game-ui-layer[data-state]` without also updating `body.dataset.gameState`.
- Fix:
  - `src/ui/dom-performance-bridge.js` now keeps `document.body.dataset.gameState` synchronized on state transitions;
  - `styles/ui.css` includes a protective fallback that forces `.game-render-layer` visible whenever the UI layer is in `playing`, `paused`, `upgrade`, or `gameover`.
- Local non-QA browser evidence captured: `output/playwright/gameplay-visible-hotfix.png`.
- Verification after hotfix:
  - ordinary `http://127.0.0.1:4173/` page starts gameplay with `body=playing`, `#game-ui-layer=playing`, and `.game-render-layer` opacity `1`;
  - `npm run verify`: passed, including **104/104 Node tests**.

## Physics/effects cleanup - 2026-08-10

- Reworked bullet catch feedback from map effects into gameplay physics:
  - catching a returning bullet now pushes nearby enemies away from the player and briefly staggers their steering pressure;
  - the catch impulse also applies to enemies still in their spawn entry window so early close-pressure waves feel responsive;
  - enemy catch cooldown handling now guards against undefined cooldown values.
- Added the new `kinetic-catch` upgrade:
  - localized in English and Arabic;
  - included in upgrade cards/icons/effect text;
  - stacks strengthen the catch knockback radius and force.
- Cleaned active combat visuals:
  - removed large catch/radial glow fills, spawn rings, shield halos, dash circles, Warden guard rings, and center-platform/floor rings;
  - impact, recall, catch, shield, precision, overdrive, and muzzle feedback now use short directional strokes instead of circular map effects;
  - kill bursts and mini-splitter particles were reduced further.
- Local visual evidence captured:
  - `output/playwright/physics-catch-pass-clean.png`
  - `output/playwright/physics-catch-canvas-clean.png`
- Verification after cleanup:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/combat-depth.spec.js tests/browser/visual-overhaul.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **17/17 passed**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/visual-overhaul.spec.js tests/browser/world-2d-visual.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **14/14 passed**.

## Player/enemy visual cleanup - 2026-08-10

- Removed the two external side markers that appeared beside the player from shield, catch, precision, overdrive, and catch-recovery presentation layers.
- Rebuilt the player body as a stronger armored directional craft with integrated hull plates, a clearer cyan core, and a sharper bullet muzzle, without external halos.
- Removed circular enemy health/alert rings from the active visual-overhaul layer; enemy health remains readable through compact bars.
- Replaced remaining fallback circular charger, shield-block, second-chance, and muzzle-flash effects with directional lines or text-only feedback.
- Local visual evidence captured:
  - `output/playwright/player-enemy-clean-pass.png`
  - `output/playwright/player-enemy-clean-canvas.png`
- Verification after cleanup:
  - `npm run verify`: passed, including **104/104 Node tests**.
  - `npx playwright test tests/browser/core-loop.spec.js tests/browser/visual-overhaul.spec.js tests/browser/world-2d-visual.spec.js tests/browser/warden-visual.spec.js --project=desktop-chromium --workers=1 --reporter=line`: **14/14 passed**.

## Runtime architecture

v3.8 preserves the accepted DOM + HiDPI presentation architecture while replacing render-frame-dependent gameplay timing with an explicit simulation/render boundary.

- Browser rendering remains driven by native `requestAnimationFrame()` with no artificial 60 FPS render cap.
- Gameplay simulation advances through a bounded **120 Hz fixed timestep**.
- The fixed-step accumulator allows at most **8 catch-up simulation steps** after a stall and discards excessive backlog rather than entering a spiral of death.
- Simulation cadence is independent of 60/120/144/165/240 Hz presentation cadence.
- Player, bullet, enemies, hostile projectiles, camera-linked presentation, and other moving visuals interpolate between simulation transforms while collision/gameplay truth remain simulation-owned.
- Visibility/focus timing resets prevent background-tab time from becoming a giant gameplay delta.

## Adaptive rendering quality

Rendering quality is visual-only and does not alter enemy count, AI, collision, damage, movement speed, bullet speed, wave progression, checkpoint state, or scoring rules.

| Tier | DPR ceiling | Backing-pixel budget |
| --- | ---: | ---: |
| ULTRA | 2.50 | 8.5 Mpx |
| HIGH | 2.25 | 7.2 Mpx |
| BALANCED | 1.75 | 5.2 Mpx |
| PERFORMANCE | 1.35 | 3.3 Mpx |

`AUTO` is the default and uses sustained frame-pacing pressure/headroom windows plus cooldown hysteresis. Expensive backing-store changes are deferred to safe presentation states.

## High-DPI / DOM presentation

The rendering contract remains:

1. **Simulation:** 1280×720 logical coordinates.
2. **Canvas display:** centered 16:9 contain rectangle.
3. **Canvas backing store:** CSS display size × effective quality-aware DPR.
4. **Application UI:** semantic HTML + CSS + SVG where practical.

`src/render/canvas-viewport.js` remains the single owner of display geometry, pointer/touch mapping, backing-store dimensions, DPR constraints, and backing-pixel budgets.

DOM-owned surfaces remain the Dashboard, desktop HUD, utility/settings controls, World Progression, late-game minimap, Pause, Upgrade Selection, and Game Over. Canvas remains responsible for world/gameplay rendering and touch gameplay controls.

## Smooth-runtime performance work

- `src/performance/frame-pacer.js` owns fixed-step accumulation and frame-pacing telemetry.
- `src/performance/quality-manager.js` owns AUTO/manual quality profiles and hysteresis.
- `src/ui/dom-performance-bridge.js` caches high-frequency DOM/minimap nodes and invalidates exploration geometry only when required.
- HUD synchronization is dirty-state/cadence limited instead of rebuilding at every high-refresh render opportunity.
- Particle/trail work is time/simulation based rather than emitted once per render frame.
- QA telemetry tracks frame-time distribution, display cadence, simulation steps, long frames, effective DPR, quality tier, particles, enemies, and DOM/minimap writes.

## Input / gameplay compatibility

Input mapping continues to use the Canvas CSS rectangle rather than physical backing-store pixels:

`screen coordinate → contained Canvas rectangle → 1280×720 logical coordinate → world/camera transform`

v3.8 preserves checkpoint compatibility, scoring semantics, one-bullet physics/ricochet, enemy behavior, encounter balance, upgrades, world expansion, Warden mechanics, controls, and saved progression.

## Browser/UI behavior

- English and Arabic remain centralized in `src/i18n.js`.
- RTL document direction and logical CSS remain active.
- Browser typography and SVG icons remain the presentation source for migrated application UI.
- Mobile landscape remains a dedicated compact composition rather than a scaled desktop dashboard.
- `prefers-reduced-motion` remains supported.
- PWA/service-worker installation remains local-first and offline-capable.

## Final pre-merge verification

Final cleanup head `5b1e1b83925bfa3a6ea570e616024d96a222fa7b` passed both required PR gates before merge:

- **Verify #1309:** success; Node/source verification green.
- **Browser Smoke #481:** **236 Playwright cases total — 185 expected/passed, 51 intentionally skipped by project/capability conditions, 0 failed, 0 flaky**.
- Browser projects: desktop Chromium, mobile landscape Chromium, desktop Firefox, desktop WebKit.
- Visual evidence checked at desktop 2560×1440, dense Wave 67 combat, and Arabic mobile landscape; no clipping or leaked `FPS N/A` overlay was present in the v3.8 artifact.

The earlier accepted runtime head `8dc142b35a203f535dfba036145ee5ad87918f5a` also passed **Verify #1304 with 104/104 Node tests** and **Browser Smoke #476 with the same 236-case / 0-failure browser contract**.

The WebKit telemetry regression was fixed at the contract level: tests require live positive finite frame-time telemetry and actual rAF activity without assuming an arbitrary minimum sample count within one headless-runner wall-clock window. Fixed simulation cadence and encounter/performance constraints remain enforced.

## Repository / CI cleanup

- Verify no longer runs twice for the same feature-branch change through both `push` and `pull_request` events.
- Browser Smoke is a pull-request/manual quality gate; production Pages deployment runs the full `verify:all` source/browser gate again before publishing.
- GitHub Pages no longer writes a synthetic diagnostics commit after every deployment.
- Generated `_site/`, Playwright results/reports, verification output, coverage output, dependency folders, and logs are ignored by Git.
- GitHub Actions workflow dependencies were updated to their supported major generations used by this repository.
- Deployment builds a clean `_site` artifact from tracked application files and creates `release.json` with version/channel/source SHA.
- Live deployment verification polls `release.json` and `src/release-config.js` and requires the exact version, `smooth-runtime` channel, and production commit SHA before the Pages workflow succeeds.
- The obsolete `deployment-proof` branch tip was reset to the current production history, removing its stale `verification/workflow-status.json` payload; the workflow will not recreate that diagnostics payload.
- The merged feature branch tip was synchronized to production so it no longer holds the old unsquashed release stack as an active branch tip.

Historical source filenames such as `movement-hotfix-runtime.js`, `visual-design-runtime.js`, and inherited core runtime layers are **active dependencies**, not orphaned files. They remain reachable in the import/inheritance graph. Deleting them merely because their names are historical would break the game; generated/stale artifacts were cleaned instead.

## Production deployment gate

PR #52 has been squash-merged into `main`. The source of truth on `main` now reports `3.8.0-smooth-runtime`, channel `smooth-runtime`.

Production is considered converged only when the Pages workflow for the latest `main` commit completes all of the following:

1. installs dependencies and Playwright browsers;
2. completes `npm run verify:all` successfully;
3. builds the clean Pages artifact;
4. deploys through the `github-pages` environment;
5. reads the live `release.json` and `src/release-config.js` back from GitHub Pages and confirms the exact v3.8 version/channel/source SHA.

A browser tab that was already open on v3.7 may briefly retain the old document until the new Pages artifact has converged. The service worker uses a versioned cache, `skipWaiting()`, `clients.claim()`, network-first same-origin fetching with reload semantics, and a guarded `controllerchange` reload so an installed PWA/browser session can move to the new release without preserving the old application shell indefinitely.

## Remaining known limitations

- Touch gameplay controls intentionally remain Canvas-rendered because they are coupled to gameplay safe zones/input semantics; they use the HiDPI renderer and logical input mapper.
- No bundled WOFF2 family is introduced; system/local font fallbacks preserve offline behavior without an external runtime font dependency.
- Quality tiers intentionally cap effective DPR/backing pixels on very large/high-density screens. Effective DPR can therefore be lower than device DPR to prevent excessive GPU/memory cost.

No known release-blocking runtime defect remains in the merged v3.8 code. The remaining release condition is the automated production Pages convergence check described above.
