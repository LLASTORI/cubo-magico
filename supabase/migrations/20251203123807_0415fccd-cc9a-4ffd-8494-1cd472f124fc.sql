-- Criar enum para roles do projeto
CREATE TYPE public.project_role AS ENUM ('owner', 'manager', 'operator');

-- Criar enum para status do convite
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Tabela de membros do projeto
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'operator',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Tabela de convites
CREATE TABLE public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'operator',
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, email, status) -- Evita convites duplicados pendentes
);

-- Habilitar RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário no projeto
CREATE OR REPLACE FUNCTION public.get_user_project_role(_user_id UUID, _project_id UUID)
RETURNS project_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE user_id = _user_id AND project_id = _project_id
$$;

-- Função para verificar se usuário tem acesso ao projeto
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- Função para contar membros do projeto
CREATE OR REPLACE FUNCTION public.count_project_members(_project_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.project_members
  WHERE project_id = _project_id
$$;

-- Função para verificar se pode convidar (limite de 5)
CREATE OR REPLACE FUNCTION public.can_invite_to_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.count_project_members(_project_id) < 5
$$;

-- RLS para project_members
CREATE POLICY "Members can view project members"
ON public.project_members FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Owner can manage all members"
ON public.project_members FOR ALL
USING (public.get_user_project_role(auth.uid(), project_id) = 'owner');

CREATE POLICY "Manager can remove operators"
ON public.project_members FOR DELETE
USING (
  public.get_user_project_role(auth.uid(), project_id) = 'manager'
  AND role = 'operator'
);

CREATE POLICY "Members can leave project (except owner)"
ON public.project_members FOR DELETE
USING (
  user_id = auth.uid()
  AND role != 'owner'
);

-- RLS para project_invites
CREATE POLICY "Members can view project invites"
ON public.project_invites FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Owner can manage all invites"
ON public.project_invites FOR ALL
USING (public.get_user_project_role(auth.uid(), project_id) = 'owner');

CREATE POLICY "Manager can create operator invites"
ON public.project_invites FOR INSERT
WITH CHECK (
  public.get_user_project_role(auth.uid(), project_id) = 'manager'
  AND role = 'operator'
  AND public.can_invite_to_project(project_id)
);

CREATE POLICY "Users can view invites sent to them"
ON public.project_invites FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can respond to their invites"
ON public.project_invites FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

-- Migrar projetos existentes: owner atual vira membro owner
INSERT INTO public.project_members (project_id, user_id, role, joined_at)
SELECT id, user_id, 'owner'::project_role, created_at
FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Atualizar RLS das outras tabelas para usar nova estrutura
DROP POLICY IF EXISTS "Users can manage funnels via project" ON public.funnels;
CREATE POLICY "Members can manage funnels"
ON public.funnels FOR ALL
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can manage project sales" ON public.hotmart_sales;
DROP POLICY IF EXISTS "Users can view project sales" ON public.hotmart_sales;
CREATE POLICY "Members can view project sales"
ON public.hotmart_sales FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage sales"
ON public.hotmart_sales FOR ALL
USING (
  public.get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager')
);

DROP POLICY IF EXISTS "Users can manage own project credentials" ON public.project_credentials;
DROP POLICY IF EXISTS "Users can view own project credentials" ON public.project_credentials;
CREATE POLICY "Managers and owners can manage credentials"
ON public.project_credentials FOR ALL
USING (
  public.get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager')
);

CREATE POLICY "Members can view credentials"
ON public.project_credentials FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));