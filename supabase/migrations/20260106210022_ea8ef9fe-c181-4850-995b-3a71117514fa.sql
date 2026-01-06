
-- Criar função para garantir permissões admin para owners
CREATE OR REPLACE FUNCTION public.ensure_owner_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se é um owner, garantir permissões admin
  IF NEW.role = 'owner' THEN
    INSERT INTO public.project_member_permissions (
      project_id, user_id,
      dashboard, analise, crm, automacoes, chat_ao_vivo,
      meta_ads, ofertas, lancamentos, configuracoes,
      insights, pesquisas, social_listening
    ) VALUES (
      NEW.project_id, NEW.user_id,
      'admin', 'admin', 'admin', 'admin', 'admin',
      'admin', 'admin', 'admin', 'admin',
      'admin', 'admin', 'admin'
    )
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      dashboard = 'admin', analise = 'admin', crm = 'admin',
      automacoes = 'admin', chat_ao_vivo = 'admin', meta_ads = 'admin',
      ofertas = 'admin', lancamentos = 'admin', configuracoes = 'admin',
      insights = 'admin', pesquisas = 'admin', social_listening = 'admin',
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para novos membros
DROP TRIGGER IF EXISTS trigger_ensure_owner_permissions ON public.project_members;
CREATE TRIGGER trigger_ensure_owner_permissions
  AFTER INSERT ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_permissions();

-- Também criar permissões quando role é atualizado para owner
CREATE OR REPLACE FUNCTION public.handle_role_change_to_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'owner' AND (OLD.role IS NULL OR OLD.role != 'owner') THEN
    INSERT INTO public.project_member_permissions (
      project_id, user_id,
      dashboard, analise, crm, automacoes, chat_ao_vivo,
      meta_ads, ofertas, lancamentos, configuracoes,
      insights, pesquisas, social_listening
    ) VALUES (
      NEW.project_id, NEW.user_id,
      'admin', 'admin', 'admin', 'admin', 'admin',
      'admin', 'admin', 'admin', 'admin',
      'admin', 'admin', 'admin'
    )
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      dashboard = 'admin', analise = 'admin', crm = 'admin',
      automacoes = 'admin', chat_ao_vivo = 'admin', meta_ads = 'admin',
      ofertas = 'admin', lancamentos = 'admin', configuracoes = 'admin',
      insights = 'admin', pesquisas = 'admin', social_listening = 'admin',
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_handle_role_change_to_owner ON public.project_members;
CREATE TRIGGER trigger_handle_role_change_to_owner
  AFTER UPDATE OF role ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_role_change_to_owner();
