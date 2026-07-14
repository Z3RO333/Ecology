import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { canAccessUnit, hasPermission } from '@/lib/access-control';
import { getLocalById } from '@/lib/locations';
import { getBagUnitSummaries, getRemessas } from '@/lib/bag-remessas';
import { getBags, getMovimentacoes } from '@/lib/bags';
import { listInternalUsersByLocal } from '@/lib/internal-users';
import { BAG_ACAO_LABELS, BAG_STATUS_LABELS, REMESSA_STATUS_LABELS } from '@/types/bags';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  History,
  Mail,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Store,
  UserRound,
  Workflow,
} from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrador', manager: 'Gerente de Loja', operational: 'Operacional', viewer: 'Visualizador' } as const;

function Stat({ label, value, Icon, tone }: { label: string; value: string | number; Icon: typeof Store; tone: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div></div>;
}

export default async function UnitBagDetailsPage({ params }: PageProps<'/dashboard/bags/unidades/[id]'>) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) notFound();
  const { id } = await params;
  if (!canAccessUnit(session.user.role, session.user.localId, id)) notFound();

  const [local, summaries, remessas, bags, movements, users] = await Promise.all([
    getLocalById(id),
    getBagUnitSummaries(id),
    getRemessas({ local_id: id, limit: 100 }),
    getBags({ local_id: id, limit: 100 }),
    getMovimentacoes({ local_id: id, limit: 100 }),
    listInternalUsersByLocal(id),
  ]);
  if (!local) notFound();
  const summary = summaries[0] ?? { destinadas: 0, disponiveis: 0, em_uso: 0, devolvidas: 0, pendentes: 0, percentual_devolucao: 100, remessas_atrasadas: 0 };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/bags" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Voltar ao painel de bags</Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Store className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{local.tipo} {local.centro ? `· Centro ${local.centro}` : ''}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{local.nome}</h1><p className="mt-1 text-sm text-slate-500">Detalhes das bags, responsáveis e movimentações da unidade.</p></div></div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${summary.remessas_atrasadas > 0 ? 'bg-red-100 text-red-700' : summary.pendentes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{summary.remessas_atrasadas > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{summary.remessas_atrasadas > 0 ? `${summary.remessas_atrasadas} remessa(s) em atraso` : summary.pendentes > 0 ? 'Requer atenção' : 'Situação regular'}</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Destinadas" value={summary.destinadas} Icon={PackageOpen} tone="bg-blue-100 text-blue-700" />
        <Stat label="Disponíveis" value={summary.disponiveis} Icon={PackageCheck} tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Em uso" value={summary.em_uso} Icon={Workflow} tone="bg-violet-100 text-violet-700" />
        <Stat label="Devolvidas" value={summary.devolvidas} Icon={RotateCcw} tone="bg-cyan-100 text-cyan-700" />
        <Stat label="Pendentes" value={summary.pendentes} Icon={Clock3} tone="bg-amber-100 text-amber-700" />
        <Stat label="Devolução" value={`${summary.percentual_devolucao}%`} Icon={CheckCircle2} tone="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-bold text-slate-900">Responsáveis vinculados</h2><p className="text-sm text-slate-500">Usuários associados a esta unidade.</p></div><div className="space-y-3">{users.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><UserRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{user.display_name ?? 'Sem nome'}</p><p className="flex items-center gap-1 truncate text-xs text-slate-500"><Mail className="h-3 w-3" />{user.email}</p></div><div className="text-right"><p className="text-xs font-semibold text-blue-700">{ROLE_LABELS[user.role]}</p><p className={`text-[10px] font-bold ${user.active ? 'text-emerald-600' : 'text-red-600'}`}>{user.active ? 'Ativo' : 'Inativo'}</p></div></div>)}{!users.length && <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Nenhum responsável vinculado.</p>}</div></section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Bags atualmente na unidade</h2><p className="text-sm text-slate-500">Inventário individual e última atualização.</p></div><div className="max-h-80 overflow-auto"><table className="w-full min-w-[620px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Última movimentação</th></tr></thead><tbody className="divide-y divide-slate-100">{bags.map((bag) => <tr key={bag.id}><td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{bag.codigo}</td><td className="px-4 py-3 text-slate-700">{BAG_STATUS_LABELS[bag.status]}</td><td className="px-4 py-3 text-slate-500">{bag.setor_atual ?? '—'}</td><td className="px-4 py-3 text-xs text-slate-500">{bag.data_ultima_movimentacao ? new Date(bag.data_ultima_movimentacao).toLocaleString('pt-BR') : 'Sem registro'}</td></tr>)}{!bags.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma bag individual nesta unidade.</td></tr>}</tbody></table></div></section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><History className="h-4 w-4" /></span><div><h2 className="font-bold text-slate-900">Histórico de remessas</h2><p className="text-sm text-slate-500">Datas de envio, recebimento e devolução.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Trajeto</th><th className="px-4 py-3">Quantidade</th><th className="px-4 py-3">Envio</th><th className="px-4 py-3">Recebimento</th><th className="px-4 py-3">Devolução</th><th className="px-4 py-3">Retorno confirmado</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{remessas.map((remessa) => <tr key={remessa.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{remessa.origem_nome} → {remessa.destino_nome}</td><td className="px-4 py-3"><span className="font-bold text-slate-900">{remessa.quantidade_enviada}</span><span className="block text-xs text-slate-400">recebidas: {remessa.quantidade_recebida ?? '—'}</span></td><td className="px-4 py-3 text-xs text-slate-600">{new Date(remessa.enviado_em).toLocaleString('pt-BR')}<span className="block text-slate-400">{remessa.enviado_por}</span></td><td className="px-4 py-3 text-xs text-slate-600">{remessa.recebido_em ? new Date(remessa.recebido_em).toLocaleString('pt-BR') : 'Pendente'}{remessa.recebido_por && <span className="block text-slate-400">{remessa.recebido_por}</span>}</td><td className="px-4 py-3 text-xs text-slate-600">{remessa.volta_enviado_em ? new Date(remessa.volta_enviado_em).toLocaleString('pt-BR') : 'Pendente'}{remessa.volta_enviado_por && <span className="block text-slate-400">{remessa.volta_enviado_por} · {remessa.qty_volta_enviada} bags</span>}</td><td className="px-4 py-3 text-xs text-slate-600">{remessa.volta_recebido_em ? new Date(remessa.volta_recebido_em).toLocaleString('pt-BR') : 'Pendente'}{remessa.volta_recebido_por && <span className="block text-slate-400">{remessa.volta_recebido_por} · {remessa.qty_volta_recebida} bags</span>}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${remessa.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : remessa.status.includes('divergencia') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{REMESSA_STATUS_LABELS[remessa.status]}</span></td></tr>)}{!remessas.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Nenhuma remessa relacionada a esta unidade.</td></tr>}</tbody></table></div></section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Movimentações individuais</h2><p className="text-sm text-slate-500">Registro cronológico das bags que passaram pela unidade.</p></div><div className="max-h-[430px] overflow-auto"><table className="w-full min-w-[820px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Bag</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Origem → destino</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Observação</th></tr></thead><tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3 text-xs text-slate-500">{new Date(movement.created_at).toLocaleString('pt-BR')}</td><td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{movement.bag_codigo}</td><td className="px-4 py-3 font-semibold text-slate-700">{BAG_ACAO_LABELS[movement.acao]}</td><td className="px-4 py-3 text-slate-500">{movement.local_origem_nome ?? '—'} → {movement.local_destino_nome ?? '—'}</td><td className="px-4 py-3 text-slate-700">{movement.usuario_nome}</td><td className="max-w-xs truncate px-4 py-3 text-slate-500">{movement.observacao ?? '—'}</td></tr>)}{!movements.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Nenhuma movimentação individual registrada.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
