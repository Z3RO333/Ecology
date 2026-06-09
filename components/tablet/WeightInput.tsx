'use client';

const QUICK_ADD = [0.1, 0.5, 1.0, 5.0];

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function WeightInput({ value, onChange }: Props) {
  const display = value.toFixed(3).replace('.', ',');

  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">3. Peso (kg) *</p>
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 text-center">
        <input
          type="number"
          name="weight_kg"
          aria-label="Peso em quilogramas"
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0,000"
          step="0.001"
          min="0"
          className="w-full text-6xl font-bold text-center text-gray-900 outline-none"
        />
        <p className="text-gray-400 text-base mt-1">{display} kg</p>
      </div>
      <div className="grid grid-cols-4 gap-3 mt-3">
        {QUICK_ADD.map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => onChange(Math.round((value + inc) * 1000) / 1000)}
            className="bg-gray-100 active:bg-green-100 text-gray-700 text-xl font-semibold py-5 rounded-xl transition-colors"
          >
            +{inc.toString().replace('.', ',')}
          </button>
        ))}
      </div>
    </div>
  );
}
