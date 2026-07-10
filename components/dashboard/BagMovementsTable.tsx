import type { BagMovimentacao } from '@/types/bags';
import { BAG_ACAO_LABELS } from '@/types/bags';

interface BagMovementsTableProps {
  movimentacoes: BagMovimentacao[];
}

export function BagMovementsTable({ movimentacoes }: BagMovementsTableProps) {
  if (!movimentacoes.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nenhuma movimentacao registrada.</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Bag</th>
            <th className="px-4 py-3 font-medium">Acao</th>
            <th className="px-4 py-3 font-medium">Destino</th>
            <th className="px-4 py-3 font-medium">Responsavel</th>
            <th className="px-4 py-3 font-medium">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movimentacoes.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{m.bag_codigo}</td>
              <td className="px-4 py-3">{BAG_ACAO_LABELS[m.acao]}</td>
              <td className="px-4 py-3 text-gray-600">{m.local_destino_nome ?? '—'}</td>
              <td className="px-4 py-3">{m.usuario_nome}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(m.created_at).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
