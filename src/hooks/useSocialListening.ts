import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SocialPost {
  id: string;
  project_id: string;
  platform: 'instagram' | 'facebook';
  post_id_meta: string;
  page_name: string | null;
  post_type: 'organic' | 'ad';
  is_ad: boolean;
  meta_ad_id: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  message: string | null;
  media_type: string | null;
  permalink: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  published_at: string | null;
  created_at: string;
  last_synced_at: string | null;
}

export interface SocialComment {
  id: string;
  project_id: string;
  post_id: string;
  platform: 'instagram' | 'facebook';
  comment_id_meta: string;
  parent_comment_id: string | null;
  text: string;
  author_username: string | null;
  author_name: string | null;
  like_count: number;
  reply_count: number;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  classification: 'product_question' | 'purchase_question' | 'commercial_interest' | 'praise' | 'complaint' | 'contact_request' | 'friend_tag' | 'spam' | 'other' | null;
  classification_key: string | null;
  intent_score: number | null;
  ai_summary: string | null;
  ai_processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_hidden: boolean;
  is_replied: boolean;
  comment_timestamp: string;
  created_at: string;
  crm_contact_id: string | null;
  // New reply fields
  ai_suggested_reply: string | null;
  reply_status: 'pending' | 'approved' | 'rejected' | 'sent' | null;
  reply_sent_at: string | null;
  replied_by: string | null;
  social_posts?: {
    id: string;
    is_ad: boolean;
    post_type: string;
    permalink: string | null;
    thumbnail_url: string | null;
    campaign_name: string | null;
    adset_name: string | null;
    ad_name: string | null;
    post_id_meta?: string;
  };
  crm_contacts?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface SocialStats {
  totalComments: number;
  pendingAI: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  classificationDistribution: Record<string, number>;
}

export function useSocialListening(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch posts
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['social_posts', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', projectId)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SocialPost[];
    },
    enabled: !!projectId,
  });

  // Fetch comments with filters - auto-refresh every 10 seconds
  const useComments = (filters?: {
    sentiment?: string;
    classification?: string;
    platform?: string;
    postId?: string;
    search?: string;
    postType?: string; // 'organic' | 'ad' | 'all'
  }) => {
    return useQuery({
      queryKey: ['social_comments', projectId, filters],
      queryFn: async () => {
        if (!projectId) return [];

        let query = supabase
          .from('social_comments')
          .select('*, social_posts!inner(id, is_ad, post_type, permalink, thumbnail_url, campaign_name, adset_name, ad_name, post_id_meta), crm_contacts(id, name, email)')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .order('comment_timestamp', { ascending: false });

        if (filters?.sentiment && filters.sentiment !== 'all') {
          query = query.eq('sentiment', filters.sentiment as any);
        }
        if (filters?.classification && filters.classification !== 'all') {
          query = query.eq('classification', filters.classification as any);
        }
        if (filters?.platform && filters.platform !== 'all') {
          query = query.eq('platform', filters.platform as any);
        }
        if (filters?.postId) {
          query = query.eq('post_id', filters.postId);
        }
        if (filters?.search) {
          query = query.ilike('text', `%${filters.search}%`);
        }
        // Filter by post type (organic vs ad)
        if (filters?.postType === 'ad') {
          query = query.eq('social_posts.is_ad', true);
        } else if (filters?.postType === 'organic') {
          query = query.eq('social_posts.is_ad', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as SocialComment[];
      },
      enabled: !!projectId,
      refetchInterval: 10000, // Auto-refresh every 10 seconds
    });
  };

  // Fetch stats - auto-refresh every 10 seconds
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['social_stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'get_stats', projectId },
      });

      if (error) throw error;
      return data as SocialStats;
    },
    enabled: !!projectId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Sync posts mutation
  const syncPosts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'sync_posts', projectId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Posts sincronizados!',
        description: `${data.postsSynced} posts encontrados.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social_posts', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar posts',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync comments mutation
  const syncComments = useMutation({
    mutationFn: async (postId?: string) => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'sync_comments', projectId, postId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const deletedText = data.deletedComments ? ` ${data.deletedComments} removidos detectados.` : '';
      toast({
        title: 'Comentários sincronizados!',
        description: `${data.commentsSynced} comentários encontrados.${deletedText}`,
      });
      queryClient.invalidateQueries({ queryKey: ['social_comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['social_stats', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar comentários',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Process AI mutation
  const processAI = useMutation({
    mutationFn: async (limit: number = 100) => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'process_ai', projectId, limit },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const remaining = data.remaining || 0;
      const description = remaining > 0 
        ? `${data.processed} comentários classificados. Ainda restam ~${remaining} pendentes.`
        : `${data.processed} comentários classificados. Todos processados!`;
      
      toast({
        title: 'Processamento IA concluído!',
        description,
      });
      queryClient.invalidateQueries({ queryKey: ['social_comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['social_stats', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro no processamento IA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Link to CRM mutation
  const linkToCRM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'link_crm_contacts', projectId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Vinculação concluída!',
        description: `${data.linked} comentários vinculados ao CRM.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social_comments', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao vincular ao CRM',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync ad comments mutation
  const syncAdComments = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'sync_ad_comments', projectId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const deletedText = data.deletedComments ? ` ${data.deletedComments} removidos detectados.` : '';
      toast({
        title: 'Comentários de Ads sincronizados!',
        description: `${data.adsSynced || 0} ads e ${data.commentsSynced || 0} comentários encontrados.${deletedText}`,
      });
      queryClient.invalidateQueries({ queryKey: ['social_posts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['social_comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['social_stats', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar ads',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    posts,
    postsLoading,
    refetchPosts,
    useComments,
    stats,
    statsLoading,
    refetchStats,
    syncPosts,
    syncComments,
    processAI,
    linkToCRM,
    syncAdComments,
  };
}
