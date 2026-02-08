'use client';

/**
 * Register Page
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      router.push('/matches');  // Redirect after successful registration
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Dream AI Girl</span>
          </h1>
          <p className="text-gray-400">Crée ton compte gratuitement 🎉</p>
        </div>

        {/* Register Card */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Inscription</h2>

          {/* Error Message */}
          {displayError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-500 text-sm">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="input"
                placeholder="ton_pseudo"
                required
                minLength={3}
                maxLength={20}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="ton@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
              <p className="text-gray-500 text-xs mt-1">
                Minimum 8 caractères
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner h-5 w-5" />
                  <span>Inscription...</span>
                </div>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-gray-500 text-xs mt-4 text-center">
            En créant un compte, tu acceptes nos{' '}
            <Link href="/terms" className="text-brand-500 hover:underline">
              Conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link href="/privacy" className="text-brand-500 hover:underline">
              Politique de confidentialité
            </Link>
          </p>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-dark-800" />
            <span className="text-gray-500 text-sm">ou</span>
            <div className="flex-1 h-px bg-dark-800" />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Déjà un compte?{' '}
              <Link
                href="/login"
                className="text-brand-500 hover:text-brand-400 font-medium transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
