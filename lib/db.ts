import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

// Single shared pool across the serverless/runtime instance.
declare global {
  var __ecoPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não está configurada. Defina a conexão PostgreSQL antes de acessar este módulo.'
    );
  }

  if (!global.__ecoPgPool) {
    global.__ecoPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return global.__ecoPgPool;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
}

export async function sqlOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
