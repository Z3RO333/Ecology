import 'server-only';

import bcrypt from 'bcryptjs';
import { sql, sqlOne } from '@/lib/db';
import type { InternalRole } from '@/lib/access-control';

const BCRYPT_COST = 12;
const DEFAULT_TEMP_PASSWORD = 'Bemol@2026';

export interface InternalUser {
  id: string;
  email: string;
  display_name: string | null;
  role: InternalRole;
  local_id: string | null;
  local_nome?: string;
  must_change_password: boolean;
  active: boolean;
  first_access_at: string | null;
  password_changed_at: string | null;
  has_password: boolean;
}

export async function createInternalUser(input: {
  email: string;
  display_name: string;
  role: InternalRole;
  local_id?: string | null;
  active?: boolean;
}): Promise<InternalUser> {
  const hash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, BCRYPT_COST);
  const row = await sqlOne<InternalUser>(
    `INSERT INTO app_users (email, display_name, role, local_id, password_hash, must_change_password)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, email::text AS email, display_name, role, local_id,
               must_change_password, active,
               first_access_at::text, password_changed_at::text,
               (password_hash IS NOT NULL) AS has_password`,
    [input.email.trim().toLowerCase(), input.display_name, input.role, input.local_id ?? null, hash]
  );
  if (input.active === false && row) {
    await toggleUserActive(row.id, false);
    row.active = false;
  }
  return row!;
}

export async function getInternalUserByEmail(email: string): Promise<InternalUser | null> {
  return sqlOne<InternalUser>(
    `SELECT id, email::text AS email, display_name, role, local_id,
            must_change_password, active,
            first_access_at::text, password_changed_at::text,
            (password_hash IS NOT NULL) AS has_password
     FROM app_users
     WHERE email = $1 AND role != 'supplier'`,
    [email.trim().toLowerCase()]
  );
}

export async function verifyInternalPassword(
  email: string,
  password: string
): Promise<InternalUser | null> {
  const user = await sqlOne<InternalUser & { password_hash: string | null }>(
    `SELECT id, email::text AS email, display_name, role, local_id, password_hash,
            must_change_password, active,
            first_access_at::text, password_changed_at::text,
            (password_hash IS NOT NULL) AS has_password
     FROM app_users
     WHERE email = $1 AND role != 'supplier'`,
    [email.trim().toLowerCase()]
  );

  if (!user?.password_hash || !user.active) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  if (!user.first_access_at) {
    await sql(
      'UPDATE app_users SET first_access_at = now() WHERE id = $1',
      [user.id]
    );
  }

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    local_id: user.local_id,
    must_change_password: user.must_change_password,
    active: user.active,
    first_access_at: user.first_access_at,
    password_changed_at: user.password_changed_at,
    has_password: true,
  };
}

export async function changePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres.');
  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await sql(
    `UPDATE app_users
     SET password_hash = $1, must_change_password = FALSE, password_changed_at = now()
     WHERE id = $2`,
    [hash, userId]
  );
}

export async function resetPassword(userId: string): Promise<void> {
  const hash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, BCRYPT_COST);
  await sql(
    `UPDATE app_users
     SET password_hash = $1, must_change_password = TRUE, password_changed_at = NULL
     WHERE id = $2`,
    [hash, userId]
  );
}

export async function listInternalUsers(): Promise<InternalUser[]> {
  return sql<InternalUser>(
    `SELECT u.id, u.email::text AS email, u.display_name, u.role, u.local_id,
            l.nome AS local_nome,
            u.must_change_password, u.active,
            u.first_access_at::text, u.password_changed_at::text,
            (u.password_hash IS NOT NULL) AS has_password
     FROM app_users u
     LEFT JOIN locais l ON l.id = u.local_id
     WHERE u.role != 'supplier'
     ORDER BY u.display_name, u.email`
  );
}

export async function toggleUserActive(userId: string, active: boolean): Promise<void> {
  await sql('UPDATE app_users SET active = $1, updated_at = now() WHERE id = $2', [active, userId]);
}

export async function updateInternalUser(input: {
  id: string;
  email: string;
  display_name: string;
  role: InternalRole;
  local_id: string | null;
  active: boolean;
}): Promise<void> {
  await sql(
    `UPDATE app_users
     SET email = $1, display_name = $2, role = $3, local_id = $4,
         active = $5, updated_at = now()
     WHERE id = $6 AND role != 'supplier'`,
    [
      input.email.trim().toLowerCase(),
      input.display_name.trim(),
      input.role,
      input.local_id,
      input.active,
      input.id,
    ]
  );
}

export async function listInternalUsersByLocal(localId: string): Promise<InternalUser[]> {
  return sql<InternalUser>(
    `SELECT u.id, u.email::text AS email, u.display_name, u.role, u.local_id,
            l.nome AS local_nome, u.must_change_password, u.active,
            u.first_access_at::text, u.password_changed_at::text,
            (u.password_hash IS NOT NULL) AS has_password
     FROM app_users u
     LEFT JOIN locais l ON l.id = u.local_id
     WHERE u.role != 'supplier' AND u.local_id = $1
     ORDER BY u.active DESC, u.display_name, u.email`,
    [localId]
  );
}
