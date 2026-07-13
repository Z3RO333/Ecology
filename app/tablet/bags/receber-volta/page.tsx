'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { receberVoltaAction } from '@/actions/bag-remessas';
import type { BagRemessa } from '@/types/bags';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined as string | undefined };

export default function ReceberVoltaPage() {
  const [meuLocal, setMeuLocal] = useState<{ id: string; nome: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semVinculo, setSemVinculo] = useState(false);
  const [remessas, setRemessas] = useState<BagRemessa[]>([]);
  const [selecionada, setSelecionada] = useState<BagRemessa | null>(null);
  const [quantidadeRecebida, setQuantidadeRecebida] = useState(0);
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingRemessas, setLoadingRemessas] = useState(true);

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(receberVoltaAction, INITIAL_STATE);

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
    fetch(`/api/bags/remessas?tipo=pendentes_volta_receber&local_id=${meuLocal.id}`)
      .then((r) => r.json())
      .then((d) => setRemessas(d.remessas ?? []))
      .catch(() => setRemessas([]))
      .finally(() => setLoadingRemessas(false));
  }, [meuLocal, state.success]);

  const resetForm = useCallback(() => {
    setSelecionada(null); setQuantidadeRecebida(0); setResponsavel(''); setObservacao(''); setShowConfirm(false);
    formRef.current?.reset();
  }, []);

  useEffect(() => { if (state.success) setTimeout(resetForm, 3000); }, [state.success, resetForm]);

  const select = (r: BagRemessa) => { setSelecionada(r); setQuantidadeRecebida(r.qty_volta_enviada ?? 0); };

  if (carregando) return <div className="min-h-screen bg-teal-50 flex items-center justify-center"><p className="text-gray-500 text-xl">Identificando unidade...</p></div>;
  if (semVinculo) return <div className="min-h-screen bg-teal-50 flex items-center justify-center px-5"><div className="max-w-md text-center space-y-4"><p className="text-6xl">&#128683;</p><h1 className="text-2xl font-bold text-gray-800">Unidade nao identificada</h1><Link href="/dashboard/bags" className="block text-teal-600 underline text-lg">Voltar</Link></div></div>;

  return (
    <div className="min-h-screen bg-teal-50">
      <div className="bg-teal-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Receber Volta</h1>
        <p className="text-teal-100 text-base mt-1">Recebendo em: <strong>{meuLocal?.nome}</strong></p>
      </div>

      <form ref={formRef} action={formAction}
        onSubmit={(e) => { if (!showConfirm) { e.preventDefault(); if (!selecionada || !responsavel?.trim() || responsavel.trim().length < 2) return; setShowConfirm(true); } }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !showConfirm) e.preventDefault(); }}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7">
        {selecionada && <input type="hidden" name="remessa_id" value={selecionada.id} />}

        <div>
          <p className="text-lg font-bold text-teal-800 mb-3">1. Selecione a devolução *</p>
          {loadingRemessas && <p className="text-gray-500 text-center py-4">Carregando...</p>}
          {!loadingRemessas && remessas.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-5 text-lg text-center">Nenhuma devolução pendente.</div>
          )}
          {!loadingRemessas && remessas.map((r) => (
            <button key={r.id} type="button" onClick={() => select(r)}
              className={`w-full mb-3 border-2 rounded-2xl p-5 text-left transition-all ${selecionada?.id === r.id ? 'bg-teal-100 border-teal-400' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-800">{r.qty_volta_enviada} bags</span>
                <span className="text-sm text-gray-500">{r.volta_enviado_em ? new Date(r.volta_enviado_em).toLocaleString('pt-BR') : ''}</span>
              </div>
              <p className="text-gray-600 mt-1">De: <strong>{r.destino_nome}</strong> &middot; Por: {r.volta_enviado_por}</p>
            </button>
          ))}
        </div>

        {selecionada && (
          <>
            <div>
              <p className="text-lg font-bold text-teal-800 mb-3">2. Quantas bags recebeu? (devolvidas: {selecionada.qty_volta_enviada})</p>
              <div className="flex items-center gap-4 justify-center">
                <button type="button" onClick={() => setQuantidadeRecebida((q) => Math.max(0, q - 1))} className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100">-</button>
                <input name="quantidade_recebida" type="number" value={quantidadeRecebida}
                  onChange={(e) => setQuantidadeRecebida(Math.max(0, parseInt(e.target.value) || 0))}
                  aria-label="Quantidade recebida"
                  className={`w-32 text-center border-2 rounded-2xl p-4 text-4xl font-bold outline-none ${
                    quantidadeRecebida === (selecionada.qty_volta_enviada ?? 0) ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800'
                  }`} />
                <button type="button" onClick={() => setQuantidadeRecebida((q) => q + 1)} className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl text-4xl font-bold text-gray-600 active:bg-gray-100">+</button>
              </div>
              {quantidadeRecebida !== (selecionada.qty_volta_enviada ?? 0) && (
                <p className="text-center text-red-600 font-semibold mt-3 text-lg">Divergencia: {(selecionada.qty_volta_enviada ?? 0) - quantidadeRecebida} bags faltando</p>
              )}
            </div>

            <div>
              <p className="text-lg font-bold text-teal-800 mb-3">3. Responsavel *</p>
              <input name="responsavel" type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do colaborador..." className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-teal-500 outline-none text-xl" />
            </div>

            <div>
              <p className="text-lg font-bold text-teal-800 mb-3">4. Observacao</p>
              <textarea name="observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional..." className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-teal-500 outline-none text-lg resize-none" />
            </div>

            {!showConfirm && (
              <button type="submit" disabled={!responsavel?.trim() || responsavel.trim().length < 2}
                className="w-full bg-teal-600 active:bg-teal-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md">Confirmar Recebimento</button>
            )}

            {showConfirm && !state.success && (
              <div className="bg-teal-50 border-2 border-teal-400 rounded-2xl p-6 space-y-4">
                <p className="text-xl font-bold text-teal-800 text-center">Confirmar recebimento da volta?</p>
                <div className="text-center space-y-1 text-lg text-gray-700">
                  <p>Devolvidas: <strong>{selecionada.qty_volta_enviada}</strong> bags</p>
                  <p>Recebidas: <strong className={quantidadeRecebida !== (selecionada.qty_volta_enviada ?? 0) ? 'text-red-600' : 'text-green-600'}>{quantidadeRecebida}</strong> bags</p>
                  <p>Responsavel: <strong>{responsavel}</strong></p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 active:bg-gray-300 text-gray-700 font-bold py-5 rounded-2xl text-xl">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 bg-teal-600 active:bg-teal-700 disabled:bg-gray-300 text-white font-bold py-5 rounded-2xl text-xl">{isPending ? 'Registrando...' : 'Confirmar'}</button>
                </div>
              </div>
            )}
          </>
        )}

        {state.error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">{state.error}</div>}
        {state.success && <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">Ciclo concluido!</div>}
        <Link href="/dashboard/bags" className="block text-center text-teal-600 underline text-lg mt-4">Voltar</Link>
      </form>
    </div>
  );
}
