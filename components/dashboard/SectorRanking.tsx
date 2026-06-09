import type { SectorRankingItem } from '@/types';

interface Props { data: SectorRankingItem[]; }

const MEDALS = ['🥇', '🥈', '🥉'];

export function SectorRanking({ data }: Props) {
  const max = data[0]?.total_weight_kg ?? 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">🏆 Ranking de Setores</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.sector} className="flex items-center gap-3">
            <span className="w-5 text-sm">{MEDALS[i] ?? ''}</span>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{item.sector}</span>
                <span className="text-gray-500">{item.total_weight_kg.toFixed(1)} kg</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(item.total_weight_kg / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-gray-400 text-sm text-center">Sem dados no período</p>}
      </div>
    </div>
  );
}
