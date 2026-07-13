import Link from 'next/link';
import { ArrowRight, Building2, Leaf, ShieldCheck } from 'lucide-react';
import { signIn } from '@/lib/auth';

function isSafeCallback(url: string | undefined): url is string {
  return !!url && /^\/[^/\\]/.test(url);
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 23 23" className="h-5 w-5" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = isSafeCallback(callbackUrl) ? callbackUrl : '/dashboard';

  async function loginWithMicrosoft() {
    'use server';
    await signIn('microsoft-entra-id', { redirectTo });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7fb] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.13),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(5,150,105,0.11),transparent_48%)]" />

      <section className="page-enter relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.13)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />

        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
          <Leaf className="h-8 w-8" />
        </span>
        <div className="relative mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Acesso corporativo
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em] text-slate-950">Bem-vindo ao EcoTracker</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
            Colaboradores Bemol acessam com a conta corporativa Microsoft.
          </p>
        </div>

        {error && (
          <p className="relative mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">
            Não foi possível concluir o acesso. Verifique sua conta corporativa e tente novamente.
          </p>
        )}

        <form action={loginWithMicrosoft} className="relative mt-7">
          <button
            type="submit"
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md active:translate-y-0"
          >
            <MicrosoftLogo />
            Entrar com Microsoft
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <div className="relative my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">acesso externo</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/fornecedor/login"
          className="relative flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100"
        >
          <Building2 className="h-5 w-5" />
          Acessar como fornecedor
        </Link>

        <p className="relative mt-5 text-xs leading-5 text-slate-400">
          O acesso de colaboradores é protegido pela identidade Microsoft da organização.
        </p>
      </section>
    </main>
  );
}
