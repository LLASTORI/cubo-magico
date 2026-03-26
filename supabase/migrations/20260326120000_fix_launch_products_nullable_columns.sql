-- Fix: product_name, product_code, position_type são NOT NULL no banco
-- mas o frontend não envia esses campos (usa offer_mapping_id no lugar).
-- Torná-los nullable para evitar erro de INSERT.

ALTER TABLE launch_products
  ALTER COLUMN product_name DROP NOT NULL;

ALTER TABLE launch_products
  ALTER COLUMN product_code DROP NOT NULL;

ALTER TABLE launch_products
  ALTER COLUMN position_type DROP NOT NULL;
