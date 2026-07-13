import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { redirect } from 'next/navigation';
import Sidebar, { type NavGroup } from '@/components/dashboard/Sidebar';
import { ViewTransition } from 'react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'dashboard:view')) {
    redirect('/auth/signin');
  }
  if (session.user.mustChangePassword) {
    redirect('/auth/trocar-senha');
  }

  const isManager = hasPermission(session.user.role, 'records:view');

  const groups: NavGroup[] = [
    {
      label: 'Operação',
      items: [
        isManager && { href: '/dashboard', label: 'Painel' },
        isManager && { href: '/dashboard/records', label: 'Histórico' },
        hasPermission(session.user.role, 'bags:view') && { href: '/dashboard/bags', label: 'Bags' },
      ].filter((item): item is { href: string; label: string } => Boolean(item)),
    },
    {
      label: 'Gestão',
      items: [
        hasPermission(session.user.role, 'supplier-documents:review') && { href: '/dashboard/medicoes', label: 'Medições' },
        hasPermission(session.user.role, 'suppliers:manage') && { href: '/dashboard/fornecedores', label: 'Fornecedores' },
        hasPermission(session.user.role, 'users:manage') && { href: '/dashboard/usuarios', label: 'Usuários' },
      ].filter((item): item is { href: string; label: string } => Boolean(item)),
    },
    {
      label: 'Sistema',
      items: [{ href: '/tablet', label: 'Tablet' }],
    },
  ].filter((group) => group.items.length > 0);

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/auth/signin' });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(187,247,208,0.28),transparent_30%),#f6f8f6] flex">
      <Sidebar
        groups={groups}
        userName={session.user.name ?? session.user.email ?? ''}
        userRole={session.user.role ?? ''}
        onSignOut={handleSignOut}
      />
      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:py-8">
        <ViewTransition default="dashboard-page">
          <div className="mx-auto w-full max-w-[1500px] page-enter">{children}</div>
        </ViewTransition>
      </main>
    </div>
  );
}
