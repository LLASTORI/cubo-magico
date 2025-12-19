-- Garantir que project_id não seja NULL para o ON CONFLICT funcionar
ALTER TABLE public.hotmart_sales 
ALTER COLUMN project_id SET NOT NULL;