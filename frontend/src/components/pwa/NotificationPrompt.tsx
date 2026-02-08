'use client';

/**
 * NotificationPrompt Component - Request notification permissions
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getNotificationPermission,
  subscribeToPushNotifications,
  requestNotificationPermission
} from '@/lib/pwa';
import { useAuthStore } from '@/lib/stores/auth-store';

export function NotificationPrompt() {
  const { user } = useAuthStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check current permission
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Don't show if already granted or denied
    if (currentPermission !== 'default') {
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('notification_prompt_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

      // Show again after 3 days
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // Show prompt after a delay (3 seconds)
    const timeout = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const handleEnable = async () => {
    if (!user) {
      alert('Vous devez être connecté pour activer les notifications');
      return;
    }

    try {
      const permission = await requestNotificationPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Subscribe to push notifications
        await subscribeToPushNotifications(user.id);
        setShowPrompt(false);

        // Show success message
        alert('✅ Notifications activées!');
      } else if (permission === 'denied') {
        setShowPrompt(false);
        alert('❌ Notifications refusées. Vous pouvez les activer dans les paramètres du navigateur.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Erreur lors de l\'activation des notifications');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
      >
        <div className="card p-4 shadow-2xl border-2 border-purple-500">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="text-4xl flex-shrink-0">🔔</div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold mb-1">
                Activer les notifications
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Reçois des alertes pour les nouveaux messages et photos
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleEnable}
                  className="btn btn-primary btn-sm flex-1"
                >
                  Activer
                </button>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost btn-sm"
                >
                  Plus tard
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
