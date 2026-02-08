'use client';

/**
 * Current Subscription Component - Shows active subscription details
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';

interface CurrentSubscriptionProps {
  subscription: {
    tier: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
  onCancel: () => Promise<void>;
}

export function CurrentSubscription({
  subscription,
  onCancel,
}: CurrentSubscriptionProps) {
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const plan = SUBSCRIPTION_PLANS[subscription.tier as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) return null;

  const endDate = new Date(subscription.current_period_end);
  const formattedEndDate = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await onCancel();
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error canceling:', error);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            {subscription.tier === 'elite' && <span className="text-2xl">⭐</span>}
            <span
              className={`badge ${
                subscription.status === 'active'
                  ? 'badge-success'
                  : 'badge-warning'
              }`}
            >
              {subscription.status === 'active' ? 'Actif' : subscription.status}
            </span>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            {subscription.cancel_at_period_end ? (
              <>
                <span className="text-orange-500">⚠️ Annulation planifiée</span>
                <br />
                Ton abonnement se terminera le <strong>{formattedEndDate}</strong>
              </>
            ) : (
              <>
                Renouvellement automatique le <strong>{formattedEndDate}</strong>
              </>
            )}
          </p>

          {/* Features summary */}
          <div className="flex flex-wrap gap-2">
            {plan.features.slice(0, 4).map((feature, index) => (
              <span
                key={index}
                className="badge badge-sm bg-dark-700 text-gray-300"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Cancel button */}
        {!subscription.cancel_at_period_end && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="btn btn-ghost btn-sm text-red-400 hover:bg-red-500/10"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-2">
              Annuler ton abonnement ?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Tu perdras l'accès à toutes les fonctionnalités Premium à la fin de ta période de
              facturation le <strong>{formattedEndDate}</strong>.
            </p>

            <div className="bg-dark-800 p-4 rounded-lg mb-6">
              <p className="text-sm font-bold mb-2">Tu perdras :</p>
              <ul className="text-xs text-gray-400 space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="btn btn-ghost flex-1"
              >
                Garder {plan.name}
              </button>
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="btn btn-error flex-1"
              >
                {canceling ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Confirmer l\'annulation'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
