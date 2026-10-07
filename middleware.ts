import { next } from '@vercel/functions';

// Cloudflare JavaScript Detections changes its injected script on each request.
// A fresh response-header nonce lets Cloudflare authorize that script without
// weakening script-src with unsafe-inline or using an invalid fixed hash.
function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function makeCsp(nonce: string): string {
  const scriptHashes = [
    '3iJV8gJCQ2g6CnGH/sEIrIX3neQvI3ClNZ0wZygJxOw=',
    '4zgsHa+ogaupRkUJgBAY/IApeVfPrcK90eoBUmpct4E=',
    'D7o1IbZmGKqdoVrSvAfa9WWtzVVvghYn411QKzpQD+Q=',
    'E/MfEQQRdWWxUOefLgHCMjmCHS6ZWdJ0zw55XnsCK18=',
    'HO+kRo5OhvelZgS+ckxgu19I0NQ1OOIWdgbfklyLUko=',
    'HaoPjvMh52J0r884AXSxWQ+ELg0XDrSlAtOI8hkHDJM=',
    'KhJUxz5L8XZq2K98qGCvO7QI7pfIGzgdXF97symgmWo=',
    'LSSDtBZ0QjQsxDayqVdVp71ExuE3kzlRugWxH7eI5zU=',
    'SDcvfJL9zAt7YSVnA4biwFtQIS6gpnQVZgpzUq4NeAU=',
    'TwiN7tiplB7+bZMvK3bNCl4xauOPkKh6TnL29ZrBYgw=',
    'VcbQyKTxhpNZTO+fcFG5ohHCTB6J3Unb936bw2owP5E=',
    'hkqPWKiEqxOrEXvsV7tsjNCqzKwRRwp7Qw+2fe5Humc=',
    'mdfwTz1dRysWnztrAKln35EkLI1oPWBZ4VI8NuMFDHc=',
    'uMB/QY7ybpdHYL40PZA2nxL3vykqxvI30EhYyHi6/7A=',
    'zz8vlw96wQFJMf3762Bt5yNLzP9B5wG04xBgAFeblI8=',
  ];
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://www.googletagmanager.com',
    'https://googletagmanager.com',
    ...scriptHashes.map((hash) => `'sha256-${hash}'`),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob: https://api.producthunt.com https://fazier.com https://www.justsimple.tools https://www.directree.io",
    "connect-src 'self' https://analytics.google.com https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net https://api.producthunt.com https://fazier.com",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
    "worker-src 'self'",
  ].join('; ') + ';';
}

export const config = {
  // Restrict middleware to actual HTML documents; APIs and static assets bypass it.
  matcher: [
    '/',
    '/index.html',
    '/about.html',
    '/blog.html',
    '/compound-interest-explained.html',
    '/ecommerce-hidden-costs.html',
    '/faq.html',
    '/how-crypto-conversion-works.html',
    '/how-sip-projections-work.html',
    '/how-to-calculate-profit-margin.html',
    '/how-to-calculate-roas.html',
    '/privacy.html',
    '/saas-metrics-cac-ltv-payback.html',
    '/specialized-vs-scientific-calculators.html',
    '/terms.html',
    '/tools.html',
    '/understanding-tax-slab-rates.html',
  ],
};

export default function middleware(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const response = next();
  response.headers.set('Content-Security-Policy', makeCsp(makeNonce()));

  // A nonce is single-response by design. Do not let browser/CDN caches replay it.
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  return response;
}
