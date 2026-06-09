// Run this in Databricks SQL Editor to set up the table:
// CREATE SCHEMA IF NOT EXISTS ecotracker;
//
// CREATE TABLE IF NOT EXISTS ecotracker.recycling_records (
//   id            STRING        NOT NULL,
//   material_type STRING        NOT NULL,
//   weight_kg     DECIMAL(10,3) NOT NULL,
//   sector        STRING        NOT NULL,
//   responsible_name STRING     NOT NULL,
//   notes         STRING,
//   recorded_at   TIMESTAMP     NOT NULL,
//   recorded_date DATE          NOT NULL
// )
// USING DELTA
// COMMENT 'Recycling records from tablet kiosk';

import { DBSQLClient } from '@databricks/sql';
import type { RecyclingRecord, CreateRecordInput, KPIData, PeriodData, MaterialBreakdown, SectorRankingItem, PeriodView } from '@/types';
import { randomUUID } from 'crypto';

function getClient() {
  return new DBSQLClient();
}

async function query<T = Record<string, unknown>>(sql: string, namedParameters?: Record<string, unknown>): Promise<T[]> {
  const client = getClient();
  const connection = await client.connect({
    host: process.env.DATABRICKS_SERVER_HOSTNAME!,
    path: process.env.DATABRICKS_HTTP_PATH!,
    token: process.env.DATABRICKS_TOKEN!,
  });

  const session = await connection.openSession({
    initialCatalog: process.env.DATABRICKS_CATALOG ?? 'hive_metastore',
    initialSchema: process.env.DATABRICKS_SCHEMA ?? 'ecotracker',
  });

  const operation = await session.executeStatement(sql, {
    runAsync: true,
    queryTimeout: 30,
    ...(namedParameters ? { namedParameters } : {}),
  });

  const rows = await operation.fetchAll();
  await operation.close();
  await session.close();
  await connection.close();

  return rows as T[];
}

export async function insertRecord(input: CreateRecordInput): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const recorded_at = now.toISOString().replace('T', ' ').replace('Z', '');
  const recorded_date = now.toISOString().split('T')[0];

  await query(
    `INSERT INTO recycling_records
     (id, material_type, weight_kg, sector, responsible_name, notes, recorded_at, recorded_date)
     VALUES (:id, :material_type, :weight_kg, :sector, :responsible_name, :notes, :recorded_at, :recorded_date)`,
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
  const sectorClause = filters.sectors?.length
    ? `AND sector IN (${filters.sectors.map((s) => `'${s}'`).join(',')})`
    : '';
  const materialClause = filters.materials?.length
    ? `AND material_type IN (${filters.materials.map((m) => `'${m}'`).join(',')})`
    : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  return query<RecyclingRecord>(
    `SELECT id, material_type, CAST(weight_kg AS DOUBLE) AS weight_kg, sector,
            responsible_name, notes, CAST(recorded_at AS STRING) AS recorded_at,
            CAST(recorded_date AS STRING) AS recorded_date
     FROM recycling_records
     WHERE recorded_date BETWEEN :dateFrom AND :dateTo
     ${sectorClause}
     ${materialClause}
     ORDER BY recorded_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
  );
}

export async function getKPIs(dateFrom: string, dateTo: string, sectors?: string[], materials?: string[]): Promise<KPIData> {
  const sectorClause = sectors?.length ? `AND sector IN (${sectors.map((s) => `'${s}'`).join(',')})` : '';
  const materialClause = materials?.length ? `AND material_type IN (${materials.map((m) => `'${m}'`).join(',')})` : '';

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
    total_weight_kg: Number(row.total_weight_kg),
    total_records: Number(row.total_records),
    active_sectors: Number(row.active_sectors),
  };
}

export async function getByPeriod(dateFrom: string, dateTo: string, view: PeriodView, sectors?: string[], materials?: string[]): Promise<PeriodData[]> {
  const sectorClause = sectors?.length ? `AND sector IN (${sectors.map((s) => `'${s}'`).join(',')})` : '';
  const materialClause = materials?.length ? `AND material_type IN (${materials.map((m) => `'${m}'`).join(',')})` : '';

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
  const sectorClause = sectors?.length ? `AND sector IN (${sectors.map((s) => `'${s}'`).join(',')})` : '';
  const materialClause = materials?.length ? `AND material_type IN (${materials.map((m) => `'${m}'`).join(',')})` : '';

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
  const sectorClause = sectors?.length ? `AND sector IN (${sectors.map((s) => `'${s}'`).join(',')})` : '';
  const materialClause = materials?.length ? `AND material_type IN (${materials.map((m) => `'${m}'`).join(',')})` : '';

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
