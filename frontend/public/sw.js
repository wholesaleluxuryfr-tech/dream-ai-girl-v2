/**
 * Service Worker - Dream AI Girl PWA
 *
 * Handles:
 * - Offline caching
 * - Push notifications
 * - Background sync
 */

const CACHE_NAME = 'dream-ai-v1';
const RUNTIME_CACHE = 'dream-ai-runtime';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/register',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ============================================================================
// INSTALL - Precache essential files
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_URLS);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  return self.clients.claim();
});

// ============================================================================
// FETCH - Network-first with cache fallback
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - Cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages - Network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/offline');
        });
      })
  );
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Dream AI Girl', body: event.data.text() };
    }
  }

  const title = data.title || 'Dream AI Girl';
  const options = {
    body: data.body || 'Nouveau message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    data: {
      url: data.url || '/',
      girlId: data.girlId,
      messageId: data.messageId,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/icons/action-open.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/action-close.png'
      }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================================================
// NOTIFICATION CLICK
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================================================
// NOTIFICATION CLOSE
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');

  // Track notification dismissal
  const data = event.notification.data;
  if (data && data.messageId) {
    // Could send analytics event here
  }
});

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // Get pending messages from IndexedDB
    // Send them to server
    // Clear from IndexedDB
    console.log('[SW] Syncing messages');
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// ============================================================================
// MESSAGE HANDLING (from main thread)
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
