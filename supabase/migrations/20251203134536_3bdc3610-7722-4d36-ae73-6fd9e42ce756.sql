-- Adicionar campos de autorização na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_create_projects boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_projects integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Criar função para verificar se usuário pode criar projetos
CREATE OR REPLACE FUNCTION public.can_user_create_project(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND is_active = true) THEN false
      WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND can_create_projects = true) THEN false
      WHEN (SELECT max_projects FROM profiles WHERE id = _user_id) = 0 THEN true -- 0 = ilimitado
      WHEN (SELECT COUNT(*) FROM projects WHERE user_id = _user_id) < (SELECT max_projects FROM profiles WHERE id = _user_id) THEN true
      ELSE false
    END
$$;

-- Criar função para contar projetos do usuário
CREATE OR REPLACE FUNCTION public.count_user_projects(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM projects WHERE user_id = _user_id
$$;

-- Atualizar policy de INSERT na tabela projects para verificar autorização
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.can_user_create_project(auth.uid()));

-- Policy para admins verem todos os profiles (para gerenciamento)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Policy para admins atualizarem profiles (autorização)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Dar permissão ao usuário atual (você) como admin se ainda não tiver
-- Primeiro, vamos garantir que o owner atual tenha permissão de criar projetos
UPDATE public.profiles 
SET can_create_projects = true, max_projects = 0, is_active = true
WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin');