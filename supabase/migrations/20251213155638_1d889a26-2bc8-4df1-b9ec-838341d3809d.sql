-- Add campaign_name_pattern to launch_phases for automatic campaign matching
ALTER TABLE public.launch_phases 
ADD COLUMN campaign_name_pattern text;