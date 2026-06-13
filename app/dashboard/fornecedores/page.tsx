import { notFound } from 'next/navigation';
import { isAuthorized } from '@/lib/authorization';
import { listSuppliers, listAllowedEmails } from '@/lib/suppliers';
import { SupplierAdminForms } from '@/components/dashboard/SupplierAdminForms';

export default async function FornecedoresPage() {
  if (!(await isAuthorized('suppliers:manage'))) notFound();

  const [suppliers, allowedEmails] = await Promise.all([listSuppliers(), listAllowedEmails()]);
  const emailsBySupplier = new Map<string, string[]>();
  for (const { supplier_id, email } of allowedEmails) {
    emailsBySupplier.set(supplier_id, [...(emailsBySupplier.get(supplier_id) ?? []), email]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Fornecedores</h1>

      <SupplierAdminForms suppliers={suppliers.map((s) => ({ id: s.id, legal_name: s.legal_name }))} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Razão social</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">E-mails autorizados</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{s.legal_name}</td>
                <td className="px-4 py-3 text-gray-600">{s.cnpj ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {(emailsBySupplier.get(s.id) ?? []).join(', ') || '—'}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
