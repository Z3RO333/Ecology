import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';

const configuredConnectionString = process.env.DATABASE_URL;
if (!configuredConnectionString) {
  throw new Error('DATABASE_URL is required.');
}

const databaseUrl = new URL(configuredConnectionString);
databaseUrl.searchParams.delete('sslmode');

const migrationPaths = [
  new URL('../docs/sql/001_platform_core.sql', import.meta.url),
  new URL('../docs/sql/002_supplier_auth.sql', import.meta.url),
];
const client = new pg.Client({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: true },
});

try {
  await client.connect();
  await client.query('BEGIN');
  for (const migrationPath of migrationPaths) {
    const sql = await readFile(migrationPath, 'utf8');
    await client.query(sql);
    console.log(`Applied ${migrationPath.pathname.split('/').at(-1)}.`);
  }
  await client.query('COMMIT');
  console.log('Platform database migration completed.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
