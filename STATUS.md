# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Production release on `main`: **v2.4.0 — Modular Runtime and UX Stabilization**
- Release candidate: **v2.4.1-controls**
- Pull Request: **#32 — physical WASD keyboard fix**
- Candidate state: **implementation complete; Verify and Browser Smoke required before merge**

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

On an Arabic keyboard layout, the physical W/A/S/D keys generated Arabic `KeyboardEvent.key` values. The runtime stored those character values, so the movement engine did not see `w`, `a`, `s`, or `d`; arrow keys still worked.

### Implemented

- Keyboard controls now normalize from `KeyboardEvent.code`, which represents the physical key position.
- Physical W/A/S/D now work whether the active keyboard language is Arabic or English.
- Q, P, M, R, Space, Shift, Enter, Escape, and upgrade-number keys also use layout-independent physical mappings.
- Arrow-key movement remains available as a secondary control method.
- Repeated keydown events no longer retrigger one-shot actions such as Dash, Recall, Pause, Mute, Restart, or upgrade selection.
- The visible release is `v2.4.1-controls`.
- The Service Worker cache is `one-bullet-arena-v2.4.1-controls`, ensuring installed/offline builds receive the corrected input controller.

## Verification added

- Deterministic tests verify physical W/A/S/D normalization when `KeyboardEvent.key` contains Arabic characters.
- Deterministic tests cover physical action keys, number keys, arrow keys, and fallback behavior.
- Playwright now dispatches Arabic-layout keyboard events with physical `KeyW`, `KeyA`, `KeyS`, and `KeyD` codes and verifies real player movement in all four directions.
- Existing deterministic, gameplay, mobile, cross-browser, PWA, and production-hook tests remain required.

## Active architecture

- `src/main.js` — application entry and PWA registration.
- `src/game-runtime.js` — active orchestration layer.
- `src/game.js` — reusable combat engine.
- `src/input-controller.js` — keyboard, pointer, multi-touch, and lifecycle input.
- `src/spawn-system.js` — scored spawn selection.
- `src/ui-renderer.js` — Canvas UI and touch layout.
- `src/game-data.js` — game data and release version.
- `src/arena.js` — arena geometry and collision safety.
- `src/audio.js` — generated audio and persistence.

## Remaining acceptance checks

After PR #32 passes and is merged:

1. Hard-refresh the GitHub Pages game or clear site data so the old Service Worker is replaced.
2. Test W/A/S/D while Windows keyboard language is Arabic.
3. Test W/A/S/D while Windows keyboard language is English.
4. Confirm Q Recall, Space/Shift Dash, P Pause, M Mute, and 1/2/3 upgrade selection.
5. Continue the existing physical-device, PWA offline, and Wave 8–15 balance checks.
