# One Bullet Arena — Status

Last updated: 2026-08-06

## Release status

- Product: **One Bullet Arena / حلبة الطلقة الواحدة**
- Current production code on `main`: **v2.7.2 — UI/UX Finishing Pass**
- Pull Request #38: **squash-merged into `main`**
- Release merge commit: `324605c0b41f37daa35386d5fdaaedffbc448bd6`
- Implementation: **100% complete**
- Local syntax verification: **passed**
- Deterministic UI tests: **passed**
- GitHub Actions cross-browser execution: **not launched for the app-authored PR event**
- Owner deployed visual acceptance: **pending**
- Overall release acceptance: **96%**

## Scope retained

This release changes interface presentation only. Movement, collision, combat balance, enemy behavior, waves, upgrades, progression, and the single-path product definition remain unchanged.

## Released interface corrections

- UI release identifier: `2.7.2-ui`.
- Package version: `2.7.2`.
- Service Worker cache: `one-bullet-arena-v2.7.2-ui`.
- The visible menu footer now displays the current UI release instead of the inherited combat-feedback identifier.
- The internal combat-feedback contract remains `2.7.0-feedback`.

## Released HUD finishing

- Removed redundant panel kicker labels that competed with live information.
- Separated the bullet-state pill from the bullet-location title.
- Removed the visible `BULLET / FIRED` text collision.
- Added deterministic copy for:
  - `READY` → `IN HAND / READY TO FIRE`;
  - `FIRED` → `IN ARENA / Q TO RECALL`;
  - `RETURNING` → `RETURNING / MOVE TO CATCH`.
- Reordered center statistics as English-only technical HUD text to prevent bidirectional number reordering.
- Tightened health and dash alignment while preserving the 62 px panel height and 80 px safe-bottom boundary.

## Released menu finishing

- Corrected the product label to `ONE BULLET ARENA`.
- Tightened title, CTA, feature-card, statistics, and footer spacing.
- Updated the supporting tagline.
- Preserved the Arabic product title and descriptions.
- The interface now uses an Arabic-first menu and an English-only technical combat HUD for stable canvas rendering.

## Verification completed

- Node syntax validation passed for the final `src/ui-layout-runtime.js` source.
- Deterministic tests passed for:
  - `2.7.2-ui` identity;
  - bullet-state copy;
  - HUD height and safe boundary;
  - equal side-panel widths;
  - consistent gaps;
  - desktop and narrower logical non-overlap.
- Permanent Playwright coverage was updated to assert the new UI identifier, release-label correction, bidirectional-safe HUD statistics, language mode, and all five visual states.
- No cross-browser CI result is claimed because GitHub Actions did not launch for the app-authored PR event.

## Remaining owner acceptance

1. Open the GitHub Pages game and perform a hard refresh.
2. Confirm the menu footer displays `v2.7.2-ui`.
3. Confirm the left HUD no longer shows overlapping `BULLET / FIRED` text.
4. Confirm the center line reads in the order `ENEMIES · SCORE · UPGRADES · ARENA`.
5. Test one desktop run and one mobile-landscape run, then report any visual issue with a screenshot.
