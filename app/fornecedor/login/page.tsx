'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Building2, Leaf, LockKeyhole, Mail } from 'lucide-react';
import { supplierLogin, type SupplierAuthState } from '@/actions/supplier-auth';

const INITIAL: SupplierAuthState = {};

export default function SupplierLoginPage() {
  const [state, action, pending] = useActionState(supplierLogin, INITIAL);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.15),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-700 text-white shadow-xl shadow-emerald-200">
            <Leaf className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Portal do fornecedor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Envie medições e acompanhe seus documentos.
          </p>
        </div>

        <section className="rounded-[26px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="mb-5 flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-[0.18em] text-slate-400">Acesso</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Fornecedor
            </span>
          </div>

          <form action={action} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              E-mail
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email@fornecedor.com"
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Senha
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Sua senha"
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </span>
            </label>

            {state.error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-800 disabled:bg-slate-300"
            >
              {pending ? 'Entrando...' : 'Entrar no portal'}
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <p>
                No primeiro acesso, seu e-mail precisa ter sido autorizado pela equipe EcoTracker.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Primeiro acesso?{' '}
            <Link href="/fornecedor/primeiro-acesso" className="font-bold text-emerald-700 hover:underline">
              Criar senha
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
