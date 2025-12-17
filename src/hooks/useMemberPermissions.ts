import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export type PermissionArea = 
  | 'dashboard'
  | 'analise'
  | 'crm'
  | 'automacoes'
  | 'chat_ao_vivo'
  | 'meta_ads'
  | 'ofertas'
  | 'lancamentos'
  | 'configuracoes';

export interface MemberPermissions {
  id: string;
  project_id: string;
  user_id: string;
  dashboard: PermissionLevel;
  analise: PermissionLevel;
  crm: PermissionLevel;
  automacoes: PermissionLevel;
  chat_ao_vivo: PermissionLevel;
  meta_ads: PermissionLevel;
  ofertas: PermissionLevel;
  lancamentos: PermissionLevel;
  configuracoes: PermissionLevel;
  created_at: string;
  updated_at: string;
}

export const PERMISSION_AREAS: { key: PermissionArea; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel principal e overview do projeto' },
  { key: 'analise', label: 'Análise', description: 'Análise mensal e funis de vendas' },
  { key: 'crm', label: 'CRM', description: 'Gestão de contatos e jornada do cliente' },
  { key: 'automacoes', label: 'Automações', description: 'Fluxos de automação e execuções' },
  { key: 'chat_ao_vivo', label: 'Chat ao Vivo', description: 'Atendimento via WhatsApp' },
  { key: 'meta_ads', label: 'Meta Ads', description: 'Campanhas e métricas do Meta Ads' },
  { key: 'ofertas', label: 'Ofertas', description: 'Mapeamento de ofertas e produtos' },
  { key: 'lancamentos', label: 'Lançamentos', description: 'Dashboard e fases de lançamento' },
  { key: 'configuracoes', label: 'Configurações', description: 'Configurações do projeto' },
];

export const PERMISSION_LEVELS: { value: PermissionLevel; label: string; description: string }[] = [
  { value: 'none', label: 'Sem acesso', description: 'Não pode ver nem editar' },
  { value: 'view', label: 'Visualizar', description: 'Pode ver, mas não editar' },
  { value: 'edit', label: 'Editar', description: 'Pode ver e editar' },
  { value: 'admin', label: 'Administrador', description: 'Controle total da área' },
];

export const useMemberPermissions = (userId?: string) => {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['member-permissions', currentProject?.id, userId],
    queryFn: async () => {
      if (!currentProject?.id || !userId) return null;

      const { data, error } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as MemberPermissions | null;
    },
    enabled: !!currentProject?.id && !!userId,
  });

  const updatePermissions = useMutation({
    mutationFn: async (updates: Partial<Record<PermissionArea, PermissionLevel>>) => {
      if (!currentProject?.id || !userId) throw new Error('Missing project or user');

      const { error } = await supabase
        .from('project_member_permissions')
        .update(updates)
        .eq('project_id', currentProject.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-permissions'] });
      toast.success('Permissões atualizadas');
    },
    onError: (error) => {
      console.error('Error updating permissions:', error);
      toast.error('Erro ao atualizar permissões');
    },
  });

  return {
    permissions,
    isLoading,
    updatePermissions: updatePermissions.mutate,
    isUpdating: updatePermissions.isPending,
  };
};

// Hook to get all members permissions for a project
export const useAllMembersPermissions = () => {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['all-member-permissions', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', currentProject.id);

      if (error) throw error;
      return data as MemberPermissions[];
    },
    enabled: !!currentProject?.id,
  });

  const updateMemberPermission = useMutation({
    mutationFn: async ({ 
      userId, 
      area, 
      level 
    }: { 
      userId: string; 
      area: PermissionArea; 
      level: PermissionLevel 
    }) => {
      if (!currentProject?.id) throw new Error('Missing project');

      const { error } = await supabase
        .from('project_member_permissions')
        .update({ [area]: level })
        .eq('project_id', currentProject.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-member-permissions'] });
    },
    onError: (error) => {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    },
  });

  return {
    allPermissions: allPermissions || [],
    isLoading,
    updateMemberPermission: updateMemberPermission.mutate,
    isUpdating: updateMemberPermission.isPending,
  };
};

// Hook to check current user's permission for an area
export const useHasPermission = (area: PermissionArea, minLevel: PermissionLevel = 'view') => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['my-permissions', currentProject?.id, user?.id],
    queryFn: async () => {
      if (!currentProject?.id || !user?.id) return null;

      // Check if user is owner
      const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.role === 'owner') {
        setIsOwner(true);
        return null; // Owner has full access
      }

      const { data, error } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as MemberPermissions | null;
    },
    enabled: !!currentProject?.id && !!user?.id,
  });

  if (isOwner) return { hasPermission: true, isLoading: false };

  if (isLoading || !permissions) return { hasPermission: false, isLoading };

  const currentLevel = permissions[area];
  const levelOrder: PermissionLevel[] = ['none', 'view', 'edit', 'admin'];
  const currentIndex = levelOrder.indexOf(currentLevel);
  const requiredIndex = levelOrder.indexOf(minLevel);

  return { hasPermission: currentIndex >= requiredIndex, isLoading: false };
};

// Hook to get all permissions for current user
export const useMyPermissions = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-permissions', currentProject?.id, user?.id],
    queryFn: async () => {
      if (!currentProject?.id || !user?.id) return null;

      // Check if user is owner
      const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.role === 'owner') {
        // Return full permissions for owner
        return {
          isOwner: true,
          dashboard: 'admin' as PermissionLevel,
          analise: 'admin' as PermissionLevel,
          crm: 'admin' as PermissionLevel,
          automacoes: 'admin' as PermissionLevel,
          chat_ao_vivo: 'admin' as PermissionLevel,
          meta_ads: 'admin' as PermissionLevel,
          ofertas: 'admin' as PermissionLevel,
          lancamentos: 'admin' as PermissionLevel,
          configuracoes: 'admin' as PermissionLevel,
        };
      }

      const { data, error } = await supabase
        .from('project_member_permissions')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? { isOwner: false, ...data } : null;
    },
    enabled: !!currentProject?.id && !!user?.id,
  });
};
