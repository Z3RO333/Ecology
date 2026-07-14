import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ sql: vi.fn(), sqlOne: vi.fn() }));

import { sql } from '@/lib/db';
import { getBagUnitSummaries } from './bag-remessas';

describe('bag unit summaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates pending bags and the return percentage', async () => {
    vi.mocked(sql).mockResolvedValue([{
      id: 'unit-1',
      centro: 636,
      nome: 'Farma Dom Pedro',
      tipo: 'farma',
      destinadas: '50',
      disponiveis: '4',
      em_uso: '3',
      devolvidas: '42',
      pendentes: '8',
      ultima_movimentacao: '2026-07-14T10:00:00.000Z',
      remessas_atrasadas: '0',
    }]);

    const [summary] = await getBagUnitSummaries();
    expect(summary.pendentes).toBe(8);
    expect(summary.percentual_devolucao).toBe(84);
    expect(summary.situacao).toBe('atencao');
  });

  it('marks overdue shipments as critical', async () => {
    vi.mocked(sql).mockResolvedValue([{
      id: 'unit-2', centro: 101, nome: 'Loja Matriz', tipo: 'loja',
      destinadas: '20', disponiveis: '0', em_uso: '0', devolvidas: '18',
      pendentes: '2', ultima_movimentacao: null, remessas_atrasadas: '1',
    }]);

    const [summary] = await getBagUnitSummaries('unit-2');
    expect(summary.situacao).toBe('critica');
    expect(sql).toHaveBeenCalledWith(expect.stringContaining('AND l.id = $1'), ['unit-2']);
  });
});
