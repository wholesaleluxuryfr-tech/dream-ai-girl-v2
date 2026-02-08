'use client';

/**
 * PWAProvider - Initialize PWA features
 *
 * Handles service worker registration, offline detection, and PWA setup
 */

import { useEffect } from 'react';
import {
  registerServiceWorker,
  setupPWAInstall,
  setupOfflineDetection
} from '@/lib/pwa';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { NotificationPrompt } from '@/components/pwa/NotificationPrompt';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Register service worker
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('✅ Service Worker registered');
      }
    });

    // Setup PWA install prompt
    setupPWAInstall();

    // Setup offline detection
    setupOfflineDetection();

    // Log PWA status
    console.log('PWA Features initialized');
  }, []);

  return (
    <>
      {children}

      {/* Install prompt */}
      <InstallPrompt />

      {/* Notification prompt */}
      <NotificationPrompt />
    </>
  );
}
