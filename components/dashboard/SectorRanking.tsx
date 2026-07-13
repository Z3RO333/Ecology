import { Trophy } from 'lucide-react';
import type { SectorRankingItem } from '@/types';

interface Props { data: SectorRankingItem[]; }

export function SectorRanking({ data }: Props) {
  const max = data[0]?.total_weight_kg ?? 1;

  return (
    <section className="app-card rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Ranking de setores</h2>
          <p className="mt-1 text-xs text-slate-400">Quem mais contribuiu no período selecionado</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.sector} className="group flex items-center gap-3 sm:gap-4">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
              index === 0 ? 'bg-amber-100 text-amber-700' :
              index === 1 ? 'bg-slate-200 text-slate-600' :
              index === 2 ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {index + 1}º
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                <span className="truncate font-semibold text-slate-700 transition-colors group-hover:text-slate-950">{item.sector}</span>
                <span className="shrink-0 font-bold tabular-nums text-slate-600">{item.total_weight_kg.toFixed(1)} kg</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-[width] duration-700 ease-out"
                  style={{ width: `${(item.total_weight_kg / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="rounded-xl bg-slate-50 py-10 text-center">
            <Trophy className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">Sem dados no período</p>
          </div>
        )}
      </div>
    </section>
  );
}
