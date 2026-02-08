'use client';

/**
 * Subscription Plan Card Component
 */

import { motion } from 'framer-motion';

interface SubscriptionPlanCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    priceDisplay: string;
    interval: string;
    features: string[];
    popular: boolean;
  };
  currentTier?: string;
  onSubscribe: (tier: string) => void;
}

export function SubscriptionPlanCard({
  plan,
  currentTier,
  onSubscribe,
}: SubscriptionPlanCardProps) {
  const isCurrentPlan = currentTier === plan.id;
  const isPremium = plan.id === 'premium';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 relative ${
        plan.popular ? 'border-2 border-pink-500' : ''
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-pink-500 rounded-full text-xs font-bold">
          POPULAIRE
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">{plan.priceDisplay}</span>
          <span className="text-gray-400">/ {plan.interval}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      {isCurrentPlan ? (
        <button
          disabled
          className="btn btn-secondary w-full opacity-50 cursor-not-allowed"
        >
          Plan actuel
        </button>
      ) : (
        <button
          onClick={() => onSubscribe(plan.id)}
          className={`btn w-full ${
            isPremium ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          {currentTier === 'free' ? 'Souscrire' : 'Changer de plan'}
        </button>
      )}

      {/* Money-back guarantee */}
      <p className="text-xs text-center text-gray-500 mt-4">
        Garantie satisfait ou remboursé 7 jours
      </p>
    </motion.div>
  );
}
