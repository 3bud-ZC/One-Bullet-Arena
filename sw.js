const CACHE_NAME = 'one-bullet-arena-v2.7.2-ui';
const APP_SHELL = [
  './', './index.html', './game.css', './manifest.webmanifest', './icons/app-icon.svg',
  './src/main.js', './src/game.js', './src/game-runtime.js', './src/polish-runtime.js',
  './src/movement-hotfix-runtime.js', './src/visual-design-runtime.js',
  './src/combat-feedback-runtime.js', './src/ui-layout-runtime.js', './src/game-data.js',
  './src/arena.js', './src/audio.js', './src/input-controller.js', './src/spawn-system.js',
  './src/ui-renderer.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request)
      .then((response) => response.ok ? response : Promise.reject(new Error('Navigation failed')))
      .catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (!response.ok) return response;
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  })));
});
