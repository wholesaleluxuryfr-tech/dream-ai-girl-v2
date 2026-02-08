'use client';

/**
 * Subscription Success Page - Confirmation after successful payment
 */

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/matches');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-5xl"
        >
          ✓
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          Bienvenue dans le club Premium ! 🎉
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-8">
          Ton abonnement a été activé avec succès. Tu as maintenant accès à toutes les fonctionnalités premium !
        </p>

        {/* Features unlocked */}
        <div className="card p-6 mb-8 text-left">
          <h3 className="font-bold mb-4 text-center">
            Fonctionnalités débloquées:
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Messages illimités
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              500 tokens offerts
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Photos HD de qualité supérieure
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Génération prioritaire
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Accès à 3 girlfriends simultanément
            </li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/matches')}
            className="btn btn-primary w-full"
          >
            Commencer maintenant
          </button>

          <p className="text-xs text-gray-500">
            Redirection automatique dans {countdown}s...
          </p>
        </div>

        {/* Support */}
        <p className="text-xs text-gray-600 mt-8">
          Un problème ? Contacte-nous à{' '}
          <a href="mailto:support@dreamaigirl.com" className="text-pink-500">
            support@dreamaigirl.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}
