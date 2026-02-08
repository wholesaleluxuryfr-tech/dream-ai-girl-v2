'use client';

/**
 * Profile Page - User profile and settings
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMatchStore } from '@/lib/stores/match-store';
import { LevelProgress } from '@/components/gamification/LevelProgress';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { matches, reset: resetMatches } = useMatchStore();

  const [levelInfo, setLevelInfo] = useState({
    level: user?.level || 1,
    xp: user?.xp || 0,
    xp_to_next_level: 100
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load level info
  useEffect(() => {
    if (user) {
      loadLevelInfo();
    }
  }, [user]);

  const loadLevelInfo = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/gamification/level/${user.id}`
      );
      const data = await response.json();

      setLevelInfo({
        level: data.level,
        xp: data.xp,
        xp_to_next_level: data.xp_to_next_level
      });
    } catch (error) {
      console.error('Failed to load level info:', error);
    }
  };

  const handleLogout = () => {
    logout();
    resetMatches();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Profil</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 space-y-6">
        {/* User info card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-pink flex items-center justify-center text-3xl">
              👤
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{user.username}</h2>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-500">{matches.length}</div>
              <div className="text-xs text-gray-400">Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-500">{user.tokens || 0}</div>
              <div className="text-xs text-gray-400">Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-500">{user.subscription || 'Free'}</div>
              <div className="text-xs text-gray-400">Plan</div>
            </div>
          </div>
        </div>

        {/* Level progress card */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Progression</h3>
          <LevelProgress
            level={levelInfo.level}
            xp={levelInfo.xp}
            xp_to_next={levelInfo.xp_to_next_level}
            size="lg"
            showStats
          />
        </div>

        {/* Premium card */}
        {!user.subscription || user.subscription === 'free' ? (
          <div className="card bg-gradient-pink p-6 text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-xl font-bold mb-2">Passe Premium</h3>
            <p className="text-sm mb-4 opacity-90">
              Messages illimités, génération photos HD, et bien plus!
            </p>
            <button className="btn bg-white text-brand-600 hover:bg-gray-100">
              Voir les offres
            </button>
          </div>
        ) : null}

        {/* Settings sections */}
        <div className="space-y-3">
          {/* Achievements */}
          <button
            onClick={() => router.push('/achievements')}
            className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <span>Succès & Récompenses</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>

          {/* Account */}
          <button className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <span>Paramètres du compte</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>

          {/* Preferences */}
          <button className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎨</span>
              <span>Préférences</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>

          {/* Notifications */}
          <button className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <span>Notifications</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>

          {/* Privacy */}
          <button className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <span>Confidentialité</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>

          {/* Help */}
          <button className="card p-4 w-full flex items-center justify-between hover:bg-dark-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">❓</span>
              <span>Aide & Support</span>
            </div>
            <span className="text-gray-600">→</span>
          </button>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full text-red-500 hover:bg-red-500/10"
        >
          Se déconnecter
        </button>

        {/* Version */}
        <p className="text-center text-xs text-gray-600">
          Dream AI Girl v1.0.0
        </p>
      </main>
    </div>
  );
}
