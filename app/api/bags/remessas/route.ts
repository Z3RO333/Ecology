import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import {
  getRemessas,
  getRemessasPendentesParaReceber,
  getRemessasPendentesParaDevolver,
  getRemessasPendentesVoltaReceber,
  getRemessaKPIs,
} from '@/lib/bag-remessas';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const tipo = searchParams.get('tipo');
  const localId = searchParams.get('local_id');
  const status = searchParams.get('status');
  const kpis = searchParams.get('kpis') === 'true';

  try {
    if (session.user.role === 'manager' && !session.user.localId) {
      return NextResponse.json({ error: 'Unidade não vinculada' }, { status: 403 });
    }
    if (session.user.role === 'manager' && localId && localId !== session.user.localId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const effectiveLocalId = session.user.role === 'manager' ? session.user.localId : localId ?? undefined;

    if (kpis) {
      return NextResponse.json({ kpis: await getRemessaKPIs(effectiveLocalId) });
    }

    if (tipo === 'pendentes_receber' && effectiveLocalId) {
      return NextResponse.json({ remessas: await getRemessasPendentesParaReceber(effectiveLocalId) });
    }
    if (tipo === 'pendentes_devolver' && effectiveLocalId) {
      return NextResponse.json({ remessas: await getRemessasPendentesParaDevolver(effectiveLocalId) });
    }
    if (tipo === 'pendentes_volta_receber' && effectiveLocalId) {
      return NextResponse.json({ remessas: await getRemessasPendentesVoltaReceber(effectiveLocalId) });
    }

    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    return NextResponse.json({ remessas: await getRemessas({ status: status ?? undefined, local_id: effectiveLocalId, limit, offset }) });
  } catch (err) {
    console.error('GET /api/bags/remessas error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
