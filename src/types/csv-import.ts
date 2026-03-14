// src/types/csv-import.ts

export interface NormalizedOrderItem {
  own_transaction_id: string;
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: 'main' | 'bump' | 'upsell' | 'downsell' | 'subscription_renewal';
  base_price: number;
  quantity: number;
  producer_net_brl: number;
  platform_fee_brl: number;
  affiliate_brl: number;
  coproducer_brl: number;
  conversion_rate: number;
  is_debit: boolean;
}

export interface NormalizedOrderGroup {
  provider_order_id: string;
  own_transaction_id: string;
  status: 'approved' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'skip';
  ordered_at: string;
  approved_at: string | null;
  currency: string;
  customer_paid: number;
  raw_sck: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_instagram: string | null;
  buyer_country: string | null;
  items: NormalizedOrderItem[];
}

export interface ImportResult {
  created: number;
  complemented: number;
  skipped: number;
  contacts_created: number;
  contacts_updated: number;
  no_email: number;
  errors: string[];
  total_revenue_brl: number;
  period_start: string | null;
  period_end: string | null;
}

export interface CSVPreview {
  groups: NormalizedOrderGroup[];
  total_groups: number;
  total_items: number;
  total_revenue_brl: number;
  period_start: string | null;
  period_end: string | null;
  errors: string[];
}
