import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

// Single shared pool across the serverless/runtime instance.
declare global {
  // eslint-disable-next-line no-var
  var __ecoPgPool: Pool | undefined;
}

function getPool(): Pool {
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
