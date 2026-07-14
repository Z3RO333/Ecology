export const APP_ROLES = ['admin', 'manager', 'operational', 'viewer', 'supplier'] as const;

export const INTERNAL_ROLES = ['admin', 'manager', 'operational', 'viewer'] as const;

export type InternalRole = (typeof INTERNAL_ROLES)[number];

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
  'bags:view',
  'bags:create',
  'bags:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  manager: [
    'dashboard:view',
    'records:create',
    'bags:view',
    'bags:create',
    'bags:manage',
  ],
  operational: ['dashboard:view', 'records:create', 'bags:create', 'bags:view'],
  viewer: ['dashboard:view', 'records:view', 'bags:view'],
  supplier: ['supplier-documents:submit', 'supplier-documents:view-own'],
};

export function hasPermission(role: AppRole | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

export function homeForRole(role: AppRole | undefined): string {
  if (role === 'supplier') return '/fornecedor/envios';
  if (role === 'operational' || role === 'manager') return '/dashboard/bags';
  return '/dashboard';
}

export function isInternalRole(role: unknown): role is InternalRole {
  return typeof role === 'string' && INTERNAL_ROLES.includes(role as InternalRole);
}

export function canAccessUnit(
  role: AppRole | undefined,
  assignedLocalId: string | undefined,
  requestedLocalId: string
): boolean {
  return role !== 'manager' || Boolean(assignedLocalId && assignedLocalId === requestedLocalId);
}
