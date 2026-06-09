import type { Material, Sector } from '@/types';
import { formatDateInAppTimeZone } from '@/lib/format';

export const MATERIALS: Material[] = [
  'Papel',
  'Plástico',
  'Metal',
  'Vidro',
  'Orgânico',
  'Eletrônico',
  'Lixo Comum',
  'Outro',
];

export const SECTORS: Sector[] = [
  'Escritório 1',
  'Copa',
  'Escritório Anexo',
  'Loja',
  'Mercado',
  'Farma',
  'Outros',
];

export const MATERIAL_COLORS: Record<Material, string> = {
  Papel: '#86efac',
  Plástico: '#6ee7b7',
  Metal: '#93c5fd',
  Vidro: '#c4b5fd',
  Orgânico: '#fde68a',
  Eletrônico: '#fca5a5',
  'Lixo Comum': '#9ca3af',
  Outro: '#d1d5db',
};

export const DEFAULT_DATE_FROM = (): string => {
  const today = formatDateInAppTimeZone();
  return `${today.slice(0, 8)}01`;
};

export const DEFAULT_DATE_TO = (): string => {
  return formatDateInAppTimeZone();
};
