'use client';

/**
 * MatchModal Component - Shows when users match
 *
 * Animated celebration modal when a match occurs
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GirlProfile } from '@/types';

interface MatchModalProps {
  profile: GirlProfile;
  onClose: () => void;
  onKeepSwiping: () => void;
  onStartChat: () => void;
}

export function MatchModal({ profile, onClose, onKeepSwiping, onStartChat }: MatchModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleKeepSwiping = () => {
    setIsVisible(false);
    setTimeout(onKeepSwiping, 300);
  };

  const handleStartChat = () => {
    setIsVisible(false);
    setTimeout(onStartChat, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
            onClick={handleClose}
          >
            {/* Modal content */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="bg-dark-900 rounded-3xl p-8 max-w-md w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-purple-500/20 to-pink-500/20 animate-gradient-shift"></div>

              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      y: '50%',
                      x: '50%',
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{
                      y: `${Math.random() * 100}%`,
                      x: `${Math.random() * 100}%`,
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                      rotate: Math.random() * 360,
                    }}
                    transition={{
                      duration: 1.5 + Math.random() * 1,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 2,
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: ['#ec4899', '#a855f7', '#f43f5e', '#fbbf24'][Math.floor(Math.random() * 4)],
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10">
                {/* Title */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-6"
                >
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-pink bg-clip-text text-transparent">
                    C'est un Match!
                  </h2>
                  <p className="text-gray-400">
                    Vous vous êtes likés mutuellement 💖
                  </p>
                </motion.div>

                {/* Profile images */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative h-40 mb-6"
                >
                  {/* User image (placeholder) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-brand-500 overflow-hidden shadow-glow">
                    <div className="w-full h-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-4xl">
                      👤
                    </div>
                  </div>

                  {/* Heart icon in center */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-pink rounded-full flex items-center justify-center text-3xl shadow-glow z-10"
                  >
                    ❤️
                  </motion.div>

                  {/* Girl image */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-brand-500 overflow-hidden shadow-glow">
                    <img
                      src={profile.photos[0] || '/placeholder-girl.jpg'}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>

                {/* Profile info */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-center mb-6"
                >
                  <h3 className="text-2xl font-bold mb-1">
                    {profile.name}, {profile.age}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {profile.job} • {profile.location}
                  </p>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="space-y-3"
                >
                  <button
                    onClick={handleStartChat}
                    className="btn btn-primary w-full text-lg py-3"
                  >
                    💬 Commencer à discuter
                  </button>

                  <button
                    onClick={handleKeepSwiping}
                    className="btn btn-ghost w-full"
                  >
                    Continuer à swiper
                  </button>
                </motion.div>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-800/50 hover:bg-dark-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
