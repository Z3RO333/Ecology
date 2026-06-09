import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKPIs, getByPeriod, getByMaterial, getBySector } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import type { PeriodView } from '@/types';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');
  const periodView = (searchParams.get('view') ?? 'weekly') as PeriodView;

  try {
    const [kpis, byPeriod, byMaterial, bySector] = await Promise.all([
      getKPIs(dateFrom, dateTo, sectors, materials),
      getByPeriod(dateFrom, dateTo, periodView, sectors, materials),
      getByMaterial(dateFrom, dateTo, sectors, materials),
      getBySector(dateFrom, dateTo, sectors, materials),
    ]);

    return NextResponse.json({ kpis, byPeriod, byMaterial, bySector });
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
