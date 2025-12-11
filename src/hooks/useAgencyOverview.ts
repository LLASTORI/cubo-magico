import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { startOfYear, format } from "date-fns";

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
  const { data: projects, isLoading: projectsLoading } = useQuery({
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
  });

  // Fetch sales for all projects
  const { data: allSales, isLoading: salesLoading } = useQuery({
    queryKey: ['agency-sales', projects?.map(p => p.id), startDate, endDate],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('project_id, total_price_brl, status')
        .in('project_id', projectIds)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .in('status', ['approved', 'complete', 'APPROVED', 'COMPLETE']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projects && projects.length > 0,
  });

  // Fetch meta insights for all projects
  const { data: allInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['agency-insights', projects?.map(p => p.id), startDate, endDate],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      
      // Get active ad accounts for all projects
      const { data: accounts, error: accountsError } = await supabase
        .from('meta_ad_accounts')
        .select('id, project_id')
        .in('project_id', projectIds)
        .eq('is_active', true);

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) return [];

      const accountIds = accounts.map(a => a.id);

      const { data, error } = await supabase
        .from('meta_insights')
        .select('project_id, spend')
        .in('project_id', projectIds)
        .gte('date_start', startDate)
        .lte('date_stop', endDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projects && projects.length > 0,
  });

  // Calculate summaries per project
  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (!projects) return [];

    return projects.map(project => {
      const projectSales = allSales?.filter(s => s.project_id === project.id) || [];
      const projectInsights = allInsights?.filter(i => i.project_id === project.id) || [];

      const revenue = projectSales.reduce((sum, sale) => sum + (sale.total_price_brl || 0), 0);
      const investment = projectInsights.reduce((sum, insight) => sum + (insight.spend || 0), 0);
      const profit = revenue - investment;
      const roas = investment > 0 ? revenue / investment : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        investment,
        revenue,
        profit,
        roas,
        sales: projectSales.length,
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
  }, [projects, allSales, allInsights]);

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

  const isLoading = projectsLoading || salesLoading || insightsLoading;

  return {
    projectSummaries,
    agencyTotals,
    isLoading,
  };
};
