'use client';

/**
 * Scenarios Page - Browse and select roleplay scenarios
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ScenarioCard, type Scenario } from '@/components/scenarios/ScenarioCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScenariosPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIntensity, setSelectedIntensity] = useState<string>('all');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load scenarios
  useEffect(() => {
    if (user) {
      loadScenarios();
    }
  }, [user, selectedCategory, selectedIntensity]);

  const loadScenarios = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: user.id.toString(),
        limit: '50'
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (selectedIntensity !== 'all') {
        params.append('intensity', selectedIntensity);
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/scenarios/browse?${params.toString()}`
      );
      const data = await response.json();

      setScenarios(data.scenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setShowDetailModal(true);
  };

  const handleStartScenario = async (girlId: string) => {
    if (!user || !selectedScenario) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/scenarios/${selectedScenario.id}/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            girl_id: girlId
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.detail || 'Erreur lors du démarrage du scénario');
        return;
      }

      const data = await response.json();

      // Redirect to chat with scenario context
      router.push(`/chat/${girlId}?scenario=${selectedScenario.id}`);
    } catch (error) {
      console.error('Failed to start scenario:', error);
      alert('Erreur lors du démarrage du scénario');
    }
  };

  const categories = [
    { value: 'all', label: 'Tous', icon: '🎭' },
    { value: 'romantic', label: 'Romantique', icon: '💕' },
    { value: 'spicy', label: 'Épicé', icon: '🌶️' },
    { value: 'hardcore', label: 'Intense', icon: '🔥' },
    { value: 'roleplay', label: 'Roleplay', icon: '🎪' },
    { value: 'daily_life', label: 'Quotidien', icon: '🏠' },
    { value: 'adventure', label: 'Aventure', icon: '🗺️' },
    { value: 'special', label: 'Spécial', icon: '⭐' }
  ];

  const intensities = [
    { value: 'all', label: 'Tous' },
    { value: 'soft', label: 'Doux', color: 'text-green-500' },
    { value: 'medium', label: 'Moyen', color: 'text-yellow-500' },
    { value: 'hot', label: 'Chaud', color: 'text-orange-500' },
    { value: 'extreme', label: 'Extrême', color: 'text-red-500' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-sm border-b border-dark-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">🎭 Scénarios</h1>
          <span className="text-sm text-gray-400">
            {scenarios.length} disponibles
          </span>
        </div>

        {/* Category filters */}
        <div className="border-t border-dark-800 overflow-x-auto">
          <div className="container mx-auto px-4 flex gap-2 py-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`btn btn-sm flex-shrink-0 ${
                  selectedCategory === cat.value ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity filters */}
        <div className="border-t border-dark-800">
          <div className="container mx-auto px-4 flex gap-2 py-2">
            {intensities.map((int) => (
              <button
                key={int.value}
                onClick={() => setSelectedIntensity(int.value)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  selectedIntensity === int.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-dark-800 rounded" />
              </div>
            ))}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-bold mb-2">Aucun scénario trouvé</h3>
            <p className="text-gray-400">
              Essaie de changer les filtres
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, index) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ScenarioCard
                  scenario={scenario}
                  onClick={() => handleScenarioClick(scenario)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Scenario Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedScenario && (
          <ScenarioDetailModal
            scenario={selectedScenario}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedScenario(null);
            }}
            onStart={handleStartScenario}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Scenario Detail Modal Component
interface ScenarioDetailModalProps {
  scenario: Scenario;
  onClose: () => void;
  onStart: (girlId: string) => void;
}

function ScenarioDetailModal({ scenario, onClose, onStart }: ScenarioDetailModalProps) {
  const [selectedGirl, setSelectedGirl] = useState<string>('');

  // TODO: Load user's matches to select girl
  const matches = [
    { girlId: 'emma', name: 'Emma', avatar: '👩' },
    { girlId: 'sophie', name: 'Sophie', avatar: '👱‍♀️' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-900 rounded-3xl p-8 max-w-2xl w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="text-6xl text-center mb-4">{scenario.icon}</div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-4">{scenario.title}</h2>

        {/* Tags */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-sm px-3 py-1 rounded-full bg-dark-800">
            {scenario.category}
          </span>
          <span className="text-sm px-3 py-1 rounded-full bg-orange-500/20 text-orange-500">
            {scenario.intensity.toUpperCase()}
          </span>
          {scenario.is_premium && (
            <span className="text-sm px-3 py-1 rounded-full bg-gradient-pink">
              ✨ PREMIUM
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-300 text-center mb-6">{scenario.description}</p>

        {/* Requirements */}
        <div className="bg-dark-800/50 p-4 rounded-xl mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {scenario.min_affection > 0 && (
              <div>
                <div className="text-2xl mb-1">❤️</div>
                <div className="text-sm text-gray-400">Affection {scenario.min_affection}+</div>
              </div>
            )}
            {scenario.cost_tokens > 0 && !scenario.is_unlocked && (
              <div>
                <div className="text-2xl mb-1">💎</div>
                <div className="text-sm text-gray-400">{scenario.cost_tokens} tokens</div>
              </div>
            )}
            {scenario.play_count > 0 && (
              <div>
                <div className="text-2xl mb-1">▶️</div>
                <div className="text-sm text-gray-400">{scenario.play_count} parties</div>
              </div>
            )}
          </div>
        </div>

        {/* Girl selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3">
            Choisir une fille:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {matches.map((match) => (
              <button
                key={match.girlId}
                onClick={() => setSelectedGirl(match.girlId)}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  selectedGirl === match.girlId
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="text-3xl mb-2">{match.avatar}</div>
                <div className="font-semibold">{match.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => selectedGirl && onStart(selectedGirl)}
          disabled={!selectedGirl}
          className="btn btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scenario.is_unlocked
            ? '🎬 Commencer le scénario'
            : `🔓 Débloquer (${scenario.cost_tokens} 💎)`
          }
        </button>
      </motion.div>
    </motion.div>
  );
}
