// FinCalcHub Service Worker
// Production PWA Cache Strategy

const CACHE_NAME = 'fincalchub-v4';

const APP_SHELL = [
  './',
  './index.html',
  './tools.html',
  './blog.html',
  './faq.html',
  './about.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './robots.txt',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon.svg'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept browser extensions or unsupported schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never cache external APIs
  // Crypto and currency data should remain fresh.
  if (
    url.hostname.includes('coingecko.com') ||
    url.hostname.includes('api.coingecko.com') ||
    url.hostname.includes('exchangerate')
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Google Fonts: cache-first
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        });
      })
    );
    return;
  }

  // Same-origin HTML/document requests: NETWORK-FIRST
  // This prevents stale index.html from breaking new updates.
  if (
    url.origin === self.location.origin &&
    request.mode === 'navigate'
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin static assets: CACHE-FIRST with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        });
      })
    );
  }
});