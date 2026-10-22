/* ============================================================================
 * FinCalcHub Service Worker — App-Shell Offline Strategy
 * ---------------------------------------------------------------------------
 * GOAL
 *   Keep Lighthouse Perf/A11y/BP/SEO at 100 while offering a clean PWA
 *   offline experience limited to the application shell + Quick Calculator
 *   (Simple + Scientific). Everything else requires a live connection.
 *
 * WHAT IS CACHED (essential static shell only)
 *   • Homepage application-shell entries (./ and ./index.html)
 *   • Web app manifest
 *   • Icons / favicons referenced by index.html
 *
 * WHAT IS NEVER CACHED
 *   • Same-origin crypto-price responses (/api/crypto-prices); the Vercel handler requests CoinGecko server-side
 *   • Google Analytics / Tag Manager / gtag
 *   • Google AdSense / ads / pagead / doubleclick
 *   • Third-party CDNs (e.g. Font Awesome assets served through cdnjs)
 *   • Multi-page documents: tools, blog, FAQ, about, privacy, terms, and guides
 *   • Any opaque or non-GET / non-same-origin response outside the shell list
 *
 * RUNTIME BEHAVIOUR
 *   • Shell assets  → NETWORK-FIRST. Online visitors always get the newest
 *                     files; the cache is only an offline fallback and is
 *                     refreshed on every successful request.
 *   • Same-origin crypto-price API, analytics, and ads → network-only, never written to Cache Storage.
 *   • Multi-page docs → network-only; if offline, a professional offline
 *                     HTML document is returned (no broken chrome).
 *   • Other requests → network-only (fail closed; no surprise caching).
 *
 * Lighthouse safety
 *   • No render-blocking injection, no extra client bundle, tiny SW.
 *   • skipWaiting + clientsClaim so updates activate cleanly without
 *     leaving stale controllers that could serve outdated shells forever.
 * ========================================================================= */

'use strict';

/**
 * Bump this on every deploy that changes the shell. On activation the worker
 * deletes EVERY other cache, so no visitor can keep seeing an old version.
 */
const CACHE_VERSION = 'fch-shell-v15';
const SHELL_CACHE = CACHE_VERSION;

/**
 * index.html already reloads itself once when a new worker takes control
 * (its `controllerchange` handler), so returning visitors leave the old page
 * without any help from the worker. Leave this false to avoid a double reload;
 * set it to true only if that page handler is ever removed.
 */
const RELOAD_OPEN_TABS_ON_UPGRADE = false;

/**
 * Essential application-shell assets only.
 * Paths are root-relative so both `./sw.js` and `/sw.js` registrations work.
 * Icons match the <link rel="icon"> / apple-touch-icon tags in index.html.
 */
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon-16.png',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/**
 * External host patterns that must ALWAYS hit the network and must NEVER
 * enter Cache Storage — analytics, ads, and third-party assets. Same-origin
 * non-shell API requests also fall through to the network-only path below.
 */
const NETWORK_ONLY_HOST_RE = /(?:^|\.)(?:coingecko\.com|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|googlesyndication\.com|doubleclick\.net|adservice\.google\.|pagead2\.googlesyndication\.com|gstatic\.com|googleapis\.com|cdnjs\.cloudflare\.com)$/i;

/** Multi-page HTML documents that require connectivity (never precached). */
const ONLINE_ONLY_PAGES_RE = /\/(?:tools|blog|faq|about|privacy|terms)(?:\.html)?$/i;

/**
 * Minimal offline HTML for navigations to network-only multi-page documents.
 * Self-contained (inline CSS) so it works with zero network. Matches the
 * FinCalcHub slate/indigo visual language without pulling site CSS.
 */
const OFFLINE_INFO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Offline · FinCalcHub</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    background:#0f172a;color:#e2e8f0;padding:24px}
  .card{max-width:420px;width:100%;background:#1e293b;border:1px solid rgba(99,102,241,.35);
    border-radius:20px;padding:28px 24px;text-align:center;
    box-shadow:0 20px 50px rgba(0,0,0,.45)}
  .icon{width:56px;height:56px;margin:0 auto 16px;border-radius:16px;display:grid;place-items:center;
    background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(168,85,247,.25));
    border:1px solid rgba(99,102,241,.4);font-size:28px}
  h1{margin:0 0 8px;font-size:1.25rem;font-weight:800;color:#fff}
  p{margin:0 0 20px;font-size:.9rem;line-height:1.55;color:#94a3b8}
  button{appearance:none;border:0;cursor:pointer;border-radius:12px;padding:12px 18px;
    font-weight:700;font-size:.9rem;color:#fff;
    background:linear-gradient(135deg,#6366f1,#a855f7);
    box-shadow:0 8px 20px rgba(99,102,241,.35)}
  button:active{transform:scale(.98)}
  a.home{display:inline-block;margin-top:14px;font-size:.8rem;color:#a5b4fc;text-decoration:underline}
</style>
</head>
<body>
  <main class="card" role="status" aria-live="polite">
    <div class="icon" aria-hidden="true">📡</div>
    <h1>You're offline</h1>
    <p>This page needs an internet connection. The Quick Calculator (Simple &amp; Scientific) still works from the home screen while offline.</p>
    <button type="button" id="reconnect">Reconnect to continue</button>
    <div><a class="home" href="/">← Back to FinCalcHub</a></div>
  </main>
  <script>
    (function(){
      var btn=document.getElementById('reconnect');
      function go(){ if(navigator.onLine){ location.reload(); } else { btn.textContent='Still offline — try again'; setTimeout(function(){btn.textContent='Reconnect to continue';},1600); } }
      btn.addEventListener('click', go);
      window.addEventListener('online', function(){ location.reload(); });
    })();
  </script>
</body>
</html>`;

/** True when the URL host must never be cached (ads, analytics, live APIs). */
function isNetworkOnlyUrl(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  // Cross-origin third parties matched by host pattern.
  if (NETWORK_ONLY_HOST_RE.test(url.hostname)) return true;
  // Defensive path checks for ad/analytics endpoints on any host.
  if (/google-analytics|gtag\/js|pagead|adsense|doubleclick|googlesyndication/i.test(url.href)) {
    return true;
  }
  return false;
}

/** True for Tools / Blog / FAQ / About / Privacy / Terms documents. */
function isOnlineOnlyPage(url) {
  return url.origin === self.location.origin && ONLINE_ONLY_PAGES_RE.test(url.pathname);
}

/** True only for the two URLs that represent the application-shell document. */
function isShellDocument(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === '/' || url.pathname === '/index.html')
  );
}

/** True if this same-origin request URL is one of our exact shell assets. */
function isShellAsset(url) {
  if (url.origin !== self.location.origin) return false;
  // Compare exact pathnames relative to the Service Worker location.
  const shellPaths = SHELL_ASSETS.map(function (asset) {
    try {
      return new URL(asset, self.location.href).pathname;
    } catch (e) {
      return asset;
    }
  });
  return shellPaths.indexOf(url.pathname) !== -1;
}

/** Install: precache shell. Failures on optional icons are ignored so install still succeeds. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // cache.addAll fails entirely if one URL 404s — add individually instead.
      return Promise.all(
        SHELL_ASSETS.map(function (asset) {
          return cache.add(asset).catch(function () {
            // Optional asset missing in this deploy — skip without failing install.
          });
        })
      );
    }).then(function () {
      // Activate updated SW immediately so clients don't stick to a stale shell.
      return self.skipWaiting();
    })
  );
});

/** Activate: delete every older cache, take control, and refresh stale open tabs once. */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      const stale = keys.filter(function (key) { return key !== SHELL_CACHE; });
      return Promise.all(stale.map(function (key) { return caches.delete(key); }))
        .then(function () { return self.clients.claim(); })
        .then(function () {
          // Only an upgrade (an older cache existed) reloads tabs; a brand-new install does not.
          if (!RELOAD_OPEN_TABS_ON_UPGRADE || stale.length === 0) return undefined;
          return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
            return Promise.all(wins.map(function (client) {
              try {
                return client.navigate(client.url).catch(function () {});
              } catch (e) {
                return undefined;
              }
            }));
          });
        });
    })
  );
});

/**
 * Fetch strategy (see file header).
 * Only GET requests are considered for caching; everything else is network-only.
 */
self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // 1) Public crawler files must bypass the Service Worker completely.
  //    This guarantees their real text/XML network responses can never become
  //    the app shell or the offline HTML document.
  if (
    url.origin === self.location.origin &&
    (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml')
  ) {
    return;
  }

  // 2) Live APIs, analytics, ads, third-party CDNs — network only, never cache.
  if (isNetworkOnlyUrl(url)) {
    event.respondWith(
      fetch(request).catch(function () {
        // Return a clean opaque-style failure without touching Cache Storage.
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // 3) Never cache Cloudflare resources.
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/cdn-cgi/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 4) Multi-page documents are network-only; navigations get honest offline UI.
  if (isOnlineOnlyPage(url)) {
    event.respondWith(
      fetch(request).catch(function () {
        if (request.mode === 'navigate') {
          return new Response(OFFLINE_INFO_HTML, {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // 5) App-shell document and static shell assets — network-first, cache only when offline.
  //    networkFirstShell permits an index.html fallback only for / or /index.html.
  if (isShellAsset(url)) {
    event.respondWith(networkFirstShell(request, url));
    return;
  }

  // 6) Same-origin odds and ends (including future static files): network-only.
  //    A failed navigation gets the honest offline page, never cached index.html.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).catch(function () {
        if (request.mode === 'navigate') {
          return new Response(OFFLINE_INFO_HTML, {
            status: 503,
            statusText: 'Offline',
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store'
            }
          });
        }

        return new Response('', {
          status: 503,
          statusText: 'Offline'
        });
      })
    );
    return;
  }

  // 7) Any other cross-origin request — pass through, never cache.
  event.respondWith(fetch(request));
});

/**
 * Network-first for shell assets.
 * Online: always return the fresh network response and store a copy for offline use.
 * Offline / network failure: return the cached copy; only / and /index.html may fall
 * back to the cached shell document, otherwise the honest offline page is returned.
 */
function networkFirstShell(request, url) {
  const shellDocument = isShellDocument(url);

  return fetch(request)
    .then(function (response) {
      if (response && response.ok && response.type === 'basic') {
        const copyForRequest = response.clone();
        const copyForIndex = shellDocument ? response.clone() : null;
        caches.open(SHELL_CACHE).then(function (cache) {
          cache.put(request, copyForRequest).catch(function () {});
          if (copyForIndex) cache.put('./index.html', copyForIndex).catch(function () {});
        }).catch(function () {});
      }
      return response;
    })
    .catch(function () {
      return caches.open(SHELL_CACHE).then(function (cache) {
        return cache.match(request).then(function (cached) {
          if (cached) return cached;
          if (!shellDocument) return undefined;
          return cache.match('./index.html').then(function (m) { return m || cache.match('./'); });
        });
      }).then(function (match) {
        if (match) return match;
        if (shellDocument) {
          return new Response(OFFLINE_INFO_HTML, {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    });
}

/** Optional: allow the page to request an immediate activate after update. */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
