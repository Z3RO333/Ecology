# EcoTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recycling tracking system with a tablet kiosk for data entry and a protected web dashboard with charts and KPIs, backed by Databricks and authenticated via Microsoft SSO.

**Architecture:** Single Next.js 15 App Router application with two distinct surfaces — `/tablet` (open kiosk, Server Action writes to Databricks) and `/dashboard` (Microsoft SSO protected, reads aggregated data from Databricks via Route Handlers). NextAuth.js handles authentication; Recharts renders charts.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS · @databricks/sql · next-auth · recharts · Azure App Service

---

## Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json` (via npx)
- Create: `.env.local`
- Create: `next.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd C:/Ecology
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias
```

When prompted: accept all defaults (App Router: Yes, Turbopack: Yes).

- [ ] **Step 2: Install dependencies**

```bash
npm install @databricks/sql next-auth@beta recharts uuid
npm install --save-dev @types/uuid
```

- [ ] **Step 3: Create `.env.local` template**

Create `C:/Ecology/.env.local`:

```env
# NextAuth
AUTH_SECRET=replace_with_output_of_openssl_rand_hex_32
AUTH_MICROSOFT_ENTRA_ID_ID=your_azure_ad_client_id
AUTH_MICROSOFT_ENTRA_ID_SECRET=your_azure_ad_client_secret
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/your_tenant_id/v2.0

# Databricks
DATABRICKS_SERVER_HOSTNAME=your-workspace.azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your_warehouse_id
DATABRICKS_TOKEN=your_personal_access_token
DATABRICKS_CATALOG=hive_metastore
DATABRICKS_SCHEMA=ecotracker
```

- [ ] **Step 4: Update `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
```

- [ ] **Step 5: Add `.superpowers` to `.gitignore`**

Open `.gitignore` and add at the end:

```
.superpowers/
.env.local
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `Ready in Xms` on port 3000. Open `http://localhost:3000`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

## Task 2: Types and constants

**Files:**
- Create: `types/index.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Create `types/index.ts`**

```typescript
export type Material =
  | 'Papel'
  | 'Plástico'
  | 'Metal'
  | 'Vidro'
  | 'Orgânico'
  | 'Eletrônico'
  | 'Outro';

export type Sector =
  | 'Escritório 1'
  | 'Copa'
  | 'Escritório Anexo'
  | 'Loja'
  | 'Mercado'
  | 'Farma'
  | 'Outros';

export interface RecyclingRecord {
  id: string;
  material_type: Material;
  weight_kg: number;
  sector: Sector;
  responsible_name: string;
  notes: string | null;
  recorded_at: string;
  recorded_date: string;
}

export interface CreateRecordInput {
  material_type: Material;
  weight_kg: number;
  sector: Sector;
  responsible_name: string;
  notes?: string;
}

export interface KPIData {
  total_weight_kg: number;
  total_records: number;
  active_sectors: number;
}

export interface PeriodData {
  period: string;
  total_weight_kg: number;
}

export interface MaterialBreakdown {
  material_type: string;
  total_weight_kg: number;
}

export interface SectorRankingItem {
  sector: string;
  total_weight_kg: number;
}

export interface AnalyticsData {
  kpis: KPIData;
  byPeriod: PeriodData[];
  byMaterial: MaterialBreakdown[];
  bySector: SectorRankingItem[];
}

export type PeriodView = 'daily' | 'weekly' | 'monthly';

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  sectors: Sector[];
  materials: Material[];
  periodView: PeriodView;
}
```

- [ ] **Step 2: Create `lib/constants.ts`**

```typescript
import type { Material, Sector } from '@/types';

export const MATERIALS: Material[] = [
  'Papel',
  'Plástico',
  'Metal',
  'Vidro',
  'Orgânico',
  'Eletrônico',
  'Outro',
];

export const SECTORS: Sector[] = [
  'Escritório 1',
  'Copa',
  'Escritório Anexo',
  'Loja',
  'Mercado',
  'Farma',
  'Outros',
];

export const MATERIAL_COLORS: Record<Material, string> = {
  Papel: '#86efac',
  Plástico: '#6ee7b7',
  Metal: '#93c5fd',
  Vidro: '#c4b5fd',
  Orgânico: '#fde68a',
  Eletrônico: '#fca5a5',
  Outro: '#d1d5db',
};

export const DEFAULT_DATE_FROM = (): string => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_DATE_TO = (): string => {
  return new Date().toISOString().split('T')[0];
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/constants.ts
git commit -m "feat: add types and constants"
```

---

## Task 3: Databricks client and table setup

**Files:**
- Create: `lib/databricks.ts`

- [ ] **Step 1: Create the Delta table in Databricks**

Run this SQL in your Databricks SQL Warehouse (via the Databricks UI → SQL Editor):

```sql
CREATE SCHEMA IF NOT EXISTS ecotracker;

CREATE TABLE IF NOT EXISTS ecotracker.recycling_records (
  id            STRING        NOT NULL,
  material_type STRING        NOT NULL,
  weight_kg     DECIMAL(10,3) NOT NULL,
  sector        STRING        NOT NULL,
  responsible_name STRING     NOT NULL,
  notes         STRING,
  recorded_at   TIMESTAMP     NOT NULL,
  recorded_date DATE          NOT NULL
)
USING DELTA
COMMENT 'Recycling records from tablet kiosk';
```

- [ ] **Step 2: Create `lib/databricks.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/databricks.ts
git commit -m "feat: add Databricks client with query helpers"
```

---

## Task 4: NextAuth with Microsoft Entra ID and middleware

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`
- Create: `app/auth/signin/page.tsx`

- [ ] **Step 1: Create `lib/auth.ts`**

```typescript
import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
});
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create `middleware.ts`**

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/dashboard') && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

- [ ] **Step 4: Create `app/auth/signin/page.tsx`**

```typescript
import { signIn } from '@/lib/auth';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">♻</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">EcoTracker</h1>
        <p className="text-gray-500 text-sm mb-6">Painel Gerencial</p>
        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', {
              redirectTo: searchParams.callbackUrl ?? '/dashboard',
            });
          }}
        >
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Entrar com Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/api/auth middleware.ts app/auth
git commit -m "feat: add NextAuth with Microsoft Entra ID and route middleware"
```

---

## Task 5: Server Action — create record

**Files:**
- Create: `actions/records.ts`

- [ ] **Step 1: Create `actions/records.ts`**

```typescript
'use server';

import { insertRecord } from '@/lib/databricks';
import { MATERIALS, SECTORS } from '@/lib/constants';
import type { Material, Sector } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

export async function createRecord(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const material = formData.get('material_type') as Material;
  const weightRaw = formData.get('weight_kg') as string;
  const sector = formData.get('sector') as Sector;
  const responsible = (formData.get('responsible_name') as string)?.trim();
  const notes = (formData.get('notes') as string)?.trim() || undefined;

  if (!MATERIALS.includes(material)) {
    return { success: false, error: 'Selecione um tipo de material.' };
  }

  const weight_kg = parseFloat(weightRaw);
  if (isNaN(weight_kg) || weight_kg <= 0) {
    return { success: false, error: 'Informe um peso válido maior que zero.' };
  }

  if (!SECTORS.includes(sector)) {
    return { success: false, error: 'Selecione um setor.' };
  }

  if (!responsible || responsible.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  try {
    const id = await insertRecord({ material_type: material, weight_kg, sector, responsible_name: responsible, notes });
    return { success: true, id };
  } catch (err) {
    console.error('Databricks insert error:', err);
    return { success: false, error: 'Erro ao salvar. Tente novamente.' };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/records.ts
git commit -m "feat: add createRecord server action with validation"
```

---

## Task 6: API routes — records and analytics

**Files:**
- Create: `app/api/records/route.ts`
- Create: `app/api/analytics/route.ts`

- [ ] **Step 1: Create `app/api/records/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecords } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit, offset });
    return NextResponse.json({ records });
  } catch (err) {
    console.error('GET /api/records error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/analytics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKPIs, getByPeriod, getByMaterial, getBySector } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import type { PeriodView } from '@/types';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');
  const periodView = (searchParams.get('view') ?? 'weekly') as PeriodView;

  try {
    const [kpis, byPeriod, byMaterial, bySector] = await Promise.all([
      getKPIs(dateFrom, dateTo, sectors, materials),
      getByPeriod(dateFrom, dateTo, periodView, sectors, materials),
      getByMaterial(dateFrom, dateTo, sectors, materials),
      getBySector(dateFrom, dateTo, sectors, materials),
    ]);

    return NextResponse.json({ kpis, byPeriod, byMaterial, bySector });
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/records app/api/analytics
git commit -m "feat: add records and analytics API routes"
```

---

## Task 7: Tablet UI components

**Files:**
- Create: `components/tablet/MaterialSelector.tsx`
- Create: `components/tablet/WeightInput.tsx`
- Create: `components/tablet/SectorDropdown.tsx`

- [ ] **Step 1: Create `components/tablet/MaterialSelector.tsx`**

```typescript
'use client';

import { MATERIALS } from '@/lib/constants';
import type { Material } from '@/types';

interface Props {
  value: Material | null;
  onChange: (m: Material) => void;
}

export function MaterialSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-bold text-green-800 mb-2">1. Tipo de Material *</p>
      <div className="grid grid-cols-2 gap-3">
        {MATERIALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`py-4 rounded-xl text-sm font-semibold transition-all ${
              value === m
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-400'
            }`}
          >
            {value === m ? '✓ ' : ''}{m}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/tablet/WeightInput.tsx`**

```typescript
'use client';

const QUICK_ADD = [0.1, 0.5, 1.0, 5.0];

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function WeightInput({ value, onChange }: Props) {
  const display = value.toFixed(3).replace('.', ',');

  return (
    <div>
      <p className="text-sm font-bold text-green-800 mb-2">3. Peso (kg) *</p>
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 text-center">
        <input
          type="number"
          name="weight_kg"
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0,000"
          step="0.001"
          min="0"
          className="w-full text-3xl font-bold text-center text-gray-900 outline-none"
        />
        <p className="text-gray-400 text-xs mt-1">{display} kg</p>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {QUICK_ADD.map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => onChange(Math.round((value + inc) * 1000) / 1000)}
            className="bg-gray-100 hover:bg-green-100 text-gray-700 text-sm py-2 rounded-lg transition-colors"
          >
            +{inc.toString().replace('.', ',')}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/tablet/SectorDropdown.tsx`**

```typescript
'use client';

import { SECTORS } from '@/lib/constants';
import type { Sector } from '@/types';

interface Props {
  value: Sector | '';
  onChange: (s: Sector) => void;
}

export function SectorDropdown({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-bold text-green-800 mb-2">2. Setor *</p>
      <select
        name="sector"
        value={value}
        onChange={(e) => onChange(e.target.value as Sector)}
        className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-gray-700 text-base focus:border-green-500 outline-none appearance-none"
      >
        <option value="">Selecione o setor...</option>
        {SECTORS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/tablet
git commit -m "feat: add tablet form components (material, weight, sector)"
```

---

## Task 8: Tablet page (`/tablet`)

**Files:**
- Create: `app/tablet/page.tsx`

- [ ] **Step 1: Create `app/tablet/page.tsx`**

```typescript
'use client';

import { useState, useActionState, useEffect } from 'react';
import { createRecord } from '@/actions/records';
import { MaterialSelector } from '@/components/tablet/MaterialSelector';
import { WeightInput } from '@/components/tablet/WeightInput';
import { SectorDropdown } from '@/components/tablet/SectorDropdown';
import type { Material, Sector } from '@/types';

const INITIAL_STATE = { success: false, error: undefined };

export default function TabletPage() {
  const [material, setMaterial] = useState<Material | null>(null);
  const [weight, setWeight] = useState(0);
  const [sector, setSector] = useState<Sector | ''>('');
  const [showNotes, setShowNotes] = useState(false);

  const [state, formAction, isPending] = useActionState(createRecord, INITIAL_STATE);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setMaterial(null);
        setWeight(0);
        setSector('');
        setShowNotes(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-600 text-white px-6 py-4 text-center">
        <h1 className="text-xl font-bold">♻ Registro de Reciclagem</h1>
        <p className="text-green-100 text-sm mt-1 capitalize">{dateStr} · {timeStr}</p>
      </div>

      <form action={formAction} className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <input type="hidden" name="material_type" value={material ?? ''} />
        <input type="hidden" name="sector" value={sector} />

        <MaterialSelector value={material} onChange={setMaterial} />
        <SectorDropdown value={sector} onChange={setSector} />
        <WeightInput value={weight} onChange={setWeight} />

        {/* Responsável */}
        <div>
          <p className="text-sm font-bold text-green-800 mb-2">4. Responsável *</p>
          <input
            name="responsible_name"
            type="text"
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-gray-700 focus:border-green-500 outline-none text-base"
          />
        </div>

        {/* Observações toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-sm text-green-700 underline"
          >
            {showNotes ? '▲ Ocultar observações' : '▼ Adicionar observação (opcional)'}
          </button>
          {showNotes && (
            <textarea
              name="notes"
              rows={3}
              placeholder="Observações..."
              className="mt-2 w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none text-sm resize-none"
            />
          )}
        </div>

        {/* Error / Success */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl p-4 text-center font-semibold">
            ✓ Registro salvo com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || state.success}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-5 rounded-xl text-base transition-colors"
        >
          {isPending ? 'Salvando...' : state.success ? '✓ Salvo!' : '✓ Confirmar Registro'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and open the tablet page**

```bash
npm run dev
```

Open `http://localhost:3000/tablet`.

Verify:
- Material buttons toggle on click (green = selected)
- Quick add buttons increment weight
- Sector dropdown shows all sectors
- Form submits (will fail on Databricks if not configured — that's expected without credentials)

- [ ] **Step 3: Commit**

```bash
git add app/tablet
git commit -m "feat: add tablet kiosk page"
```

---

## Task 9: Dashboard layout, navigation, and sign-in flow

**Files:**
- Create: `app/dashboard/layout.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EcoTracker',
  description: 'Sistema de rastreamento de reciclagem',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/layout.tsx`**

```typescript
import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">♻ EcoTracker</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-green-700 font-medium">
              Painel
            </Link>
            <Link href="/dashboard/records" className="text-gray-600 hover:text-green-700 font-medium">
              Histórico
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session?.user?.name ?? session?.user?.email}</span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/auth/signin' }); }}>
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout with navigation and sign-out"
```

---

## Task 10: Dashboard chart and KPI components

**Files:**
- Create: `components/dashboard/KPICards.tsx`
- Create: `components/dashboard/WeeklyBarChart.tsx`
- Create: `components/dashboard/MaterialPieChart.tsx`
- Create: `components/dashboard/SectorRanking.tsx`
- Create: `components/dashboard/DashboardFilters.tsx`

- [ ] **Step 1: Create `components/dashboard/KPICards.tsx`**

```typescript
import type { KPIData } from '@/types';

interface Props { kpis: KPIData; }

export function KPICards({ kpis }: Props) {
  const cards = [
    { label: 'Total reciclado', value: `${kpis.total_weight_kg.toFixed(1)} kg`, color: 'text-green-600' },
    { label: 'Registros', value: String(kpis.total_records), color: 'text-blue-600' },
    { label: 'Setores ativos', value: String(kpis.active_sectors), color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-gray-500 text-sm mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/dashboard/WeeklyBarChart.tsx`**

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PeriodData } from '@/types';

interface Props { data: PeriodData[]; }

export function WeeklyBarChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Peso por Período (kg)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} kg`, 'Peso']} />
          <Bar dataKey="total_weight_kg" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/dashboard/MaterialPieChart.tsx`**

```typescript
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MATERIAL_COLORS } from '@/lib/constants';
import type { MaterialBreakdown, Material } from '@/types';

interface Props { data: MaterialBreakdown[]; }

export function MaterialPieChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Materiais Reciclados</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="total_weight_kg" nameKey="material_type" cx="50%" cy="50%" outerRadius={80}>
            {data.map((entry) => (
              <Cell
                key={entry.material_type}
                fill={MATERIAL_COLORS[entry.material_type as Material] ?? '#d1d5db'}
              />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} kg`]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/dashboard/SectorRanking.tsx`**

```typescript
import type { SectorRankingItem } from '@/types';

interface Props { data: SectorRankingItem[]; }

const MEDALS = ['🥇', '🥈', '🥉'];

export function SectorRanking({ data }: Props) {
  const max = data[0]?.total_weight_kg ?? 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">🏆 Ranking de Setores</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.sector} className="flex items-center gap-3">
            <span className="w-5 text-sm">{MEDALS[i] ?? ''}</span>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{item.sector}</span>
                <span className="text-gray-500">{item.total_weight_kg.toFixed(1)} kg</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(item.total_weight_kg / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-gray-400 text-sm text-center">Sem dados no período</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `components/dashboard/DashboardFilters.tsx`**

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SECTORS, MATERIALS } from '@/lib/constants';
import type { PeriodView } from '@/types';

export function DashboardFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="date"
        defaultValue={sp.get('dateFrom') ?? ''}
        onChange={(e) => update('dateFrom', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      />
      <span className="text-gray-400 text-sm">até</span>
      <input
        type="date"
        defaultValue={sp.get('dateTo') ?? ''}
        onChange={(e) => update('dateTo', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      />
      <select
        defaultValue={sp.get('sector') ?? ''}
        onChange={(e) => update('sector', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      >
        <option value="">Todos os setores</option>
        {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        defaultValue={sp.get('material') ?? ''}
        onChange={(e) => update('material', e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-green-500 outline-none"
      >
        <option value="">Todos os materiais</option>
        {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="flex border border-gray-200 rounded-lg overflow-hidden">
        {(['daily', 'weekly', 'monthly'] as PeriodView[]).map((v) => (
          <button
            key={v}
            onClick={() => update('view', v)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              (sp.get('view') ?? 'weekly') === v
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {{ daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/dashboard
git commit -m "feat: add dashboard chart and KPI components"
```

---

## Task 11: Dashboard main page (`/dashboard`)

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```typescript
import { Suspense } from 'react';
import { KPICards } from '@/components/dashboard/KPICards';
import { WeeklyBarChart } from '@/components/dashboard/WeeklyBarChart';
import { MaterialPieChart } from '@/components/dashboard/MaterialPieChart';
import { SectorRanking } from '@/components/dashboard/SectorRanking';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { getKPIs, getByPeriod, getByMaterial, getBySector } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import type { PeriodView } from '@/types';

interface PageProps {
  searchParams: {
    dateFrom?: string;
    dateTo?: string;
    sector?: string;
    material?: string;
    view?: string;
  };
}

async function DashboardContent({ searchParams }: PageProps) {
  const dateFrom = searchParams.dateFrom ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.dateTo ?? DEFAULT_DATE_TO();
  const sectors = searchParams.sector ? [searchParams.sector] : [];
  const materials = searchParams.material ? [searchParams.material] : [];
  const view = (searchParams.view ?? 'weekly') as PeriodView;

  const [kpis, byPeriod, byMaterial, bySector] = await Promise.all([
    getKPIs(dateFrom, dateTo, sectors, materials),
    getByPeriod(dateFrom, dateTo, view, sectors, materials),
    getByMaterial(dateFrom, dateTo, sectors, materials),
    getBySector(dateFrom, dateTo, sectors, materials),
  ]);

  return (
    <div className="space-y-6">
      <KPICards kpis={kpis} />
      <div className="grid grid-cols-2 gap-4">
        <WeeklyBarChart data={byPeriod} />
        <MaterialPieChart data={byMaterial} />
      </div>
      <SectorRanking data={bySector} />
    </div>
  );
}

export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Painel de Reciclagem</h1>
      </div>
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="text-center py-12 text-gray-400 text-sm">Carregando dados...</div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add dashboard main page with KPIs and charts"
```

---

## Task 12: Records history page (`/dashboard/records`)

**Files:**
- Create: `components/dashboard/RecordsTable.tsx`
- Create: `app/dashboard/records/page.tsx`

- [ ] **Step 1: Create `components/dashboard/RecordsTable.tsx`**

```typescript
import type { RecyclingRecord } from '@/types';

interface Props {
  records: RecyclingRecord[];
}

export function RecordsTable({ records }: Props) {
  const headers = ['Data/Hora', 'Material', 'Peso (kg)', 'Setor', 'Responsável', 'Obs.'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {new Date(r.recorded_at).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {r.material_type}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900 font-medium">{Number(r.weight_kg).toFixed(3)}</td>
              <td className="px-4 py-3 text-gray-600">{r.sector}</td>
              <td className="px-4 py-3 text-gray-600">{r.responsible_name}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{r.notes ?? '—'}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/records/page.tsx`**

```typescript
import { Suspense } from 'react';
import { RecordsTable } from '@/components/dashboard/RecordsTable';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { getRecords } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';
import Link from 'next/link';

interface PageProps {
  searchParams: {
    dateFrom?: string;
    dateTo?: string;
    sector?: string;
    material?: string;
    page?: string;
  };
}

async function RecordsContent({ searchParams }: PageProps) {
  const dateFrom = searchParams.dateFrom ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.dateTo ?? DEFAULT_DATE_TO();
  const sectors = searchParams.sector ? [searchParams.sector] : [];
  const materials = searchParams.material ? [searchParams.material] : [];
  const page = parseInt(searchParams.page ?? '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit, offset });

  const exportParams = new URLSearchParams({ dateFrom, dateTo });
  if (searchParams.sector) exportParams.set('sector', searchParams.sector);
  if (searchParams.material) exportParams.set('material', searchParams.material);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{records.length} registro(s)</p>
        <a
          href={`/api/records/export?${exportParams.toString()}`}
          className="bg-white border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 text-sm px-4 py-2 rounded-lg transition-colors inline-block"
        >
          ↓ Exportar CSV
        </a>
      </div>
      <RecordsTable records={records} />
      <div className="flex justify-between">
        {page > 1 && (
          <Link href={`/dashboard/records?page=${page - 1}`} className="text-sm text-green-700 hover:underline">
            ← Anterior
          </Link>
        )}
        {records.length === limit && (
          <Link href={`/dashboard/records?page=${page + 1}`} className="text-sm text-green-700 hover:underline ml-auto">
            Próxima →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function RecordsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Histórico de Registros</h1>
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Carregando registros...</div>}>
        <RecordsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Create CSV export route `app/api/records/export/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecords } from '@/lib/databricks';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('dateFrom') ?? DEFAULT_DATE_FROM();
  const dateTo = searchParams.get('dateTo') ?? DEFAULT_DATE_TO();
  const sectors = searchParams.getAll('sector');
  const materials = searchParams.getAll('material');

  const records = await getRecords({ dateFrom, dateTo, sectors, materials, limit: 10000, offset: 0 });

  const headers = 'id,material_type,weight_kg,sector,responsible_name,notes,recorded_at\n';
  const rows = records
    .map((r) =>
      [r.id, r.material_type, r.weight_kg, r.sector, r.responsible_name, r.notes ?? '', r.recorded_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const filename = `ecotracker_${dateFrom}_${dateTo}.csv`;

  return new NextResponse(headers + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/RecordsTable.tsx app/dashboard/records app/api/records/export
git commit -m "feat: add records history page with table and CSV export"
```

---

## Task 13: Azure App Service deployment

**Files:**
- Create: `.azure/deploy.sh` (reference only)
- Create: `web.config` (for Azure App Service Windows) or `startup.sh` (Linux)

- [ ] **Step 1: Build and verify no errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. Fix any TypeScript or build errors before proceeding.

- [ ] **Step 2: Create `web.config` for Azure App Service (Windows) or verify startup for Linux**

If using **Linux App Service** (recommended), add `startup.sh`:

```bash
#!/bin/bash
npm run start
```

If using **Windows App Service**, create `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="nodejs" stopProcessing="true">
          <match url=".*"/>
          <conditions logicalGrouping="MatchAll" trackAllCaptures="false"/>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

- [ ] **Step 3: Create Azure App Service via Azure Portal or CLI**

Via Azure CLI:

```bash
# Login
az login

# Create resource group (if needed)
az group create --name rg-ecotracker --location brazilsouth

# Create App Service plan (B1 Linux)
az appservice plan create \
  --name plan-ecotracker \
  --resource-group rg-ecotracker \
  --sku B1 \
  --is-linux

# Create web app with Node 20
az webapp create \
  --name ecotracker-app \
  --resource-group rg-ecotracker \
  --plan plan-ecotracker \
  --runtime "NODE:20-lts"
```

- [ ] **Step 4: Set environment variables in Azure**

```bash
az webapp config appsettings set \
  --name ecotracker-app \
  --resource-group rg-ecotracker \
  --settings \
    AUTH_SECRET="<generated>" \
    AUTH_MICROSOFT_ENTRA_ID_ID="<your_client_id>" \
    AUTH_MICROSOFT_ENTRA_ID_SECRET="<your_client_secret>" \
    AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<tenant_id>/v2.0" \
    DATABRICKS_SERVER_HOSTNAME="<your_workspace>.azuredatabricks.net" \
    DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/<warehouse_id>" \
    DATABRICKS_TOKEN="<pat>" \
    DATABRICKS_CATALOG="hive_metastore" \
    DATABRICKS_SCHEMA="ecotracker" \
    NEXTAUTH_URL="https://ecotracker-app.azurewebsites.net" \
    WEBSITE_NODE_DEFAULT_VERSION="20-lts" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

- [ ] **Step 5: Configure startup command in Azure**

```bash
az webapp config set \
  --name ecotracker-app \
  --resource-group rg-ecotracker \
  --startup-file "npm run start"
```

- [ ] **Step 6: Deploy via ZIP deploy**

```bash
npm run build
zip -r deploy.zip . --exclude ".git/*" --exclude "node_modules/.cache/*"

az webapp deployment source config-zip \
  --name ecotracker-app \
  --resource-group rg-ecotracker \
  --src deploy.zip
```

- [ ] **Step 7: Update Microsoft Entra ID redirect URI**

In Azure Portal → Entra ID → App registrations → your app → Authentication, add:

```
https://ecotracker-app.azurewebsites.net/api/auth/callback/microsoft-entra-id
```

- [ ] **Step 8: Verify production deployment**

Open `https://ecotracker-app.azurewebsites.net/tablet` — tablet form should load without login.
Open `https://ecotracker-app.azurewebsites.net/dashboard` — should redirect to Microsoft SSO.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: add Azure App Service deployment configuration"
```

---

## Post-MVP: Out of scope (do not implement now)

- Multi-select filters (single select is sufficient for MVP)
- PDF reports
- Photo uploads
- Push notifications
- Sector/material management via UI
- Multi-tenant support
