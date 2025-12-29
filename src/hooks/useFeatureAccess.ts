import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';

export interface Feature {
  id: string;
  module_key: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface PlanFeature {
  feature_id: string;
  feature_key: string;
  enabled: boolean;
}

export interface FeatureOverride {
  feature_key: string;
  enabled: boolean;
  expires_at: string | null;
}

interface UseFeatureAccessReturn {
  /** Check if user can use a specific feature */
  canUse: (featureKey: string) => boolean;
  /** Check multiple features at once */
  canUseAny: (featureKeys: string[]) => boolean;
  canUseAll: (featureKeys: string[]) => boolean;
  /** Get all features for a module */
  getModuleFeatures: (moduleKey: string) => Feature[];
  /** Get enabled features for current plan */
  getPlanFeatures: () => PlanFeature[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh feature data */
  refresh: () => Promise<void>;
  /** All available features */
  features: Feature[];
  /** Current user's plan features */
  planFeatures: PlanFeature[];
  /** Current user/project overrides */
  overrides: FeatureOverride[];
  /** Whether user has an active subscription */
  hasSubscription: boolean;
  /** Whether user is super admin */
  isSuperAdmin: boolean;
}

// Raw database types for queries
interface DbFeature {
  id: string;
  module_key: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface DbPlanFeature {
  feature_id: string;
  enabled: boolean;
}

interface DbFeatureOverride {
  feature_id: string;
  enabled: boolean;
  expires_at: string | null;
}

interface DbSubscription {
  id: string;
  status: string;
  expires_at: string | null;
  is_trial: boolean;
  trial_ends_at: string | null;
  plan_id: string;
}

interface DbProjectModule {
  module_key: string;
}

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatureData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if user is super admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      setIsSuperAdmin(!!roleData);

      // Fetch all features - cast to bypass type issues with new tables
      const { data: featuresData, error: featuresError } = await supabase
        .from('features' as any)
        .select('*')
        .eq('is_active', true)
        .order('module_key', { ascending: true }) as { data: DbFeature[] | null; error: any };

      if (featuresError) throw featuresError;
      setFeatures(featuresData || []);

      // Fetch user's subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, expires_at, is_trial, trial_ends_at, plan_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trial'])
        .maybeSingle() as { data: DbSubscription | null; error: any };

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }

      // Check if subscription is valid
      const now = new Date();
      let isValidSubscription = false;
      
      if (subscriptionData) {
        const expiresAt = subscriptionData.expires_at ? new Date(subscriptionData.expires_at) : null;
        const trialEndsAt = subscriptionData.trial_ends_at ? new Date(subscriptionData.trial_ends_at) : null;
        
        if (subscriptionData.is_trial) {
          isValidSubscription = !trialEndsAt || trialEndsAt > now;
        } else {
          isValidSubscription = !expiresAt || expiresAt > now;
        }
      }

      setHasSubscription(isValidSubscription);

      // Fetch plan features if has valid subscription
      if (isValidSubscription && subscriptionData?.plan_id) {
        const { data: planFeaturesData, error: pfError } = await supabase
          .from('plan_features' as any)
          .select('feature_id, enabled')
          .eq('plan_id', subscriptionData.plan_id) as { data: DbPlanFeature[] | null; error: any };

        if (pfError) {
          console.error('Error fetching plan features:', pfError);
        }

        // Map feature_id to feature_key using the features list
        const mappedPlanFeatures = (planFeaturesData || []).map((pf) => {
          const feature = (featuresData || []).find((f) => f.id === pf.feature_id);
          return {
            feature_id: pf.feature_id,
            feature_key: feature?.feature_key || '',
            enabled: pf.enabled
          };
        }).filter((pf) => pf.feature_key);
        
        setPlanFeatures(mappedPlanFeatures);
      } else {
        setPlanFeatures([]);
      }

      // Fetch overrides for user
      const { data: userOverrides, error: userOverridesError } = await supabase
        .from('feature_overrides' as any)
        .select('enabled, expires_at, feature_id')
        .eq('target_type', 'user')
        .eq('target_id', user.id) as { data: DbFeatureOverride[] | null; error: any };

      if (userOverridesError) {
        console.error('Error fetching user overrides:', userOverridesError);
      }

      // Fetch overrides for project (if selected)
      let projectOverrides: DbFeatureOverride[] = [];
      if (currentProject) {
        const { data: projOverrides, error: projOverridesError } = await supabase
          .from('feature_overrides' as any)
          .select('enabled, expires_at, feature_id')
          .eq('target_type', 'project')
          .eq('target_id', currentProject.id) as { data: DbFeatureOverride[] | null; error: any };

        if (projOverridesError) {
          console.error('Error fetching project overrides:', projOverridesError);
        }
        projectOverrides = projOverrides || [];
      }

      // Combine overrides (user overrides take precedence)
      // Map feature_id to feature_key using the features list
      const allOverrides = [...(projectOverrides || []), ...(userOverrides || [])];
      const validOverrides = allOverrides
        .filter((o) => {
          if (!o.expires_at) return true;
          return new Date(o.expires_at) > now;
        })
        .map((o) => {
          const feature = (featuresData || []).find((f) => f.id === o.feature_id);
          return {
            feature_key: feature?.feature_key || '',
            enabled: o.enabled,
            expires_at: o.expires_at
          };
        })
        .filter((o) => o.feature_key);

      setOverrides(validOverrides);

      // Fetch active modules for current project
      if (currentProject) {
        const { data: modulesData, error: modulesError } = await supabase
          .from('project_modules' as any)
          .select('module_key')
          .eq('project_id', currentProject.id)
          .eq('is_active', true) as { data: DbProjectModule[] | null; error: any };

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
        }
        setActiveModules((modulesData || []).map(m => m.module_key));
      } else {
        setActiveModules([]);
      }

    } catch (err) {
      console.error('Error fetching feature access data:', err);
      setError('Erro ao carregar permissões de features');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProject]);

  useEffect(() => {
    fetchFeatureData();
  }, [fetchFeatureData]);

  const canUse = useCallback((featureKey: string): boolean => {
    // Super admin always has access
    if (isSuperAdmin) {
      return true;
    }

    // Find feature to get its module_key
    const feature = features.find(f => f.feature_key === featureKey);
    const moduleKey = feature?.module_key || featureKey.split('.')[0];

    // "core" module features are always available (dashboard, settings, etc.)
    if (moduleKey === 'core') {
      // Still check plan features and overrides for core features
      const userOverride = overrides.find(o => o.feature_key === featureKey);
      if (userOverride !== undefined) {
        return userOverride.enabled;
      }
      const planFeature = planFeatures.find(pf => pf.feature_key === featureKey);
      if (planFeature !== undefined) {
        return planFeature.enabled;
      }
      // Core features are available by default
      return true;
    }

    // Check if module is active in project
    if (currentProject && !activeModules.includes(moduleKey)) {
      return false;
    }

    // Check user override (highest priority)
    const userOverride = overrides.find(o => o.feature_key === featureKey);
    if (userOverride !== undefined) {
      return userOverride.enabled;
    }

    // Check plan features
    const planFeature = planFeatures.find(pf => pf.feature_key === featureKey);
    if (planFeature !== undefined) {
      return planFeature.enabled;
    }

    // Fallback: allow view features for everyone, block others
    if (featureKey.includes('.view')) {
      return true;
    }

    return false;
  }, [isSuperAdmin, currentProject, activeModules, overrides, planFeatures]);

  const canUseAny = useCallback((featureKeys: string[]): boolean => {
    return featureKeys.some(key => canUse(key));
  }, [canUse]);

  const canUseAll = useCallback((featureKeys: string[]): boolean => {
    return featureKeys.every(key => canUse(key));
  }, [canUse]);

  const getModuleFeatures = useCallback((moduleKey: string): Feature[] => {
    return features.filter(f => f.module_key === moduleKey);
  }, [features]);

  const getPlanFeatures = useCallback((): PlanFeature[] => {
    return planFeatures.filter(pf => pf.enabled);
  }, [planFeatures]);

  return {
    canUse,
    canUseAny,
    canUseAll,
    getModuleFeatures,
    getPlanFeatures,
    isLoading,
    error,
    refresh: fetchFeatureData,
    features,
    planFeatures,
    overrides,
    hasSubscription,
    isSuperAdmin
  };
};
