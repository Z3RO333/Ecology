'use client';

import { MATERIALS } from '@/lib/constants';
import type { Material } from '@/types';

interface Props {
  value: Material | null;
  onChange: (m: Material) => void;
}

export function MaterialSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-bold text-green-800 mb-2">1. Tipo de Material *</p>
      <div className="grid grid-cols-2 gap-3">
        {MATERIALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`py-4 rounded-xl text-sm font-semibold transition-all ${
              value === m
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-400'
            }`}
          >
            {value === m ? '✓ ' : ''}{m}
          </button>
        ))}
      </div>
    </div>
  );
}
