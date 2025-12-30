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
  classification: 'question' | 'commercial_interest' | 'complaint' | 'praise' | 'negative_feedback' | 'spam' | 'other' | null;
  intent_score: number | null;
  ai_summary: string | null;
  ai_processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_hidden: boolean;
  is_replied: boolean;
  comment_timestamp: string;
  created_at: string;
  social_posts?: SocialPost;
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

  // Fetch comments with filters
  const useComments = (filters?: {
    sentiment?: string;
    classification?: string;
    platform?: string;
    postId?: string;
    search?: string;
  }) => {
    return useQuery({
      queryKey: ['social_comments', projectId, filters],
      queryFn: async () => {
        if (!projectId) return [];

        let query = supabase
          .from('social_comments')
          .select('*, social_posts(*)')
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

        const { data, error } = await query.limit(500);
        if (error) throw error;
        return (data || []) as SocialComment[];
      },
      enabled: !!projectId,
    });
  };

  // Fetch stats
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
      toast({
        title: 'Comentários sincronizados!',
        description: `${data.commentsSynced} comentários encontrados.`,
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
    mutationFn: async (limit: number = 50) => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'process_ai', projectId, limit },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Processamento IA concluído!',
        description: `${data.processed} comentários classificados.`,
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
  };
}
