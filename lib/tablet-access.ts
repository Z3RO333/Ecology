import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import {
  TABLET_ACCESS_COOKIE,
  verifyTabletAccessToken,
} from '@/lib/tablet-token';

export async function canSubmitTabletRecord(): Promise<boolean> {
  const session = await auth();
  if (hasPermission(session?.user?.role, 'records:create')) return true;

  const cookieStore = await cookies();
  return verifyTabletAccessToken(cookieStore.get(TABLET_ACCESS_COOKIE)?.value);
}
