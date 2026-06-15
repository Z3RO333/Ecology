'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';
import { createSupplierPassword, getSupplierUser, allowedSupplierIdForEmail } from '@/lib/suppliers';

export interface SupplierAuthState {
  error?: string;
}

export async function firstAccess(_prev: SupplierAuthState, form: FormData): Promise<SupplierAuthState> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  if (password.length < 8) return { error: 'A senha deve ter ao menos 8 caracteres.' };
  if (password !== confirm) return { error: 'As senhas não conferem.' };

  if (!(await allowedSupplierIdForEmail(email))) {
    return { error: 'E-mail não autorizado. Fale com o administrador.' };
  }
  const existing = await getSupplierUser(email);
  if (existing?.has_password) return { error: 'Conta já existe. Faça login.' };

  try {
    await createSupplierPassword(email, password);
  } catch {
    return { error: 'Não foi possível criar a conta.' };
  }

  // signIn throws NEXT_REDIRECT on success (must propagate) or AuthError on failure.
  try {
    await signIn('supplier-password', { email, password, redirectTo: '/fornecedor/envios' });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Conta criada, mas o login falhou. Tente novamente.' };
    throw error;
  }
  return {};
}

export async function supplierLogin(_prev: SupplierAuthState, form: FormData): Promise<SupplierAuthState> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');

  try {
    await signIn('supplier-password', { email, password, redirectTo: '/fornecedor/envios' });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'E-mail ou senha inválidos.' };
    throw error;
  }
  return {};
}

export async function supplierLogout(): Promise<void> {
  await signOut({ redirectTo: '/fornecedor/login' });
}
