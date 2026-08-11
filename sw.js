importScripts('./src/release-config.js');

const RELEASE = self.ONE_BULLET_RELEASE;
if (!RELEASE) throw new Error('Release configuration failed to initialize in the service worker.');

const CACHE_NAME = RELEASE.cacheName;
const CACHE_PREFIX = 'one-bullet-arena-v';
const APP_SHELL = [
  './', './index.html', './game.css', './styles/tokens.css', './styles/ui.css', './styles/responsive.css', './styles/polish.css', './styles/smooth-runtime.css',
  './manifest.webmanifest', './icons/app-icon.svg',
  './src/release-config.js', './src/release.js', './src/i18n.js', './src/ui-system.js', './src/main.js', './src/game.js',
  './src/performance/frame-pacer.js', './src/performance/quality-manager.js',
  './src/render/canvas-viewport.js', './src/ui/icons.js', './src/ui/dom-ui.js', './src/ui/dom-performance-bridge.js',
  './src/game-runtime.js', './src/polish-runtime.js', './src/movement-hotfix-runtime.js', './src/enemy-navigation.js',
  './src/visual-design-runtime.js', './src/combat-feedback-runtime.js', './src/ui-layout-runtime.js',
  './src/core/game-events.js', './src/core/event-bus.js', './src/core/game-states.js',
  './src/core/event-runtime.js', './src/core/combat-depth-runtime.js',
  './src/core/checkpoint-store.js', './src/core/checkpoint-runtime.js', './src/core/warden-runtime.js',
  './src/core/world-2d-runtime.js', './src/core/visual-overhaul-runtime.js', './src/core/dashboard-polish-runtime.js',
  './src/core/world-expansion-runtime.js', './src/core/unified-ui-runtime.js', './src/core/production-art-runtime.js',
  './src/core/ui-repair-runtime.js',
  './src/game-data.js', './src/arena.js', './src/audio.js', './src/input-controller.js',
  './src/spawn-system.js', './src/ui-renderer.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'GET_RELEASE_INFO') return;
  event.ports?.[0]?.postMessage(RELEASE);
});

const SHELL_DOCUMENT = './index.html';

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(event));
    return;
  }
  event.respondWith(assetStrategy(request));
});

// Static assets are immutable within a release: every cache is keyed by the
// release version and activate() deletes the others, so a hit is always current
// and never needs revalidating. These previously went network-first while also
// bypassing the HTTP cache, so a fully cached repeat visit still waited on ~45
// round trips before the dashboard could paint.
async function assetStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  // ignoreSearch so the shell entry './src/main.js' answers the versioned
  // './src/main.js?v=<release>' that index.html actually requests.
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

// Stale-while-revalidate. The cached shell is returned immediately so a repeat
// visit never blocks on the network, and the refresh happens afterwards.
//
// This does not weaken update delivery: the browser re-checks sw.js and its
// imported release-config.js on every navigation, and a release bump changes
// that file. The new worker then installs a new versioned cache, calls
// skipWaiting(), and the controllerchange handler in main.js reloads the page.
async function navigationStrategy(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(SHELL_DOCUMENT, { ignoreSearch: true });

  const network = fetch(event.request)
    .then(async (response) => {
      if (response.ok) await cache.put(SHELL_DOCUMENT, response.clone());
      return response;
    });

  if (cached) {
    // respondWith only keeps the worker alive until the response resolves, so
    // the refresh needs waitUntil or it can be killed before it writes back.
    event.waitUntil(network.catch(() => {}));
    return cached;
  }

  try {
    return await network;
  } catch {
    return Response.error();
  }
}
