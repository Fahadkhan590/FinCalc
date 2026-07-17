const CACHE_NAME='fincalchub-v2';
const STATIC_ASSETS=['./','./index.html','./tools.html','./blog.html','./about.html','./privacy.html','./terms.html','./faq.html','./manifest.json','./robots.txt','./favicon.ico','./favicon-16.png','./favicon-32.png','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache){return cache.addAll(STATIC_ASSETS)}).then(function(){return self.skipWaiting()}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CACHE_NAME}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});

self.addEventListener('fetch',function(e){
  var url=new URL(e.request.url);
  if(url.hostname.indexOf('coingecko')!==-1||url.hostname.indexOf('exchangerate')!==-1){
    e.respondWith(fetch(e.request).then(function(r){if(r.ok){var c=r.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c)})}return r}).catch(function(){return caches.match(e.request)}));
    return;
  }
  if(url.hostname.indexOf('googleapis')!==-1||url.hostname.indexOf('gstatic')!==-1){
    e.respondWith(caches.match(e.request).then(function(cached){return cached||fetch(e.request).then(function(r){if(r.ok){var c=r.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c)})}return r})}));
    return;
  }
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(e.request).then(function(cached){var net=fetch(e.request).then(function(r){if(r.ok){var c=r.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c)})}return r}).catch(function(){return cached});return cached||net}));
  }
});
