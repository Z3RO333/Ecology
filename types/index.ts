export type Material =
  | 'Papel'
  | 'Plástico'
  | 'Metal'
  | 'Vidro'
  | 'Orgânico'
  | 'Eletrônico'
  | 'Outro';

export type Sector =
  | 'Escritório 1'
  | 'Copa'
  | 'Escritório Anexo'
  | 'Loja'
  | 'Mercado'
  | 'Farma'
  | 'Outros';

export interface RecyclingRecord {
  id: string;
  material_type: Material;
  weight_kg: number;
  sector: Sector;
  responsible_name: string;
  notes: string | null;
  recorded_at: string;
  recorded_date: string;
}

export interface CreateRecordInput {
  material_type: Material;
  weight_kg: number;
  sector: Sector;
  responsible_name: string;
  notes?: string;
}

export interface KPIData {
  total_weight_kg: number;
  total_records: number;
  active_sectors: number;
}

export interface PeriodData {
  period: string;
  total_weight_kg: number;
}

export interface MaterialBreakdown {
  material_type: string;
  total_weight_kg: number;
}

export interface SectorRankingItem {
  sector: string;
  total_weight_kg: number;
}

export interface AnalyticsData {
  kpis: KPIData;
  byPeriod: PeriodData[];
  byMaterial: MaterialBreakdown[];
  bySector: SectorRankingItem[];
}

export type PeriodView = 'daily' | 'weekly' | 'monthly';

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  sectors: Sector[];
  materials: Material[];
  periodView: PeriodView;
}
