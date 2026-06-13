import { describe, expect, it } from 'vitest';
import { resolveJwtRole } from './auth-role';

describe('resolveJwtRole', () => {
  it('preserves a supplier role while refreshing an existing JWT', () => {
    expect(resolveJwtRole({ currentRole: 'supplier' })).toBe('supplier');
  });

  it('uses the role returned by a credentials login', () => {
    expect(resolveJwtRole({ currentRole: 'manager', credentialsRole: 'supplier' })).toBe('supplier');
  });

  it('resolves an internal role only from a fresh Entra profile', () => {
    expect(resolveJwtRole({ entraEmail: 'employee@bemol.com.br' })).toBe('manager');
  });
});
