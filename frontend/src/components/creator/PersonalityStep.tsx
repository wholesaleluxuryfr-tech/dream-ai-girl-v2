'use client';

/**
 * Personality Step - Archetype, interests, backstory
 */

import { useState } from 'react';

const ARCHETYPES = [
  {
    id: 'romantique',
    label: 'Romantique',
    emoji: '💕',
    description: 'Douce, affectueuse, adore les moments romantiques',
  },
  {
    id: 'perverse',
    label: 'Perverse',
    emoji: '😈',
    description: 'Coquine, audacieuse, aime explorer ses fantasmes',
  },
  {
    id: 'nympho',
    label: 'Nympho',
    emoji: '🔥',
    description: 'Appétit sexuel insatiable, toujours partante',
  },
  {
    id: 'timide',
    label: 'Timide',
    emoji: '😊',
    description: 'Réservée et innocente, mais curieuse',
  },
  {
    id: 'dominante',
    label: 'Dominante',
    emoji: '👑',
    description: 'Prend le contrôle et aime dominer',
  },
  {
    id: 'soumise',
    label: 'Soumise',
    emoji: '🙇‍♀️',
    description: 'Aime plaire et obéir à son partenaire',
  },
  {
    id: 'exhib',
    label: 'Exhib',
    emoji: '📸',
    description: 'Aime se montrer et être regardée',
  },
  {
    id: 'cougar',
    label: 'Cougar',
    emoji: '🐆',
    description: 'Mature, confiante, sait ce qu\'elle veut',
  },
];

const INTERESTS = [
  'Fitness', 'Yoga', 'Danse', 'Musique', 'Cinéma', 'Séries',
  'Cuisine', 'Voyages', 'Mode', 'Maquillage', 'Photographie',
  'Art', 'Lecture', 'Gaming', 'Animaux', 'Nature', 'Shopping',
  'Vin', 'Gastronomie', 'Spiritualité', 'Méditation'
];

export function PersonalityStep({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: any;
  onChange: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    data.interests || []
  );

  const toggleInterest = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter((i) => i !== interest)
      : [...selectedInterests, interest];

    setSelectedInterests(newInterests);
    onChange({ interests: newInterests });
  };

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold mb-6">Personnalité</h2>

      {/* Archetype */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Type de personnalité *</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              type="button"
              onClick={() => onChange({ archetype: arch.id })}
              className={`btn btn-sm h-auto py-3 flex-col ${
                data.archetype === arch.id ? 'btn-primary' : 'btn-ghost'
              }`}
              title={arch.description}
            >
              <div className="text-2xl mb-1">{arch.emoji}</div>
              <div className="text-xs">{arch.label}</div>
            </button>
          ))}
        </div>

        {/* Selected archetype description */}
        {data.archetype && (
          <div className="mt-3 p-3 bg-dark-800 rounded-lg text-sm text-gray-300">
            {ARCHETYPES.find((a) => a.id === data.archetype)?.description}
          </div>
        )}
      </div>

      {/* Interests */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Centres d'intérêt (optionnel)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`badge badge-lg ${
                selectedInterests.includes(interest)
                  ? 'badge-primary'
                  : 'badge-ghost'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        <label className="label">
          <span className="label-text-alt text-gray-500">
            {selectedInterests.length} sélectionné(s)
          </span>
        </label>
      </div>

      {/* Custom personality */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">
            Description personnalisée (optionnel)
          </span>
        </label>
        <textarea
          value={data.personality || ''}
          onChange={(e) => onChange({ personality: e.target.value })}
          placeholder="Ex: Elle est passionnée de fitness, adore cuisiner des plats italiens, et rêve de voyager en Asie..."
          className="textarea textarea-bordered w-full h-24"
          maxLength={500}
        />
        <label className="label">
          <span className="label-text-alt text-gray-500">
            Ajoute des détails sur sa personnalité (max 500 caractères)
          </span>
        </label>
      </div>

      {/* Backstory */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">
            Histoire / Background (optionnel)
          </span>
        </label>
        <textarea
          value={data.backstory || ''}
          onChange={(e) => onChange({ backstory: e.target.value })}
          placeholder="Ex: Elle a grandi à Paris, travaille comme photographe freelance, et adore les soirées tranquilles chez elle..."
          className="textarea textarea-bordered w-full h-24"
          maxLength={500}
        />
        <label className="label">
          <span className="label-text-alt text-gray-500">
            Donne-lui un background pour la rendre plus réaliste (max 500 caractères)
          </span>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-ghost flex-1">
          ← Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary flex-1"
          disabled={!data.archetype}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
