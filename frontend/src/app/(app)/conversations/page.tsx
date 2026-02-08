'use client';

/**
 * Conversations Page - List of all active conversations/matches
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMatchStore } from '@/lib/stores/match-store';
import { ConversationList } from '@/components/conversations/ConversationList';

export default function ConversationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { matches, isLoadingMatches, loadMatches } = useMatchStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load matches on mount
  useEffect(() => {
    if (user && matches.length === 0) {
      loadMatches(user.id);
    }
  }, [user, matches.length, loadMatches]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Conversations</h1>

          <div className="flex items-center gap-2">
            {/* Match count */}
            {matches.length > 0 && (
              <div className="text-sm text-gray-400">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </div>
            )}

            {/* Discover button */}
            <button
              onClick={() => router.push('/matches')}
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Découvrir
            </button>
          </div>
        </div>
      </header>

      {/* Conversation list */}
      <main className="flex-1 overflow-y-auto">
        <ConversationList matches={matches} isLoading={isLoadingMatches} />
      </main>
    </div>
  );
}
