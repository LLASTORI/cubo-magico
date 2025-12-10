import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermissions {
  canCreateProjects: boolean;
  maxProjects: number;
  currentProjectCount: number;
  isActive: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus: string | null;
  planName: string | null;
}

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateProjects: false,
    maxProjects: 0,
    currentProjectCount: 0,
    isActive: true,
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    hasActiveSubscription: false,
    subscriptionStatus: null,
    planName: null,
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Fetch profile permissions
        const { data: profile } = await supabase
          .from('profiles')
          .select('can_create_projects, max_projects, is_active')
          .eq('id', user.id)
          .maybeSingle();

        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Fetch subscription with plan
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select(`*, plan:plans(*)`)
          .eq('user_id', user.id)
          .maybeSingle();

        // Count current projects
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const isAdmin = roleData?.role === 'admin';
        const isSuperAdmin = roleData?.role === 'super_admin';
        const projectCount = count ?? 0;

        // Check subscription status
        const now = new Date();
        let hasActiveSubscription = false;
        let maxProjectsFromSub = 0;
        let subscriptionStatus = subscription?.status || null;
        let planName = subscription?.plan?.name || null;

        if (subscription) {
          const isExpired = subscription.expires_at && new Date(subscription.expires_at) < now;
          const isTrialExpired = subscription.is_trial && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < now;
          
          if (!isExpired && !isTrialExpired && (subscription.status === 'active' || subscription.status === 'trial')) {
            hasActiveSubscription = true;
            maxProjectsFromSub = subscription.plan?.max_projects ?? 0;
          } else if (isExpired || isTrialExpired) {
            subscriptionStatus = 'expired';
          }
        }

        // Determine max projects: subscription takes precedence, then profile
        const maxProjects = hasActiveSubscription ? maxProjectsFromSub : (profile?.max_projects ?? 0);

        // Super admin can always create projects
        // User can create if: has active subscription OR (legacy: is active, has permission, and hasn't reached limit)
        const canCreateProjects = 
          isSuperAdmin ||
          (hasActiveSubscription && (maxProjects === 0 || projectCount < maxProjects)) ||
          (!hasActiveSubscription && 
            (profile?.is_active !== false) && 
            (profile?.can_create_projects ?? false) && 
            ((profile?.max_projects ?? 0) === 0 || projectCount < (profile?.max_projects ?? 0)));

        setPermissions({
          canCreateProjects,
          maxProjects,
          currentProjectCount: projectCount,
          isActive: profile?.is_active ?? true,
          isAdmin,
          isSuperAdmin,
          loading: false,
          hasActiveSubscription,
          subscriptionStatus,
          planName,
        });
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(prev => ({ ...prev, loading: false }));
      }
    };

    fetchPermissions();
  }, [user]);

  const refreshPermissions = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('can_create_projects, max_projects, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`*, plan:plans(*)`)
      .eq('user_id', user.id)
      .maybeSingle();

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const projectCount = count ?? 0;
    const now = new Date();
    
    let hasActiveSubscription = false;
    let maxProjectsFromSub = 0;

    if (subscription) {
      const isExpired = subscription.expires_at && new Date(subscription.expires_at) < now;
      const isTrialExpired = subscription.is_trial && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < now;
      
      if (!isExpired && !isTrialExpired && (subscription.status === 'active' || subscription.status === 'trial')) {
        hasActiveSubscription = true;
        maxProjectsFromSub = subscription.plan?.max_projects ?? 0;
      }
    }

    const maxProjects = hasActiveSubscription ? maxProjectsFromSub : (profile?.max_projects ?? 0);

    setPermissions(prev => ({
      ...prev,
      canCreateProjects: 
        prev.isSuperAdmin ||
        (hasActiveSubscription && (maxProjects === 0 || projectCount < maxProjects)) ||
        (!hasActiveSubscription && 
          (profile?.is_active !== false) && 
          (profile?.can_create_projects ?? false) && 
          ((profile?.max_projects ?? 0) === 0 || projectCount < (profile?.max_projects ?? 0))),
      maxProjects,
      currentProjectCount: projectCount,
      isActive: profile?.is_active ?? true,
      hasActiveSubscription,
      subscriptionStatus: subscription?.status || null,
      planName: subscription?.plan?.name || null,
    }));
  };

  return { ...permissions, refreshPermissions };
};

