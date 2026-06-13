import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { redirect } from 'next/navigation';

export default async function SupplierPortalPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'supplier-documents:view-own')) {
    redirect('/auth/signin?callbackUrl=/fornecedor');
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-700">Portal do fornecedor</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {session.user.name ?? session.user.email}
            </h1>
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/auth/signin' }); }}>
            <button type="submit" className="text-sm text-slate-500 hover:text-red-600">
              Sair
            </button>
          </form>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900">Envio de documentos</h2>
          <p className="text-slate-600 mt-2">
            A área está protegida por perfil. O formulário e o histórico serão habilitados
            junto com o banco transacional, armazenamento privado e login externo.
          </p>
        </section>
      </div>
    </main>
  );
}

