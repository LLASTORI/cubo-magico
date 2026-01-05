import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';
export type WhatsAppVisibilityMode = 'all' | 'department' | 'assigned_only' | 'department_and_unassigned';

export interface RoleTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  base_role: 'owner' | 'manager' | 'operator';
  is_system_default: boolean;
  is_custom: boolean;
  icon: string;
  
  // Permissões por área
  perm_dashboard: PermissionLevel;
  perm_analise: PermissionLevel;
  perm_crm: PermissionLevel;
  perm_automacoes: PermissionLevel;
  perm_chat_ao_vivo: PermissionLevel;
  perm_meta_ads: PermissionLevel;
  perm_ofertas: PermissionLevel;
  perm_lancamentos: PermissionLevel;
  perm_configuracoes: PermissionLevel;
  perm_insights: PermissionLevel;
  perm_pesquisas: PermissionLevel;
  perm_social_listening: PermissionLevel;
  
  // Configurações de WhatsApp
  whatsapp_visibility_mode: WhatsAppVisibilityMode;
  whatsapp_max_chats: number;
  whatsapp_is_supervisor: boolean;
  whatsapp_auto_create_agent: boolean;
  
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const PERMISSION_AREA_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  analise: 'Análise',
  crm: 'CRM',
  automacoes: 'Automações',
  chat_ao_vivo: 'Chat ao Vivo',
  meta_ads: 'Meta Ads',
  ofertas: 'Ofertas',
  lancamentos: 'Lançamentos',
  configuracoes: 'Configurações',
  insights: 'Insights',
  pesquisas: 'Pesquisas',
  social_listening: 'Social Listening',
};

export const VISIBILITY_MODE_LABELS: Record<WhatsAppVisibilityMode, { label: string; description: string }> = {
  all: { 
    label: 'Todas as conversas', 
    description: 'Vê todas as conversas do projeto' 
  },
  department: { 
    label: 'Departamento', 
    description: 'Vê apenas conversas do seu departamento' 
  },
  assigned_only: { 
    label: 'Apenas atribuídas', 
    description: 'Vê apenas conversas atribuídas a ele' 
  },
  department_and_unassigned: { 
    label: 'Departamento + Fila', 
    description: 'Vê conversas do departamento e não atribuídas' 
  },
};

export const ROLE_ICON_MAP: Record<string, string> = {
  shield: 'Shield',
  briefcase: 'Briefcase',
  target: 'Target',
  users: 'Users',
  'bar-chart-2': 'BarChart2',
  headphones: 'Headphones',
  'message-circle': 'MessageCircle',
  'message-square': 'MessageSquare',
  zap: 'Zap',
  search: 'Search',
  eye: 'Eye',
  user: 'User',
};

export function useRoleTemplates(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['role-templates', projectId],
    queryFn: async () => {
      // Buscar templates do sistema (is_system_default = true, project_id = null)
      // e templates customizados do projeto (project_id = projectId)
      let query = supabase
        .from('role_templates')
        .select('*')
        .order('display_order', { ascending: true });

      if (projectId) {
        query = query.or(`is_system_default.eq.true,project_id.eq.${projectId}`);
      } else {
        query = query.eq('is_system_default', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RoleTemplate[];
    },
  });

  const createCustomTemplate = useMutation({
    mutationFn: async (template: Partial<RoleTemplate> & { project_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('role_templates')
        .insert({
          project_id: template.project_id,
          name: template.name,
          description: template.description || null,
          base_role: template.base_role || 'operator',
          is_system_default: false,
          is_custom: true,
          icon: template.icon || 'user',
          perm_dashboard: template.perm_dashboard || 'view',
          perm_analise: template.perm_analise || 'none',
          perm_crm: template.perm_crm || 'none',
          perm_automacoes: template.perm_automacoes || 'none',
          perm_chat_ao_vivo: template.perm_chat_ao_vivo || 'none',
          perm_meta_ads: template.perm_meta_ads || 'none',
          perm_ofertas: template.perm_ofertas || 'none',
          perm_lancamentos: template.perm_lancamentos || 'none',
          perm_configuracoes: template.perm_configuracoes || 'none',
          perm_insights: template.perm_insights || 'none',
          perm_pesquisas: template.perm_pesquisas || 'none',
          perm_social_listening: template.perm_social_listening || 'none',
          whatsapp_visibility_mode: template.whatsapp_visibility_mode || 'assigned_only',
          whatsapp_max_chats: template.whatsapp_max_chats || 5,
          whatsapp_is_supervisor: template.whatsapp_is_supervisor || false,
          whatsapp_auto_create_agent: template.whatsapp_auto_create_agent ?? true,
          display_order: template.display_order || 100,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Cargo criado',
        description: 'O cargo foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoleTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('role_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Cargo atualizado',
        description: 'O cargo foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('role_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Cargo removido',
        description: 'O cargo foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    templates: templates || [],
    isLoading,
    error,
    createCustomTemplate: createCustomTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isCreating: createCustomTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}

export function useApplyRoleTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      template, 
      projectId 
    }: { 
      memberId: string; 
      template: RoleTemplate; 
      projectId: string;
    }) => {
      // 1. Atualizar project_member com role base e template_id
      const { error: memberError } = await supabase
        .from('project_members')
        .update({
          role: template.base_role,
          role_template_id: template.id,
        })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // 2. Buscar user_id do membro
      const { data: memberData, error: fetchError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (fetchError) throw fetchError;

      const userId = memberData.user_id;

      // 3. Atualizar permissões granulares
      const permissionAreas = [
        'dashboard', 'analise', 'crm', 'automacoes', 'chat_ao_vivo',
        'meta_ads', 'ofertas', 'lancamentos', 'configuracoes',
        'insights', 'pesquisas', 'social_listening'
      ];

      for (const area of permissionAreas) {
        const permKey = `perm_${area}` as keyof RoleTemplate;
        const level = template[permKey] as PermissionLevel;

        await supabase
          .from('project_member_permissions')
          .upsert({
            project_id: projectId,
            user_id: userId,
            area,
            level,
          }, {
            onConflict: 'project_id,user_id,area',
          });
      }

      // 4. Se template tem chat_ao_vivo habilitado e whatsapp_auto_create_agent, criar/atualizar agente
      if (template.perm_chat_ao_vivo !== 'none' && template.whatsapp_auto_create_agent) {
        // Verificar se já existe agente
        const { data: existingAgent } = await supabase
          .from('whatsapp_agents')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single();

        if (existingAgent) {
          // Atualizar agente existente
          await supabase
            .from('whatsapp_agents')
            .update({
              visibility_mode: template.whatsapp_visibility_mode,
              max_chats: template.whatsapp_max_chats,
              is_supervisor: template.whatsapp_is_supervisor,
              is_active: true,
            })
            .eq('id', existingAgent.id);
        } else {
          // Criar novo agente
          await supabase
            .from('whatsapp_agents')
            .insert({
              project_id: projectId,
              user_id: userId,
              visibility_mode: template.whatsapp_visibility_mode,
              max_chats: template.whatsapp_max_chats,
              is_supervisor: template.whatsapp_is_supervisor,
              is_active: true,
            });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agents'] });
      toast({
        title: 'Cargo aplicado',
        description: 'O cargo foi aplicado ao membro com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
