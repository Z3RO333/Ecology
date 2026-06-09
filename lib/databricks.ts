// Data access for the recycling_records Delta table via the Databricks SQL
// Statement Execution REST API (https://docs.databricks.com/api/workspace/statementexecution).
//
// We deliberately avoid the @databricks/sql Node driver: it depends on native,
// non-ESM modules (lz4) that neither the Next.js bundler nor its runtime
// external-module loader can handle. Plain HTTPS + fetch has zero native deps.
//
// Run this in the Databricks SQL Editor to set up the table:
// CREATE TABLE IF NOT EXISTS recycling_records (
//   id STRING NOT NULL, material_type STRING NOT NULL, weight_kg DECIMAL(10,3) NOT NULL,
//   sector STRING NOT NULL, responsible_name STRING NOT NULL, notes STRING,
//   recorded_at TIMESTAMP NOT NULL, recorded_date DATE NOT NULL
// ) USING DELTA;

import type { RecyclingRecord, CreateRecordInput, KPIData, PeriodData, MaterialBreakdown, SectorRankingItem, PeriodView } from '@/types';
import { randomUUID } from 'crypto';
import { MATERIALS, SECTORS } from '@/lib/constants';

// Helper to build a safe IN clause after allowlist validation.
// Values not present in the allowlist are silently dropped.
function buildInClause(values: string[], column: string, allowlist: readonly string[]): string {
  const safe = values.filter((v) => (allowlist as string[]).includes(v));
  if (!safe.length) return '';
  return `AND ${column} IN (${safe.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})`;
}

const NUMERIC_TYPES = new Set(['INT', 'LONG', 'SHORT', 'BYTE', 'FLOAT', 'DOUBLE', 'DECIMAL']);

function host(): string {
  return process.env.DATABRICKS_SERVER_HOSTNAME!.replace(/^https?:\/\//, '');
}

function warehouseId(): string {
  return process.env.DATABRICKS_WAREHOUSE_ID ?? process.env.DATABRICKS_HTTP_PATH!.split('/').pop()!;
}

interface ApiColumn { name: string; type_name: string; position: number }
interface ApiManifest { schema: { columns: ApiColumn[] }; total_chunk_count?: number }
interface ApiResult { data_array?: string[][]; next_chunk_internal_link?: string }
interface ApiResponse {
  statement_id: string;
  status: { state: string; error?: { message?: string } };
  manifest?: ApiManifest;
  result?: ApiResult;
}

async function api(path: string, init?: RequestInit): Promise<ApiResponse> {
  const res = await fetch(`https://${host()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DATABRICKS_TOKEN!}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Databricks API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

async function query<T = Record<string, unknown>>(
  sql: string,
  namedParameters?: Record<string, unknown>
): Promise<T[]> {
  const parameters = Object.entries(namedParameters ?? {}).map(([name, v]) => ({
    name,
    value: v === null || v === undefined ? null : String(v),
    type: 'STRING',
  }));

  let resp = await api('/api/2.0/sql/statements', {
    method: 'POST',
    body: JSON.stringify({
      warehouse_id: warehouseId(),
      catalog: process.env.DATABRICKS_CATALOG ?? 'hive_metastore',
      schema: process.env.DATABRICKS_SCHEMA ?? 'ecotracker',
      statement: sql,
      parameters,
      wait_timeout: '30s',
      format: 'JSON_ARRAY',
      disposition: 'INLINE',
    }),
  });

  // Poll until the statement leaves the pending/running state.
  while (resp.status.state === 'PENDING' || resp.status.state === 'RUNNING') {
    await new Promise((r) => setTimeout(r, 800));
    resp = await api(`/api/2.0/sql/statements/${resp.statement_id}`);
  }

  if (resp.status.state !== 'SUCCEEDED') {
    throw new Error(`Databricks statement ${resp.status.state}: ${resp.status.error?.message ?? 'unknown error'}`);
  }

  const columns = resp.manifest?.schema.columns ?? [];
  const rows: string[][] = [];
  let result = resp.result;
  if (result?.data_array) rows.push(...result.data_array);
  // Follow chunk links for large result sets.
  while (result?.next_chunk_internal_link) {
    const next = await api(result.next_chunk_internal_link);
    result = next.result;
    if (result?.data_array) rows.push(...result.data_array);
  }

  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      const raw = row[i];
      obj[col.name] = raw === null || raw === undefined ? null : NUMERIC_TYPES.has(col.type_name) ? Number(raw) : raw;
    });
    return obj as T;
  });
}

export async function insertRecord(input: CreateRecordInput): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const recorded_at = now.toISOString().replace('T', ' ').replace('Z', '');
  const recorded_date = now.toISOString().split('T')[0];

  await query(
    `INSERT INTO recycling_records
     (id, material_type, weight_kg, sector, responsible_name, notes, recorded_at, recorded_date)
     VALUES (:id, :material_type, CAST(:weight_kg AS DECIMAL(10,3)), :sector, :responsible_name,
             :notes, CAST(:recorded_at AS TIMESTAMP), CAST(:recorded_date AS DATE))`,
    {
      id,
      material_type: input.material_type,
      weight_kg: input.weight_kg,
      sector: input.sector,
      responsible_name: input.responsible_name,
      notes: input.notes ?? null,
      recorded_at,
      recorded_date,
    }
  );

  return id;
}

export async function getRecords(filters: {
  dateFrom: string;
  dateTo: string;
  sectors?: string[];
  materials?: string[];
  limit?: number;
  offset?: number;
}): Promise<RecyclingRecord[]> {
  const sectorClause = buildInClause(filters.sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(filters.materials ?? [], 'material_type', MATERIALS);
  const safeLimit = Math.min(Math.max(1, Number.isFinite(Number(filters.limit)) ? Math.floor(Number(filters.limit)) : 50), 10000);
  const safeOffset = Math.max(0, Number.isFinite(Number(filters.offset)) ? Math.floor(Number(filters.offset)) : 0);

  return query<RecyclingRecord>(
    `SELECT id, material_type, CAST(weight_kg AS DOUBLE) AS weight_kg, sector,
            responsible_name, notes, CAST(recorded_at AS STRING) AS recorded_at,
            CAST(recorded_date AS STRING) AS recorded_date
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause}
     ${materialClause}
     ORDER BY recorded_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
  );
}

export async function getKPIs(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<KPIData> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  const rows = await query<{ total_weight_kg: number; total_records: number; active_sectors: number }>(
    `SELECT
       COALESCE(SUM(CAST(weight_kg AS DOUBLE)), 0) AS total_weight_kg,
       COUNT(*) AS total_records,
       COUNT(DISTINCT sector) AS active_sectors
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause} ${materialClause}`,
    { dateFrom, dateTo }
  );

  const row = rows[0];
  return {
    total_weight_kg: Number(row?.total_weight_kg ?? 0),
    total_records: Number(row?.total_records ?? 0),
    active_sectors: Number(row?.active_sectors ?? 0),
  };
}

export async function getByPeriod(dateFrom: string, dateTo: string, view: PeriodView, sectors?: string[], materials?: string[]): Promise<PeriodData[]> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  const groupExpr =
    view === 'daily'
      ? `DATE_FORMAT(recorded_date, 'dd/MM')`
      : view === 'weekly'
      ? `CONCAT('S', WEEKOFYEAR(recorded_date))`
      : `DATE_FORMAT(recorded_date, 'MM/yyyy')`;

  return query<PeriodData>(
    `SELECT ${groupExpr} AS period,
            COALESCE(SUM(CAST(weight_kg AS DOUBLE)), 0) AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause} ${materialClause}
     GROUP BY ${groupExpr}
     ORDER BY MIN(recorded_date)`,
    { dateFrom, dateTo }
  );
}

export async function getByMaterial(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<MaterialBreakdown[]> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  return query<MaterialBreakdown>(
    `SELECT material_type,
            COALESCE(SUM(CAST(weight_kg AS DOUBLE)), 0) AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause} ${materialClause}
     GROUP BY material_type
     ORDER BY total_weight_kg DESC`,
    { dateFrom, dateTo }
  );
}

export async function getBySector(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<SectorRankingItem[]> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  return query<SectorRankingItem>(
    `SELECT sector,
            COALESCE(SUM(CAST(weight_kg AS DOUBLE)), 0) AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause} ${materialClause}
     GROUP BY sector
     ORDER BY total_weight_kg DESC`,
    { dateFrom, dateTo }
  );
}
