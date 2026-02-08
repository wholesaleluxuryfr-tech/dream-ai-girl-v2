'use client';

/**
 * Matches/Discover Page - Swipe on profiles
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMatchStore } from '@/lib/stores/match-store';
import { SwipeCard } from '@/components/matches/SwipeCard';
import { MatchModal } from '@/components/matches/MatchModal';
import type { GirlProfile } from '@/types';

export default function MatchesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const {
    discoverQueue,
    currentProfileIndex,
    isLoadingQueue,
    swipeLeft,
    swipeRight,
    loadDiscoverQueue,
  } = useMatchStore();

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<GirlProfile | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load discover queue on mount
  useEffect(() => {
    if (user && discoverQueue.length === 0) {
      loadDiscoverQueue(user.id);
    }
  }, [user, discoverQueue.length, loadDiscoverQueue]);

  // Current profile to display
  const currentProfile = discoverQueue[currentProfileIndex];

  /**
   * Handle swipe left (reject)
   */
  const handleSwipeLeft = async () => {
    if (!user || !currentProfile) return;

    await swipeLeft(user.id, currentProfile.girl_id);
  };

  /**
   * Handle swipe right (like/match)
   */
  const handleSwipeRight = async () => {
    if (!user || !currentProfile) return;

    try {
      const result = await swipeRight(user.id, currentProfile.girl_id);

      // Show match modal if matched
      if (result?.matched) {
        setMatchedProfile(currentProfile);
        setShowMatchModal(true);
      }
    } catch (error) {
      console.error('Swipe error:', error);
    }
  };

  /**
   * Handle profile info click
   */
  const handleInfoClick = () => {
    if (currentProfile) {
      // TODO: Open profile detail modal
      console.log('Show profile detail for:', currentProfile.girl_id);
    }
  };

  /**
   * Handle match modal close
   */
  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    setMatchedProfile(null);
  };

  /**
   * Handle "Keep Swiping" from match modal
   */
  const handleKeepSwiping = () => {
    handleMatchModalClose();
  };

  /**
   * Handle "Start Chatting" from match modal
   */
  const handleStartChat = () => {
    if (matchedProfile) {
      router.push(`/chat/${matchedProfile.girl_id}`);
    }
  };

  // Loading state
  if (isLoadingQueue && discoverQueue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-400">Recherche de profils...</p>
        </div>
      </div>
    );
  }

  // No more profiles
  if (!currentProfile || currentProfileIndex >= discoverQueue.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold mb-2">Plus de profils</h2>
          <p className="text-gray-400 mb-6">
            Tu as vu tous les profils disponibles pour le moment. Reviens plus tard pour en découvrir de nouveaux!
          </p>
          <button
            onClick={() => router.push('/conversations')}
            className="btn btn-primary"
          >
            Voir mes conversations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Découvrir</h1>

          <div className="flex items-center gap-4">
            {/* Queue counter */}
            <div className="text-sm text-gray-400">
              {currentProfileIndex + 1} / {discoverQueue.length}
            </div>

            {/* Filters button */}
            <button
              className="btn btn-ghost"
              onClick={() => {
                // TODO: Open filters modal
                console.log('Open filters');
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProfile.girl_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <SwipeCard
              profile={currentProfile}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onInfoClick={handleInfoClick}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Match Modal */}
      {showMatchModal && matchedProfile && (
        <MatchModal
          profile={matchedProfile}
          onClose={handleMatchModalClose}
          onKeepSwiping={handleKeepSwiping}
          onStartChat={handleStartChat}
        />
      )}
    </div>
  );
}
