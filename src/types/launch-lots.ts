export type LotStatus = 'planned' | 'active' | 'finished';
export type LotOfferRole =
  | 'front'
  | 'bump_1' | 'bump_2' | 'bump_3' | 'bump_4' | 'bump_5'
  | 'upsell_1' | 'upsell_2' | 'upsell_3'
  | 'downsell_1' | 'downsell_2' | 'downsell_3';

export interface LaunchLot {
  id: string;
  edition_id: string;
  funnel_id: string;
  project_id: string;
  lot_number: number;
  name: string;
  start_datetime: string;
  end_datetime: string | null;
  status: LotStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchLotInsert {
  edition_id: string;
  funnel_id: string;
  project_id: string;
  name: string;
  lot_number?: number;
  start_datetime: string;
  end_datetime?: string | null;
  status?: LotStatus;
  notes?: string | null;
}

export interface LaunchLotOffer {
  id: string;
  lot_id: string;
  offer_mapping_id: string;
  role: LotOfferRole;
  created_at: string;
  // Joins from offer_mappings:
  nome_oferta?: string | null;
  codigo_oferta?: string | null;
  nome_produto?: string;
  valor?: number | null;
  tipo_posicao?: string | null;
}

export interface LaunchLotWithOffers extends LaunchLot {
  offers: LaunchLotOffer[];
}

// --- Tipos de Análise por Lote ---

export interface OfferMetric {
  offerMappingId: string;
  role: LotOfferRole;
  nomeProduto: string;
  nomeOferta: string;
  codigoOferta: string;
  valor: number;
  salesCount: number;
  revenue: number;
  /** TX de conversão vs FRONT do mesmo lote (0-100) */
  conversionRate: number;
}

export interface LotAnalysis {
  lot: LaunchLotWithOffers;
  totalRevenue: number;
  totalTickets: number; // count FRONT
  totalSpend: number;
  roas: number;
  avgTicket: number;
  offerMetrics: OfferMetric[];
}

export interface EditionTotals {
  totalRevenue: number;
  totalTickets: number;
  totalSpend: number;
  roas: number;
  avgTicket: number;
}
