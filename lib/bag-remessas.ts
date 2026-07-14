import 'server-only';

import { sql, sqlOne } from '@/lib/db';
import type { BagRemessa, BagUnitSummary, RemessaKPIData } from '@/types/bags';

const SELECT_REMESSA = `
  SELECT r.id, r.origem_id, lo.nome AS origem_nome, r.destino_id, ld.nome AS destino_nome,
         r.quantidade_enviada, r.quantidade_recebida,
         r.enviado_por, r.recebido_por,
         r.enviado_em::text, r.recebido_em::text,
         r.observacao_envio, r.observacao_recebimento,
         r.qty_volta_enviada, r.qty_volta_recebida,
         r.volta_enviado_por, r.volta_recebido_por,
         r.volta_enviado_em::text, r.volta_recebido_em::text,
         r.observacao_volta_envio, r.observacao_volta_recebimento,
         r.status
  FROM bag_remessas r
  JOIN locais lo ON lo.id = r.origem_id
  JOIN locais ld ON ld.id = r.destino_id`;

export async function criarRemessa(input: {
  origem_id: string;
  destino_id: string;
  quantidade_enviada: number;
  enviado_por: string;
  observacao_envio?: string;
}): Promise<BagRemessa> {
  const row = await sqlOne<BagRemessa>(
    `INSERT INTO bag_remessas (origem_id, destino_id, quantidade_enviada, enviado_por, observacao_envio, status)
     VALUES ($1, $2, $3, $4, $5, 'ida_em_transito')
     RETURNING id, origem_id, destino_id, quantidade_enviada, quantidade_recebida,
               enviado_por, recebido_por, enviado_em::text, recebido_em::text,
               observacao_envio, observacao_recebimento,
               qty_volta_enviada, qty_volta_recebida, volta_enviado_por, volta_recebido_por,
               volta_enviado_em::text, volta_recebido_em::text,
               observacao_volta_envio, observacao_volta_recebimento, status`,
    [input.origem_id, input.destino_id, input.quantidade_enviada, input.enviado_por, input.observacao_envio ?? null]
  );
  return row!;
}

export async function getRemessaById(id: string): Promise<BagRemessa | null> {
  return sqlOne<BagRemessa>(`${SELECT_REMESSA} WHERE r.id = $1`, [id]);
}

export async function receberIda(input: {
  remessa_id: string;
  quantidade_recebida: number;
  recebido_por: string;
  observacao_recebimento?: string;
}): Promise<BagRemessa> {
  const row = await sqlOne<BagRemessa>(
    `UPDATE bag_remessas
     SET quantidade_recebida = $1,
         recebido_por = $2,
         recebido_em = now(),
         observacao_recebimento = $3,
         status = CASE WHEN $1 = quantidade_enviada THEN 'ida_recebida' ELSE 'ida_divergencia' END
     WHERE id = $4 AND status = 'ida_em_transito'
     RETURNING id, origem_id, destino_id, quantidade_enviada, quantidade_recebida,
               enviado_por, recebido_por, enviado_em::text, recebido_em::text,
               observacao_envio, observacao_recebimento,
               qty_volta_enviada, qty_volta_recebida, volta_enviado_por, volta_recebido_por,
               volta_enviado_em::text, volta_recebido_em::text,
               observacao_volta_envio, observacao_volta_recebimento, status`,
    [input.quantidade_recebida, input.recebido_por, input.observacao_recebimento ?? null, input.remessa_id]
  );
  if (!row) throw new Error('Remessa nao encontrada ou ja recebida.');
  return row;
}

export async function enviarVolta(input: {
  remessa_id: string;
  qty_volta_enviada: number;
  volta_enviado_por: string;
  observacao_volta_envio?: string;
}): Promise<BagRemessa> {
  const row = await sqlOne<BagRemessa>(
    `UPDATE bag_remessas
     SET qty_volta_enviada = $1,
         volta_enviado_por = $2,
         volta_enviado_em = now(),
         observacao_volta_envio = $3,
         status = 'volta_em_transito'
     WHERE id = $4 AND status IN ('ida_recebida', 'ida_divergencia')
     RETURNING id, origem_id, destino_id, quantidade_enviada, quantidade_recebida,
               enviado_por, recebido_por, enviado_em::text, recebido_em::text,
               observacao_envio, observacao_recebimento,
               qty_volta_enviada, qty_volta_recebida, volta_enviado_por, volta_recebido_por,
               volta_enviado_em::text, volta_recebido_em::text,
               observacao_volta_envio, observacao_volta_recebimento, status`,
    [input.qty_volta_enviada, input.volta_enviado_por, input.observacao_volta_envio ?? null, input.remessa_id]
  );
  if (!row) throw new Error('Remessa nao encontrada ou nao esta pronta para devolucao.');
  return row;
}

export async function receberVolta(input: {
  remessa_id: string;
  qty_volta_recebida: number;
  volta_recebido_por: string;
  observacao_volta_recebimento?: string;
}): Promise<BagRemessa> {
  const row = await sqlOne<BagRemessa>(
    `UPDATE bag_remessas
     SET qty_volta_recebida = $1,
         volta_recebido_por = $2,
         volta_recebido_em = now(),
         observacao_volta_recebimento = $3,
         status = CASE WHEN $1 = qty_volta_enviada THEN 'concluida' ELSE 'volta_divergencia' END
     WHERE id = $4 AND status = 'volta_em_transito'
     RETURNING id, origem_id, destino_id, quantidade_enviada, quantidade_recebida,
               enviado_por, recebido_por, enviado_em::text, recebido_em::text,
               observacao_envio, observacao_recebimento,
               qty_volta_enviada, qty_volta_recebida, volta_enviado_por, volta_recebido_por,
               volta_enviado_em::text, volta_recebido_em::text,
               observacao_volta_envio, observacao_volta_recebimento, status`,
    [input.qty_volta_recebida, input.volta_recebido_por, input.observacao_volta_recebimento ?? null, input.remessa_id]
  );
  if (!row) throw new Error('Remessa nao encontrada ou nao esta em volta.');
  return row;
}

export async function getRemessas(filters?: {
  status?: string;
  local_id?: string;
  limit?: number;
  offset?: number;
}): Promise<BagRemessa[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`r.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.local_id) {
    conditions.push(`(r.origem_id = $${idx} OR r.destino_id = $${idx})`);
    params.push(filters.local_id);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = Math.max(filters?.offset ?? 0, 0);

  return sql<BagRemessa>(
    `${SELECT_REMESSA} ${where} ORDER BY r.enviado_em DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function getRemessasPendentesParaReceber(localId: string): Promise<BagRemessa[]> {
  return sql<BagRemessa>(
    `${SELECT_REMESSA}
     WHERE r.status = 'ida_em_transito' AND r.destino_id = $1
     ORDER BY r.enviado_em ASC`,
    [localId]
  );
}

export async function getRemessasPendentesParaDevolver(localId: string): Promise<BagRemessa[]> {
  return sql<BagRemessa>(
    `${SELECT_REMESSA}
     WHERE r.status IN ('ida_recebida', 'ida_divergencia') AND r.destino_id = $1
     ORDER BY r.recebido_em ASC`,
    [localId]
  );
}

export async function getRemessasPendentesVoltaReceber(localId: string): Promise<BagRemessa[]> {
  return sql<BagRemessa>(
    `${SELECT_REMESSA}
     WHERE r.status = 'volta_em_transito' AND r.origem_id = $1
     ORDER BY r.volta_enviado_em ASC`,
    [localId]
  );
}

export async function getRemessaKPIs(localId?: string): Promise<RemessaKPIData> {
  const rows = await sql<{ status: string; cnt: string; enviadas: string; recebidas: string }>(
    `SELECT status,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(quantidade_enviada), 0)::text AS enviadas,
            COALESCE(SUM(COALESCE(qty_volta_recebida, quantidade_recebida, 0)), 0)::text AS recebidas
     FROM bag_remessas
     ${localId ? 'WHERE origem_id = $1 OR destino_id = $1' : ''}
     GROUP BY status`,
    localId ? [localId] : []
  );

  let total = 0, idaTransito = 0, voltaTransito = 0, concluidas = 0, divergencia = 0;
  let bagsEnviadas = 0, bagsRecebidas = 0;

  for (const r of rows) {
    const cnt = parseInt(r.cnt, 10);
    const env = parseInt(r.enviadas, 10);
    const rec = parseInt(r.recebidas, 10);
    total += cnt;
    bagsEnviadas += env;
    bagsRecebidas += rec;
    if (r.status === 'ida_em_transito') idaTransito = cnt;
    if (r.status === 'volta_em_transito') voltaTransito = cnt;
    if (r.status === 'concluida') concluidas = cnt;
    if (r.status.includes('divergencia')) divergencia += cnt;
  }

  return {
    total_remessas: total,
    em_transito_ida: idaTransito,
    em_transito_volta: voltaTransito,
    concluidas,
    com_divergencia: divergencia,
    bags_enviadas: bagsEnviadas,
    bags_recebidas: bagsRecebidas,
    bags_perdidas: bagsEnviadas - bagsRecebidas,
  };
}

interface BagUnitSummaryRow {
  id: string;
  centro: number | null;
  nome: string;
  tipo: BagUnitSummary['tipo'];
  destinadas: string;
  disponiveis: string;
  em_uso: string;
  devolvidas: string;
  pendentes: string;
  ultima_movimentacao: string | null;
  remessas_atrasadas: string;
}

export async function getBagUnitSummaries(localId?: string): Promise<BagUnitSummary[]> {
  const rows = await sql<BagUnitSummaryRow>(
    `WITH remessas AS (
       SELECT origem_id AS local_id,
              COALESCE(
                (ARRAY_AGG(qty_volta_recebida ORDER BY enviado_em DESC)
                  FILTER (WHERE qty_volta_recebida IS NOT NULL))[1],
                0
              )::text AS devolvidas,
              SUM(
                GREATEST(quantidade_enviada - COALESCE(quantidade_recebida, quantidade_enviada), 0)
                + GREATEST(
                    COALESCE(qty_volta_enviada, 0)
                    - COALESCE(qty_volta_recebida, qty_volta_enviada, 0),
                    0
                  )
              )::text AS pendentes,
              SUM(
                CASE WHEN status <> 'concluida'
                  THEN COALESCE(qty_volta_enviada, quantidade_recebida, quantidade_enviada)
                  ELSE 0
                END
              )::text AS em_uso,
              MAX(GREATEST(
                enviado_em,
                COALESCE(recebido_em, enviado_em),
                COALESCE(volta_enviado_em, enviado_em),
                COALESCE(volta_recebido_em, enviado_em)
              ))::text AS ultima_movimentacao,
              COUNT(*) FILTER (
                WHERE status <> 'concluida'
                  AND enviado_em < now() - INTERVAL '7 days'
              )::text AS remessas_atrasadas
       FROM bag_remessas
       GROUP BY origem_id
     )
     SELECT l.id, l.centro, l.nome, l.tipo,
            l.bags_alocadas::text AS destinadas,
            GREATEST(
              l.bags_alocadas - COALESCE(r.pendentes, '0')::integer - COALESCE(r.em_uso, '0')::integer,
              0
            )::text AS disponiveis,
            LEAST(
              COALESCE(r.em_uso, '0')::integer,
              GREATEST(l.bags_alocadas - COALESCE(r.pendentes, '0')::integer, 0)
            )::text AS em_uso,
            COALESCE(r.devolvidas, '0') AS devolvidas,
            COALESCE(r.pendentes, '0') AS pendentes,
            r.ultima_movimentacao,
            COALESCE(r.remessas_atrasadas, '0') AS remessas_atrasadas
     FROM locais l
     LEFT JOIN remessas r ON r.local_id = l.id
     WHERE l.ativo = TRUE
       AND l.tipo IN ('loja', 'farma')
       ${localId ? 'AND l.id = $1' : ''}
     ORDER BY COALESCE(r.remessas_atrasadas, '0')::integer DESC,
              COALESCE(r.pendentes, '0')::integer DESC,
              l.nome`,
    localId ? [localId] : []
  );

  return rows.map((row) => {
    const destinadas = Number(row.destinadas);
    const devolvidas = Number(row.devolvidas);
    const pendentes = Math.min(Number(row.pendentes), destinadas);
    const percentual = destinadas > 0 ? Math.max(Math.round(((destinadas - pendentes) / destinadas) * 100), 0) : 100;
    const atrasadas = Number(row.remessas_atrasadas);
    const situacao: BagUnitSummary['situacao'] = atrasadas > 0 || (pendentes > 0 && percentual < 75)
      ? 'critica'
      : pendentes > 0 || percentual < 90
        ? 'atencao'
        : 'regular';

    return {
      id: row.id,
      centro: row.centro,
      nome: row.nome,
      tipo: row.tipo,
      destinadas,
      disponiveis: Number(row.disponiveis),
      em_uso: Number(row.em_uso),
      devolvidas,
      pendentes,
      percentual_devolucao: percentual,
      ultima_movimentacao: row.ultima_movimentacao,
      remessas_atrasadas: atrasadas,
      situacao,
    };
  });
}
