/**
 * Match Store - Zustand store for managing swipe/match state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GirlProfile, Match } from '@/types';
import { apiClient } from '@/lib/api-client';

interface MatchState {
  // Discover queue
  discoverQueue: GirlProfile[];
  currentProfileIndex: number;
  isLoadingQueue: boolean;

  // Matches
  matches: Match[];
  isLoadingMatches: boolean;

  // Actions
  loadDiscoverQueue: (userId: number) => Promise<void>;
  swipeLeft: (userId: number, girlId: string) => Promise<void>;
  swipeRight: (userId: number, girlId: string) => Promise<void>;
  loadMatches: (userId: number) => Promise<void>;
  nextProfile: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  discoverQueue: [],
  currentProfileIndex: 0,
  isLoadingQueue: false,
  matches: [],
  isLoadingMatches: false,
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Load discover queue (girls to swipe on)
       */
      loadDiscoverQueue: async (userId: number) => {
        set({ isLoadingQueue: true });

        try {
          const response = await apiClient.getDiscoverQueue(userId);

          set({
            discoverQueue: response.profiles,
            currentProfileIndex: 0,
            isLoadingQueue: false,
          });
        } catch (error) {
          console.error('Failed to load discover queue:', error);
          set({ isLoadingQueue: false });
        }
      },

      /**
       * Swipe left (reject)
       */
      swipeLeft: async (userId: number, girlId: string) => {
        try {
          // Record swipe (no match)
          await apiClient.swipe(userId, girlId, 'left');

          // Move to next profile
          get().nextProfile();

          // Reload queue if running low
          const { discoverQueue, currentProfileIndex } = get();
          if (currentProfileIndex >= discoverQueue.length - 2) {
            get().loadDiscoverQueue(userId);
          }
        } catch (error) {
          console.error('Failed to swipe left:', error);
        }
      },

      /**
       * Swipe right (like/match)
       */
      swipeRight: async (userId: number, girlId: string) => {
        try {
          // Record swipe (potential match)
          const response = await apiClient.swipe(userId, girlId, 'right');

          // If matched, add to matches
          if (response.matched) {
            const matchedGirl = get().discoverQueue[get().currentProfileIndex];

            const newMatch: Match = {
              id: response.matchId,
              userId,
              girlId,
              girl: matchedGirl,
              affection: 0,
              unreadCount: 0,
              lastMessage: null,
              lastMessageAt: null,
              createdAt: new Date().toISOString(),
            };

            set((state) => ({
              matches: [newMatch, ...state.matches],
            }));
          }

          // Move to next profile
          get().nextProfile();

          // Reload queue if running low
          const { discoverQueue, currentProfileIndex } = get();
          if (currentProfileIndex >= discoverQueue.length - 2) {
            get().loadDiscoverQueue(userId);
          }

          return response;
        } catch (error) {
          console.error('Failed to swipe right:', error);
          throw error;
        }
      },

      /**
       * Load user's matches
       */
      loadMatches: async (userId: number) => {
        set({ isLoadingMatches: true });

        try {
          const response = await apiClient.getMatches(userId);

          set({
            matches: response.matches,
            isLoadingMatches: false,
          });
        } catch (error) {
          console.error('Failed to load matches:', error);
          set({ isLoadingMatches: false });
        }
      },

      /**
       * Move to next profile in queue
       */
      nextProfile: () => {
        set((state) => ({
          currentProfileIndex: state.currentProfileIndex + 1,
        }));
      },

      /**
       * Reset state
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'match-storage',
      // Only persist matches, not discover queue (ephemeral)
      partialize: (state) => ({
        matches: state.matches,
      }),
    }
  )
);
