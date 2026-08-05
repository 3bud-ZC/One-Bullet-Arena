# One Bullet Arena — Status

Last updated: 2026-08-05

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current release: **v1.4.1 — Difficulty & Pacing Rebalance**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- Combat & Mobile Expansion: **merged through Pull Requests #20–#22**
- Regional Map Overhaul: **merged through Pull Request #23**
- Mobile & Browser UI Stabilization: **merged through Pull Request #24**
- Runtime Kernel & Objective Rooms: **merged through Pull Request #25**
- v1.4.1 Difficulty & Pacing Rebalance: **squash-merged through Pull Request #26**
- v1.4.1 merge commit: `a8ed0dc3d871c4457053268cfe708c6fd574163a`
- GitHub Pages deployment: **triggered by the Pull Request #26 merge and this status update**
- Current state: **implementation, deterministic verification, Chromium verification, PWA integration, visual review, documentation, and merge complete; deployed-build and physical-device acceptance remain**

## v1.4.1 delivered

### Deterministic eight-wave pacing curve

- Added a dedicated Runtime Kernel system named `difficulty-pacing-rebalance`.
- Added a deterministic local-wave curve that resets when Story Mode enters a new region.
- Every local wave now defines:
  - enemy threat budget;
  - maximum simultaneous population;
  - Elite cap;
  - Evolution cap;
  - enemy health and movement scaling;
  - hazard scaling;
  - reinforcement delay;
  - target encounter duration.
- Budget growth is progressive and avoids the previous late-wave spike caused by expanded compositions, Objective Rooms, Evolutions, Elites, and hazards stacking together.

### Safer onboarding and controlled escalation

- Local waves 1 and 2 contain no Elites or Evolutions.
- The v1.2 map-mutator layer is suppressed during the first two local waves.
- Active hazard pressure begins gradually from wave 3 and reaches full intensity only on wave 8.
- Enemy health and movement are reduced in earlier waves and converge toward the full values by the regional lockdown.
- Population and threat-budget trimming preserve a minimum readable encounter while removing excess high-cost enemies.
- Extra Elites are demoted safely instead of deleted.
- Extra Evolutions are cleared without leaving rage-speed or shell state behind.

### Difficulty-specific behavior

- **Recruit:** lower threat budgets, smaller population caps, slower reinforcements, and stronger recovery support.
- **Hunter:** balanced default pacing with controlled checkpoint recovery.
- **Corebreaker:** higher budgets and Evolution pressure with limited adaptive relief.
- **One-Hit Protocol:** highest pressure profile and no recovery support.
- Daily Challenge, Corebreak Protocol, Endless, and Boss Rush retain their dedicated balancing systems and are not modified by this regional/story pacing layer.

### Objective Room rebalance

On the default Hunter difficulty:

- Circuit Sequence remains at three relays.
- Ricochet Lock uses reduced bounce and hit requirements.
- Core Defense uses:
  - 14-second stabilization;
  - four Core health;
  - maximum two active assault enemies;
  - a reduced failure-time penalty.
- Marked Hunt requires two ordered targets.
- Bullet Separation uses:
  - eight-second target duration;
  - 190-pixel minimum separation;
  - slower progress decay when the bullet returns too close.
- Objective reinforcement delays use the current wave plan.
- Reinforcements pause when objective progress approaches completion.

### Recovery and adaptive relief

- Hunter recovery checkpoints occur after local waves 2, 4, and 6 when health is missing.
- Critical-health Hunter runs can receive emergency recovery outside those checkpoints.
- Recovery is processed through the Runtime Kernel wave-advancement gate.
- No recovery is granted while an active Objective Room blocks progression.
- One-Hit Protocol never receives pacing recovery.
- One emergency relief event may occur per wave at critical health:
  - grants one shield outside One-Hit;
  - slightly reduces active enemy speed;
  - demotes one high-threat Elite when available;
  - delays Objective Room reinforcements.
- Encounters exceeding the configured target duration receive deterministic soft-cap relief every 18 seconds instead of becoming long attrition stalls.

### QA diagnostics and offline integration

- `game.getPacingSnapshot()` exposes the active plan, pressure counts, relief events, and objective tuning on the QA route.
- Package version advanced to **1.4.1**.
- Service-worker cache advanced to `one-bullet-arena-v1.4.1`.
- Pacing data and runtime modules are included in the offline application shell.

## Gameplay retained

- Twenty-four regional arena identities remain active.
- Regional missions remain eight waves and Story Mode remains twenty-four waves.
- Five Objective Rooms, progressive map hazards, moving geometry, Cores, techniques, Overdrive, Relics, Synergies, regional enemies, three Guardians, Corebreak Protocol, Endless, Boss Rush, Contracts, Gamepad, unified save, PWA, and offline support remain connected.

## Verification

### Deterministic verification

- JavaScript syntax checks: **passed** for every runtime module, service worker, and Playwright configuration.
- Automated deterministic tests: **144/144 passed**.
- Failures: **0**.
- Final Verify workflow on the Pull Request #26 documentation/status commit: **passed**.
- New coverage verifies:
  - regional wave reset every eight waves;
  - smooth budget growth without a late spike;
  - safe waves 1–2;
  - full hazard pressure only on wave 8;
  - Recruit/Hunter/Corebreaker ordering;
  - enemy threat costs and modifiers;
  - Hunter objective tuning;
  - checkpoint and emergency recovery;
  - One-Hit recovery exclusion.

### Browser verification

- Playwright Browser Smoke: **34/34 passed** across Desktop Chromium and Mobile Landscape Chromium.
- Unexpected, flaky, and skipped tests: **0**.
- Final Browser Smoke workflow on the Pull Request #26 documentation/status commit: **passed**.
- Coverage confirms:
  - Runtime Kernel registration of the pacing system;
  - pacing release `1.4.1` and zero runtime diagnostic errors;
  - wave-one population, Elite, and Evolution caps;
  - wave-four Core Defense tuning;
  - recovery blocked before objective completion;
  - recovery granted after objective completion;
  - direct route, menu, Command Center, Core Hub, gameplay, results, viewport matrix, Objective Rooms, and PWA assets remain operational.

### Visual QA completed

- Reviewed Core Defense on Desktop Chromium.
- Reviewed Core Defense on Mobile Landscape Chromium.
- Confirmed:
  - Core Defense uses the compact centered objective panel;
  - the mobile HUD, objective panel, movement stick, and action controls remain inside the viewport;
  - the central Core, moving geometry, enemies, and objective timer remain readable;
  - normal challenge feedback remains independent from the objective panel;
  - no page overflow or external browser-shell elements return.

## Remaining live acceptance checks

These require deployed play, longer runs, or physical hardware and are not marked complete:

1. Complete a full eight-wave Hunter regional mission using normal player input.
2. Complete the twenty-four-wave Story Route and confirm the pacing curve resets per region.
3. Compare Recruit, Hunter, and Corebreaker on the same Core and region.
4. Review Core Defense pressure after several real attempts rather than QA wave setup.
5. Review Ricochet Lock with all five Bullet Cores.
6. Review Bullet Separation with Recall Core and magnetic-recall upgrades.
7. Confirm emergency relief is helpful without making deliberate low-health play optimal.
8. Test the deployed GitHub Pages build after deployment completes.
9. Test Chrome Android, Samsung Internet, and Safari iOS on physical devices.
10. Test installed PWA launch and offline restart using cache v1.4.1.

## Live refresh note

The service-worker cache advances from v1.4.0 to v1.4.1. After deployment, use a hard refresh on desktop or clear the site's stored data on mobile if the old pacing build remains visible.
