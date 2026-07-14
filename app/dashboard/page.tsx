import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { KPICards } from '@/components/dashboard/KPICards';
import { WeeklyBarChart } from '@/components/dashboard/WeeklyBarChart';
import { MaterialPieChart } from '@/components/dashboard/MaterialPieChart';
import { SectorRanking } from '@/components/dashboard/SectorRanking';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { getKPIs, getByPeriod, getByMaterial, getBySector } from '@/lib/databricks';
import { getBagUnitSummaries } from '@/lib/bag-remessas';
import { BagUnitOverview } from '@/components/dashboard/BagUnitOverview';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import type { PeriodView } from '@/types';
import { BarChart3, Sparkles } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    sector?: string;
    material?: string;
    view?: string;
  }>;
}

async function DashboardContent({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dateFrom = sp.dateFrom ?? DEFAULT_DATE_FROM();
  const dateTo = sp.dateTo ?? DEFAULT_DATE_TO();
  const sectors = sp.sector ? [sp.sector] : [];
  const materials = sp.material ? [sp.material] : [];
  const view = (sp.view ?? 'weekly') as PeriodView;

  const [kpis, byPeriod, byMaterial, bySector, bagUnits] = await Promise.all([
    getKPIs(dateFrom, dateTo, sectors, materials),
    getByPeriod(dateFrom, dateTo, view, sectors, materials),
    getByMaterial(dateFrom, dateTo, sectors, materials),
    getBySector(dateFrom, dateTo, sectors, materials),
    getBagUnitSummaries(),
  ]);

  return (
    <div className="space-y-5">
      <KPICards kpis={kpis} />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <WeeklyBarChart data={byPeriod} />
        <MaterialPieChart data={byMaterial} />
      </div>
      <SectorRanking data={bySector} />
      <div className="pt-3">
        <BagUnitOverview units={bagUnits} />
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.role === 'operational' || session?.user?.role === 'manager') {
    redirect('/dashboard/bags');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Visão geral
            </p>
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[28px]">Painel de reciclagem</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe volume, participação e desempenho dos setores.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Dados atualizados
        </span>
      </div>
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-5" aria-label="Carregando dados">
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="skeleton-shimmer h-32 rounded-2xl" />)}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="skeleton-shimmer h-80 rounded-2xl" />
              <div className="skeleton-shimmer h-80 rounded-2xl" />
            </div>
          </div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
