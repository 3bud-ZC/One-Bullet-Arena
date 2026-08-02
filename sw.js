const CACHE_NAME = 'one-bullet-arena-v0.8.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './stabilization.css',
  './ui-refine.css',
  './ui-feedback-balance.css',
  './mobile-browser.css',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './src/main.js',
  './src/game.js',
  './src/math.js',
  './src/audio.js',
  './src/content.js',
  './src/input.js',
  './src/ui-polish.js',
  './src/ui-polish-fixes.js',
  './src/stabilization.js',
  './src/defeat-ui-refine.js',
  './src/visual-identity.js',
  './src/progression-data.js',
  './src/progression.js',
  './src/replayability-data.js',
  './src/replayability.js',
  './src/replayability-persistence.js',
  './src/ui-feedback-balance.js',
  './src/accuracy-semantics-fix.js',
  './src/regions-data.js',
  './src/live-qa-regions.js',
  './src/regions-runtime-fixes.js',
  './src/mobile-browser.js',
  './src/region-enemies-data.js',
  './src/region-enemies.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
