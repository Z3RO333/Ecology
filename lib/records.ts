// Data access for the recycling_records table, stored in the same Postgres
// database (ecotracker-pg) as app_users. Recycling data used to live in a
// Databricks SQL Warehouse queried over the Statement Execution REST API,
// but that warehouse auto-stops after 10 minutes idle and the app has no
// permission to change that, causing slow/failed tablet submissions after
// any gap in usage. Postgres doesn't have that problem for this workload.

import type { RecyclingRecord, CreateRecordInput, KPIData, PeriodData, MaterialBreakdown, SectorRankingItem, PeriodView } from '@/types';
import { randomUUID } from 'crypto';
import { sql, sqlOne } from '@/lib/db';
import { MATERIALS, SECTORS } from '@/lib/constants';
import { formatDateInAppTimeZone } from '@/lib/format';

// Helper to build a safe IN clause after allowlist validation.
// Values not present in the allowlist are silently dropped.
function buildInClause(values: string[], column: string, allowlist: readonly string[]): string {
  const safe = values.filter((v) => (allowlist as string[]).includes(v));
  if (!safe.length) return '';
  return `AND ${column} IN (${safe.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})`;
}

export async function insertRecord(input: CreateRecordInput): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const recorded_at = now.toISOString().replace('T', ' ').replace('Z', '');
  const recorded_date = formatDateInAppTimeZone(now);

  await sql(
    `INSERT INTO recycling_records
     (id, material_type, weight_kg, sector, responsible_name, notes, recorded_at, recorded_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, input.material_type, input.weight_kg, input.sector, input.responsible_name, input.notes ?? null, recorded_at, recorded_date]
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

  return sql<RecyclingRecord>(
    `SELECT id, material_type, weight_kg::float8 AS weight_kg, sector,
            responsible_name, notes, recorded_at::text AS recorded_at,
            recorded_date::text AS recorded_date
     FROM recycling_records
     WHERE recorded_date BETWEEN $1 AND $2
     ${sectorClause}
     ${materialClause}
     ORDER BY recorded_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [filters.dateFrom, filters.dateTo]
  );
}

export async function getKPIs(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<KPIData> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  const row = await sqlOne<{ total_weight_kg: string; total_records: string; active_sectors: string }>(
    `SELECT
       COALESCE(SUM(weight_kg), 0)::float8 AS total_weight_kg,
       COUNT(*) AS total_records,
       COUNT(DISTINCT sector) AS active_sectors
     FROM recycling_records
     WHERE recorded_date BETWEEN $1 AND $2
     ${sectorClause} ${materialClause}`,
    [dateFrom, dateTo]
  );

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
      ? `TO_CHAR(recorded_date, 'DD/MM')`
      : view === 'weekly'
      ? `CONCAT(TO_CHAR(DATE_TRUNC('week', recorded_date), 'DD/MM'), '-', TO_CHAR(DATE_TRUNC('week', recorded_date) + INTERVAL '6 days', 'DD/MM'))`
      : `TO_CHAR(recorded_date, 'MM/YYYY')`;

  const rows = await sql<{ period: string; total_weight_kg: string }>(
    `SELECT ${groupExpr} AS period,
            COALESCE(SUM(weight_kg), 0)::float8 AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN $1 AND $2
     ${sectorClause} ${materialClause}
     GROUP BY ${groupExpr}
     ORDER BY MIN(recorded_date)`,
    [dateFrom, dateTo]
  );

  return rows.map((row) => ({ period: row.period, total_weight_kg: Number(row.total_weight_kg) }));
}

export async function getByMaterial(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<MaterialBreakdown[]> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  const rows = await sql<{ material_type: string; total_weight_kg: string }>(
    `SELECT material_type,
            COALESCE(SUM(weight_kg), 0)::float8 AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN $1 AND $2
     ${sectorClause} ${materialClause}
     GROUP BY material_type
     ORDER BY total_weight_kg DESC`,
    [dateFrom, dateTo]
  );

  return rows.map((row) => ({ material_type: row.material_type, total_weight_kg: Number(row.total_weight_kg) }));
}

export async function getBySector(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<SectorRankingItem[]> {
  const sectorClause = buildInClause(sectors ?? [], 'sector', SECTORS);
  const materialClause = buildInClause(materials ?? [], 'material_type', MATERIALS);

  const rows = await sql<{ sector: string; total_weight_kg: string }>(
    `SELECT sector,
            COALESCE(SUM(weight_kg), 0)::float8 AS total_weight_kg
     FROM recycling_records
     WHERE recorded_date BETWEEN $1 AND $2
     ${sectorClause} ${materialClause}
     GROUP BY sector
     ORDER BY total_weight_kg DESC`,
    [dateFrom, dateTo]
  );

  return rows.map((row) => ({ sector: row.sector, total_weight_kg: Number(row.total_weight_kg) }));
}
