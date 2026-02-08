/**
 * PWA Utilities - Service Worker and Push Notifications
 *
 * Handles PWA installation, service worker registration, and push notifications
 */

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

// ============================================================================
// SERVICE WORKER REGISTRATION
// ============================================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available');

            // Notify user about update
            if (confirm('Une nouvelle version est disponible. Recharger?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function subscribeToPushNotifications(
  userId: number
): Promise<PushSubscription | null> {
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    console.log('Subscribed to push notifications');

    // Send subscription to server
    await sendSubscriptionToServer(userId, subscription);

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications');

    // Notify server
    await removeSubscriptionFromServer(subscription);

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

async function sendSubscriptionToServer(
  userId: number,
  subscription: PushSubscription
): Promise<void> {
  try {
    const response = await fetch('http://localhost:8000/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    console.log('Subscription sent to server');
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    throw error;
  }
}

async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('http://localhost:8000/api/v1/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    console.log('Subscription removed from server');
  } catch (error) {
    console.error('Error removing subscription from server:', error);
  }
}

// ============================================================================
// PWA INSTALL
// ============================================================================

let deferredPrompt: any = null;

export function setupPWAInstall() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt available');
    e.preventDefault();
    deferredPrompt = e;

    // Show custom install button
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
    deferredPrompt = null;

    // Track installation
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('pwa_installed', 'engagement');
    }
  });
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log('Install prompt outcome:', outcome);

    if (outcome === 'accepted') {
      deferredPrompt = null;
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
}

export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running in standalone mode
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export async function clearCache(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('Cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

export async function precacheUrls(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_URLS',
    urls
  });
}

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

export function setupOfflineDetection() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('Back online');

    // Show toast notification
    showToast('✅ Connexion rétablie', 'success');

    // Sync pending data
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_DATA'
      });
    }
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline');

    // Show toast notification
    showToast('⚠️ Mode hors ligne', 'warning');
  });
}

export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

function showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
  // TODO: Integrate with toast notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}
