'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { receberIdaAction } from '@/actions/bag-remessas';
import type { BagRemessa } from '@/types/bags';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined as string | undefined };

interface LocalInfo {
  id: string;
  nome: string;
  tipo: string;
}

export default function ReceberBagsPage() {
  const [meuLocal, setMeuLocal] = useState<LocalInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semVinculo, setSemVinculo] = useState(false);
  const [remessas, setRemessas] = useState<BagRemessa[]>([]);
  const [remessaSelecionada, setRemessaSelecionada] = useState<BagRemessa | null>(null);
  const [quantidadeRecebida, setQuantidadeRecebida] = useState(0);
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loadingRemessas, setLoadingRemessas] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(receberIdaAction, INITIAL_STATE);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(() => router.push('/dashboard/bags'), 1500);
    return () => clearTimeout(timer);
  }, [state.success, router]);

  // Auto-detect unit from session
  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const email = session?.user?.email;
        if (!email) { setSemVinculo(true); setCarregando(false); return; }

        const locRes = await fetch(`/api/locations?email=${encodeURIComponent(email)}`);
        const locData = await locRes.json();

        if (locData.local) {
          setMeuLocal(locData.local);
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

  // Load pending shipments for my location
  useEffect(() => {
    if (!meuLocal) return;
    setLoadingRemessas(true);
    fetch(`/api/bags/remessas?status=em_transito&destino_id=${meuLocal.id}`)
      .then((r) => r.json())
      .then((data) => setRemessas(data.remessas ?? []))
      .catch(() => setRemessas([]))
      .finally(() => setLoadingRemessas(false));
  }, [meuLocal, state.success]);

  const resetForm = useCallback(() => {
    setRemessaSelecionada(null);
    setQuantidadeRecebida(0);
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

  const selectRemessa = (r: BagRemessa) => {
    setRemessaSelecionada(r);
    setQuantidadeRecebida(r.quantidade_enviada);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-gray-500 text-xl">Identificando unidade...</p>
      </div>
    );
  }

  if (semVinculo) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-5">
        <div className="max-w-md text-center space-y-4">
          <p className="text-6xl">&#128683;</p>
          <h1 className="text-2xl font-bold text-gray-800">Unidade nao identificada</h1>
          <p className="text-gray-600">Seu e-mail nao esta vinculado a nenhuma loja, farma ou CD. Entre em contato com o administrador.</p>
          <Link href="/dashboard/bags" className="block text-green-600 underline text-lg">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Receber Bags</h1>
        <p className="text-green-100 text-base mt-1">Recebendo em: <strong>{meuLocal?.nome}</strong></p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={(e) => {
          if (!showConfirm) {
            e.preventDefault();
            if (!remessaSelecionada || !responsavel?.trim() || responsavel.trim().length < 2) return;
            setShowConfirm(true);
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !showConfirm) e.preventDefault(); }}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        {remessaSelecionada && (
          <input type="hidden" name="remessa_id" value={remessaSelecionada.id} />
        )}

        {/* Remessas pendentes */}
        <div>
          <p className="text-lg font-bold text-green-800 mb-3">1. Selecione a remessa *</p>
          {loadingRemessas && <p className="text-gray-500 text-center py-4">Carregando...</p>}
          {!loadingRemessas && remessas.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-5 text-lg text-center">
              Nenhuma remessa pendente para {meuLocal?.nome}.
            </div>
          )}
          {!loadingRemessas && remessas.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRemessa(r)}
              className={`w-full mb-3 border-2 rounded-2xl p-5 text-left transition-all ${
                remessaSelecionada?.id === r.id
                  ? 'bg-green-100 border-green-400'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-800">
                  {r.quantidade_enviada} bags
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(r.enviado_em).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                De: <strong>{r.origem_nome}</strong> &middot; Por: {r.enviado_por}
              </p>
              {r.observacao_envio && (
                <p className="text-sm text-gray-400 mt-1">{r.observacao_envio}</p>
              )}
            </button>
          ))}
        </div>

        {/* Quantidade recebida */}
        {remessaSelecionada && (
          <>
            <div>
              <p className="text-lg font-bold text-green-800 mb-3">
                2. Quantas bags recebeu? (enviadas: {remessaSelecionada.quantidade_enviada})
              </p>
              <div className="flex items-center gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setQuantidadeRecebida((q) => Math.max(0, q - 1))}
                  className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100"
                >
                  -
                </button>
                <input
                  name="quantidade_recebida"
                  type="number"
                  value={quantidadeRecebida}
                  onChange={(e) => setQuantidadeRecebida(Math.max(0, parseInt(e.target.value) || 0))}
                  aria-label="Quantidade recebida"
                  className={`w-32 text-center border-2 rounded-2xl p-4 text-4xl font-bold outline-none ${
                    quantidadeRecebida === remessaSelecionada.quantidade_enviada
                      ? 'bg-green-50 border-green-400 text-green-800'
                      : 'bg-red-50 border-red-400 text-red-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setQuantidadeRecebida((q) => q + 1)}
                  className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100"
                >
                  +
                </button>
              </div>
              {quantidadeRecebida !== remessaSelecionada.quantidade_enviada && (
                <p className="text-center text-red-600 font-semibold mt-3 text-lg">
                  Divergencia: {remessaSelecionada.quantidade_enviada - quantidadeRecebida} bags faltando
                </p>
              )}
            </div>

            {/* Responsavel */}
            <div>
              <p className="text-lg font-bold text-green-800 mb-3">3. Responsavel *</p>
              <input
                name="responsavel"
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do colaborador..."
                className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-green-500 outline-none text-xl"
              />
            </div>

            {/* Observacao */}
            <div>
              <p className="text-lg font-bold text-green-800 mb-3">4. Observacao</p>
              <textarea
                name="observacao"
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional..."
                className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-green-500 outline-none text-lg resize-none"
              />
            </div>

            {!showConfirm && (
              <button
                type="submit"
                disabled={isPending || state.success || !responsavel?.trim() || responsavel.trim().length < 2}
                className="w-full bg-green-600 active:bg-green-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
              >
                Confirmar Recebimento
              </button>
            )}

            {showConfirm && !state.success && (
              <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 space-y-4">
                <p className="text-xl font-bold text-green-800 text-center">Confirmar recebimento?</p>
                <div className="text-center space-y-1 text-lg text-gray-700">
                  <p>De: <strong>{remessaSelecionada.origem_nome}</strong></p>
                  <p>Enviadas: <strong>{remessaSelecionada.quantidade_enviada}</strong> bags</p>
                  <p>Recebidas: <strong className={quantidadeRecebida !== remessaSelecionada.quantidade_enviada ? 'text-red-600' : 'text-green-600'}>{quantidadeRecebida}</strong> bags</p>
                  {quantidadeRecebida !== remessaSelecionada.quantidade_enviada && (
                    <p className="text-red-600 font-semibold">{remessaSelecionada.quantidade_enviada - quantidadeRecebida} bags faltando!</p>
                  )}
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
                    className="flex-1 bg-green-600 active:bg-green-700 disabled:bg-gray-300 text-white font-bold py-5 rounded-2xl text-xl"
                  >
                    {isPending ? 'Registrando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            Recebimento confirmado!
          </div>
        )}

        <Link href="/dashboard/bags" className="block text-center text-green-600 underline text-lg mt-4">
          Voltar
        </Link>
      </form>
    </div>
  );
}
