'use client';

import { MATERIALS } from '@/lib/constants';
import type { Material } from '@/types';

interface Props {
  value: Material | null;
  onChange: (m: Material) => void;
  materials?: readonly Material[];
}

export function MaterialSelector({ value, onChange, materials = MATERIALS }: Props) {
  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">1. Tipo de Material *</p>
      <div className="grid grid-cols-2 gap-4">
        {materials.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`py-7 rounded-2xl text-xl font-semibold transition-all ${
              value === m
                ? 'bg-green-600 text-white shadow-md ring-2 ring-green-300'
                : 'bg-white border-2 border-gray-200 text-gray-700 active:border-green-400'
            }`}
          >
            {value === m ? '✓ ' : ''}{m}
          </button>
        ))}
      </div>
    </div>
  );
}
