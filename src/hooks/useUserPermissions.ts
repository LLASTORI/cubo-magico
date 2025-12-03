import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermissions {
  canCreateProjects: boolean;
  maxProjects: number;
  currentProjectCount: number;
  isActive: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateProjects: false,
    maxProjects: 0,
    currentProjectCount: 0,
    isActive: true,
    isAdmin: false,
    loading: true,
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

        // Count current projects
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const isAdmin = roleData?.role === 'admin';
        const canCreate = profile?.can_create_projects ?? false;
        const maxProjects = profile?.max_projects ?? 0;
        const projectCount = count ?? 0;

        // User can create if: is active, has permission, and hasn't reached limit (0 = unlimited)
        const canCreateProjects = 
          (profile?.is_active !== false) && 
          canCreate && 
          (maxProjects === 0 || projectCount < maxProjects);

        setPermissions({
          canCreateProjects,
          maxProjects,
          currentProjectCount: projectCount,
          isActive: profile?.is_active ?? true,
          isAdmin,
          loading: false,
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

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const canCreate = profile?.can_create_projects ?? false;
    const maxProjects = profile?.max_projects ?? 0;
    const projectCount = count ?? 0;

    setPermissions(prev => ({
      ...prev,
      canCreateProjects: 
        (profile?.is_active !== false) && 
        canCreate && 
        (maxProjects === 0 || projectCount < maxProjects),
      maxProjects,
      currentProjectCount: projectCount,
      isActive: profile?.is_active ?? true,
    }));
  };

  return { ...permissions, refreshPermissions };
};
