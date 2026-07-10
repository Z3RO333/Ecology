import 'server-only';

import { sql, sqlOne, withTransaction } from '@/lib/db';
import type {
  Bag,
  BagMovimentacao,
  BagKPIData,
  BagStatus,
  BagAcao,
  CreateMovimentacaoInput,
} from '@/types/bags';

export async function getBags(filters?: {
  status?: BagStatus;
  local_id?: string;
  limit?: number;
  offset?: number;
}): Promise<Bag[]> {
  const conditions: string[] = ['b.ativo = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`b.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.local_id) {
    conditions.push(`b.local_atual_id = $${idx++}`);
    params.push(filters.local_id);
  }

  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = Math.max(filters?.offset ?? 0, 0);

  return sql<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.data_cadastro DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function getBagByCodigo(codigo: string): Promise<Bag | null> {
  return sqlOne<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE b.codigo = $1`,
    [codigo]
  );
}

export async function getBagById(id: string): Promise<Bag | null> {
  return sqlOne<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE b.id = $1`,
    [id]
  );
}

const ACAO_TO_STATUS: Partial<Record<BagAcao, BagStatus>> = {
  cadastrada: 'disponivel',
  enviada: 'em_transito',
  recebida: 'disponivel',
  em_uso: 'em_uso',
  devolvida: 'disponivel',
  danificada: 'danificada',
  extraviada: 'extraviada',
  higienizacao: 'disponivel',
  baixada: 'baixada',
};

export async function createBag(input: {
  codigo: string;
  tipo?: string;
  local_atual_id?: string;
  setor_atual?: string;
  usuario_nome: string;
}): Promise<Bag> {
  return withTransaction(async (client) => {
    const { rows: bagRows } = await client.query(
      `INSERT INTO bags (codigo, tipo, local_atual_id, setor_atual, data_ultima_movimentacao)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, codigo, tipo, status, local_atual_id, setor_atual,
                 data_cadastro::text, data_ultima_movimentacao::text, ativo`,
      [input.codigo, input.tipo ?? 'sacola', input.local_atual_id ?? null, input.setor_atual ?? null]
    );
    const bag = bagRows[0];

    await client.query(
      `INSERT INTO bag_movimentacoes (bag_id, acao, local_destino_id, setor, usuario_nome)
       VALUES ($1, 'cadastrada', $2, $3, $4)`,
      [bag.id, input.local_atual_id ?? null, input.setor_atual ?? null, input.usuario_nome]
    );

    return bag as Bag;
  });
}

export async function registrarMovimentacao(input: CreateMovimentacaoInput): Promise<BagMovimentacao> {
  return withTransaction(async (client) => {
    const { rows: bagRows } = await client.query(
      'SELECT id, local_atual_id FROM bags WHERE id = $1 AND ativo = TRUE',
      [input.bag_id]
    );
    if (!bagRows[0]) throw new Error('Bag não encontrada ou inativa.');

    const localOrigemId = bagRows[0].local_atual_id;
    const newStatus = ACAO_TO_STATUS[input.acao] ?? 'disponivel';

    const { rows: movRows } = await client.query(
      `INSERT INTO bag_movimentacoes (bag_id, acao, local_origem_id, local_destino_id, setor, usuario_nome, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, bag_id, acao, local_origem_id, local_destino_id, setor, usuario_nome, observacao, created_at::text`,
      [
        input.bag_id,
        input.acao,
        localOrigemId,
        input.local_destino_id ?? null,
        input.setor ?? null,
        input.usuario_nome,
        input.observacao ?? null,
      ]
    );

    await client.query(
      `UPDATE bags
       SET status = $1,
           local_atual_id = COALESCE($2, local_atual_id),
           setor_atual = $3,
           data_ultima_movimentacao = now(),
           updated_at = now()
       WHERE id = $4`,
      [newStatus, input.local_destino_id ?? null, input.setor ?? null, input.bag_id]
    );

    return movRows[0] as BagMovimentacao;
  });
}

export async function getBagKPIs(): Promise<BagKPIData> {
  const rows = await sql<{ status: BagStatus; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM bags WHERE ativo = TRUE
     GROUP BY status`,
    []
  );

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const n = parseInt(row.count, 10);
    counts[row.status] = n;
    total += n;
  }

  return {
    total_bags: total,
    em_circulacao: (counts['em_uso'] ?? 0) + (counts['em_transito'] ?? 0),
    disponiveis: counts['disponivel'] ?? 0,
    extraviadas: counts['extraviada'] ?? 0,
    danificadas: counts['danificada'] ?? 0,
  };
}

export async function getMovimentacoes(filters: {
  bag_id?: string;
  limit?: number;
  offset?: number;
}): Promise<BagMovimentacao[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.bag_id) {
    conditions.push(`m.bag_id = $${idx++}`);
    params.push(filters.bag_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 50, 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  return sql<BagMovimentacao>(
    `SELECT m.id, m.bag_id, b.codigo AS bag_codigo, m.acao,
            m.local_origem_id, lo.nome AS local_origem_nome,
            m.local_destino_id, ld.nome AS local_destino_nome,
            m.setor, m.usuario_nome, m.observacao, m.created_at::text
     FROM bag_movimentacoes m
     JOIN bags b ON b.id = m.bag_id
     LEFT JOIN locais lo ON lo.id = m.local_origem_id
     LEFT JOIN locais ld ON ld.id = m.local_destino_id
     ${where}
     ORDER BY m.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export function generateBagCode(sequenceNumber: number): string {
  return `BAG-${String(sequenceNumber).padStart(6, '0')}`;
}

export async function getNextBagCode(): Promise<string> {
  const row = await sqlOne<{ max_num: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER))::text AS max_num
     FROM bags WHERE codigo ~ '^BAG-[0-9]+$'`,
    []
  );
  const next = (parseInt(row?.max_num ?? '0', 10) || 0) + 1;
  return generateBagCode(next);
}
