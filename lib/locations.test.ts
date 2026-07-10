import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  sqlOne: vi.fn(),
}));

import { sql, sqlOne } from '@/lib/db';
import { getLocais, getLocalById, createLocal } from '@/lib/locations';

describe('locations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getLocais returns active locations', async () => {
    const rows = [{ id: '1', nome: 'Loja Centro', tipo: 'loja', ativo: true }];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getLocais();
    expect(result).toEqual(rows);
    expect(sql).toHaveBeenCalledWith(
      expect.stringContaining('FROM locais'),
      []
    );
  });

  it('getLocalById returns one location', async () => {
    const row = { id: '1', nome: 'Loja Centro', tipo: 'loja', ativo: true };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await getLocalById('1');
    expect(result).toEqual(row);
  });

  it('createLocal inserts and returns new location', async () => {
    const row = { id: 'new-id', nome: 'CD Sul', tipo: 'cd', ativo: true };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await createLocal({ nome: 'CD Sul', tipo: 'cd' });
    expect(result).toEqual(row);
  });
});
