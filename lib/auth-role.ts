import type { AppRole } from '@/lib/access-control';
import { resolveInternalRole } from '@/lib/internal-roles';

export function resolveJwtRole({
  currentRole,
  credentialsRole,
  entraEmail,
}: {
  currentRole?: AppRole;
  credentialsRole?: AppRole;
  entraEmail?: string;
}): AppRole | undefined {
  if (credentialsRole) return credentialsRole;
  if (entraEmail) return resolveInternalRole(entraEmail) ?? undefined;
  return currentRole;
}
