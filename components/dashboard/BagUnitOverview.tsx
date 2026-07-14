import Link from 'next/link';
import type { BagUnitSummary } from '@/types/bags';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Store,
  Workflow,
} from 'lucide-react';

const SITUATION = {
  regular: { label: 'Regular', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', row: '', Icon: CheckCircle2 },
  atencao: { label: 'Atenção', badge: 'bg-amber-50 text-amber-700 ring-amber-200', row: 'bg-amber-50/35', Icon: AlertTriangle },
  critica: { label: 'Crítica', badge: 'bg-red-50 text-red-700 ring-red-200', row: 'bg-red-50/45', Icon: AlertTriangle },
} as const;

function MetricCard({ label, value, helper, tone, Icon }: { label: string; value: string | number; helper: string; tone: string; Icon: typeof Store }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

export function BagUnitOverview({ units, scoped = false }: { units: BagUnitSummary[]; scoped?: boolean }) {
  const totals = units.reduce((acc, unit) => ({
    destinadas: acc.destinadas + unit.destinadas,
    disponiveis: acc.disponiveis + unit.disponiveis,
    emUso: acc.emUso + unit.em_uso,
    devolvidas: acc.devolvidas + unit.devolvidas,
    pendentes: acc.pendentes + unit.pendentes,
  }), { destinadas: 0, disponiveis: 0, emUso: 0, devolvidas: 0, pendentes: 0 });
  const returnRate = totals.destinadas ? Math.min(Math.round((totals.devolvidas / totals.destinadas) * 100), 100) : 100;
  const chartUnits = [...units].sort((a, b) => b.pendentes - a.pendentes).slice(0, 8);

  if (!units.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><PackageOpen className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-bold text-slate-800">Nenhuma movimentação por unidade</h2><p className="mt-1 text-sm text-slate-500">Os indicadores aparecerão após o primeiro envio de bags.</p></div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Visão operacional</p><h2 className="mt-1 text-xl font-bold text-slate-950">Controle de bags por unidade</h2><p className="mt-1 text-sm text-slate-500">{scoped ? 'Indicadores da unidade vinculada ao seu perfil.' : 'Distribuição, devoluções e pendências de todas as unidades.'}</p></div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{units.length} {units.length === 1 ? 'unidade monitorada' : 'unidades monitoradas'}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Destinadas" value={totals.destinadas} helper="Total enviado" tone="bg-blue-100 text-blue-700" Icon={PackageOpen} />
        <MetricCard label="Disponíveis" value={totals.disponiveis} helper="Prontas para uso" tone="bg-emerald-100 text-emerald-700" Icon={PackageCheck} />
        <MetricCard label="Em uso" value={totals.emUso} helper="Em operação/trânsito" tone="bg-violet-100 text-violet-700" Icon={Workflow} />
        <MetricCard label="Devolvidas" value={totals.devolvidas} helper="Retorno confirmado" tone="bg-cyan-100 text-cyan-700" Icon={RotateCcw} />
        <MetricCard label="Pendentes" value={totals.pendentes} helper="Aguardando retorno" tone={totals.pendentes ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} Icon={Clock3} />
        <MetricCard label="Devolução" value={`${returnRate}%`} helper="Taxa consolidada" tone={returnRate >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} Icon={CheckCircle2} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5"><h3 className="font-bold text-slate-900">Pendências em destaque</h3><p className="text-sm text-slate-500">Unidades com maior volume a devolver.</p></div>
          <div className="space-y-4">
            {chartUnits.map((unit) => {
              const width = unit.destinadas ? Math.max((unit.devolvidas / unit.destinadas) * 100, 2) : 100;
              return <Link key={unit.id} href={`/dashboard/bags/unidades/${unit.id}`} className="group block"><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700 group-hover:text-blue-700">{unit.nome}</span><span className={unit.pendentes ? 'font-bold text-amber-700' : 'font-semibold text-emerald-700'}>{unit.pendentes} pendentes</span></div><div className="h-2.5 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(width, 100)}%` }} /></div><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{unit.devolvidas} devolvidas</span><span>{unit.percentual_devolucao}%</span></div></Link>;
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h3 className="font-bold text-slate-900">Situação das unidades</h3><p className="text-sm text-slate-500">Clique em uma unidade para consultar responsáveis e histórico completo.</p></div>
          <div className="max-h-[430px] overflow-auto">
            <table className="w-full min-w-[930px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th className="px-5 py-3">Unidade</th><th className="px-3 py-3 text-center">Destinadas</th><th className="px-3 py-3 text-center">Disponíveis</th><th className="px-3 py-3 text-center">Em uso</th><th className="px-3 py-3 text-center">Devolvidas</th><th className="px-3 py-3 text-center">Pendentes</th><th className="px-3 py-3">Devolução</th><th className="px-3 py-3">Última movimentação</th><th className="px-5 py-3">Situação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => {
                  const situation = SITUATION[unit.situacao];
                  const SituationIcon = situation.Icon;
                  return <tr key={unit.id} className={`${situation.row} transition hover:bg-blue-50/50`}><td className="px-5 py-3.5"><Link href={`/dashboard/bags/unidades/${unit.id}`} className="group flex items-center gap-2.5 font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Store className="h-4 w-4" /></span><span><span className="block group-hover:text-blue-700">{unit.nome}</span>{unit.centro && <span className="block text-[10px] font-medium text-slate-400">Centro {unit.centro}</span>}</span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-blue-600" /></Link></td><td className="px-3 py-3.5 text-center font-semibold text-slate-700">{unit.destinadas}</td><td className="px-3 py-3.5 text-center text-emerald-700">{unit.disponiveis}</td><td className="px-3 py-3.5 text-center text-violet-700">{unit.em_uso}</td><td className="px-3 py-3.5 text-center font-semibold text-cyan-700">{unit.devolvidas}</td><td className={`px-3 py-3.5 text-center font-bold ${unit.pendentes ? 'text-red-600' : 'text-emerald-700'}`}>{unit.pendentes}</td><td className="px-3 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${unit.percentual_devolucao >= 90 ? 'bg-emerald-500' : unit.percentual_devolucao >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${unit.percentual_devolucao}%` }} /></div><span className="text-xs font-bold text-slate-700">{unit.percentual_devolucao}%</span></div></td><td className="px-3 py-3.5 text-xs text-slate-500">{unit.ultima_movimentacao ? new Date(unit.ultima_movimentacao).toLocaleString('pt-BR') : 'Sem registro'}</td><td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${situation.badge}`}><SituationIcon className="h-3.5 w-3.5" />{situation.label}</span>{unit.remessas_atrasadas > 0 && <span className="mt-1 block text-[10px] font-semibold text-red-600">{unit.remessas_atrasadas} em atraso</span>}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
