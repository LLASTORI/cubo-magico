import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccessControlState {
  loading: boolean;
  hasAccess: boolean;
  accountActivated: boolean;
  signupSource: string | null;
  hasActiveSubscription: boolean;
  isMemberOfAnyProject: boolean;
  isAdmin: boolean;
  needsActivation: boolean;
}

export const useAccessControl = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AccessControlState>({
    loading: true,
    hasAccess: false,
    accountActivated: false,
    signupSource: null,
    hasActiveSubscription: false,
    isMemberOfAnyProject: false,
    isAdmin: false,
    needsActivation: false,
  });

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false, hasAccess: false }));
      return;
    }

    const checkAccess = async () => {
      try {
        // Get profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_activated, signup_source')
          .eq('id', user.id)
          .single();

        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const isAdmin = roleData?.role === 'admin' || roleData?.role === 'super_admin';

        // Check for active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        // Check if member of any project
        const { data: projectMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        // Legacy users and admin always have access
        const isLegacy = profile?.signup_source === 'legacy';
        const accountActivated = profile?.account_activated ?? false;
        const hasActiveSubscription = !!subscription;
        const isMemberOfAnyProject = !!projectMember;
        
        // Determine if user needs to activate their account
        const needsActivation = !accountActivated && profile?.signup_source === 'hotmart';

        // Has access if:
        // 1. Is admin
        // 2. Is legacy user (existing before this change)
        // 3. Has active subscription AND account is activated
        // 4. Is member of at least one project AND account is activated
        const hasAccess = isAdmin || isLegacy || 
          ((hasActiveSubscription || isMemberOfAnyProject) && accountActivated);

        setState({
          loading: false,
          hasAccess,
          accountActivated,
          signupSource: profile?.signup_source || null,
          hasActiveSubscription,
          isMemberOfAnyProject,
          isAdmin,
          needsActivation,
        });
      } catch (error) {
        console.error('Error checking access:', error);
        setState(prev => ({ ...prev, loading: false, hasAccess: false }));
      }
    };

    checkAccess();
  }, [user]);

  return state;
};
