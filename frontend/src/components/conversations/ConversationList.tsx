'use client';

/**
 * ConversationList Component - List of active matches/conversations
 */

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Match } from '@/types';

interface ConversationListProps {
  matches: Match[];
  isLoading?: boolean;
}

export function ConversationList({ matches, isLoading }: ConversationListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center gap-4 p-4">
              <div className="w-16 h-16 bg-dark-800 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-800 rounded w-1/3"></div>
                <div className="h-3 bg-dark-800 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-6xl mb-4">💔</div>
        <h3 className="text-xl font-bold mb-2">Aucune conversation</h3>
        <p className="text-gray-400 mb-6">
          Commence par matcher avec quelqu'un!
        </p>
        <button
          onClick={() => router.push('/matches')}
          className="btn btn-primary"
        >
          Découvrir des profils
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-dark-800">
      {matches.map((match, index) => (
        <ConversationItem
          key={match.id}
          match={match}
          index={index}
          onClick={() => router.push(`/chat/${match.girlId}`)}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  match: Match;
  index: number;
  onClick: () => void;
}

function ConversationItem({ match, index, onClick }: ConversationItemProps) {
  const { girl, lastMessage, lastMessageAt, unreadCount, affection } = match;

  // Format timestamp
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Affection color
  const getAffectionColor = (level: number) => {
    if (level >= 80) return 'text-pink-500';
    if (level >= 60) return 'text-purple-500';
    if (level >= 40) return 'text-blue-500';
    return 'text-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 hover:bg-dark-800/50 cursor-pointer transition-colors active:scale-[0.98]"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dark-700">
          <img
            src={girl.photos[0] || '/placeholder-girl.jpg'}
            alt={girl.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}

        {/* Online indicator (always online for AI) */}
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-900"></div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and timestamp */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold truncate flex items-center gap-2">
            {girl.name}, {girl.age}
            {/* Affection hearts */}
            <span className={`text-sm ${getAffectionColor(affection)}`}>
              {affection >= 80 && '❤️❤️❤️'}
              {affection >= 60 && affection < 80 && '❤️❤️'}
              {affection >= 40 && affection < 60 && '❤️'}
            </span>
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatTimestamp(lastMessageAt)}
          </span>
        </div>

        {/* Last message */}
        <p
          className={`text-sm truncate ${
            unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'
          }`}
        >
          {lastMessage || 'Commencez la conversation...'}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{girl.archetype}</span>
          <span className="text-xs text-gray-600">•</span>
          <span className="text-xs text-gray-500">{girl.ethnicity}</span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        className="w-5 h-5 text-gray-600 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.div>
  );
}
