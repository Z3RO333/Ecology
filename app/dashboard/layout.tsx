import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">♻ EcoTracker</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-green-700 font-medium">
              Painel
            </Link>
            <Link href="/dashboard/records" className="text-gray-600 hover:text-green-700 font-medium">
              Histórico
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session?.user?.name ?? session?.user?.email}</span>
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
