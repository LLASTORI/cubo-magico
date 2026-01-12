/**
 * useRevenueSplits
 * 
 * Hook for managing product revenue splits and viewing allocations.
 * Supports owner, coproducer, and affiliate splits.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

export interface ProductRevenueSplit {
  id: string;
  project_id: string;
  product_id: string;
  product_name: string | null;
  partner_type: 'owner' | 'coproducer' | 'affiliate';
  partner_name: string | null;
  percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevenueAllocation {
  event_id: string;
  project_id: string;
  economic_day: string;
  product_id: string;
  product_name: string | null;
  partner_type: string;
  partner_name: string | null;
  percentage: number;
  net_amount: number;
  allocated_amount: number;
  data_source: string;
}

export interface RevenueAllocationDaily {
  project_id: string;
  economic_day: string;
  partner_type: string;
  partner_name: string | null;
  total_allocated: number;
  transaction_count: number;
  data_source: string;
}

export interface CreateSplitInput {
  product_id: string;
  product_name?: string;
  partner_type: 'owner' | 'coproducer' | 'affiliate';
  partner_name?: string;
  percentage: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch all product revenue splits for the current project
 */
export function useProductRevenueSplits(productId?: string) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['product-revenue-splits', currentProject?.id, productId],
    queryFn: async () => {
      let query = supabase
        .from('product_revenue_splits')
        .select('*')
        .eq('project_id', currentProject!.id)
        .eq('is_active', true)
        .order('product_id', { ascending: true })
        .order('partner_type', { ascending: true });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProductRevenueSplit[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Create a new revenue split
 */
export function useCreateRevenueSplit() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSplitInput) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { data, error } = await supabase
        .from('product_revenue_splits')
        .insert({
          project_id: currentProject.id,
          product_id: input.product_id,
          product_name: input.product_name,
          partner_type: input.partner_type,
          partner_name: input.partner_name,
          percentage: input.percentage,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-revenue-splits'] });
      toast.success('Split de receita criado com sucesso');
    },
    onError: (error: Error) => {
      console.error('Error creating revenue split:', error);
      toast.error('Erro ao criar split de receita');
    },
  });
}

/**
 * Update an existing revenue split
 */
export function useUpdateRevenueSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductRevenueSplit> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_revenue_splits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-revenue-splits'] });
      toast.success('Split de receita atualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating revenue split:', error);
      toast.error('Erro ao atualizar split de receita');
    },
  });
}

/**
 * Delete a revenue split (soft delete)
 */
export function useDeleteRevenueSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_revenue_splits')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-revenue-splits'] });
      toast.success('Split de receita removido');
    },
    onError: (error: Error) => {
      console.error('Error deleting revenue split:', error);
      toast.error('Erro ao remover split de receita');
    },
  });
}

/**
 * Fetch revenue allocations with optional date filtering
 */
export function useRevenueAllocations(options?: {
  startDate?: string;
  endDate?: string;
  productId?: string;
  partnerType?: string;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['revenue-allocations', currentProject?.id, options],
    queryFn: async () => {
      let query = supabase
        .from('revenue_allocations')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('economic_day', { ascending: false });

      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }
      if (options?.productId) {
        query = query.eq('product_id', options.productId);
      }
      if (options?.partnerType) {
        query = query.eq('partner_type', options.partnerType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RevenueAllocation[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Fetch daily revenue allocations summary
 */
export function useRevenueAllocationsDaily(options?: {
  startDate?: string;
  endDate?: string;
  partnerType?: string;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['revenue-allocations-daily', currentProject?.id, options],
    queryFn: async () => {
      let query = supabase
        .from('revenue_allocations_daily')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('economic_day', { ascending: false });

      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }
      if (options?.partnerType) {
        query = query.eq('partner_type', options.partnerType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RevenueAllocationDaily[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Get unique products from sales for setting up splits
 */
export function useProductsForSplits() {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['products-for-splits', currentProject?.id],
    queryFn: async () => {
      // Get unique products from sales_core_events raw_payload
      const { data, error } = await supabase
        .from('sales_core_events')
        .select('raw_payload')
        .eq('project_id', currentProject!.id)
        .eq('is_active', true)
        .limit(500);

      if (error) throw error;

      // Extract unique products from raw_payload
      const productMap = new Map<string, string>();
      
      (data || []).forEach((row: any) => {
        const productId = row.raw_payload?.data?.product?.id?.toString();
        const productName = row.raw_payload?.data?.product?.name;
        if (productId && !productMap.has(productId)) {
          productMap.set(productId, productName || `Produto ${productId}`);
        }
      });

      return Array.from(productMap.entries()).map(([id, name]) => ({
        product_id: id,
        product_name: name,
      }));
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Validate that splits for a product sum to 100%
 */
export function validateProductSplits(splits: ProductRevenueSplit[]): {
  isValid: boolean;
  total: number;
  message: string;
} {
  const total = splits.reduce((sum, s) => sum + s.percentage, 0);
  
  if (Math.abs(total - 1) < 0.0001) {
    return { isValid: true, total, message: 'Splits somam 100%' };
  } else if (total < 1) {
    return { 
      isValid: false, 
      total, 
      message: `Splits somam ${(total * 100).toFixed(2)}% - faltam ${((1 - total) * 100).toFixed(2)}%` 
    };
  } else {
    return { 
      isValid: false, 
      total, 
      message: `Splits excedem 100% - total de ${(total * 100).toFixed(2)}%` 
    };
  }
}
