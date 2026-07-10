'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { enviarBagsAction } from '@/actions/bag-remessas';
import type { Local } from '@/types/bags';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined as string | undefined };

interface LocalResolvido extends Local {
  centro: number | null;
}

export default function EnviarBagsPage() {
  const [meuLocal, setMeuLocal] = useState<LocalResolvido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semVinculo, setSemVinculo] = useState(false);
  const [destinoId, setDestinoId] = useState('');
  const [destinos, setDestinos] = useState<LocalResolvido[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(enviarBagsAction, INITIAL_STATE);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(() => router.push('/dashboard/bags'), 1500);
    return () => clearTimeout(timer);
  }, [state.success, router]);

  // Auto-detect unit from logged-in user's session
  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const email = session?.user?.email;
        if (!email) { setSemVinculo(true); setCarregando(false); return; }

        const [locRes, allRes] = await Promise.all([
          fetch(`/api/locations?email=${encodeURIComponent(email)}`),
          fetch('/api/locations'),
        ]);
        const locData = await locRes.json();
        const allData = await allRes.json();
        const locais: LocalResolvido[] = allData.locais ?? [];

        if (locData.local) {
          setMeuLocal(locData.local);
          if (locData.local.tipo === 'cd') {
            setDestinos(locais.filter((l: LocalResolvido) => l.tipo !== 'cd'));
          } else {
            const cds = locais.filter((l: LocalResolvido) => l.tipo === 'cd');
            setDestinos(cds);
            if (cds.length === 1) setDestinoId(cds[0].id);
          }
        } else {
          setSemVinculo(true);
        }
      } catch {
        setSemVinculo(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const resetForm = useCallback(() => {
    setQuantidade(1);
    setResponsavel('');
    setObservacao('');
    setShowConfirm(false);
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(resetForm, 3000);
    return () => clearTimeout(timer);
  }, [state.success, resetForm]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-gray-500 text-xl">Identificando unidade...</p>
      </div>
    );
  }

  if (semVinculo) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center px-5">
        <div className="max-w-md text-center space-y-4">
          <p className="text-6xl">&#128683;</p>
          <h1 className="text-2xl font-bold text-gray-800">Unidade nao identificada</h1>
          <p className="text-gray-600">Seu e-mail nao esta vinculado a nenhuma loja, farma ou CD. Entre em contato com o administrador.</p>
          <Link href="/dashboard/bags" className="block text-orange-600 underline text-lg">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="bg-orange-500 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Enviar Bags</h1>
        <p className="text-orange-100 text-base mt-1">Saindo de: <strong>{meuLocal?.nome}</strong></p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={(e) => {
          if (!showConfirm) {
            e.preventDefault();
            if (!destinoId || !responsavel?.trim() || responsavel.trim().length < 2) return;
            setShowConfirm(true);
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !showConfirm) e.preventDefault(); }}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        {meuLocal && <input type="hidden" name="origem_id" value={meuLocal.id} />}
        <input type="hidden" name="destino_id" value={destinoId} />

        {/* Destino */}
        <div>
          <p className="text-lg font-bold text-orange-800 mb-3">1. Destino *</p>
          {destinos.length === 1 ? (
            <div className="bg-orange-100 border-2 border-orange-400 rounded-2xl p-5 text-xl font-semibold text-orange-800">
              {destinos[0].nome}
            </div>
          ) : (
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              aria-label="Destino"
              className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 text-xl appearance-none focus:border-orange-500 outline-none"
            >
              <option value="">Selecionar destino...</option>
              {destinos.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Quantidade */}
        <div>
          <p className="text-lg font-bold text-orange-800 mb-3">2. Quantas bags? *</p>
          <div className="flex items-center gap-4 justify-center">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100"
            >
              -
            </button>
            <input
              name="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              aria-label="Quantidade de bags"
              className="w-32 text-center bg-white border-2 border-gray-200 rounded-2xl p-4 text-4xl font-bold text-gray-800 outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantidade((q) => q + 1)}
              className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100"
            >
              +
            </button>
          </div>
        </div>

        {/* Responsavel */}
        <div>
          <p className="text-lg font-bold text-orange-800 mb-3">3. Responsavel *</p>
          <input
            name="responsavel"
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-orange-500 outline-none text-xl"
          />
        </div>

        {/* Observacao */}
        <div>
          <p className="text-lg font-bold text-orange-800 mb-3">4. Observacao</p>
          <textarea
            name="observacao"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-orange-500 outline-none text-lg resize-none"
          />
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            {quantidade} bags enviadas com sucesso!
          </div>
        )}

        {!showConfirm && (
          <button
            type="submit"
            disabled={isPending || state.success || !destinoId || !responsavel?.trim() || responsavel.trim().length < 2}
            className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
          >
            Enviar Bags
          </button>
        )}

        {/* Confirmation modal */}
        {showConfirm && !state.success && (
          <div className="bg-orange-50 border-2 border-orange-400 rounded-2xl p-6 space-y-4">
            <p className="text-xl font-bold text-orange-800 text-center">Confirmar envio?</p>
            <div className="text-center space-y-1 text-lg text-gray-700">
              <p><strong>{quantidade}</strong> bags</p>
              <p>De: <strong>{meuLocal?.nome}</strong></p>
              <p>Para: <strong>{destinos.find(d => d.id === destinoId)?.nome}</strong></p>
              <p>Responsavel: <strong>{responsavel}</strong></p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 active:bg-gray-300 text-gray-700 font-bold py-5 rounded-2xl text-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-orange-500 active:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-5 rounded-2xl text-xl"
              >
                {isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        <Link href="/dashboard/bags" className="block text-center text-orange-600 underline text-lg mt-4">
          Voltar
        </Link>
      </form>
    </div>
  );
}
