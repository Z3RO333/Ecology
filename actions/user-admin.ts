'use server';

import { isAuthorized } from '@/lib/authorization';
import { createInternalUser, resetPassword, toggleUserActive } from '@/lib/internal-users';
import type { AppRole } from '@/lib/access-control';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createUserAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const displayName = (formData.get('display_name') as string)?.trim();
  const role = formData.get('role') as AppRole;
  const localId = (formData.get('local_id') as string) || undefined;

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Informe um e-mail valido.' };
  }
  if (!displayName || displayName.length < 2) {
    return { success: false, error: 'Informe o nome do usuario.' };
  }
  if (!['admin', 'manager', 'operational'].includes(role)) {
    return { success: false, error: 'Selecione um perfil valido.' };
  }

  try {
    await createInternalUser({ email, display_name: displayName, role, local_id: localId });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuario.';
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return { success: false, error: 'Este e-mail ja esta cadastrado.' };
    }
    return { success: false, error: msg };
  }
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }
  const userId = formData.get('user_id') as string;
  if (!userId) return { success: false, error: 'Usuario nao encontrado.' };

  try {
    await resetPassword(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao resetar senha.' };
  }
}

export async function toggleUserActiveAction(formData: FormData): Promise<ActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }
  const userId = formData.get('user_id') as string;
  const active = formData.get('active') === 'true';

  try {
    await toggleUserActive(userId, active);
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao alterar status.' };
  }
}
