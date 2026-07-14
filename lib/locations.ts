import 'server-only';

import { sql, sqlOne } from '@/lib/db';
import type { Local, LocalTipo } from '@/types/bags';

export interface LocalWithCentro extends Local {
  centro: number | null;
}

export async function getLocais(apenasAtivos = true): Promise<LocalWithCentro[]> {
  const where = apenasAtivos ? 'WHERE ativo = TRUE' : '';
  return sql<LocalWithCentro>(
    `SELECT id, centro, nome, tipo, ativo FROM locais ${where} ORDER BY nome`,
    []
  );
}

export async function getLocalById(id: string): Promise<LocalWithCentro | null> {
  return sqlOne<LocalWithCentro>(
    'SELECT id, centro, nome, tipo, ativo FROM locais WHERE id = $1',
    [id]
  );
}

export async function getLocalByEmail(email: string): Promise<LocalWithCentro | null> {
  return sqlOne<LocalWithCentro>(
    `SELECT l.id, l.centro, l.nome, l.tipo, l.ativo
     FROM locais l
     WHERE l.id = COALESCE(
       (SELECT u.local_id FROM app_users u
        WHERE u.email = $1 AND u.active = TRUE AND u.local_id IS NOT NULL),
       (SELECT le.local_id FROM local_emails le WHERE le.email = $1)
     ) AND l.ativo = TRUE`,
    [email.toLowerCase()]
  );
}

export async function getCDs(): Promise<LocalWithCentro[]> {
  return sql<LocalWithCentro>(
    `SELECT id, centro, nome, tipo, ativo FROM locais WHERE tipo = 'cd' AND ativo = TRUE ORDER BY nome`,
    []
  );
}

export async function createLocal(input: {
  nome: string;
  tipo: LocalTipo;
}): Promise<Local> {
  const row = await sqlOne<Local>(
    `INSERT INTO locais (nome, tipo) VALUES ($1, $2)
     RETURNING id, nome, tipo, ativo`,
    [input.nome, input.tipo]
  );
  return row!;
}
