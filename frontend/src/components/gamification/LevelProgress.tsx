'use client';

/**
 * LevelProgress Component - Display user level and XP progress
 */

import { motion } from 'framer-motion';

interface LevelProgressProps {
  level: number;
  xp: number;
  xp_to_next: number;
  size?: 'sm' | 'md' | 'lg';
  showStats?: boolean;
}

export function LevelProgress({
  level,
  xp,
  xp_to_next,
  size = 'md',
  showStats = false
}: LevelProgressProps) {
  const progress = Math.min((xp / xp_to_next) * 100, 100);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const levelSizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl'
  };

  const barHeights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className={`
          ${levelSizes[size]}
          rounded-full bg-gradient-pink
          flex items-center justify-center
          font-bold text-white
          shadow-glow
          flex-shrink-0
        `}
      >
        {level}
      </motion.div>

      {/* Progress */}
      <div className="flex-1">
        <div className={`flex items-center justify-between mb-1 ${sizeClasses[size]}`}>
          <span className="font-semibold">Niveau {level}</span>
          {showStats && (
            <span className="text-gray-400">
              {xp.toLocaleString()} / {xp_to_next.toLocaleString()} XP
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className={`${barHeights[size]} bg-dark-800 rounded-full overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-pink relative"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </motion.div>
        </div>

        {/* Percentage */}
        {!showStats && (
          <div className={`text-right mt-1 ${sizeClasses[size]} text-gray-500`}>
            {Math.round(progress)}%
          </div>
        )}
      </div>
    </div>
  );
}
