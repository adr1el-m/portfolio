const CACHE_NAME = 'adriel-portfolio-v2';
const OFFLINE_URLS = ['/offline', '/offline.html'];
const PRECACHE_ASSETS = [
  '/',
  ...OFFLINE_URLS,
  '/style.css',
  '/style.purged.css',
  '/index.html',
  '/images/my-avatar.png',
  '/images/pwa/icon-192x192.png',
  '/images/pwa/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass non-GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          const clone = networkResponse.clone();
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigations
          if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
            return caches.match(OFFLINE_URLS[0]).then((res) => res || caches.match(OFFLINE_URLS[1]));
          }
          // Fallback to cache if available
          return cached;
        });

      // Prefer cached first for performance
      return cached || fetchPromise;
    })
  );
});