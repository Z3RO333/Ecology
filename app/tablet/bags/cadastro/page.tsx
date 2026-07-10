'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { createBagAction } from '@/actions/bags';
import { LocationSelector } from '@/components/tablet/LocationSelector';
import type { Local } from '@/types/bags';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined as string | undefined, codigo: undefined as string | undefined };

export default function CadastroBagPage() {
  const [localId, setLocalId] = useState('');
  const [setor, setSetor] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [locais, setLocais] = useState<Local[]>([]);

  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createBagAction, INITIAL_STATE);

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((data) => setLocais(data.locais ?? []))
      .catch(() => {});
  }, []);

  const resetForm = useCallback(() => {
    setLocalId('');
    setSetor('');
    setResponsavel('');
    setQuantidade(1);
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(resetForm, 3000);
    return () => clearTimeout(timer);
  }, [state.success, resetForm]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="bg-emerald-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Cadastrar Bags</h1>
        <p className="text-emerald-100 text-base mt-1">
          O codigo sera gerado automaticamente
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        <input type="hidden" name="local_id" value={localId} />

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">1. Quantidade</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl text-3xl font-bold text-gray-600"
            >
              -
            </button>
            <input
              name="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 text-center bg-white border-2 border-gray-200 rounded-2xl p-4 text-3xl font-bold text-gray-800 outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(100, q + 1))}
              className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl text-3xl font-bold text-gray-600"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">2. Local Inicial</p>
          <LocationSelector
            locais={locais}
            value={localId}
            onChange={setLocalId}
            name="local_id_display"
          />
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">3. Setor</p>
          <input
            name="setor"
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            placeholder="Ex: Expedicao..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-emerald-500 outline-none text-xl"
          />
        </div>

        <div>
          <p className="text-lg font-bold text-emerald-800 mb-3">4. Responsavel *</p>
          <input
            name="responsavel"
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-emerald-500 outline-none text-xl"
          />
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            Bag cadastrada — {state.codigo}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || state.success}
          className="w-full bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
        >
          {isPending ? 'Cadastrando...' : state.success ? 'Cadastrado!' : 'Cadastrar Bag'}
        </button>

        <Link
          href="/tablet"
          className="block text-center text-emerald-600 underline text-lg mt-4"
        >
          Voltar ao menu
        </Link>
      </form>
    </div>
  );
}
