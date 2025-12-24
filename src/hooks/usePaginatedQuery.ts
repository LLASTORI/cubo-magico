import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PaginatedQueryConfig {
  table: string;
  select: string;
  filters?: Record<string, unknown>;
  inFilters?: Record<string, unknown[]>;
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Hook para buscar todos os registros de uma tabela com paginação automática.
 * Supera o limite padrão de 1000 registros do Supabase.
 * 
 * @example
 * const { data, isLoading } = usePaginatedQuery<Transaction>(
 *   ['transactions', projectId],
 *   {
 *     table: 'crm_transactions',
 *     select: 'id, contact_id, product_name',
 *     filters: { project_id: projectId },
 *     inFilters: { status: ['APPROVED', 'COMPLETE'] },
 *     orderBy: { column: 'id', ascending: true },
 *     enabled: !!projectId,
 *   }
 * );
 */
export function usePaginatedQuery<T>(
  queryKey: unknown[],
  config: PaginatedQueryConfig,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<T[]> => {
      const allData: T[] = [];
      let page = 0;
      const size = config.pageSize || 1000;
      let hasMore = true;

      while (hasMore) {
        // Use any to avoid deep type instantiation issues with dynamic table names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase.from(config.table as any).select(config.select);

        // Apply equality filters
        if (config.filters) {
          Object.entries(config.filters).forEach(([col, val]) => {
            if (val !== undefined && val !== null) {
              query = query.eq(col, val);
            }
          });
        }

        // Apply IN filters
        if (config.inFilters) {
          Object.entries(config.inFilters).forEach(([col, vals]) => {
            if (vals && vals.length > 0) {
              query = query.in(col, vals);
            }
          });
        }

        // Apply order
        if (config.orderBy) {
          query = query.order(config.orderBy.column, { 
            ascending: config.orderBy.ascending ?? true 
          });
        }

        // Apply pagination
        query = query.range(page * size, (page + 1) * size - 1);

        const { data, error } = await query;
        if (error) throw error;

        allData.push(...((data as T[]) || []));
        hasMore = (data?.length || 0) === size;
        page++;
      }

      console.log(`[usePaginatedQuery] ${config.table}: ${allData.length} registros carregados`);
      return allData;
    },
    enabled: config.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    ...options,
  });
}
