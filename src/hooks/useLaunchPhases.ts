import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LaunchPhase {
  id: string;
  funnel_id: string;
  project_id: string;
  phase_type: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  primary_metric: string;
  is_active: boolean;
  phase_order: number;
  notes: string | null;
  campaign_name_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhaseCampaign {
  id: string;
  phase_id: string;
  campaign_id: string;
  project_id: string;
  created_at: string;
}

export interface LaunchProduct {
  id: string;
  funnel_id: string;
  offer_mapping_id: string;
  project_id: string;
  product_type: string;
  lot_name: string | null;
  created_at: string;
}

// Phase types with their primary metrics
export const PHASE_TYPES = [
  { value: 'distribuicao', label: 'Distribuição', metric: 'reach', description: 'Alcance e engajamento' },
  { value: 'captacao', label: 'Captação', metric: 'cpl', description: 'Custo por Lead (CPL)' },
  { value: 'aquecimento', label: 'Aquecimento', metric: 'views', description: 'Views e interações' },
  { value: 'remarketing', label: 'Remarketing Aulas', metric: 'views', description: 'Views de replay' },
  { value: 'vendas', label: 'Vendas', metric: 'roas', description: 'CPA, ROAS, Receita' },
  { value: 'ultima_oportunidade', label: 'Última Oportunidade', metric: 'roas', description: 'CPA, ROAS' },
  { value: 'flash_open', label: 'Flash Open', metric: 'roas', description: 'CPA, ROAS' },
  { value: 'downsell', label: 'Downsell', metric: 'roas', description: 'CPA, ROAS' },
] as const;

export const PRODUCT_TYPES = [
  { value: 'main', label: 'Produto Principal', description: 'Produto do lançamento' },
  { value: 'upsell', label: 'Upsell', description: 'Próximo passo para quem comprou' },
  { value: 'downsell', label: 'Downsell', description: 'Versão menor para quem não comprou' },
] as const;

export const useLaunchPhases = (projectId: string | undefined, funnelId?: string) => {
  const queryClient = useQueryClient();

  // Fetch phases for a funnel or project
  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: ['launch-phases', projectId, funnelId],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase
        .from('launch_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_order');
      
      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LaunchPhase[];
    },
    enabled: !!projectId,
  });

  // Fetch phase campaigns
  const { data: phaseCampaigns = [], isLoading: loadingPhaseCampaigns } = useQuery({
    queryKey: ['phase-campaigns', projectId, funnelId],
    queryFn: async () => {
      if (!projectId || phases.length === 0) return [];
      const phaseIds = phases.map(p => p.id);
      const { data, error } = await supabase
        .from('phase_campaigns')
        .select('*')
        .in('phase_id', phaseIds);
      if (error) throw error;
      return data as PhaseCampaign[];
    },
    enabled: !!projectId && phases.length > 0,
  });

  // Fetch launch products
  const { data: launchProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['launch-products', projectId, funnelId],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase
        .from('launch_products')
        .select('*')
        .eq('project_id', projectId);
      
      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LaunchProduct[];
    },
    enabled: !!projectId,
  });

  // Create phase
  const createPhase = useMutation({
    mutationFn: async (phase: Omit<LaunchPhase, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('launch_phases')
        .insert(phase)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-phases', projectId] });
      toast.success('Fase criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar fase: ' + error.message);
    },
  });

  // Update phase
  const updatePhase = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaunchPhase> & { id: string }) => {
      const { data, error } = await supabase
        .from('launch_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-phases', projectId] });
      toast.success('Fase atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar fase: ' + error.message);
    },
  });

  // Delete phase
  const deletePhase = useMutation({
    mutationFn: async (phaseId: string) => {
      const { error } = await supabase
        .from('launch_phases')
        .delete()
        .eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-phases', projectId] });
      toast.success('Fase removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover fase: ' + error.message);
    },
  });

  // Link campaign to phase
  const linkCampaignToPhase = useMutation({
    mutationFn: async ({ phaseId, campaignId }: { phaseId: string; campaignId: string }) => {
      if (!projectId) throw new Error('Project ID required');
      const { data, error } = await supabase
        .from('phase_campaigns')
        .insert({ phase_id: phaseId, campaign_id: campaignId, project_id: projectId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-campaigns', projectId] });
    },
  });

  // Unlink campaign from phase
  const unlinkCampaignFromPhase = useMutation({
    mutationFn: async ({ phaseId, campaignId }: { phaseId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('phase_campaigns')
        .delete()
        .eq('phase_id', phaseId)
        .eq('campaign_id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-campaigns', projectId] });
    },
  });

  // Create launch product link
  const createLaunchProduct = useMutation({
    mutationFn: async (product: Omit<LaunchProduct, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('launch_products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-products', projectId] });
      toast.success('Produto vinculado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao vincular produto: ' + error.message);
    },
  });

  // Update launch product
  const updateLaunchProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaunchProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('launch_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-products', projectId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    },
  });

  // Delete launch product link
  const deleteLaunchProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('launch_products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-products', projectId] });
      toast.success('Vínculo removido');
    },
  });

  return {
    phases,
    phaseCampaigns,
    launchProducts,
    isLoading: loadingPhases || loadingPhaseCampaigns || loadingProducts,
    createPhase,
    updatePhase,
    deletePhase,
    linkCampaignToPhase,
    unlinkCampaignFromPhase,
    createLaunchProduct,
    updateLaunchProduct,
    deleteLaunchProduct,
  };
};
