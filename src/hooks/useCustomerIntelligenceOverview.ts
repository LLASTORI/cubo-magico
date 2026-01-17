/**
 * Hook para métricas agregadas da base de clientes
 * 
 * PROMPT 28 - Visão Geral (Inteligência de Clientes)
 * 
 * Performance: 1 única query via view agregada
 * Tempo esperado: < 500ms
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface CustomerIntelligenceOverview {
  project_id: string;
  
  // Bloco 1: Base de Contatos
  total_contacts: number;
  total_customers: number;
  total_leads: number;
  total_prospects: number;
  
  // Bloco 2: Valor da Base
  total_revenue: number;
  avg_ltv: number;
  avg_ticket: number;
  total_orders: number;
  avg_orders_per_customer: number;
  
  // Bloco 3: Comportamento
  repeat_customers_count: number;
  repeat_rate_percent: number;
}

export function useCustomerIntelligenceOverview() {
  const { currentProject } = useProject();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-intelligence-overview', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('crm_customer_intelligence_overview')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer intelligence overview:', error);
        throw error;
      }

      // Retornar valores default se não houver dados
      if (!data) {
        return {
          project_id: currentProject.id,
          total_contacts: 0,
          total_customers: 0,
          total_leads: 0,
          total_prospects: 0,
          total_revenue: 0,
          avg_ltv: 0,
          avg_ticket: 0,
          total_orders: 0,
          avg_orders_per_customer: 0,
          repeat_customers_count: 0,
          repeat_rate_percent: 0,
        } as CustomerIntelligenceOverview;
      }

      return data as CustomerIntelligenceOverview;
    },
    enabled: !!currentProject?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Métricas derivadas
  const customersPercent = data?.total_contacts 
    ? ((data.total_customers / data.total_contacts) * 100).toFixed(1)
    : '0';
  
  const leadsPercent = data?.total_contacts 
    ? ((data.total_leads / data.total_contacts) * 100).toFixed(1)
    : '0';

  return {
    data,
    isLoading,
    error,
    refetch,
    
    // Convenience getters
    totalContacts: data?.total_contacts ?? 0,
    totalCustomers: data?.total_customers ?? 0,
    totalLeads: data?.total_leads ?? 0,
    totalProspects: data?.total_prospects ?? 0,
    totalRevenue: data?.total_revenue ?? 0,
    avgLtv: data?.avg_ltv ?? 0,
    avgTicket: data?.avg_ticket ?? 0,
    totalOrders: data?.total_orders ?? 0,
    avgOrdersPerCustomer: data?.avg_orders_per_customer ?? 0,
    repeatCustomersCount: data?.repeat_customers_count ?? 0,
    repeatRatePercent: data?.repeat_rate_percent ?? 0,
    
    // Percentuais derivados
    customersPercent,
    leadsPercent,
  };
}
