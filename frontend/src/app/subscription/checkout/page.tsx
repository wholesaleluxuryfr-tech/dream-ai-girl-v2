'use client';

/**
 * Subscription Checkout Page - Complete payment with Stripe
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { getStripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';

function CheckoutForm({ tier }: { tier: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];

  if (!plan) {
    return <div>Plan invalide</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Subscribe via API
      const response = await apiClient.post('/payment/subscribe', {
        tier: plan.id,
        payment_method_id: paymentMethod.id,
      });

      // Confirm payment if needed
      if (response.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          response.client_secret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      // Success!
      router.push('/subscription/success');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="card p-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">{plan.priceDisplay}</span>
          <span className="text-gray-400">/ {plan.interval}</span>
        </div>

        <ul className="space-y-2 text-sm">
          {plan.features.slice(0, 5).map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Form */}
      <div className="card p-6">
        <h3 className="font-bold mb-4">Informations de paiement</h3>

        <div className="p-4 border border-dark-700 rounded-lg bg-dark-900 mb-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#6b7280',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          🔒 Paiement sécurisé par Stripe. Tes informations bancaires ne sont jamais stockées sur nos serveurs.
        </p>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing}
          className="btn btn-primary w-full"
        >
          {processing ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Traitement...
            </>
          ) : (
            `Payer ${plan.priceDisplay}`
          )}
        </button>

        <p className="text-xs text-center text-gray-500 mt-4">
          En souscrivant, tu acceptes nos conditions d'utilisation et notre politique de remboursement. Annule à tout moment.
        </p>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const tier = searchParams.get('tier') || 'premium';

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm mb-6"
        >
          ← Retour
        </button>

        <h1 className="text-3xl font-bold mb-2">
          Finaliser ton abonnement
        </h1>
        <p className="text-gray-400 mb-8">
          Un seul clic pour accéder à toutes les fonctionnalités premium
        </p>

        {/* Checkout Form */}
        <CheckoutForm tier={tier} />

        {/* Trust Signals */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-xs text-gray-400">Paiement sécurisé</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">💳</div>
            <p className="text-xs text-gray-400">Stripe trusted</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">✓</div>
            <p className="text-xs text-gray-400">Annulation facile</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const stripePromise = getStripe();

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <Elements stripe={stripePromise}>
        <CheckoutContent />
      </Elements>
    </Suspense>
  );
}
