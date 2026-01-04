-- Adicionar módulo de AI Analysis na lista de módulos disponíveis

-- Inserir features de AI Analysis
INSERT INTO public.features (module_key, feature_key, name, description, is_active)
VALUES 
  ('ai_analysis', 'ai_analysis.funnel', 'Análise de Funil com IA', 'Permite gerar análises inteligentes de funis perpétuos usando IA', true),
  ('ai_analysis', 'ai_analysis.launch', 'Análise de Lançamento com IA', 'Permite gerar análises inteligentes de lançamentos usando IA', true),
  ('ai_analysis', 'ai_analysis.crm', 'Análise de CRM com IA', 'Permite gerar análises inteligentes do CRM usando IA', true),
  ('ai_analysis', 'ai_analysis.insights', 'Insights Automáticos com IA', 'Permite receber insights automáticos gerados por IA', true)
ON CONFLICT (feature_key) DO NOTHING;