import { NextRequest, NextResponse } from 'next/server';
import { getKPIs } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';

// TEMPORARY diagnostic endpoint — gated by a secret key. Runs the same
// Databricks query the dashboard uses and returns the real error so we can
// see exactly why /dashboard 500s in production. Remove after debugging.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('k') !== 'eco-diag-2026') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const kpis = await getKPIs(DEFAULT_DATE_FROM(), DEFAULT_DATE_TO());
    return NextResponse.json({
      ok: true,
      kpis,
      env: {
        host: process.env.DATABRICKS_SERVER_HOSTNAME,
        path: process.env.DATABRICKS_HTTP_PATH,
        catalog: process.env.DATABRICKS_CATALOG,
        schema: process.env.DATABRICKS_SCHEMA,
      },
    });
  } catch (e: unknown) {
    const err = e as { message?: string; stack?: string };
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? e), stack: String(err?.stack ?? '').split('\n').slice(0, 8) },
      { status: 500 }
    );
  }
}
