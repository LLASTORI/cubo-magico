import { useState, useMemo } from "react";
import { Target, Megaphone, Layers, ChevronRight, Home, GitBranch, Image, Globe, FileText, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface SaleData {
  offer_code?: string | null;
  total_price_brl?: number | null;
  checkout_origin?: string | null;
}

interface MetaInsight {
  id?: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  spend: number | null;
  date_start?: string;
}

interface MetaCampaign {
  campaign_id: string;
  campaign_name?: string | null;
  status: string | null;
}

interface MetaAdset {
  adset_id: string;
  adset_name?: string | null;
  status: string | null;
}

interface MetaAd {
  ad_id: string;
  ad_name?: string | null;
  status: string | null;
}

// Parsed UTM structure from checkout_origin
// Format: Origem|Conjunto|Campanha|Posicionamento|Criativo|Pagina
interface ParsedUTM {
  source: string;      // Origem de Checkout (e.g., "Meta-Ads")
  adset: string;       // Conjunto (e.g., "00_ADVANTAGE_6845240173892")
  campaign: string;    // Campanha (e.g., "PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292")
  placement: string;   // Posicionamento (e.g., "Instagram_Reels")
  creative: string;    // Criativo (e.g., "VENDA_VIDEO_02_MAKE_13_MINUTOS_6845240176092")
  page: string;        // Página (e.g., "page_name=hm-make-pratica-2")
  // Extracted Meta IDs from UTM names
  adsetId: string | null;
  campaignId: string | null;
  adId: string | null;
}

interface UTMAnalysisProps {
  salesData: SaleData[];
  funnelOfferCodes: string[];
  metaInsights?: MetaInsight[];
  metaCampaigns?: MetaCampaign[];
  metaAdsets?: MetaAdset[];
  metaAds?: MetaAd[];
  hasMetaConfig?: boolean; // Whether the funnel has Meta configuration (pattern or linked accounts)
}

interface UTMMetrics {
  name: string;
  sales: number;
  revenue: number;
  avgTicket: number;
  percentage: number;
  spend: number;
  roas: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'MIXED' | null;
}

interface DrilldownPath {
  source?: string;
  campaign?: string;
  adset?: string;
  placement?: string;
  creative?: string;
  page?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(197, 71%, 52%)',
  'hsl(339, 82%, 51%)',
  'hsl(48, 96%, 53%)',
  'hsl(174, 72%, 40%)',
];

const chartConfig = {
  sales: { label: "Produtos Vendidos", color: "hsl(var(--primary))" },
  revenue: { label: "Receita", color: "hsl(142, 76%, 36%)" },
  spend: { label: "Investimento", color: "hsl(339, 82%, 51%)" },
};

// Hierarchy: Source > Campaign > Adset > Creative > Placement > Page
const HIERARCHY = ['source', 'campaign', 'adset', 'creative', 'placement', 'page'] as const;
type HierarchyLevel = typeof HIERARCHY[number];

const LEVEL_CONFIG: Record<HierarchyLevel, { label: string; icon: any }> = {
  source: { label: 'Origem', icon: Globe },
  campaign: { label: 'Campanha', icon: Megaphone },
  adset: { label: 'Conjunto', icon: Layers },
  placement: { label: 'Posicionamento', icon: Target },
  creative: { label: 'Criativo', icon: Image },
  page: { label: 'Página', icon: FileText },
};

// Extract Meta ID from UTM name (ID is always the last part after underscore with digits)
const extractMetaId = (utmName: string): string | null => {
  if (!utmName) return null;
  // Match the last sequence of digits at the end of the string
  const match = utmName.match(/_(\d{10,})$/);
  return match ? match[1] : null;
};

// Parse checkout_origin into structured UTM data
const parseCheckoutOrigin = (checkoutOrigin: string | null | undefined): ParsedUTM => {
  const empty: ParsedUTM = {
    source: '',
    adset: '',
    campaign: '',
    placement: '',
    creative: '',
    page: '',
    adsetId: null,
    campaignId: null,
    adId: null,
  };

  if (!checkoutOrigin) return empty;

  const parts = checkoutOrigin.split('|');
  
  const adset = parts[1] || '';
  const campaign = parts[2] || '';
  const creative = parts[4] || '';
  
  return {
    source: parts[0] || '',
    adset,
    campaign,
    placement: parts[3] || '',
    creative,
    page: parts[5] || '',
    // Extract Meta IDs from UTM names
    adsetId: extractMetaId(adset),
    campaignId: extractMetaId(campaign),
    adId: extractMetaId(creative),
  };
};

const UTMAnalysis = ({ salesData, funnelOfferCodes, metaInsights = [], metaCampaigns = [], metaAdsets = [], metaAds = [], hasMetaConfig = true }: UTMAnalysisProps) => {
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath>({});

  // Build spend lookup maps from meta insights
  const spendMaps = useMemo(() => {
    const byCampaign = new Map<string, number>();
    const byAdset = new Map<string, number>();
    const byAd = new Map<string, number>();
    
    metaInsights.forEach(insight => {
      if (insight.campaign_id) {
        byCampaign.set(insight.campaign_id, (byCampaign.get(insight.campaign_id) || 0) + (insight.spend || 0));
      }
      if (insight.adset_id) {
        byAdset.set(insight.adset_id, (byAdset.get(insight.adset_id) || 0) + (insight.spend || 0));
      }
      if (insight.ad_id) {
        byAd.set(insight.ad_id, (byAd.get(insight.ad_id) || 0) + (insight.spend || 0));
      }
    });
    
    return { byCampaign, byAdset, byAd };
  }, [metaInsights]);

  // Build name lookup maps
  const nameMaps = useMemo(() => {
    const byCampaign = new Map<string, string>();
    const byAdset = new Map<string, string>();
    const byAd = new Map<string, string>();
    
    metaCampaigns.forEach(c => {
      if (c.campaign_name) byCampaign.set(c.campaign_id, c.campaign_name);
    });
    metaAdsets.forEach(a => {
      if (a.adset_name) byAdset.set(a.adset_id, a.adset_name);
    });
    metaAds.forEach(a => {
      if (a.ad_name) byAd.set(a.ad_id, a.ad_name);
    });
    
    return { byCampaign, byAdset, byAd };
  }, [metaCampaigns, metaAdsets, metaAds]);

  // Build status lookup maps
  const statusMaps = useMemo(() => {
    const byCampaign = new Map<string, string>();
    const byAdset = new Map<string, string>();
    const byAd = new Map<string, string>();
    
    metaCampaigns.forEach(c => byCampaign.set(c.campaign_id, c.status || 'PAUSED'));
    metaAdsets.forEach(a => byAdset.set(a.adset_id, a.status || 'PAUSED'));
    metaAds.forEach(a => byAd.set(a.ad_id, a.status || 'PAUSED'));
    
    return { byCampaign, byAdset, byAd };
  }, [metaCampaigns, metaAdsets, metaAds]);

  // Filter sales by funnel offer codes and parse checkout_origin
  const filteredSales = useMemo(() => {
    return salesData
      .filter(sale => funnelOfferCodes.includes(sale.offer_code || ''))
      .map(sale => ({
        ...sale,
        parsedUTM: parseCheckoutOrigin(sale.checkout_origin),
      }));
  }, [salesData, funnelOfferCodes]);

  const currentLevel = useMemo(() => {
    if (!drilldownPath.source) return 0;
    if (!drilldownPath.campaign) return 1;
    if (!drilldownPath.adset) return 2;
    if (!drilldownPath.placement) return 3;
    if (!drilldownPath.creative) return 4;
    if (!drilldownPath.page) return 5;
    return 6;
  }, [drilldownPath]);

  const currentField: HierarchyLevel = HIERARCHY[Math.min(currentLevel, HIERARCHY.length - 1)];

  // Get the value for a given field from a parsed sale
  const getFieldValue = (parsedUTM: ParsedUTM, field: HierarchyLevel): string => {
    return parsedUTM[field] || '';
  };

  // Get display name for a field value
  const getDisplayName = (value: string): string => {
    if (!value) return '(não definido)';
    return value;
  };

  // Get spend for a UTM value based on the field type
  const getSpendForUTM = (field: HierarchyLevel, utmValue: string, salesWithUTM: typeof filteredSales): number => {
    // For campaign, adset, creative - we can extract IDs and look up spend
    const ids = new Set<string>();
    
    salesWithUTM.forEach(sale => {
      const parsedUTM = sale.parsedUTM;
      if (field === 'campaign' && parsedUTM.campaignId) {
        ids.add(parsedUTM.campaignId);
      } else if (field === 'adset' && parsedUTM.adsetId) {
        ids.add(parsedUTM.adsetId);
      } else if (field === 'creative' && parsedUTM.adId) {
        ids.add(parsedUTM.adId);
      }
    });
    
    let totalSpend = 0;
    ids.forEach(id => {
      if (field === 'campaign') {
        totalSpend += spendMaps.byCampaign.get(id) || 0;
      } else if (field === 'adset') {
        totalSpend += spendMaps.byAdset.get(id) || 0;
      } else if (field === 'creative') {
        totalSpend += spendMaps.byAd.get(id) || 0;
      }
    });
    
    return totalSpend;
  };

  // Get status for a UTM value based on the field type
  const getStatusForUTM = (field: HierarchyLevel, salesWithUTM: typeof filteredSales): 'ACTIVE' | 'PAUSED' | 'MIXED' | null => {
    const ids = new Set<string>();
    
    salesWithUTM.forEach(sale => {
      const parsedUTM = sale.parsedUTM;
      if (field === 'campaign' && parsedUTM.campaignId) {
        ids.add(parsedUTM.campaignId);
      } else if (field === 'adset' && parsedUTM.adsetId) {
        ids.add(parsedUTM.adsetId);
      } else if (field === 'creative' && parsedUTM.adId) {
        ids.add(parsedUTM.adId);
      }
    });
    
    if (ids.size === 0) return null;
    
    const statuses = new Set<string>();
    ids.forEach(id => {
      let status: string | undefined;
      if (field === 'campaign') {
        status = statusMaps.byCampaign.get(id);
      } else if (field === 'adset') {
        status = statusMaps.byAdset.get(id);
      } else if (field === 'creative') {
        status = statusMaps.byAd.get(id);
      }
      if (status) statuses.add(status);
    });
    
    if (statuses.size === 0) return null;
    if (statuses.size > 1) return 'MIXED';
    return statuses.has('ACTIVE') ? 'ACTIVE' : 'PAUSED';
  };

  // Analysis for individual tabs (no drilldown filtering)
  // Now includes Meta items WITHOUT sales but WITH spend
  const analyzeUTM = useMemo(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    const totalSpend = metaInsights.reduce((sum, i) => sum + (i.spend || 0), 0);

    // Group sales by UTM field
    const groupSalesByField = (field: HierarchyLevel) => {
      const groups: Record<string, { sales: number; revenue: number; metaId: string | null }> = {};
      
      filteredSales.forEach(sale => {
        const value = getFieldValue(sale.parsedUTM, field);
        const displayName = getDisplayName(value);
        const valueInBRL = sale.total_price_brl || 0;
        
        // Get Meta ID for this sale at the given field level
        let metaId: string | null = null;
        if (field === 'campaign') metaId = sale.parsedUTM.campaignId;
        else if (field === 'adset') metaId = sale.parsedUTM.adsetId;
        else if (field === 'creative') metaId = sale.parsedUTM.adId;
        
        if (!groups[displayName]) {
          groups[displayName] = { sales: 0, revenue: 0, metaId };
        }
        groups[displayName].sales += 1;
        groups[displayName].revenue += valueInBRL;
        // Keep first valid metaId
        if (metaId && !groups[displayName].metaId) {
          groups[displayName].metaId = metaId;
        }
      });
      
      return groups;
    };

    // Analyze by field including Meta items without sales
    const analyzeByField = (field: HierarchyLevel): UTMMetrics[] => {
      const salesGroups = groupSalesByField(field);
      const result: UTMMetrics[] = [];
      const processedMetaIds = new Set<string>();

      // First, add items that have sales
      Object.entries(salesGroups).forEach(([name, data]) => {
        let spend = 0;
        let status: 'ACTIVE' | 'PAUSED' | 'MIXED' | null = null;
        
        if (data.metaId) {
          processedMetaIds.add(data.metaId);
          if (field === 'campaign') {
            spend = spendMaps.byCampaign.get(data.metaId) || 0;
            status = (statusMaps.byCampaign.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          } else if (field === 'adset') {
            spend = spendMaps.byAdset.get(data.metaId) || 0;
            status = (statusMaps.byAdset.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          } else if (field === 'creative') {
            spend = spendMaps.byAd.get(data.metaId) || 0;
            status = (statusMaps.byAd.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          }
        }

        const roas = spend > 0 ? data.revenue / spend : (data.sales > 0 ? null : 0);
        
        result.push({
          name,
          sales: data.sales,
          revenue: data.revenue,
          avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
          percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
          spend,
          roas,
          status,
        });
      });

      // For campaign, adset, creative: add Meta items with spend but NO sales
      if (field === 'campaign' || field === 'adset' || field === 'creative') {
        const spendMap = field === 'campaign' ? spendMaps.byCampaign : 
                         field === 'adset' ? spendMaps.byAdset : spendMaps.byAd;
        const statusMap = field === 'campaign' ? statusMaps.byCampaign : 
                          field === 'adset' ? statusMaps.byAdset : statusMaps.byAd;
        const nameMap = field === 'campaign' ? nameMaps.byCampaign : 
                        field === 'adset' ? nameMaps.byAdset : nameMaps.byAd;
        
        spendMap.forEach((spend, metaId) => {
          if (!processedMetaIds.has(metaId) && spend > 0) {
            const displayName = nameMap.get(metaId) || metaId;
            const status = (statusMap.get(metaId) as 'ACTIVE' | 'PAUSED') || null;
            
            result.push({
              name: displayName,
              sales: 0,
              revenue: 0,
              avgTicket: 0,
              percentage: 0,
              spend,
              roas: 0, // Zero ROAS for items with spend but no sales
              status,
            });
          }
        });
      }

      // Sort by spend (descending) to highlight where money is going
      return result.sort((a, b) => b.spend - a.spend || b.revenue - a.revenue);
    };

    // For source, placement, page - keep original logic (sales-based only)
    const analyzeByFieldSalesOnly = (field: HierarchyLevel): UTMMetrics[] => {
      const groups: Record<string, { sales: number; revenue: number; salesData: typeof filteredSales }> = {};
      
      filteredSales.forEach(sale => {
        const value = getFieldValue(sale.parsedUTM, field);
        const displayName = getDisplayName(value);
        const valueInBRL = sale.total_price_brl || 0;
        
        if (!groups[displayName]) {
          groups[displayName] = { sales: 0, revenue: 0, salesData: [] };
        }
        groups[displayName].sales += 1;
        groups[displayName].revenue += valueInBRL;
        groups[displayName].salesData.push(sale);
      });

      return Object.entries(groups)
        .map(([name, data]) => {
          const spend = getSpendForUTM(field, name, data.salesData);
          const roas = spend > 0 ? data.revenue / spend : null;
          const status = getStatusForUTM(field, data.salesData);
          
          return {
            name,
            sales: data.sales,
            revenue: data.revenue,
            avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
            percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
            spend,
            roas,
            status,
          };
        })
        .sort((a, b) => b.spend - a.spend || b.revenue - a.revenue);
    };

    return {
      source: analyzeByFieldSalesOnly('source'),
      campaign: analyzeByField('campaign'),
      adset: analyzeByField('adset'),
      placement: analyzeByFieldSalesOnly('placement'),
      creative: analyzeByField('creative'),
      page: analyzeByFieldSalesOnly('page'),
      totalSales,
      totalRevenue,
      totalSpend,
    };
  }, [filteredSales, spendMaps, statusMaps, nameMaps, metaInsights]);

  // Analysis with drilldown filtering applied - also includes Meta items without sales
  const drilldownData = useMemo(() => {
    let filtered = [...filteredSales];
    
    // Filter by drilldown path
    if (drilldownPath.source) {
      filtered = filtered.filter(s => s.parsedUTM.source === drilldownPath.source);
    }
    if (drilldownPath.campaign) {
      filtered = filtered.filter(s => s.parsedUTM.campaign === drilldownPath.campaign);
    }
    if (drilldownPath.adset) {
      filtered = filtered.filter(s => s.parsedUTM.adset === drilldownPath.adset);
    }
    if (drilldownPath.placement) {
      filtered = filtered.filter(s => s.parsedUTM.placement === drilldownPath.placement);
    }
    if (drilldownPath.creative) {
      filtered = filtered.filter(s => s.parsedUTM.creative === drilldownPath.creative);
    }
    if (drilldownPath.page) {
      filtered = filtered.filter(s => s.parsedUTM.page === drilldownPath.page);
    }

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    const processedMetaIds = new Set<string>();

    const groups: Record<string, { sales: number; revenue: number; metaId: string | null }> = {};
    
    filtered.forEach(sale => {
      const value = getFieldValue(sale.parsedUTM, currentField);
      const displayName = getDisplayName(value);
      const valueInBRL = sale.total_price_brl || 0;
      
      let metaId: string | null = null;
      if (currentField === 'campaign') metaId = sale.parsedUTM.campaignId;
      else if (currentField === 'adset') metaId = sale.parsedUTM.adsetId;
      else if (currentField === 'creative') metaId = sale.parsedUTM.adId;
      
      if (!groups[displayName]) {
        groups[displayName] = { sales: 0, revenue: 0, metaId };
      }
      groups[displayName].sales += 1;
      groups[displayName].revenue += valueInBRL;
      if (metaId && !groups[displayName].metaId) {
        groups[displayName].metaId = metaId;
      }
    });

    const metrics: UTMMetrics[] = Object.entries(groups)
      .map(([name, data]) => {
        let spend = 0;
        let status: 'ACTIVE' | 'PAUSED' | 'MIXED' | null = null;
        
        if (data.metaId) {
          processedMetaIds.add(data.metaId);
          if (currentField === 'campaign') {
            spend = spendMaps.byCampaign.get(data.metaId) || 0;
            status = (statusMaps.byCampaign.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          } else if (currentField === 'adset') {
            spend = spendMaps.byAdset.get(data.metaId) || 0;
            status = (statusMaps.byAdset.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          } else if (currentField === 'creative') {
            spend = spendMaps.byAd.get(data.metaId) || 0;
            status = (statusMaps.byAd.get(data.metaId) as 'ACTIVE' | 'PAUSED') || null;
          }
        }
        
        const roas = spend > 0 ? data.revenue / spend : (data.sales > 0 ? null : 0);
        
        return {
          name,
          sales: data.sales,
          revenue: data.revenue,
          avgTicket: data.sales > 0 ? data.revenue / data.sales : 0,
          percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
          spend,
          roas,
          status,
        };
      });

    // For campaign, adset, creative in drilldown: add items with spend but no sales
    if (currentField === 'campaign' || currentField === 'adset' || currentField === 'creative') {
      const spendMap = currentField === 'campaign' ? spendMaps.byCampaign : 
                       currentField === 'adset' ? spendMaps.byAdset : spendMaps.byAd;
      const statusMap = currentField === 'campaign' ? statusMaps.byCampaign : 
                        currentField === 'adset' ? statusMaps.byAdset : statusMaps.byAd;
      const nameMap = currentField === 'campaign' ? nameMaps.byCampaign : 
                      currentField === 'adset' ? nameMaps.byAdset : nameMaps.byAd;
      
      spendMap.forEach((spend, metaId) => {
        if (!processedMetaIds.has(metaId) && spend > 0) {
          const displayName = nameMap.get(metaId) || metaId;
          const status = (statusMap.get(metaId) as 'ACTIVE' | 'PAUSED') || null;
          
          metrics.push({
            name: displayName,
            sales: 0,
            revenue: 0,
            avgTicket: 0,
            percentage: 0,
            spend,
            roas: 0,
            status,
          });
        }
      });
    }

    // Sort by spend descending
    metrics.sort((a, b) => b.spend - a.spend || b.revenue - a.revenue);

    return { metrics, totalSales, totalRevenue };
  }, [filteredSales, drilldownPath, currentField, spendMaps, statusMaps, nameMaps]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDrilldown = (metric: UTMMetrics) => {
    if (metric.name === '(não definido)') return; // Can't drill down on undefined
    
    const newPath = { ...drilldownPath };
    if (currentLevel === 0) newPath.source = metric.name;
    else if (currentLevel === 1) newPath.campaign = metric.name;
    else if (currentLevel === 2) newPath.adset = metric.name;
    else if (currentLevel === 3) newPath.placement = metric.name;
    else if (currentLevel === 4) newPath.creative = metric.name;
    else if (currentLevel === 5) newPath.page = metric.name;
    setDrilldownPath(newPath);
  };

  const goBack = () => {
    const newPath = { ...drilldownPath };
    if (currentLevel === 6) delete newPath.page;
    else if (currentLevel === 5) delete newPath.creative;
    else if (currentLevel === 4) delete newPath.placement;
    else if (currentLevel === 3) delete newPath.adset;
    else if (currentLevel === 2) delete newPath.campaign;
    else if (currentLevel === 1) delete newPath.source;
    setDrilldownPath(newPath);
  };

  const resetDrilldown = () => {
    setDrilldownPath({});
  };

  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <Button 
        key="home" 
        variant="ghost" 
        size="sm" 
        onClick={resetDrilldown}
        className="px-2"
      >
        <Home className="w-4 h-4" />
      </Button>
    );

    const pathItems: { key: keyof DrilldownPath; value: string | undefined }[] = [
      { key: 'source', value: drilldownPath.source },
      { key: 'campaign', value: drilldownPath.campaign },
      { key: 'adset', value: drilldownPath.adset },
      { key: 'placement', value: drilldownPath.placement },
      { key: 'creative', value: drilldownPath.creative },
      { key: 'page', value: drilldownPath.page },
    ];

    pathItems.forEach((item, index) => {
      if (item.value) {
        items.push(<ChevronRight key={`sep-${index}`} className="w-4 h-4 text-muted-foreground" />);
        
        // Build the path up to this point for the click handler
        const pathUpToHere: DrilldownPath = {};
        for (let i = 0; i <= index; i++) {
          const key = pathItems[i].key;
          if (pathItems[i].value) {
            pathUpToHere[key] = pathItems[i].value;
          }
        }
        
        items.push(
          <Badge 
            key={item.key} 
            variant="secondary" 
            className="cursor-pointer truncate max-w-[120px]" 
            onClick={() => setDrilldownPath(pathUpToHere)}
            title={item.value}
          >
            {item.value}
          </Badge>
        );
      }
    });

    return <div className="flex items-center gap-1 flex-wrap">{items}</div>;
  };

  const renderMetricsTable = (metrics: UTMMetrics[], showDrilldown = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead className="text-right">Status</TableHead>
          <TableHead className="text-right">Invest.</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">ROAS</TableHead>
          <TableHead className="text-right">Vendas</TableHead>
          <TableHead className="text-right">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.slice(0, 15).map((metric, idx) => (
          <TableRow 
            key={`${metric.name}-${idx}`} 
            className={`${showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' ? "cursor-pointer hover:bg-muted/50" : ""} ${metric.sales === 0 && metric.spend > 0 ? "bg-red-500/5" : ""}`}
            onClick={() => showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' && handleDrilldown(metric)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: metric.sales === 0 && metric.spend > 0 ? 'hsl(var(--destructive))' : COLORS[idx % COLORS.length] }}
                />
                <span className="truncate max-w-[180px]" title={metric.name}>{metric.name}</span>
                {showDrilldown && currentLevel < HIERARCHY.length && metric.name !== '(não definido)' && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {metric.status ? (
                <Badge 
                  variant={metric.status === 'ACTIVE' ? "default" : metric.status === 'MIXED' ? "secondary" : "outline"}
                  className={metric.status === 'ACTIVE' ? "bg-green-500/20 text-green-600 border-green-500/30" : metric.status === 'PAUSED' ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" : ""}
                >
                  {metric.status === 'ACTIVE' ? 'Ativo' : metric.status === 'PAUSED' ? 'Inativo' : 'Misto'}
                </Badge>
              ) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <span className={metric.spend > 0 && metric.sales === 0 ? "text-red-500 font-medium" : ""}>
                {metric.spend > 0 ? formatCurrency(metric.spend) : '-'}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className={metric.sales === 0 && metric.spend > 0 ? "text-red-500" : ""}>
                {formatCurrency(metric.revenue)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              {metric.roas !== null ? (
                <Badge variant={metric.roas >= 1 ? "default" : "destructive"} className="font-mono">
                  {metric.roas.toFixed(2)}x
                </Badge>
              ) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <span className={metric.sales === 0 && metric.spend > 0 ? "text-red-500" : ""}>
                {metric.sales}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{metric.percentage.toFixed(1)}%</span>
                <Progress value={metric.percentage} className="w-12 h-2" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderPieChart = (metrics: UTMMetrics[]) => (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <PieChart>
        <Pie
          data={metrics.slice(0, 8)}
          dataKey="sales"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percentage }) => `${(name as string).substring(0, 15)}: ${percentage.toFixed(1)}%`}
        >
          {metrics.slice(0, 8).map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );

  const generalRoas = analyzeUTM.totalSpend > 0 ? analyzeUTM.totalRevenue / analyzeUTM.totalSpend : null;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Análise de UTMs</h3>
        <p className="text-sm text-muted-foreground">Origem, Campanha, Conjunto, Criativo, Posicionamento e Página das vendas</p>
      </div>

      {/* Alert when no Meta config */}
      {!hasMetaConfig && (
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            Este funil não possui padrão de campanha ou contas Meta vinculadas configurados. 
            Configure nas opções do funil para visualizar dados de investimento e ROAS.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards - Order: Investimento, Receita, Vendas, ROAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Investimento Total</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(analyzeUTM.totalSpend)}</p>
        </Card>
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Receita Total</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(analyzeUTM.totalRevenue)}</p>
        </Card>
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Vendas</span>
          </div>
          <p className="text-2xl font-bold">{analyzeUTM.totalSales}</p>
        </Card>
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>ROAS Geral</span>
          </div>
          <p className={`text-2xl font-bold ${generalRoas !== null && generalRoas >= 1 ? 'text-green-500' : 'text-red-500'}`}>
            {generalRoas !== null ? `${generalRoas.toFixed(2)}x` : '-'}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="drilldown" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="drilldown" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Drill-down
          </TabsTrigger>
          <TabsTrigger value="source">Origem</TabsTrigger>
          <TabsTrigger value="campaign">Campanha</TabsTrigger>
          <TabsTrigger value="adset">Conjunto</TabsTrigger>
          <TabsTrigger value="creative">Criativo</TabsTrigger>
          <TabsTrigger value="placement">Posicionamento</TabsTrigger>
          <TabsTrigger value="page">Página</TabsTrigger>
        </TabsList>

        <TabsContent value="drilldown">
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between">
              {renderBreadcrumb()}
              {currentLevel > 0 && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  Voltar
                </Button>
              )}
            </div>

            {/* Current Level Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const Icon = LEVEL_CONFIG[currentField].icon;
                return (
                  <>
                    <Icon className="w-4 h-4" />
                    <span>Navegando por: {LEVEL_CONFIG[currentField].label}</span>
                  </>
                );
              })()}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Distribuição</h4>
                {renderPieChart(drilldownData.metrics)}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-4">Detalhamento - {LEVEL_CONFIG[currentField].label}</h4>
                {renderMetricsTable(drilldownData.metrics, true)}
              </Card>
            </div>
          </div>
        </TabsContent>

        {HIERARCHY.map(field => (
          <TabsContent key={field} value={field}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Distribuição por {LEVEL_CONFIG[field].label}</h4>
                {renderPieChart(analyzeUTM[field])}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-4">Detalhamento - {LEVEL_CONFIG[field].label}</h4>
                {renderMetricsTable(analyzeUTM[field])}
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
};

export default UTMAnalysis;
