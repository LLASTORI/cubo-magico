-- Criar features para o módulo surveys
INSERT INTO features (module_key, feature_key, name, description, is_active) VALUES
('surveys', 'surveys.create', 'Criar Pesquisas', 'Permite criar novas pesquisas', true),
('surveys', 'surveys.edit', 'Editar Pesquisas', 'Permite editar pesquisas existentes', true),
('surveys', 'surveys.view_responses', 'Ver Respostas', 'Permite visualizar respostas das pesquisas', true),
('surveys', 'surveys.export', 'Exportar Respostas', 'Permite exportar respostas em CSV', true),
('surveys', 'surveys.csv_import', 'Importar CSV', 'Permite importar respostas via CSV', true),
('surveys', 'surveys.clone', 'Clonar Pesquisas', 'Permite duplicar pesquisas existentes', true),
('surveys', 'surveys.webhooks', 'Webhooks de Pesquisa', 'Permite usar webhooks para integração externa', true),
('surveys', 'surveys.identity_fields', 'Campos de Identidade', 'Permite usar campos que enriquecem dados do contato', true);

-- Associar features de surveys aos planos Business e superiores
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
WHERE f.module_key = 'surveys'
  AND p.id IN (
    '69df6e4d-938a-4d6e-ba90-019803224c61', -- Business mensal
    'fc6e45e5-a1b2-469b-928f-df8106db6656', -- Business anual
    '5b5d4814-8574-4bd6-8fcd-8aa5656cf00f'  -- Ilimitado
  )
ON CONFLICT DO NOTHING;