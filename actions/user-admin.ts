'use server';

import { isAuthorized } from '@/lib/authorization';
import { createInternalUser, resetPassword, toggleUserActive, updateInternalUser } from '@/lib/internal-users';
import { getLocalById } from '@/lib/locations';
import { isInternalRole, type InternalRole } from '@/lib/access-control';
import { revalidatePath } from 'next/cache';

export interface UserActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

const USER_ADMIN_PATH = '/dashboard/usuarios';

async function validateUserFields(formData: FormData): Promise<
  | { email: string; displayName: string; role: InternalRole; localId: string | null; active: boolean }
  | { error: string }
> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const roleValue = formData.get('role');
  const localId = String(formData.get('local_id') ?? '').trim() || null;
  const active = String(formData.get('active') ?? 'true') === 'true';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Informe um e-mail válido.' };
  if (displayName.length < 2) return { error: 'Informe o nome do usuário.' };
  if (!isInternalRole(roleValue)) return { error: 'Selecione um perfil válido.' };
  if (roleValue === 'manager' && !localId) return { error: 'A unidade é obrigatória para Gerente de Loja.' };
  if (localId && !(await getLocalById(localId))) return { error: 'A unidade selecionada não existe.' };

  return { email, displayName, role: roleValue, localId, active };
}

export async function createUserAction(
  _prevState: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }

  const fields = await validateUserFields(formData);
  if ('error' in fields) return { success: false, error: fields.error };

  try {
    await createInternalUser({
      email: fields.email,
      display_name: fields.displayName,
      role: fields.role,
      local_id: fields.localId,
      active: fields.active,
    });
    revalidatePath(USER_ADMIN_PATH);
    return { success: true, message: 'Usuário cadastrado com sucesso.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuario.';
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return { success: false, error: 'Este e-mail ja esta cadastrado.' };
    }
    return { success: false, error: msg };
  }
}

export async function updateUserAction(
  _prevState: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  if (!(await isAuthorized('users:manage'))) return { success: false, error: 'Sem permissão.' };
  const userId = String(formData.get('user_id') ?? '');
  if (!userId) return { success: false, error: 'Usuário não encontrado.' };

  const fields = await validateUserFields(formData);
  if ('error' in fields) return { success: false, error: fields.error };

  try {
    await updateInternalUser({
      id: userId,
      email: fields.email,
      display_name: fields.displayName,
      role: fields.role,
      local_id: fields.localId,
      active: fields.active,
    });
    revalidatePath(USER_ADMIN_PATH);
    return { success: true, message: 'Dados do usuário atualizados.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar usuário.';
    if (message.includes('duplicate key') || message.includes('unique')) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }
    return { success: false, error: message };
  }
}

export async function resetPasswordAction(formData: FormData): Promise<UserActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }
  const userId = formData.get('user_id') as string;
  if (!userId) return { success: false, error: 'Usuario nao encontrado.' };

  try {
    await resetPassword(userId);
    revalidatePath(USER_ADMIN_PATH);
    return { success: true, message: 'Senha temporária redefinida.' };
  } catch {
    return { success: false, error: 'Erro ao resetar senha.' };
  }
}

export async function toggleUserActiveAction(formData: FormData): Promise<UserActionResult> {
  if (!(await isAuthorized('users:manage'))) {
    return { success: false, error: 'Sem permissao.' };
  }
  const userId = formData.get('user_id') as string;
  const active = formData.get('active') === 'true';

  try {
    await toggleUserActive(userId, active);
    revalidatePath(USER_ADMIN_PATH);
    return { success: true, message: active ? 'Acesso ativado.' : 'Acesso desativado.' };
  } catch {
    return { success: false, error: 'Erro ao alterar status.' };
  }
}
