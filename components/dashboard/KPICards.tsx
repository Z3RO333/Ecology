import type { KPIData } from '@/types';

interface Props { kpis: KPIData; }

export function KPICards({ kpis }: Props) {
  const cards = [
    { label: 'Total reciclado', value: `${kpis.total_weight_kg.toFixed(1)} kg`, color: 'text-green-600' },
    { label: 'Registros', value: String(kpis.total_records), color: 'text-blue-600' },
    { label: 'Setores ativos', value: String(kpis.active_sectors), color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-gray-500 text-sm mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
