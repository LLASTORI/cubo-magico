import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface TrackingSettings {
  id?: string;
  project_id: string;
  meta_pixel_id: string | null;
  gtag_id: string | null;
  tiktok_pixel_id: string | null;
  enable_browser_events: boolean;
  enable_server_events: boolean;
}

export interface EventDispatchRule {
  id: string;
  project_id: string;
  system_event: string;
  provider: 'meta' | 'google' | 'tiktok';
  provider_event_name: string;
  payload_mapping: Record<string, any>;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// System events that can be mapped
export const SYSTEM_EVENTS = [
  { value: 'quiz_started', label: 'Quiz Iniciado', source: 'quiz' },
  { value: 'quiz_question_answered', label: 'Pergunta Respondida', source: 'quiz' },
  { value: 'quiz_completed', label: 'Quiz Completado', source: 'quiz' },
  { value: 'quiz_abandoned', label: 'Quiz Abandonado', source: 'quiz' },
  { value: 'quiz_outcome_selected', label: 'Outcome Selecionado', source: 'quiz' },
  { value: 'quiz_lead_identified', label: 'Lead Identificado', source: 'quiz' },
  { value: 'quiz_profile_updated', label: 'Perfil Atualizado', source: 'quiz' },
  { value: 'survey_started', label: 'Pesquisa Iniciada', source: 'survey' },
  { value: 'survey_completed', label: 'Pesquisa Completada', source: 'survey' },
  { value: 'contact_created', label: 'Contato Criado', source: 'crm' },
] as const;

// Meta standard events
export const META_EVENTS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'CompleteRegistration', label: 'CompleteRegistration' },
  { value: 'ViewContent', label: 'ViewContent' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'AddToCart', label: 'AddToCart' },
  { value: 'InitiateCheckout', label: 'InitiateCheckout' },
  { value: 'Subscribe', label: 'Subscribe' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Search', label: 'Search' },
  { value: 'StartTrial', label: 'StartTrial' },
] as const;

// Google standard events
export const GOOGLE_EVENTS = [
  { value: 'generate_lead', label: 'generate_lead' },
  { value: 'sign_up', label: 'sign_up' },
  { value: 'view_item', label: 'view_item' },
  { value: 'purchase', label: 'purchase' },
  { value: 'add_to_cart', label: 'add_to_cart' },
  { value: 'begin_checkout', label: 'begin_checkout' },
  { value: 'login', label: 'login' },
  { value: 'search', label: 'search' },
] as const;

// TikTok standard events
export const TIKTOK_EVENTS = [
  { value: 'SubmitForm', label: 'SubmitForm' },
  { value: 'CompleteRegistration', label: 'CompleteRegistration' },
  { value: 'ViewContent', label: 'ViewContent' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'AddToCart', label: 'AddToCart' },
  { value: 'InitiateCheckout', label: 'InitiateCheckout' },
  { value: 'Subscribe', label: 'Subscribe' },
  { value: 'Contact', label: 'Contact' },
] as const;

export function useTrackingSettings() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tracking settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['tracking_settings', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;
      
      const { data, error } = await supabase
        .from('project_tracking_settings')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as TrackingSettings | null;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch dispatch rules
  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['event_dispatch_rules', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const { data, error } = await supabase
        .from('event_dispatch_rules')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('system_event', { ascending: true });
      
      if (error) throw error;
      return (data || []) as EventDispatchRule[];
    },
    enabled: !!currentProject?.id,
  });

  // Save/update settings
  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<TrackingSettings>) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const payload = {
        ...newSettings,
        project_id: currentProject.id,
      };

      if (settings?.id) {
        const { data, error } = await supabase
          .from('project_tracking_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('project_tracking_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking_settings'] });
      toast({ title: 'Configurações salvas' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Add dispatch rule
  const addRule = useMutation({
    mutationFn: async (rule: Omit<EventDispatchRule, 'id' | 'project_id' | 'created_at' | 'updated_at'>) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { data, error } = await supabase
        .from('event_dispatch_rules')
        .insert({
          ...rule,
          project_id: currentProject.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_dispatch_rules'] });
      toast({ title: 'Regra adicionada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar regra', description: error.message, variant: 'destructive' });
    },
  });

  // Update dispatch rule
  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventDispatchRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('event_dispatch_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_dispatch_rules'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar regra', description: error.message, variant: 'destructive' });
    },
  });

  // Delete dispatch rule
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_dispatch_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_dispatch_rules'] });
      toast({ title: 'Regra removida' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover regra', description: error.message, variant: 'destructive' });
    },
  });

  return {
    settings,
    rules,
    isLoading: isLoadingSettings || isLoadingRules,
    saveSettings,
    addRule,
    updateRule,
    deleteRule,
  };
}

// Hook for public quiz pages to load tracking settings
export function usePublicTrackingSettings(projectId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['public_tracking_settings', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      // Fetch settings and rules in parallel
      const [settingsResult, rulesResult] = await Promise.all([
        supabase
          .from('project_tracking_settings')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('event_dispatch_rules')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_enabled', true),
      ]);

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }
      if (rulesResult.error) throw rulesResult.error;

      return {
        settings: settingsResult.data as TrackingSettings | null,
        rules: (rulesResult.data || []) as EventDispatchRule[],
      };
    },
    enabled: !!projectId,
  });

  return {
    settings: data?.settings,
    rules: data?.rules || [],
    isLoading,
  };
}
