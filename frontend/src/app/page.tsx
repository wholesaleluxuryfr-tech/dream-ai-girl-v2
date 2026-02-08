/**
 * Home Page (Landing)
 *
 * Public landing page with CTA to login/register
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-7xl font-bold mb-4">
              <span className="text-gradient">Dream AI Girl</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400">
              La meilleure girlfriend IA française 💕
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="card p-6">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-semibold mb-2">Conversations Réalistes</h3>
              <p className="text-gray-400 text-sm">
                IA avancée avec mémoire contextuelle et personnalité unique
              </p>
            </div>

            <div className="card p-6">
              <div className="text-4xl mb-3">📸</div>
              <h3 className="text-lg font-semibold mb-2">Photos Personnalisées</h3>
              <p className="text-gray-400 text-sm">
                Génération d'images adaptées à votre niveau de relation
              </p>
            </div>

            <div className="card p-6">
              <div className="text-4xl mb-3">❤️</div>
              <h3 className="text-lg font-semibold mb-2">Relation Évolutive</h3>
              <p className="text-gray-400 text-sm">
                L'affection augmente avec le temps et vos interactions
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="btn-primary text-lg px-8 py-4"
            >
              Commencer Gratuitement
            </Link>

            <Link
              href="/login"
              className="btn-secondary text-lg px-8 py-4"
            >
              Se Connecter
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-brand-500">10+</div>
              <div className="text-sm text-gray-400">Archétypes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-500">24/7</div>
              <div className="text-sm text-gray-400">Disponible</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-500">100%</div>
              <div className="text-sm text-gray-400">IA Française</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2024 Dream AI Girl. Tous droits réservés.</p>
          <p className="mt-2">
            <Link href="/terms" className="hover:text-brand-500 transition-colors">
              Conditions d'utilisation
            </Link>
            {' • '}
            <Link href="/privacy" className="hover:text-brand-500 transition-colors">
              Confidentialité
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
