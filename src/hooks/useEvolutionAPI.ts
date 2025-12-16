import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function useEvolutionAPI() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const callEvolutionAPI = async (action: string, params: Record<string, any> = {}): Promise<EvolutionResponse> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action, ...params },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao chamar Evolution API');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      return data;
    } catch (error: any) {
      console.error('Evolution API error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao conectar com Evolution API',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createInstance = async (instanceName: string, whatsappNumberId: string, projectId: string) => {
    return callEvolutionAPI('create_instance', {
      instanceName,
      whatsappNumberId,
      projectId,
    });
  };

  const getQRCode = async (instanceName: string) => {
    return callEvolutionAPI('get_qrcode', { instanceName });
  };

  const getStatus = async (instanceName: string) => {
    return callEvolutionAPI('get_status', { instanceName });
  };

  const disconnect = async (instanceName: string) => {
    return callEvolutionAPI('disconnect', { instanceName });
  };

  const deleteInstance = async (instanceName: string) => {
    return callEvolutionAPI('delete_instance', { instanceName });
  };

  const sendMessage = async (instanceName: string, number: string, text: string) => {
    return callEvolutionAPI('send_message', { instanceName, number, text });
  };

  const sendMedia = async (
    instanceName: string, 
    number: string, 
    mediaType: 'image' | 'audio' | 'video' | 'document',
    mediaUrl: string,
    caption?: string,
    fileName?: string,
    mimetype?: string
  ) => {
    return callEvolutionAPI('send_media', { 
      instanceName, 
      number, 
      mediaType,
      mediaUrl,
      caption,
      fileName,
      mimetype,
    });
  };

  const fetchInstances = async () => {
    return callEvolutionAPI('fetch_instances');
  };

  const syncInstance = async (instanceName: string, whatsappNumberId: string) => {
    return callEvolutionAPI('sync_instance', { instanceName, whatsappNumberId });
  };

  const configureWebhook = async (instanceName: string) => {
    return callEvolutionAPI('configure_webhook', { instanceName });
  };

  const getProfilePicture = async (instanceName: string, number: string) => {
    return callEvolutionAPI('get_profile_picture', { instanceName, number });
  };

  return {
    isLoading,
    createInstance,
    getQRCode,
    getStatus,
    disconnect,
    deleteInstance,
    sendMessage,
    sendMedia,
    fetchInstances,
    syncInstance,
    configureWebhook,
    getProfilePicture,
  };
}
