/* Offline support for the LILA PHOTO trip app.
   Network-first for pages and assets, with a cache fallback so the team can
   still open the app and read cached trip info without a connection. */

const CACHE = "lilapp-venice-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/"]).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackToRoot) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === "GET") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: fallbackToRoot });
    if (cached) return cached;
    if (fallbackToRoot) {
      const root = await cache.match("/");
      if (root) return root;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  const isAsset =
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(networkFirst(request, false));
  }
});
