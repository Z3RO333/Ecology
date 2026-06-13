import { NextResponse } from 'next/server';
import {
  createTabletAccessToken,
  isValidTabletKey,
  TABLET_ACCESS_COOKIE,
} from '@/lib/tablet-token';

export async function POST(request: Request) {
  const formData = await request.formData();
  const accessKey = String(formData.get('accessKey') ?? '');

  if (!isValidTabletKey(accessKey)) {
    return NextResponse.redirect(new URL('/tablet/access?error=1', request.url), 303);
  }

  const response = NextResponse.redirect(new URL('/tablet', request.url), 303);
  response.cookies.set(TABLET_ACCESS_COOKIE, await createTabletAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/tablet',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
