import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBags, getBagKPIs } from '@/lib/bags';
import type { BagStatus } from '@/types/bags';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as BagStatus | null;
  const localId = searchParams.get('local_id');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const kpis = searchParams.get('kpis') === 'true';

  try {
    if (kpis) {
      const data = await getBagKPIs();
      return NextResponse.json({ kpis: data });
    }
    const bags = await getBags({
      status: status ?? undefined,
      local_id: localId ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json({ bags });
  } catch (err) {
    console.error('GET /api/bags error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
