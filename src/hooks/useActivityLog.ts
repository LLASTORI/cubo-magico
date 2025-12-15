import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ActivityAction = 'create' | 'update' | 'delete' | 'login' | 'logout';
type EntityType = 'project' | 'funnel' | 'offer' | 'member' | 'credentials' | 'meta_account' | 'pipeline_stage' | 'recovery_stage' | 'cadence' | 'contact' | 'activity' | 'session';

interface LogActivityParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  projectId?: string;
  details?: Record<string, any>;
}

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = async ({
    action,
    entityType,
    entityId,
    entityName,
    projectId,
    details = {}
  }: LogActivityParams) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          entity_name: entityName || null,
          details,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  return { logActivity };
};

// Standalone function for use outside of React components (like in AuthContext)
export const logActivityStandalone = async (
  userId: string,
  params: Omit<LogActivityParams, 'projectId'> & { projectId?: string }
) => {
  try {
    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        project_id: params.projectId || null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || null,
        details: params.details || {},
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Function to update last login
export const updateLastLogin = async () => {
  try {
    const { error } = await supabase.rpc('update_last_login');
    if (error) {
      console.error('Error updating last login:', error);
    }
  } catch (err) {
    console.error('Failed to update last login:', err);
  }
};
