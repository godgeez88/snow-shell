// Snow service worker — offline shell + OTA freshness.
// Bump CACHE on shell changes. content.json is always network-first so data/UI stays current (OTA).
const CACHE = 'snow-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // content.json + the app shell: network-first so every deploy lands immediately (OTA)
  if (url.pathname.endsWith('content.json') || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
                      .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  // everything else (remote thumbnails, icons): cache-first, fall back to network
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request)));
});
