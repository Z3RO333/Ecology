'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { enviarVoltaAction } from '@/actions/bag-remessas';
import type { BagRemessa } from '@/types/bags';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined as string | undefined };

export default function DevolverBagsPage() {
  const [meuLocal, setMeuLocal] = useState<{ id: string; nome: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semVinculo, setSemVinculo] = useState(false);
  const [remessas, setRemessas] = useState<BagRemessa[]>([]);
  const [selecionada, setSelecionada] = useState<BagRemessa | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingRemessas, setLoadingRemessas] = useState(false);

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(enviarVoltaAction, INITIAL_STATE);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(() => router.push('/dashboard/bags'), 1500);
    return () => clearTimeout(timer);
  }, [state.success, router]);

  useEffect(() => {
    (async () => {
      try {
        const s = await (await fetch('/api/auth/session')).json();
        if (!s?.user?.email) { setSemVinculo(true); setCarregando(false); return; }
        const loc = await (await fetch(`/api/locations?email=${encodeURIComponent(s.user.email)}`)).json();
        if (loc.local) setMeuLocal(loc.local);
        else setSemVinculo(true);
      } catch { setSemVinculo(true); }
      finally { setCarregando(false); }
    })();
  }, []);

  useEffect(() => {
    if (!meuLocal) return;
    setLoadingRemessas(true);
    fetch(`/api/bags/remessas?tipo=pendentes_devolver&local_id=${meuLocal.id}`)
      .then((r) => r.json())
      .then((d) => setRemessas(d.remessas ?? []))
      .catch(() => setRemessas([]))
      .finally(() => setLoadingRemessas(false));
  }, [meuLocal, state.success]);

  const resetForm = useCallback(() => {
    setSelecionada(null); setQuantidade(0); setResponsavel(''); setObservacao(''); setShowConfirm(false);
    formRef.current?.reset();
  }, []);

  useEffect(() => { if (state.success) setTimeout(resetForm, 3000); }, [state.success, resetForm]);

  const select = (r: BagRemessa) => { setSelecionada(r); setQuantidade(r.quantidade_recebida ?? r.quantidade_enviada); };

  if (carregando) return <div className="min-h-screen bg-purple-50 flex items-center justify-center"><p className="text-gray-500 text-xl">Identificando unidade...</p></div>;
  if (semVinculo) return <div className="min-h-screen bg-purple-50 flex items-center justify-center px-5"><div className="max-w-md text-center space-y-4"><p className="text-6xl">&#128683;</p><h1 className="text-2xl font-bold text-gray-800">Unidade nao identificada</h1><Link href="/dashboard/bags" className="block text-purple-600 underline text-lg">Voltar</Link></div></div>;

  return (
    <div className="min-h-screen bg-purple-50">
      <div className="bg-purple-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Devolver Bags</h1>
        <p className="text-purple-100 text-base mt-1">Devolvendo de: <strong>{meuLocal?.nome}</strong></p>
      </div>

      <form ref={formRef} action={formAction}
        onSubmit={(e) => { if (!showConfirm) { e.preventDefault(); if (!selecionada || !responsavel?.trim() || responsavel.trim().length < 2) return; setShowConfirm(true); } }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !showConfirm) e.preventDefault(); }}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7">
        {selecionada && <input type="hidden" name="remessa_id" value={selecionada.id} />}

        <div>
          <p className="text-lg font-bold text-purple-800 mb-3">1. Selecione a remessa para devolver *</p>
          {loadingRemessas && <p className="text-gray-500 text-center py-4">Carregando...</p>}
          {!loadingRemessas && remessas.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-5 text-lg text-center">Nenhuma remessa aguardando devolução.</div>
          )}
          {!loadingRemessas && remessas.map((r) => (
            <button key={r.id} type="button" onClick={() => select(r)}
              className={`w-full mb-3 border-2 rounded-2xl p-5 text-left transition-all ${selecionada?.id === r.id ? 'bg-purple-100 border-purple-400' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-800">{r.quantidade_recebida ?? r.quantidade_enviada} bags recebidas</span>
                <span className="text-sm text-gray-500">{new Date(r.recebido_em!).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-gray-600 mt-1">De: <strong>{r.origem_nome}</strong> &middot; Recebido por: {r.recebido_por}</p>
            </button>
          ))}
        </div>

        {selecionada && (
          <>
            <div>
              <p className="text-lg font-bold text-purple-800 mb-3">2. Quantas bags devolver?</p>
              <div className="flex items-center gap-4 justify-center">
                <button type="button" onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100">-</button>
                <input name="quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))} aria-label="Quantidade" className="w-32 text-center bg-white border-2 border-gray-200 rounded-2xl p-4 text-4xl font-bold text-gray-800 outline-none" />
                <button type="button" onClick={() => setQuantidade((q) => q + 1)} className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100">+</button>
              </div>
            </div>

            <div>
              <p className="text-lg font-bold text-purple-800 mb-3">3. Responsavel *</p>
              <input name="responsavel" type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do colaborador..." className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-purple-500 outline-none text-xl" />
            </div>

            <div>
              <p className="text-lg font-bold text-purple-800 mb-3">4. Observacao</p>
              <textarea name="observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional..." className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-purple-500 outline-none text-lg resize-none" />
            </div>

            {!showConfirm && (
              <button type="submit" disabled={!responsavel?.trim() || responsavel.trim().length < 2}
                className="w-full bg-purple-600 active:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md">Devolver Bags</button>
            )}

            {showConfirm && !state.success && (
              <div className="bg-purple-50 border-2 border-purple-400 rounded-2xl p-6 space-y-4">
                <p className="text-xl font-bold text-purple-800 text-center">Confirmar devolução?</p>
                <div className="text-center space-y-1 text-lg text-gray-700">
                  <p><strong>{quantidade}</strong> bags</p>
                  <p>De: <strong>{meuLocal?.nome}</strong></p>
                  <p>Para: <strong>{selecionada.origem_nome}</strong></p>
                  <p>Responsavel: <strong>{responsavel}</strong></p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 active:bg-gray-300 text-gray-700 font-bold py-5 rounded-2xl text-xl">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 bg-purple-600 active:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-5 rounded-2xl text-xl">{isPending ? 'Enviando...' : 'Confirmar'}</button>
                </div>
              </div>
            )}
          </>
        )}

        {state.error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">{state.error}</div>}
        {state.success && <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">Devolução registrada!</div>}
        <Link href="/dashboard/bags" className="block text-center text-purple-600 underline text-lg mt-4">Voltar</Link>
      </form>
    </div>
  );
}
