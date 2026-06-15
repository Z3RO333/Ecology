'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { KeyRound, Leaf } from 'lucide-react';
import { firstAccess, type SupplierAuthState } from '@/actions/supplier-auth';

const INITIAL: SupplierAuthState = {};

export default function SupplierFirstAccessPage() {
  const [state, action, pending] = useActionState(firstAccess, INITIAL);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.15),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-700 text-white shadow-xl shadow-emerald-200">
            <Leaf className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Ativar acesso</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use o e-mail liberado pela equipe EcoTracker.
          </p>
        </div>

        <section className="rounded-[26px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            <KeyRound className="h-4 w-4" />
            Primeiro acesso
          </div>
          <form action={action} className="space-y-4">
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail cadastrado"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Nova senha, mínimo 8 caracteres"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <input
              name="confirm"
              type="password"
              required
              minLength={8}
              placeholder="Confirme a nova senha"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {state.error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
            >
              {pending ? 'Ativando...' : 'Criar senha e entrar'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Já possui senha?{' '}
            <Link href="/fornecedor/login" className="font-bold text-emerald-700 hover:underline">
              Voltar ao login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
