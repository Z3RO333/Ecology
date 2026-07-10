import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'dashboard:view')) {
    redirect('/auth/signin');
  }
  if (session.user.mustChangePassword) {
    redirect('/auth/trocar-senha');
  }

  const isAdmin = hasPermission(session.user.role, 'users:manage');
  const isManager = hasPermission(session.user.role, 'records:view');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">EcoTracker</span>
          <nav className="flex gap-4 text-sm">
            {isManager && (
              <Link href="/dashboard" className="text-gray-600 hover:text-green-700 font-medium">
                Painel
              </Link>
            )}
            {isManager && (
              <Link href="/dashboard/records" className="text-gray-600 hover:text-green-700 font-medium">
                Historico
              </Link>
            )}
            {hasPermission(session.user.role, 'supplier-documents:review') && (
              <Link href="/dashboard/medicoes" className="text-gray-600 hover:text-green-700 font-medium">
                Medicoes
              </Link>
            )}
            {hasPermission(session.user.role, 'suppliers:manage') && (
              <Link href="/dashboard/fornecedores" className="text-gray-600 hover:text-green-700 font-medium">
                Fornecedores
              </Link>
            )}
            {hasPermission(session.user.role, 'bags:view') && (
              <Link href="/dashboard/bags" className="text-gray-600 hover:text-green-700 font-medium">
                Bags
              </Link>
            )}
            {isAdmin && (
              <Link href="/dashboard/usuarios" className="text-gray-600 hover:text-green-700 font-medium">
                Usuarios
              </Link>
            )}
            <span className="text-gray-300">|</span>
            <Link href="/tablet" className="text-gray-600 hover:text-green-700 font-medium">
              Tablet
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {session.user.name ?? session.user.email} · {session.user.role}
          </span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/auth/signin' }); }}>
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
