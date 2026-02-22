-- ============================================================================
-- CUBO MÁGICO - RESTAURAÇÃO DE FUNIS A PARTIR DE CATÁLOGO CONHECIDO
-- Uso: quando offer_mappings está com placeholders (ex.: "A Definir") e não
-- há informação suficiente para reconstruir funis reais apenas por id_funil.
-- ============================================================================

BEGIN;

WITH params AS (
  SELECT '7f44b177-5255-4393-a648-3f0dfc681be9'::uuid AS project_id
), catalog(id, name, campaign_name_pattern, launch_tag) AS (
  VALUES
  ('0202dae2-3f1c-41c8-8f06-94cad66d8e6c'::uuid,'A Definir',NULL,NULL),
  ('03dfab03-6b29-4f62-881e-4c62caf861ad'::uuid,'Face | Morango do Amor Deluxe','PERPETUO_MORANGO_DO_AMOR',NULL),
  ('06d9573a-d3c7-4b30-82e5-ff31d15a7f66'::uuid,'Face | Receitas Luxuosas de Doces Finos','PERPETUO_RLDF',NULL),
  ('16832a57-603e-4cde-bf65-63e0ac1bfede'::uuid,'Orgânico | Palestras R$1,00',NULL,NULL),
  ('49f1ffd7-a6c8-47c1-9789-8bf1039fd0c5'::uuid,'Face | R$49,90 Conteúdo Magnético','PERPETUO_CM_49,90_VENDA',NULL),
  ('4a330f5e-221d-42c0-9303-a65cec9db998'::uuid,'Orgânico | Arrastão Maquiagem para Festas',NULL,NULL),
  ('4dc90fd4-6174-4a02-831d-1ba0fe112165'::uuid,'Face | Maquiagem para Festas','PERPETUO_MAQUIAGEM_FESTA',NULL),
  ('517ce46c-25c4-4738-ba6f-961385923ecb'::uuid,'Natal | Natal Deluxe (2025)','PERPETUO_NATAL_2025',NULL),
  ('626ec2cd-f941-41d3-b3aa-321b9d5f8352'::uuid,'A Definir',NULL,NULL),
  ('635031aa-cca8-4dca-807b-c5cb4212fffa'::uuid,'FACE | BASIC MAGIC SHADOW','PERPETUO_BASIC_MAGIC_SHADOW',NULL),
  ('6b1b47db-3153-44cc-b93c-cad8a448b88a'::uuid,'Lançamento | Imersão Maquiagem','LANÇAMENTO_IMPM_JAN26',NULL),
  ('6b86c741-93b7-4b85-848d-45288ad44c8e'::uuid,'Black 2025 Alice Salazar: 10 cursos com 10 anos de acesso',NULL,'Black 2025 Alice Salazar: 10 cursos com 10 anos de acesso'),
  ('6c53522a-d426-4015-8f69-407fad4c4508'::uuid,'Face | Piel Madura LATAM','LATAM_PERPETUO_PIELMADURA',NULL),
  ('6e35fbf9-e171-42d7-880b-d4fe9f780f7a'::uuid,'A Definir',NULL,NULL),
  ('71c795d3-5bb0-4230-83e0-be52424f6e72'::uuid,'FACE | BF2025','BF2025','BF2025'),
  ('78b12630-8df0-45f0-9299-4fefd12f7e9d'::uuid,'Face | Conteúdo Magnético','PERPETUO_CM_VENDA',NULL),
  ('79fa230f-1b8c-4080-8f82-d94ad35b1933'::uuid,'Face | Maquiagem 35+','PERPETUO_MAQUIAGEM35+',NULL),
  ('840f04bf-6100-494a-b10a-e70097609013'::uuid,'Face | E-book Lista Secreta De Produtos e Marcas','PERPETUO_LISTA_SECRETA_PMM',NULL),
  ('8585c1ca-1a26-4a8b-b440-ff502b522b94'::uuid,'indefinido',NULL,NULL),
  ('8f5ad16b-cf34-4013-b21a-022c6aa9a37a'::uuid,'A Definir',NULL,NULL),
  ('a355c555-2348-4054-9073-78d221ed41c9'::uuid,'Face | Florais','PERPETUO_FLORAIS',NULL),
  ('ad089032-7078-4c18-a93e-c4a49eb8f94e'::uuid,'WEB01_MENT_PLANO20K','WEB01_MENT_PLANO20K','WEB01_MENT_PLANO20K'),
  ('b002d32f-0642-4773-b0d1-5d742604f489'::uuid,'Natflix | Combo 7 em 1',NULL,NULL),
  ('b671fd3b-d9a9-4054-847b-a909f1c8d075'::uuid,'LANÇAMENTO | L07_MNDF','L07_MNDF','L07_MNDF'),
  ('b89db38d-3d61-454a-ad2f-26ca8677fa7c'::uuid,'Lançamento | Curso Vista-se Bem Gastando Pouco',NULL,'Lançamento Março 2025'),
  ('bf24a6df-e98a-4d1e-8bc9-6b097a084a1b'::uuid,'A Definir',NULL,NULL),
  ('c188da0e-4c9f-4ad2-9b57-fc668b8be547'::uuid,'Face | Make Natural e Perfeita','PERPETUO_MAKE_NATURAL',NULL),
  ('d186a8a8-67ae-4fee-a365-bf0d6221dc45'::uuid,'Face | Make Rápida 13 Minutos','PERPETUO_MAKEPRATICA13M',NULL),
  ('d5e7b0f3-2897-4753-bf9b-e12a998c74cc'::uuid,'Orgânico | Arrastão Contorno',NULL,NULL),
  ('d7265bff-a352-4ac0-af6b-253db05b0364'::uuid,'Orgânico | E-books Alice Salazar',NULL,NULL),
  ('e9ad304b-c2a8-4092-b0f8-3f6aee77892c'::uuid,'Orgânico | Arrastão Ultraflix',NULL,NULL),
  ('f141bb8b-30be-40fd-bdf2-e911fd1c5aa4'::uuid,'Face | A temperagem Perfeita',NULL,NULL),
  ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'::uuid,'Funil Demo','demo',NULL),
  ('fb7fd4f9-0c4d-4a3e-8421-1241dce11202'::uuid,'Lançamento | LANÇAMENTO DEZEMBRO 25',NULL,'Lançamento | LANÇAMENTO DEZEMBRO 25')
)
INSERT INTO public.funnels (
  id,
  name,
  project_id,
  campaign_name_pattern,
  launch_tag,
  created_at,
  updated_at
)
SELECT c.id, c.name, p.project_id, c.campaign_name_pattern, c.launch_tag, NOW(), NOW()
FROM catalog c
CROSS JOIN params p
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    project_id = EXCLUDED.project_id,
    campaign_name_pattern = EXCLUDED.campaign_name_pattern,
    launch_tag = EXCLUDED.launch_tag,
    updated_at = NOW();

-- Backfill por nome apenas quando unívoco no projeto
UPDATE public.offer_mappings om
SET funnel_id = f.id,
    updated_at = NOW()
FROM public.funnels f
JOIN (
  SELECT project_id, name
  FROM public.funnels
  GROUP BY project_id, name
  HAVING COUNT(*) = 1
) uniq ON uniq.project_id = f.project_id AND uniq.name = f.name
JOIN params p ON p.project_id = f.project_id
WHERE om.project_id = p.project_id
  AND TRIM(om.id_funil) = f.name
  AND om.funnel_id IS NULL;

COMMIT;
