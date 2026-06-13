import 'server-only';
import bcrypt from 'bcryptjs';
import { sql, sqlOne } from '@/lib/db';

export interface Supplier {
  id: string;
  legal_name: string;
  trade_name: string | null;
  cnpj: string | null;
  active: boolean;
}

export interface SupplierUser {
  id: string;
  email: string;
  supplier_id: string;
  has_password: boolean;
  active: boolean;
}

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

export async function getSupplierUser(
  email: string
): Promise<(SupplierUser & { password_hash: string | null }) | null> {
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
     RETURNING id, email::text AS email, supplier_id,
               (password_hash IS NOT NULL) AS has_password, active`,
    [normalized, supplierId, hash]
  );
  return row!;
}

export async function verifySupplierPassword(email: string, password: string): Promise<SupplierUser | null> {
  const user = await getSupplierUser(email);
  if (!user?.password_hash || !user.active) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    supplier_id: user.supplier_id,
    has_password: true,
    active: user.active,
  };
}

// Admin operations.
export async function listSuppliers(): Promise<Supplier[]> {
  return sql<Supplier>(
    `SELECT id, legal_name, trade_name, cnpj, active FROM suppliers ORDER BY legal_name`
  );
}

export async function listAllowedEmails(): Promise<Array<{ email: string; supplier_id: string }>> {
  return sql(`SELECT email::text AS email, supplier_id FROM supplier_allowed_emails WHERE active = TRUE ORDER BY email`);
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
