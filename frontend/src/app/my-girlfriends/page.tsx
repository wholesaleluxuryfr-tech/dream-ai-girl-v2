'use client';

/**
 * My Custom Girlfriends Page - Manage created girlfriends
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';

export default function MyGirlfriendsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [girlfriends, setGirlfriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchGirlfriends();
  }, [user]);

  async function fetchGirlfriends() {
    try {
      const data = await apiClient.get('/custom-girls/list');
      setGirlfriends(data.custom_girls || []);
    } catch (error) {
      console.error('Error fetching girlfriends:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(girlId: string, name: string) {
    if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) {
      return;
    }

    setDeleting(girlfriends.find((g) => g.girl_id === girlId)?.id);
    try {
      await apiClient.delete(`/custom-girls/${girlId}`);
      setGirlfriends(girlfriends.filter((g) => g.girl_id !== girlId));
    } catch (error) {
      console.error('Error deleting girlfriend:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Retour
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Mes Custom Girlfriends
              </h1>
              <p className="text-gray-400">
                {girlfriends.length} / 5 créées
              </p>
            </div>

            {girlfriends.length < 5 && (
              <button
                onClick={() => router.push('/create-girlfriend')}
                className="btn btn-primary"
              >
                + Créer une nouvelle
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {girlfriends.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👩‍🎨</div>
            <h2 className="text-2xl font-bold mb-2">
              Aucune custom girlfriend
            </h2>
            <p className="text-gray-400 mb-6">
              Crée ta première girlfriend personnalisée pour commencer
            </p>
            <button
              onClick={() => router.push('/create-girlfriend')}
              className="btn btn-primary"
            >
              Créer maintenant
            </button>
          </div>
        )}

        {/* Girlfriends Grid */}
        {girlfriends.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {girlfriends.map((girl) => (
              <motion.div
                key={girl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                {/* Avatar placeholder */}
                <div className="w-full aspect-square bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-6xl">👩</div>
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold mb-1">{girl.name}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {girl.age} ans • {girl.archetype}
                </p>

                {/* Attributes */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge badge-sm badge-ghost">
                    {girl.ethnicity}
                  </span>
                  <span className="badge badge-sm badge-ghost">
                    {girl.body_type}
                  </span>
                  <span className="badge badge-sm badge-ghost">
                    {girl.hair_color}
                  </span>
                </div>

                {/* Stats */}
                <div className="text-xs text-gray-500 mb-4">
                  Créée le {new Date(girl.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/chat/${girl.girl_id}`)}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    💬 Chatter
                  </button>
                  <button
                    onClick={() => handleDelete(girl.girl_id, girl.name)}
                    disabled={deleting === girl.id}
                    className="btn btn-ghost btn-sm text-red-400"
                  >
                    {deleting === girl.id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      '🗑️'
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 card p-6 bg-dark-800">
          <h3 className="font-bold mb-3">💡 À propos des Custom Girlfriends</h3>

          <div className="space-y-3 text-sm text-gray-400">
            <p>
              • Les custom girlfriends sont générées selon tes spécifications exactes
            </p>
            <p>
              • Tu peux créer jusqu'à 5 girlfriends personnalisées (Elite tier)
            </p>
            <p>
              • Elles apparaissent automatiquement dans tes matchs après création
            </p>
            <p>
              • Tu peux chatter avec elles et générer des photos comme avec les autres
            </p>
            <p>
              • Supprime une girlfriend pour libérer un slot et en créer une nouvelle
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
