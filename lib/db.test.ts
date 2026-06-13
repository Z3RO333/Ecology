import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({
  Pool: class {
    query = vi.fn().mockResolvedValue({ rows: [{ n: 1 }, { n: 2 }] });
  },
}));

describe('sqlOne', () => {
  it('returns the first row', async () => {
    const { sqlOne } = await import('./db');
    const row = await sqlOne<{ n: number }>('SELECT 1');
    expect(row).toEqual({ n: 1 });
  });
});
