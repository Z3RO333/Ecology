'use client';

import { SECTORS } from '@/lib/constants';
import type { Sector } from '@/types';

interface Props {
  value: Sector | '';
  onChange: (s: Sector) => void;
}

export function SectorDropdown({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-bold text-green-800 mb-2">2. Setor *</p>
      <select
        name="sector"
        value={value}
        onChange={(e) => onChange(e.target.value as Sector)}
        className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-gray-700 text-base focus:border-green-500 outline-none appearance-none"
      >
        <option value="">Selecione o setor...</option>
        {SECTORS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
