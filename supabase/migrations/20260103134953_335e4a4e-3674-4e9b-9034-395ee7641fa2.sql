-- Criar features para o módulo insights
INSERT INTO features (module_key, feature_key, name, description, is_active) VALUES
('insights', 'insights.view', 'Visualizar Insights', 'Acesso ao módulo de Insights', true),
('insights', 'insights.surveys', 'Pesquisas', 'Acesso às pesquisas dentro do Insights', true),
('insights', 'insights.social_listening', 'Social Listening', 'Monitoramento de comentários e interações sociais', true)
ON CONFLICT (feature_key) DO NOTHING;

-- Associar features de insights aos planos Business e superiores
-- Business mensal: 69df6e4d-938a-4d6e-ba90-019803224c61
-- Business anual: fc6e45e5-a1b2-469b-928f-df8106db6656
-- Ilimitado: 5b5d4814-8574-4bd6-8fcd-8aa5656cf00f

INSERT INTO plan_features (plan_id, feature_id, enabled)
SELECT 
  p.id as plan_id,
  f.id as feature_id,
  true as enabled
FROM features f
CROSS JOIN plans p
WHERE f.module_key = 'insights'
  AND p.id IN (
    '69df6e4d-938a-4d6e-ba90-019803224c61', -- Business mensal
    'fc6e45e5-a1b2-469b-928f-df8106db6656', -- Business anual
    '5b5d4814-8574-4bd6-8fcd-8aa5656cf00f'  -- Ilimitado
  )
ON CONFLICT DO NOTHING;