'use client';

/**
 * Appearance Step - Physical attributes
 */

const ETHNICITIES = [
  { id: 'french', label: 'Française', emoji: '🇫🇷' },
  { id: 'european', label: 'Européenne', emoji: '🇪🇺' },
  { id: 'russian', label: 'Russe', emoji: '🇷🇺' },
  { id: 'latina', label: 'Latina', emoji: '🇧🇷' },
  { id: 'asian', label: 'Asiatique', emoji: '🇯🇵' },
  { id: 'african', label: 'Africaine', emoji: '🌍' },
  { id: 'arab', label: 'Arabe', emoji: '🇸🇦' },
  { id: 'mixed', label: 'Métisse', emoji: '🌎' },
];

const BODY_TYPES = [
  { id: 'slim', label: 'Mince', emoji: '🌹' },
  { id: 'athletic', label: 'Sportive', emoji: '💪' },
  { id: 'curvy', label: 'Pulpeuse', emoji: '🍑' },
  { id: 'plus', label: 'Ronde', emoji: '❤️' },
];

const BREAST_SIZES = [
  { id: 'A', label: 'A (petite)' },
  { id: 'B', label: 'B (moyenne)' },
  { id: 'C', label: 'C (normale)' },
  { id: 'D', label: 'D (généreuse)' },
  { id: 'DD+', label: 'DD+ (très généreuse)' },
];

const HAIR_COLORS = [
  { id: 'blond', label: 'Blonde', color: '#f4e4c1' },
  { id: 'brun', label: 'Brune', color: '#4a3728' },
  { id: 'châtain', label: 'Châtain', color: '#8b6f47' },
  { id: 'roux', label: 'Rousse', color: '#e34234' },
  { id: 'noir', label: 'Noir', color: '#1a1a1a' },
  { id: 'coloré', label: 'Coloré', color: '#ff69b4' },
];

const HAIR_LENGTHS = [
  { id: 'short', label: 'Court', emoji: '✂️' },
  { id: 'medium', label: 'Mi-long', emoji: '👩' },
  { id: 'long', label: 'Long', emoji: '💇‍♀️' },
];

const EYE_COLORS = [
  { id: 'marron', label: 'Marron', color: '#8b4513' },
  { id: 'bleu', label: 'Bleu', color: '#4169e1' },
  { id: 'vert', label: 'Vert', color: '#228b22' },
  { id: 'noisette', label: 'Noisette', color: '#cd853f' },
  { id: 'gris', label: 'Gris', color: '#808080' },
];

export function AppearanceStep({
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
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold mb-6">Apparence physique</h2>

      {/* Ethnicity */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Origine *</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ETHNICITIES.map((eth) => (
            <button
              key={eth.id}
              type="button"
              onClick={() => onChange({ ethnicity: eth.id })}
              className={`btn ${
                data.ethnicity === eth.id ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <span className="mr-2">{eth.emoji}</span>
              {eth.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body Type */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Silhouette *</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BODY_TYPES.map((body) => (
            <button
              key={body.id}
              type="button"
              onClick={() => onChange({ body_type: body.id })}
              className={`btn ${
                data.body_type === body.id ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <span className="mr-2">{body.emoji}</span>
              {body.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breast Size */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Poitrine *</span>
        </label>
        <select
          value={data.breast_size}
          onChange={(e) => onChange({ breast_size: e.target.value })}
          className="select select-bordered w-full"
        >
          {BREAST_SIZES.map((size) => (
            <option key={size.id} value={size.id}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hair */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Cheveux *</span>
        </label>

        {/* Hair color */}
        <div className="mb-3">
          <div className="text-sm text-gray-400 mb-2">Couleur:</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {HAIR_COLORS.map((hair) => (
              <button
                key={hair.id}
                type="button"
                onClick={() => onChange({ hair_color: hair.id })}
                className={`btn btn-sm ${
                  data.hair_color === hair.id ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: hair.color }}
                />
                {hair.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hair length */}
        <div>
          <div className="text-sm text-gray-400 mb-2">Longueur:</div>
          <div className="grid grid-cols-3 gap-3">
            {HAIR_LENGTHS.map((length) => (
              <button
                key={length.id}
                type="button"
                onClick={() => onChange({ hair_length: length.id })}
                className={`btn ${
                  data.hair_length === length.id ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <span className="mr-2">{length.emoji}</span>
                {length.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Eye Color */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-bold">Yeux *</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {EYE_COLORS.map((eye) => (
            <button
              key={eye.id}
              type="button"
              onClick={() => onChange({ eye_color: eye.id })}
              className={`btn ${
                data.eye_color === eye.id ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: eye.color }}
              />
              {eye.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-ghost flex-1">
          ← Retour
        </button>
        <button type="button" onClick={onNext} className="btn btn-primary flex-1">
          Suivant →
        </button>
      </div>
    </div>
  );
}
