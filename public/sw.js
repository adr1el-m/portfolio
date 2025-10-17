/**
 * Service Worker for Adriel Magalona Portfolio
 * Provides offline functionality and caching strategies
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `adriel-portfolio-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/images/my-avatar.png',
  '/images/pwa/icon-192x192.png',
  '/images/pwa/icon-512x512.png'
];

// Cache strategies for different content types
const CACHE_STRATEGIES = {
  // Cache-first: Static assets (images, fonts, etc.)
  cacheFirst: [
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    /\.(?:woff|woff2|ttf|eot)$/,
    /\/images\//,
    /\/achievements\//,
    /\/files\//
  ],
  
  // Network-first: HTML, API calls
  networkFirst: [
    /\.(?:html)$/,
    /\/api\//
  ],
  
  // Stale-while-revalidate: CSS, JS
  staleWhileRevalidate: [
    /\.(?:js|css)$/,
    /\/assets\//
  ]
};

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old cache versions
              return cacheName.startsWith('adriel-portfolio-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Skip cross-origin requests (CDN, analytics, etc.)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Determine caching strategy
  const strategy = getCacheStrategy(url.pathname);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch(() => {
        // If all else fails, show offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        // For other requests, return a basic response
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

/**
 * Determine which caching strategy to use
 */
function getCacheStrategy(pathname) {
  // Check cache-first patterns
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern.test(pathname)) {
      return 'cacheFirst';
    }
  }
  
  // Check network-first patterns
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pattern.test(pathname)) {
      return 'networkFirst';
    }
  }
  
  // Check stale-while-revalidate patterns
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pattern.test(pathname)) {
      return 'staleWhileRevalidate';
    }
  }
  
  // Default to network-first
  return 'networkFirst';
}

/**
 * Handle request with specified strategy
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

/**
 * Cache-First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    throw error;
  }
}

/**
 * Network-First Strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

/**
 * Stale-While-Revalidate Strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Fetch and update cache in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] Background fetch failed:', error);
    });
  
  // Return cached version immediately if available
  return cached || fetchPromise;
}

/**
 * Message Event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urlsToCache))
    );
  }
});

/**
 * Sync Event - Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

/**
 * Background sync implementation
 */
async function syncData() {
  try {
    // Implement any background sync logic here
    console.log('[SW] Syncing data...');
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

console.log('[SW] Service worker loaded');
