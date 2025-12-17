import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface WhatsAppConversation {
  id: string;
  project_id: string;
  contact_id: string;
  whatsapp_number_id: string | null;
  remote_jid: string;
  status: 'open' | 'pending' | 'closed' | 'archived';
  unread_count: number;
  last_message_at: string | null;
  assigned_to: string | null;
  department_id: string | null;
  queue_position: number | null;
  queued_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    phone_ddd: string | null;
    phone_country_code: string | null;
    tags: string[] | null;
    avatar_url: string | null;
  };
  assigned_agent?: {
    id: string;
    display_name: string | null;
    user_id: string;
  };
  department?: {
    id: string;
    name: string;
    color: string;
  };
  last_message?: {
    content: string | null;
    direction: string;
    created_at: string;
  };
}

export function useWhatsAppConversations(filters?: {
  status?: string;
  department_id?: string;
  assigned_to?: string;
}) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['whatsapp-conversations', projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:crm_contacts(id, name, email, phone, phone_ddd, phone_country_code, tags, avatar_url),
          department:whatsapp_departments(id, name, color)
        `)
        .eq('project_id', projectId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch assigned agents separately if needed (assigned_to stores user_id)
      const conversationsWithAgents = await Promise.all(
        (data || []).map(async (conv) => {
          let assigned_agent = null;
          if (conv.assigned_to) {
            const { data: agentData } = await supabase
              .from('whatsapp_agents')
              .select('id, display_name, user_id')
              .eq('user_id', conv.assigned_to)
              .eq('project_id', projectId)
              .single();
            assigned_agent = agentData;
          }
          return {
            ...conv,
            contact: conv.contact || null,
            assigned_agent,
            department: conv.department || null,
          };
        })
      );
      
      return conversationsWithAgents as WhatsAppConversation[];
    },
    enabled: !!projectId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`whatsapp-conversations-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  const assignConversation = useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string | null }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          assigned_to: agentId,
          first_response_at: agentId ? new Date().toISOString() : null,
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', projectId] });
      toast({
        title: 'Conversa atribuída',
        description: 'A conversa foi atribuída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atribuir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateConversationStatus = useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ status })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', projectId] });
    },
  });

  const transferConversation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      departmentId, 
      agentId 
    }: { 
      conversationId: string; 
      departmentId?: string; 
      agentId?: string 
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          department_id: departmentId || null,
          assigned_to: agentId || null,
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', projectId] });
      toast({
        title: 'Conversa transferida',
        description: 'A conversa foi transferida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao transferir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    assignConversation: assignConversation.mutate,
    updateConversationStatus: updateConversationStatus.mutate,
    transferConversation: transferConversation.mutate,
    isAssigning: assignConversation.isPending,
  };
}
