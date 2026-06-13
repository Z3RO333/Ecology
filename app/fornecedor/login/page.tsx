'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { supplierLogin, type SupplierAuthState } from '@/actions/supplier-auth';

const INITIAL: SupplierAuthState = {};

export default function FornecedorLoginPage() {
  const [state, action, pending] = useActionState(supplierLogin, INITIAL);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-green-800 mb-1">Portal do Fornecedor</h1>
        <p className="text-gray-500 text-sm mb-6">Entre com seu e-mail e senha.</p>

        <form action={action} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Senha"
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
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Primeiro acesso?{' '}
          <Link href="/fornecedor/primeiro-acesso" className="text-green-700 font-medium hover:underline">
            Defina sua senha
          </Link>
        </p>
      </div>
    </div>
  );
}
