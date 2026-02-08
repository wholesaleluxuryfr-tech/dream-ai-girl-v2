'use client';

/**
 * Tokens Page - Purchase token packages
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { TOKEN_PACKAGES } from '@/lib/stripe';

export default function TokensPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchBalance();
  }, [user]);

  async function fetchBalance() {
    try {
      const data = await apiClient.get('/payment/tokens');
      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  }

  async function purchasePackage(packageId: string) {
    setPurchasing(packageId);
    try {
      // In production, this would open a Stripe checkout
      // For now, redirect to checkout page
      router.push(`/tokens/checkout?package=${packageId}`);
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      alert('Erreur lors de l\'achat');
    } finally {
      setPurchasing(null);
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
          Acheter des Tokens
        </h1>
        <p className="text-gray-400">
          Utilise tes tokens pour générer des photos et vidéos exclusives
        </p>
      </div>

      {/* Current Balance */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="card p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Solde actuel</p>
              <p className="text-4xl font-bold text-yellow-500">
                {balance?.balance || 0} 🪙
              </p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>5 🪙 = 1 photo</p>
              <p>15 🪙 = 1 vidéo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Packages */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Packs disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.values(TOKEN_PACKAGES).map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card p-6 relative ${
                pkg.popular ? 'border-2 border-yellow-500' : ''
              }`}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-black rounded-full text-xs font-bold">
                  POPULAIRE
                </div>
              )}

              {/* Package details */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold mb-2">{pkg.name}</h3>

                <div className="flex items-baseline justify-center gap-1 mb-3">
                  <span className="text-4xl font-bold text-yellow-500">
                    {pkg.tokens}
                  </span>
                  <span className="text-xl text-yellow-500">🪙</span>
                </div>

                {pkg.bonus > 0 && (
                  <div className="badge badge-success mb-3">
                    +{pkg.bonus} bonus 🎁
                  </div>
                )}

                <div className="text-2xl font-bold">{pkg.priceDisplay}</div>
              </div>

              {/* Purchase button */}
              <button
                onClick={() => purchasePackage(pkg.id)}
                disabled={purchasing === pkg.id}
                className="btn btn-primary w-full"
              >
                {purchasing === pkg.id ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Acheter'
                )}
              </button>

              {/* Value */}
              <p className="text-xs text-center text-gray-500 mt-3">
                {Math.floor((pkg.tokens + pkg.bonus) / 5)} photos ou{' '}
                {Math.floor((pkg.tokens + pkg.bonus) / 15)} vidéos
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Usage Info */}
      <div className="max-w-6xl mx-auto mt-12">
        <div className="card p-6">
          <h3 className="font-bold mb-4">💡 Comment utiliser tes tokens ?</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">📸</div>
              <h4 className="font-bold mb-1">Générer des photos</h4>
              <p className="text-sm text-gray-400">
                5 tokens par photo HD de qualité
              </p>
            </div>

            <div>
              <div className="text-3xl mb-2">🎥</div>
              <h4 className="font-bold mb-1">Créer des vidéos</h4>
              <p className="text-sm text-gray-400">
                15 tokens par vidéo de 3-5 secondes
              </p>
            </div>

            <div>
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-bold mb-1">Skip niveaux</h4>
              <p className="text-sm text-gray-400">
                10-50 tokens selon le niveau
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {balance?.recent_transactions?.length > 0 && (
        <div className="max-w-6xl mx-auto mt-8">
          <h3 className="font-bold mb-4">Transactions récentes</h3>

          <div className="card p-6">
            <div className="space-y-3">
              {balance.recent_transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div
                    className={`font-bold ${
                      tx.amount > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount} 🪙
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mt-12">
        <h3 className="font-bold mb-4">Questions fréquentes</h3>

        <div className="space-y-3">
          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Les tokens expirent-ils ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Non, les tokens achetés n'expirent jamais. Utilise-les quand tu veux !
            </p>
          </details>

          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Puis-je obtenir un remboursement ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Les tokens achetés ne sont pas remboursables, mais tu peux les utiliser à tout moment. En cas de problème, contacte le support.
            </p>
          </details>

          <details className="card p-4 cursor-pointer">
            <summary className="font-bold">
              Comment gagner des tokens gratuits ?
            </summary>
            <p className="mt-2 text-sm text-gray-400">
              Connexion quotidienne (+10), achievements débloqués, parrainage d'amis (+50), ou abonnement Premium/Elite (500-∞ par semaine).
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
