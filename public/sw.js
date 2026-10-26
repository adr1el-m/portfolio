const CACHE_PREFIX = 'adriel-portfolio-';
const CACHE_NAME = `${CACHE_PREFIX}v11`;
const OFFLINE_URLS = ['/offline', '/offline.html'];
const PRECACHE_ASSETS = [
  '/',
  ...OFFLINE_URLS,
  '/style.css',
  '/styles/portfolio-enhancements.css',
  '/styles/portfolio-theme.css',
  '/styles/detail-pages.css',
  '/styles/stage.css',
  '/fonts/unbounded-latin.woff2',
  '/images/my-avatar.avif',
  '/images/pwa/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME && caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Live data, third-party resources and partial media responses must bypass
  // the offline cache. A cached API response can otherwise freeze live counts.
  if (url.origin !== self.location.origin || /^\/(api|_vercel)(\/|$)/.test(url.pathname) || request.headers.has('range')) return;

  const isHtml = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const isAsset = /\.(?:js|css|png|jpe?g|webp|avif|svg|ico|woff2?|json|pdf)$/i.test(url.pathname);
  if (!isHtml && !isAsset) return;
  const immutableAsset = /^\/assets\/.+-[\w-]+\.(?:js|css)$/.test(url.pathname);

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (immutableAsset && cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.status === 200 && response.type !== 'opaque' && !/no-store/i.test(response.headers.get('cache-control') || '')) {
          await cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        if (cached) return cached;
        if (isHtml) {
          // Only SPA routes may reuse the home shell; detail pages need their
          // own cached document or the explicit offline page.
          if (/^\/(?:about|background|projects|gear|destinations|stack|skills|tech|contact)?\/?$/.test(url.pathname)) {
            const shell = await cache.match('/');
            if (shell) return shell;
          }
          for (const path of OFFLINE_URLS) {
            const fallback = await cache.match(path);
            if (fallback) return fallback;
          }
        }
        return Response.error();
      }
    })()
  );
});
