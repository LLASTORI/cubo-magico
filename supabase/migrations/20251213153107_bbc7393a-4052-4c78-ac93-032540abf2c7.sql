-- Add lot_name field to launch_products for batch/lot grouping
ALTER TABLE public.launch_products ADD COLUMN lot_name text DEFAULT NULL;