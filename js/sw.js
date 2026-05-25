const CACHE_NAME = 'mbbs-world-offline-v3';

// We only need to cache the offline page
const OFFLINE_URL = './offline.html';

self.addEventListener('install', (event) => {
    // Pre-cache the offline page during installation
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching offline page');
            // Adding a cache-busting query parameter to ensure we get the latest version
            return cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Clean up old caches if the version changes
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // We only want to intercept navigation requests for HTML pages.
    // For all other requests (images, CSS, JS, API calls), we just let them go to the network normally.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch((error) => {
                // The fetch failed (likely due to no internet connection).
                // Return the cached offline page.
                console.log('[ServiceWorker] Network request Failed. Serving offline page', error);
                return caches.match(OFFLINE_URL);
            })
        );
    }
});
