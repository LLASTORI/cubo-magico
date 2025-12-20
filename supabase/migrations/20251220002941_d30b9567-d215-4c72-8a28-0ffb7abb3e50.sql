
-- Remover trigger e função antiga com CASCADE
DROP TRIGGER IF EXISTS record_interaction_from_hotmart_trigger ON hotmart_sales;
DROP FUNCTION IF EXISTS public.record_interaction_from_hotmart() CASCADE;

-- Também remover o trigger antigo se existir
DROP TRIGGER IF EXISTS trg_record_interaction_from_hotmart ON hotmart_sales;
