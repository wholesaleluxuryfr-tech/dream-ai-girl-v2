'use client';

/**
 * DailyRewardModal Component - Daily login reward modal
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  tokensEarned: number;
  xpEarned: number;
  multiplier?: number;
  longestStreak?: number;
}

export function DailyRewardModal({
  isOpen,
  onClose,
  streak,
  tokensEarned,
  xpEarned,
  multiplier = 1,
  longestStreak = 0
}: DailyRewardModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const isNewRecord = longestStreak > 0 && streak >= longestStreak;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
          onClick={handleClose}
        >
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="bg-dark-900 rounded-3xl p-8 max-w-md w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-yellow-500/10 animate-gradient-shift" />

            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, x: '50%', opacity: 1, scale: 1 }}
                  animate={{
                    y: ['0%', '100%'],
                    x: `${Math.random() * 100}%`,
                    opacity: [1, 0],
                    scale: [1, 0.5],
                    rotate: [0, Math.random() * 360]
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2
                  }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#ec4899', '#a855f7', '#fbbf24', '#f43f5e'][Math.floor(Math.random() * 4)]
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-7xl text-center mb-4"
              >
                🎁
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-center mb-2"
              >
                Récompense Quotidienne
              </motion.h2>

              {/* Streak */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-6"
              >
                <div className="inline-flex items-center gap-2 bg-dark-800/50 px-4 py-2 rounded-full">
                  <span className="text-2xl">🔥</span>
                  <span className="text-xl font-bold">{streak} jours</span>
                </div>

                {isNewRecord && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-2 text-yellow-500 font-semibold"
                  >
                    🏆 Nouveau record!
                  </motion.div>
                )}
              </motion.div>

              {/* Rewards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 mb-6"
              >
                {/* Tokens */}
                <div className="flex items-center justify-between bg-dark-800/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">💎</span>
                    <span className="font-semibold">Tokens</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-500">
                    +{tokensEarned}
                  </span>
                </div>

                {/* XP */}
                <div className="flex items-center justify-between bg-dark-800/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⭐</span>
                    <span className="font-semibold">XP</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-500">
                    +{xpEarned}
                  </span>
                </div>
              </motion.div>

              {/* Multiplier */}
              {multiplier > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-center mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                >
                  <span className="text-yellow-500 font-semibold">
                    🎉 Bonus de série x{multiplier}!
                  </span>
                </motion.div>
              )}

              {/* Continue button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={handleClose}
                className="btn btn-primary w-full text-lg py-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Génial! 🎊
              </motion.button>

              {/* Next reward */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-sm text-gray-400 mt-4"
              >
                Reviens demain pour continuer ta série! 🔥
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
