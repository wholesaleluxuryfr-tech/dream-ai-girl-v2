'use client';

/**
 * Subscription Page - Manage Premium/Elite subscriptions
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { SubscriptionPlanCard } from '@/components/payment/SubscriptionPlanCard';
import { CurrentSubscription } from '@/components/payment/CurrentSubscription';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchSubscription();
  }, [user]);

  async function fetchSubscription() {
    try {
      const data = await apiClient.get('/payment/subscription');
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const hasActiveSub = subscription?.tier !== 'free';

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm mb-4"
        >
          ← Retour
        </button>

        <h1 className="text-3xl font-bold mb-2">
          Abonnement Premium
        </h1>
        <p className="text-gray-400">
          Débloquez toutes les fonctionnalités et profitez d'une expérience sans limites
        </p>
      </div>

      {/* Current Subscription */}
      {hasActiveSub && (
        <div className="max-w-6xl mx-auto mb-8">
          <CurrentSubscription
            subscription={subscription}
            onCancel={async () => {
              try {
                await apiClient.post('/payment/cancel-subscription', {});
                await fetchSubscription();
              } catch (error) {
                console.error('Error canceling subscription:', error);
                alert('Erreur lors de l\'annulation');
              }
            }}
          />
        </div>
      )}

      {/* Subscription Plans */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
            <SubscriptionPlanCard
              key={plan.id}
              plan={plan}
              currentTier={subscription?.tier}
              onSubscribe={async (tier) => {
                // Navigate to checkout
                router.push(`/subscription/checkout?tier=${tier}`);
              }}
            />
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Comparaison des plans
        </h2>

        <div className="card p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3">Fonctionnalité</th>
                <th className="text-center py-3">Gratuit</th>
                <th className="text-center py-3">Premium</th>
                <th className="text-center py-3">Elite</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-dark-800">
                <td className="py-3">Girlfriends actives</td>
                <td className="text-center text-gray-400">1</td>
                <td className="text-center text-green-500">3</td>
                <td className="text-center text-purple-500">∞</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Messages par jour</td>
                <td className="text-center text-gray-400">50</td>
                <td className="text-center text-green-500">∞</td>
                <td className="text-center text-purple-500">∞</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Tokens par semaine</td>
                <td className="text-center text-gray-400">100</td>
                <td className="text-center text-green-500">500</td>
                <td className="text-center text-purple-500">∞</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Qualité photos</td>
                <td className="text-center text-gray-400">Standard</td>
                <td className="text-center text-green-500">HD</td>
                <td className="text-center text-purple-500">Ultra HD</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Génération vidéo</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Messages vocaux</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-green-500">✓</td>
                <td className="text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Custom girlfriend</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b border-dark-800">
                <td className="py-3">Pas de publicité</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-green-500">✓</td>
                <td className="text-center text-green-500">✓</td>
              </tr>
              <tr>
                <td className="py-3">Support prioritaire</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-red-500">✗</td>
                <td className="text-center text-green-500">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Questions fréquentes
        </h2>

        <div className="space-y-4">
          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Comment annuler mon abonnement ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Tu peux annuler ton abonnement à tout moment depuis cette page. L'abonnement restera actif jusqu'à la fin de la période payée.
            </p>
          </details>

          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Les tokens sont-ils reportés d'une semaine à l'autre ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Non, les tokens hebdomadaires ne sont pas reportés. Assure-toi de les utiliser avant la fin de la semaine !
            </p>
          </details>

          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Puis-je changer de plan à tout moment ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Oui, tu peux passer de Premium à Elite à tout moment. Le changement sera effectué immédiatement avec un ajustement au prorata.
            </p>
          </details>

          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Quels moyens de paiement sont acceptés ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Nous acceptons toutes les cartes bancaires (Visa, Mastercard, Amex) via Stripe, notre processeur de paiement sécurisé.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
