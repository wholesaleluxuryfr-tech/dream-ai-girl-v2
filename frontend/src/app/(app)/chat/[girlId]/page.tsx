'use client';

/**
 * Chat Page - Individual Conversation
 *
 * Shows chat interface with specific girlfriend
 */

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ChatInterface } from '@/components/chat/ChatInterface';

// Mock girl profiles (TODO: fetch from API)
const GIRL_PROFILES: Record<string, { name: string; avatar?: string }> = {
  emma: { name: 'Emma' },
  chloe: { name: 'Chloé' },
  sophia: { name: 'Sophia' },
  julie: { name: 'Julie' },
  lea: { name: 'Léa' },
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  const girlId = params.girlId as string;
  const girl = GIRL_PROFILES[girlId];

  // Protect route
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!girl) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Girl not found</h1>
          <button
            onClick={() => router.push('/matches')}
            className="btn-primary"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ChatInterface
        girlId={girlId}
        girlName={girl.name}
        girlAvatar={girl.avatar}
      />
    </div>
  );
}
