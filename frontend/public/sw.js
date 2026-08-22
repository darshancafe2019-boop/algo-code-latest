/**
 * Quant.OS Service Worker
 * Provides secure offline shell caching for continuous trading operations.
 * SECURITY INVARIANT: Never caches credentials, tokens, live order payloads, or secrets.
 */

const CACHE_NAME = "quant-os-v1-shell";
const SHELL_ASSETS = [
  "/",
  "/intelligence",
  "/charts",
  "/bots",
  "/positions",
  "/risk",
  "/trade-journal",
  "/system-health",
  "/manifest.json",
  "/favicon.ico"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache live mutation requests, live orders, or non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // 2. NEVER cache dynamic /api/ requests with secrets or sensitive telemetry
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 3. Network First with Cache Fallback for navigation and static shell assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Offline — Read Only Shell", {
          status: 503,
          statusText: "Service Unavailable Offline",
          headers: { "Content-Type": "text/plain" }
        });
      })
  );
});
