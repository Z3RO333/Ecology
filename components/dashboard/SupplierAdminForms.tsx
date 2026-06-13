'use client';

import { useActionState } from 'react';
import {
  addSupplierAction,
  addAllowedEmailAction,
  type AdminActionState,
} from '@/actions/suppliers-admin';

const INITIAL: AdminActionState = {};

interface SupplierOption {
  id: string;
  legal_name: string;
}

export function SupplierAdminForms({ suppliers }: { suppliers: SupplierOption[] }) {
  const [supplierState, addSupplier, addingSupplier] = useActionState(addSupplierAction, INITIAL);
  const [emailState, addEmail, addingEmail] = useActionState(addAllowedEmailAction, INITIAL);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={addSupplier} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Novo fornecedor</h2>
        <input
          name="legal_name"
          placeholder="Razão social"
          required
          className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-sm focus:border-green-500 outline-none"
        />
        <input
          name="cnpj"
          placeholder="CNPJ (opcional)"
          className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-sm focus:border-green-500 outline-none"
        />
        {supplierState.error && <p className="text-red-600 text-sm">{supplierState.error}</p>}
        {supplierState.ok && <p className="text-green-700 text-sm">Fornecedor criado.</p>}
        <button
          type="submit"
          disabled={addingSupplier}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {addingSupplier ? 'Salvando...' : 'Adicionar fornecedor'}
        </button>
      </form>

      <form action={addEmail} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Autorizar e-mail de acesso</h2>
        <select
          name="supplier_id"
          required
          aria-label="Fornecedor"
          defaultValue=""
          className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-sm focus:border-green-500 outline-none bg-white"
        >
          <option value="" disabled>
            Selecione o fornecedor...
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.legal_name}
            </option>
          ))}
        </select>
        <input
          name="email"
          type="email"
          placeholder="email@fornecedor.com"
          required
          className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-sm focus:border-green-500 outline-none"
        />
        {emailState.error && <p className="text-red-600 text-sm">{emailState.error}</p>}
        {emailState.ok && <p className="text-green-700 text-sm">E-mail autorizado.</p>}
        <button
          type="submit"
          disabled={addingEmail}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {addingEmail ? 'Salvando...' : 'Autorizar e-mail'}
        </button>
      </form>
    </div>
  );
}
