-- ============================================
-- Fase 1: Adicionar public_code à tabela projects
-- ============================================

-- Adicionar coluna public_code (identificador público único do projeto)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS public_code VARCHAR(10) UNIQUE;

-- Criar índice para buscas rápidas por public_code
CREATE INDEX IF NOT EXISTS idx_projects_public_code ON public.projects(public_code);

-- Função para gerar código único no formato cm_XXXXXX
CREATE OR REPLACE FUNCTION public.generate_project_public_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  -- Só gerar se public_code for NULL
  IF NEW.public_code IS NULL THEN
    LOOP
      -- Gerar 6 caracteres alfanuméricos aleatórios
      new_code := 'cm_';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      -- Verificar unicidade
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE public_code = new_code);
    END LOOP;
    
    NEW.public_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para gerar código automaticamente ao criar projeto
DROP TRIGGER IF EXISTS trigger_generate_project_public_code ON public.projects;
CREATE TRIGGER trigger_generate_project_public_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_project_public_code();

-- Popular projetos existentes que não têm public_code
DO $$
DECLARE
  proj RECORD;
  new_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  FOR proj IN SELECT id FROM public.projects WHERE public_code IS NULL LOOP
    LOOP
      new_code := 'cm_';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE public_code = new_code);
    END LOOP;
    
    UPDATE public.projects SET public_code = new_code WHERE id = proj.id;
  END LOOP;
END $$;

-- Agora que todos os projetos têm public_code, tornar a coluna NOT NULL
ALTER TABLE public.projects ALTER COLUMN public_code SET NOT NULL;