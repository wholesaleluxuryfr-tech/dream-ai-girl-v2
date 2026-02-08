'use client';

/**
 * SwipeCard Component - Tinder-style swipeable profile card
 *
 * Features:
 * - Swipe left (reject) or right (match)
 * - Drag animation
 * - Keyboard support (arrow keys)
 */

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import type { GirlProfile } from '@/types';

interface SwipeCardProps {
  profile: GirlProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onInfoClick?: () => void;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ profile, onSwipeLeft, onSwipeRight, onInfoClick }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Rotation based on drag
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);

  // Opacity for accept/reject indicators
  const acceptOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

  // Handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Check if swiped far enough
    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
      if (offset > 0) {
        // Swiped right - match!
        onSwipeRight();
      } else {
        // Swiped left - reject
        onSwipeLeft();
      }
    } else {
      // Reset position
      x.set(0);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onSwipeLeft();
      } else if (e.key === 'ArrowRight') {
        onSwipeRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipeLeft, onSwipeRight]);

  // Cycle through photos
  const nextPhoto = () => {
    setPhotoIndex((prev) => (prev + 1) % profile.photos.length);
  };

  const prevPhoto = () => {
    setPhotoIndex((prev) => (prev - 1 + profile.photos.length) % profile.photos.length);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Swipe indicators */}
      <motion.div
        className="absolute top-8 left-8 z-20 pointer-events-none"
        style={{ opacity: acceptOpacity }}
      >
        <div className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-2xl rotate-12 border-4 border-green-500">
          LIKE
        </div>
      </motion.div>

      <motion.div
        className="absolute top-8 right-8 z-20 pointer-events-none"
        style={{ opacity: rejectOpacity }}
      >
        <div className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold text-2xl -rotate-12 border-4 border-red-500">
          NOPE
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        ref={cardRef}
        className="relative w-full aspect-[3/4] cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: 'grabbing' }}
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-dark-900">
          {/* Photo */}
          <img
            src={profile.photos[photoIndex] || '/placeholder-girl.jpg'}
            alt={profile.name}
            className="w-full h-full object-cover"
          />

          {/* Photo navigation */}
          {profile.photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                ←
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                →
              </button>

              {/* Photo dots */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {profile.photos.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === photoIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Profile info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-3xl font-bold mb-1">
              {profile.name}, {profile.age}
            </h2>

            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="flex items-center gap-1">
                <span>💼</span>
                {profile.job}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>📍</span>
                {profile.location}
              </span>
            </div>

            <p className="text-sm text-gray-200 mb-4 line-clamp-2">
              {profile.bio}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-primary">
                {profile.archetype}
              </span>
              <span className="badge bg-dark-800">
                {profile.ethnicity}
              </span>
            </div>

            {/* Info button */}
            {onInfoClick && (
              <button
                onClick={onInfoClick}
                className="absolute bottom-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
              >
                ℹ️
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <button
          onClick={onSwipeLeft}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-colors active:scale-95"
        >
          ✕
        </button>

        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg transition-colors active:scale-95"
          >
            ℹ️
          </button>
        )}

        <button
          onClick={onSwipeRight}
          className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-colors active:scale-95"
        >
          ♥
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-gray-500 text-xs mt-4">
        Utilise les flèches ← → ou swipe
      </p>
    </div>
  );
}
