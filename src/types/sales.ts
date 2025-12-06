// Unified sales data interface used across all funnel analysis components
export interface UnifiedSaleData {
  transaction_id: string;
  product_name: string;
  offer_code?: string | null;
  total_price_brl?: number | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  sale_date?: string | null;
  status: string;
  meta_campaign_id_extracted?: string | null;
  meta_adset_id_extracted?: string | null;
  meta_ad_id_extracted?: string | null;
  utm_source?: string | null;
  utm_campaign_id?: string | null;
  utm_adset_name?: string | null;
  utm_creative?: string | null;
  utm_placement?: string | null;
  payment_method?: string | null;
  installment_number?: number | null;
}
