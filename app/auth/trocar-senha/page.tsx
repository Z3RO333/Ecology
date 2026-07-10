'use client';

import { useActionState } from 'react';
import { changePasswordAction } from '@/actions/change-password';
import { Leaf } from 'lucide-react';

const INITIAL_STATE = { success: false, error: undefined as string | undefined };

export default function TrocarSenhaPage() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, INITIAL_STATE);

  if (state.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-600 text-white">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Senha alterada!</h1>
          <p className="mt-2 text-slate-500">Sua nova senha foi salva com sucesso.</p>
          <a
            href="/auth/signin"
            className="mt-6 block w-full rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-green-700"
          >
            Fazer login com a nova senha
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500 text-white">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Primeiro Acesso</h1>
          <p className="mt-2 text-slate-500">
            Este e seu primeiro acesso. Crie uma nova senha para continuar.
          </p>
        </div>

        <form action={formAction} className="mt-7 space-y-4">
          <div>
            <label htmlFor="new_password" className="block text-sm font-semibold text-slate-700 mb-1">
              Nova senha
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-semibold text-slate-700 mb-1">
              Confirmar senha
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              placeholder="Repita a senha"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-amber-500"
            />
          </div>

          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-gray-300"
          >
            {isPending ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <strong>Importante:</strong> Apos trocar a senha, a senha temporaria sera desativada permanentemente.
        </div>
      </div>
    </main>
  );
}
