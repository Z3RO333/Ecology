import { auth } from '@/lib/auth';
import { hasPermission, homeForRole } from '@/lib/access-control';
import {
  TABLET_ACCESS_COOKIE,
  verifyTabletAccessToken,
} from '@/lib/tablet-token';
import { NextResponse } from 'next/server';

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const role = request.auth?.user?.role;

  if (pathname.startsWith('/tablet') && pathname !== '/tablet/access') {
    const hasRoleAccess = hasPermission(role, 'records:create');
    const hasDeviceAccess = await verifyTabletAccessToken(
      request.cookies.get(TABLET_ACCESS_COOKIE)?.value
    );

    if (!hasRoleAccess && !hasDeviceAccess) {
      return NextResponse.redirect(new URL('/tablet/access', request.url));
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if (!request.auth) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    if (!hasPermission(role, 'dashboard:view')) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
  }

  if (pathname.startsWith('/fornecedor')) {
    // Public supplier auth pages.
    if (pathname === '/fornecedor/login' || pathname === '/fornecedor/primeiro-acesso') {
      return NextResponse.next();
    }
    // Suppliers log in with email + password, not the internal Entra SSO.
    if (!request.auth || !hasPermission(role, 'supplier-documents:view-own')) {
      return NextResponse.redirect(new URL('/fornecedor/login', request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/fornecedor/:path*', '/tablet/:path*'],
};
