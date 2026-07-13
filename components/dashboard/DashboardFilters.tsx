'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { SECTORS, MATERIALS } from '@/lib/constants';
import type { PeriodView } from '@/types';
import { CalendarDays, LoaderCircle, RotateCcw, SlidersHorizontal } from 'lucide-react';

export function DashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const reset = () => startTransition(() => router.replace(pathname));
  const hasFilters = ['dateFrom', 'dateTo', 'sector', 'material', 'view'].some((key) => searchParams.has(key));

  return (
    <div className={`app-surface rounded-2xl p-3 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-700 xl:mr-1">
          {isPending
            ? <LoaderCircle className="h-4 w-4 animate-spin text-emerald-600" />
            : <SlidersHorizontal className="h-4 w-4 text-emerald-600" />}
          Filtros
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Data inicial</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={searchParams.get('dateFrom') ?? ''}
              onChange={(event) => update('dateFrom', event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Data final</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={searchParams.get('dateTo') ?? ''}
              onChange={(event) => update('dateTo', event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <select
            aria-label="Filtrar por setor"
            value={searchParams.get('sector') ?? ''}
            onChange={(event) => update('sector', event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:bg-white"
          >
            <option value="">Todos os setores</option>
            {SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </select>
          <select
            aria-label="Filtrar por material"
            value={searchParams.get('material') ?? ''}
            onChange={(event) => update('material', event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 focus:bg-white"
          >
            <option value="">Todos os materiais</option>
            {MATERIALS.map((material) => <option key={material} value={material}>{material}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 xl:flex-none">
            {(['daily', 'weekly', 'monthly'] as PeriodView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => update('view', view)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all xl:flex-none ${
                  (searchParams.get('view') ?? 'weekly') === view
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {{ daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }[view]}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Limpar filtros"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
