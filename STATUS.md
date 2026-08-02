# One Bullet Arena — Status

Last updated: 2026-08-02

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol implementation completion: **100%**
- Release version: **v1.0.0**
- Corebreak Phases 1–5: **implemented and merged through Pull Requests #14–#18**
- Pull Request #18: **squash-merged to main after successful final verification**
- Merge commit: `5c28a51a5957535d5bfabd9236b01b71b8cb700f`
- GitHub Pages deployment: **triggered by the release merge and this status update**
- Current state: **v1.0.0 implementation and automated release gates complete; live owner/device acceptance remains**

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

### Phase 5 — Production Release

- Interactive seven-step in-arena tutorial.
- Gamepad movement, aiming, actions, deadzone, sensitivity, Y inversion, and button remapping.
- Unified save export/import for progression, Enemy Codex, Guardian Mastery, Build Codex, mode records, mission/mobile/release settings, tutorial status, and legacy scores.
- Runtime performance sampling and quality-specific frame budgets.
- Final PWA metadata, standalone landscape configuration, and v1.0.0 offline application shell.
- Updated release README, control documentation, and accessibility live announcements.
- Final Command Center consolidating Protocol, modes, Codices, tutorial, Gamepad, and backup tools.

## Final automated verification

### Node verification

- JavaScript syntax checks: **passed** for all runtime modules, Playwright configuration, and service worker.
- Automated deterministic tests: **95/95 passed**.
- Failures: **0**.
- Final Verify workflow on the Pull Request #18 status commit: **passed**.

### Browser verification

- Playwright Browser Smoke: **10/10 passed**.
- Final Browser Smoke workflow on the Pull Request #18 status commit: **passed**.
- Layouts covered:
  - desktop Chromium at 1440×900;
  - Chromium mobile landscape at 915×412 with touch enabled.
- Browser coverage includes:
  - menu rendering;
  - Command Center navigation;
  - Core Hub layout;
  - real gameplay entry and viewport containment;
  - PWA manifest and service-worker reachability.
- Desktop and mobile screenshots were uploaded as GitHub Actions artifacts and manually reviewed.

## Visual QA completed

- Browser screenshots exposed stacked expansion buttons during the release candidate review.
- The defect was fixed before merge by consolidating all expansion systems into a Command Center.
- The Core Hub was redrawn with fixed spacing for descriptions, traits, mastery statistics, and actions.
- Performance telemetry was removed from the normal player HUD.
- Final menu, Command Center, Core Hub, and gameplay screenshots were reviewed on desktop and mobile landscape without the previous overlap defects.

## Live acceptance checks

These checks require the project owner or physical devices and are not unfinished implementation work:

1. Test a physical Gamepad, including remapping and reconnect behavior.
2. Test Chrome Android plus Safari iOS or Samsung Internet on real devices.
3. Install the PWA and reopen it offline after one complete online load.
4. Export and import a unified backup in a real browser profile.
5. Complete a long Endless run beyond wave 15 and review balance.
6. Complete Boss Rush and at least two Core Contracts.
7. Complete the interactive tutorial with keyboard/mouse and touch.
8. Review Guardian, Relic, Broken Energy, and reward balance during extended play.

## Live refresh note

The service-worker cache changes from v0.12.0 to v1.0.0. If an older build remains visible, use a hard refresh on desktop or clear the site's stored data on mobile before reopening the game.
