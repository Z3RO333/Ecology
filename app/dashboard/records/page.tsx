import { Suspense } from 'react';
import { RecordsTable } from '@/components/dashboard/RecordsTable';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { getRecords } from '@/lib/records';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    sector?: string;
    material?: string;
    page?: string;
  }>;
}

async function RecordsContent({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dateFrom = sp.dateFrom ?? DEFAULT_DATE_FROM();
  const dateTo = sp.dateTo ?? DEFAULT_DATE_TO();
  const sectors = sp.sector ? [sp.sector] : [];
  const materials = sp.material ? [sp.material] : [];
  const page = parseInt(sp.page ?? '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit, offset });

  const exportParams = new URLSearchParams({ dateFrom, dateTo });
  if (sp.sector) exportParams.set('sector', sp.sector);
  if (sp.material) exportParams.set('material', sp.material);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{records.length} registro(s)</p>
        <a
          href={`/api/records/export?${exportParams.toString()}`}
          className="bg-white border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 text-sm px-4 py-2 rounded-lg transition-colors inline-block"
        >
          ↓ Exportar CSV
        </a>
      </div>
      <RecordsTable records={records} />
      <div className="flex justify-between">
        {page > 1 && (
          <Link href={`/dashboard/records?page=${page - 1}`} className="text-sm text-green-700 hover:underline">
            ← Anterior
          </Link>
        )}
        {records.length === limit && (
          <Link href={`/dashboard/records?page=${page + 1}`} className="text-sm text-green-700 hover:underline ml-auto">
            Próxima →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function RecordsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Histórico de Registros</h1>
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Carregando registros...</div>}>
        <RecordsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
