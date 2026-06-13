'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { firstAccess, type SupplierAuthState } from '@/actions/supplier-auth';

const INITIAL: SupplierAuthState = {};

export default function PrimeiroAcessoPage() {
  const [state, action, pending] = useActionState(firstAccess, INITIAL);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-green-800 mb-1">Primeiro acesso</h1>
        <p className="text-gray-500 text-sm mb-6">
          Use o e-mail cadastrado pelo administrador e defina sua senha.
        </p>

        <form action={action} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail cadastrado"
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Nova senha (mín. 8 caracteres)"
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none"
          />
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            placeholder="Confirme a senha"
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none"
          />
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{state.error}</div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {pending ? 'Criando...' : 'Definir senha e entrar'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Já tem senha?{' '}
          <Link href="/fornecedor/login" className="text-green-700 font-medium hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
