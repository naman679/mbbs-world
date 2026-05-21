const CACHE_NAME = 'mbbs-world-cache-v1';

// We want to cache the core files needed to start the app.
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/login.html',
    '/css/dashboard.css',
    '/css/login.css',
    '/css/daily-case.css',
    '/css/network-status.css',
    '/js/dashboard.js',
    '/js/login.js',
    '/js/daily-case.js',
    '/js/network-status.js'
];

self.addEventListener('install', (event) => {
    // Pre-cache core assets during installation
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(CORE_ASSETS);
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
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // NETWORK FIRST STRATEGY (Fallback to Cache)
    // Always try to get the freshest data from the internet. 
    // If offline, serve the cached version.
    
    // Ignore non-GET requests
    if (event.request.method !== 'GET') return;

    // Ignore cross-origin requests like YouTube, Firebase, or Google Sheets
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If we get a valid response, update the cache
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // If the network fails (offline), return the cached version
                return caches.match(event.request);
            })
    );
});
