import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Target, 
  DollarSign, ShoppingCart, Users, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Percent, ArrowRight, Megaphone, LineChart, 
  GitCompare, Tag, CreditCard, UsersRound, Coins, History, Lock
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMetaHierarchy } from '@/hooks/useMetaHierarchy';
import { ModuleLockedValue, ModuleLockedHeader } from '@/components/ModuleLockedValue';

// Import analysis components
import TemporalChart from '@/components/funnel/TemporalChart';
import PeriodComparison from '@/components/funnel/PeriodComparison';
import UTMAnalysis from '@/components/funnel/UTMAnalysis';
import PaymentMethodAnalysis from '@/components/funnel/PaymentMethodAnalysis';
import LTVAnalysis from '@/components/funnel/LTVAnalysis';
import FunnelChangelog from '@/components/funnel/FunnelChangelog';
import { MetaHierarchyAnalysis } from '@/components/meta/MetaHierarchyAnalysis';

// Define unified sales type that matches FunnelAnalysis query
interface UnifiedSale {
  transaction_id: string;
  product_name: string;
  offer_code: string | null;
  total_price_brl: number | null;
  buyer_email: string | null;
  sale_date: string | null;
  status: string;
  meta_campaign_id_extracted?: string | null;
  meta_adset_id_extracted?: string | null;
  meta_ad_id_extracted?: string | null;
  utm_source?: string | null;
  payment_method?: string | null;
  installment_number?: number | null;
}

interface CuboMagicoDashboardProps {
  projectId: string;
  externalStartDate?: Date;
  externalEndDate?: Date;
  embedded?: boolean;
  onFunnelSelect?: (funnelId: string) => void;
  // Accept pre-fetched sales data from parent to avoid duplicate queries
  salesData?: UnifiedSale[];
}

interface FunnelWithConfig {
  id: string;
  name: string;
  roas_target: number | null;
  campaign_name_pattern: string | null;
}

interface FunnelMetrics {
  funnel: FunnelWithConfig;
  investimento: number;
  faturamento: number;
  vendasFront: number;
  totalProdutos: number;
  ticketMedio: number;
  cpaMaximo: number;
  cpaReal: number;
  roas: number;
  status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive';
  productsByPosition: Record<string, number>;
  // Detailed breakdown by position
  positionBreakdown: Array<{
    tipo: string;
    ordem: number;
    vendas: number;
    receita: number;
    taxaConversao: number;
    produtos: Array<{ nome_produto: string; nome_oferta: string | null; codigo_oferta: string | null }>;
  }>;
  // New conversion metrics
  connectRate: number; // landing_page_view / link_click
  txPaginaCheckout: number; // initiate_checkout / landing_page_view
  txCheckoutCompra: number; // purchase / initiate_checkout
  // Raw action counts for display
  linkClicks: number;
  landingPageViews: number;
  initiateCheckouts: number;
  purchases: number;
}

export function CuboMagicoDashboard({ 
  projectId, 
  externalStartDate, 
  externalEndDate, 
  embedded = false,
  onFunnelSelect,
  salesData: externalSalesData
}: CuboMagicoDashboardProps) {
  const { isModuleEnabled } = useProjectModules();
  const isMetaAdsEnabled = isModuleEnabled('meta_ads');
  const isHotmartEnabled = isModuleEnabled('hotmart');
  
  const [internalStartDate, setInternalStartDate] = useState<Date>(subDays(new Date(), 7));
  const [internalEndDate, setInternalEndDate] = useState<Date>(new Date());
  const [expandedFunnelId, setExpandedFunnelId] = useState<string | null>(null);
  
  // Use external dates if provided, otherwise use internal state
  const startDate = externalStartDate || internalStartDate;
  const endDate = externalEndDate || internalEndDate;
  const setStartDate = externalStartDate ? () => {} : setInternalStartDate;
  const setEndDate = externalEndDate ? () => {} : setInternalEndDate;

  // Convert dates to strings for consistent query keys
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch funnels with config - ONLY perpetuo funnels (exclude 'A Definir' and 'Lançamento')
  const { data: funnels, isLoading: loadingFunnels } = useQuery({
    queryKey: ['funnels-with-config-perpetuo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, roas_target, campaign_name_pattern')
        .eq('project_id', projectId)
        .eq('funnel_type', 'perpetuo');
      
      if (error) throw error;
      console.log(`[CuboMagico] Perpetuo funnels loaded: ${data?.length || 0}`);
      return (data as FunnelWithConfig[]) || [];
    },
    enabled: !!projectId,
  });

  // Fetch offer mappings - use unified query key
  const { data: offerMappings } = useQuery({
    queryKey: ['offer-mappings-unified', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, funnel_id, codigo_oferta, tipo_posicao, nome_posicao, valor, ordem_posicao, nome_produto, nome_oferta')
        .eq('project_id', projectId)
        .eq('status', 'Ativo');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch funnel_meta_accounts to know which Meta accounts are linked to each funnel
  const { data: funnelMetaAccounts } = useQuery({
    queryKey: ['funnel-meta-accounts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_meta_accounts')
        .select('funnel_id, meta_account_id')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch meta_ad_accounts to map UUIDs to account_ids
  const { data: metaAdAccountsWithIds } = useQuery({
    queryKey: ['meta-ad-accounts-with-ids', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('id, account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Use external sales data if provided, otherwise fetch from cache
  // This avoids duplicate queries - FunnelAnalysis.tsx fetches all sales with full fields
  // and passes them down to this component
  const salesData = externalSalesData || [];
  
  // Fetch active Meta ad accounts FIRST (needed for filtering all queries)
  const { data: metaAdAccounts } = useQuery({
    queryKey: ['meta-ad-accounts-cubo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get active account IDs for consistent filtering
  const activeAccountIds = useMemo(() => {
    if (!metaAdAccounts || metaAdAccounts.length === 0) return [];
    return metaAdAccounts.map(a => a.account_id).sort();
  }, [metaAdAccounts]);

  // Fetch Meta campaigns - ONLY from active accounts with pagination
  const { data: campaignsData } = useQuery({
    queryKey: ['meta-hierarchy-campaigns', projectId, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      const PAGE_SIZE = 1000;
      let allCampaigns: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_campaigns')
          .select('id, campaign_id, campaign_name, status, ad_account_id')
          .eq('project_id', projectId)
          .in('ad_account_id', activeAccountIds)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allCampaigns = [...allCampaigns, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[CuboMagico] Loaded ${allCampaigns.length} campaigns from ${activeAccountIds.length} active accounts`);
      return allCampaigns;
    },
    enabled: !!projectId && activeAccountIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Meta insights - ALL ad-level for accurate spend calculations with pagination
  // IMPORTANT: Include activeAccountIds in query key to refetch when accounts change
  const { data: insightsData, refetch: refetchInsights, isRefetching } = useQuery({
    queryKey: ['insights', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      console.log(`[CuboMagico] Fetching insights for project=${projectId}, dates=${startDateStr} to ${endDateStr}`);
      
      // Fetch ALL ad-level insights with pagination to handle any time period
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('campaign_id, ad_account_id, spend, date_start, date_stop, adset_id, ad_id, impressions, clicks, reach, ctr, cpc, cpm, actions')
          .eq('project_id', projectId)
          .in('ad_account_id', activeAccountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', startDateStr)
          .lte('date_start', endDateStr)
          .order('date_start', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[CuboMagico] Ad-level insights loaded: ${allData.length}, total spend: R$${allData.reduce((s: number, i: any) => s + (i.spend || 0), 0).toFixed(2)}`);
      return allData;
    },
    enabled: !!projectId && activeAccountIds.length > 0,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always',
  });

  // Use unified hook for Meta hierarchy (adsets, ads)
  const { adsets: adsetsData, ads: adsData } = useMetaHierarchy({
    projectId,
    insights: insightsData,
    enabled: !!projectId,
  });

  // Calculate metrics for each funnel
  const funnelMetrics = useMemo((): FunnelMetrics[] => {
    if (!funnels || !offerMappings || !salesData || !campaignsData || !insightsData) {
      return [];
    }

    return funnels.map(funnel => {
      // IMPORTANT: Escape special regex characters in pattern for includes() 
      // The "+" character doesn't need escaping for includes(), but we normalize the comparison
      const rawPattern = funnel.campaign_name_pattern || '';
      const pattern = rawPattern.toLowerCase();
      const roasTarget = funnel.roas_target || 2;

      // Find campaigns matching the pattern (Padrão do Nome da Campanha)
      // Use a more robust matching that handles special characters
      const matchingCampaigns = pattern 
        ? campaignsData.filter(c => {
            const campaignName = c.campaign_name?.toLowerCase() || '';
            // Direct includes check - works with special chars like "+"
            return campaignName.includes(pattern);
          })
        : [];
      // Ensure campaign IDs are strings for consistent comparison
      const matchingCampaignIds = new Set(matchingCampaigns.map(c => String(c.campaign_id)));

      // Calculate total spend from ad-level insights (aggregate by ad_id + date)
      // Ensure campaign_id comparison is done as strings
      const matchingInsights = insightsData.filter(i => {
        const campaignId = String(i.campaign_id || '');
        return matchingCampaignIds.has(campaignId);
      });
      
      // Deduplicate by ad_id + date to avoid double counting
      const uniqueSpend = new Map<string, number>();
      matchingInsights.forEach(i => {
        if (i.spend && i.ad_id) {
          const key = `${i.ad_id}_${i.date_start}`;
          if (!uniqueSpend.has(key)) {
            uniqueSpend.set(key, i.spend);
          }
        }
      });
      const investimento = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
      
      // Extract action metrics from insights (aggregate all matching insights)
      // Helper to extract action value from actions array
      const getActionValue = (actions: any[] | null, actionType: string): number => {
        if (!actions || !Array.isArray(actions)) return 0;
        const action = actions.find((a: any) => a.action_type === actionType);
        return action ? parseInt(action.value || '0', 10) : 0;
      };
      
      // Aggregate action metrics across all matching insights (deduplicated by ad_id + date)
      const actionMetrics = new Map<string, { linkClicks: number; landingPageViews: number; initiateCheckouts: number; purchases: number }>();
      matchingInsights.forEach(i => {
        if (i.ad_id) {
          const key = `${i.ad_id}_${i.date_start}`;
          if (!actionMetrics.has(key)) {
            actionMetrics.set(key, {
              linkClicks: getActionValue(i.actions, 'link_click'),
              landingPageViews: getActionValue(i.actions, 'landing_page_view') || getActionValue(i.actions, 'omni_landing_page_view'),
              initiateCheckouts: getActionValue(i.actions, 'initiate_checkout') || getActionValue(i.actions, 'omni_initiated_checkout'),
              purchases: getActionValue(i.actions, 'purchase') || getActionValue(i.actions, 'omni_purchase'),
            });
          }
        }
      });
      
      // Sum all action metrics
      const linkClicks = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.linkClicks, 0);
      const landingPageViews = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.landingPageViews, 0);
      const initiateCheckouts = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.initiateCheckouts, 0);
      const purchases = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.purchases, 0);
      
      // Calculate conversion rates
      const connectRate = linkClicks > 0 ? (landingPageViews / linkClicks) * 100 : 0;
      const txPaginaCheckout = landingPageViews > 0 ? (initiateCheckouts / landingPageViews) * 100 : 0;
      const txCheckoutCompra = initiateCheckouts > 0 ? (purchases / initiateCheckouts) * 100 : 0;
      
      // Log funnel matching summary (production level)
      if (pattern) {
        console.log(`[CuboMagico] Funnel "${funnel.name}" pattern="${pattern}": ${matchingCampaigns.length} campaigns, ${matchingInsights.length} insights, R$${investimento.toFixed(2)}`);
      }

      // Get offer codes for this funnel - PRIORITIZE funnel_id (FK)
      // Only use id_funil as fallback when funnel_id is null
      const funnelOffers = offerMappings.filter(o => {
        if (o.funnel_id) {
          return o.funnel_id === funnel.id;
        }
        return o.id_funil === funnel.name;
      });
      const offerCodes = new Set(funnelOffers.map(o => o.codigo_oferta));

      // Calculate sales metrics
      const funnelSales = salesData.filter(s => offerCodes.has(s.offer_code));
      const faturamento = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      
      // Count unique customers
      const uniqueCustomers = new Set(funnelSales.map(s => s.buyer_email)).size;
      
      // Count products by position
      const productsByPosition: Record<string, number> = {};
      const positionDetails: Record<string, { vendas: number; receita: number; ordem: number; produtos: Array<{ nome_produto: string; nome_oferta: string | null; codigo_oferta: string | null }> }> = {};
      
      funnelOffers.forEach(offer => {
        const pos = offer.tipo_posicao || 'OTHER';
        const ordem = offer.ordem_posicao || 0;
        const posKey = `${pos}${ordem || ''}`;
        const offerSales = funnelSales.filter(s => s.offer_code === offer.codigo_oferta);
        const salesCount = offerSales.length;
        const salesRevenue = offerSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
        
        productsByPosition[pos] = (productsByPosition[pos] || 0) + salesCount;
        
        if (!positionDetails[posKey]) {
          positionDetails[posKey] = { vendas: 0, receita: 0, ordem, produtos: [] };
        }
        positionDetails[posKey].vendas += salesCount;
        positionDetails[posKey].receita += salesRevenue;
        positionDetails[posKey].produtos.push({
          nome_produto: offer.nome_produto,
          nome_oferta: offer.nome_oferta,
          codigo_oferta: offer.codigo_oferta
        });
      });

      // FRONT sales count
      const vendasFront = productsByPosition['FRONT'] || productsByPosition['FE'] || 0;
      const totalProdutos = Object.values(productsByPosition).reduce((sum, v) => sum + v, 0);

      // Calculate ticket médio = Faturamento Total / Vendas FRONT
      const ticketMedio = vendasFront > 0 ? faturamento / vendasFront : 0;

      // CPA máximo aceitável = Ticket médio / ROAS alvo
      const cpaMaximo = ticketMedio / roasTarget;

      // CPA real = Investimento / Vendas FRONT
      const cpaReal = vendasFront > 0 ? investimento / vendasFront : 0;

      // ROAS real
      const roas = investimento > 0 ? faturamento / investimento : 0;

      // Status based on investment, revenue and CPA comparison
      let status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive' = 'good';
      
      // Check for inactive funnel (no data)
      if (investimento === 0 && faturamento === 0) {
        status = 'inactive';
      } 
      // Check for investment with zero return (critical)
      else if (investimento > 0 && faturamento === 0) {
        status = 'no-return';
      }
      // CPA-based status for active funnels
      else if (cpaReal > 0 && cpaMaximo > 0) {
        if (cpaReal <= cpaMaximo * 0.8) {
          status = 'excellent';
        } else if (cpaReal <= cpaMaximo) {
          status = 'good';
        } else if (cpaReal <= cpaMaximo * 1.2) {
          status = 'attention';
        } else {
          status = 'danger';
        }
      }

      // Build position breakdown for drill-down
      const positionBreakdown = Object.entries(positionDetails)
        .map(([key, details]) => {
          const tipo = key.replace(/[0-9]/g, '');
          const taxaConversao = vendasFront > 0 ? (details.vendas / vendasFront) * 100 : 0;
          return {
            tipo,
            ordem: details.ordem,
            vendas: details.vendas,
            receita: details.receita,
            taxaConversao,
            produtos: details.produtos,
          };
        })
        .sort((a, b) => {
          const order = ['FRONT', 'FE', 'OB', 'US', 'DS'];
          const aIdx = order.indexOf(a.tipo);
          const bIdx = order.indexOf(b.tipo);
          if (aIdx !== bIdx) return aIdx - bIdx;
          return a.ordem - b.ordem;
        });

      return {
        funnel,
        investimento,
        faturamento,
        vendasFront,
        totalProdutos,
        ticketMedio,
        cpaMaximo,
        cpaReal,
        roas,
        status,
        productsByPosition,
        positionBreakdown,
        // New conversion metrics
        connectRate,
        txPaginaCheckout,
        txCheckoutCompra,
        linkClicks,
        landingPageViews,
        initiateCheckouts,
        purchases,
      };
    });
  }, [funnels, offerMappings, salesData, campaignsData, insightsData]);

  // Total investment from ALL ad-level insights (the real total)
  const totalInvestmentAll = useMemo(() => {
    if (!insightsData) return 0;
    // Deduplicate by ad_id + date to avoid double counting
    const uniqueSpend = new Map<string, number>();
    insightsData.forEach(i => {
      if (i.spend && i.ad_id) {
        const key = `${i.ad_id}_${i.date_start}`;
        if (!uniqueSpend.has(key)) {
          uniqueSpend.set(key, i.spend);
        }
      }
    });
    return Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
  }, [insightsData]);

  // Calculate REAL totals from all sales data (not just mapped)
  const faturamentoTotal = useMemo(() => {
    if (!salesData) return 0;
    return salesData.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
  }, [salesData]);

  const totalProdutosReal = useMemo(() => {
    return salesData?.length || 0;
  }, [salesData]);

  // Totals from funnels with campaign patterns (attributed)
  const totals = useMemo(() => {
    const attributed = funnelMetrics.reduce((acc, m) => ({
      investimento: acc.investimento + m.investimento,
      faturamento: acc.faturamento + m.faturamento,
      vendasFront: acc.vendasFront + m.vendasFront,
      totalProdutos: acc.totalProdutos + m.totalProdutos,
    }), { investimento: 0, faturamento: 0, vendasFront: 0, totalProdutos: 0 });
    
    return {
      ...attributed,
      investimentoTotal: totalInvestmentAll,
      investimentoNaoAtribuido: totalInvestmentAll - attributed.investimento,
      faturamentoTotal, // Real total from all sales
      totalProdutosReal, // Real total product count
      faturamentoNaoAtribuido: faturamentoTotal - attributed.faturamento,
    };
  }, [funnelMetrics, totalInvestmentAll, faturamentoTotal, totalProdutosReal]);

  // Helper to get offer codes for a specific funnel
  // IMPORTANT: Prioritize funnel_id (FK), use id_funil only as fallback when funnel_id is null
  const getOfferCodesForFunnel = (funnelId: string, funnelName: string): string[] => {
    if (!offerMappings) return [];
    return offerMappings
      .filter(o => {
        // If offer has funnel_id set, match by funnel_id only
        if (o.funnel_id) {
          return o.funnel_id === funnelId;
        }
        // Fallback: if funnel_id is null, match by id_funil (legacy text field)
        return o.id_funil === funnelName;
      })
      .map(o => o.codigo_oferta)
      .filter(Boolean) as string[];
  };

  // Helper to get offer options for FunnelChangelog
  // IMPORTANT: Prioritize funnel_id (FK), use id_funil only as fallback when funnel_id is null
  const getOfferOptionsForFunnel = (funnelId: string, funnelName: string) => {
    if (!offerMappings) return [];
    return offerMappings
      .filter(o => {
        if (o.funnel_id) {
          return o.funnel_id === funnelId;
        }
        return o.id_funil === funnelName;
      })
      .map(o => ({
        codigo_oferta: o.codigo_oferta || '',
        nome_oferta: o.nome_posicao || o.codigo_oferta || '',
      }))
      .filter(o => o.codigo_oferta);
  };

  // Filtered Meta data for hierarchy analysis - uses insightsData
  const getFilteredMetaData = (campaignPattern: string) => {
    if (!campaignPattern || !campaignsData || !insightsData) {
      return { campaigns: [], adsets: [], ads: [], insights: [] };
    }
    
    const pattern = campaignPattern.toLowerCase();
    const matchingCampaigns = campaignsData.filter(c => 
      c.campaign_name?.toLowerCase().includes(pattern)
    );
    // CRITICAL: Convert to strings to ensure consistent comparison
    const matchingCampaignIds = new Set(matchingCampaigns.map(c => String(c.campaign_id)));
    
    // Filter insights by matching campaigns - also convert to string
    const filteredInsights = insightsData.filter(i => 
      matchingCampaignIds.has(String(i.campaign_id || ''))
    );
    
    // Get unique ad_ids and adset_ids from filtered insights
    const insightAdIds = new Set(filteredInsights.filter(i => i.ad_id).map(i => i.ad_id));
    const insightAdsetIds = new Set(filteredInsights.filter(i => i.adset_id).map(i => i.adset_id));
    
    // Filter adsets by IDs that appear in insights (not by campaign)
    const filteredAdsets = (adsetsData || []).filter(a => 
      insightAdsetIds.has(a.adset_id)
    );
    
    // Filter ads by IDs that appear in insights (not by adset)
    const filteredAds = (adsData || []).filter(a => 
      insightAdIds.has(a.ad_id)
    );
    
    console.log(`[getFilteredMetaData] Pattern="${pattern}": ${matchingCampaigns.length} campaigns, ${filteredInsights.length} insights, ${filteredAdsets.length}/${adsetsData?.length || 0} adsets, ${filteredAds.length}/${adsData?.length || 0} ads`);
    console.log(`[getFilteredMetaData] insightAdsetIds sample:`, [...insightAdsetIds].slice(0, 3));
    console.log(`[getFilteredMetaData] adsetsData sample:`, adsetsData?.slice(0, 3)?.map(a => ({ id: a.adset_id, name: a.adset_name })));
    
    return {
      campaigns: matchingCampaigns.map(c => ({
        id: c.campaign_id,
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        status: c.status,
      })),
      adsets: filteredAdsets.map(a => ({
        id: a.adset_id,
        adset_id: a.adset_id,
        adset_name: a.adset_name,
        campaign_id: a.campaign_id,
        status: a.status,
      })),
      ads: filteredAds.map(a => ({
        id: a.ad_id,
        ad_id: a.ad_id,
        ad_name: a.ad_name,
        adset_id: a.adset_id,
        campaign_id: a.campaign_id,
        status: a.status,
        preview_url: a.preview_url || null,
      })),
      insights: filteredInsights.map(i => ({
        id: i.campaign_id || '',
        campaign_id: i.campaign_id,
        adset_id: i.adset_id,
        ad_id: i.ad_id,
        spend: i.spend,
        impressions: i.impressions,
        clicks: i.clicks,
        reach: i.reach,
        ctr: i.ctr,
        cpc: i.cpc,
        cpm: i.cpm,
        date_start: i.date_start,
        date_stop: i.date_stop,
      })),
    };
  };

  // Get filtered Meta data for UTM Analysis based on funnel's campaign pattern (primary) and linked accounts (secondary)
  // Uses the same logic as CuboMagico's funnelMetrics calculation for consistency
  const getFilteredMetaDataForFunnel = (funnelId: string, campaignPattern: string | null) => {
    if (!insightsData || !campaignsData) {
      return { insights: [], campaigns: [], adsets: [], ads: [], hasConfig: false };
    }

    let filteredInsights: typeof insightsData = [];
    let filteredCampaigns: typeof campaignsData = [];
    let hasConfig = false;

    // PRIORITY 1: Use campaign pattern (this is the proven approach that CuboMagico uses)
    if (campaignPattern) {
      hasConfig = true;
      const pattern = campaignPattern.toLowerCase();
      
      // Filter campaigns by pattern
      filteredCampaigns = campaignsData.filter(c => 
        c.campaign_name?.toLowerCase().includes(pattern)
      );
      
      // Get campaign IDs as strings for consistent comparison
      const matchingCampaignIds = new Set(filteredCampaigns.map(c => String(c.campaign_id)));
      
      // Filter insights by matching campaign IDs
      filteredInsights = insightsData.filter(i => 
        matchingCampaignIds.has(String(i.campaign_id || ''))
      );
      
      console.log(`[getFilteredMetaDataForFunnel] Funnel ${funnelId}: pattern="${pattern}", campaigns=${filteredCampaigns.length}, insights=${filteredInsights.length}`);
    } else {
      // PRIORITY 2: If no pattern, try using linked Meta accounts
      const linkedMetaAccountUuids = (funnelMetaAccounts || [])
        .filter(fma => fma.funnel_id === funnelId)
        .map(fma => fma.meta_account_id);
      
      // Map UUIDs to actual account_ids
      const linkedAccountIds = new Set(
        (metaAdAccountsWithIds || [])
          .filter(ma => linkedMetaAccountUuids.includes(ma.id))
          .map(ma => ma.account_id)
      );

      if (linkedAccountIds.size > 0) {
        hasConfig = true;
        filteredInsights = insightsData.filter(i => linkedAccountIds.has(i.ad_account_id));
        filteredCampaigns = campaignsData.filter(c => linkedAccountIds.has(c.ad_account_id));
        
        console.log(`[getFilteredMetaDataForFunnel] Funnel ${funnelId}: linkedAccounts=${linkedAccountIds.size}, insights=${filteredInsights.length}, campaigns=${filteredCampaigns.length}`);
      } else {
        console.log(`[getFilteredMetaDataForFunnel] Funnel ${funnelId}: NO CONFIG (no pattern, no linked accounts)`);
      }
    }

    // Get unique ad_ids and adset_ids from filtered insights
    const insightAdIds = new Set(filteredInsights.filter(i => i.ad_id).map(i => i.ad_id));
    const insightAdsetIds = new Set(filteredInsights.filter(i => i.adset_id).map(i => i.adset_id));

    // Filter adsets and ads
    const filteredAdsets = (adsetsData || []).filter(a => insightAdsetIds.has(a.adset_id));
    const filteredAds = (adsData || []).filter(a => insightAdIds.has(a.ad_id));

    return {
      insights: filteredInsights,
      campaigns: filteredCampaigns,
      adsets: filteredAdsets,
      ads: filteredAds,
      hasConfig,
    };
  };
  const getFormattedSalesData = (offerCodes: string[]) => {
    if (!salesData) return [];
    const offerCodesSet = new Set(offerCodes);
    return salesData
      .filter(s => offerCodesSet.has(s.offer_code || ''))
      .map(s => ({
        transaction: s.transaction_id,
        product: s.product_name,
        buyer: s.buyer_email || 'Desconhecido',
        value: s.total_price_brl || 0,
        status: s.status,
        date: s.sale_date || '',
        offerCode: s.offer_code || '',
      }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'good': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'attention': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'no-return': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'inactive': return <div className="w-5 h-5 rounded-full bg-muted-foreground/30" />;
      default: return null;
    }
  };

  const getStatusTooltip = (status: string, cpaReal?: number, cpaMaximo?: number): string => {
    const formatCPA = (value: number) => `R$ ${value.toFixed(2)}`;
    switch (status) {
      case 'excellent': 
        return cpaReal !== undefined && cpaMaximo !== undefined
          ? `Excelente: CPA Real (${formatCPA(cpaReal)}) ≤ 80% do CPA Máximo (${formatCPA(cpaMaximo * 0.8)})`
          : 'CPA Real está até 80% do CPA Máximo - Performance excelente!';
      case 'good': 
        return cpaReal !== undefined && cpaMaximo !== undefined
          ? `Bom: CPA Real (${formatCPA(cpaReal)}) ≤ CPA Máximo (${formatCPA(cpaMaximo)})`
          : 'CPA Real está dentro do CPA Máximo - Performance boa';
      case 'attention': 
        return cpaReal !== undefined && cpaMaximo !== undefined
          ? `Atenção: CPA Real (${formatCPA(cpaReal)}) está entre 100% e 120% do CPA Máximo (${formatCPA(cpaMaximo)})`
          : 'CPA Real está até 20% acima do máximo - Requer atenção';
      case 'danger': 
        return cpaReal !== undefined && cpaMaximo !== undefined
          ? `Crítico: CPA Real (${formatCPA(cpaReal)}) > 120% do CPA Máximo (${formatCPA(cpaMaximo * 1.2)})`
          : 'CPA Real está mais de 20% acima do máximo - Situação crítica';
      case 'no-return': 
        return 'Sem Retorno: O funil tem investimento em anúncios mas ainda não gerou vendas no período';
      case 'inactive': 
        return 'Inativo: Sem investimento e sem vendas no período selecionado';
      default: 
        return '';
    }
  };

  const getStatusBadge = (status: string, cpaReal?: number, cpaMaximo?: number) => {
    const tooltip = getStatusTooltip(status, cpaReal, cpaMaximo);
    const badge = (() => {
      switch (status) {
        case 'excellent': return <Badge className="bg-green-500/20 text-green-700 border-green-500/30 cursor-help">Excelente</Badge>;
        case 'good': return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 cursor-help">Bom</Badge>;
        case 'attention': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 cursor-help">Atenção</Badge>;
        case 'danger': return <Badge className="bg-red-500/20 text-red-700 border-red-500/30 cursor-help">Crítico</Badge>;
        case 'no-return': return <Badge className="bg-red-600/20 text-red-800 border-red-600/30 cursor-help">Sem Retorno</Badge>;
        case 'inactive': return <Badge className="bg-muted text-muted-foreground border-muted-foreground/30 cursor-help">Inativo</Badge>;
        default: return null;
      }
    })();

    if (!badge) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  if (loadingFunnels) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando...</span>
        </div>
      </Card>
    );
  }

  if (!funnels || funnels.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <Target className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Nenhum funil configurado</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Para usar o dashboard Cubo Mágico, configure o <strong>padrão de nome da campanha</strong> e o <strong>ROAS alvo</strong> em cada funil no menu Configurações → Funis.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dashboard Cubo Mágico</h2>
              <p className="text-sm text-muted-foreground">
                Análise de ROI por funil • {funnels.length} funis configurados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick date buttons */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setQuickDate(0)}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
                <Button variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
                <Button variant="outline" size="sm" onClick={setLastMonth}>Mês passado</Button>
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchInsights()}
                disabled={isRefetching}
              >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isMetaAdsEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  {isMetaAdsEnabled ? (
                    <Coins className="w-5 h-5 text-red-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Investimento Total
                    {!isMetaAdsEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isMetaAdsEnabled ? (
                    <>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(totals.investimentoTotal)}</p>
                      {totals.investimentoNaoAtribuido > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(totals.investimentoNaoAtribuido)} não atribuído
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isMetaAdsEnabled ? (
              <>
                <p><strong>Investimento Total:</strong> Soma de todo gasto em anúncios no período</p>
                <p className="text-xs text-muted-foreground">Inclui campanhas atribuídas e não atribuídas a funis</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isMetaAdsEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  {isMetaAdsEnabled ? (
                    <TrendingDown className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Invest. Atribuído
                    {!isMetaAdsEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isMetaAdsEnabled ? (
                    <p className="text-xl font-bold text-foreground">{formatCurrency(totals.investimento)}</p>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isMetaAdsEnabled ? (
              <>
                <p><strong>Investimento Atribuído:</strong> Gasto em campanhas vinculadas a funis</p>
                <p className="text-xs text-muted-foreground">Baseado no padrão de nome das campanhas</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isHotmartEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  {isHotmartEnabled ? (
                    <DollarSign className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Faturamento
                    {!isHotmartEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isHotmartEnabled ? (
                    <>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(totals.faturamentoTotal)}</p>
                      {totals.faturamentoNaoAtribuido > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(totals.faturamentoNaoAtribuido)} não atribuído
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isHotmartEnabled ? (
              <>
                <p><strong>Faturamento:</strong> Receita total de vendas aprovadas</p>
                <p className="text-xs text-muted-foreground">Status: approved, complete, completed</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isHotmartEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  {isHotmartEnabled ? (
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Vendas FRONT
                    {!isHotmartEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isHotmartEnabled ? (
                    <p className="text-xl font-bold text-foreground">{totals.vendasFront}</p>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isHotmartEnabled ? (
              <>
                <p><strong>Vendas FRONT:</strong> Quantidade de vendas do produto principal</p>
                <p className="text-xs text-muted-foreground">Primeira posição do funil (FE/FRONT)</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isHotmartEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  {isHotmartEnabled ? (
                    <Users className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Total Produtos
                    {!isHotmartEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isHotmartEnabled ? (
                    <>
                      <p className="text-xl font-bold text-foreground">{totals.totalProdutosReal}</p>
                      {(totals.totalProdutosReal - totals.totalProdutos) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {totals.totalProdutosReal - totals.totalProdutos} não atribuído
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isHotmartEnabled ? (
              <>
                <p><strong>Total Produtos:</strong> Soma de todas as vendas (FRONT + Order Bumps + Upsells)</p>
                <p className="text-xs text-muted-foreground">Inclui todas as posições do funil</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn("p-4 cursor-help", !isMetaAdsEnabled && "opacity-60")}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  !isMetaAdsEnabled 
                    ? "bg-muted" 
                    : totals.investimentoTotal > 0 && (totals.faturamentoTotal / totals.investimentoTotal) >= 2 
                      ? 'bg-green-500/10' 
                      : 'bg-yellow-500/10'
                )}>
                  {isMetaAdsEnabled ? (
                    <TrendingUp className={`w-5 h-5 ${totals.investimentoTotal > 0 && (totals.faturamentoTotal / totals.investimentoTotal) >= 2 ? 'text-green-500' : 'text-yellow-500'}`} />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    ROAS Geral
                    {!isMetaAdsEnabled && <Lock className="w-3 h-3" />}
                  </p>
                  {isMetaAdsEnabled ? (
                    <>
                      <p className={`text-xl font-bold ${totals.investimentoTotal > 0 && (totals.faturamentoTotal / totals.investimentoTotal) >= 2 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {totals.investimentoTotal > 0 ? (totals.faturamentoTotal / totals.investimentoTotal).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fat. Total / Invest. Total
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            {isMetaAdsEnabled ? (
              <>
                <p><strong>ROAS:</strong> Return on Ad Spend (Retorno sobre Investimento)</p>
                <p className="text-xs text-muted-foreground">Faturamento ÷ Investimento. Meta: ≥ 2x</p>
              </>
            ) : (
              <p>Módulo bloqueado. Entre em contato com o suporte para ativar.</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Funnel Table with Drill-down */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Funil</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isMetaAdsEnabled}
                  label="Investimento"
                  unlockedTooltip="Gasto em anúncios atribuído ao funil"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isHotmartEnabled}
                  label="Faturamento"
                  unlockedTooltip="Receita total de vendas aprovadas do funil"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isHotmartEnabled}
                  label="FRONT"
                  unlockedTooltip="Vendas do produto principal (primeira posição)"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isHotmartEnabled}
                  label="Ticket Médio"
                  unlockedTooltip="Faturamento ÷ Vendas FRONT"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isHotmartEnabled}
                  label="CPA Máximo"
                  unlockedTooltip="Ticket Médio ÷ ROAS Alvo. Quanto pode pagar por aquisição"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isMetaAdsEnabled}
                  label="CPA Real"
                  unlockedTooltip="Investimento ÷ Vendas FRONT. Custo real por aquisição"
                />
              </TableHead>
              <TableHead className="text-right">
                <ModuleLockedHeader
                  isLocked={!isMetaAdsEnabled}
                  label="ROAS"
                  unlockedTooltip="Faturamento ÷ Investimento. Meta: ≥ ROAS Alvo do funil"
                />
              </TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">Status</TooltipTrigger>
                  <TooltipContent>Baseado na relação CPA Real vs CPA Máximo</TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funnelMetrics.map(metrics => {
              const isExpanded = expandedFunnelId === metrics.funnel.id;
              const gradients: Record<string, string> = {
                'FRONT': 'from-blue-500 to-cyan-400',
                'FE': 'from-blue-500 to-cyan-400',
                'OB': 'from-emerald-500 to-green-400',
                'US': 'from-purple-500 to-violet-400',
                'DS': 'from-orange-500 to-amber-400',
              };
              
              return (
                <Fragment key={metrics.funnel.id}>
                  <TableRow 
                    className={cn(
                      "cursor-pointer transition-all",
                      isExpanded 
                        ? "bg-primary/5 border-l-2 border-l-primary hover:bg-primary/10" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setExpandedFunnelId(isExpanded ? null : metrics.funnel.id);
                      onFunnelSelect?.(metrics.funnel.id);
                    }}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{metrics.funnel.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {metrics.funnel.campaign_name_pattern}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <ModuleLockedValue
                        isLocked={!isMetaAdsEnabled}
                        value={formatCurrency(metrics.investimento)}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <ModuleLockedValue
                        isLocked={!isHotmartEnabled}
                        value={<span className="text-green-600">{formatCurrency(metrics.faturamento)}</span>}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ModuleLockedValue
                        isLocked={!isHotmartEnabled}
                        value={metrics.vendasFront}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <ModuleLockedValue
                        isLocked={!isHotmartEnabled}
                        value={formatCurrency(metrics.ticketMedio)}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      <ModuleLockedValue
                        isLocked={!isHotmartEnabled}
                        value={formatCurrency(metrics.cpaMaximo)}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <ModuleLockedValue
                        isLocked={!isMetaAdsEnabled}
                        value={
                          <span className={cn(
                            "font-bold",
                            metrics.status === 'excellent' && "text-green-600",
                            metrics.status === 'good' && "text-blue-600",
                            metrics.status === 'attention' && "text-yellow-600",
                            metrics.status === 'danger' && "text-red-600",
                            metrics.status === 'no-return' && "text-red-700",
                            metrics.status === 'inactive' && "text-muted-foreground"
                          )}>
                            {formatCurrency(metrics.cpaReal)}
                          </span>
                        }
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <ModuleLockedValue
                        isLocked={!isMetaAdsEnabled}
                        value={`${metrics.roas.toFixed(2)}x`}
                        variant="cell"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(metrics.status)}
                        {getStatusBadge(metrics.status, metrics.cpaReal, metrics.cpaMaximo)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Details Row with Nested Tabs */}
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={11} className="p-0">
                        <div className="p-6 animate-in slide-in-from-top-2 duration-200 bg-gradient-to-br from-primary/10 via-primary/5 to-muted/30 border-l-4 border-l-primary rounded-br-lg shadow-inner">
                          <Tabs defaultValue="overview" className="w-full">
                            <TooltipProvider>
                            <TabsList className="flex flex-wrap gap-1 h-auto p-1.5 mb-4 bg-muted/50">
                              <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <Target className="w-3 h-3" />
                                Visão Geral
                              </TabsTrigger>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <TabsTrigger 
                                      value="meta" 
                                      className={`text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md ${!isMetaAdsEnabled ? 'opacity-60' : ''}`}
                                      disabled={!isMetaAdsEnabled}
                                    >
                                      {isMetaAdsEnabled ? (
                                        <Megaphone className="w-3 h-3" />
                                      ) : (
                                        <Lock className="w-3 h-3" />
                                      )}
                                      Meta Ads
                                      {!isMetaAdsEnabled && <Lock className="w-2 h-2 ml-0.5" />}
                                    </TabsTrigger>
                                  </span>
                                </TooltipTrigger>
                                {!isMetaAdsEnabled && (
                                  <TooltipContent>
                                    <p>Módulo bloqueado. Contate o suporte.</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <TabsTrigger value="temporal" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <LineChart className="w-3 h-3" />
                                Evolução
                              </TabsTrigger>
                              <TabsTrigger value="comparison" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <GitCompare className="w-3 h-3" />
                                Comparar
                              </TabsTrigger>
                              <TabsTrigger value="utm" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <Tag className="w-3 h-3" />
                                UTM
                              </TabsTrigger>
                              <TabsTrigger value="payment" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <CreditCard className="w-3 h-3" />
                                Pagamentos
                              </TabsTrigger>
                              <TabsTrigger value="ltv" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <Coins className="w-3 h-3" />
                                LTV
                              </TabsTrigger>
                              <TabsTrigger value="changelog" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                                <History className="w-3 h-3" />
                                Histórico
                              </TabsTrigger>
                            </TabsList>
                            </TooltipProvider>

                            <TabsContent value="overview" className="mt-0">
                              {/* Funnel Score + Funnel Flow */}
                              <div className="space-y-4">
                                {/* Funnel Score Card */}
                                {(() => {
                                  // Calcular score geral do funil (0-100)
                                  const calculateFunnelScore = () => {
                                    let totalScore = 0;
                                    let totalWeight = 0;
                                    
                                    // 1. Score das posições do funil (OBs, USs, DSs) - peso 40%
                                    const ideaisConfig: Record<string, { min: number; max: number }> = {
                                      'OB1': { min: 30, max: 40 },
                                      'OB2': { min: 20, max: 30 },
                                      'OB3': { min: 10, max: 20 },
                                      'OB4': { min: 5, max: 10 },
                                      'OB5': { min: 3, max: 5 },
                                      'US1': { min: 1, max: 5 },
                                      'DS1': { min: 1, max: 3 },
                                      'US2': { min: 0.5, max: 1.5 },
                                    };
                                    
                                    let positionScore = 0;
                                    let positionCount = 0;
                                    
                                    metrics.positionBreakdown.forEach(pos => {
                                      if (pos.tipo === 'FRONT' || pos.tipo === 'FE') return;
                                      
                                      const key = `${pos.tipo}${pos.ordem || 1}`;
                                      const ideal = ideaisConfig[key];
                                      if (!ideal) return;
                                      
                                      // Score baseado em quão perto está do ideal (0-100 para cada posição)
                                      if (pos.taxaConversao >= ideal.min) {
                                        positionScore += 100; // Atingiu o ideal
                                      } else if (pos.taxaConversao >= ideal.min * 0.5) {
                                        positionScore += 50 + (pos.taxaConversao / ideal.min) * 50; // Parcial
                                      } else {
                                        positionScore += (pos.taxaConversao / ideal.min) * 50; // Abaixo
                                      }
                                      positionCount++;
                                    });
                                    
                                    if (positionCount > 0) {
                                      totalScore += (positionScore / positionCount) * 0.4;
                                      totalWeight += 0.4;
                                    }
                                    
                                    // 2. Score do Connect Rate - peso 20%
                                    if (metrics.linkClicks > 0) {
                                      let connectScore = 0;
                                      if (metrics.connectRate >= 81) connectScore = 100;
                                      else if (metrics.connectRate >= 70) connectScore = 80;
                                      else if (metrics.connectRate >= 55) connectScore = 60;
                                      else if (metrics.connectRate >= 50) connectScore = 40;
                                      else connectScore = (metrics.connectRate / 50) * 40;
                                      
                                      totalScore += connectScore * 0.2;
                                      totalWeight += 0.2;
                                    }
                                    
                                    // 3. Score TX Página→Checkout - peso 20%
                                    if (metrics.landingPageViews > 0) {
                                      let txPaginaScore = 0;
                                      if (metrics.txPaginaCheckout >= 35) txPaginaScore = 100;
                                      else if (metrics.txPaginaCheckout >= 25) txPaginaScore = 80;
                                      else if (metrics.txPaginaCheckout >= 15) txPaginaScore = 60;
                                      else txPaginaScore = (metrics.txPaginaCheckout / 15) * 60;
                                      
                                      totalScore += txPaginaScore * 0.2;
                                      totalWeight += 0.2;
                                    }
                                    
                                    // 4. Score TX Checkout→Compra - peso 20%
                                    if (metrics.initiateCheckouts > 0) {
                                      let txCheckoutScore = 0;
                                      if (metrics.txCheckoutCompra >= 50) txCheckoutScore = 100;
                                      else if (metrics.txCheckoutCompra >= 35) txCheckoutScore = 80;
                                      else if (metrics.txCheckoutCompra >= 20) txCheckoutScore = 60;
                                      else txCheckoutScore = (metrics.txCheckoutCompra / 20) * 60;
                                      
                                      totalScore += txCheckoutScore * 0.2;
                                      totalWeight += 0.2;
                                    }
                                    
                                    // Normalizar o score baseado nos pesos reais utilizados
                                    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
                                    
                                    // Determinar status e mensagem
                                    let status: 'excellent' | 'good' | 'attention' | 'danger';
                                    let statusLabel: string;
                                    let message: string;
                                    let gradient: string;
                                    
                                    if (finalScore >= 80) {
                                      status = 'excellent';
                                      statusLabel = 'Excelente';
                                      message = 'Seu funil está performando muito bem! Continue otimizando para manter esse resultado.';
                                      gradient = 'from-green-500 to-emerald-400';
                                    } else if (finalScore >= 60) {
                                      status = 'good';
                                      statusLabel = 'Bom';
                                      message = 'Bom trabalho! Há algumas oportunidades de melhoria nas posições ou conversões.';
                                      gradient = 'from-blue-500 to-cyan-400';
                                    } else if (finalScore >= 40) {
                                      status = 'attention';
                                      statusLabel = 'Atenção';
                                      message = 'Seu funil tem margem para melhorar. Foque nas métricas destacadas em amarelo e vermelho.';
                                      gradient = 'from-yellow-500 to-amber-400';
                                    } else {
                                      status = 'danger';
                                      statusLabel = 'Crítico';
                                      message = 'Seu funil precisa de atenção urgente. Revise as métricas e otimize cada etapa.';
                                      gradient = 'from-red-500 to-rose-400';
                                    }
                                    
                                    return { score: finalScore, status, statusLabel, message, gradient };
                                  };
                                  
                                  const funnelScore = calculateFunnelScore();
                                  
                                  return (
                                    <div className="mb-6">
                                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Score Geral do Funil — <span className="text-foreground">{metrics.funnel.name}</span></h4>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={cn(
                                            "relative overflow-hidden rounded-xl p-4 bg-gradient-to-br shadow-lg cursor-help",
                                            funnelScore.gradient
                                          )}>
                                            <div className="flex items-center justify-between text-white">
                                              <div className="flex items-center gap-4">
                                                <div className="relative">
                                                  <svg className="w-20 h-20 transform -rotate-90">
                                                    <circle
                                                      cx="40"
                                                      cy="40"
                                                      r="35"
                                                      stroke="rgba(255,255,255,0.2)"
                                                      strokeWidth="6"
                                                      fill="none"
                                                    />
                                                    <circle
                                                      cx="40"
                                                      cy="40"
                                                      r="35"
                                                      stroke="white"
                                                      strokeWidth="6"
                                                      fill="none"
                                                      strokeLinecap="round"
                                                      strokeDasharray={`${(funnelScore.score / 100) * 220} 220`}
                                                    />
                                                  </svg>
                                                  <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-2xl font-black">{funnelScore.score}</span>
                                                  </div>
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold">{funnelScore.statusLabel}</span>
                                                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                      {funnelScore.score}/100
                                                    </Badge>
                                                  </div>
                                                  <p className="text-sm text-white/80 max-w-md mt-1">
                                                    {funnelScore.message}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="hidden md:flex flex-col items-end text-right text-xs text-white/70 space-y-1">
                                                <span>Posições do Funil: 40%</span>
                                                <span>Connect Rate: 20%</span>
                                                <span>TX Pág→Checkout: 20%</span>
                                                <span>TX Checkout→Compra: 20%</span>
                                              </div>
                                            </div>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-[320px]">
                                          <p className="font-semibold">Como o Score é calculado?</p>
                                          <div className="mt-2 space-y-2 text-xs">
                                            <div className="flex justify-between">
                                              <span>Posições do Funil (OBs, USs, DSs):</span>
                                              <span className="font-medium">40%</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Connect Rate:</span>
                                              <span className="font-medium">20%</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>TX Página→Checkout:</span>
                                              <span className="font-medium">20%</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>TX Checkout→Compra:</span>
                                              <span className="font-medium">20%</span>
                                            </div>
                                          </div>
                                          <div className="mt-3 pt-2 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground">
                                            <p>• <strong>80-100:</strong> Excelente performance</p>
                                            <p>• <strong>60-79:</strong> Boa performance</p>
                                            <p>• <strong>40-59:</strong> Precisa de atenção</p>
                                            <p>• <strong>0-39:</strong> Situação crítica</p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  );
                                })()}
                                
                                <div>
                                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Fluxo do Funil — <span className="text-foreground">{metrics.funnel.name}</span></h4>
                                  <div className="flex flex-wrap items-stretch gap-2">
                                    {metrics.positionBreakdown.map((pos, index) => {
                                      const gradient = gradients[pos.tipo] || 'from-gray-500 to-gray-400';
                                      
                                      // Calcula potencial de aumento de receita
                                      const calcularPotencial = (taxaAtual: number, taxaIdealMin: number, ticketMedio: number, vendasFront: number) => {
                                        if (taxaAtual >= taxaIdealMin) return null;
                                        const diferenca = taxaIdealMin - taxaAtual;
                                        const vendasPotenciais = Math.round(vendasFront * (diferenca / 100));
                                        const receitaPotencial = vendasPotenciais * ticketMedio;
                                        return { diferenca, vendasPotenciais, receitaPotencial };
                                      };
                                      
                                      // Taxas ideais por posição específica (OB1, OB2, US1, etc)
                                      const getIdealInfo = (tipo: string, ordem: number, taxaAtual: number, receita: number, vendas: number) => {
                                        const ticketMedioPosicao = vendas > 0 ? receita / vendas : 0;
                                        const vendasFront = metrics.vendasFront || 1;
                                        
                                        // Métricas ideais por posição específica
                                        const ideais: Record<string, { min: number; max: number; desc: string }> = {
                                          'OB1': { min: 30, max: 40, desc: 'Order Bump 1 - primeira oferta complementar' },
                                          'OB2': { min: 20, max: 30, desc: 'Order Bump 2 - segunda oferta complementar' },
                                          'OB3': { min: 10, max: 20, desc: 'Order Bump 3 - terceira oferta complementar' },
                                          'OB4': { min: 5, max: 10, desc: 'Order Bump 4 - quarta oferta complementar' },
                                          'OB5': { min: 3, max: 5, desc: 'Order Bump 5 - quinta oferta complementar' },
                                          'US1': { min: 1, max: 5, desc: 'Upsell 1 - oferta de upgrade pós-compra' },
                                          'DS1': { min: 1, max: 3, desc: 'Downsell 1 - alternativa mais acessível' },
                                          'US2': { min: 0.5, max: 1.5, desc: 'Upsell 2 - segunda oferta de upgrade' },
                                        };
                                        
                                        const ordemNum = ordem || 1;
                                        const key = `${tipo}${ordemNum}`;
                                        const idealConfig = ideais[key];
                                        
                                        if (tipo === 'FRONT' || tipo === 'FE') {
                                          return { 
                                            ideal: '100%', 
                                            min: 100,
                                            max: 100,
                                            desc: 'Produto principal - base de cálculo para conversões',
                                            frasePositiva: 'Este é o coração do seu funil! Cada venda aqui abre portas para OBs, Upsells e mais receita.',
                                            status: 'base' as const
                                          };
                                        }
                                        
                                        if (!idealConfig) {
                                          return { 
                                            ideal: 'N/A', 
                                            min: 0,
                                            max: 100,
                                            desc: 'Posição do funil',
                                            frasePositiva: 'Continue acompanhando suas métricas!',
                                            status: 'base' as const
                                          };
                                        }
                                        
                                        const { min, max, desc } = idealConfig;
                                        const potencial = calcularPotencial(taxaAtual, min, ticketMedioPosicao, vendasFront);
                                        
                                        let status: 'success' | 'warning' | 'danger';
                                        let frasePositiva: string;
                                        
                                        if (taxaAtual >= min) {
                                          status = 'success';
                                          frasePositiva = `Excelente! Você está dentro da faixa ideal. Continue assim!`;
                                        } else {
                                          const metadeDoMin = min / 2;
                                          status = taxaAtual >= metadeDoMin ? 'warning' : 'danger';
                                          
                                          if (potencial && potencial.receitaPotencial > 0) {
                                            frasePositiva = `Há margem para melhorar! Aumentando ${potencial.diferenca.toFixed(1)}% você pode gerar +${potencial.vendasPotenciais} vendas e +${formatCurrency(potencial.receitaPotencial)} em faturamento.`;
                                          } else {
                                            frasePositiva = `Há margem para melhorar! Foque em otimizar sua oferta para alcançar a meta de ${min}%.`;
                                          }
                                        }
                                        
                                        return { 
                                          ideal: `${min}-${max}%`, 
                                          min,
                                          max,
                                          desc,
                                          frasePositiva,
                                          status
                                        };
                                      };
                                      
                                      const idealInfo = getIdealInfo(pos.tipo, pos.ordem, pos.taxaConversao, pos.receita, pos.vendas);
                                      
                                      // Determina a cor da borda baseado no status
                                      const getBorderColor = (status: 'base' | 'success' | 'warning' | 'danger') => {
                                        switch (status) {
                                          case 'success': return 'ring-2 ring-green-400 ring-offset-2 ring-offset-background';
                                          case 'warning': return 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background';
                                          case 'danger': return 'ring-2 ring-red-400 ring-offset-2 ring-offset-background';
                                          default: return '';
                                        }
                                      };
                                      
                                      return (
                                        <Fragment key={`${pos.tipo}${pos.ordem}`}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div 
                                                className={cn(
                                                  "relative overflow-hidden rounded-lg p-3 bg-gradient-to-br shadow-md min-w-[90px] flex-1 max-w-[140px] cursor-help transition-all",
                                                  gradient,
                                                  getBorderColor(idealInfo.status)
                                                )}
                                              >
                                                <div className="relative z-10 flex flex-col items-center justify-center text-white">
                                                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                    {pos.tipo}{pos.ordem || ''}
                                                  </span>
                                                  <span className="text-2xl font-black">
                                                    {pos.vendas}
                                                  </span>
                                                  <div className="flex items-center gap-1 text-[10px] font-medium opacity-90">
                                                    <Percent className="w-2.5 h-2.5" />
                                                    {pos.taxaConversao.toFixed(1)}%
                                                  </div>
                                                  <span className="text-[10px] mt-1 opacity-70">
                                                    {formatCurrency(pos.receita)}
                                                  </span>
                                                </div>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-[300px]">
                                              <p className="font-semibold">{pos.tipo}{pos.ordem || ''}</p>
                                              <p className="text-xs text-muted-foreground">{idealInfo.desc}</p>
                                              
                                              {/* Product/Offer Info */}
                                              {pos.produtos && pos.produtos.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-border/50">
                                                  <p className="text-xs text-muted-foreground mb-1">Produto(s) associado(s):</p>
                                                  <div className="space-y-1">
                                                    {pos.produtos.map((p, idx) => (
                                                      <div key={idx} className="text-xs">
                                                        <span className="font-medium text-foreground">{p.nome_produto}</span>
                                                        {p.nome_oferta && (
                                                          <span className="text-muted-foreground"> — {p.nome_oferta}</span>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                  <span>Taxa ideal:</span>
                                                  <span className="font-medium">{idealInfo.ideal}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                  <span>Taxa atual:</span>
                                                  <span className={cn(
                                                    "font-medium",
                                                    idealInfo.status === 'success' && "text-green-500",
                                                    idealInfo.status === 'warning' && "text-yellow-500",
                                                    idealInfo.status === 'danger' && "text-red-500"
                                                  )}>{pos.taxaConversao.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                  <span>Receita:</span>
                                                  <span className="font-medium">{formatCurrency(pos.receita)}</span>
                                                </div>
                                              </div>
                                              <p className={cn(
                                                "mt-2 pt-2 border-t border-border/50 text-xs italic",
                                                idealInfo.status === 'success' && "text-green-500",
                                                idealInfo.status === 'warning' && "text-yellow-500",
                                                idealInfo.status === 'danger' && "text-orange-500"
                                              )}>
                                                {idealInfo.frasePositiva}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                          
                                          {index < metrics.positionBreakdown.length - 1 && (
                                            <div className="flex items-center justify-center w-6">
                                              <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                            </div>
                                          )}
                                        </Fragment>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Lucro (Fat - Inv)</p>
                                    <p className={cn(
                                      "text-lg font-bold",
                                      metrics.faturamento - metrics.investimento > 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                      {formatCurrency(metrics.faturamento - metrics.investimento)}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Total Produtos</p>
                                    <p className="text-lg font-bold">{metrics.totalProdutos}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">ROAS Alvo</p>
                                    <p className="text-lg font-bold">{metrics.funnel.roas_target || 2}x</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Diferença CPA</p>
                                    <p className={cn(
                                      "text-lg font-bold",
                                      metrics.cpaReal <= metrics.cpaMaximo ? "text-green-600" : "text-red-600"
                                    )}>
                                      {formatCurrency(metrics.cpaMaximo - metrics.cpaReal)}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Conversion Funnel Metrics */}
                                {(() => {
                                  // Função para calcular status e mensagem do Connect Rate
                                  const getConnectRateInfo = (rate: number) => {
                                    if (rate >= 81) {
                                      return {
                                        status: 'excellent' as const,
                                        statusLabel: 'Ótimo',
                                        ideal: '81% a 100%',
                                        frasePositiva: 'Excelente! Sua página está convertendo muito bem os cliques em visitantes. Continue com esse ótimo trabalho!',
                                        borderClass: 'ring-2 ring-green-400 ring-offset-2 ring-offset-background'
                                      };
                                    } else if (rate >= 70) {
                                      return {
                                        status: 'good' as const,
                                        statusLabel: 'Bom',
                                        ideal: '70% a 80%',
                                        frasePositiva: 'Bom trabalho! Sua página está performando bem. Com pequenos ajustes você pode alcançar o nível ótimo!',
                                        borderClass: 'ring-2 ring-blue-400 ring-offset-2 ring-offset-background'
                                      };
                                    } else if (rate >= 55) {
                                      return {
                                        status: 'warning' as const,
                                        statusLabel: 'Pode melhorar',
                                        ideal: '55% a 69%',
                                        frasePositiva: 'Há oportunidade de melhoria! Otimize a velocidade de carregamento e experiência mobile para aumentar a conversão.',
                                        borderClass: 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
                                      };
                                    } else if (rate >= 50) {
                                      return {
                                        status: 'danger' as const,
                                        statusLabel: 'Precisa de ajustes',
                                        ideal: 'Abaixo de 55%',
                                        frasePositiva: 'A página precisa de atenção! Verifique velocidade de carregamento, compatibilidade mobile e se o anúncio está alinhado com a página.',
                                        borderClass: 'ring-2 ring-red-400 ring-offset-2 ring-offset-background'
                                      };
                                    } else {
                                      return {
                                        status: 'danger' as const,
                                        statusLabel: 'Crítico',
                                        ideal: 'Abaixo de 50%',
                                        frasePositiva: 'Atenção! Taxa muito baixa indica problemas na página. Priorize: velocidade, mobile-first e consistência com o anúncio.',
                                        borderClass: 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
                                      };
                                    }
                                  };
                                  
                                  const connectRateInfo = getConnectRateInfo(metrics.connectRate);
                                  
                                  return (
                                <div className="pt-4 border-t border-border/50">
                                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Funil de Conversão (Meta Ads) — <span className="text-foreground">{metrics.funnel.name}</span></h4>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Link Clicks */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center p-3 bg-blue-500/10 rounded-lg min-w-[100px] cursor-help">
                                          <span className="text-[10px] text-blue-600 font-medium uppercase">Cliques Link</span>
                                          <span className="text-xl font-bold text-blue-600">{metrics.linkClicks}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Total de cliques em links nos anúncios</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    
                                    <div className="flex flex-col items-center">
                                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                      <span className="text-[9px] text-muted-foreground">{metrics.landingPageViews}</span>
                                    </div>
                                    
                                    {/* Landing Page Views - Connect Rate with ideal metrics */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={cn(
                                          "flex flex-col items-center p-3 bg-purple-500/10 rounded-lg min-w-[100px] cursor-help transition-all",
                                          connectRateInfo.borderClass
                                        )}>
                                          <span className="text-[10px] text-purple-600 font-medium uppercase">Connect Rate</span>
                                          <span className={cn(
                                            "text-xl font-bold",
                                            connectRateInfo.status === 'excellent' && "text-green-600",
                                            connectRateInfo.status === 'good' && "text-blue-600",
                                            connectRateInfo.status === 'warning' && "text-yellow-600",
                                            connectRateInfo.status === 'danger' && "text-red-600"
                                          )}>
                                            {metrics.connectRate.toFixed(1)}%
                                          </span>
                                          <span className="text-[9px] text-purple-500">Views Página</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-[280px]">
                                        <p className="font-semibold">Connect Rate</p>
                                        <p className="text-xs text-muted-foreground">Taxa de visitantes que chegam à página após clicar no anúncio</p>
                                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span>Status:</span>
                                            <span className={cn(
                                              "font-medium",
                                              connectRateInfo.status === 'excellent' && "text-green-500",
                                              connectRateInfo.status === 'good' && "text-blue-500",
                                              connectRateInfo.status === 'warning' && "text-yellow-500",
                                              connectRateInfo.status === 'danger' && "text-red-500"
                                            )}>{connectRateInfo.statusLabel}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Taxa atual:</span>
                                            <span className="font-medium">{metrics.connectRate.toFixed(1)}%</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Views / Cliques:</span>
                                            <span className="font-medium">{metrics.landingPageViews} / {metrics.linkClicks}</span>
                                          </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground">
                                          <p>• <strong>Ótimo:</strong> 81% a 100%</p>
                                          <p>• <strong>Bom:</strong> 70% a 80%</p>
                                          <p>• <strong>Pode melhorar:</strong> 55% a 69%</p>
                                          <p>• <strong>Precisa de ajustes:</strong> abaixo de 55%</p>
                                        </div>
                                        <p className={cn(
                                          "mt-2 pt-2 border-t border-border/50 text-xs italic",
                                          connectRateInfo.status === 'excellent' && "text-green-500",
                                          connectRateInfo.status === 'good' && "text-blue-500",
                                          connectRateInfo.status === 'warning' && "text-yellow-500",
                                          connectRateInfo.status === 'danger' && "text-orange-500"
                                        )}>
                                          {connectRateInfo.frasePositiva}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                    
                                    <div className="flex flex-col items-center">
                                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                      <span className="text-[9px] text-muted-foreground">{metrics.initiateCheckouts}</span>
                                    </div>
                                    
                                    {/* Initiate Checkouts - TX Página→Checkout with ideal metrics */}
                                    {(() => {
                                      const getTxPaginaCheckoutInfo = (rate: number) => {
                                        if (rate >= 35) {
                                          return {
                                            status: 'excellent' as const,
                                            statusLabel: 'Ótimo',
                                            frasePositiva: 'Excelente! Sua página está convertendo muito bem visitantes em interessados. Continue com essa oferta irresistível!',
                                            borderClass: 'ring-2 ring-green-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else if (rate >= 25) {
                                          return {
                                            status: 'good' as const,
                                            statusLabel: 'Bom',
                                            frasePositiva: 'Bom trabalho! Sua página está performando bem. Pequenos ajustes na headline ou na oferta podem elevar ainda mais!',
                                            borderClass: 'ring-2 ring-blue-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else if (rate >= 15) {
                                          return {
                                            status: 'warning' as const,
                                            statusLabel: 'Pode melhorar',
                                            frasePositiva: 'Há oportunidade de melhoria! Teste diferentes headlines, provas sociais e escassez para aumentar o interesse.',
                                            borderClass: 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else {
                                          return {
                                            status: 'danger' as const,
                                            statusLabel: 'Precisa de ajustes',
                                            frasePositiva: 'A página precisa de atenção! Revise a clareza da oferta, benefícios e se o preço está adequado ao público.',
                                            borderClass: 'ring-2 ring-red-400 ring-offset-2 ring-offset-background'
                                          };
                                        }
                                      };
                                      
                                      const txPaginaInfo = getTxPaginaCheckoutInfo(metrics.txPaginaCheckout);
                                      
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className={cn(
                                              "flex flex-col items-center p-3 bg-orange-500/10 rounded-lg min-w-[100px] cursor-help transition-all",
                                              txPaginaInfo.borderClass
                                            )}>
                                              <span className="text-[10px] text-orange-600 font-medium uppercase">TX Pág→Ckout</span>
                                              <span className={cn(
                                                "text-xl font-bold",
                                                txPaginaInfo.status === 'excellent' && "text-green-600",
                                                txPaginaInfo.status === 'good' && "text-blue-600",
                                                txPaginaInfo.status === 'warning' && "text-yellow-600",
                                                txPaginaInfo.status === 'danger' && "text-red-600"
                                              )}>
                                                {metrics.txPaginaCheckout.toFixed(1)}%
                                              </span>
                                              <span className="text-[9px] text-orange-500">Checkouts</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="max-w-[280px]">
                                            <p className="font-semibold">TX Página→Checkout</p>
                                            <p className="text-xs text-muted-foreground">Taxa de visitantes que iniciam o checkout</p>
                                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                              <div className="flex justify-between text-xs">
                                                <span>Status:</span>
                                                <span className={cn(
                                                  "font-medium",
                                                  txPaginaInfo.status === 'excellent' && "text-green-500",
                                                  txPaginaInfo.status === 'good' && "text-blue-500",
                                                  txPaginaInfo.status === 'warning' && "text-yellow-500",
                                                  txPaginaInfo.status === 'danger' && "text-red-500"
                                                )}>{txPaginaInfo.statusLabel}</span>
                                              </div>
                                              <div className="flex justify-between text-xs">
                                                <span>Taxa atual:</span>
                                                <span className="font-medium">{metrics.txPaginaCheckout.toFixed(1)}%</span>
                                              </div>
                                              <div className="flex justify-between text-xs">
                                                <span>Views / Checkout:</span>
                                                <span className="font-medium">{metrics.landingPageViews} / {metrics.initiateCheckouts}</span>
                                              </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground">
                                              <p>• <strong>Ótimo:</strong> 35% ou mais</p>
                                              <p>• <strong>Bom:</strong> 25% a 34%</p>
                                              <p>• <strong>Pode melhorar:</strong> 15% a 24%</p>
                                              <p>• <strong>Precisa de ajustes:</strong> abaixo de 15%</p>
                                            </div>
                                            <p className={cn(
                                              "mt-2 pt-2 border-t border-border/50 text-xs italic",
                                              txPaginaInfo.status === 'excellent' && "text-green-500",
                                              txPaginaInfo.status === 'good' && "text-blue-500",
                                              txPaginaInfo.status === 'warning' && "text-yellow-500",
                                              txPaginaInfo.status === 'danger' && "text-orange-500"
                                            )}>
                                              {txPaginaInfo.frasePositiva}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })()}
                                    
                                    <div className="flex flex-col items-center">
                                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                      <span className="text-[9px] text-muted-foreground">{metrics.purchases}</span>
                                    </div>
                                    
                                    {/* Purchases - TX Checkout→Compra with ideal metrics */}
                                    {(() => {
                                      const getTxCheckoutCompraInfo = (rate: number) => {
                                        if (rate >= 50) {
                                          return {
                                            status: 'excellent' as const,
                                            statusLabel: 'Ótimo',
                                            frasePositiva: 'Excelente! Seu checkout está convertendo muito bem. A experiência de pagamento está fluida e confiável!',
                                            borderClass: 'ring-2 ring-green-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else if (rate >= 35) {
                                          return {
                                            status: 'good' as const,
                                            statusLabel: 'Bom',
                                            frasePositiva: 'Bom trabalho! Seu checkout está performando bem. Teste mais opções de pagamento e garantias para elevar!',
                                            borderClass: 'ring-2 ring-blue-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else if (rate >= 20) {
                                          return {
                                            status: 'warning' as const,
                                            statusLabel: 'Pode melhorar',
                                            frasePositiva: 'Há oportunidade de melhoria! Verifique se há fricção no checkout, ofereça mais meios de pagamento e destaque garantias.',
                                            borderClass: 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
                                          };
                                        } else {
                                          return {
                                            status: 'danger' as const,
                                            statusLabel: 'Precisa de ajustes',
                                            frasePositiva: 'O checkout precisa de atenção! Revise: preço, formas de pagamento, selos de segurança e clareza nas garantias.',
                                            borderClass: 'ring-2 ring-red-400 ring-offset-2 ring-offset-background'
                                          };
                                        }
                                      };
                                      
                                      const txCheckoutInfo = getTxCheckoutCompraInfo(metrics.txCheckoutCompra);
                                      
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className={cn(
                                              "flex flex-col items-center p-3 bg-green-500/10 rounded-lg min-w-[100px] cursor-help transition-all",
                                              txCheckoutInfo.borderClass
                                            )}>
                                              <span className="text-[10px] text-green-600 font-medium uppercase">TX Ckout→Compra</span>
                                              <span className={cn(
                                                "text-xl font-bold",
                                                txCheckoutInfo.status === 'excellent' && "text-green-600",
                                                txCheckoutInfo.status === 'good' && "text-blue-600",
                                                txCheckoutInfo.status === 'warning' && "text-yellow-600",
                                                txCheckoutInfo.status === 'danger' && "text-red-600"
                                              )}>
                                                {metrics.txCheckoutCompra.toFixed(1)}%
                                              </span>
                                              <span className="text-[9px] text-green-500">Compras</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="max-w-[280px]">
                                            <p className="font-semibold">TX Checkout→Compra</p>
                                            <p className="text-xs text-muted-foreground">Taxa de checkouts que se convertem em compras</p>
                                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                              <div className="flex justify-between text-xs">
                                                <span>Status:</span>
                                                <span className={cn(
                                                  "font-medium",
                                                  txCheckoutInfo.status === 'excellent' && "text-green-500",
                                                  txCheckoutInfo.status === 'good' && "text-blue-500",
                                                  txCheckoutInfo.status === 'warning' && "text-yellow-500",
                                                  txCheckoutInfo.status === 'danger' && "text-red-500"
                                                )}>{txCheckoutInfo.statusLabel}</span>
                                              </div>
                                              <div className="flex justify-between text-xs">
                                                <span>Taxa atual:</span>
                                                <span className="font-medium">{metrics.txCheckoutCompra.toFixed(1)}%</span>
                                              </div>
                                              <div className="flex justify-between text-xs">
                                                <span>Checkouts / Compras:</span>
                                                <span className="font-medium">{metrics.initiateCheckouts} / {metrics.purchases}</span>
                                              </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground">
                                              <p>• <strong>Ótimo:</strong> 50% ou mais</p>
                                              <p>• <strong>Bom:</strong> 35% a 49%</p>
                                              <p>• <strong>Pode melhorar:</strong> 20% a 34%</p>
                                              <p>• <strong>Precisa de ajustes:</strong> abaixo de 20%</p>
                                            </div>
                                            <p className={cn(
                                              "mt-2 pt-2 border-t border-border/50 text-xs italic",
                                              txCheckoutInfo.status === 'excellent' && "text-green-500",
                                              txCheckoutInfo.status === 'good' && "text-blue-500",
                                              txCheckoutInfo.status === 'warning' && "text-yellow-500",
                                              txCheckoutInfo.status === 'danger' && "text-orange-500"
                                            )}>
                                              {txCheckoutInfo.frasePositiva}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })()}
                                  </div>
                                </div>
                                  );
                                })()}
                              </div>
                            </TabsContent>

                            <TabsContent value="meta" className="mt-0">
                              {!isMetaAdsEnabled ? (
                                <Card className="p-8 text-center border-dashed">
                                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <Lock className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-foreground mb-1">
                                    Módulo Meta Ads Bloqueado
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Contate o suporte para ativar este recurso.
                                  </p>
                                </Card>
                              ) : (() => {
                                const metaData = getFilteredMetaData(metrics.funnel.campaign_name_pattern || '');
                                return (
                                  <MetaHierarchyAnalysis
                                    insights={metaData.insights}
                                    campaigns={metaData.campaigns}
                                    adsets={metaData.adsets}
                                    ads={metaData.ads}
                                  />
                                );
                              })()}
                            </TabsContent>

                            <TabsContent value="temporal" className="mt-0">
                              <TemporalChart
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                startDate={startDate}
                                endDate={endDate}
                              />
                            </TabsContent>

                            <TabsContent value="comparison" className="mt-0">
                              <PeriodComparison
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                startDate={startDate}
                                endDate={endDate}
                              />
                            </TabsContent>

                            <TabsContent value="utm" className="mt-0">
                              {(() => {
                                const funnelMetaData = getFilteredMetaDataForFunnel(
                                  metrics.funnel.id, 
                                  metrics.funnel.campaign_name_pattern
                                );
                                return (
                                  <UTMAnalysis
                                    salesData={salesData}
                                    funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                    metaInsights={funnelMetaData.insights}
                                    metaCampaigns={funnelMetaData.campaigns}
                                    metaAdsets={funnelMetaData.adsets}
                                    metaAds={funnelMetaData.ads}
                                    hasMetaConfig={funnelMetaData.hasConfig}
                                  />
                                );
                              })()}
                            </TabsContent>

                            <TabsContent value="payment" className="mt-0">
                              <PaymentMethodAnalysis
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                              />
                            </TabsContent>

                            <TabsContent value="ltv" className="mt-0">
                              <LTVAnalysis
                                salesData={getFormattedSalesData(getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name))}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                selectedFunnel={metrics.funnel.name}
                              />
                            </TabsContent>

                            <TabsContent value="changelog" className="mt-0">
                              <FunnelChangelog
                                selectedFunnel={metrics.funnel.name}
                                offerOptions={getOfferOptionsForFunnel(metrics.funnel.id, metrics.funnel.name)}
                              />
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3">Legenda de Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span><strong>Excelente:</strong> CPA ≤ 80% do máx</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span><strong>Bom:</strong> CPA ≤ 100% do máx</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span><strong>Atenção:</strong> CPA até 120% do máx</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span><strong>Crítico:</strong> CPA &gt; 120% do máx</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span><strong>Sem Retorno:</strong> Invest. sem vendas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
            <span><strong>Inativo:</strong> Sem dados</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong>Fórmula:</strong> CPA Máximo = Ticket Médio ÷ ROAS Alvo | CPA Real = Investimento ÷ Vendas FRONT
        </p>
      </Card>
    </div>
  );
}
