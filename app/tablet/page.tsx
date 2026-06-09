'use client';

import { useState, useActionState, useEffect } from 'react';
import { createRecord } from '@/actions/records';
import { MaterialSelector } from '@/components/tablet/MaterialSelector';
import { WeightInput } from '@/components/tablet/WeightInput';
import { SectorDropdown } from '@/components/tablet/SectorDropdown';
import type { Material, Sector } from '@/types';

const INITIAL_STATE = { success: false, error: undefined };

export default function TabletPage() {
  const [material, setMaterial] = useState<Material | null>(null);
  const [weight, setWeight] = useState(0);
  const [sector, setSector] = useState<Sector | ''>('');
  const [showNotes, setShowNotes] = useState(false);

  const [state, formAction, isPending] = useActionState(createRecord, INITIAL_STATE);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setMaterial(null);
        setWeight(0);
        setSector('');
        setShowNotes(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-600 text-white px-6 py-4 text-center">
        <h1 className="text-xl font-bold">♻ Registro de Reciclagem</h1>
        <p className="text-green-100 text-sm mt-1 capitalize">{dateStr} · {timeStr}</p>
      </div>

      <form action={formAction} className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <input type="hidden" name="material_type" value={material ?? ''} />
        <input type="hidden" name="sector" value={sector} />

        <MaterialSelector value={material} onChange={setMaterial} />
        <SectorDropdown value={sector} onChange={setSector} />
        <WeightInput value={weight} onChange={setWeight} />

        {/* Responsável */}
        <div>
          <p className="text-sm font-bold text-green-800 mb-2">4. Responsável *</p>
          <input
            name="responsible_name"
            type="text"
            placeholder="Nome do colaborador..."
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-gray-700 focus:border-green-500 outline-none text-base"
          />
        </div>

        {/* Observações toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-sm text-green-700 underline"
          >
            {showNotes ? '▲ Ocultar observações' : '▼ Adicionar observação (opcional)'}
          </button>
          {showNotes && (
            <textarea
              name="notes"
              rows={3}
              placeholder="Observações..."
              className="mt-2 w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:border-green-500 outline-none text-sm resize-none"
            />
          )}
        </div>

        {/* Error / Success */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl p-4 text-center font-semibold">
            ✓ Registro salvo com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || state.success}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-5 rounded-xl text-base transition-colors"
        >
          {isPending ? 'Salvando...' : state.success ? '✓ Salvo!' : '✓ Confirmar Registro'}
        </button>
      </form>
    </div>
  );
}
