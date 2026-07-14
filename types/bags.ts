export const BAG_STATUSES = [
  'disponivel',
  'em_uso',
  'em_transito',
  'danificada',
  'extraviada',
  'baixada',
] as const;

export type BagStatus = (typeof BAG_STATUSES)[number];

export const BAG_STATUS_LABELS: Record<BagStatus, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  em_transito: 'Em Trânsito',
  danificada: 'Danificada',
  extraviada: 'Extraviada',
  baixada: 'Baixada',
};

export const BAG_ACOES = [
  'cadastrada',
  'enviada',
  'recebida',
  'em_uso',
  'devolvida',
  'danificada',
  'extraviada',
  'higienizacao',
  'baixada',
] as const;

export type BagAcao = (typeof BAG_ACOES)[number];

export const BAG_ACAO_LABELS: Record<BagAcao, string> = {
  cadastrada: 'Cadastrada',
  enviada: 'Enviada',
  recebida: 'Recebida',
  em_uso: 'Em Uso',
  devolvida: 'Devolvida',
  danificada: 'Danificada',
  extraviada: 'Extraviada',
  higienizacao: 'Higienização',
  baixada: 'Baixada',
};

export const LOCAL_TIPOS = ['loja', 'cd', 'farma', 'setor', 'outro'] as const;

export type LocalTipo = (typeof LOCAL_TIPOS)[number];

export interface Local {
  id: string;
  nome: string;
  tipo: LocalTipo;
  ativo: boolean;
}

export interface Bag {
  id: string;
  codigo: string;
  tipo: string;
  status: BagStatus;
  local_atual_id: string | null;
  local_atual_nome?: string;
  setor_atual: string | null;
  data_cadastro: string;
  data_ultima_movimentacao: string | null;
  ativo: boolean;
}

export interface BagMovimentacao {
  id: string;
  bag_id: string;
  bag_codigo?: string;
  acao: BagAcao;
  local_origem_id: string | null;
  local_origem_nome?: string;
  local_destino_id: string | null;
  local_destino_nome?: string;
  setor: string | null;
  usuario_nome: string;
  observacao: string | null;
  created_at: string;
}

export interface CreateBagInput {
  codigo: string;
  tipo?: string;
  local_atual_id?: string;
  setor_atual?: string;
}

export interface CreateMovimentacaoInput {
  bag_id: string;
  acao: BagAcao;
  local_destino_id?: string;
  setor?: string;
  usuario_nome: string;
  observacao?: string;
}

export interface BagKPIData {
  total_bags: number;
  em_circulacao: number;
  disponiveis: number;
  extraviadas: number;
  danificadas: number;
}

export const REMESSA_STATUSES = [
  'ida_em_transito',
  'ida_recebida',
  'ida_divergencia',
  'volta_em_transito',
  'volta_recebida',
  'volta_divergencia',
  'concluida',
] as const;

export type RemessaStatus = (typeof REMESSA_STATUSES)[number];

export const REMESSA_STATUS_LABELS: Record<RemessaStatus, string> = {
  ida_em_transito: 'Ida - Em Trânsito',
  ida_recebida: 'Ida - Recebida',
  ida_divergencia: 'Ida - Divergência',
  volta_em_transito: 'Volta - Em Trânsito',
  volta_recebida: 'Volta - Recebida',
  volta_divergencia: 'Volta - Divergência',
  concluida: 'Concluída',
};

export interface BagRemessa {
  id: string;
  origem_id: string;
  origem_nome?: string;
  destino_id: string;
  destino_nome?: string;
  quantidade_enviada: number;
  quantidade_recebida: number | null;
  enviado_por: string;
  recebido_por: string | null;
  enviado_em: string;
  recebido_em: string | null;
  observacao_envio: string | null;
  observacao_recebimento: string | null;
  qty_volta_enviada: number | null;
  qty_volta_recebida: number | null;
  volta_enviado_por: string | null;
  volta_recebido_por: string | null;
  volta_enviado_em: string | null;
  volta_recebido_em: string | null;
  observacao_volta_envio: string | null;
  observacao_volta_recebimento: string | null;
  status: RemessaStatus;
}

export interface RemessaKPIData {
  total_remessas: number;
  em_transito_ida: number;
  em_transito_volta: number;
  concluidas: number;
  com_divergencia: number;
  bags_enviadas: number;
  bags_recebidas: number;
  bags_perdidas: number;
}

export type BagUnitSituation = 'regular' | 'atencao' | 'critica';

export interface BagUnitSummary {
  id: string;
  centro: number | null;
  nome: string;
  tipo: LocalTipo;
  destinadas: number;
  disponiveis: number;
  em_uso: number;
  devolvidas: number;
  pendentes: number;
  percentual_devolucao: number;
  ultima_movimentacao: string | null;
  remessas_atrasadas: number;
  situacao: BagUnitSituation;
}
