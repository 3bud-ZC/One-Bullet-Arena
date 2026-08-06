# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production release: **v2.4.1-controls — Physical WASD Controls Fix**
- Pull Request #32: **squash-merged into `main`**
- v2.4.1 merge commit: `6d652c59f5e5aa5e180557bee0ecfbc71fec3ae9`
- Current state: **implementation, automated verification, cross-browser WASD verification, offline-cache revision, and merge complete; final deployed-build and owner device acceptance remain**

## Product definition

The active game keeps one explicit path only:

1. Start one run.
2. Defeat every enemy in the wave.
3. Recover the single bullet automatically after the final kill.
4. Choose one of three in-run upgrades.
5. Enter the next, harder wave in the same expanding arena.
6. Continue until defeat, then retry or return to the menu.

There are no alternate modes, hubs, puzzles, objectives, currencies, inventories, bosses, or meta-progression systems in the active runtime.

## v2.4.1-controls fix

### Reported issue

On an Arabic keyboard layout, the physical W/A/S/D keys generated Arabic `KeyboardEvent.key` values. The runtime previously stored those character values, so the movement engine did not see `w`, `a`, `s`, or `d`; arrow keys still worked.

### Implemented

- Keyboard controls now normalize from `KeyboardEvent.code`, representing the physical key position instead of the typed character.
- Physical W/A/S/D work whether the active keyboard language is Arabic or English.
- Q, P, M, R, Space, Shift, Enter, Escape, and upgrade-number keys also use layout-independent physical mappings.
- Arrow-key movement remains available as a secondary control method.
- Repeated keydown events no longer retrigger one-shot actions such as Dash, Recall, Pause, Mute, Restart, or upgrade selection.
- The visible release is `v2.4.1-controls`.
- The Service Worker cache is `one-bullet-arena-v2.4.1-controls`, ensuring installed and offline builds receive the corrected controller.

## Automated verification

- Arabic-layout normalization tests: **passed**.
- Real four-direction W/A/S/D movement test: **passed**.
- Verify workflow run **628**: **passed**.
- Browser Smoke workflow run **122**: **passed**.
- Playwright tests: **40/40 passed**.
- Projects:
  - Desktop Chromium.
  - Mobile Landscape Chromium.
  - Desktop Firefox.
  - Desktop WebKit.
- Failures, flaky tests, skipped tests, and cancelled tests: **0**.

Coverage verifies:

- Arabic characters from the physical W/A/S/D positions normalize to `w`, `a`, `s`, and `d`;
- the input controller receives and releases each WASD key;
- each key moves the player in the correct direction;
- existing wave progression, combat, touch-safe zones, PWA, layout, and production-security checks remain passing.

## Active architecture

- `src/main.js` — application entry and PWA registration.
- `src/game-runtime.js` — active orchestration layer.
- `src/game.js` — reusable combat engine.
- `src/input-controller.js` — layout-independent keyboard, pointer, multi-touch, and lifecycle input.
- `src/spawn-system.js` — scored spawn selection.
- `src/ui-renderer.js` — Canvas UI and touch layout.
- `src/game-data.js` — game data and release version.
- `src/arena.js` — arena geometry and collision safety.
- `src/audio.js` — generated audio and persistence.

## Remaining acceptance checks

1. Hard-refresh the GitHub Pages game or clear its stored site data if the old Service Worker remains active.
2. Test W/A/S/D while the Windows keyboard language is Arabic.
3. Test W/A/S/D while the Windows keyboard language is English.
4. Confirm Q Recall, Space/Shift Dash, P Pause, M Mute, and 1/2/3 upgrade selection.
5. Continue the existing physical-device, PWA offline, and Wave 8–15 balance checks.
