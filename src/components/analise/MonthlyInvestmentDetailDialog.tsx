import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Megaphone, Target, Image } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MonthlyInvestmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  month: string; // formato yyyy-MM
  monthLabel: string;
  year: number;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  adsets: AdsetSummary[];
}

interface AdsetSummary {
  adsetId: string;
  adsetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ads: AdSummary[];
}

interface AdSummary {
  adId: string;
  adName: string;
  spend: number;
  impressions: number;
  clicks: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export function MonthlyInvestmentDetailDialog({
  open,
  onOpenChange,
  projectId,
  month,
  monthLabel,
  year,
}: MonthlyInvestmentDetailDialogProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  // Parse month to get date range
  const dateRange = useMemo(() => {
    if (!month || !month.includes('-')) {
      return { start: '', end: '' };
    }
    const [yearStr, monthStr] = month.split('-');
    const yearNum = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    if (isNaN(yearNum) || isNaN(monthNum)) {
      return { start: '', end: '' };
    }
    const date = new Date(yearNum, monthNum - 1, 1);
    return {
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
    };
  }, [month]);

  // Fetch insights for this month
  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['monthly-investment-detail-insights', projectId, month],
    queryFn: async () => {
      const { data: activeAccounts } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (!activeAccounts?.length) return [];

      const accountIds = activeAccounts.map(a => a.account_id);

      let allInsights: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('*')
          .eq('project_id', projectId)
          .in('ad_account_id', accountIds)
          .gte('date_start', dateRange.start)
          .lte('date_stop', dateRange.end)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allInsights = [...allInsights, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      return allInsights;
    },
    enabled: open && !!projectId && !!month,
  });

  // Fetch campaigns metadata
  const { data: campaignsData } = useQuery({
    queryKey: ['monthly-investment-campaigns', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  // Fetch adsets metadata
  const { data: adsetsData } = useQuery({
    queryKey: ['monthly-investment-adsets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('adset_id, adset_name, campaign_id')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  // Fetch ads metadata
  const { data: adsData } = useQuery({
    queryKey: ['monthly-investment-ads', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads')
        .select('ad_id, ad_name, adset_id, campaign_id')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  // Group insights by campaign > adset > ad
  const campaignSummary = useMemo((): CampaignSummary[] => {
    if (!insightsData) return [];

    const campaignMap = new Map<string, any>();
    const adsetMap = new Map<string, any>();
    const adMap = new Map<string, any>();

    // Aggregate by campaign
    insightsData.forEach(insight => {
      const campaignId = insight.campaign_id || 'unknown';
      const adsetId = insight.adset_id || 'unknown';
      const adId = insight.ad_id || 'unknown';

      // Campaign level
      if (!campaignMap.has(campaignId)) {
        const campaignMeta = campaignsData?.find(c => c.campaign_id === campaignId);
        campaignMap.set(campaignId, {
          campaignId,
          campaignName: campaignMeta?.campaign_name || campaignId,
          spend: 0,
          impressions: 0,
          clicks: 0,
          adsetsMap: new Map(),
        });
      }
      const campaign = campaignMap.get(campaignId);
      campaign.spend += insight.spend || 0;
      campaign.impressions += insight.impressions || 0;
      campaign.clicks += insight.clicks || 0;

      // Adset level
      const adsetKey = `${campaignId}|${adsetId}`;
      if (!campaign.adsetsMap.has(adsetId)) {
        const adsetMeta = adsetsData?.find(a => a.adset_id === adsetId);
        campaign.adsetsMap.set(adsetId, {
          adsetId,
          adsetName: adsetMeta?.adset_name || adsetId,
          spend: 0,
          impressions: 0,
          clicks: 0,
          adsMap: new Map(),
        });
      }
      const adset = campaign.adsetsMap.get(adsetId);
      adset.spend += insight.spend || 0;
      adset.impressions += insight.impressions || 0;
      adset.clicks += insight.clicks || 0;

      // Ad level
      if (adId !== 'unknown') {
        if (!adset.adsMap.has(adId)) {
          const adMeta = adsData?.find(a => a.ad_id === adId);
          adset.adsMap.set(adId, {
            adId,
            adName: adMeta?.ad_name || adId,
            spend: 0,
            impressions: 0,
            clicks: 0,
          });
        }
        const ad = adset.adsMap.get(adId);
        ad.spend += insight.spend || 0;
        ad.impressions += insight.impressions || 0;
        ad.clicks += insight.clicks || 0;
      }
    });

    // Convert maps to arrays
    return Array.from(campaignMap.values())
      .map(campaign => ({
        ...campaign,
        adsets: Array.from(campaign.adsetsMap.values())
          .map((adset: any) => ({
            ...adset,
            ads: Array.from(adset.adsMap.values()).sort((a: any, b: any) => b.spend - a.spend),
          }))
          .sort((a, b) => b.spend - a.spend),
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [insightsData, campaignsData, adsetsData, adsData]);

  const totalSpend = useMemo(() => {
    return campaignSummary.reduce((sum, c) => sum + c.spend, 0);
  }, [campaignSummary]);

  const totalImpressions = useMemo(() => {
    return campaignSummary.reduce((sum, c) => sum + c.impressions, 0);
  }, [campaignSummary]);

  const totalClicks = useMemo(() => {
    return campaignSummary.reduce((sum, c) => sum + c.clicks, 0);
  }, [campaignSummary]);

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const toggleAdset = (adsetKey: string) => {
    setExpandedAdsets(prev => {
      const next = new Set(prev);
      if (next.has(adsetKey)) {
        next.delete(adsetKey);
      } else {
        next.add(adsetKey);
      }
      return next;
    });
  };

  const isLoading = loadingInsights;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
            Detalhamento de Investimento - {monthLabel} de {year}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaignSummary.length > 0 ? (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Investimento Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalSpend)}</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Impressões</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{formatNumber(totalImpressions)}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Cliques</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(totalClicks)}</p>
              </div>
            </div>

            {/* Hierarchy view */}
            <div className="overflow-auto flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50%]">Campanha / Conjunto / Anúncio</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignSummary.map((campaign) => (
                    <>
                      {/* Campaign Row */}
                      <TableRow 
                        key={campaign.campaignId} 
                        className="hover:bg-muted/30 cursor-pointer bg-muted/20"
                        onClick={() => toggleCampaign(campaign.campaignId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expandedCampaigns.has(campaign.campaignId) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Megaphone className="h-4 w-4 text-blue-400" />
                            <span className="font-medium truncate max-w-[300px]">
                              {campaign.campaignName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {campaign.adsets.length} conjuntos
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-400">
                          {formatCurrency(campaign.spend)}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                        <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalSpend > 0 ? ((campaign.spend / totalSpend) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>

                      {/* Adset Rows */}
                      {expandedCampaigns.has(campaign.campaignId) && campaign.adsets.map((adset) => (
                        <>
                          <TableRow 
                            key={`${campaign.campaignId}-${adset.adsetId}`}
                            className="hover:bg-muted/20 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAdset(`${campaign.campaignId}|${adset.adsetId}`);
                            }}
                          >
                            <TableCell className="pl-10">
                              <div className="flex items-center gap-2">
                                {adset.ads.length > 0 ? (
                                  expandedAdsets.has(`${campaign.campaignId}|${adset.adsetId}`) ? (
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  )
                                ) : (
                                  <span className="w-3" />
                                )}
                                <Target className="h-3 w-3 text-purple-400" />
                                <span className="text-sm truncate max-w-[280px]">
                                  {adset.adsetName}
                                </span>
                                {adset.ads.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {adset.ads.length} anúncios
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-blue-400">
                              {formatCurrency(adset.spend)}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatNumber(adset.impressions)}</TableCell>
                            <TableCell className="text-right text-sm">{formatNumber(adset.clicks)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {totalSpend > 0 ? ((adset.spend / totalSpend) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>

                          {/* Ad Rows */}
                          {expandedAdsets.has(`${campaign.campaignId}|${adset.adsetId}`) && adset.ads.map((ad) => (
                            <TableRow 
                              key={`${campaign.campaignId}-${adset.adsetId}-${ad.adId}`}
                              className="hover:bg-muted/10"
                            >
                              <TableCell className="pl-16">
                                <div className="flex items-center gap-2">
                                  <Image className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                                    {ad.adName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs text-blue-400/80">
                                {formatCurrency(ad.spend)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {formatNumber(ad.impressions)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {formatNumber(ad.clicks)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {totalSpend > 0 ? ((ad.spend / totalSpend) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum investimento registrado neste mês</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
