'use client';

/**
 * Profile Page - User profile and settings
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, [user]);

  async function fetchStats() {
    try {
      // Fetch user stats (matches, messages, etc.)
      // This would come from analytics endpoint
      setStats({
        matches: 12,
        messages: 543,
        photos: 89,
        level: user?.level || 1,
        xp: user?.xp || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (confirm('Se déconnecter ?')) {
      await logout();
      router.push('/login');
    }
  }

  if (!user) {
    return null;
  }

  const isElite = user.subscription_tier === 'elite';
  const isPremium = user.subscription_tier === 'premium';

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10"
        >
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-4xl">
              👤
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{user.username}</h1>
                {isElite && <span className="badge badge-lg bg-gradient-to-r from-purple-500 to-pink-500">Elite ⭐</span>}
                {isPremium && <span className="badge badge-lg badge-primary">Premium</span>}
              </div>
              <p className="text-gray-400">{user.email}</p>

              {/* Level */}
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">Level {stats?.level}</span>
                  <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden max-w-xs">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                      style={{ width: `${((stats?.xp || 0) % 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-pink-500">{stats.matches}</div>
              <div className="text-sm text-gray-400">Matchs</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-purple-500">{stats.messages}</div>
              <div className="text-sm text-gray-400">Messages</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{stats.photos}</div>
              <div className="text-sm text-gray-400">Photos</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-green-500">{user.tokens}</div>
              <div className="text-sm text-gray-400">Tokens</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mb-6">
          {/* Subscription */}
          <button
            onClick={() => router.push('/subscription')}
            className="card p-4 w-full flex items-center justify-between hover:bg-dark-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">👑</div>
              <div className="text-left">
                <div className="font-bold">Abonnement</div>
                <div className="text-sm text-gray-400">
                  {isElite ? 'Elite' : isPremium ? 'Premium' : 'Gratuit'}
                </div>
              </div>
            </div>
            <div className="text-2xl">→</div>
          </button>

          {/* Tokens */}
          <button
            onClick={() => router.push('/tokens')}
            className="card p-4 w-full flex items-center justify-between hover:bg-dark-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🪙</div>
              <div className="text-left">
                <div className="font-bold">Tokens</div>
                <div className="text-sm text-gray-400">
                  {user.tokens} tokens disponibles
                </div>
              </div>
            </div>
            <div className="text-2xl">→</div>
          </button>

          {/* Custom Girlfriends (Elite only) */}
          {isElite && (
            <button
              onClick={() => router.push('/my-girlfriends')}
              className="card p-4 w-full flex items-center justify-between hover:bg-dark-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">👩‍🎨</div>
                <div className="text-left">
                  <div className="font-bold">Mes Custom Girlfriends</div>
                  <div className="text-sm text-gray-400">
                    Gérer tes créations
                  </div>
                </div>
              </div>
              <div className="text-2xl">→</div>
            </button>
          )}

          {/* Achievements */}
          <button
            onClick={() => router.push('/achievements')}
            className="card p-4 w-full flex items-center justify-between hover:bg-dark-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏆</div>
              <div className="text-left">
                <div className="font-bold">Achievements</div>
                <div className="text-sm text-gray-400">
                  Voir tes accomplissements
                </div>
              </div>
            </div>
            <div className="text-2xl">→</div>
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="card p-4 w-full flex items-center justify-between hover:bg-dark-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📊</div>
              <div className="text-left">
                <div className="font-bold">Classement</div>
                <div className="text-sm text-gray-400">
                  Voir le leaderboard
                </div>
              </div>
            </div>
            <div className="text-2xl">→</div>
          </button>
        </div>

        {/* Settings */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Paramètres</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Notifications</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <span>Mode sombre</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <span>Sons</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border border-red-500/20">
          <h2 className="text-xl font-bold mb-4 text-red-500">Zone de danger</h2>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="btn btn-ghost w-full text-red-400 hover:bg-red-500/10"
            >
              Se déconnecter
            </button>

            <button
              className="btn btn-ghost w-full text-red-400 hover:bg-red-500/10"
            >
              Supprimer mon compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
