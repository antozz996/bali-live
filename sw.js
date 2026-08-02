const CACHE_NAME = 'bali-2026-v4';
const API_CACHE = 'bali-2026-api-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './privacy.html',
  './styles.css',
  './data.js',
  './app.js',
  './features.js',
  './vault.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, API_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (['/api/weather', '/api/exchange'].includes(url.pathname)) {
    e.respondWith(fetch(e.request).then(response => {
      if (response.ok) caches.open(API_CACHE).then(cache => cache.put(e.request, response.clone()));
      return response;
    }).catch(() => caches.match(e.request)));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients[0];
    if (existing) { existing.focus(); existing.postMessage({ type: 'OPEN_TRAVEL_MODE' }); return; }
    return self.clients.openWindow('./');
  }));
});
