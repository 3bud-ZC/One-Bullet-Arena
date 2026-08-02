# One Bullet Arena — Status

Last updated: 2026-08-02

## Release status

- Active target: **One Bullet Arena: Corebreak Protocol v1.0.0**
- Implementation completion for the approved Corebreak Protocol scope: **100%**
- Corebreak Phases 1–4: **implemented and merged through Pull Requests #14–#17**
- Corebreak Phase 5 — Production Release Candidate: **implemented on Pull Request #18**
- Browser build: **v1.0.0**
- Current state: **Pull Request #18 open; Verify passed 95/95 and Browser Smoke passed 10/10 on the latest gameplay/UI commit; final verification after this status commit is required before merge**

## Corebreak Protocol delivered

### Phase 1 — The Three Guardians

- Mirror Guardian with reflection, decoys, and temporary movement inversion.
- Bullet Hunter with bullet pursuit, safe magnetic capture/release, and recall vulnerability windows.
- Rift King with portals, gravity shifts, and arena segmentation.
- Three combat phases, intros, regional presentation, persistent Guardian Mastery, and shard rewards.

### Phase 2 — Branching Roguelite Route

- Three-act route across Neon, Reactor Forge, and Void Circuit.
- Combat, Elite, Forge, Shop, Recovery, Mystery, Challenge, and Boss nodes.
- Deterministic route generation and challenge selection.
- Temporary Broken Energy economy for purchases and route decisions.
- Guardian chapter gates and complete Protocol victory flow.

### Phase 3 — Advanced Builds

- Five Core-specific Overdrive modes.
- Exactly 25 gameplay-changing Relics across four rarity tiers.
- Six advanced Core/Relic Synergies.
- Relic drops, purchases, combat effects, and run inspection.
- Persistent Build Codex with discoveries, pick counts, Synergies, and Overdrive usage.

### Phase 4 — Game Modes

- Endless Mode with regional rotation, scaling pressure, and a Guardian every five waves.
- Boss Rush with the three Guardians and upgrade intermissions.
- Five Core Contracts with forced rules, rewards, and persistent records.
- Dedicated mode screens and local best-value tracking.

### Phase 5 — Production Release Candidate

- Interactive seven-step in-arena tutorial.
- Gamepad movement, aiming, actions, deadzone, sensitivity, Y inversion, and button remapping.
- Unified save export/import for progression, Enemy Codex, Guardian Mastery, Build Codex, mode records, mission/mobile/release settings, tutorial status, and legacy scores.
- Runtime performance sampling and quality-specific frame budgets.
- Final PWA metadata, standalone landscape configuration, and v1.0.0 offline application shell.
- Updated release README, control documentation, and accessibility live announcements.
- Final Command Center consolidating Protocol, modes, Codices, tutorial, Gamepad, and backup tools.

## Automated verification

### Node verification

- JavaScript syntax checks: **passed** for all runtime modules, Playwright configuration, and service worker.
- Automated deterministic tests: **95/95 passed**.
- Failures: **0**.

### Browser verification

- Playwright Browser Smoke: **10/10 passed**.
- Browsers/layouts covered:
  - desktop Chromium at 1440×900;
  - Chromium mobile landscape at 915×412 with touch enabled.
- Browser coverage includes:
  - menu rendering;
  - Command Center navigation;
  - Core Hub layout;
  - real gameplay entry and viewport containment;
  - PWA manifest and service-worker reachability.
- Desktop and mobile screenshots are uploaded as GitHub Actions artifacts.

## Visual QA performed

- The first browser screenshot run exposed stacked expansion buttons over the fighter profile.
- The release was not merged with that defect.
- The menu was rebuilt around one clean Command Center and one direct Protocol action.
- The Core Hub was redrawn with fixed card spacing for descriptions, traits, mastery statistics, and actions.
- Performance telemetry was removed from the normal player HUD.
- Final desktop and mobile screenshots for the menu, Command Center, Core Hub, and gameplay were manually reviewed and found visually clear without the previous overlaps.

## Final manual acceptance gate

Implementation and automated release gates are complete. The following remain owner/device acceptance checks rather than unfinished systems:

1. Test a physical Gamepad, including remapping and reconnect behavior.
2. Test Chrome Android plus Safari iOS or Samsung Internet on real devices.
3. Install the PWA and reopen it offline after one complete online load.
4. Export and import a unified backup in a real browser profile.
5. Complete a long Endless run beyond wave 15 and review balance.
6. Complete Boss Rush and at least two Core Contracts.
7. Complete the interactive tutorial with keyboard/mouse and touch.
8. Review Guardian, Relic, and Broken Energy balance during extended play.

## Pull Request #18 release gate

Before merge:

- Verify workflow must pass on this final status commit.
- Browser Smoke workflow must pass on this final status commit.
- Pull Request #18 must remain mergeable.

After merge:

- GitHub Pages deployment will be triggered.
- The live v1.0.0 build requires a hard refresh or site-data reset because the service-worker cache changes from v0.12.0 to v1.0.0.
