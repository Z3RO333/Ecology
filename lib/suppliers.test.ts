import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ sql: vi.fn(), sqlOne: vi.fn() }));

import { normalizeEmail } from './suppliers';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Wander@Bemol.COM.br ')).toBe('wander@bemol.com.br');
  });
});
