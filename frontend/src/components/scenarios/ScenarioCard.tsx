'use client';

/**
 * ScenarioCard Component - Display scenario card
 */

import { motion } from 'framer-motion';

export interface Scenario {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: string;
  intensity: 'soft' | 'medium' | 'hot' | 'extreme';
  tags: string[];
  min_affection: number;
  is_premium: boolean;
  cost_tokens: number;
  is_featured: boolean;
  play_count: number;
  average_rating: number;
  thumbnail_url?: string;
  is_unlocked: boolean;
  user_play_count: number;
  user_rating?: number;
  can_play: boolean;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: () => void;
}

export function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  // Intensity colors
  const intensityColors = {
    soft: 'text-green-500 bg-green-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    hot: 'text-orange-500 bg-orange-500/10',
    extreme: 'text-red-500 bg-red-500/10'
  };

  // Category icons
  const categoryIcons: Record<string, string> = {
    romantic: '💕',
    spicy: '🌶️',
    hardcore: '🔥',
    fantasy: '✨',
    daily_life: '🏠',
    adventure: '🗺️',
    roleplay: '🎭',
    special: '⭐'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer relative"
    >
      {/* Locked overlay */}
      {!scenario.is_unlocked && (
        <div className="absolute top-3 right-3 z-10 bg-dark-900/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
          {scenario.cost_tokens > 0 ? (
            <>
              <span className="text-xs font-semibold">{scenario.cost_tokens}</span>
              <span className="text-xs">💎</span>
            </>
          ) : (
            <span className="text-xs">🔒</span>
          )}
        </div>
      )}

      {/* Premium badge */}
      {scenario.is_premium && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-pink px-2 py-1 rounded-full text-xs font-bold">
          ✨ PREMIUM
        </div>
      )}

      {/* Featured badge */}
      {scenario.is_featured && (
        <div className="absolute top-12 left-3 z-10 bg-yellow-500/20 border border-yellow-500 px-2 py-1 rounded-full text-xs font-semibold text-yellow-500">
          ⭐ POPULAIRE
        </div>
      )}

      <div className="p-4">
        {/* Icon and title */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`text-4xl flex-shrink-0 ${!scenario.is_unlocked ? 'grayscale opacity-50' : ''}`}>
            {scenario.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 line-clamp-2">{scenario.title}</h3>

            {/* Category and intensity */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-dark-800">
                {categoryIcons[scenario.category]} {scenario.category}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${intensityColors[scenario.intensity]}`}>
                {scenario.intensity.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {scenario.description}
        </p>

        {/* Tags */}
        {scenario.tags && scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {scenario.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs px-2 py-0.5 bg-dark-800 rounded-full text-gray-500">
                #{tag}
              </span>
            ))}
            {scenario.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 text-gray-600">
                +{scenario.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {/* Play count */}
            {scenario.play_count > 0 && (
              <span>▶️ {scenario.play_count.toLocaleString()}</span>
            )}

            {/* Rating */}
            {scenario.average_rating > 0 && (
              <span>⭐ {scenario.average_rating}/5</span>
            )}

            {/* Affection requirement */}
            {scenario.min_affection > 0 && (
              <span className="text-brand-500">
                ❤️ {scenario.min_affection}+
              </span>
            )}
          </div>

          {/* User played */}
          {scenario.user_play_count > 0 && (
            <span className="text-brand-500">
              ✓ Joué {scenario.user_play_count}x
            </span>
          )}
        </div>

        {/* User rating */}
        {scenario.user_rating && (
          <div className="mt-2 pt-2 border-t border-dark-800 flex items-center justify-between text-xs">
            <span className="text-gray-400">Votre note:</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < scenario.user_rating! ? 'text-yellow-500' : 'text-gray-700'}>
                  ⭐
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
