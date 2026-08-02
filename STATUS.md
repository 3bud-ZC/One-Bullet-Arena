# One Bullet Arena — Status

Last updated: 2026-08-02

## Completion

- Overall project completion: **94%**
- Milestones 01–03D: **100% implemented**
- Milestone 03E — Final Live UI QA: **100% implemented**
- Milestone 04A — Regions and Run Structure: **100% implemented**
- Milestone 04A.1 — Mobile Browser Optimization: **100% implemented**
- Current state: **Pull Request #12 squash-merged to main after successful final verification; GitHub Pages deployment triggered; live phone-browser review is required before acceptance**
- Browser build: **v0.7.1**

## Milestone 04A.1 implemented

### Mobile viewport and safe areas

- Replaced width-only mobile scaling with a viewport-aware layout constrained by both available width and height.
- Uses `visualViewport` and `100dvh` so Chrome/Safari browser toolbar changes no longer crop the bottom controls.
- Added `viewport-fit=cover` safe-area support for notches, rounded corners, and gesture areas.
- Mobile gameplay hides the external desktop header, footer, and toolbar to reserve the maximum playable area.
- Added a dedicated portrait orientation gate asking the player to rotate the phone.
- The fixed 1280×720 simulation remains unchanged while CSS scales the canvas without stretching.

### Professional touch controls

- Replaced the legacy single-touch handler with explicit multi-touch roles.
- One finger can control movement while another simultaneously aims and shoots.
- Added drag-to-aim with an optional aiming guide and release-to-fire behavior.
- Added dedicated mobile buttons for:
  - dash;
  - bullet recall;
  - pause;
  - Build Inspector.
- The movement joystick spawns at the player's touch origin and remains bounded.
- Added optional left-handed layout.
- Added haptic feedback where the browser/device supports vibration.

### Mobile HUD and menus

- Added a compact phone-specific combat HUD.
- Region, difficulty, wave progress, score, hearts, bullet state, dash state, core, combo, and challenge status use less playfield space.
- Added a mobile-specific pause menu.
- Added a Mobile Controls settings screen with:
  - small, medium, and large controls;
  - control opacity;
  - right-handed or left-handed layout;
  - release-to-fire or touch-to-fire;
  - aiming guide visibility;
  - automatic/high/balanced/performance visual quality;
  - haptic feedback toggle.
- Settings persist locally without changing progression data.

### Browser interruption and performance handling

- The game pauses automatically when the tab becomes hidden, the page is suspended, or the user changes applications.
- Prevented page scrolling, text selection, browser touch callouts, and touch movement leakage inside the game stage.
- Added automatic visual quality selection using available memory, logical CPU cores, and device pixel ratio.
- Balanced and Performance modes reduce combat particle counts while keeping gameplay logic unchanged.
- Fullscreen attempts to lock landscape orientation when supported.

### PWA and offline support

- Added an installable Web App Manifest.
- Added an application icon and standalone landscape configuration.
- Added a service worker with versioned application-shell caching.
- The game can reopen from cached files after the first successful online load.
- Old application caches are removed during service-worker activation.

## Verification

- JavaScript syntax checks: **passed** for all existing modules, the new mobile runtime, and the service worker.
- Automated tests: **61/61 passed**.
- New tests cover:
  - malformed mobile settings normalization;
  - automatic device quality tiers;
  - 16:9 fitting inside short phone landscape viewports;
  - toolbar and safe-area reservation;
  - landscape detection requiring coarse touch input.
- Pull Request #12: **squash-merged to main**.
- Merge commit: `b91df3809d20a6bc472b2c3b931d9c673d5fa44a`.
- GitHub Actions Verify: **passed on the final Pull Request #12 status commit**.
- GitHub Pages deployment: **triggered by the merge and this status update**.
- Live Chrome Android, Samsung Internet or Safari iOS, fullscreen, and installed-PWA review: pending.

## Acceptance gate

Do not close Milestone 04A.1 until:

1. The movement joystick and action buttons remain fully visible on short landscape phones.
2. Showing or hiding the Chrome/Safari browser toolbar does not crop or stretch the canvas.
3. Safe-area devices keep controls outside notches, rounded corners, and gesture zones.
4. Portrait mode displays the rotation message instead of a cropped game.
5. Movement and aiming work simultaneously with two fingers.
6. Release-to-fire does not trigger accidental shots while using dash, recall, pause, or Build Inspector.
7. Left-handed layout swaps movement and action sides correctly.
8. Mobile HUD remains readable without hiding enemies or arena mechanics.
9. The game pauses safely after app switching, tab hiding, and phone interruptions.
10. High, Balanced, and Performance modes remain playable and visually understandable.
11. PWA installation opens in landscape standalone mode where supported.
12. Offline reopening works after one complete online load.
13. Existing desktop controls, fullscreen, progression, regions, upgrades, challenges, and boss flow remain intact.
14. The project owner approves Chrome Android and at least one additional mobile browser.

## Known limitations

- Real-device and browser screenshot automation is not implemented yet.
- iOS may use a generated home-screen icon because a dedicated PNG Apple Touch Icon is not included yet.
- Some browsers reject programmatic landscape locking unless the game is in fullscreen or installed mode.
- Region-specific enemy archetypes are not implemented yet.
- Three unique region bosses are not implemented yet.
- Endless Mode and Boss Rush are not implemented yet.
- Progression and Daily Challenge records remain local to the current browser/device.
- Final bespoke music, portraits, and illustrated background assets are not integrated.

## Next milestone after acceptance

**Milestone 04B — Region-Specific Enemies and Enemy Codex**

Planned scope:

- Shield Drone, Furnace Brute, Magnet Unit, and Repair Bot for Reactor Forge.
- Phase Walker, Rift Sniper, Gravity Orb, and Mirror Drone for Void Circuit.
- Behavior-specific telegraphs and silhouettes.
- Persistent Enemy Codex discovery screen.
- Region enemy balance and automated behavior tests.
