// Snow offline worker: serves the app shell + all cached thumbnails with no network.
// It deliberately does NOT touch content.json — the page manages that in its own cache,
// so a failed content fetch can never fall back to HTML (the old bug).
const SHELL = 'snow-shell-v2';
const IMG = 'snow-img-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => (k !== SHELL && k !== IMG && k !== 'snow-data-v1') ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

function isImage(req) {
  const u = req.url;
  return req.destination === 'image'
    || /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u)
    || /ytimg|cdninstagram|fbcdn|substackcdn|ggpht|licdn|twimg/i.test(u);
}
function isShell(url) {
  return url.pathname.endsWith('/snow-shell/')
    || url.pathname.endsWith('index.html')
    || url.pathname.endsWith('manifest.json')
    || /icon-\d+.*\.png$/.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }

  if (isImage(req)) {                              // cache-first: works fully offline once synced
    e.respondWith(caches.open(IMG).then(c =>
      c.match(req).then(hit => hit || fetch(req).then(res => { try { c.put(req, res.clone()); } catch (_) {} return res; })
        .catch(() => hit || Response.error()))));
    return;
  }
  if (isShell(url)) {                              // network-first, fall back to cached shell
    e.respondWith(
      fetch(req).then(res => { const cp = res.clone(); caches.open(SHELL).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  // content.json + everything else: passthrough (the page owns content caching)
});
