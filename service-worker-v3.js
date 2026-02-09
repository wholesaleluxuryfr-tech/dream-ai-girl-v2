/**
 * Dream AI Girl V3 - Advanced Service Worker
 * Offline support, intelligent caching, background sync
 */

const CACHE_VERSION = 'dreamai-v3.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/app_v3_design.css',
    '/app.js',
    '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
    '/api/girls': 'cache-first',  // Rarely changes
    '/api/girl/': 'cache-first',
    '/api/chat': 'network-first',  // Always fresh
    '/api/matches': 'network-first',
    '/images/': 'cache-first',
    '/photos/': 'cache-first'
};

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key.startsWith('dreamai-') && key !== CACHE_VERSION)
                        .map(key => {
                            console.log('[SW] Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - intelligent caching
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Determine strategy
    const strategy = getStrategy(url.pathname);

    event.respondWith(
        handleRequest(request, strategy)
    );
});

// Get caching strategy for URL
function getStrategy(pathname) {
    for (const [pattern, strategy] of Object.entries(CACHE_STRATEGIES)) {
        if (pathname.includes(pattern)) {
            return strategy;
        }
    }
    return 'network-first';
}

// Handle request with strategy
async function handleRequest(request, strategy) {
    switch (strategy) {
        case 'cache-first':
            return cacheFirst(request);
        case 'network-first':
            return networkFirst(request);
        case 'cache-only':
            return cacheOnly(request);
        case 'network-only':
            return networkOnly(request);
        default:
            return networkFirst(request);
    }
}

// Cache First strategy
async function cacheFirst(request) {
    const cache = await getCacheForRequest(request);
    const cached = await cache.match(request);

    if (cached) {
        console.log('[SW] Cache hit:', request.url);
        // Update cache in background
        updateCache(request, cache);
        return cached;
    }

    console.log('[SW] Cache miss:', request.url);
    return fetchAndCache(request, cache);
}

// Network First strategy
async function networkFirst(request) {
    const cache = await getCacheForRequest(request);

    try {
        const response = await fetch(request);
        // Cache successful responses
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        // Return offline page or error
        return new Response('Offline', { status: 503 });
    }
}

// Cache Only strategy
async function cacheOnly(request) {
    const cache = await getCacheForRequest(request);
    return cache.match(request);
}

// Network Only strategy
async function networkOnly(request) {
    return fetch(request);
}

// Fetch and cache
async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        return new Response('Network error', { status: 503 });
    }
}

// Update cache in background
async function updateCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response);
        }
    } catch (error) {
        // Silent fail - we have cache
    }
}

// Get appropriate cache for request
async function getCacheForRequest(request) {
    const url = new URL(request.url);

    if (url.pathname.includes('/images/') || url.pathname.includes('/photos/')) {
        return caches.open(IMAGE_CACHE);
    } else if (url.pathname.includes('/api/')) {
        return caches.open(DYNAMIC_CACHE);
    } else {
        return caches.open(STATIC_CACHE);
    }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

// Sync pending messages
async function syncMessages() {
    // Get pending messages from IndexedDB
    const db = await openDB();
    const pending = await db.getAll('pending-messages');

    for (const message of pending) {
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            // Remove from pending
            await db.delete('pending-messages', message.id);
        } catch (error) {
            console.error('[SW] Sync failed for message:', error);
        }
    }
}

// Push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'Nouveau message!',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            girl_id: data.girl_id
        },
        actions: [
            { action: 'open', title: 'Ouvrir' },
            { action: 'close', title: 'Fermer' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Dream AI Girl', options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const url = event.notification.data.url || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});

// Message from client
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(keys => {
                return Promise.all(
                    keys.map(key => caches.delete(key))
                );
            })
        );
    }

    if (event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            })
        );
    }
});

// Get total cache size
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let total = 0;

    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const request of keys) {
            const response = await cache.match(request);
            const blob = await response.blob();
            total += blob.size;
        }
    }

    return total;
}

// IndexedDB helper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('dreamai-db', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending-messages')) {
                db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

console.log('[SW] Service Worker V3 loaded');
