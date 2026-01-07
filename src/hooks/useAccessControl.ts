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
  const [refreshNonce, setRefreshNonce] = useState(0);
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

  // Allow other parts of the app to force a re-check (e.g. after accepting an invite)
  useEffect(() => {
    const handler = () => setRefreshNonce((n) => n + 1);
    window.addEventListener('access-control:refresh', handler);
    return () => window.removeEventListener('access-control:refresh', handler);
  }, []);

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false, hasAccess: false }));
      return;
    }

    const checkAccess = async () => {
      try {
        const [
          profileRes,
          isSuperAdminRes,
          hasAdminRoleRes,
          subscriptionRes,
          projectMemberRes,
          ownedProjectRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('account_activated, signup_source')
            .eq('id', user.id)
            .maybeSingle(),
          supabase.rpc('is_super_admin', { _user_id: user.id }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase
            .from('subscriptions')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('project_members')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('projects')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle(),
        ]);

        const signupSource = profileRes.data?.signup_source ?? null;
        // Default to "true" when missing, and only gate access for hotmart users that truly need activation.
        const accountActivated = profileRes.data?.account_activated ?? true;

        const isLegacy = signupSource === 'legacy';
        const isInvited = signupSource === 'invited';
        const needsActivation = signupSource === 'hotmart' && accountActivated === false;

        const isAdmin = !!isSuperAdminRes.data || !!hasAdminRoleRes.data;
        const hasActiveSubscription = !!subscriptionRes.data;
        const isMemberOfAnyProject = !!projectMemberRes.data;
        const ownsAnyProject = !!ownedProjectRes.data;

        // Grant access if user meets any of these conditions:
        // - Not needing activation AND (is admin, legacy, invited, owns project, has subscription, or is member of any project)
        const hasAccess = !needsActivation && (
          isAdmin ||
          isLegacy ||
          isInvited ||
          ownsAnyProject ||
          hasActiveSubscription ||
          isMemberOfAnyProject
        );

        console.info('[AccessControl] computed:', {
          userId: user.id,
          signupSource,
          accountActivated,
          needsActivation,
          isAdmin,
          isLegacy,
          isInvited,
          ownsAnyProject,
          hasActiveSubscription,
          isMemberOfAnyProject,
          hasAccess,
        });

        setState({
          loading: false,
          hasAccess,
          accountActivated,
          signupSource,
          hasActiveSubscription,
          isMemberOfAnyProject,
          isAdmin,
          needsActivation,
        });
      } catch (error) {
        console.error('Error checking access:', error);
        // Fail open for authenticated users to avoid locking everyone out due to transient issues.
        setState((prev) => ({
          ...prev,
          loading: false,
          hasAccess: true,
          isAdmin: prev.isAdmin,
          needsActivation: prev.needsActivation,
        }));
      }
    };

    checkAccess();
  }, [user, refreshNonce]);

  return state;
};

