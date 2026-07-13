'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Recycle } from 'lucide-react';
import { MATERIAL_COLORS } from '@/lib/constants';
import type { MaterialBreakdown, Material } from '@/types';

interface Props { data: MaterialBreakdown[]; }

export function MaterialPieChart({ data }: Props) {
  const total = data.reduce((sum, item) => sum + Number(item.total_weight_kg), 0);

  return (
    <section className="app-card min-w-0 rounded-2xl p-5 sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Materiais reciclados</h2>
          <p className="mt-1 text-xs text-slate-400">Participação por tipo de material</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Recycle className="h-4 w-4" />
        </span>
      </div>
      {data.length > 0 ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={273}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total_weight_kg"
                nameKey="material_type"
                cx="50%"
                cy="45%"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={3}
                cornerRadius={5}
                stroke="none"
                animationDuration={750}
              >
                {data.map((entry) => (
                  <Cell key={entry.material_type} fill={MATERIAL_COLORS[entry.material_type as Material] ?? '#cbd5e1'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#dfe7e1', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)', fontSize: 12 }}
                formatter={(value) => [typeof value === 'number' ? `${value.toFixed(2)} kg` : `${String(value ?? '')} kg`, 'Peso']}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-xl font-bold tracking-tight text-slate-800">{total.toFixed(1)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">kg total</p>
          </div>
        </div>
      ) : (
        <div className="flex h-[273px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
          <Recycle className="h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">Sem materiais no período</p>
        </div>
      )}
    </section>
  );
}
