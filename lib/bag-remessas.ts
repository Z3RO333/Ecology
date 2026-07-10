import 'server-only';

import { sql, sqlOne } from '@/lib/db';
import type { BagRemessa, RemessaKPIData } from '@/types/bags';

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

export async function receberIda(input: {
  remessa_id: string;
  quantidade_recebida: number;
  recebido_por: string;
  observacao_recebimento?: string;
}): Promise<BagRemessa> {
  const newStatus = input.quantidade_recebida === 0
    ? 'ida_divergencia'
    : 'ida_recebida';

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

export async function getRemessaKPIs(): Promise<RemessaKPIData> {
  const rows = await sql<{ status: string; cnt: string; enviadas: string; recebidas: string }>(
    `SELECT status,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(quantidade_enviada), 0)::text AS enviadas,
            COALESCE(SUM(COALESCE(qty_volta_recebida, quantidade_recebida, 0)), 0)::text AS recebidas
     FROM bag_remessas
     GROUP BY status`,
    []
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
