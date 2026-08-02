# One Bullet Arena — Status

Last updated: 2026-08-03

## Release status

- Product: **One Bullet Arena: Corebreak Protocol**
- Approved Corebreak Protocol scope: **100% implemented**
- Current production version: **v1.0.0**
- UI stabilization candidate: **v1.0.1**
- Corebreak Phases 1–5: **merged through Pull Requests #14–#18**
- UI/UX Stabilization Pass: **implemented on Pull Request #19**
- Current state: **PR #19 implementation, automated verification, and screenshot review are complete; final workflows after this status commit are required before merge**

## v1.0.1 UI/UX stabilization delivered

### Main menu hierarchy

- Replaced the competing multi-panel menu with one dominant next-run panel.
- Added one clear primary Start action.
- Kept Protocol and mission selection as explicit secondary actions.
- Reduced the daily challenge to one focused card.
- Consolidated secondary destinations into a compact quick-access section.
- Kept mission, selected Core, score, victories, shards, and run totals readable without covering navigation.

### Command Center

- Rebuilt the screen as a consistent 4×2 grid.
- Increased card size, title readability, touch area, and visual separation.
- Converted mixed English/Arabic card copy to clear Arabic UI copy.
- Preserved direct access to Protocol, game modes, Enemy Codex, Guardian Mastery, Build Codex, tutorial, Gamepad, and unified backup.

### Core Hub

- Replaced five dense information cards with a Core selector and one large detail panel.
- Added clear locked, unlocked, and equipped states.
- Separated description, traits, mastery statistics, price, and primary action.
- Increased contrast for save export/import controls.
- Kept every card and action inside the desktop and mobile landscape canvas.

### Combat HUD and announcements

- Replaced the layered HUD with compact edge panels.
- Top-left now contains bullet and dash state.
- Top-right now contains wave, score, and health.
- Combo and Guardian health appear only when relevant.
- Region introduction and run challenge announcements are now queued instead of appearing simultaneously.
- Removed the normal-player performance telemetry panel.
- Preserved mobile movement, dash, recall, Overdrive, build, and pause controls.

### Responsive application shell

- Removed desktop page scrolling at the tested 1440×900 viewport.
- Converted the shell to a strict dynamic-viewport layout.
- Canvas sizing now uses the available grid area instead of fixed viewport subtraction.
- Mobile gameplay uses the full height after the toolbar is hidden.
- Removed the previous black strip beneath active mobile gameplay.
- Fullscreen and PWA layouts retain 16:9 containment.

### Offline integration

- Package version advanced to **1.0.1**.
- Service-worker cache advanced to `one-bullet-arena-v1.0.1`.
- New stabilization CSS and runtime modules are included in the offline application shell.

## Automated verification

### Node verification

- Syntax checks include all existing runtime modules plus:
  - `src/ui-ux-stabilization.js`;
  - `src/ui-ux-runtime-fixes.js`.
- Deterministic tests: **95/95 passed**.
- Failures: **0**.

### Browser verification

- Playwright Browser Smoke: **10/10 passed** on the latest UI implementation commit.
- Layouts covered:
  - desktop Chromium at 1440×900;
  - Chromium mobile landscape at 915×412 with touch enabled.
- Browser checks cover:
  - zero document overflow;
  - menu rendering;
  - Command Center navigation;
  - Core selector/detail layout;
  - real gameplay entry;
  - compact HUD containment;
  - full-height mobile gameplay;
  - manifest, service worker, stylesheet, and runtime-fix reachability.

## Visual QA completed

Three screenshot review rounds were performed.

1. The first round exposed desktop document overflow.
2. The second round exposed simultaneous challenge/region announcements, a mobile gameplay bottom strip, mixed-direction card copy, and low-contrast secondary controls.
3. The final round confirmed:
   - no desktop or mobile document scroll;
   - clean menu hierarchy;
   - clean Arabic Command Center cards;
   - readable Core Hub details;
   - high-contrast secondary actions;
   - one major combat announcement at a time;
   - full-height phone landscape gameplay;
   - no previous overlap or black-strip defects.

Screenshots for menu, Command Center, Core Hub, and gameplay on desktop and mobile landscape are stored in GitHub Actions artifacts.

## Remaining live acceptance checks

These require the project owner or physical hardware and are not unfinished implementation work:

1. Review v1.0.1 on the live GitHub Pages build after deployment.
2. Test Chrome Android, Samsung Internet, and Safari iOS landscape behavior.
3. Test a physical Gamepad and remapping flow.
4. Verify the installed PWA after an offline restart.
5. Complete a unified backup export/import in a real browser profile.
6. Play a long Endless run and Boss Rush to review HUD density under extended combat.

## Pull Request #19 release gate

Before merge:

- Verify must pass on this final status commit.
- Browser Smoke must pass on this final status commit.
- Pull Request #19 must remain mergeable.

After merge:

- GitHub Pages deployment will be triggered.
- Existing installations may require a hard refresh or site-data reset because the service-worker cache advances from v1.0.0 to v1.0.1.
