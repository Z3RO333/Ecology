import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { listInternalUsers } from '@/lib/internal-users';
import { getLocais } from '@/lib/locations';
import { listSuppliers, listAllowedEmails } from '@/lib/suppliers';
import { UserAdminPanel } from '@/components/dashboard/UserAdminPanel';
import { ShieldCheck } from 'lucide-react';

async function UsersContent() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'users:manage')) redirect('/dashboard');

  const [users, locais, suppliers, allowedEmails] = await Promise.all([
    listInternalUsers(),
    getLocais(),
    listSuppliers(),
    listAllowedEmails(),
  ]);

  const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.legal_name]));
  const supplierUsers = allowedEmails.map((entry) => ({
    email: entry.email,
    supplierName: supplierNameById.get(entry.supplier_id) ?? 'Fornecedor não identificado',
    hasPassword: entry.has_password,
  }));

  return <UserAdminPanel users={users} locais={locais} supplierUsers={supplierUsers} />;
}

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3.5">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Controle de acesso</p>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[28px]">Usuários e permissões</h1>
          <p className="mt-1 text-sm text-slate-500">Defina perfis, unidades responsáveis e o status de acesso de cada pessoa.</p>
        </div>
      </header>
      <Suspense fallback={<div className="skeleton-shimmer h-96 rounded-3xl" />}>
        <UsersContent />
      </Suspense>
    </div>
  );
}
