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
  'Escritório Central',
  'Escritório Anexo',
  'Farma',
  'Loja',
  'Mercado',
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
  return '2000-01-01';
};

export const DEFAULT_DATE_TO = (): string => {
  return formatDateInAppTimeZone();
};
