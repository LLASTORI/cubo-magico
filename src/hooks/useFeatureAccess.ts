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

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface MemberPermissions {
  dashboard: PermissionLevel;
  analise: PermissionLevel;
  crm: PermissionLevel;
  automacoes: PermissionLevel;
  chat_ao_vivo: PermissionLevel;
  meta_ads: PermissionLevel;
  ofertas: PermissionLevel;
  lancamentos: PermissionLevel;
  configuracoes: PermissionLevel;
  insights: PermissionLevel;
  pesquisas: PermissionLevel;
  social_listening: PermissionLevel;
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
  /** Check if user has permission for an area at a specific level */
  hasAreaPermission: (area: keyof MemberPermissions, minLevel?: PermissionLevel) => boolean;
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
  /** Whether user is project owner */
  isProjectOwner: boolean;
  /** User's member permissions for current project */
  memberPermissions: MemberPermissions | null;
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

// Map feature module_key to permission area
const MODULE_TO_AREA_MAP: Record<string, keyof MemberPermissions> = {
  'core': 'dashboard',
  'dashboard': 'dashboard',
  'funnel': 'analise',
  'analysis': 'analise',
  'crm': 'crm',
  'automations': 'automacoes',
  'automation': 'automacoes',
  'whatsapp': 'chat_ao_vivo',
  'meta_ads': 'meta_ads',
  'meta': 'meta_ads',
  'offers': 'ofertas',
  'hotmart': 'ofertas',
  'launch': 'lancamentos',
  'settings': 'configuracoes',
  'surveys': 'pesquisas',
  'insights': 'insights',
  'ai_analysis': 'insights',
  'social_listening': 'social_listening',
};

// Map action in feature_key to required permission level
const getRequiredLevelFromFeatureKey = (featureKey: string): PermissionLevel => {
  const lowerKey = featureKey.toLowerCase();
  if (lowerKey.includes('.admin') || lowerKey.includes('.manage')) return 'admin';
  if (lowerKey.includes('.edit') || lowerKey.includes('.create') || lowerKey.includes('.delete') || lowerKey.includes('.execute')) return 'edit';
  if (lowerKey.includes('.view')) return 'view';
  return 'view'; // Default to view
};

export const useFeatureAccess = (): UseFeatureAccessReturn => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [memberPermissions, setMemberPermissions] = useState<MemberPermissions | null>(null);
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

      // Check if user is project owner and get member permissions
      if (currentProject) {
        const { data: memberData } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', currentProject.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const ownerStatus = memberData?.role === 'owner';
        setIsProjectOwner(ownerStatus);

        // Fetch member permissions if not owner
        if (!ownerStatus) {
          const { data: permData, error: permError } = await supabase
            .from('project_member_permissions')
            .select('dashboard, analise, crm, automacoes, chat_ao_vivo, meta_ads, ofertas, lancamentos, configuracoes')
            .eq('project_id', currentProject.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (permError) {
            console.error('Error fetching member permissions:', permError);
          }
          
          setMemberPermissions(permData as MemberPermissions | null);
        } else {
          // Owner has full permissions
          setMemberPermissions({
            dashboard: 'admin',
            analise: 'admin',
            crm: 'admin',
            automacoes: 'admin',
            chat_ao_vivo: 'admin',
            meta_ads: 'admin',
            ofertas: 'admin',
            lancamentos: 'admin',
            configuracoes: 'admin',
            insights: 'admin',
            pesquisas: 'admin',
            social_listening: 'admin',
          });
        }
      } else {
        setIsProjectOwner(false);
        setMemberPermissions(null);
      }

      // Fetch all features (including inactive, so global disable works)
      const { data: featuresData, error: featuresError } = await supabase
        .from('features' as any)
        .select('*')
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
          .eq('is_enabled', true) as { data: DbProjectModule[] | null; error: any };

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

  // Helper to check area permission level
  const hasAreaPermission = useCallback((area: keyof MemberPermissions, minLevel: PermissionLevel = 'view'): boolean => {
    // Super admin and owner bypass area permissions
    if (isSuperAdmin || isProjectOwner) return true;

    // If no permissions data, deny access
    if (!memberPermissions) return false;

    const currentLevel = memberPermissions[area];
    if (!currentLevel || currentLevel === 'none') return false;

    const levelOrder: PermissionLevel[] = ['none', 'view', 'edit', 'admin'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    const requiredIndex = levelOrder.indexOf(minLevel);

    return currentIndex >= requiredIndex;
  }, [isSuperAdmin, isProjectOwner, memberPermissions]);

  const canUse = useCallback((featureKey: string): boolean => {
    const feature = features.find(f => f.feature_key === featureKey);

    // Global kill-switch: if a feature exists but is inactive, deny for everyone
    if (feature && feature.is_active === false) {
      return false;
    }

    const moduleKey = feature?.module_key || featureKey.split('.')[0];

    // Check member permissions for the corresponding area
    const permissionArea = MODULE_TO_AREA_MAP[moduleKey];
    if (permissionArea && currentProject) {
      const requiredLevel = getRequiredLevelFromFeatureKey(featureKey);
      if (!hasAreaPermission(permissionArea, requiredLevel)) {
        return false;
      }
    }

    // "core" module features are always available by default
    if (moduleKey === 'core') {
      const userOverride = overrides.find(o => o.feature_key === featureKey);
      if (userOverride !== undefined) {
        return userOverride.enabled;
      }
      const planFeature = planFeatures.find(pf => pf.feature_key === featureKey);
      if (planFeature !== undefined) {
        return planFeature.enabled;
      }
      return true;
    }

    // Check if module is active in project (applies to everyone, including super admin)
    if (currentProject && !activeModules.includes(moduleKey)) {
      return false;
    }

    // Check override (highest priority)
    const userOverride = overrides.find(o => o.feature_key === featureKey);
    if (userOverride !== undefined) {
      return userOverride.enabled;
    }

    // Super admin bypasses plan gating, but NOT module activation or is_active
    if (isSuperAdmin) {
      return true;
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
  }, [features, isSuperAdmin, currentProject, activeModules, overrides, planFeatures, hasAreaPermission]);

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
    hasAreaPermission,
    isLoading,
    error,
    refresh: fetchFeatureData,
    features,
    planFeatures,
    overrides,
    hasSubscription,
    isSuperAdmin,
    isProjectOwner,
    memberPermissions
  };
};
