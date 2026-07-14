import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBagByCodigo } from '@/lib/bags';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { codigo } = await params;

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    if (session.user.role === 'manager' && bag.local_atual_id !== session.user.localId) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ bag });
  } catch (err) {
    console.error('GET /api/bags/[codigo] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
