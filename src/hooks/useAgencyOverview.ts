import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

interface ProjectSummary {
  projectId: string;
  projectName: string;
  investment: number;
  revenue: number;
  profit: number;
  roas: number;
  sales: number;
}

interface AgencyTotals {
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  totalRoas: number;
  totalSales: number;
  projectCount: number;
}

export interface UseAgencyOverviewProps {
  startDate: string;
  endDate: string;
}

export const useAgencyOverview = ({ startDate, endDate }: UseAgencyOverviewProps) => {
  // Fetch all projects where user is owner
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['agency-projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch financial data from the Cubo Core for all projects
  const { data: allFinancialData, isLoading: financialLoading, refetch: refetchFinancial } = useQuery({
    queryKey: ['agency-financial-core', projects?.map(p => p.id), startDate, endDate],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      
      const { data, error } = await supabase
        .from('financial_daily')
        .select('project_id, revenue, ad_spend, transactions')
        .in('project_id', projectIds)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projects && projects.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      refetchProjects(),
      refetchFinancial(),
    ]);
  };

  // Calculate summaries per project
  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (!projects) return [];

    return projects.map(project => {
      const projectFinancial = allFinancialData?.filter(f => f.project_id === project.id) || [];

      const revenue = projectFinancial.reduce((sum, f) => sum + (f.revenue || 0), 0);
      const investment = projectFinancial.reduce((sum, f) => sum + (f.ad_spend || 0), 0);
      const sales = projectFinancial.reduce((sum, f) => sum + (f.transactions || 0), 0);
      const profit = revenue - investment;
      const roas = investment > 0 ? revenue / investment : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        investment,
        revenue,
        profit,
        roas,
        sales,
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
  }, [projects, allFinancialData]);

  // Calculate agency totals
  const agencyTotals: AgencyTotals = useMemo(() => {
    const totalInvestment = projectSummaries.reduce((sum, p) => sum + p.investment, 0);
    const totalRevenue = projectSummaries.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = totalRevenue - totalInvestment;
    const totalRoas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
    const totalSales = projectSummaries.reduce((sum, p) => sum + p.sales, 0);

    return {
      totalInvestment,
      totalRevenue,
      totalProfit,
      totalRoas,
      totalSales,
      projectCount: projectSummaries.length,
    };
  }, [projectSummaries]);

  const isLoading = projectsLoading || financialLoading;

  return {
    projectSummaries,
    agencyTotals,
    isLoading,
    refetchAll,
  };
};
