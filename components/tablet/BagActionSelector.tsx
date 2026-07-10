'use client';

import { BAG_ACOES, BAG_ACAO_LABELS } from '@/types/bags';
import type { BagAcao } from '@/types/bags';

const ACAO_COLORS: Record<BagAcao, string> = {
  cadastrada: 'bg-blue-100 border-blue-400 text-blue-800',
  enviada: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  recebida: 'bg-green-100 border-green-400 text-green-800',
  em_uso: 'bg-purple-100 border-purple-400 text-purple-800',
  devolvida: 'bg-teal-100 border-teal-400 text-teal-800',
  danificada: 'bg-red-100 border-red-400 text-red-800',
  extraviada: 'bg-orange-100 border-orange-400 text-orange-800',
  higienizacao: 'bg-cyan-100 border-cyan-400 text-cyan-800',
  baixada: 'bg-gray-100 border-gray-400 text-gray-800',
};

const MOVEMENT_ACOES = BAG_ACOES.filter((a) => a !== 'cadastrada');

interface BagActionSelectorProps {
  value: BagAcao | '';
  onChange: (value: BagAcao) => void;
}

export function BagActionSelector({ value, onChange }: BagActionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MOVEMENT_ACOES.map((acao) => (
        <button
          key={acao}
          type="button"
          onClick={() => onChange(acao)}
          className={`border-2 rounded-2xl p-4 text-lg font-semibold transition-all ${
            value === acao
              ? ACAO_COLORS[acao]
              : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          {BAG_ACAO_LABELS[acao]}
        </button>
      ))}
    </div>
  );
}
