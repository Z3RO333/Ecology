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
      <p className="text-sm font-bold text-green-800 mb-2">3. Peso (kg) *</p>
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 text-center">
        <input
          type="number"
          name="weight_kg"
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0,000"
          step="0.001"
          min="0"
          className="w-full text-3xl font-bold text-center text-gray-900 outline-none"
        />
        <p className="text-gray-400 text-xs mt-1">{display} kg</p>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {QUICK_ADD.map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => onChange(Math.round((value + inc) * 1000) / 1000)}
            className="bg-gray-100 hover:bg-green-100 text-gray-700 text-sm py-2 rounded-lg transition-colors"
          >
            +{inc.toString().replace('.', ',')}
          </button>
        ))}
      </div>
    </div>
  );
}
