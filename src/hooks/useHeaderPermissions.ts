import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionArea, PermissionLevel } from '@/hooks/useMemberPermissions';

interface HeaderPermissions {
  dashboard: boolean;
  analise: boolean;
  crm: boolean;
  automacoes: boolean;
  chat_ao_vivo: boolean;
  meta_ads: boolean;
  ofertas: boolean;
  lancamentos: boolean;
  configuracoes: boolean;
  insights: boolean;
  pesquisas: boolean;
  social_listening: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
}

const LEVEL_ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'admin'];

export function useHeaderPermissions() {
  const { currentProject } = useProject();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['header-permissions', currentProject?.id, user?.id],
    queryFn: async (): Promise<HeaderPermissions> => {
      if (!currentProject?.id || !user?.id) {
        return {
          dashboard: false,
          analise: false,
          crm: false,
          automacoes: false,
          chat_ao_vivo: false,
          meta_ads: false,
          ofertas: false,
          lancamentos: false,
          configuracoes: false,
          insights: false,
          pesquisas: false,
          social_listening: false,
          isOwner: false,
          isSuperAdmin: false,
        };
      }

      // Check super admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (roleData) {
        // Super admin has all permissions
        return {
          dashboard: true,
          analise: true,
          crm: true,
          automacoes: true,
          chat_ao_vivo: true,
          meta_ads: true,
          ofertas: true,
          lancamentos: true,
          configuracoes: true,
          insights: true,
          pesquisas: true,
          social_listening: true,
          isOwner: false,
          isSuperAdmin: true,
        };
      }

      // Check if user is owner
      const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.role === 'owner') {
        // Owner has all permissions
        return {
          dashboard: true,
          analise: true,
          crm: true,
          automacoes: true,
          chat_ao_vivo: true,
          meta_ads: true,
          ofertas: true,
          lancamentos: true,
          configuracoes: true,
          insights: true,
          pesquisas: true,
          social_listening: true,
          isOwner: true,
          isSuperAdmin: false,
        };
      }

      // Get granular permissions
      const { data: permData } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!permData) {
        // No permissions record - deny all except dashboard view
        return {
          dashboard: false,
          analise: false,
          crm: false,
          automacoes: false,
          chat_ao_vivo: false,
          meta_ads: false,
          ofertas: false,
          lancamentos: false,
          configuracoes: false,
          insights: false,
          pesquisas: false,
          social_listening: false,
          isOwner: false,
          isSuperAdmin: false,
        };
      }

      // Check each area - user needs at least 'view' level
      const hasAccess = (area: PermissionArea): boolean => {
        const level = permData[area] as PermissionLevel | undefined;
        if (!level || level === 'none') return false;
        return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf('view');
      };

      return {
        dashboard: hasAccess('dashboard'),
        analise: hasAccess('analise'),
        crm: hasAccess('crm'),
        automacoes: hasAccess('automacoes'),
        chat_ao_vivo: hasAccess('chat_ao_vivo'),
        meta_ads: hasAccess('meta_ads'),
        ofertas: hasAccess('ofertas'),
        lancamentos: hasAccess('lancamentos'),
        configuracoes: hasAccess('configuracoes'),
        insights: hasAccess('insights'),
        pesquisas: hasAccess('pesquisas'),
        social_listening: hasAccess('social_listening'),
        isOwner: false,
        isSuperAdmin: false,
      };
    },
    enabled: !!currentProject?.id && !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    permissions: data || {
      dashboard: false,
      analise: false,
      crm: false,
      automacoes: false,
      chat_ao_vivo: false,
      meta_ads: false,
      ofertas: false,
      lancamentos: false,
      configuracoes: false,
      insights: false,
      pesquisas: false,
      social_listening: false,
      isOwner: false,
      isSuperAdmin: false,
    },
    isLoading,
  };
}
