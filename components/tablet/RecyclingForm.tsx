'use client';

import { useState, useActionState, useEffect, useRef, useCallback } from 'react';
import { createRecord } from '@/actions/records';
import { MaterialSelector } from '@/components/tablet/MaterialSelector';
import { WeightInput } from '@/components/tablet/WeightInput';
import { SectorDropdown } from '@/components/tablet/SectorDropdown';
import type { Material, Sector } from '@/types';
import Link from 'next/link';

const INITIAL_STATE = { success: false, error: undefined };
const IDLE_RESET_MS = 90_000;

export type FormMode = 'cd' | 'escritorio';

const MODE_MATERIALS: Record<FormMode, Material[]> = {
  cd: ['Papel', 'Plástico', 'Metal', 'Vidro', 'Orgânico', 'Eletrônico', 'Lixo Comum', 'Outro'],
  escritorio: ['Lixo Comum', 'Outro'],
};

const MODE_SECTORS: Record<FormMode, Sector[]> = {
  cd: ['Farma', 'Loja', 'Mercado'],
  escritorio: ['Escritório Central', 'Escritório Anexo', 'Loja Matriz', 'Mercado Matriz'],
};

const MODE_TITLES: Record<FormMode, string> = {
  cd: 'Centro de Distribuição',
  escritorio: 'Escritório',
};

export function RecyclingForm({ mode }: { mode: FormMode }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [weight, setWeight] = useState(0);
  const [sector, setSector] = useState<Sector | ''>('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [activity, setActivity] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createRecord, INITIAL_STATE);
  // useActionState's `state` only changes on the next dispatch, so `state.success`
  // would otherwise stay true forever after the first successful submit, leaving
  // the button permanently disabled. Track a resettable local mirror instead.
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state.success) setShowSuccess(true);
  }, [state]);

  const resetForm = useCallback(() => {
    setMaterial(null);
    setWeight(0);
    setSector('');
    setResponsible('');
    setNotes('');
    setShowNotes(false);
    setShowSuccess(false);
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(resetForm, 2000);
    return () => clearTimeout(timer);
  }, [showSuccess, resetForm]);

  const isDirty =
    material !== null ||
    weight !== 0 ||
    sector !== '' ||
    responsible !== '' ||
    notes !== '' ||
    showNotes;
  useEffect(() => {
    if (!isDirty || isPending || showSuccess) return;
    const timer = setTimeout(resetForm, IDLE_RESET_MS);
    return () => clearTimeout(timer);
  }, [isDirty, isPending, showSuccess, activity, resetForm]);

  const bumpActivity = useCallback(() => setActivity((a) => a + 1), []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-600 text-white px-6 py-6 text-center">
        <h1 className="text-3xl font-bold">Registro de Reciclagem</h1>
        <p className="text-green-100 text-lg font-semibold mt-1">{MODE_TITLES[mode]}</p>
        <p className="text-green-100 text-base mt-1 capitalize">{dateStr} · {timeStr}</p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        onPointerDown={bumpActivity}
        onKeyDown={bumpActivity}
        className="max-w-2xl mx-auto px-5 py-8 space-y-7"
      >
        <input type="hidden" name="material_type" value={material ?? ''} />

        <MaterialSelector value={material} onChange={setMaterial} materials={MODE_MATERIALS[mode]} />
        <SectorDropdown value={sector} onChange={setSector} sectors={MODE_SECTORS[mode]} />
        <WeightInput value={weight} onChange={setWeight} />

        <div>
          <p className="text-lg font-bold text-green-800 mb-3">4. Responsavel *</p>
          <input
            name="responsible_name"
            type="text"
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-gray-700 focus:border-green-500 outline-none text-xl"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-base text-green-700 underline"
          >
            {showNotes ? 'Ocultar observacoes' : 'Adicionar observacao (opcional)'}
          </button>
          {showNotes && (
            <textarea
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observacoes..."
              className="mt-2 w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-gray-700 focus:border-green-500 outline-none text-lg resize-none"
            />
          )}
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-lg">
            {state.error}
          </div>
        )}
        {showSuccess && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-2xl p-5 text-center text-xl font-semibold">
            Registro salvo com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || showSuccess}
          className="w-full bg-green-600 active:bg-green-700 disabled:bg-gray-300 text-white font-bold py-7 rounded-2xl text-2xl transition-colors shadow-md"
        >
          {isPending ? 'Salvando...' : showSuccess ? 'Salvo!' : 'Confirmar Registro'}
        </button>

        <Link
          href="/tablet/reciclagem"
          className="block text-center text-green-600 underline text-lg mt-4"
        >
          Voltar
        </Link>
      </form>
    </div>
  );
}
