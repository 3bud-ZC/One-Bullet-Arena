# One Bullet Arena — Status

Last updated: 2026-08-07

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.8.0-B — Runtime Event Foundation**
- Pull Request #40: **squash-merged into `main`**
- Release merge commit: `5d5a38a0d0432bd9b7aa50e8df634c60320f3455`
- Implementation: **100% complete**
- Local isolated Event Bus verification: **4/4 passed**
- Syntax verification for event runtime and core contracts: **passed**
- GitHub Actions cross-browser execution: **not launched by the app-authored PR event**
- Owner deployed acceptance: **pending**
- Milestone 08-A: **closed and accepted**
- Milestone 08-B: **merged; awaiting owner acceptance**
- Milestone 08-C: **blocked until owner acceptance**

## Scope retained

This increment adds internal runtime contracts and diagnostics only. Movement, collision, bullet physics, combat values, enemy behavior, wave composition, upgrades, controls, arena geometry, and visible design remain unchanged.

## Release identity

- Public release version: `2.8.0-b`.
- Public release label: `v2.8.0-b`.
- Release channel: `runtime-event-foundation`.
- Service Worker cache: `one-bullet-arena-v2.8.0-b`.
- Internal combat runtime contract remains `2.7.0-feedback`.

## Event foundation released

- Added `src/core/game-events.js` with a frozen, versioned gameplay event catalog.
- Added `src/core/event-bus.js` with deterministic sequencing, `on`, `once`, `off`, unsubscribe support, immutable events, bounded history, and listener-error isolation.
- Added `src/core/game-states.js` with stable menu, playing, upgrade, paused, and game-over contracts.
- Added `src/core/event-runtime.js` above the approved UI runtime.
- Activated `OneBulletEventRuntime` from `src/main.js`.
- QA mode exposes `window.__ONE_BULLET_EVENTS__`.

## Gameplay events released

- Runtime ready.
- Run started and finished.
- State changed.
- Wave started and cleared.
- Enemy spawned, damaged, and killed.
- Bullet fired, recalled, caught, and ricocheted.
- Player dashed, damaged, shielded, and revived.
- Upgrade choices offered and upgrade selected.

## Runtime diagnostics

The QA snapshot exposes:

- `eventFoundationVersion`;
- `eventSchemaVersion`;
- `gameEventBusActive`;
- `gameEventSequence`;
- `gameEventListenerCount`;
- the twelve most recent event types and sequence numbers.

The diagnostic event history is capped at 128 entries.

## Verification coverage

- Added deterministic Event Bus tests for ordering, immutability, bounded history, one-time listeners, unsubscribe, invalid inputs, and listener-error isolation.
- Added game event and state-contract tests.
- Added Playwright coverage for event ordering, bullet lifecycle events, dash, wave clear, upgrades, and listener-error isolation during gameplay.
- Updated release, UI, PWA, deployment, and permanent visual-review assertions for `v2.8.0-b`.
- Repository diff remained limited to the event foundation, release metadata, PWA shell, tests, deployment validation, and status documentation.
- No full cross-browser CI result is claimed because GitHub Actions did not launch for the app-authored PR event.

## Owner acceptance gate

1. Confirm the menu footer displays `v2.8.0-b`.
2. Play at least five waves.
3. Confirm movement, firing, recall, catch, dash, collisions, upgrades, and wave progression feel unchanged.
4. Pause and resume once.
5. Finish or intentionally lose one run.
6. Confirm Game Over, Retry, and Main Menu still work.
7. Report the result before Milestone 08-C begins.
