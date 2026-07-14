import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canSubmitTabletRecord } from '@/lib/tablet-access';
import { getLocais, getLocalByEmail } from '@/lib/locations';

export async function GET(req: NextRequest) {
  const session = await auth();
  const hasTabletAccess = await canSubmitTabletRecord();
  if (!session?.user && !hasTabletAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const requestedEmail = searchParams.get('email');
  const email = session?.user?.role === 'manager' ? session.user.email : requestedEmail;

  try {
    if (email) {
      const local = await getLocalByEmail(email);
      return NextResponse.json({ local });
    }
    const locais = await getLocais();
    return NextResponse.json({ locais });
  } catch (err) {
    console.error('GET /api/locations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
