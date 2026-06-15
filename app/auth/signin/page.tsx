import Link from 'next/link';
import { Building2, Leaf } from 'lucide-react';
import { signIn } from '@/lib/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(5,150,105,0.12),transparent_50%)]" />

      <section className="relative w-full max-w-md rounded-[26px] border border-slate-200 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-200">
          <Leaf className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">EcoTracker</h1>
        <p className="mt-1 text-sm text-slate-500">Escolha como deseja acessar</p>

        <div className="mt-7 space-y-3">
          <form
            action={async () => {
              'use server';
              await signIn('microsoft-entra-id', {
                redirectTo: callbackUrl ?? '/dashboard',
              });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              <span className="grid grid-cols-2 gap-0.5">
                <span className="h-2 w-2 bg-red-400" />
                <span className="h-2 w-2 bg-emerald-400" />
                <span className="h-2 w-2 bg-sky-300" />
                <span className="h-2 w-2 bg-amber-300" />
              </span>
              Entrar com Microsoft
            </button>
          </form>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              ou
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/fornecedor/login"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <Building2 className="h-5 w-5" />
            Entrar como fornecedor
          </Link>
        </div>

        <div className="mt-6 grid gap-2 text-left text-xs text-slate-500">
          <p className="rounded-xl bg-blue-50 px-3 py-2.5">
            <strong className="text-blue-800">Equipe Bemol:</strong> use sua conta Microsoft.
          </p>
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5">
            <strong className="text-emerald-800">Fornecedor:</strong> use o e-mail autorizado e
            a senha criada no primeiro acesso.
          </p>
        </div>
      </section>
    </main>
  );
}
