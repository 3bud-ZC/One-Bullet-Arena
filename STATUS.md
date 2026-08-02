# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current release: **v1.2.1 — Progressive Hazard Curve**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **merged through Pull Request #19**
- v1.2.0 Combat & Mobile Expansion: **squash-merged through Pull Request #20**
- v1.2.1 Progressive Hazard Hotfix: **squash-merged through Pull Request #21**
- v1.2.1 merge commit: `1f5084515556b9dc96f902276caa3cec8d5edabc`
- GitHub Pages deployment: **triggered by the Pull Request #21 merge and this status update**
- Current state: **implementation, deterministic verification, browser verification, and mobile viewport checks complete; deployed-build and physical-device acceptance remain**

## v1.2.1 progressive hazard curve delivered

### Regional difficulty progression

Environmental hazards no longer begin at full strength in the first round of a region.

- **Wave 1 — Safe introduction**
  - no active environmental hazard;
  - the player learns the arena geometry and enemy behavior first.
- **Wave 2 — Visual preview**
  - the upcoming hazard is shown visually;
  - no hazard damage, force, or trajectory disruption is applied.
- **Wave 3 — Hazard level 1/6**
  - the first active hazard begins at low intensity.
- **Wave 4 — Hazard level 2/6**
  - speed, size, force, or frequency increases.
- **Wave 5 — Hazard level 3/6**
  - environmental pressure becomes a consistent combat factor.
- **Wave 6 — Hazard level 4/6**
  - stronger hazard timing is combined with assault-wave reinforcements.
- **Wave 7 — Hazard level 5/6**
  - late-run pressure increases further.
- **Wave 8 — Hazard level 6/6**
  - the region reaches maximum environmental intensity before the Guardian encounter.

The progression resets when Story mode enters a new region, so Neon, Reactor Forge, and Void Circuit each introduce their mechanics clearly before reaching full intensity.

### Neon correction

- The Laser Sweep is completely absent during wave 1.
- Wave 2 displays a harmless laser preview.
- The Laser Sweep first becomes active during wave 3.
- Pulse Gates and Laser Sweep alternate only after environmental danger has activated.
- Laser travel speed, collision width, and damage frequency increase progressively through later waves.

### All regional mutators now scale

- **Neon Laser Sweep:** movement speed, collision width, and damage interval.
- **Neon Pulse Gates:** activation frequency and displacement force.
- **Reactor Heat Cycle:** cycle speed, heated radius, and damage interval.
- **Reactor Piston Line:** movement speed, line width, player force, and bullet force.
- **Void Gravity Tide:** polarity speed and gravitational force on the player and bullet.
- **Void Rift Storm:** activation frequency, trajectory shift, and bullet acceleration.

### Integration

- Added `src/progressive-map-hazards.js` as the authoritative environmental difficulty layer.
- Prevented the previous fixed-strength v1.2 mutator runtime from applying duplicate effects.
- Updated wave announcements to show:
  - safe introduction;
  - early warning;
  - active hazard name;
  - current hazard level.
- Package version advanced to **1.2.1**.
- Visible menu version advanced to **v1.2.1**.
- Service-worker cache advanced to `one-bullet-arena-v1.2.1`.
- The progressive hazard runtime is included in the offline application shell.

## v1.2.0 foundation retained

### Direct game route and mobile shell

- The public GitHub Pages route opens directly into the full-viewport game surface.
- External title blocks, source links, build badges, toolbars, and footer instructions remain removed.
- Dynamic viewport units, safe-area insets, zero document overflow, portrait gating, and 16:9 containment remain enabled.
- Mobile landscape coverage includes 740×360, 844×390, 873×393, 915×412, and 932×430.

### Longer runs and combat systems

- Regional missions contain **8 waves**.
- Story runs contain **24 waves**, with eight waves per region.
- Daily runs remain compact at five waves.
- Kinetic Pulse and Phase Shift remain available on keyboard and touch.
- Enemy Evolutions remain available: Armored Shell, Blink Drive, Volatile Core, and Rage Engine.
- Assault-wave reinforcements, advanced enemy compositions, regional bosses, Relics, Synergies, Overdrive, Endless, Boss Rush, and Core Contracts remain intact.

## Final verification

### Deterministic verification

- JavaScript syntax checks: **passed** for every runtime module, Playwright configuration, and service worker.
- Automated deterministic tests: **106/106 passed**.
- Failures: **0**.
- New regression coverage confirms:
  - wave 1 has no environmental hazard;
  - wave 2 is preview-only;
  - environmental danger begins during wave 3;
  - intensity increases strictly from waves 3 through 8;
  - Neon begins with Laser Sweep and alternates only after activation;
  - invalid wave values normalize safely.

### Browser verification

- Playwright Browser Smoke: **14/14 passed** on the final Pull Request #21 head commit.
- Desktop and mobile Chromium checks passed.
- Coverage confirms:
  - direct full-viewport route;
  - menu, Command Center, and Core Hub navigation;
  - real gameplay entry and combat techniques;
  - five-size mobile landscape matrix;
  - portrait orientation gate;
  - zero document overflow;
  - PWA manifest and service worker;
  - v1.2.1 offline cache identity;
  - progressive hazard runtime reachability.

## Remaining live acceptance checks

These checks require the deployed build, extended owner play, or physical hardware:

1. Review the deployed v1.2.1 GitHub Pages build after deployment completes.
2. Confirm the first regional wave is hazard-free in an actual full run.
3. Confirm wave 2 previews the hazard without applying damage or force.
4. Review the feel of the six intensity levels through wave 8.
5. Test Chrome Android, Samsung Internet, and Safari iOS landscape on physical devices.
6. Test the installed PWA after an offline restart.
7. Review late-wave balance alongside Elite enemies, Evolutions, and assault reinforcements.

## Live refresh note

The service-worker cache advances from v1.2.0 to v1.2.1. If the old full-strength first-wave hazard remains visible, perform a hard refresh on desktop or clear the site's stored data on mobile before reopening the game.
