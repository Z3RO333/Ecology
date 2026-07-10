import type { BagKPIData } from '@/types/bags';

interface BagKPICardsProps {
  kpis: BagKPIData;
}

const cards = [
  { key: 'total_bags', label: 'Total de Bags', color: 'text-blue-600' },
  { key: 'em_circulacao', label: 'Em Circulacao', color: 'text-purple-600' },
  { key: 'disponiveis', label: 'Disponiveis', color: 'text-green-600' },
  { key: 'extraviadas', label: 'Extraviadas', color: 'text-orange-600' },
  { key: 'danificadas', label: 'Danificadas', color: 'text-red-600' },
] as const;

export function BagKPICards({ kpis }: BagKPICardsProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {kpis[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
