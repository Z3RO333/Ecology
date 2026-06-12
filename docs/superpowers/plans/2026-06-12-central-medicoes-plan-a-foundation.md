# Central de Medições — Plano A: Fundação Postgres + Login de Fornecedor (senha)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o app ao PostgreSQL existente e permitir que um fornecedor cadastrado pelo admin faça 1º acesso (define senha) e login, com sessão escopada em `/fornecedor`.

**Architecture:** Camada de dados `pg` (pool singleton) + funções tipadas. Login de fornecedor via NextAuth Credentials (bcrypt) coexistindo com o Entra ID interno. Allowlist `supplier_allowed_emails` controla quem pode criar conta. Admin gerencia fornecedores e e-mails pelo `/dashboard`.

**Tech Stack:** Next.js 15 (App Router), NextAuth v5, `pg`, `bcryptjs`, PostgreSQL (`ecotracker-pg.postgres.database.azure.com`), Vitest para testes de unidade.

**Spec:** `docs/superpowers/specs/2026-06-11-central-medicoes-design.md` (§3, §4, §7).

**Pré-requisitos de ambiente (em `.env` e App Settings):**
- `DATABASE_URL=postgres://<user>:<pass>@ecotracker-pg.postgres.database.azure.com:5432/<db>?sslmode=require`
- `APP_ADMIN_EMAILS` já configurado (admin existente).

---

## Task 1: Dependências e runner de teste

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar libs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs vitest
```

- [ ] **Step 2: Adicionar script de teste**

Em `package.json`, no bloco `"scripts"`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Config do Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['**/*.test.ts'] },
});
```

```bash
npm install -D vite-tsconfig-paths
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add bcryptjs and vitest for supplier auth"
```

---

## Task 2: Migração 002 — senha de fornecedor

**Files:**
- Create: `docs/sql/002_supplier_auth.sql`

- [ ] **Step 1: Escrever a migração**

```sql
-- Suppliers authenticate by password (no external IdP). Add the hash column and
-- relax external_subject so password users don't need a federated subject.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_users ALTER COLUMN external_subject DROP NOT NULL;

-- external_subject stays unique only when present.
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_external_subject_key;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_external_subject_key
  ON app_users (external_subject) WHERE external_subject IS NOT NULL;

-- A supplier user must have either a password or an external subject.
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_auth_method_chk;
ALTER TABLE app_users ADD CONSTRAINT app_users_auth_method_chk
  CHECK (password_hash IS NOT NULL OR external_subject IS NOT NULL);
```

- [ ] **Step 2: Aplicar (001 + 002) no banco**

A migração roda via o script existente (que aplica `001`). Para aplicar a 002, rodar:

```bash
# DATABASE_URL deve estar no ambiente
node scripts/migrate-platform.mjs            # aplica 001 (idempotente)
psql "$env:DATABASE_URL" -f docs/sql/002_supplier_auth.sql   # PowerShell
```

Expected: `ALTER TABLE` / `CREATE INDEX` sem erro (idempotente).

- [ ] **Step 3: Commit**

```bash
git add docs/sql/002_supplier_auth.sql
git commit -m "feat(db): add password_hash to app_users for supplier login"
```

---

## Task 3: Camada de acesso ao Postgres (`lib/db.ts`)

**Files:**
- Create: `lib/db.ts`
- Test: `lib/db.test.ts`

- [ ] **Step 1: Implementar o pool + helper**

```ts
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
```

- [ ] **Step 2: Teste de fumaça (parâmetros)**

`lib/db.test.ts` — testa só a montagem do helper sem banco real, validando que `sqlOne` retorna o primeiro elemento. Usamos um mock do módulo `pg`.

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('pg', () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ n: 1 }, { n: 2 }] });
  return { Pool: vi.fn(() => ({ query })) };
});

describe('sqlOne', () => {
  it('returns the first row', async () => {
    const { sqlOne } = await import('./db');
    const row = await sqlOne<{ n: number }>('SELECT 1');
    expect(row).toEqual({ n: 1 });
  });
});
```

- [ ] **Step 3: Rodar o teste**

```bash
npm test -- lib/db.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts lib/db.test.ts
git commit -m "feat(db): add pg pool and typed sql helpers"
```

---

## Task 4: Acesso a dados de fornecedor (`lib/suppliers.ts`)

**Files:**
- Create: `lib/suppliers.ts`
- Test: `lib/suppliers.test.ts`

- [ ] **Step 1: Tipos + funções de leitura/escrita**

```ts
import 'server-only';
import bcrypt from 'bcryptjs';
import { sql, sqlOne } from '@/lib/db';

export interface Supplier { id: string; legal_name: string; trade_name: string | null; cnpj: string | null; active: boolean; }
export interface SupplierUser { id: string; email: string; supplier_id: string; has_password: boolean; active: boolean; }

const BCRYPT_COST = 12;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Returns the supplier_id an email is allowed to register under, or null.
export async function allowedSupplierIdForEmail(email: string): Promise<string | null> {
  const row = await sqlOne<{ supplier_id: string }>(
    `SELECT supplier_id FROM supplier_allowed_emails WHERE email = $1 AND active = TRUE`,
    [normalizeEmail(email)]
  );
  return row?.supplier_id ?? null;
}

export async function getSupplierUser(email: string): Promise<(SupplierUser & { password_hash: string | null }) | null> {
  return sqlOne(
    `SELECT id, email::text AS email, supplier_id, password_hash,
            (password_hash IS NOT NULL) AS has_password, active
     FROM app_users WHERE email = $1 AND role = 'supplier'`,
    [normalizeEmail(email)]
  );
}

// First access: create the supplier app_user with a password.
export async function createSupplierPassword(email: string, password: string): Promise<SupplierUser> {
  const normalized = normalizeEmail(email);
  const supplierId = await allowedSupplierIdForEmail(normalized);
  if (!supplierId) throw new Error('E-mail não autorizado.');
  const existing = await getSupplierUser(normalized);
  if (existing?.password_hash) throw new Error('Conta já possui senha.');
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const row = await sqlOne<SupplierUser>(
    `INSERT INTO app_users (external_subject, email, role, supplier_id, password_hash)
     VALUES (NULL, $1, 'supplier', $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email::text AS email, supplier_id, (password_hash IS NOT NULL) AS has_password, active`,
    [normalized, supplierId, hash]
  );
  return row!;
}

export async function verifySupplierPassword(email: string, password: string): Promise<SupplierUser | null> {
  const user = await getSupplierUser(email);
  if (!user?.password_hash || !user.active) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email, supplier_id: user.supplier_id, has_password: true, active: user.active };
}

// Admin operations.
export async function listSuppliers(): Promise<Supplier[]> {
  return sql<Supplier>(`SELECT id, legal_name, trade_name, cnpj, active FROM suppliers ORDER BY legal_name`);
}

export async function createSupplier(legalName: string, cnpj: string | null): Promise<Supplier> {
  const row = await sqlOne<Supplier>(
    `INSERT INTO suppliers (legal_name, cnpj) VALUES ($1, $2)
     RETURNING id, legal_name, trade_name, cnpj, active`,
    [legalName, cnpj]
  );
  return row!;
}

export async function addAllowedEmail(supplierId: string, email: string): Promise<void> {
  await sql(
    `INSERT INTO supplier_allowed_emails (supplier_id, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET active = TRUE, supplier_id = EXCLUDED.supplier_id`,
    [supplierId, normalizeEmail(email)]
  );
}
```

- [ ] **Step 2: Teste de `normalizeEmail`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './suppliers';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Wander@Bemol.COM.br ')).toBe('wander@bemol.com.br');
  });
});
```

- [ ] **Step 3: Rodar**

```bash
npm test -- lib/suppliers.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/suppliers.ts lib/suppliers.test.ts
git commit -m "feat(suppliers): data access for supplier accounts and allowlist"
```

---

## Task 5: Provider Credentials no NextAuth

**Files:**
- Modify: `lib/auth.ts`
- Modify: `types/next-auth.d.ts`

- [ ] **Step 1: Estender os tipos com `supplierId`**

Em `types/next-auth.d.ts`, dentro de `Session.user` adicionar `supplierId?: string;` e no `JWT` adicionar `supplierId?: string;`.

```ts
declare module 'next-auth' {
  interface Session { user: { role: AppRole; supplierId?: string } & DefaultSession['user']; }
}
declare module 'next-auth/jwt' {
  interface JWT { role?: AppRole; supplierId?: string; }
}
```

- [ ] **Step 2: Adicionar o provider Credentials + propagar role/supplierId**

Em `lib/auth.ts`:
- importar `Credentials from 'next-auth/providers/credentials'` e `verifySupplierPassword from '@/lib/suppliers'`;
- adicionar ao array `providers`:

```ts
Credentials({
  id: 'supplier-password',
  name: 'Fornecedor',
  credentials: { email: {}, password: {} },
  async authorize(creds) {
    const email = String(creds?.email ?? '');
    const password = String(creds?.password ?? '');
    if (!email || !password) return null;
    const user = await verifySupplierPassword(email, password);
    if (!user) return null;
    return { id: user.id, email: user.email, role: 'supplier', supplierId: user.supplier_id } as never;
  },
}),
```

- no callback `jwt`, preservar role/supplierId vindos do `user` no login Credentials:

```ts
jwt({ token, user, profile }) {
  if (user && (user as { role?: AppRole }).role) {
    token.role = (user as { role?: AppRole }).role;
    token.supplierId = (user as { supplierId?: string }).supplierId;
    return token;
  }
  const email = (profile as EntraProfile | undefined)?.email ?? token.email;
  if (email) token.role = resolveInternalRole(email) ?? undefined;
  return token;
}
```

- no `session`, repassar `supplierId`:

```ts
session({ session, token }) {
  if (session.user && isAppRole(token.role)) session.user.role = token.role;
  if (session.user) session.user.supplierId = token.supplierId;
  return session;
}
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts types/next-auth.d.ts
git commit -m "feat(auth): supplier password credentials provider with role/supplierId"
```

---

## Task 6: Proteção de rota `/fornecedor`

**Files:**
- Modify: `proxy.ts` (middleware do Next 16; criar se não existir)

- [ ] **Step 1: Garantir bloqueio por papel**

`proxy.ts` deve, para `/fornecedor/:path*` (exceto `/fornecedor/login` e `/fornecedor/primeiro-acesso`), exigir sessão com `role === 'supplier'`; caso contrário redirecionar para `/fornecedor/login`. Para `/dashboard/:path*` mantém a exigência de papel interno (admin/manager/operational). Usar `auth` do NextAuth como wrapper.

```ts
export { auth as proxy } from '@/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/fornecedor/:path*'],
};
```

E em `lib/auth.ts`, no callback `authorized` (adicionar ao objeto `callbacks`):

```ts
authorized({ auth: session, request }) {
  const { pathname } = request.nextUrl;
  const role = session?.user?.role;
  if (pathname.startsWith('/fornecedor')) {
    if (pathname.startsWith('/fornecedor/login') || pathname.startsWith('/fornecedor/primeiro-acesso')) return true;
    return role === 'supplier';
  }
  if (pathname.startsWith('/dashboard')) {
    return role === 'admin' || role === 'manager' || role === 'operational';
  }
  return true;
},
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts lib/auth.ts
git commit -m "feat(auth): protect /fornecedor by supplier role"
```

---

## Task 7: Páginas de 1º acesso e login do fornecedor

**Files:**
- Create: `app/fornecedor/login/page.tsx`
- Create: `app/fornecedor/primeiro-acesso/page.tsx`
- Create: `actions/supplier-auth.ts`

- [ ] **Step 1: Server actions**

`actions/supplier-auth.ts`:

```ts
'use server';
import { signIn } from '@/lib/auth';
import { createSupplierPassword, getSupplierUser, allowedSupplierIdForEmail } from '@/lib/suppliers';

interface Result { error?: string }

export async function firstAccess(_prev: Result, form: FormData): Promise<Result> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password.length < 8) return { error: 'A senha deve ter ao menos 8 caracteres.' };
  if (password !== confirm) return { error: 'As senhas não conferem.' };
  if (!(await allowedSupplierIdForEmail(email))) return { error: 'E-mail não autorizado.' };
  const existing = await getSupplierUser(email);
  if (existing?.has_password) return { error: 'Conta já existe. Faça login.' };
  try {
    await createSupplierPassword(email, password);
  } catch {
    return { error: 'Não foi possível criar a conta.' };
  }
  await signIn('supplier-password', { email, password, redirectTo: '/fornecedor' });
  return {};
}

export async function supplierLogin(_prev: Result, form: FormData): Promise<Result> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  try {
    await signIn('supplier-password', { email, password, redirectTo: '/fornecedor' });
  } catch {
    return { error: 'E-mail ou senha inválidos.' };
  }
  return {};
}
```

> Nota: `signIn` lança um redirect — não envolver em try/catch que engula o `NEXT_REDIRECT`. Reagir só ao erro de credencial (checar `error instanceof Error && error.message !== 'NEXT_REDIRECT'` ou usar a forma `redirect: false` e redirecionar manualmente). O implementador deve usar o padrão do NextAuth v5 da versão instalada (ver `node_modules/next-auth/lib/actions`).

- [ ] **Step 2: Página de login**

`app/fornecedor/login/page.tsx` — client component com `useActionState(supplierLogin)`, campos e-mail/senha, link para `/fornecedor/primeiro-acesso`. Visual claro (reaproveitar paleta verde). Mostra `state.error`.

- [ ] **Step 3: Página de 1º acesso**

`app/fornecedor/primeiro-acesso/page.tsx` — `useActionState(firstAccess)`, campos e-mail, senha, confirmar senha. Mensagem de erro/sucesso.

- [ ] **Step 4: Verificar compilação + smoke manual**

```bash
npx tsc --noEmit
npm run dev
```

Manual: com um e-mail inserido na allowlist (Task 8), acessar `/fornecedor/primeiro-acesso`, definir senha, confirmar redirecionamento para `/fornecedor`.

- [ ] **Step 5: Commit**

```bash
git add app/fornecedor/login app/fornecedor/primeiro-acesso actions/supplier-auth.ts
git commit -m "feat(fornecedor): first-access and login pages"
```

---

## Task 8: Admin — cadastro de fornecedores e e-mails

**Files:**
- Create: `app/dashboard/fornecedores/page.tsx`
- Create: `actions/suppliers-admin.ts`
- Modify: `app/dashboard/layout.tsx` (link de nav "Fornecedores")

- [ ] **Step 1: Server actions com guarda de permissão**

`actions/suppliers-admin.ts`:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { isAuthorized } from '@/lib/authorization';
import { createSupplier, addAllowedEmail } from '@/lib/suppliers';

export async function addSupplierAction(_prev: { error?: string }, form: FormData) {
  if (!(await isAuthorized('suppliers:manage'))) return { error: 'Sem permissão.' };
  const name = String(form.get('legal_name') ?? '').trim();
  const cnpj = (String(form.get('cnpj') ?? '').replace(/\D/g, '') || null);
  if (name.length < 2) return { error: 'Informe a razão social.' };
  await createSupplier(name, cnpj);
  revalidatePath('/dashboard/fornecedores');
  return {};
}

export async function addAllowedEmailAction(_prev: { error?: string }, form: FormData) {
  if (!(await isAuthorized('suppliers:manage'))) return { error: 'Sem permissão.' };
  const supplierId = String(form.get('supplier_id') ?? '');
  const email = String(form.get('email') ?? '');
  if (!supplierId || !email.includes('@')) return { error: 'Dados inválidos.' };
  await addAllowedEmail(supplierId, email);
  revalidatePath('/dashboard/fornecedores');
  return {};
}
```

- [ ] **Step 2: Página admin**

`app/dashboard/fornecedores/page.tsx` — server component que checa `isAuthorized('suppliers:manage')` (senão `notFound()`), lista fornecedores (`listSuppliers`) e seus e-mails, com formulários para criar fornecedor e adicionar e-mail autorizado.

- [ ] **Step 3: Link de navegação**

Em `app/dashboard/layout.tsx`, adicionar no `<nav>` um `<Link href="/dashboard/fornecedores">Fornecedores</Link>` (visível para admin/manager).

- [ ] **Step 4: Verificar compilação + smoke**

```bash
npx tsc --noEmit
```

Manual: como admin, criar um fornecedor e adicionar o e-mail do Wander; depois validar o 1º acesso da Task 7.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/fornecedores actions/suppliers-admin.ts app/dashboard/layout.tsx
git commit -m "feat(admin): manage suppliers and allowed emails"
```

---

## Task 9: Configurar `DATABASE_URL` na Azure e validar ponta-a-ponta

**Files:** nenhum (configuração)

- [ ] **Step 1: App Settings**

```bash
# MSYS_NO_PATHCONV=1 para não corromper a URL no Git Bash
az webapp config appsettings set --name ecotracker-app --resource-group RGDIROPERACIONAL \
  --settings DATABASE_URL="postgres://<user>:<pass>@ecotracker-pg.postgres.database.azure.com:5432/<db>?sslmode=require"
```

- [ ] **Step 2: Deploy + validação**

Commit/push aciona o deploy. Validar: admin cadastra fornecedor + e-mail; fornecedor faz 1º acesso e login; tenta acessar `/dashboard` e é bloqueado (papel supplier).

---

## Self-Review (cobertura do spec)

- §3 papéis e isolamento → Tasks 5,6,8 (role supplier, proteção /fornecedor, permissão `suppliers:manage`). ✓
- §4 login por senha (allowlist + 1º acesso + bcrypt) → Tasks 2,4,5,7. ✓
- §7 Postgres (reuso do schema + `password_hash`) → Tasks 2,3,4. ✓
- Upload/extração/dashboard → **fora deste plano** (Planos B, C, D). ✓

**Pendências conhecidas (resolver na execução):** padrão exato de `signIn` server-side do NextAuth v5 instalado (Task 7, Step 1) — checar `node_modules/next-auth` antes de codar para tratar o `NEXT_REDIRECT` corretamente.
