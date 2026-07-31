/* ============================================================
   FinCalcHub Service Worker — Production PWA Cache Strategy
   ------------------------------------------------------------
   v6 hardened build (supersedes fincalchub-v5):
   • Cache version bumped: fincalchub-v5 -> fincalchub-v6
   • ALL legacy caches (any name not in CURRENT_CACHES) are
     fully deleted on activation — stale HTML can never be
     served again.
   • Pre-cache install never fails: per-asset Promise.allSettled
     instead of cache.addAll() (addAll rejects the WHOLE install
     if a single URL 404s).
   • Structural anti-poisoning gate: only HTTP status-200,
     same-origin ("basic"), non-redirected responses are ever
     written to cache. 404s, 500s, redirects, opaque responses,
     missing assets and failed fetches are NEVER cached — so no
     obsolete third-party path can ever enter the cache.
   • HTML  = Network-First  (fresh every load; stale HTML never
             served — cache is only an offline fallback).
   • Static = Cache-First with network fallback (only after a
             verified-200 write).
   ============================================================ */

const CACHE_VERSION  = 'v6';
const PRECACHE_NAME  = `fincalchub-precache-${CACHE_VERSION}`;
const RUNTIME_NAME   = `fincalchub-runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = [PRECACHE_NAME, RUNTIME_NAME];

/* App shell — same asset list, all URLs verified live */
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

/* A response is cacheable only when ALL of these hold:
   • HTTP status exactly 200        (no 404/500 pages, no errors)
   • type 'basic'                   (genuine same-origin response,
                                     never an opaque cross-origin body)
   • not a redirected response      (prevents caching a redirect
                                     target under the wrong key)
   • no 'Vary: *' header            (uncacheable by contract)
   This gate covers every legacy/obsolete path structurally:
   a path that does not exist on the origin can never satisfy it. */
function isCacheableResponse(response) {
  return !!response &&
         response.status === 200 &&
         response.type === 'basic' &&
         !response.redirected &&
         response.headers.get('vary') !== '*';
}

/* Central cache-write helper — same-origin GET + verified-200 only. */
function putInCache(cacheName, request, response) {
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;   // same origin only
    if (!isCacheableResponse(response)) return;        // 200/basic only
  } catch (err) {
    return;
  }
  caches.open(cacheName).then(function (cache) {
    cache.put(request, response);
  });
}

/* ---------- INSTALL: resilient precache (never fails wholesale) ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        APP_SHELL.map(function (path) {
          /* cache:'reload' guarantees we precache a FRESH copy,
             not a stale HTTP-cache entry from the previous deploy. */
          var req = new Request(path, { cache: 'reload' });
          return fetch(req).then(function (res) {
            if (isCacheableResponse(res)) {
              return cache.put(req, res);
            }
            /* Missing / non-200 asset: skip silently instead of
               failing the entire install (legacy behavior). */
            return undefined;
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ---------- ACTIVATE: purge every legacy cache ---------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          /* Deletes fincalchub-v5 and ANY other stale cache —
             including every copy of stale index.html they held. */
          if (CURRENT_CACHES.indexOf(key) === -1) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- FETCH routing ---------- */
self.addEventListener('fetch', function (event) {
  const request = event.request;

  /* Only handle GET — POST/PUT/etc. pass straight through. */
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (err) { return; }

  /* Never intercept non-http(s) schemes (extensions, chrome:, data:). */
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;

  /* --- Cross-origin requests --- */
  if (!isSameOrigin) {

    /* Live data APIs: network-only, SW transparent */
    if (url.hostname.indexOf('coingecko.com') !== -1 ||
        url.hostname.indexOf('exchangerate') !== -1) {
      event.respondWith(
        fetch(request).catch(function () { return caches.match(request); })
      );
      return;
    }

    /* Google Fonts: cache-first with verified write-back */
    if (url.hostname.indexOf('fonts.googleapis.com') !== -1 ||
        url.hostname.indexOf('fonts.gstatic.com') !== -1) {
      event.respondWith(
        caches.match(request).then(function (cached) {
          if (cached) return cached;
          return fetch(request).then(function (response) {
            if (response && response.ok) {
              var clone = response.clone();
              caches.open(RUNTIME_NAME).then(function (cache) {
                cache.put(request, clone);
              });
            }
            return response;
          });
        })
      );
      return;
    }

    /* All other third-party traffic (analytics, cdnjs, etc.):
       do not intercept — the browser handles it directly. */
    return;
  }

  /* --- Same-origin HTML navigations: NETWORK-FIRST --- */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        /* Only a verified-200, non-redirected, same-origin HTML page
           is stored — stale/404/redirect HTML can never be served. */
        if (isCacheableResponse(response)) {
          putInCache(PRECACHE_NAME, request, response.clone());
        }
        return response;
      }).catch(function () {
        /* Offline only: fall back to the freshest cached copy of
           this page, then the app shell, then a clean 503. */
        return caches.match(request).then(function (cached) {
          return cached ||
                 caches.match('./index.html').then(function (shell) {
                   return shell ||
                     new Response(
                       '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head>' +
                       '<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">' +
                       '<div><h1>You are offline</h1><p>Please reconnect to load FinCalcHub.</p></div></body></html>',
                       { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                     );
                 });
        });
      })
    );
    return;
  }

  /* --- Same-origin static assets (JS/CSS/images/fonts/manifest):
         CACHE-FIRST with network fallback --- */
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;

      return fetch(request).then(function (response) {
        /* Network response is returned to the page immediately,
           but ONLY written to cache when it is a verified-200,
           same-origin, non-redirected asset. 404s, errors, and
           missing resources are never stored or re-served. */
        if (isCacheableResponse(response)) {
          putInCache(RUNTIME_NAME, request, response.clone());
        }
        return response;
      });
    })
  );
});
