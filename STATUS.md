# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.5.1-controls — Movement and Controls Hotfix**
- Pull Request #34: **squash-merged into `main`**
- Release merge commit: `1051993b5f1a42334f15dd86366f82181ef3c20c`
- Hotfix implementation: **100% complete**
- Automated movement verification: **100% complete**
- Overall hotfix acceptance: **97%**
- Remaining: **deployed Service Worker refresh and owner physical-device confirmation**

## Regression fixed

The v2.5 release had three movement-quality defects that basic position-change tests did not detect:

1. Touch-down could create immediate movement because the joystick used the fixed visual center as its origin.
2. Every accepted joystick drag was normalized to full speed instead of preserving analog magnitude.
3. Combat hit-stop froze player movement together with enemies and bullets.
4. Interrupted pointer capture could leave a touch movement gesture active.

## Released fix

- Added `src/movement-hotfix-runtime.js` as the active movement correction layer above the polished runtime.
- Preserved normalized keyboard movement and consistent diagonal speed.
- Added a real analog touch curve with a 10-unit dead zone and progressive speed up to a 72-unit maximum radius.
- Made the actual touch-down position neutral so movement begins only after intentional drag.
- Aligned the joystick knob visually with the touch gesture origin.
- Kept enemies, bullets, and combat simulation frozen during hit-stop while player movement and dash remain responsive.
- Added pointer-up, pointer-cancel, lost-pointer-capture, and window-blur cleanup.
- Updated the offline application cache to `one-bullet-arena-v2.5.1-controls`.

## Verification results

- Verify workflow: **passed**.
- Browser Smoke workflow: **passed**.
- Playwright: **60/60 passed**.
- Unexpected failures: **0**.
- Flaky tests: **0**.
- Skipped tests: **0**.
- Tested browser projects:
  - Desktop Chromium.
  - Mobile Landscape Chromium.
  - Desktop Firefox.
  - Desktop WebKit.

Movement-specific verification confirms:

- physical keyboard movement remains normalized;
- opposite directions cancel correctly;
- diagonal movement does not exceed maximum speed;
- touch-down starts with zero movement;
- the joystick dead zone prevents accidental drift;
- partial drag produces partial movement speed;
- full drag produces full movement speed;
- pointer release clears movement state;
- player movement remains responsive during hit-stop while enemies remain frozen.

## Remaining owner acceptance

1. Open the GitHub Pages game and perform a hard refresh.
2. Confirm the old Service Worker is replaced by `one-bullet-arena-v2.5.1-controls`.
3. Test `WASD`, arrow keys, diagonal movement, dash, and movement during bullet impacts.
4. Test the mobile joystick from several touch-down positions in landscape mode.
5. Report any remaining issue with the device, browser, input method, and exact movement behavior.
