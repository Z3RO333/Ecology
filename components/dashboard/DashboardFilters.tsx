'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SECTORS, MATERIALS } from '@/lib/constants';
import type { PeriodView } from '@/types';

export function DashboardFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="date"
        defaultValue={sp.get('dateFrom') ?? ''}
        onChange={(e) => update('dateFrom', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      />
      <span className="text-gray-400 text-sm">até</span>
      <input
        type="date"
        defaultValue={sp.get('dateTo') ?? ''}
        onChange={(e) => update('dateTo', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      />
      <select
        defaultValue={sp.get('sector') ?? ''}
        onChange={(e) => update('sector', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      >
        <option value="">Todos os setores</option>
        {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        defaultValue={sp.get('material') ?? ''}
        onChange={(e) => update('material', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      >
        <option value="">Todos os materiais</option>
        {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="flex border border-gray-200 rounded-lg overflow-hidden">
        {(['daily', 'weekly', 'monthly'] as PeriodView[]).map((v) => (
          <button
            key={v}
            onClick={() => update('view', v)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              (sp.get('view') ?? 'weekly') === v
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {{ daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
