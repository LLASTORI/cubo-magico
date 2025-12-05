-- Adicionar campos para o sistema Cubo Mágico na tabela funnels
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS roas_target numeric DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS campaign_name_pattern text;

-- Comentários para documentação
COMMENT ON COLUMN public.funnels.roas_target IS 'ROAS alvo do funil para cálculo do CPA máximo aceitável';
COMMENT ON COLUMN public.funnels.campaign_name_pattern IS 'Padrão de nome para identificar campanhas Meta deste funil (ex: PERPETUO_MAQUIAGEM35+)';