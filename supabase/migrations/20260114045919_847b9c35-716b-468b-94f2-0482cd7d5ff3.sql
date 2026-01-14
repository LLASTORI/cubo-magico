-- =====================================================
-- FINANCE_CORE_VIEW: Camada Financeira Canônica
-- =====================================================
-- 
-- PRINCÍPIO: A Hotmart é o sistema contábil.
--            O Cubo é apenas o espelho analítico.
--
-- Esta view usa APENAS dados de hotmart_sales.
-- Nenhum fallback matemático. Nenhuma estimativa.
--
-- Arquitetura:
--   Hotmart API → hotmart_sales → finance_core_view → UI
--
-- =====================================================

CREATE OR REPLACE VIEW public.finance_core_view AS
WITH ranked_sales AS (
  SELECT
    hs.id,
    hs.project_id,
    hs.transaction_id,
    
    -- ========== DADOS FINANCEIROS (APENAS HOTMART) ==========
    -- Receita bruta = total_price (valor cobrado do cliente)
    COALESCE(hs.total_price, 0) AS gross_amount,
    
    -- Receita líquida = net_revenue (valor repassado pela Hotmart)
    -- Se net_revenue = 0, marca como pendente (NÃO inventa valor!)
    hs.net_revenue AS net_amount,
    
    -- Flag para indicar se líquido ainda não foi calculado pela Hotmart
    CASE WHEN COALESCE(hs.net_revenue, 0) = 0 THEN true ELSE false END AS is_net_pending,
    
    -- Valor em BRL (para moedas estrangeiras)
    hs.total_price_brl,
    
    -- ========== STATUS (prioridade para deduplicação) ==========
    hs.status AS hotmart_status,
    
    -- Prioridade: COMPLETE > APPROVED > outros
    CASE 
      WHEN hs.status = 'COMPLETE' THEN 1
      WHEN hs.status = 'APPROVED' THEN 2
      WHEN hs.status = 'DELAYED' THEN 3
      WHEN hs.status = 'PRINTED_BILLET' THEN 4
      WHEN hs.status = 'WAITING_PAYMENT' THEN 5
      WHEN hs.status = 'OVERDUE' THEN 6
      WHEN hs.status = 'UNDER_ANALISYS' THEN 7
      ELSE 99
    END AS status_priority,
    
    -- Flag para vendas válidas (que contam como receita)
    CASE 
      WHEN hs.status IN ('APPROVED', 'COMPLETE') THEN true
      ELSE false
    END AS is_valid_sale,
    
    -- Flag para vendas canceladas/devolvidas
    CASE 
      WHEN hs.status IN ('CANCELLED', 'REFUNDED', 'CHARGEBACK') THEN true
      ELSE false
    END AS is_cancelled,
    
    -- ========== TEMPORAL (São Paulo timezone) ==========
    -- economic_timestamp = momento da venda no fuso de São Paulo
    (hs.sale_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS economic_timestamp,
    
    -- economic_day = data do dia em São Paulo (para agrupamentos)
    DATE((hs.sale_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) AS economic_day,
    
    hs.sale_date AS occurred_at,
    hs.confirmation_date,
    
    -- ========== PRODUTO E OFERTA ==========
    hs.product_code,
    hs.product_name,
    hs.offer_code,
    hs.offer_currency AS currency,
    
    -- ========== COMPRADOR ==========
    hs.buyer_email,
    hs.buyer_name,
    hs.buyer_phone,
    hs.buyer_phone_ddd,
    hs.buyer_document,
    hs.buyer_city,
    hs.buyer_state,
    hs.buyer_country,
    
    -- ========== PAGAMENTO ==========
    hs.payment_method,
    hs.payment_type,
    hs.installment_number AS installments,
    hs.coupon AS coupon_code,
    
    -- ========== AFILIADO ==========
    hs.affiliate_code,
    hs.affiliate_name,
    
    -- ========== ORIGEM DO CHECKOUT ==========
    hs.checkout_origin,
    hs.sale_origin,
    
    -- ========== UTMs (direto da Hotmart) ==========
    hs.utm_source,
    hs.utm_campaign_id AS utm_campaign,
    hs.utm_adset_name AS utm_adset,
    hs.utm_creative,
    hs.utm_placement,
    
    -- Meta IDs extraídos
    hs.meta_campaign_id_extracted AS meta_campaign_id,
    hs.meta_adset_id_extracted AS meta_adset_id,
    hs.meta_ad_id_extracted AS meta_ad_id,
    
    -- ========== FUNIL (via offer_mappings) ==========
    om.funnel_id,
    om.tipo_posicao,
    om.nome_oferta,
    f.name AS funnel_name,
    f.funnel_type,
    
    -- ========== METADADOS ==========
    hs.created_at,
    hs.updated_at,
    hs.last_synced_at,
    
    -- ========== DEDUPLICAÇÃO ==========
    -- Apenas 1 linha por transaction_id (a mais completa)
    ROW_NUMBER() OVER (
      PARTITION BY hs.project_id, hs.transaction_id
      ORDER BY 
        -- Prioridade por status (COMPLETE > APPROVED > outros)
        CASE 
          WHEN hs.status = 'COMPLETE' THEN 1
          WHEN hs.status = 'APPROVED' THEN 2
          ELSE 99
        END,
        -- Em caso de empate, pega o mais recente
        hs.updated_at DESC NULLS LAST,
        hs.created_at DESC
    ) AS rn

  FROM public.hotmart_sales hs
  
  -- JOIN com offer_mappings para pegar funnel_id
  LEFT JOIN public.offer_mappings om
    ON om.project_id = hs.project_id
   AND om.codigo_oferta = hs.offer_code
  
  -- JOIN com funnels para pegar nome do funil
  LEFT JOIN public.funnels f
    ON f.id = om.funnel_id
  
  -- Apenas vendas válidas ou canceladas (para acompanhamento)
  -- Exclui: WAITING_PAYMENT, PRINTED_BILLET, etc. de transações não convertidas
  WHERE hs.status IN ('APPROVED', 'COMPLETE', 'CANCELLED', 'REFUNDED', 'CHARGEBACK')
)

SELECT 
  id,
  project_id,
  transaction_id,
  
  -- Financeiro
  gross_amount,
  net_amount,
  is_net_pending,
  total_price_brl,
  
  -- Status
  hotmart_status,
  is_valid_sale,
  is_cancelled,
  
  -- Temporal
  economic_timestamp,
  economic_day,
  occurred_at,
  confirmation_date,
  
  -- Produto/Oferta
  product_code,
  product_name,
  offer_code,
  currency,
  
  -- Comprador
  buyer_email,
  buyer_name,
  buyer_phone,
  buyer_phone_ddd,
  buyer_document,
  buyer_city,
  buyer_state,
  buyer_country,
  
  -- Pagamento
  payment_method,
  payment_type,
  installments,
  coupon_code,
  
  -- Afiliado
  affiliate_code,
  affiliate_name,
  
  -- Origem
  checkout_origin,
  sale_origin,
  
  -- UTMs
  utm_source,
  utm_campaign,
  utm_adset,
  utm_creative,
  utm_placement,
  meta_campaign_id,
  meta_adset_id,
  meta_ad_id,
  
  -- Funil
  funnel_id,
  tipo_posicao,
  nome_oferta,
  funnel_name,
  funnel_type,
  
  -- Metadados
  created_at,
  updated_at,
  last_synced_at

FROM ranked_sales
WHERE rn = 1;

-- Comentário explicativo
COMMENT ON VIEW public.finance_core_view IS 
'Camada financeira canônica. Fonte ÚNICA de dados financeiros.
- Usa APENAS hotmart_sales (nenhum fallback!)
- Deduplicada por transaction_id
- economic_timestamp em fuso America/Sao_Paulo
- is_valid_sale = APPROVED ou COMPLETE
- is_cancelled = CANCELLED, REFUNDED ou CHARGEBACK
- is_net_pending = net_revenue ainda não calculado pela Hotmart';