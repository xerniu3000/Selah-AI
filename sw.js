// Selah Service Worker v1.0
const CACHE_NAME = 'selah-v1-shell';
const SHELL_FILES = ['./', 'index.html', 'manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(SHELL_FILES.map(url => cache.add(url).catch(()=>{})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k.startsWith('selah-')).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // External: network only (don't cache API calls)
  if(url.origin !== self.location.origin){
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({offline:true}), {status:503, headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  // Same origin: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached){
        // Background refresh
        fetch(event.request).then(r => {
          if(r && r.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, r));
        }).catch(()=>{});
        return cached;
      }
      return fetch(event.request).then(r => {
        if(r && r.ok && r.type === 'basic'){
          const copy = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return r;
      }).catch(() => caches.match('index.html'));
    })
  );
});
