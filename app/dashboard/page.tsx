import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { KPICards } from '@/components/dashboard/KPICards';
import { WeeklyBarChart } from '@/components/dashboard/WeeklyBarChart';
import { MaterialPieChart } from '@/components/dashboard/MaterialPieChart';
import { SectorRanking } from '@/components/dashboard/SectorRanking';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { getKPIs, getByPeriod, getByMaterial, getBySector } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import type { PeriodView } from '@/types';

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

  const [kpis, byPeriod, byMaterial, bySector] = await Promise.all([
    getKPIs(dateFrom, dateTo, sectors, materials),
    getByPeriod(dateFrom, dateTo, view, sectors, materials),
    getByMaterial(dateFrom, dateTo, sectors, materials),
    getBySector(dateFrom, dateTo, sectors, materials),
  ]);

  return (
    <div className="space-y-6">
      <KPICards kpis={kpis} />
      <div className="grid grid-cols-2 gap-4">
        <WeeklyBarChart data={byPeriod} />
        <MaterialPieChart data={byMaterial} />
      </div>
      <SectorRanking data={bySector} />
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.role === 'operational') {
    redirect('/dashboard/bags');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Painel de Reciclagem</h1>
      </div>
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="text-center py-12 text-gray-400 text-sm">Carregando dados...</div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
