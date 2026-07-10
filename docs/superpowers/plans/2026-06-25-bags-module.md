# Bags Module — Implementation Plan (Phase 1 MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Bags" (sacolas retornáveis) module to the existing EcoTracker recycling platform, enabling registration, movement tracking, and dashboard visibility for reusable bags as trackable assets.

**Architecture:** Bags data lives in the existing Azure PostgreSQL database (alongside users, suppliers, documents) — NOT in Databricks, since bags are transactional/relational assets with lifecycle state. New tables: `locais`, `bags`, `bag_movimentacoes`. The tablet UI gets a new flow for bag registration/movement with QR code scanning. The dashboard gets a new "Bags" section with KPIs and movement history. All new code follows the existing patterns: `lib/db.ts` for queries, server actions for form submissions, NextAuth + access-control for permissions.

**Tech Stack:** Next.js 16 App Router, TypeScript, PostgreSQL (via `lib/db.ts`), Tailwind CSS, NextAuth, QR code generation (`qrcode` npm package), QR code scanning (browser `BarcodeDetector` API with `html5-qrcode` fallback)

## Global Constraints

- Next.js 16 — read `node_modules/next/dist/docs/` before using any API you're unsure about
- All SQL goes through `lib/db.ts` (`sql<T>()`, `sqlOne<T>()`, `withTransaction()`)
- Migrations are idempotent SQL files in `docs/sql/` — added to `scripts/migrate-platform.mjs`
- Permissions go through `lib/access-control.ts` — roles: admin, manager, operational, supplier
- Tablet UI must be kiosk-friendly: large buttons, no small text, touch-optimized
- Portuguese (pt-BR) for all user-facing text
- No new dependencies unless strictly necessary — prefer Web APIs
- Do NOT touch Databricks or the recycling_records flow — bags is a separate module

---

### Task 1: Database Migration — locais, bags, bag_movimentacoes

**Files:**
- Create: `docs/sql/004_bags_module.sql`
- Modify: `scripts/migrate-platform.mjs`

**Interfaces:**
- Consumes: existing `app_users` table (for FK references)
- Produces: tables `locais`, `bags`, `bag_movimentacoes`; enums `bag_status`, `bag_acao`

- [ ] **Step 1: Create the migration file**

Create `docs/sql/004_bags_module.sql`:

```sql
-- Enum: current status of a bag
DO $$
BEGIN
  CREATE TYPE bag_status AS ENUM (
    'disponivel',
    'em_uso',
    'em_transito',
    'danificada',
    'extraviada',
    'baixada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Enum: action recorded in a movement
DO $$
BEGIN
  CREATE TYPE bag_acao AS ENUM (
    'cadastrada',
    'enviada',
    'recebida',
    'em_uso',
    'devolvida',
    'danificada',
    'extraviada',
    'higienizacao',
    'baixada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Locations: stores, distribution centers, sectors
CREATE TABLE IF NOT EXISTS locais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('loja', 'cd', 'farma', 'setor', 'outro')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bags: main asset registry
CREATE TABLE IF NOT EXISTS bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'sacola',
  status bag_status NOT NULL DEFAULT 'disponivel',
  local_atual_id UUID REFERENCES locais(id),
  setor_atual TEXT,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_ultima_movimentacao TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bags_codigo_idx ON bags (codigo);
CREATE INDEX IF NOT EXISTS bags_status_idx ON bags (status) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS bags_local_atual_idx ON bags (local_atual_id) WHERE ativo = TRUE;

-- Movement history
CREATE TABLE IF NOT EXISTS bag_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
  acao bag_acao NOT NULL,
  local_origem_id UUID REFERENCES locais(id),
  local_destino_id UUID REFERENCES locais(id),
  setor TEXT,
  usuario_nome TEXT NOT NULL,
  observacao TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bag_movimentacoes_bag_idx
  ON bag_movimentacoes (bag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bag_movimentacoes_created_idx
  ON bag_movimentacoes (created_at DESC);
```

- [ ] **Step 2: Register migration in the runner**

In `scripts/migrate-platform.mjs`, add the new migration path to the `migrationPaths` array:

```javascript
const migrationPaths = [
  new URL('../docs/sql/001_platform_core.sql', import.meta.url),
  new URL('../docs/sql/002_supplier_auth.sql', import.meta.url),
  new URL('../docs/sql/003_document_submissions_responsible.sql', import.meta.url),
  new URL('../docs/sql/004_bags_module.sql', import.meta.url),
];
```

- [ ] **Step 3: Run migration locally to verify**

Run: `node scripts/migrate-platform.mjs`
Expected: `Applied 004_bags_module.sql.` followed by `Platform database migration completed.`

- [ ] **Step 4: Commit**

```bash
git add docs/sql/004_bags_module.sql scripts/migrate-platform.mjs
git commit -m "feat(bags): add database migration for locais, bags, bag_movimentacoes"
```

---

### Task 2: Types and Permissions

**Files:**
- Create: `types/bags.ts`
- Modify: `types/index.ts`
- Modify: `lib/access-control.ts`

**Interfaces:**
- Consumes: nothing
- Produces: types `BagStatus`, `BagAcao`, `LocalTipo`, `Bag`, `BagMovimentacao`, `Local`, `CreateBagInput`, `CreateMovimentacaoInput`, `BagKPIData`; permissions `bags:view`, `bags:create`, `bags:manage`

- [ ] **Step 1: Create bag types**

Create `types/bags.ts`:

```typescript
export const BAG_STATUSES = [
  'disponivel',
  'em_uso',
  'em_transito',
  'danificada',
  'extraviada',
  'baixada',
] as const;

export type BagStatus = (typeof BAG_STATUSES)[number];

export const BAG_STATUS_LABELS: Record<BagStatus, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  em_transito: 'Em Trânsito',
  danificada: 'Danificada',
  extraviada: 'Extraviada',
  baixada: 'Baixada',
};

export const BAG_ACOES = [
  'cadastrada',
  'enviada',
  'recebida',
  'em_uso',
  'devolvida',
  'danificada',
  'extraviada',
  'higienizacao',
  'baixada',
] as const;

export type BagAcao = (typeof BAG_ACOES)[number];

export const BAG_ACAO_LABELS: Record<BagAcao, string> = {
  cadastrada: 'Cadastrada',
  enviada: 'Enviada',
  recebida: 'Recebida',
  em_uso: 'Em Uso',
  devolvida: 'Devolvida',
  danificada: 'Danificada',
  extraviada: 'Extraviada',
  higienizacao: 'Higienização',
  baixada: 'Baixada',
};

export const LOCAL_TIPOS = ['loja', 'cd', 'farma', 'setor', 'outro'] as const;

export type LocalTipo = (typeof LOCAL_TIPOS)[number];

export interface Local {
  id: string;
  nome: string;
  tipo: LocalTipo;
  ativo: boolean;
}

export interface Bag {
  id: string;
  codigo: string;
  tipo: string;
  status: BagStatus;
  local_atual_id: string | null;
  local_atual_nome?: string;
  setor_atual: string | null;
  data_cadastro: string;
  data_ultima_movimentacao: string | null;
  ativo: boolean;
}

export interface BagMovimentacao {
  id: string;
  bag_id: string;
  bag_codigo?: string;
  acao: BagAcao;
  local_origem_id: string | null;
  local_origem_nome?: string;
  local_destino_id: string | null;
  local_destino_nome?: string;
  setor: string | null;
  usuario_nome: string;
  observacao: string | null;
  created_at: string;
}

export interface CreateBagInput {
  codigo: string;
  tipo?: string;
  local_atual_id?: string;
  setor_atual?: string;
}

export interface CreateMovimentacaoInput {
  bag_id: string;
  acao: BagAcao;
  local_destino_id?: string;
  setor?: string;
  usuario_nome: string;
  observacao?: string;
}

export interface BagKPIData {
  total_bags: number;
  em_circulacao: number;
  disponiveis: number;
  extraviadas: number;
  danificadas: number;
}
```

- [ ] **Step 2: Re-export from types/index.ts**

Add to the bottom of `types/index.ts`:

```typescript
export type {
  BagStatus,
  BagAcao,
  LocalTipo,
  Local,
  Bag,
  BagMovimentacao,
  CreateBagInput,
  CreateMovimentacaoInput,
  BagKPIData,
} from './bags';
```

- [ ] **Step 3: Add bag permissions to access-control**

In `lib/access-control.ts`, update the `PERMISSIONS` array and role mappings:

```typescript
export const PERMISSIONS = [
  'dashboard:view',
  'records:view',
  'records:create',
  'users:manage',
  'suppliers:manage',
  'supplier-documents:review',
  'supplier-documents:submit',
  'supplier-documents:view-own',
  'bags:view',
  'bags:create',
  'bags:manage',
] as const;
```

Update `ROLE_PERMISSIONS`:

```typescript
const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  manager: [
    'dashboard:view',
    'records:view',
    'records:create',
    'suppliers:manage',
    'supplier-documents:review',
    'bags:view',
    'bags:create',
    'bags:manage',
  ],
  operational: ['records:create', 'bags:create', 'bags:view'],
  supplier: ['supplier-documents:submit', 'supplier-documents:view-own'],
};
```

- [ ] **Step 4: Commit**

```bash
git add types/bags.ts types/index.ts lib/access-control.ts
git commit -m "feat(bags): add types, enums, and permissions for bags module"
```

---

### Task 3: Data Access Layer — Locations

**Files:**
- Create: `lib/locations.ts`
- Create: `lib/locations.test.ts`

**Interfaces:**
- Consumes: `lib/db.ts` (`sql`, `sqlOne`), `types/bags.ts` (`Local`, `LocalTipo`)
- Produces: `getLocais()`, `getLocalById()`, `createLocal()`

- [ ] **Step 1: Write the test**

Create `lib/locations.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  sqlOne: vi.fn(),
}));

import { sql, sqlOne } from '@/lib/db';
import { getLocais, getLocalById, createLocal } from '@/lib/locations';

describe('locations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getLocais returns active locations', async () => {
    const rows = [{ id: '1', nome: 'Loja Centro', tipo: 'loja', ativo: true }];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getLocais();
    expect(result).toEqual(rows);
    expect(sql).toHaveBeenCalledWith(
      expect.stringContaining('FROM locais'),
      []
    );
  });

  it('getLocalById returns one location', async () => {
    const row = { id: '1', nome: 'Loja Centro', tipo: 'loja', ativo: true };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await getLocalById('1');
    expect(result).toEqual(row);
  });

  it('createLocal inserts and returns new location', async () => {
    const row = { id: 'new-id', nome: 'CD Sul', tipo: 'cd', ativo: true };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await createLocal({ nome: 'CD Sul', tipo: 'cd' });
    expect(result).toEqual(row);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/locations.test.ts`
Expected: FAIL — `Cannot find module '@/lib/locations'`

- [ ] **Step 3: Implement locations data access**

Create `lib/locations.ts`:

```typescript
import 'server-only';

import { sql, sqlOne } from '@/lib/db';
import type { Local, LocalTipo } from '@/types/bags';

export async function getLocais(apenasAtivos = true): Promise<Local[]> {
  const where = apenasAtivos ? 'WHERE ativo = TRUE' : '';
  return sql<Local>(
    `SELECT id, nome, tipo, ativo FROM locais ${where} ORDER BY nome`,
    []
  );
}

export async function getLocalById(id: string): Promise<Local | null> {
  return sqlOne<Local>(
    'SELECT id, nome, tipo, ativo FROM locais WHERE id = $1',
    [id]
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/locations.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/locations.ts lib/locations.test.ts
git commit -m "feat(bags): add locations data access layer"
```

---

### Task 4: Data Access Layer — Bags

**Files:**
- Create: `lib/bags.ts`
- Create: `lib/bags.test.ts`

**Interfaces:**
- Consumes: `lib/db.ts` (`sql`, `sqlOne`, `withTransaction`), `types/bags.ts` (all bag types)
- Produces: `getBags()`, `getBagByCodigo()`, `createBag()`, `registrarMovimentacao()`, `getBagKPIs()`, `getMovimentacoes()`

- [ ] **Step 1: Write the tests**

Create `lib/bags.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
  sqlOne: vi.fn(),
  withTransaction: vi.fn((cb) => cb({
    query: vi.fn().mockResolvedValue({ rows: [{ id: 'bag-1', codigo: 'BAG-000001', status: 'disponivel' }] }),
  })),
}));

import { sql, sqlOne } from '@/lib/db';
import {
  getBags,
  getBagByCodigo,
  createBag,
  getBagKPIs,
  getMovimentacoes,
} from '@/lib/bags';

describe('bags', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getBags returns bags with location name', async () => {
    const rows = [
      { id: '1', codigo: 'BAG-000001', status: 'disponivel', local_atual_nome: 'Loja Centro' },
    ];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getBags();
    expect(result).toEqual(rows);
    expect(sql).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN locais'),
      expect.any(Array)
    );
  });

  it('getBagByCodigo returns a single bag', async () => {
    const row = { id: '1', codigo: 'BAG-000001', status: 'disponivel' };
    vi.mocked(sqlOne).mockResolvedValue(row);
    const result = await getBagByCodigo('BAG-000001');
    expect(result).toEqual(row);
  });

  it('createBag inserts bag and initial movement', async () => {
    const result = await createBag({
      codigo: 'BAG-000001',
      usuario_nome: 'Gustavo',
    });
    expect(result).toBeDefined();
    expect(result.codigo).toBe('BAG-000001');
  });

  it('getBagKPIs returns counts by status', async () => {
    vi.mocked(sql).mockResolvedValue([
      { status: 'disponivel', count: '5' },
      { status: 'em_uso', count: '3' },
      { status: 'extraviada', count: '1' },
    ]);
    const kpis = await getBagKPIs();
    expect(kpis.total_bags).toBe(9);
    expect(kpis.disponiveis).toBe(5);
    expect(kpis.extraviadas).toBe(1);
  });

  it('getMovimentacoes returns recent movements', async () => {
    const rows = [
      { id: '1', bag_id: 'b1', bag_codigo: 'BAG-000001', acao: 'cadastrada', usuario_nome: 'Ana' },
    ];
    vi.mocked(sql).mockResolvedValue(rows);
    const result = await getMovimentacoes({});
    expect(result).toEqual(rows);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/bags.test.ts`
Expected: FAIL — `Cannot find module '@/lib/bags'`

- [ ] **Step 3: Implement bags data access**

Create `lib/bags.ts`:

```typescript
import 'server-only';

import { sql, sqlOne, withTransaction } from '@/lib/db';
import type {
  Bag,
  BagMovimentacao,
  BagKPIData,
  BagStatus,
  BagAcao,
  CreateMovimentacaoInput,
} from '@/types/bags';

export async function getBags(filters?: {
  status?: BagStatus;
  local_id?: string;
  limit?: number;
  offset?: number;
}): Promise<Bag[]> {
  const conditions: string[] = ['b.ativo = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`b.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.local_id) {
    conditions.push(`b.local_atual_id = $${idx++}`);
    params.push(filters.local_id);
  }

  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = Math.max(filters?.offset ?? 0, 0);

  return sql<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.data_cadastro DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function getBagByCodigo(codigo: string): Promise<Bag | null> {
  return sqlOne<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE b.codigo = $1`,
    [codigo]
  );
}

export async function getBagById(id: string): Promise<Bag | null> {
  return sqlOne<Bag>(
    `SELECT b.id, b.codigo, b.tipo, b.status, b.local_atual_id,
            l.nome AS local_atual_nome, b.setor_atual,
            b.data_cadastro::text, b.data_ultima_movimentacao::text, b.ativo
     FROM bags b
     LEFT JOIN locais l ON l.id = b.local_atual_id
     WHERE b.id = $1`,
    [id]
  );
}

const ACAO_TO_STATUS: Partial<Record<BagAcao, BagStatus>> = {
  cadastrada: 'disponivel',
  enviada: 'em_transito',
  recebida: 'disponivel',
  em_uso: 'em_uso',
  devolvida: 'disponivel',
  danificada: 'danificada',
  extraviada: 'extraviada',
  higienizacao: 'disponivel',
  baixada: 'baixada',
};

export async function createBag(input: {
  codigo: string;
  tipo?: string;
  local_atual_id?: string;
  setor_atual?: string;
  usuario_nome: string;
}): Promise<Bag> {
  return withTransaction(async (client) => {
    const { rows: bagRows } = await client.query(
      `INSERT INTO bags (codigo, tipo, local_atual_id, setor_atual, data_ultima_movimentacao)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, codigo, tipo, status, local_atual_id, setor_atual,
                 data_cadastro::text, data_ultima_movimentacao::text, ativo`,
      [input.codigo, input.tipo ?? 'sacola', input.local_atual_id ?? null, input.setor_atual ?? null]
    );
    const bag = bagRows[0];

    await client.query(
      `INSERT INTO bag_movimentacoes (bag_id, acao, local_destino_id, setor, usuario_nome)
       VALUES ($1, 'cadastrada', $2, $3, $4)`,
      [bag.id, input.local_atual_id ?? null, input.setor_atual ?? null, input.usuario_nome]
    );

    return bag as Bag;
  });
}

export async function registrarMovimentacao(input: CreateMovimentacaoInput): Promise<BagMovimentacao> {
  return withTransaction(async (client) => {
    const { rows: bagRows } = await client.query(
      'SELECT id, local_atual_id FROM bags WHERE id = $1 AND ativo = TRUE',
      [input.bag_id]
    );
    if (!bagRows[0]) throw new Error('Bag não encontrada ou inativa.');

    const localOrigemId = bagRows[0].local_atual_id;
    const newStatus = ACAO_TO_STATUS[input.acao] ?? 'disponivel';

    const { rows: movRows } = await client.query(
      `INSERT INTO bag_movimentacoes (bag_id, acao, local_origem_id, local_destino_id, setor, usuario_nome, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, bag_id, acao, local_origem_id, local_destino_id, setor, usuario_nome, observacao, created_at::text`,
      [
        input.bag_id,
        input.acao,
        localOrigemId,
        input.local_destino_id ?? null,
        input.setor ?? null,
        input.usuario_nome,
        input.observacao ?? null,
      ]
    );

    await client.query(
      `UPDATE bags
       SET status = $1,
           local_atual_id = COALESCE($2, local_atual_id),
           setor_atual = $3,
           data_ultima_movimentacao = now(),
           updated_at = now()
       WHERE id = $4`,
      [newStatus, input.local_destino_id ?? null, input.setor ?? null, input.bag_id]
    );

    return movRows[0] as BagMovimentacao;
  });
}

export async function getBagKPIs(): Promise<BagKPIData> {
  const rows = await sql<{ status: BagStatus; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM bags WHERE ativo = TRUE
     GROUP BY status`,
    []
  );

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const n = parseInt(row.count, 10);
    counts[row.status] = n;
    total += n;
  }

  return {
    total_bags: total,
    em_circulacao: (counts['em_uso'] ?? 0) + (counts['em_transito'] ?? 0),
    disponiveis: counts['disponivel'] ?? 0,
    extraviadas: counts['extraviada'] ?? 0,
    danificadas: counts['danificada'] ?? 0,
  };
}

export async function getMovimentacoes(filters: {
  bag_id?: string;
  limit?: number;
  offset?: number;
}): Promise<BagMovimentacao[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.bag_id) {
    conditions.push(`m.bag_id = $${idx++}`);
    params.push(filters.bag_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 50, 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  return sql<BagMovimentacao>(
    `SELECT m.id, m.bag_id, b.codigo AS bag_codigo, m.acao,
            m.local_origem_id, lo.nome AS local_origem_nome,
            m.local_destino_id, ld.nome AS local_destino_nome,
            m.setor, m.usuario_nome, m.observacao, m.created_at::text
     FROM bag_movimentacoes m
     JOIN bags b ON b.id = m.bag_id
     LEFT JOIN locais lo ON lo.id = m.local_origem_id
     LEFT JOIN locais ld ON ld.id = m.local_destino_id
     ${where}
     ORDER BY m.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export function generateBagCode(sequenceNumber: number): string {
  return `BAG-${String(sequenceNumber).padStart(6, '0')}`;
}

export async function getNextBagCode(): Promise<string> {
  const row = await sqlOne<{ max_num: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER))::text AS max_num
     FROM bags WHERE codigo ~ '^BAG-[0-9]+$'`,
    []
  );
  const next = (parseInt(row?.max_num ?? '0', 10) || 0) + 1;
  return generateBagCode(next);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/bags.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/bags.ts lib/bags.test.ts
git commit -m "feat(bags): add bags and movements data access layer"
```

---

### Task 5: Server Actions — Bags

**Files:**
- Create: `actions/bags.ts`

**Interfaces:**
- Consumes: `lib/bags.ts` (`createBag`, `registrarMovimentacao`, `getBagByCodigo`, `getNextBagCode`), `lib/tablet-access.ts` (`canSubmitTabletRecord`), `types/bags.ts` (`BAG_ACOES`, `BagAcao`)
- Produces: `createBagAction(state, formData)`, `registrarMovimentacaoAction(state, formData)`

- [ ] **Step 1: Create server actions**

Create `actions/bags.ts`:

```typescript
'use server';

import { createBag, registrarMovimentacao, getBagByCodigo, getNextBagCode } from '@/lib/bags';
import { canSubmitTabletRecord } from '@/lib/tablet-access';
import { BAG_ACOES } from '@/types/bags';
import type { BagAcao } from '@/types/bags';

interface ActionResult {
  success: boolean;
  error?: string;
  codigo?: string;
}

export async function createBagAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const responsavel = (formData.get('responsavel') as string)?.trim();
  if (!responsavel || responsavel.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  const localId = (formData.get('local_id') as string) || undefined;
  const setor = (formData.get('setor') as string)?.trim() || undefined;
  const quantidadeRaw = formData.get('quantidade') as string;
  const quantidade = Math.min(Math.max(parseInt(quantidadeRaw, 10) || 1, 1), 100);

  try {
    const codigos: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      const codigo = await getNextBagCode();
      await createBag({
        codigo,
        local_atual_id: localId,
        setor_atual: setor,
        usuario_nome: responsavel,
      });
      codigos.push(codigo);
    }
    return {
      success: true,
      codigo: quantidade === 1 ? codigos[0] : `${codigos[0]} a ${codigos[codigos.length - 1]}`,
    };
  } catch (err) {
    console.error('createBagAction error:', err);
    return { success: false, error: 'Erro ao cadastrar bag. Tente novamente.' };
  }
}

export async function registrarMovimentacaoAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const codigo = (formData.get('codigo') as string)?.trim();
  if (!codigo) {
    return { success: false, error: 'Escaneie ou informe o código da bag.' };
  }

  const acao = formData.get('acao') as BagAcao;
  if (!BAG_ACOES.includes(acao)) {
    return { success: false, error: 'Selecione uma ação válida.' };
  }

  const responsavel = (formData.get('responsavel') as string)?.trim();
  if (!responsavel || responsavel.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  const localDestinoId = (formData.get('local_destino_id') as string) || undefined;
  const setor = (formData.get('setor') as string)?.trim() || undefined;
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return { success: false, error: `Bag "${codigo}" não encontrada.` };
    }

    await registrarMovimentacao({
      bag_id: bag.id,
      acao,
      local_destino_id: localDestinoId,
      setor,
      usuario_nome: responsavel,
      observacao,
    });

    return { success: true, codigo };
  } catch (err) {
    console.error('registrarMovimentacaoAction error:', err);
    return { success: false, error: 'Erro ao registrar movimentação. Tente novamente.' };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/bags.ts
git commit -m "feat(bags): add server actions for bag creation and movement"
```

---

### Task 6: API Routes — Bags and Locations

**Files:**
- Create: `app/api/bags/route.ts`
- Create: `app/api/bags/[codigo]/route.ts`
- Create: `app/api/bags/[codigo]/movimentacoes/route.ts`
- Create: `app/api/locations/route.ts`

**Interfaces:**
- Consumes: `lib/bags.ts` (all query functions), `lib/locations.ts` (all functions), `lib/auth.ts` (`auth`), `lib/access-control.ts` (`hasPermission`)
- Produces: REST endpoints `GET /api/bags`, `GET /api/bags/[codigo]`, `GET /api/bags/[codigo]/movimentacoes`, `GET /api/locations`

- [ ] **Step 1: Create bags list endpoint**

Create `app/api/bags/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBags, getBagKPIs } from '@/lib/bags';
import type { BagStatus } from '@/types/bags';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as BagStatus | null;
  const localId = searchParams.get('local_id');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const kpis = searchParams.get('kpis') === 'true';

  try {
    if (kpis) {
      const data = await getBagKPIs();
      return NextResponse.json({ kpis: data });
    }
    const bags = await getBags({
      status: status ?? undefined,
      local_id: localId ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json({ bags });
  } catch (err) {
    console.error('GET /api/bags error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create single bag endpoint**

Create `app/api/bags/[codigo]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBagByCodigo } from '@/lib/bags';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { codigo } = await params;

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ bag });
  } catch (err) {
    console.error('GET /api/bags/[codigo] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create movements endpoint**

Create `app/api/bags/[codigo]/movimentacoes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getBagByCodigo, getMovimentacoes } from '@/lib/bags';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { codigo } = await params;
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return NextResponse.json({ error: 'Bag não encontrada' }, { status: 404 });
    }
    const movimentacoes = await getMovimentacoes({ bag_id: bag.id, limit, offset });
    return NextResponse.json({ bag, movimentacoes });
  } catch (err) {
    console.error('GET /api/bags/[codigo]/movimentacoes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create locations endpoint**

Create `app/api/locations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { getLocais } from '@/lib/locations';

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'bags:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const locais = await getLocais();
    return NextResponse.json({ locais });
  } catch (err) {
    console.error('GET /api/locations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/bags/ app/api/locations/
git commit -m "feat(bags): add API routes for bags, movements, and locations"
```

---

### Task 7: Tablet UI — Bag Registration Page

**Files:**
- Create: `components/tablet/BagActionSelector.tsx`
- Create: `components/tablet/LocationSelector.tsx`
- Create: `app/tablet/bags/page.tsx`

**Interfaces:**
- Consumes: `actions/bags.ts` (`createBagAction`, `registrarMovimentacaoAction`), `lib/locations.ts` (`getLocais`), `types/bags.ts` (`BAG_ACOES`, `BAG_ACAO_LABELS`, `BagAcao`, `Local`)
- Produces: pages at `/tablet/bags` (main bag tablet UI)

- [ ] **Step 1: Create LocationSelector component**

Create `components/tablet/LocationSelector.tsx`:

```tsx
'use client';

import type { Local } from '@/types/bags';

interface LocationSelectorProps {
  locais: Local[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
}

export function LocationSelector({ locais, value, onChange, name = 'local_id' }: LocationSelectorProps) {
  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">Local</p>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 text-xl appearance-none focus:border-green-500 outline-none"
      >
        <option value="">Selecionar local...</option>
        {locais.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome} ({l.tipo})
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create BagActionSelector component**

Create `components/tablet/BagActionSelector.tsx`:

```tsx
'use client';

import { BAG_ACOES, BAG_ACAO_LABELS } from '@/types/bags';
import type { BagAcao } from '@/types/bags';

const ACAO_COLORS: Record<BagAcao, string> = {
  cadastrada: 'bg-blue-100 border-blue-400 text-blue-800',
  enviada: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  recebida: 'bg-green-100 border-green-400 text-green-800',
  em_uso: 'bg-purple-100 border-purple-400 text-purple-800',
  devolvida: 'bg-teal-100 border-teal-400 text-teal-800',
  danificada: 'bg-red-100 border-red-400 text-red-800',
  extraviada: 'bg-orange-100 border-orange-400 text-orange-800',
  higienizacao: 'bg-cyan-100 border-cyan-400 text-cyan-800',
  baixada: 'bg-gray-100 border-gray-400 text-gray-800',
};

const MOVEMENT_ACOES = BAG_ACOES.filter((a) => a !== 'cadastrada');

interface BagActionSelectorProps {
  value: BagAcao | '';
  onChange: (value: BagAcao) => void;
}

export function BagActionSelector({ value, onChange }: BagActionSelectorProps) {
  return (
    <div>
      <p className="text-lg font-bold text-green-800 mb-3">Ação</p>
      <div className="grid grid-cols-2 gap-3">
        {MOVEMENT_ACOES.map((acao) => (
          <button
            key={acao}
            type="button"
            onClick={() => onChange(acao)}
            className={`border-2 rounded-2xl p-4 text-lg font-semibold transition-all ${
              value === acao
                ? ACAO_COLORS[acao]
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {BAG_ACAO_LABELS[acao]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the tablet bags page**

Create `app/tablet/bags/page.tsx`:

```tsx
'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { registrarMovimentacaoAction } from '@/actions/bags';
import { BagActionSelector } from '@/components/tablet/BagActionSelector';
import { LocationSelector } from '@/components/tablet/LocationSelector';
import type { BagAcao, Local } from '@/types/bags';

const INITIAL_STATE = { success: false, error: undefined, codigo: undefined };
const IDLE_RESET_MS = 90_000;

export default function TabletBagsPage() {
  const [codigo, setCodigo] = useState('');
  const [acao, setAcao] = useState<BagAcao | ''>('');
  const [responsavel, setResponsavel] = useState('');
  const [localDestinoId, setLocalDestinoId] = useState('');
  const [setor, setSetor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [locais, setLocais] = useState<Local[]>([]);
  const [activity, setActivity] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(registrarMovimentacaoAction, INITIAL_STATE);

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((data) => setLocais(data.locais ?? []))
      .catch(() => {});
  }, []);

  const resetForm = useCallback(() => {
    setCodigo('');
    setAcao('');
    setResponsavel('');
    setLocalDestinoId('');
    setSetor('');
    setObservacao('');
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(resetForm, 2500);
    return () => clearTimeout(timer);
  }, [state.success, resetForm]);

  const isDirty = codigo !== '' || acao !== '' || responsavel !== '';
  useEffect(() => {
    if (!isDirty || isPending || state.success) return;
    const timer = setTimeout(resetForm, IDLE_RESET_MS);
    return () => clearTimeout(timer);
  }, [isDirty, isPending, state.success, activity, resetForm]);

  const bumpActivity = useCallback(() => setActivity((a) => a + 1), []);

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-blue-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">📦 Movimentação de Bag</h1>
        <p className="text-blue-100 text-base mt-1">
          Escaneie o QR Code ou digite o código da bag
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        onPointerDown={bumpActivity}
        onKeyDown={bumpActivity}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        <input type="hidden" name="acao" value={acao} />
        <input type="hidden" name="local_destino_id" value={localDestinoId} />

        {/* Código da bag */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">1. Código da Bag *</p>
          <input
            name="codigo"
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="BAG-000001"
            autoComplete="off"
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-blue-500 outline-none text-xl font-mono tracking-wider"
          />
        </div>

        {/* Ação */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">2. Ação *</p>
          <BagActionSelector value={acao} onChange={setAcao} />
        </div>

        {/* Local destino */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">3. Local de Destino</p>
          <LocationSelector
            locais={locais}
            value={localDestinoId}
            onChange={setLocalDestinoId}
            name="local_destino_id_display"
          />
        </div>

        {/* Setor */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">4. Setor</p>
          <input
            name="setor"
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            placeholder="Ex: Expedição, Recepção..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-blue-500 outline-none text-xl"
          />
        </div>

        {/* Responsável */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">5. Responsável *</p>
          <input
            name="responsavel"
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-blue-500 outline-none text-xl"
          />
        </div>

        {/* Observação */}
        <div>
          <p className="text-lg font-bold text-blue-800 mb-3">6. Observação</p>
          <textarea
            name="observacao"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-blue-500 outline-none text-lg resize-none"
          />
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            ✓ Movimentação registrada — {state.codigo}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || state.success}
          className="w-full bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
        >
          {isPending ? 'Salvando...' : state.success ? '✓ Registrado!' : '✓ Confirmar Movimentação'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/tablet/BagActionSelector.tsx components/tablet/LocationSelector.tsx app/tablet/bags/page.tsx
git commit -m "feat(bags): add tablet UI for bag movement registration"
```

---

### Task 8: Tablet UI — Bag Cadastro and Home Navigation

**Files:**
- Create: `app/tablet/bags/cadastro/page.tsx`
- Modify: `app/tablet/page.tsx` (or create a new hub page)
- Create: `app/tablet/bags/consulta/page.tsx`

**Interfaces:**
- Consumes: `actions/bags.ts` (`createBagAction`), `lib/locations.ts` (`getLocais`), `lib/bags.ts` (`getBagByCodigo`, `getMovimentacoes`)
- Produces: pages at `/tablet/bags/cadastro`, `/tablet/bags/consulta`; updated tablet home with module navigation

- [ ] **Step 1: Create bag registration (cadastro) page**

Create `app/tablet/bags/cadastro/page.tsx`:

```tsx
'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { createBagAction } from '@/actions/bags';
import { LocationSelector } from '@/components/tablet/LocationSelector';
import type { Local } from '@/types/bags';

const INITIAL_STATE = { success: false, error: undefined, codigo: undefined };

export default function CadastroBagPage() {
  const [localId, setLocalId] = useState('');
  const [setor, setSetor] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [locais, setLocais] = useState<Local[]>([]);

  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createBagAction, INITIAL_STATE);

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((data) => setLocais(data.locais ?? []))
      .catch(() => {});
  }, []);

  const resetForm = useCallback(() => {
    setLocalId('');
    setSetor('');
    setResponsavel('');
    setQuantidade(1);
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(resetForm, 3000);
    return () => clearTimeout(timer);
  }, [state.success, resetForm]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="bg-emerald-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">➕ Cadastrar Bags</h1>
        <p className="text-emerald-100 text-base mt-1">
          O código será gerado automaticamente
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        <input type="hidden" name="local_id" value={localId} />

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">1. Quantidade</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl text-3xl font-bold text-gray-600"
            >
              −
            </button>
            <input
              name="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 text-center bg-white border-2 border-gray-200 rounded-2xl p-4 text-3xl font-bold text-gray-800 outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(100, q + 1))}
              className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl text-3xl font-bold text-gray-600"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">2. Local Inicial</p>
          <LocationSelector
            locais={locais}
            value={localId}
            onChange={setLocalId}
            name="local_id_display"
          />
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">3. Setor</p>
          <input
            name="setor"
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            placeholder="Ex: Expedição..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-emerald-500 outline-none text-xl"
          />
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">4. Responsável *</p>
          <input
            name="responsavel"
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-emerald-500 outline-none text-xl"
          />
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            ✓ Bag cadastrada — {state.codigo}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || state.success}
          className="w-full bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
        >
          {isPending ? 'Cadastrando...' : state.success ? '✓ Cadastrado!' : '✓ Cadastrar Bag'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create bag consulta page**

Create `app/tablet/bags/consulta/page.tsx`:

```tsx
import { getBagByCodigo, getMovimentacoes } from '@/lib/bags';
import { BAG_STATUS_LABELS, BAG_ACAO_LABELS } from '@/types/bags';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ codigo?: string }>;
}

export default async function ConsultaBagPage({ searchParams }: PageProps) {
  const { codigo } = await searchParams;

  const bag = codigo ? await getBagByCodigo(codigo) : null;
  const movimentacoes = bag ? await getMovimentacoes({ bag_id: bag.id, limit: 20 }) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">🔍 Consultar Bag</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <form className="flex gap-3">
          <input
            name="codigo"
            type="text"
            defaultValue={codigo ?? ''}
            placeholder="BAG-000001"
            className="flex-1 bg-white border-2 border-gray-200 rounded-2xl p-5 text-xl font-mono tracking-wider outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="bg-slate-600 text-white rounded-2xl px-8 text-xl font-bold"
          >
            Buscar
          </button>
        </form>

        {codigo && !bag && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-5 text-lg text-center">
            Bag "{codigo}" não encontrada.
          </div>
        )}

        {bag && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold font-mono">{bag.codigo}</span>
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {BAG_STATUS_LABELS[bag.status]}
              </span>
            </div>
            {bag.local_atual_nome && (
              <p className="text-lg text-gray-600">
                Local: <strong>{bag.local_atual_nome}</strong>
                {bag.setor_atual && ` — ${bag.setor_atual}`}
              </p>
            )}
          </div>
        )}

        {movimentacoes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Histórico</h2>
            {movimentacoes.map((m) => (
              <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {BAG_ACAO_LABELS[m.acao]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {m.usuario_nome}
                  {m.local_destino_nome && ` → ${m.local_destino_nome}`}
                  {m.setor && ` (${m.setor})`}
                </p>
                {m.observacao && (
                  <p className="text-sm text-gray-400 mt-1">{m.observacao}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/tablet"
          className="block text-center text-blue-600 underline text-lg mt-4"
        >
          ← Voltar ao menu
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add tablet home navigation hub**

Replace the entire content of `app/tablet/page.tsx` with a hub that shows both recycling and bags options. The original recycling form moves to `/tablet/reciclagem`:

First, create `app/tablet/reciclagem/page.tsx` by moving the current `app/tablet/page.tsx` content there (exact copy, no changes to the component itself).

Then replace `app/tablet/page.tsx` with:

```tsx
import Link from 'next/link';

export default function TabletHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-green-600 text-white px-6 py-8 text-center">
        <h1 className="text-4xl font-bold">♻ EcoTracker</h1>
        <p className="text-green-100 text-lg mt-2">
          Plataforma de Reciclagem e Rastreabilidade
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-2xl grid grid-cols-2 gap-5">
          <Link
            href="/tablet/reciclagem"
            className="bg-green-500 active:bg-green-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">♻</span>
            <span className="text-2xl font-bold block">Registrar Reciclagem</span>
            <span className="text-green-100 text-base mt-1 block">Peso e materiais</span>
          </Link>

          <Link
            href="/tablet/bags"
            className="bg-blue-500 active:bg-blue-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">📦</span>
            <span className="text-2xl font-bold block">Movimentar Bag</span>
            <span className="text-blue-100 text-base mt-1 block">Entrada e saída</span>
          </Link>

          <Link
            href="/tablet/bags/cadastro"
            className="bg-emerald-500 active:bg-emerald-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">➕</span>
            <span className="text-2xl font-bold block">Cadastrar Bag</span>
            <span className="text-emerald-100 text-base mt-1 block">Nova bag no sistema</span>
          </Link>

          <Link
            href="/tablet/bags/consulta"
            className="bg-slate-500 active:bg-slate-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">🔍</span>
            <span className="text-2xl font-bold block">Consultar Bag</span>
            <span className="text-slate-100 text-base mt-1 block">Status e histórico</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/tablet/bags/ app/tablet/reciclagem/ app/tablet/page.tsx
git commit -m "feat(bags): add tablet hub, cadastro, consulta, and move reciclagem to sub-route"
```

---

### Task 9: Dashboard — Bags Overview Page

**Files:**
- Create: `components/dashboard/BagKPICards.tsx`
- Create: `components/dashboard/BagMovementsTable.tsx`
- Create: `app/dashboard/bags/page.tsx`
- Modify: `app/dashboard/layout.tsx` (add nav link)

**Interfaces:**
- Consumes: `lib/bags.ts` (`getBagKPIs`, `getBags`, `getMovimentacoes`), `types/bags.ts` (all label maps)
- Produces: dashboard page at `/dashboard/bags`; nav link in dashboard header

- [ ] **Step 1: Create BagKPICards component**

Create `components/dashboard/BagKPICards.tsx`:

```tsx
import type { BagKPIData } from '@/types/bags';

interface BagKPICardsProps {
  kpis: BagKPIData;
}

const cards = [
  { key: 'total_bags', label: 'Total de Bags', color: 'text-blue-600' },
  { key: 'em_circulacao', label: 'Em Circulação', color: 'text-purple-600' },
  { key: 'disponiveis', label: 'Disponíveis', color: 'text-green-600' },
  { key: 'extraviadas', label: 'Extraviadas', color: 'text-orange-600' },
  { key: 'danificadas', label: 'Danificadas', color: 'text-red-600' },
] as const;

export function BagKPICards({ kpis }: BagKPICardsProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {kpis[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create BagMovementsTable component**

Create `components/dashboard/BagMovementsTable.tsx`:

```tsx
import type { BagMovimentacao } from '@/types/bags';
import { BAG_ACAO_LABELS } from '@/types/bags';

interface BagMovementsTableProps {
  movimentacoes: BagMovimentacao[];
}

export function BagMovementsTable({ movimentacoes }: BagMovementsTableProps) {
  if (!movimentacoes.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nenhuma movimentação registrada.</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Bag</th>
            <th className="px-4 py-3 font-medium">Ação</th>
            <th className="px-4 py-3 font-medium">Destino</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movimentacoes.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{m.bag_codigo}</td>
              <td className="px-4 py-3">{BAG_ACAO_LABELS[m.acao]}</td>
              <td className="px-4 py-3 text-gray-600">{m.local_destino_nome ?? '—'}</td>
              <td className="px-4 py-3">{m.usuario_nome}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(m.created_at).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard bags page**

Create `app/dashboard/bags/page.tsx`:

```tsx
import { Suspense } from 'react';
import { getBagKPIs, getBags, getMovimentacoes } from '@/lib/bags';
import { BagKPICards } from '@/components/dashboard/BagKPICards';
import { BagMovementsTable } from '@/components/dashboard/BagMovementsTable';
import { BAG_STATUS_LABELS } from '@/types/bags';
import Link from 'next/link';

async function BagsContent() {
  const [kpis, bags, movimentacoes] = await Promise.all([
    getBagKPIs(),
    getBags({ limit: 20 }),
    getMovimentacoes({ limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <BagKPICards kpis={kpis} />

      <div className="grid grid-cols-2 gap-4">
        {/* Bags list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Bags Recentes</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bags.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{b.codigo}</td>
                  <td className="px-4 py-2">{BAG_STATUS_LABELS[b.status]}</td>
                  <td className="px-4 py-2 text-gray-600">{b.local_atual_nome ?? '—'}</td>
                </tr>
              ))}
              {!bags.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma bag cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent movements */}
        <div>
          <div className="px-1 py-3">
            <h2 className="font-semibold text-gray-800">Movimentações Recentes</h2>
          </div>
          <BagMovementsTable movimentacoes={movimentacoes} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardBagsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Painel de Bags</h1>
      </div>
      <Suspense
        fallback={
          <div className="text-center py-12 text-gray-400 text-sm">Carregando dados...</div>
        }
      >
        <BagsContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Add Bags nav link to dashboard layout**

In `app/dashboard/layout.tsx`, add a nav link for Bags after the existing links. Inside the `<nav>` element, add:

```tsx
{hasPermission(session.user.role, 'bags:view') && (
  <Link href="/dashboard/bags" className="text-gray-600 hover:text-green-700 font-medium">
    Bags
  </Link>
)}
```

Also update the header brand text from `♻ EcoTracker` to `♻ EcoTracker` (keep as is — brand name stays the same).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/BagKPICards.tsx components/dashboard/BagMovementsTable.tsx app/dashboard/bags/ app/dashboard/layout.tsx
git commit -m "feat(bags): add dashboard bags page with KPIs and movement history"
```

---

### Task 10: Integration Testing and Verification

**Files:**
- No new files — verify existing work

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified working system

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including new `lib/bags.test.ts` and `lib/locations.test.ts`

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build completes successfully with no errors

- [ ] **Step 5: Start dev server and verify tablet hub**

Run: `npm run dev`

Navigate to `http://localhost:3001/tablet` — should show the 4-button hub:
- Registrar Reciclagem → `/tablet/reciclagem`
- Movimentar Bag → `/tablet/bags`
- Cadastrar Bag → `/tablet/bags/cadastro`
- Consultar Bag → `/tablet/bags/consulta`

- [ ] **Step 6: Verify dashboard bags link**

Navigate to `http://localhost:3001/dashboard` — should show "Bags" in the nav bar.
Click "Bags" → should show the bags dashboard with KPI cards (all zeros if no data).

- [ ] **Step 7: Commit any fixes**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix(bags): address integration issues found during verification"
```
