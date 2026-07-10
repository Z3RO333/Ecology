import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getRemessaKPIs, getRemessas } from '@/lib/bag-remessas';
import { REMESSA_STATUS_LABELS } from '@/types/bags';
import type { RemessaKPIData, BagRemessa } from '@/types/bags';
import Link from 'next/link';

function KPICards({ kpis }: { kpis: RemessaKPIData }) {
  const cards = [
    { label: 'Ida - Em Transito', value: kpis.em_transito_ida, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Volta - Em Transito', value: kpis.em_transito_volta, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Concluidas', value: kpis.concluidas, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Com Divergencia', value: kpis.com_divergencia, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Bags Enviadas', value: kpis.bags_enviadas, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Bags Perdidas', value: kpis.bags_perdidas, color: kpis.bags_perdidas > 0 ? 'text-red-600' : 'text-gray-400', bg: kpis.bags_perdidas > 0 ? 'bg-red-50' : 'bg-gray-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ label, value, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl border border-gray-100 p-4`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineStep({ done, active, color, label, detail }: {
  done: boolean; active: boolean; color: string; label: string; detail: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <div className={`w-3.5 h-3.5 rounded-full border-2 ${
          done ? `bg-${color}-500 border-${color}-300` :
          active ? `bg-${color}-400 border-${color}-200 animate-pulse` :
          'bg-gray-200 border-gray-300'
        }`} style={done ? { backgroundColor: color === 'orange' ? '#f97316' : color === 'green' ? '#22c55e' : color === 'purple' ? '#a855f7' : '#14b8a6' } : active ? { backgroundColor: color === 'orange' ? '#fb923c' : color === 'green' ? '#4ade80' : color === 'purple' ? '#c084fc' : '#2dd4bf' } : {}} />
        <div className="w-0.5 h-6 bg-gray-200" />
      </div>
      <div className="pb-1">
        <p className={`text-sm font-semibold ${done || active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function RemessaCard({ r }: { r: BagRemessa }) {
  const statusOrder = ['ida_em_transito', 'ida_recebida', 'ida_divergencia', 'volta_em_transito', 'volta_recebida', 'volta_divergencia', 'concluida'];
  const idx = statusOrder.indexOf(r.status);
  const idaRecebida = idx >= 1;
  const voltaEnviada = idx >= 3;
  const voltaRecebida = idx >= 4 || r.status === 'concluida';

  const perdidasIda = r.quantidade_recebida !== null ? r.quantidade_enviada - r.quantidade_recebida : null;
  const perdidasVolta = r.qty_volta_recebida !== null && r.qty_volta_enviada !== null ? r.qty_volta_enviada - r.qty_volta_recebida : null;

  const isConcluida = r.status === 'concluida';
  const hasDivergencia = r.status.includes('divergencia');
  const borderColor = isConcluida ? 'border-green-200' : hasDivergencia ? 'border-red-200' : 'border-yellow-200';
  const bgColor = isConcluida ? 'bg-green-50' : hasDivergencia ? 'bg-red-50' : 'bg-yellow-50';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-gray-900 text-lg">{r.quantidade_enviada} bags</p>
          <p className="text-sm text-gray-600">{r.origem_nome} &rarr; {r.destino_nome}</p>
          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isConcluida ? 'bg-green-200 text-green-900' :
            hasDivergencia ? 'bg-red-200 text-red-900' :
            r.status.includes('volta') ? 'bg-purple-200 text-purple-900' :
            'bg-yellow-200 text-yellow-900'
          }`}>{REMESSA_STATUS_LABELS[r.status]}</span>
        </div>
        {perdidasIda !== null && perdidasIda > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">-{perdidasIda} ida</span>
        )}
        {perdidasVolta !== null && perdidasVolta > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full ml-1">-{perdidasVolta} volta</span>
        )}
      </div>

      {/* 4-step timeline */}
      <div className="ml-1">
        <TimelineStep done={true} active={false} color="orange"
          label={`Enviado de ${r.origem_nome}`}
          detail={`${new Date(r.enviado_em).toLocaleString('pt-BR')} · por ${r.enviado_por}`} />

        <TimelineStep done={idaRecebida} active={r.status === 'ida_em_transito'} color="green"
          label={idaRecebida ? `Recebido em ${r.destino_nome} — ${r.quantidade_recebida} bags` : `Aguardando recebimento em ${r.destino_nome}`}
          detail={idaRecebida && r.recebido_em ? `${new Date(r.recebido_em).toLocaleString('pt-BR')} · por ${r.recebido_por}` : 'Pendente'} />

        <TimelineStep done={voltaEnviada} active={idaRecebida && !voltaEnviada} color="purple"
          label={voltaEnviada ? `Devolvido de ${r.destino_nome} — ${r.qty_volta_enviada} bags` : `Aguardando devolução de ${r.destino_nome}`}
          detail={voltaEnviada && r.volta_enviado_em ? `${new Date(r.volta_enviado_em).toLocaleString('pt-BR')} · por ${r.volta_enviado_por}` : 'Pendente'} />

        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className={`w-3.5 h-3.5 rounded-full border-2 ${
              voltaRecebida ? 'border-teal-300' : voltaEnviada ? 'border-teal-200 animate-pulse' : 'bg-gray-200 border-gray-300'
            }`} style={voltaRecebida ? { backgroundColor: '#14b8a6' } : voltaEnviada ? { backgroundColor: '#2dd4bf' } : {}} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${voltaRecebida ? 'text-gray-800' : 'text-gray-400'}`}>
              {voltaRecebida ? `Recebido de volta em ${r.origem_nome} — ${r.qty_volta_recebida} bags` : `Aguardando recebimento de volta em ${r.origem_nome}`}
            </p>
            <p className="text-xs text-gray-500">
              {voltaRecebida && r.volta_recebido_em ? `${new Date(r.volta_recebido_em).toLocaleString('pt-BR')} · por ${r.volta_recebido_por}` : 'Pendente'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function BagsContent() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'manager';

  const [kpis, remessas] = await Promise.all([
    getRemessaKPIs(),
    getRemessas({ limit: 30 }),
  ]);

  return (
    <div className="space-y-6">
      <KPICards kpis={kpis} />

      <div className={`grid gap-4 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Link href="/tablet/bags/enviar" className="flex items-center gap-2 bg-orange-500 text-white rounded-xl p-4 font-bold hover:bg-orange-600 transition-colors text-sm">
          <span className="text-xl">&#128230;</span>1. Enviar
        </Link>
        {isAdmin && (
          <Link href="/tablet/bags/receber" className="flex items-center gap-2 bg-green-500 text-white rounded-xl p-4 font-bold hover:bg-green-600 transition-colors text-sm">
            <span className="text-xl">&#9989;</span>2. Receber
          </Link>
        )}
        {isAdmin && (
          <Link href="/tablet/bags/devolver" className="flex items-center gap-2 bg-purple-500 text-white rounded-xl p-4 font-bold hover:bg-purple-600 transition-colors text-sm">
            <span className="text-xl">&#128257;</span>3. Devolver
          </Link>
        )}
        <Link href="/tablet/bags/receber-volta" className="flex items-center gap-2 bg-teal-500 text-white rounded-xl p-4 font-bold hover:bg-teal-600 transition-colors text-sm">
          <span className="text-xl">&#127919;</span>4. Receber Volta
        </Link>
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 mb-4">Historico de Remessas</h2>
        {remessas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Nenhuma remessa registrada.</div>
        ) : (
          <div className="space-y-4">
            {remessas.map((r) => <RemessaCard key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardBagsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Painel de Bags</h1>
      <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Carregando dados...</div>}>
        <BagsContent />
      </Suspense>
    </div>
  );
}
