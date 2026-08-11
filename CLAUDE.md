# One Bullet Arena — working notes

## Shape of the project

Vanilla JS, **no build step**. `index.html` loads modules directly; what is in the
repo is what ships. `src/` is ~40 ES modules (~14.5k lines), `styles/` is plain CSS,
`sw.js` is the PWA service worker. Node 20+ (CI uses 22).

Runtime boots through `OneBulletGlobalUiRuntime` (`src/core/ui-repair-runtime.js`),
which sits at the end of a runtime inheritance chain. Simulation is a fixed 120 Hz
step decoupled from `requestAnimationFrame` rendering; gameplay must never read
render cadence.

## Adding a file to `src/`

Registration is manual and spread across two places. `tests/repo-integrity.test.js`
enforces both, so `npm test` will name anything you miss:

1. The `check` script in `package.json` — syntax gate.
2. `APP_SHELL` in `sw.js` — offline cache. **Miss this and nothing fails until a
   user goes offline after release**, because `cache.addAll()` rejects atomically.

`.github/workflows/deploy-pages.yml` also has a `required_files` list, but it is a
deliberate spot-check — `cp -R src _site/` copies everything, so new files do not
have to be added there.

## Commands

```bash
npm run check        # syntax only, fast
npm test             # 121 Node tests
npm run verify       # check + test — run this before every commit
npm run test:browser # Playwright, needs `npm install` first
```

`npm run verify:all` runs the browser matrix at the default 10 workers, which
saturates locally and times out. Use `npm run test:browser -- --workers=1` instead.
CI has the headroom and runs `verify:all` fine.

Playwright serves the repo with `scripts/static-server.js` (not `python3 -m http.server`),
so browser tests work on Windows.

## Releasing

Any push to `main` triggers `deploy-pages.yml`, which runs the **full** `verify:all`
matrix (Chromium/Firefox/WebKit) before publishing to GitHub Pages. A browser-test
failure blocks the deploy entirely. There is no separate release step.

Version lives in exactly one place: `const version` in `src/release-config.js`.
`package.json` version and the SW `cacheName` derive from it and are asserted equal —
bump them together or `npm test` fails. A stale `cacheName` strands returning
players on the previous release.

`src/release-config.js` is an IIFE assigning `globalThis.ONE_BULLET_RELEASE`, not an
ES module, because `sw.js` loads it via `importScripts`. Keep it that way.

## Line endings

`.gitattributes` pins everything to LF. Do not add BOMs — a BOM breaks
`importScripts` and makes every file look modified. `npm test` rejects them.

## Conventions

- No dependencies at runtime. `@playwright/test` is the only devDependency.
- Rendering quality tiers are visual-only: they may change DPR, particles, and
  shadows, but never enemy count, AI, damage, collision, or wave progression.
- UI strings go through `src/i18n.js` (English + Arabic); never hardcode display text.
