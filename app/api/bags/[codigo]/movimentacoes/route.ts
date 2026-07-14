import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBagByCodigo, getMovimentacoes } from '@/lib/bags';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { codigo } = await params;
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    if (session.user.role === 'manager' && !session.user.localId) {
      return NextResponse.json({ error: 'Unidade não vinculada' }, { status: 403 });
    }
    const movimentacoes = await getMovimentacoes({
      bag_id: bag.id,
      local_id: session.user.role === 'manager' ? session.user.localId : undefined,
      limit,
      offset,
    });
    if (session.user.role === 'manager' && bag.local_atual_id !== session.user.localId && movimentacoes.length === 0) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ bag, movimentacoes });
  } catch (err) {
    console.error('GET /api/bags/[codigo]/movimentacoes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
