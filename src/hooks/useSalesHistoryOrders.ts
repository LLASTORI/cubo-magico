/**
 * USE SALES HISTORY ORDERS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Hook para consultar pedidos históricos importados via CSV.
 * Dados são somente leitura e isolados do sistema operacional.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useQuery } from '@tanstack/react-query';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';

interface SalesHistoryFilters {
  search?: string;
  status?: string;
  product?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface SalesHistoryOrder {
  id: string;
  provider: string;
  provider_transaction_id: string;
  order_date: string | null;
  confirmation_date: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  product_name: string | null;
  product_code: string | null;
  offer_name: string | null;
  gross_value: number;
  platform_fee: number;
  affiliate_commission: number;
  coproducer_commission: number;
  taxes: number;
  net_value: number;
  original_currency: string;
  status: string | null;
  payment_method: string | null;
  installments: number | null;
  affiliate_name: string | null;
  coproducer_name: string | null;
  imported_at: string;
}

interface SalesHistoryResult {
  data: SalesHistoryOrder[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useSalesHistoryOrders(filters: SalesHistoryFilters = {}) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const {
    search,
    status,
    product,
    startDate,
    endDate,
    page = 1,
    pageSize = 25,
  } = filters;

  return useQuery<SalesHistoryResult>({
    queryKey: ['sales-history-orders', projectId, filters],
    queryFn: async () => {
      if (!projectId) {
        return { data: [], count: 0, page: 1, pageSize, totalPages: 0 };
      }

      let query = supabase
        .from('sales_history_orders')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('order_date', { ascending: false, nullsFirst: false });

      // Apply filters
      if (search) {
        query = query.or(
          `buyer_email.ilike.%${search}%,buyer_name.ilike.%${search}%,provider_transaction_id.ilike.%${search}%`
        );
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (product) {
        query = query.ilike('product_name', `%${product}%`);
      }

      if (startDate) {
        query = query.gte('order_date', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('order_date', endDate.toISOString());
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!projectId,
  });
}

export function useSalesHistoryStats() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['sales-history-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('sales_history_orders')
        .select('status, net_value, original_currency')
        .eq('project_id', projectId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byStatus: {} as Record<string, number>,
        totalValue: 0,
        currencies: new Set<string>(),
      };

      data?.forEach((row) => {
        const status = row.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        stats.totalValue += row.net_value || 0;
        if (row.original_currency) {
          stats.currencies.add(row.original_currency);
        }
      });

      return stats;
    },
    enabled: !!projectId,
  });
}

export function useSalesHistoryProducts() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['sales-history-products', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('sales_history_orders')
        .select('product_name')
        .eq('project_id', projectId)
        .not('product_name', 'is', null);

      if (error) throw error;

      const uniqueProducts = [...new Set(data?.map(r => r.product_name))].filter(Boolean);
      return uniqueProducts as string[];
    },
    enabled: !!projectId,
  });
}

export function useSalesHistoryStatuses() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['sales-history-statuses', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('sales_history_orders')
        .select('status')
        .eq('project_id', projectId)
        .not('status', 'is', null);

      if (error) throw error;

      const uniqueStatuses = [...new Set(data?.map(r => r.status))].filter(Boolean);
      return uniqueStatuses as string[];
    },
    enabled: !!projectId,
  });
}
