'use client';

/**
 * InstallPrompt Component - PWA installation banner
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { canInstallPWA, promptPWAInstall, isPWAInstalled } from '@/lib/pwa';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isPWAInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed prompt before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Check if can install
    const checkInterval = setInterval(() => {
      if (canInstallPWA()) {
        setShowPrompt(true);
        clearInterval(checkInterval);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleInstall = async () => {
    const success = await promptPWAInstall();
    if (success) {
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) {
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
        <div className="card p-4 shadow-2xl border-2 border-brand-500">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="text-4xl flex-shrink-0">📱</div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold mb-1">
                Installer Dream AI Girl
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Accès rapide, notifications, et mode hors ligne
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="btn btn-primary btn-sm flex-1"
                >
                  Installer
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
