import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SegmentConfig {
  tags: string[];
  operator: 'AND' | 'OR';
}

export interface MetaAdAudience {
  id: string;
  project_id: string;
  ad_account_id: string;
  name: string;
  meta_audience_id: string | null;
  segment_type: 'tag' | 'filter';
  segment_config: SegmentConfig;
  status: 'pending' | 'active' | 'syncing' | 'paused' | 'error';
  sync_frequency: 'manual' | '6h' | '24h';
  estimated_size: number;
  error_message: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAudienceSyncLog {
  id: string;
  audience_id: string;
  contacts_added: number;
  contacts_removed: number;
  contacts_total: number;
  errors: any[];
  status: 'success' | 'partial' | 'failed';
  duration_ms: number | null;
  executed_at: string;
}

export interface MetaLookalikeAudience {
  id: string;
  source_audience_id: string;
  meta_lookalike_id: string | null;
  name: string;
  country: string;
  percentage: number;
  status: 'pending' | 'active' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface AvailableTag {
  tag: string;
  count: number;
}

export function useMetaAudiences(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch audiences
  const { data: audiences, isLoading, error, refetch } = useQuery({
    queryKey: ['meta_audiences', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('meta_ad_audiences')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to proper types
      return (data || []).map((item: any) => ({
        ...item,
        segment_config: item.segment_config as SegmentConfig,
        segment_type: item.segment_type as 'tag' | 'filter',
        status: item.status as MetaAdAudience['status'],
        sync_frequency: item.sync_frequency as MetaAdAudience['sync_frequency'],
      })) as MetaAdAudience[];
    },
    enabled: !!projectId,
  });

  // Fetch available tags - refetch frequently to catch new tags
  const { data: availableTags, isLoading: tagsLoading, refetch: refetchTags } = useQuery({
    queryKey: ['meta_audience_tags', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase.functions.invoke('meta-audience-api', {
        body: { action: 'get_available_tags', projectId },
      });
      
      if (error) throw error;
      console.log(`[MetaAudiences] Loaded ${data?.tags?.length || 0} tags from ${data?.totalContacts || 0} contacts`);
      return (data?.tags || []) as AvailableTag[];
    },
    enabled: !!projectId,
    staleTime: 30000, // Consider stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Get estimated size for a segment config
  const getEstimatedSize = async (segmentConfig: SegmentConfig): Promise<number> => {
    if (!projectId) return 0;
    
    const { data, error } = await supabase.functions.invoke('meta-audience-api', {
      body: { action: 'get_estimated_size', projectId, segmentConfig },
    });
    
    if (error) throw error;
    return data?.estimatedSize || 0;
  };

  // Create audience mutation
  const createAudience = useMutation({
    mutationFn: async (params: {
      adAccountId: string;
      name: string;
      segmentConfig: SegmentConfig;
      syncFrequency: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('meta-audience-api', {
        body: {
          action: 'create_audience',
          projectId,
          ...params,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Público criado!',
        description: 'O público foi criado e a sincronização inicial foi iniciada.',
      });
      queryClient.invalidateQueries({ queryKey: ['meta_audiences', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar público',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync audience mutation
  const syncAudience = useMutation({
    mutationFn: async (audienceId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-audience-api', {
        body: { action: 'sync_audience', audienceId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Sincronização concluída!',
        description: `${data.added} adicionados, ${data.removed} removidos. Total: ${data.total}`,
      });
      queryClient.invalidateQueries({ queryKey: ['meta_audiences', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete audience mutation
  const deleteAudience = useMutation({
    mutationFn: async (audienceId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-audience-api', {
        body: { action: 'delete_audience', audienceId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Público excluído',
        description: 'O público foi removido do Meta e do sistema.',
      });
      queryClient.invalidateQueries({ queryKey: ['meta_audiences', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir público',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Pause/resume audience
  const toggleAudienceStatus = useMutation({
    mutationFn: async ({ audienceId, pause }: { audienceId: string; pause: boolean }) => {
      const { error } = await supabase
        .from('meta_ad_audiences')
        .update({ status: pause ? 'paused' : 'active' })
        .eq('id', audienceId);
      
      if (error) throw error;
    },
    onSuccess: (_, { pause }) => {
      toast({
        title: pause ? 'Público pausado' : 'Público ativado',
        description: pause 
          ? 'A sincronização automática foi pausada.' 
          : 'A sincronização automática foi retomada.',
      });
      queryClient.invalidateQueries({ queryKey: ['meta_audiences', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create lookalike mutation
  const createLookalike = useMutation({
    mutationFn: async (params: {
      sourceAudienceId: string;
      name: string;
      country: string;
      percentage: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('meta-audience-api', {
        body: { action: 'create_lookalike', ...params },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Público semelhante criado!',
        description: 'O Lookalike Audience foi criado no Meta Ads.',
      });
      queryClient.invalidateQueries({ queryKey: ['meta_audiences', projectId] });
      queryClient.invalidateQueries({ queryKey: ['meta_lookalikes', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar público semelhante',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch sync logs for an audience
  const useSyncLogs = (audienceId: string | undefined) => {
    return useQuery({
      queryKey: ['meta_audience_sync_logs', audienceId],
      queryFn: async () => {
        if (!audienceId) return [];
        
        const { data, error } = await supabase
          .from('meta_audience_sync_logs')
          .select('*')
          .eq('audience_id', audienceId)
          .order('executed_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        return (data || []) as MetaAudienceSyncLog[];
      },
      enabled: !!audienceId,
    });
  };

  // Fetch lookalikes for an audience
  const useLookalikes = (audienceId: string | undefined) => {
    return useQuery({
      queryKey: ['meta_lookalikes', audienceId],
      queryFn: async () => {
        if (!audienceId) return [];
        
        const { data, error } = await supabase
          .from('meta_lookalike_audiences')
          .select('*')
          .eq('source_audience_id', audienceId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []) as MetaLookalikeAudience[];
      },
      enabled: !!audienceId,
    });
  };

  return {
    audiences,
    isLoading,
    error,
    refetch,
    availableTags,
    tagsLoading,
    refetchTags,
    getEstimatedSize,
    createAudience,
    syncAudience,
    deleteAudience,
    toggleAudienceStatus,
    createLookalike,
    useSyncLogs,
    useLookalikes,
  };
}
