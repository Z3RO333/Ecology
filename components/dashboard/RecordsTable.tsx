import type { RecyclingRecord } from '@/types';
import { formatRecordDateTime, formatWeight } from '@/lib/format';

interface Props {
  records: RecyclingRecord[];
}

export function RecordsTable({ records }: Props) {
  const headers = ['Data/Hora', 'Material', 'Peso (kg)', 'Setor', 'Responsável', 'Obs.'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatRecordDateTime(r.recorded_at)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {r.material_type}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900 font-medium">{formatWeight(Number(r.weight_kg))}</td>
              <td className="px-4 py-3 text-gray-600">{r.sector}</td>
              <td className="px-4 py-3 text-gray-600">{r.responsible_name}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{r.notes ?? '—'}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
