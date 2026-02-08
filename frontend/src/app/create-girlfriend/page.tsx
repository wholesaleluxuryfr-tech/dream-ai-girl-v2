'use client';

/**
 * Custom Girlfriend Creator Page
 *
 * Multi-step wizard for Elite tier users to create personalized girlfriends
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiClient } from '@/lib/api-client';

// Creator steps
import { BasicInfoStep } from '@/components/creator/BasicInfoStep';
import { AppearanceStep } from '@/components/creator/AppearanceStep';
import { PersonalityStep } from '@/components/creator/PersonalityStep';
import { PreviewStep } from '@/components/creator/PreviewStep';

interface CustomGirlData {
  name: string;
  age: number;
  ethnicity: string;
  body_type: string;
  breast_size: string;
  hair_color: string;
  hair_length: string;
  eye_color: string;
  archetype: string;
  personality?: string;
  interests?: string[];
  backstory?: string;
}

export default function CreateGirlfriendPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState<CustomGirlData>({
    name: '',
    age: 25,
    ethnicity: 'french',
    body_type: 'athletic',
    breast_size: 'C',
    hair_color: 'brun',
    hair_length: 'long',
    eye_color: 'marron',
    archetype: 'romantique',
    personality: '',
    interests: [],
    backstory: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    checkLimits();
  }, [user]);

  async function checkLimits() {
    try {
      const data = await apiClient.get('/custom-girls/limits');
      setLimits(data);

      if (!data.has_access) {
        // Redirect to subscription page if not Elite
        router.push('/subscription');
      }
    } catch (error) {
      console.error('Error checking limits:', error);
    } finally {
      setLoading(false);
    }
  }

  const updateFormData = (updates: Partial<CustomGirlData>) => {
    setFormData({ ...formData, ...updates });
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await apiClient.post('/custom-girls/create', formData);

      // Success! Redirect to chat with new girlfriend
      router.push(`/chat/${response.girl_id}?new=true`);
    } catch (error: any) {
      console.error('Error creating girlfriend:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

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

  if (!limits?.has_access) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">
            Fonctionnalité Elite
          </h1>
          <p className="text-gray-400 mb-6">
            La création de girlfriend personnalisée est réservée aux membres Elite.
          </p>
          <button
            onClick={() => router.push('/subscription')}
            className="btn btn-primary"
          >
            Devenir Elite
          </button>
        </div>
      </div>
    );
  }

  if (!limits?.can_create) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">
            Limite atteinte
          </h1>
          <p className="text-gray-400 mb-6">
            Tu as atteint la limite de {limits.max_count} custom girlfriends. Supprime-en une pour en créer une nouvelle.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="btn btn-primary"
          >
            Gérer mes girlfriends
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Retour
          </button>

          <h1 className="text-3xl font-bold mb-2">
            Créer ta Girlfriend 🎨
          </h1>
          <p className="text-gray-400">
            Personnalise chaque détail pour créer ta girlfriend idéale
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {['Infos', 'Apparence', 'Personnalité', 'Aperçu'].map((label, index) => (
              <div
                key={label}
                className={`text-sm font-medium ${
                  step > index + 1
                    ? 'text-green-500'
                    : step === index + 1
                    ? 'text-pink-500'
                    : 'text-gray-600'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="text-xs text-gray-500 mt-2 text-right">
            Étape {step} sur 4
          </div>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <BasicInfoStep
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AppearanceStep
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PersonalityStep
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PreviewStep
                data={formData}
                onCreate={handleCreate}
                onBack={prevStep}
                creating={creating}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Limits info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {limits?.current_count || 0} / {limits?.max_count || 5} custom girlfriends créées
        </div>
      </div>
    </div>
  );
}
