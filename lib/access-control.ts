export const APP_ROLES = ['admin', 'manager', 'operational', 'supplier'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const PERMISSIONS = [
  'dashboard:view',
  'records:view',
  'records:create',
  'users:manage',
  'suppliers:manage',
  'supplier-documents:review',
  'supplier-documents:submit',
  'supplier-documents:view-own',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  manager: [
    'dashboard:view',
    'records:view',
    'records:create',
    'suppliers:manage',
    'supplier-documents:review',
  ],
  operational: ['records:create'],
  supplier: ['supplier-documents:submit', 'supplier-documents:view-own'],
};

export function hasPermission(role: AppRole | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

export function homeForRole(role: AppRole | undefined): string {
  if (role === 'supplier') return '/fornecedor/envios';
  if (role === 'operational') return '/tablet';
  return '/dashboard';
}
