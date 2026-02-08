'use client';

/**
 * Basic Info Step - Name and age
 */

export function BasicInfoStep({
  data,
  onChange,
  onNext,
}: {
  data: any;
  onChange: (updates: any) => void;
  onNext: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.name && data.age >= 18 && data.age <= 50) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-8">
      <h2 className="text-2xl font-bold mb-6">Informations de base</h2>

      {/* Name */}
      <div className="form-control mb-6">
        <label className="label">
          <span className="label-text">Nom *</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Emma, Sofia, Léa..."
          className="input input-bordered"
          required
          minLength={2}
          maxLength={100}
        />
        <label className="label">
          <span className="label-text-alt text-gray-500">
            Le nom de ta girlfriend
          </span>
        </label>
      </div>

      {/* Age */}
      <div className="form-control mb-6">
        <label className="label">
          <span className="label-text">Âge *</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="18"
            max="50"
            value={data.age}
            onChange={(e) => onChange({ age: parseInt(e.target.value) })}
            className="range range-primary flex-1"
          />
          <div className="w-16 text-center">
            <div className="text-3xl font-bold">{data.age}</div>
            <div className="text-xs text-gray-500">ans</div>
          </div>
        </div>
        <label className="label">
          <span className="label-text-alt text-gray-500">
            18 à 50 ans
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={!data.name || data.age < 18 || data.age > 50}
      >
        Suivant →
      </button>
    </form>
  );
}
