import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CRMActivity {
  id: string;
  project_id: string;
  contact_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  activity_type: 'task' | 'call' | 'meeting' | 'email' | 'whatsapp' | 'reminder';
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityInput {
  contact_id: string;
  title: string;
  description?: string;
  activity_type: CRMActivity['activity_type'];
  priority?: CRMActivity['priority'];
  due_date?: string;
}

export function useCRMActivities(contactId?: string) {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = contactId 
    ? ['crm-activities', currentProject?.id, contactId]
    : ['crm-activities', currentProject?.id];

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('crm_activities_tasks')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CRMActivity[];
    },
    enabled: !!currentProject?.id,
  });

  const createActivity = useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { error } = await supabase.from('crm_activities_tasks').insert({
        project_id: currentProject.id,
        contact_id: input.contact_id,
        title: input.title,
        description: input.description,
        activity_type: input.activity_type,
        priority: input.priority || 'medium',
        due_date: input.due_date,
        created_by: user?.id,
        assigned_to: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', currentProject?.id] });
      toast.success('Atividade criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating activity:', error);
      toast.error('Erro ao criar atividade');
    },
  });

  const updateActivity = useMutation({
    mutationFn: async (activity: Partial<CRMActivity> & { id: string }) => {
      const { error } = await supabase
        .from('crm_activities_tasks')
        .update(activity)
        .eq('id', activity.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', currentProject?.id] });
    },
  });

  const completeActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('crm_activities_tasks')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', currentProject?.id] });
      toast.success('Atividade concluída');
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('crm_activities_tasks')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', currentProject?.id] });
      toast.success('Atividade removida');
    },
  });

  // Stats
  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const overdueCount = activities.filter(a => 
    a.status === 'pending' && a.due_date && new Date(a.due_date) < new Date()
  ).length;
  const todayCount = activities.filter(a => {
    if (a.status !== 'pending' || !a.due_date) return false;
    const today = new Date();
    const dueDate = new Date(a.due_date);
    return dueDate.toDateString() === today.toDateString();
  }).length;

  return {
    activities,
    isLoading,
    error,
    createActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
    stats: {
      pending: pendingCount,
      overdue: overdueCount,
      today: todayCount,
    },
  };
}
