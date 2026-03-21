-- Fix launch_products schema: add columns expected by TypeScript interface.
-- TypeScript expects offer_mapping_id, product_type, lot_name.
-- DB had product_name, product_code, price, currency, position_type.
-- We add the new columns and keep the old ones to avoid breaking existing data.

ALTER TABLE launch_products
  ADD COLUMN IF NOT EXISTS offer_mapping_id uuid REFERENCES offer_mappings(id),
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS lot_name text;
