import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { SupplierPortalShell } from '@/components/fornecedor/SupplierPortalShell';

export default async function SupplierProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (
    !session?.user ||
    !session.user.supplierId ||
    !hasPermission(session.user.role, 'supplier-documents:view-own')
  ) {
    redirect('/fornecedor/login');
  }

  return (
    <SupplierPortalShell userLabel={session.user.name ?? session.user.email ?? 'Fornecedor'}>
      {children}
    </SupplierPortalShell>
  );
}
