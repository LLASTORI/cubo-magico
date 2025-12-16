import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { useEvolutionAPI } from './useEvolutionAPI';

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  whatsapp_number_id: string | null;
  direction: 'inbound' | 'outbound';
  content_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  external_id: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  sent_by: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppMessages(conversationId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage: sendEvolutionMessage } = useEvolutionAPI();

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      instanceName,
      remoteJid 
    }: { 
      conversationId: string; 
      content: string;
      instanceName: string;
      remoteJid: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert message in DB first (optimistic)
      const { data: message, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          content_type: 'text',
          content,
          status: 'pending',
          sent_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send via Evolution API
      const result = await sendEvolutionMessage(instanceName, remoteJid, content);
      
      if (!result.success) {
        // Update message status to failed
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_message: result.error })
          .eq('id', message.id);
        throw new Error(result.error);
      }

      // Update message status to sent
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent', external_id: result.data?.key?.id })
        .eq('id', message.id);

      // Update conversation last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendMessage.mutate,
    markAsRead: markAsRead.mutate,
    isSending: sendMessage.isPending,
  };
}
