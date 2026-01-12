import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

export interface ProjectSettings {
  id: string;
  project_id: string;
  financial_core_start_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch and manage project settings including the financial core epoch date
 */
export const useProjectSettings = (projectId?: string) => {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  
  // Allow passing projectId explicitly, or use currentProject
  const effectiveProjectId = projectId || currentProject?.id;

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['project-settings', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return null;

      const { data, error } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', effectiveProjectId)
        .maybeSingle();

      if (error) {
        console.error('[useProjectSettings] Error fetching settings:', error);
        throw error;
      }

      // If no settings exist, create default ones
      if (!data) {
        const today = new Date().toISOString().split('T')[0];
        const { data: newSettings, error: insertError } = await supabase
          .from('project_settings')
          .insert({
            project_id: effectiveProjectId,
            financial_core_start_date: today,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[useProjectSettings] Error creating default settings:', insertError);
          throw insertError;
        }

        console.log(`[useProjectSettings] Created default settings with epoch: ${today}`);
        return newSettings as ProjectSettings;
      }

      console.log(`[useProjectSettings] Loaded settings, epoch: ${data.financial_core_start_date}`);
      return data as ProjectSettings;
    },
    enabled: !!effectiveProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<ProjectSettings, 'financial_core_start_date'>>) => {
      if (!effectiveProjectId) throw new Error('No project selected');

      const { data, error } = await supabase
        .from('project_settings')
        .update(updates)
        .eq('project_id', effectiveProjectId)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', effectiveProjectId] });
    },
  });

  /**
   * Check if a given date is in the Core Era (>= financial_core_start_date)
   */
  const isInCoreEra = (date: string): boolean => {
    if (!settings?.financial_core_start_date) return false;
    return date >= settings.financial_core_start_date;
  };

  /**
   * Check if a date range overlaps with the Legacy Era
   */
  const hasLegacyData = (startDate: string, endDate: string): boolean => {
    if (!settings?.financial_core_start_date) return true;
    return startDate < settings.financial_core_start_date;
  };

  /**
   * Check if a date range is entirely in the Core Era
   */
  const isFullyCoreEra = (startDate: string, endDate: string): boolean => {
    if (!settings?.financial_core_start_date) return false;
    return startDate >= settings.financial_core_start_date;
  };

  /**
   * Get the portion of a date range that falls in the Core Era
   */
  const getCoreEraRange = (startDate: string, endDate: string): { start: string; end: string } | null => {
    if (!settings?.financial_core_start_date) return null;
    
    const epochDate = settings.financial_core_start_date;
    
    if (endDate < epochDate) {
      // Entirely in Legacy Era
      return null;
    }
    
    return {
      start: startDate >= epochDate ? startDate : epochDate,
      end: endDate,
    };
  };

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    // Epoch utilities
    financialCoreStartDate: settings?.financial_core_start_date || null,
    isInCoreEra,
    hasLegacyData,
    isFullyCoreEra,
    getCoreEraRange,
  };
};
