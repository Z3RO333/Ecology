'use client';

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { PeriodData } from '@/types';

interface Props { data: PeriodData[]; }

export function WeeklyBarChart({ data }: Props) {
  return (
    <section className="app-card min-w-0 rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Evolução do volume</h2>
          <p className="mt-1 text-xs text-slate-400">Peso reciclado por período, em quilogramas</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <BarChart3 className="h-4 w-4" />
        </span>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="recyclingBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#6ee7a0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf1ee" strokeDasharray="3 3" />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              cursor={{ fill: 'rgba(22, 163, 74, 0.05)', radius: 8 }}
              contentStyle={{ borderRadius: 12, borderColor: '#dfe7e1', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)', fontSize: 12 }}
              formatter={(value) => [typeof value === 'number' ? `${value.toFixed(2)} kg` : `${String(value ?? '')} kg`, 'Peso']}
            />
            <Bar dataKey="total_weight_kg" fill="url(#recyclingBars)" radius={[7, 7, 2, 2]} maxBarSize={42} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[250px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
          <BarChart3 className="h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">Sem dados para exibir</p>
          <p className="mt-1 text-xs text-slate-400">Tente ajustar os filtros acima.</p>
        </div>
      )}
    </section>
  );
}
