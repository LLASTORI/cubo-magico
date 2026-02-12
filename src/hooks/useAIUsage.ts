import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAIUsage(projectId: string | undefined) {
  const invokeSocialApi = async (body: Record<string, unknown>) => {
    return supabase.functions.invoke('social-comments-api', {
      body,
    });
  };

  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['ai-usage', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await invokeSocialApi({ action: 'get_ai_usage', projectId });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: quota, isLoading: quotaLoading, refetch: refetchQuota } = useQuery({
    queryKey: ['ai-quota', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await invokeSocialApi({ action: 'get_ai_quota', projectId });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  return {
    usage,
    quota,
    isLoading: usageLoading || quotaLoading,
    refetch: () => {
      refetchUsage();
      refetchQuota();
    }
  };
}
