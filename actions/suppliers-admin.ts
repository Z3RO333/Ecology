'use server';

import { revalidatePath } from 'next/cache';
import { isAuthorized } from '@/lib/authorization';
import { createSupplier, addAllowedEmail } from '@/lib/suppliers';

export interface AdminActionState {
  error?: string;
  ok?: boolean;
}

export async function addSupplierAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAuthorized('suppliers:manage'))) return { error: 'Sem permissão.' };
  const name = String(form.get('legal_name') ?? '').trim();
  const cnpj = String(form.get('cnpj') ?? '').replace(/\D/g, '') || null;
  if (name.length < 2) return { error: 'Informe a razão social.' };
  try {
    await createSupplier(name, cnpj);
  } catch {
    return { error: 'Não foi possível criar o fornecedor (CNPJ já existe?).' };
  }
  revalidatePath('/dashboard/fornecedores');
  return { ok: true };
}

export async function addAllowedEmailAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAuthorized('suppliers:manage'))) return { error: 'Sem permissão.' };
  const supplierId = String(form.get('supplier_id') ?? '');
  const email = String(form.get('email') ?? '');
  if (!supplierId || !email.includes('@')) return { error: 'Selecione o fornecedor e informe um e-mail válido.' };
  try {
    await addAllowedEmail(supplierId, email);
  } catch {
    return { error: 'Não foi possível autorizar o e-mail.' };
  }
  revalidatePath('/dashboard/fornecedores');
  return { ok: true };
}
