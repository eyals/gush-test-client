// Service Worker for Musedrops PWA

const CACHE_NAME = "musedrops-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/js/mock-stories.js",
  "/icon-192.png",
  "/favicon.ico",
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap",
  "https://fonts.googleapis.com/icon?family=Material+Icons+Round"
];

// Install event - cache all static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Activate the new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

// Fetch event - serve from cache, falling back to network
self.addEventListener("fetch", (event) => {
  // Ignore non-GET requests
  if (event.request.method !== "GET") return;

  // For audio files, try network first, then cache
  if (event.request.url.match(/\.(mp3|wav|ogg)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, cache it
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For all other assets, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
