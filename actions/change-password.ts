'use server';

import { auth } from '@/lib/auth';
import { changePassword, verifyInternalPassword } from '@/lib/internal-users';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function changePasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Sessao expirada. Faca login novamente.' };
  }

  const currentPassword = (formData.get('current_password') as string)?.trim();
  const newPassword = (formData.get('new_password') as string)?.trim();
  const confirmPassword = (formData.get('confirm_password') as string)?.trim();

  // First-access users (mustChangePassword) don't need to provide current password
  // since they're already authenticated with the temp password.
  // All other users must verify their current password.
  if (!session.user.mustChangePassword) {
    if (!currentPassword) {
      return { success: false, error: 'Informe a senha atual.' };
    }
    const verified = await verifyInternalPassword(session.user.email, currentPassword);
    if (!verified) {
      return { success: false, error: 'Senha atual incorreta.' };
    }
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no minimo 6 caracteres.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'As senhas nao coincidem.' };
  }

  if (newPassword === 'Bemol@2026') {
    return { success: false, error: 'A nova senha nao pode ser igual a senha temporaria.' };
  }

  try {
    if (!session.user.id) {
      return { success: false, error: 'Sessao invalida. Faca login novamente.' };
    }
    await changePassword(session.user.id, newPassword);
    return { success: true };
  } catch (err) {
    console.error('changePasswordAction error:', err);
    return { success: false, error: 'Erro ao trocar a senha. Tente novamente.' };
  }
}
