'use client';

/**
 * Preview Step - Review and confirm custom girlfriend
 */

import { motion } from 'framer-motion';

export function PreviewStep({
  data,
  onCreate,
  onBack,
  creating,
}: {
  data: any;
  onCreate: () => void;
  onBack: () => void;
  creating: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Preview Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card p-8 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20"
      >
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👩</div>
          <h2 className="text-3xl font-bold mb-2">{data.name}</h2>
          <p className="text-gray-400">{data.age} ans</p>
        </div>

        {/* Physical attributes */}
        <div className="mb-6">
          <h3 className="font-bold mb-3 text-pink-500">Apparence</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Origine:</span>
              <span className="ml-2 font-medium">{data.ethnicity}</span>
            </div>
            <div>
              <span className="text-gray-500">Silhouette:</span>
              <span className="ml-2 font-medium">{data.body_type}</span>
            </div>
            <div>
              <span className="text-gray-500">Poitrine:</span>
              <span className="ml-2 font-medium">{data.breast_size}</span>
            </div>
            <div>
              <span className="text-gray-500">Cheveux:</span>
              <span className="ml-2 font-medium">
                {data.hair_color} ({data.hair_length})
              </span>
            </div>
            <div>
              <span className="text-gray-500">Yeux:</span>
              <span className="ml-2 font-medium">{data.eye_color}</span>
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="mb-6">
          <h3 className="font-bold mb-3 text-purple-500">Personnalité</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium capitalize">{data.archetype}</span>
            </div>

            {data.interests && data.interests.length > 0 && (
              <div>
                <span className="text-gray-500">Intérêts:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.interests.map((interest: string) => (
                    <span key={interest} className="badge badge-sm badge-ghost">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.personality && (
              <div>
                <span className="text-gray-500">Description:</span>
                <p className="mt-1 text-gray-300">{data.personality}</p>
              </div>
            )}

            {data.backstory && (
              <div>
                <span className="text-gray-500">Background:</span>
                <p className="mt-1 text-gray-300">{data.backstory}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="alert alert-info">
          <span>
            ℹ️ Ta girlfriend sera automatiquement ajoutée à tes matchs. Tu pourras chatter
            avec elle immédiatement et générer des photos personnalisées.
          </span>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="card p-6">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={creating}
            className="btn btn-ghost flex-1"
          >
            ← Modifier
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="btn btn-primary flex-1"
          >
            {creating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Création...
              </>
            ) : (
              <>
                ✨ Créer ma girlfriend
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          En créant ta girlfriend, tu acceptes que son profil soit généré selon tes
          spécifications. Tu pourras la modifier ou la supprimer à tout moment.
        </p>
      </div>
    </div>
  );
}
