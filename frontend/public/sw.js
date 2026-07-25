// Cleanup service worker for My Dream School.
// The dashboard must always load live routes from Vercel/Render.
const CACHE_PREFIX = 'my-dream-school';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
    await self.registration.unregister();
  })());
});

// Do not call respondWith here. Requests should go straight to the network.
self.addEventListener('fetch', () => {});
