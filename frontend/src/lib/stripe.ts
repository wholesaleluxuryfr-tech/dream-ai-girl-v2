/**
 * Stripe integration utilities
 *
 * Handles payment processing with Stripe Elements
 */

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

// Initialize Stripe (singleton)
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}


/**
 * Create payment method from Stripe Elements
 */
export async function createPaymentMethod(
  stripe: Stripe,
  elements: StripeElements
): Promise<{ paymentMethodId?: string; error?: string }> {
  const cardElement = elements.getElement('card');
  if (!cardElement) {
    return { error: 'Card element not found' };
  }

  const { error, paymentMethod } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
  });

  if (error) {
    return { error: error.message };
  }

  return { paymentMethodId: paymentMethod?.id };
}


/**
 * Confirm payment with payment intent
 */
export async function confirmPayment(
  stripe: Stripe,
  clientSecret: string
): Promise<{ success: boolean; error?: string }> {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

  if (error) {
    return { success: false, error: error.message };
  }

  if (paymentIntent?.status === 'succeeded') {
    return { success: true };
  }

  return { success: false, error: 'Payment failed' };
}


/**
 * Format price (cents to EUR)
 */
export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros);
}


/**
 * Subscription plan features
 */
export const SUBSCRIPTION_PLANS = {
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    priceDisplay: '9,99€',
    interval: 'mois',
    features: [
      '3 girlfriends actives',
      'Messages illimités',
      '500 tokens/semaine',
      'Photos HD',
      'Priorité génération',
      'Pas de publicité',
      'Messages vocaux',
    ],
    popular: true,
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 19.99,
    priceDisplay: '19,99€',
    interval: 'mois',
    features: [
      'Girlfriends illimitées',
      'Messages illimités',
      'Tokens illimités',
      'Génération vidéo',
      'Custom girlfriend',
      'Support prioritaire',
      'Accès beta features',
      'Badge Elite ⭐',
    ],
    popular: false,
  },
};


/**
 * Token packages
 */
export const TOKEN_PACKAGES = {
  small: {
    id: 'small',
    name: 'Petit Pack',
    tokens: 100,
    bonus: 0,
    price: 4.99,
    priceDisplay: '4,99€',
    popular: false,
  },
  medium: {
    id: 'medium',
    name: 'Pack Moyen',
    tokens: 250,
    bonus: 25,
    price: 9.99,
    priceDisplay: '9,99€',
    popular: true,
  },
  large: {
    id: 'large',
    name: 'Grand Pack',
    tokens: 600,
    bonus: 100,
    price: 19.99,
    priceDisplay: '19,99€',
    popular: false,
  },
  mega: {
    id: 'mega',
    name: 'Méga Pack',
    tokens: 1500,
    bonus: 300,
    price: 39.99,
    priceDisplay: '39,99€',
    popular: false,
  },
};
