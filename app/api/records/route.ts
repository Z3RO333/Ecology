import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecords } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit, offset });
    return NextResponse.json({ records });
  } catch (err) {
    console.error('GET /api/records error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
