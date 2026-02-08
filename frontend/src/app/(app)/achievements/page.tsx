'use client';

/**
 * Achievements Page - View all achievements
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AchievementBadge, type Achievement } from '@/components/gamification/AchievementBadge';
import { LevelProgress } from '@/components/gamification/LevelProgress';
import { apiClient } from '@/lib/api-client';

export default function AchievementsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unlocked: 0,
    locked: 0,
    completion_percentage: 0
  });

  // Level info
  const [levelInfo, setLevelInfo] = useState({
    level: 1,
    xp: 0,
    xp_to_next_level: 100
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load achievements and level
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load achievements
      const achResponse = await fetch(
        `http://localhost:8000/api/v1/gamification/achievements/${user.id}`
      );
      const achData = await achResponse.json();

      setAchievements(achData.achievements);
      setStats(achData.stats);

      // Load level
      const levelResponse = await fetch(
        `http://localhost:8000/api/v1/gamification/level/${user.id}`
      );
      const levelData = await levelResponse.json();

      setLevelInfo({
        level: levelData.level,
        xp: levelData.xp,
        xp_to_next_level: levelData.xp_to_next_level
      });
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter achievements
  const filteredAchievements = achievements.filter((ach) => {
    if (filter === 'unlocked') return ach.is_unlocked;
    if (filter === 'locked') return !ach.is_unlocked;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Succès</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Level card */}
        <div className="card p-6">
          <LevelProgress
            level={levelInfo.level}
            xp={levelInfo.xp}
            xp_to_next={levelInfo.xp_to_next_level}
            size="lg"
            showStats
          />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-500">{stats.unlocked}</div>
              <div className="text-xs text-gray-400">Débloqués</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.locked}</div>
              <div className="text-xs text-gray-400">Verrouillés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {stats.completion_percentage}%
              </div>
              <div className="text-xs text-gray-400">Complétion</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`btn btn-sm ${filter === 'unlocked' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Débloqués ({stats.unlocked})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`btn btn-sm ${filter === 'locked' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Verrouillés ({stats.locked})
          </button>
        </div>

        {/* Achievements list */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-20 bg-dark-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏆</div>
            <p>Aucun succès dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="md"
                showProgress
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
