'use client';

import { SECTORS } from '@/lib/constants';
import type { Sector } from '@/types';

interface Props {
  value: Sector | '';
  onChange: (s: Sector) => void;
  sectors?: readonly Sector[];
}

export function SectorDropdown({ value, onChange, sectors = SECTORS }: Props) {
  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">2. Setor *</p>
      <div className="relative">
        <select
          name="sector"
          aria-label="Setor"
          value={value}
          onChange={(e) => onChange(e.target.value as Sector)}
          className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 pr-12 text-gray-700 text-xl focus:border-green-500 outline-none appearance-none"
        >
          <option value="">Selecione o setor...</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-green-600 text-lg">▼</span>
      </div>
    </div>
  );
}
