'use client';

/**
 * AchievementBadge Component - Display individual achievement
 */

import { motion } from 'framer-motion';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: number;
  progress: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  reward_type: string;
  reward_value: number;
  is_secret: boolean;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function AchievementBadge({ achievement, size = 'md', showProgress = true }: AchievementBadgeProps) {
  const isLocked = !achievement.is_unlocked;
  const progress = Math.min((achievement.progress / achievement.requirement) * 100, 100);

  // Rarity colors
  const rarityColors = {
    common: 'border-gray-600 bg-gray-900/50',
    rare: 'border-blue-500 bg-blue-900/20',
    epic: 'border-purple-500 bg-purple-900/20',
    legendary: 'border-yellow-500 bg-yellow-900/20 shadow-glow'
  };

  // Size classes
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const iconSizes = {
    sm: 'text-3xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        card border-2
        ${rarityColors[achievement.rarity]}
        ${sizeClasses[size]}
        ${isLocked ? 'opacity-60' : ''}
      `}
    >
      {/* Icon */}
      <div className="flex items-start gap-4">
        <div className={`
          ${iconSizes[size]}
          ${isLocked ? 'grayscale' : ''}
        `}>
          {achievement.is_secret && isLocked ? '🔒' : achievement.icon}
        </div>

        <div className="flex-1">
          {/* Name */}
          <h3 className={`
            font-bold mb-1
            ${size === 'lg' ? 'text-xl' : size === 'md' ? 'text-lg' : 'text-base'}
          `}>
            {achievement.is_secret && isLocked ? '???' : achievement.name}
          </h3>

          {/* Description */}
          <p className={`
            text-gray-400 mb-2
            ${size === 'lg' ? 'text-base' : 'text-sm'}
          `}>
            {achievement.is_secret && isLocked
              ? 'Achievement secret - à débloquer'
              : achievement.description
            }
          </p>

          {/* Progress bar */}
          {showProgress && !isLocked && achievement.progress < achievement.requirement && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{achievement.progress} / {achievement.requirement}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-pink"
                />
              </div>
            </div>
          )}

          {/* Reward */}
          <div className="flex items-center gap-2">
            {/* Rarity badge */}
            <span className={`
              text-xs px-2 py-1 rounded-full
              ${achievement.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-500' : ''}
              ${achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-500' : ''}
              ${achievement.rarity === 'rare' ? 'bg-blue-500/20 text-blue-500' : ''}
              ${achievement.rarity === 'common' ? 'bg-gray-500/20 text-gray-500' : ''}
            `}>
              {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
            </span>

            {/* Reward */}
            {!isLocked && (
              <span className="text-xs text-brand-500 font-semibold">
                +{achievement.reward_value}{' '}
                {achievement.reward_type === 'tokens' ? '💎' : 'XP'}
              </span>
            )}

            {/* Unlocked date */}
            {achievement.unlocked_at && (
              <span className="text-xs text-gray-600 ml-auto">
                {new Date(achievement.unlocked_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
