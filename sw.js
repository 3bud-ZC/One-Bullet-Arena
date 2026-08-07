importScripts('./src/release-config.js');

const RELEASE = self.ONE_BULLET_RELEASE;
if (!RELEASE) throw new Error('Release configuration failed to initialize in the service worker.');

const CACHE_NAME = RELEASE.cacheName;
const CACHE_PREFIX = 'one-bullet-arena-v';
const APP_SHELL = [
  './', './index.html', './game.css', './manifest.webmanifest', './icons/app-icon.svg',
  './src/release-config.js', './src/release.js', './src/main.js', './src/game.js',
  './src/game-runtime.js', './src/polish-runtime.js', './src/movement-hotfix-runtime.js',
  './src/visual-design-runtime.js', './src/combat-feedback-runtime.js', './src/ui-layout-runtime.js',
  './src/core/game-events.js', './src/core/event-bus.js', './src/core/game-states.js',
  './src/core/event-runtime.js', './src/core/combat-depth-runtime.js',
  './src/core/checkpoint-store.js', './src/core/checkpoint-runtime.js', './src/core/warden-runtime.js',
  './src/core/world-2d-runtime.js',
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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'reload' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await cache.match(fallbackPath);
      if (fallback) return fallback;
    }
    return Response.error();
  }
}
