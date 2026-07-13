import type { KPIData } from '@/types';
import { Activity, Recycle, Weight } from 'lucide-react';

interface Props { kpis: KPIData; }

export function KPICards({ kpis }: Props) {
  const cards = [
    { label: 'Total reciclado', value: `${kpis.total_weight_kg.toFixed(1)} kg`, hint: 'no período selecionado', color: 'text-emerald-700', iconColor: 'bg-emerald-100 text-emerald-700', Icon: Weight },
    { label: 'Registros', value: String(kpis.total_records), hint: 'lançamentos realizados', color: 'text-sky-700', iconColor: 'bg-sky-100 text-sky-700', Icon: Recycle },
    { label: 'Setores ativos', value: String(kpis.active_sectors), hint: 'áreas participantes', color: 'text-violet-700', iconColor: 'bg-violet-100 text-violet-700', Icon: Activity },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, hint, color, iconColor, Icon }) => (
        <div key={label} className="app-card app-card-interactive relative overflow-hidden rounded-2xl p-5 sm:p-6">
          <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-50/70 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className={`mt-2 truncate text-[28px] font-bold tracking-[-0.035em] sm:text-[32px] ${color}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
