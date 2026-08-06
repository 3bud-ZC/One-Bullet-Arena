# One Bullet Arena — Status

Last updated: 2026-08-07

## Current milestone

- Milestone: **v2.8.0-B — Runtime Event Foundation**
- Working branch: `feature/v2.8.0-b-runtime-event-foundation`
- Production on `main`: **v2.8.0-A — Release & Stability Foundation**
- Implementation: **100% complete**
- Pull Request: **pending**
- Owner acceptance: **pending after merge and deployment**
- Milestone 08-A: **closed and accepted**
- Milestone 08-C: **blocked until owner acceptance of 08-B**

## Scope retained

This increment adds internal runtime contracts and diagnostics only. Movement, collision, bullet physics, combat values, enemy behavior, wave composition, upgrades, controls, arena geometry, and visible design remain unchanged.

## Release identity

- Public release version: `2.8.0-b`.
- Public release label: `v2.8.0-b`.
- Release channel: `runtime-event-foundation`.
- Service Worker cache: `one-bullet-arena-v2.8.0-b`.
- Internal combat runtime contract remains `2.7.0-feedback`.

## Event foundation added

- Added `src/core/game-events.js` with a frozen, versioned catalog of gameplay event names.
- Added `src/core/event-bus.js` with:
  - deterministic sequence numbers;
  - `on`, `once`, `off`, and unsubscribe support;
  - bounded diagnostic history;
  - immutable event envelopes and payloads;
  - listener-error isolation so diagnostics cannot interrupt gameplay.
- Added `src/core/game-states.js` with the stable state contract:
  - `menu`;
  - `playing`;
  - `upgrade`;
  - `paused`;
  - `gameover`.
- Added `src/core/event-runtime.js` above the approved UI runtime.
- Activated `OneBulletEventRuntime` from `src/main.js`.
- QA mode exposes `window.__ONE_BULLET_EVENTS__`.

## Gameplay events integrated

- Runtime ready.
- Run started and finished.
- State changed.
- Wave started and cleared.
- Enemy spawned, damaged, and killed.
- Bullet fired, recalled, caught, and ricocheted.
- Player dashed, damaged, shielded, and revived.
- Upgrade choices offered and upgrade selected.

## Runtime diagnostics

The QA snapshot now exposes:

- `eventFoundationVersion`;
- `eventSchemaVersion`;
- `gameEventBusActive`;
- `gameEventSequence`;
- `gameEventListenerCount`;
- the twelve most recent event types and sequence numbers.

The event history is capped at 128 entries and does not grow without limit.

## Verification coverage

- Added `tests/event-bus.test.js` for ordering, immutability, bounded history, `once`, unsubscribe, listener counts, invalid inputs, and listener-error isolation.
- Added `tests/game-events.test.js` for unique event names, event guards, state guards, required integration points, and runtime activation.
- Added `tests/browser/event-foundation.spec.js` for:
  - run/state/spawn/wave ordering;
  - bullet, recall, catch, ricochet, and dash events;
  - one-time wave-clear and upgrade events;
  - listener failure isolation during real gameplay.
- Updated release, UI, PWA, deployment, and permanent visual-review assertions for `v2.8.0-b`.
- Local isolated Event Bus verification: **4/4 tests passed**.
- Full repository and cross-browser CI: **pending Pull Request execution**.

## Owner acceptance after merge

1. Confirm the menu footer displays `v2.8.0-b`.
2. Start a run and play at least five waves.
3. Confirm movement, firing, recall, catch, dash, collisions, upgrades, and wave progression feel unchanged.
4. Pause and resume once.
5. Finish or intentionally lose one run and confirm Game Over and Retry still work.
6. Report any visible or gameplay regression before Milestone 08-C begins.
