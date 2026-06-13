import type { AppRole } from '@/lib/access-control';

const INTERNAL_ROLE_ENV: Array<[AppRole, string]> = [
  ['admin', 'APP_ADMIN_EMAILS'],
  ['manager', 'APP_MANAGER_EMAILS'],
  ['operational', 'APP_OPERATIONAL_EMAILS'],
];

function emailList(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function resolveInternalRole(email: string): AppRole | null {
  const normalized = email.trim().toLowerCase();
  const configuredRoles = INTERNAL_ROLE_ENV.map(([role, envName]) => [role, emailList(envName)] as const);

  for (const [role, emails] of configuredRoles) {
    if (emails.has(normalized)) return role;
  }

  // Preserve the current deployment until role lists are configured. Once any
  // list exists, an unlisted internal user is denied.
  return configuredRoles.some(([, emails]) => emails.size > 0) ? null : 'manager';
}

