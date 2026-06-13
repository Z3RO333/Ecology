import 'server-only';

import { auth } from '@/lib/auth';
import { hasPermission, type Permission } from '@/lib/access-control';

export async function isAuthorized(permission: Permission): Promise<boolean> {
  const session = await auth();
  return hasPermission(session?.user?.role, permission);
}

