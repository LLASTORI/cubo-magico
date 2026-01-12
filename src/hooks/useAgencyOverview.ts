/**
 * useAgencyOverview
 * 
 * Hook for agency-level financial overview across all projects.
 * 
 * FINANCIAL TIME MODEL:
 * - Uses Financial Core data only (excludes today)
 * - Trust level: 'core' - safe for dashboards and AI
 * - Live data (today) is available via separate useLiveProjectTotals hook
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { getTodayString, getFinancialDataContext, type FinancialDataMode, type TrustLevel } from '@/lib/financialTimeModel';

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

export interface AgencyOverviewResult {
  projectSummaries: ProjectSummary[];
  agencyTotals: AgencyTotals;
  isLoading: boolean;
  refetchAll: () => Promise<void>;
  dataMode: FinancialDataMode;
  trustLevel: TrustLevel;
  includesLiveData: boolean;
  isAISafe: boolean;
}

export const useAgencyOverview = ({ startDate, endDate }: UseAgencyOverviewProps): AgencyOverviewResult => {
  const today = getTodayString();
  
  // For Core data, we always exclude today
  const coreEndDate = endDate >= today 
    ? new Date(new Date(today).setDate(new Date().getDate() - 1)).toISOString().split('T')[0]
    : endDate;
  
  const dataContext = useMemo(() => 
    getFinancialDataContext(startDate, endDate),
    [startDate, endDate]
  );
  
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

  // Fetch Core data only (excludes today)
  const { data: allFinancialData, isLoading: financialLoading, refetch: refetchFinancial } = useQuery({
    queryKey: ['agency-financial-core', projects?.map(p => p.id), startDate, coreEndDate],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      if (coreEndDate < startDate) return [];

      const projectIds = projects.map(p => p.id);
      
      const { data, error } = await supabase
        .from('financial_daily')
        .select('project_id, revenue, ad_spend, transactions')
        .in('project_id', projectIds)
        .gte('economic_day', startDate)
        .lte('economic_day', coreEndDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projects && projects.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const refetchAll = async () => {
    await Promise.all([refetchProjects(), refetchFinancial()]);
  };

  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (!projects) return [];

    return projects.map(project => {
      const projectFinancial = allFinancialData?.filter(f => f.project_id === project.id) || [];
      const revenue = projectFinancial.reduce((sum, f) => sum + (f.revenue || 0), 0);
      const investment = projectFinancial.reduce((sum, f) => sum + (f.ad_spend || 0), 0);
      const sales = projectFinancial.reduce((sum, f) => sum + (f.transactions || 0), 0);

      return {
        projectId: project.id,
        projectName: project.name,
        investment,
        revenue,
        profit: revenue - investment,
        roas: investment > 0 ? revenue / investment : 0,
        sales,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [projects, allFinancialData]);

  const agencyTotals: AgencyTotals = useMemo(() => {
    const totalInvestment = projectSummaries.reduce((sum, p) => sum + p.investment, 0);
    const totalRevenue = projectSummaries.reduce((sum, p) => sum + p.revenue, 0);
    const totalSales = projectSummaries.reduce((sum, p) => sum + p.sales, 0);

    return {
      totalInvestment,
      totalRevenue,
      totalProfit: totalRevenue - totalInvestment,
      totalRoas: totalInvestment > 0 ? totalRevenue / totalInvestment : 0,
      totalSales,
      projectCount: projectSummaries.length,
    };
  }, [projectSummaries]);

  return {
    projectSummaries,
    agencyTotals,
    isLoading: projectsLoading || financialLoading,
    refetchAll,
    dataMode: dataContext.hasLiveData ? 'mixed' : 'core',
    trustLevel: 'core',
    includesLiveData: dataContext.hasLiveData,
    isAISafe: true,
  };
};
