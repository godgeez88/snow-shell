// Retired. This worker now removes itself and clears all caches, then reloads
// any pages it controls, so an already-installed copy stops intercepting requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.navigate(c.url));
    } catch (e) {}
  })());
});
// pass everything straight through to the network
self.addEventListener('fetch', () => {});
