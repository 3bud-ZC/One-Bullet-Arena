# One Bullet Arena — Status

Last updated: 2026-08-06

## Current hotfix

- Hotfix: **v2.5.1 — Movement and Controls**
- Working branch: `hotfix/v2.5.1-movement-controls`
- Production on `main`: **v2.5.0-polish**
- Current hotfix completion: **78%**
- State: **implementation complete; automated movement verification and merge remain**

## Reported regression

The released v2.5 movement felt broken in real play even though the previous browser suite passed. The old coverage only proved that a movement key changed the player's position. It did not validate touch neutrality, analog speed, or movement response during combat hit-stop.

## Root causes confirmed

1. The touch joystick used a fixed visual center as its movement origin. Touching away from the exact center could start movement immediately before the player intentionally dragged.
2. Touch movement was normalized after the dead zone, converting every accepted drag into full player speed instead of preserving analog magnitude.
3. The v2.5 hit-stop implementation returned before player movement update, freezing the player's controls during every bullet impact.
4. Pointer-capture loss was not explicitly releasing the movement pointer, which could leave touch movement active after an interrupted gesture.

## Implemented fix

- Added `src/movement-hotfix-runtime.js` above the existing polish runtime.
- Preserved normalized full-speed keyboard movement and diagonal consistency.
- Added a real analog touch curve with a 10-unit dead zone and progressive speed up to the 72-unit maximum radius.
- Made the actual touch-down point neutral, preventing movement before intentional drag.
- Realigned the joystick knob to the touch-down origin while keeping the fixed control area visible.
- Kept enemies, bullets, and the combat world frozen during hit-stop while allowing player movement and dash input to continue.
- Added `lostpointercapture` cleanup for interrupted touch gestures.
- Updated the offline cache to `one-bullet-arena-v2.5.1-controls`.

## Verification added

- Unit tests for keyboard normalization, opposite-key cancellation, touch dead zone, partial analog speed, full speed, and combined input limits.
- Cross-browser tests that verify:
  - the hotfix runtime is active;
  - player movement continues during hit-stop while enemies remain frozen;
  - touch-down starts neutral;
  - a partial drag produces partial speed;
  - a full drag produces full speed;
  - pointer release clears movement state.

## Remaining work

1. Run Verify and Browser Smoke on the hotfix Pull Request.
2. Correct any desktop, mobile, Firefox, or WebKit regression.
3. Merge only after every new movement test passes.
4. Confirm the refreshed Service Worker on GitHub Pages.
5. Owner physical-device confirmation on keyboard and mobile landscape controls.
