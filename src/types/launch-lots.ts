export type LotStatus = 'planned' | 'active' | 'finished';
export type LotOfferRole = 'front' | 'bump' | 'upsell' | 'downsell';

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
