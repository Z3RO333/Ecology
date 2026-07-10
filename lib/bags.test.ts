import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  sqlOne: vi.fn(),
  withTransaction: vi.fn((cb: (client: unknown) => Promise<unknown>) =>
    cb({
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'bag-1', codigo: 'BAG-000001', status: 'disponivel' }],
      }),
    })
  ),
}));

import { sql, sqlOne } from '@/lib/db';
import {
  getBags,
  getBagByCodigo,
  createBag,
  getBagKPIs,
  getMovimentacoes,
  generateBagCode,
} from '@/lib/bags';

describe('bags', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getBags returns bags with location name', async () => {
    const rows = [
      { id: '1', codigo: 'BAG-000001', status: 'disponivel', local_atual_nome: 'Loja Centro' },
    ];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getBags();
    expect(result).toEqual(rows);
    expect(sql).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN locais'),
      expect.any(Array)
    );
  });

  it('getBagByCodigo returns a single bag', async () => {
    const row = { id: '1', codigo: 'BAG-000001', status: 'disponivel' };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await getBagByCodigo('BAG-000001');
    expect(result).toEqual(row);
  });

  it('createBag inserts bag and initial movement', async () => {
    const result = await createBag({
      codigo: 'BAG-000001',
      usuario_nome: 'Gustavo',
    });
    expect(result).toBeDefined();
    expect(result.codigo).toBe('BAG-000001');
  });

  it('getBagKPIs returns counts by status', async () => {
    vi.mocked(sql).mockResolvedValue([
      { status: 'disponivel', count: '5' },
      { status: 'em_uso', count: '3' },
      { status: 'extraviada', count: '1' },
    ]);
    const kpis = await getBagKPIs();
    expect(kpis.total_bags).toBe(9);
    expect(kpis.disponiveis).toBe(5);
    expect(kpis.extraviadas).toBe(1);
  });

  it('getMovimentacoes returns recent movements', async () => {
    const rows = [
      { id: '1', bag_id: 'b1', bag_codigo: 'BAG-000001', acao: 'cadastrada', usuario_nome: 'Ana' },
    ];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getMovimentacoes({});
    expect(result).toEqual(rows);
  });

  it('generateBagCode formats correctly', () => {
    expect(generateBagCode(1)).toBe('BAG-000001');
    expect(generateBagCode(42)).toBe('BAG-000042');
    expect(generateBagCode(123456)).toBe('BAG-123456');
  });
});
