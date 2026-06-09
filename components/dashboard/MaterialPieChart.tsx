'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MATERIAL_COLORS } from '@/lib/constants';
import type { MaterialBreakdown, Material } from '@/types';

interface Props { data: MaterialBreakdown[]; }

export function MaterialPieChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Materiais Reciclados</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="total_weight_kg" nameKey="material_type" cx="50%" cy="50%" outerRadius={80}>
            {data.map((entry) => (
              <Cell
                key={entry.material_type}
                fill={MATERIAL_COLORS[entry.material_type as Material] ?? '#d1d5db'}
              />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)} kg` : `${String(v ?? '')} kg`]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
