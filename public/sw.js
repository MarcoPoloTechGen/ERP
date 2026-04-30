self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await self.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => self.caches.delete(cacheKey)));
      await self.registration.unregister();
      await self.clients.claim();
    })(),
  );
});
