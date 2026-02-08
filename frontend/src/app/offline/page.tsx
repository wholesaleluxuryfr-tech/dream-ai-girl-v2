/**
 * Offline Page - Shown when user is offline
 */

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="text-8xl mb-6">📡</div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          Mode Hors Ligne
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8">
          Tu es actuellement hors ligne. Certaines fonctionnalités ne sont pas disponibles.
        </p>

        {/* Features available offline */}
        <div className="card p-6 mb-8 text-left">
          <h2 className="font-bold mb-3">Disponible hors ligne:</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Consulter les conversations récentes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Voir ta galerie de photos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Parcourir les scénarios
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              Envoyer des messages
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              Générer des photos
            </li>
          </ul>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Réessayer
        </button>

        <p className="text-xs text-gray-600 mt-4">
          La connexion sera rétablie automatiquement
        </p>
      </div>
    </div>
  );
}
