import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectPlanInfo {
  // Project data
  projectMaxMembers: number;
  
  // Subscription data
  subscriptionStatus: string | null;
  
  // Plan data
  planName: string | null;
  planType: string | null;
  planDefaultMembers: number | null;
  planMaxProjects: number | null;
  planPriceCents: number | null;
  
  // Computed
  hasManualOverride: boolean;
  hasPlan: boolean;
}

export const useProjectPlanInfo = (projectId: string | null) => {
  return useQuery({
    queryKey: ['project-plan-info', projectId],
    queryFn: async (): Promise<ProjectPlanInfo | null> => {
      if (!projectId) return null;

      // First get the project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('max_members, user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('Error fetching project:', projectError);
        return null;
      }

      // Then get the subscription for the project owner
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          status,
          plan:plans(
            name,
            type,
            max_members,
            max_projects,
            price_cents
          )
        `)
        .eq('user_id', project.user_id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      }

      const plan = subscription?.plan as {
        name: string;
        type: string;
        max_members: number;
        max_projects: number;
        price_cents: number;
      } | null;

      return {
        projectMaxMembers: project.max_members || 5,
        subscriptionStatus: subscription?.status || null,
        planName: plan?.name || null,
        planType: plan?.type || null,
        planDefaultMembers: plan?.max_members || null,
        planMaxProjects: plan?.max_projects || null,
        planPriceCents: plan?.price_cents || null,
        hasManualOverride: plan ? project.max_members !== plan.max_members : false,
        hasPlan: !!plan,
      };
    },
    enabled: !!projectId,
  });
};
