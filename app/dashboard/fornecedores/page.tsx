import { notFound } from 'next/navigation';
import { isAuthorized } from '@/lib/authorization';
import { listSuppliers, listAllowedEmails } from '@/lib/suppliers';
import { SupplierAdminForms } from '@/components/dashboard/SupplierAdminForms';
import Link from 'next/link';

export default async function FornecedoresPage() {
  if (!(await isAuthorized('suppliers:manage'))) notFound();

  const [suppliers, allowedEmails] = await Promise.all([listSuppliers(), listAllowedEmails()]);
  const emailsBySupplier = new Map<string, Array<{ email: string; hasPassword: boolean }>>();
  for (const { supplier_id, email, has_password } of allowedEmails) {
    emailsBySupplier.set(supplier_id, [
      ...(emailsBySupplier.get(supplier_id) ?? []),
      { email, hasPassword: has_password },
    ]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Fornecedores</h1>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-semibold text-emerald-950">Como liberar o acesso do fornecedor</h2>
        <ol className="mt-2 space-y-1 text-sm text-emerald-900">
          <li>1. Cadastre a empresa e autorize o e-mail abaixo.</li>
          <li>
            2. Envie ao fornecedor o link{' '}
            <Link
              href="/fornecedor/primeiro-acesso"
              target="_blank"
              className="font-bold underline underline-offset-2"
            >
              Primeiro acesso
            </Link>
            .
          </li>
          <li>
            3. Depois de criar a senha, ele entra pelo{' '}
            <Link
              href="/fornecedor/login"
              target="_blank"
              className="font-bold underline underline-offset-2"
            >
              Portal do fornecedor
            </Link>
            .
          </li>
        </ol>
      </section>

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
                  <div className="flex flex-wrap gap-2">
                    {(emailsBySupplier.get(s.id) ?? []).map((item) => (
                      <span
                        key={item.email}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.hasPassword
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.email} · {item.hasPassword ? 'acesso ativo' : 'aguardando ativação'}
                      </span>
                    ))}
                    {(emailsBySupplier.get(s.id) ?? []).length === 0 && '—'}
                  </div>
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
