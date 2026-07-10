import Link from 'next/link';
import { Leaf, KeyRound, Building2 } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  async function loginWithPassword(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signIn('internal-password', {
        email,
        password,
        redirectTo: callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard',
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'digest' in err) throw err;
      redirect('/auth/signin?error=credentials');
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(5,150,105,0.12),transparent_50%)]" />

      <section className="relative w-full max-w-md rounded-[26px] border border-slate-200 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-200">
          <Leaf className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">EcoTracker</h1>
        <p className="mt-1 text-sm text-slate-500">Acesse com seu e-mail e senha</p>

        <form action={loginWithPassword} className="mt-7 space-y-3 text-left">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="seu.email@bemol.com.br"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-center">
              E-mail ou senha incorretos. Verifique e tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-100 transition hover:bg-green-700"
          >
            <KeyRound className="h-5 w-5" />
            Entrar
          </button>
        </form>

        <div className="flex items-center gap-3 py-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            fornecedor
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

        <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-800">
          <strong>Primeiro acesso?</strong> Use a senha temporaria fornecida pelo administrador.
        </p>
      </section>
    </main>
  );
}
