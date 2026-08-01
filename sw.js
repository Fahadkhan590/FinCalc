/* ============================================================================
 * FinCalcHub Service Worker — App-Shell Offline Strategy
 * ---------------------------------------------------------------------------
 * CACHE_VERSION fch-shell-v3 (2026-08-02)
 *   Bumped to invalidate ALL stale cached HTML that may still reference:
 *     - /cdn-cgi/scripts/.../email-decode.min.js
 *     - /cdn-cgi/challenge-platform/scripts/jsd/main.js
 *     - window.__CF$cv$params
 *     - large inline JS bundles (now external /js/main.min.js)
 *
 * WHAT IS CACHED (essential static shell only)
 *   • ./ and ./index.html (clean HTML — no Cloudflare injections)
 *   • ./js/main.min.js (externalized, minified app logic)
 *   • Web app manifest + icons/favicons
 *
 * WHAT IS NEVER CACHED
 *   • /cdn-cgi/* (email-decode, challenge-platform, jsd/main.js) — network-only
 *     and never written to Cache Storage, so stale CF assets cannot persist.
 *   • CoinGecko live crypto prices (api.coingecko.com)
 *   • Live FX rates (api.exchangerate-api.com)
 *   • Google Analytics / Tag Manager / gtag
 *   • Google AdSense / ads / pagead / doubleclick
 *   • Third-party CDNs (e.g. cdnjs SheetJS)
 *   • Informational pages: blog, faq, about, privacy, terms
 *
 * RUNTIME BEHAVIOUR
 *   • Shell assets  → cache-first + background revalidate
 *   • Live APIs & ads & /cdn-cgi → network-only, never cached
 *   • Info pages     → network-only; offline → professional HTML
 *   • Other requests → network-only (fail closed)
 *
 * Lighthouse safety
 *   • No render-blocking injection; skipWaiting + clientsClaim
 * ========================================================================= */

'use strict';

/** Bump whenever shell HTML/JS URLs change — purges old CF-tainted caches. */
const CACHE_VERSION = 'fch-shell-v3';
const SHELL_CACHE = 'fch-shell-' + CACHE_VERSION;

/**
 * Essential application-shell assets only.
 * Includes externalized main bundle so Quick Calculator works offline.
 */
const SHELL_ASSETS = [
  './',
  './index.html',
  './js/main.min.js',
  './manifest.json',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './icon-192.png',
  './icon.svg',
  './apple-touch-icon.png'
];

/**
 * Host / path patterns that must ALWAYS hit the network and must NEVER
 * enter Cache Storage — live prices, FX, analytics, ads, Cloudflare edge junk.
 */
const NETWORK_ONLY_HOST_RE = /(?:^|\.)(?:coingecko\.com|exchangerate-api\.com|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|googlesyndication\.com|doubleclick\.net|adservice\.google\.|pagead2\.googlesyndication\.com|gstatic\.com|googleapis\.com|cdnjs\.cloudflare\.com)$/i;

/** Same-origin paths that must never be cached (CF email obfuscation / bot mgmt). */
const NETWORK_ONLY_PATH_RE = /\/cdn-cgi\//i;

/** Informational pages that require connectivity (never precached). */
const ONLINE_ONLY_PAGES_RE = /\/(?:blog|faq|about|privacy|terms)(?:\.html)?(?:[?#].*)?$/i;

/**
 * Minimal offline HTML for navigations to online-only informational pages.
 */
const OFFLINE_INFO_HTML = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Offline · FinCalcHub</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}.card{max-width:420px;width:100%;background:#1e293b;border:1px solid rgba(99,102,241,.35);border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.45)}.icon{width:56px;height:56px;margin:0 auto 16px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(168,85,247,.25));border:1px solid rgba(99,102,241,.4);font-size:28px}h1{margin:0 0 8px;font-size:1.25rem;font-weight:800;color:#fff}p{margin:0 0 20px;font-size:.9rem;line-height:1.55;color:#94a3b8}button{appearance:none;border:0;cursor:pointer;border-radius:12px;padding:12px 18px;font-weight:700;font-size:.9rem;color:#fff;background:linear-gradient(135deg,#6366f1,#a855f7);box-shadow:0 8px 20px rgba(99,102,241,.35)}a.home{display:inline-block;margin-top:14px;font-size:.8rem;color:#a5b4fc;text-decoration:underline}</style></head><body><main class="card" role="status" aria-live="polite"><div class="icon" aria-hidden="true">📡</div><h1>You\'re offline</h1><p>This page needs an internet connection. The Quick Calculator (Simple &amp; Scientific) still works from the home screen while offline.</p><button type="button" id="reconnect">Reconnect to continue</button><div><a class="home" href="./index.html">← Back to FinCalcHub</a></div></main><script>(function(){var b=document.getElementById("reconnect");function go(){if(navigator.onLine)location.reload();else{b.textContent="Still offline — try again";setTimeout(function(){b.textContent="Reconnect to continue"},1600)}}b.addEventListener("click",go);window.addEventListener("online",function(){location.reload()})}());</script></body></html>';

/** True when the URL must never be cached (ads, analytics, live APIs, CF). */
function isNetworkOnlyUrl(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  // Cloudflare edge scripts / email obfuscation — never cache, never precache.
  if (NETWORK_ONLY_PATH_RE.test(url.pathname) || NETWORK_ONLY_PATH_RE.test(url.href)) {
    return true;
  }
  if (NETWORK_ONLY_HOST_RE.test(url.hostname)) return true;
  if (/google-analytics|gtag\/js|pagead|adsense|doubleclick|googlesyndication|email-decode|challenge-platform|__CF\$cv\$params|jsd\/main/i.test(url.href)) {
    return true;
  }
  return false;
}

function isOnlineOnlyPage(url) {
  return ONLINE_ONLY_PAGES_RE.test(url.pathname);
}

function isShellAsset(url) {
  var path = url.pathname.replace(/\/+$/, '') || '/';
  var shellPaths = SHELL_ASSETS.map(function (a) {
    try {
      var u = new URL(a, self.location.href);
      return u.pathname.replace(/\/+$/, '') || '/';
    } catch (e) {
      return a;
    }
  });
  if (path === '/' || path === '/index.html') return true;
  if (path === '/js/main.min.js') return true;
  return shellPaths.indexOf(path) !== -1;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return Promise.all(
        SHELL_ASSETS.map(function (asset) {
          return cache.add(new Request(asset, { cache: 'reload' })).catch(function () {
            // Optional asset missing in this deploy — skip without failing install.
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          // Delete EVERY previous shell/legacy cache so CF-tainted HTML cannot linger.
          if (key !== SHELL_CACHE) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // 1) CF edge paths, live APIs, analytics, ads, third-party CDNs — network only.
  if (isNetworkOnlyUrl(url)) {
    event.respondWith(
      fetch(request).catch(function () {
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // 2) Informational pages — require network; offline → professional HTML.
  if (request.mode === 'navigate' && isOnlineOnlyPage(url)) {
    event.respondWith(
      fetch(request).catch(function () {
        return new Response(OFFLINE_INFO_HTML, {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      })
    );
    return;
  }

  // 3) App shell navigations & static shell assets — cache-first + background refresh.
  if (request.mode === 'navigate' || isShellAsset(url)) {
    event.respondWith(cacheFirstShell(request, url));
    return;
  }

  // 4) Same-origin odds and ends: network-only (do not bloat shell cache).
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).catch(function () {
        if (request.mode === 'navigate') {
          return caches.match('./index.html').then(function (cached) {
            return (
              cached ||
              new Response(OFFLINE_INFO_HTML, {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
              })
            );
          });
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // 5) Any other cross-origin request — pass through, never cache.
  event.respondWith(fetch(request));
});

function cacheFirstShell(request, url) {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var lookup = cached
        ? Promise.resolve(cached)
        : request.mode === 'navigate'
          ? cache.match('./index.html').then(function (m) {
              return m || cache.match('./');
            })
          : Promise.resolve(undefined);

      return lookup.then(function (match) {
        var networkFetch = fetch(request)
          .then(function (response) {
            // Refuse to cache any response that still contains CF injection markers.
            if (
              response &&
              response.ok &&
              response.type === 'basic' &&
              isShellAsset(url)
            ) {
              var ct = (response.headers.get('content-type') || '').toLowerCase();
              if (ct.indexOf('text/html') !== -1) {
                return response.clone().text().then(function (body) {
                  if (
                    /cdn-cgi|email-decode\.min\.js|challenge-platform|__CF\$cv\$params|jsd\/main\.js/i.test(
                      body
                    )
                  ) {
                    // Do not poison the shell cache with Cloudflare-injected HTML.
                    return response;
                  }
                  cache.put(request, new Response(body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                  })).catch(function () {});
                  if (request.mode === 'navigate') {
                    cache.put(
                      './index.html',
                      new Response(body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                      })
                    ).catch(function () {});
                  }
                  return response;
                });
              }
              cache.put(request, response.clone()).catch(function () {});
              if (request.mode === 'navigate') {
                cache.put('./index.html', response.clone()).catch(function () {});
              }
            }
            return response;
          })
          .catch(function () {
            return undefined;
          });

        if (match) {
          networkFetch.catch(function () {});
          return match;
        }

        return networkFetch.then(function (response) {
          if (response) return response;
          if (request.mode === 'navigate') {
            return new Response(OFFLINE_INFO_HTML, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      });
    });
  });
}

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
