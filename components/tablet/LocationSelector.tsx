'use client';

import type { Local } from '@/types/bags';

interface LocationSelectorProps {
  locais: Local[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
}

export function LocationSelector({ locais, value, onChange, name = 'local_id' }: LocationSelectorProps) {
  return (
    <div>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 text-xl appearance-none focus:border-green-500 outline-none"
      >
        <option value="">Selecionar local...</option>
        {locais.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome} ({l.tipo})
          </option>
        ))}
      </select>
    </div>
  );
}
