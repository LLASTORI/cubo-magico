-- Add praise_keywords column to ai_knowledge_base table
ALTER TABLE public.ai_knowledge_base 
ADD COLUMN IF NOT EXISTS praise_keywords TEXT[] DEFAULT ARRAY['parabéns', 'excelente', 'incrível', 'maravilhoso', 'amei', 'adorei', 'perfeito', 'sensacional'];