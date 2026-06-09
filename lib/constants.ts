import type { Material, Sector } from '@/types';

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
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_DATE_TO = (): string => {
  return new Date().toISOString().split('T')[0];
};
