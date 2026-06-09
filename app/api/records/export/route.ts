import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecords } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import { formatRecordDateTime } from '@/lib/format';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');

  const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit: 10000, offset: 0 });

  const sanitizeCsvValue = (v: unknown): string => {
    const s = String(v ?? '').replace(/"/g, '""');
    // Prevent CSV/formula injection: prefix values starting with =, +, -, @ with a single quote
    if (/^[=+\-@]/.test(s)) return `"'${s}"`;
    return `"${s}"`;
  };

  const headers = 'id,material_type,weight_kg,sector,responsible_name,notes,recorded_at\n';
  const rows = records
    .map((r) =>
      [r.id, r.material_type, r.weight_kg, r.sector, r.responsible_name, r.notes ?? '', formatRecordDateTime(r.recorded_at)]
        .map(sanitizeCsvValue)
        .join(',')
    )
    .join('\n');

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const safeFrom = isoDate.test(dateFrom) ? dateFrom : 'unknown';
  const safeTo = isoDate.test(dateTo) ? dateTo : 'unknown';
  const filename = `ecotracker_${safeFrom}_${safeTo}.csv`;

  return new NextResponse(headers + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
