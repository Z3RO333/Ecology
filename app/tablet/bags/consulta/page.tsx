import { getBagByCodigo, getMovimentacoes } from '@/lib/bags';
import { BAG_STATUS_LABELS, BAG_ACAO_LABELS } from '@/types/bags';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ codigo?: string }>;
}

export default async function ConsultaBagPage({ searchParams }: PageProps) {
  const { codigo } = await searchParams;

  const bag = codigo ? await getBagByCodigo(codigo) : null;
  const movimentacoes = bag ? await getMovimentacoes({ bag_id: bag.id, limit: 20 }) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Consultar Bag</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <form className="flex gap-3">
          <input
            name="codigo"
            type="text"
            defaultValue={codigo ?? ''}
            placeholder="BAG-000001"
            className="flex-1 bg-white border-2 border-gray-200 rounded-2xl p-5 text-xl font-mono tracking-wider outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="bg-slate-600 text-white rounded-2xl px-8 text-xl font-bold"
          >
            Buscar
          </button>
        </form>

        {codigo && !bag && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-5 text-lg text-center">
            Bag &quot;{codigo}&quot; nao encontrada.
          </div>
        )}

        {bag && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold font-mono">{bag.codigo}</span>
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {BAG_STATUS_LABELS[bag.status]}
              </span>
            </div>
            {bag.local_atual_nome && (
              <p className="text-lg text-gray-600">
                Local: <strong>{bag.local_atual_nome}</strong>
                {bag.setor_atual && ` — ${bag.setor_atual}`}
              </p>
            )}
          </div>
        )}

        {movimentacoes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Historico</h2>
            {movimentacoes.map((m) => (
              <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {BAG_ACAO_LABELS[m.acao]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {m.usuario_nome}
                  {m.local_destino_nome && ` → ${m.local_destino_nome}`}
                  {m.setor && ` (${m.setor})`}
                </p>
                {m.observacao && (
                  <p className="text-sm text-gray-400 mt-1">{m.observacao}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/tablet"
          className="block text-center text-blue-600 underline text-lg mt-4"
        >
          Voltar ao menu
        </Link>
      </div>
    </div>
  );
}
