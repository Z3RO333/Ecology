import { describe, expect, it } from 'vitest';
import { canAccessUnit, hasPermission, homeForRole, isInternalRole } from './access-control';

describe('access control', () => {
  it('keeps the viewer profile read-only', () => {
    expect(hasPermission('viewer', 'dashboard:view')).toBe(true);
    expect(hasPermission('viewer', 'bags:view')).toBe(true);
    expect(hasPermission('viewer', 'bags:create')).toBe(false);
    expect(hasPermission('viewer', 'users:manage')).toBe(false);
  });

  it('limits store managers to their assigned unit', () => {
    expect(canAccessUnit('manager', 'unit-1', 'unit-1')).toBe(true);
    expect(canAccessUnit('manager', 'unit-1', 'unit-2')).toBe(false);
    expect(canAccessUnit('manager', undefined, 'unit-1')).toBe(false);
    expect(canAccessUnit('admin', undefined, 'unit-2')).toBe(true);
  });

  it('recognizes all editable internal profiles', () => {
    expect(isInternalRole('admin')).toBe(true);
    expect(isInternalRole('viewer')).toBe(true);
    expect(isInternalRole('supplier')).toBe(false);
  });

  it('sends a store manager to the scoped bags dashboard', () => {
    expect(homeForRole('manager')).toBe('/dashboard/bags');
  });
});
