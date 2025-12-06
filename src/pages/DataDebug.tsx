import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface RawData {
  metaInsights: any[];
  metaCampaigns: any[];
  metaAdsets: any[];
  metaAds: any[];
  hotmartSales: any[];
  funnels: any[];
  offerMappings: any[];
  funnelMetaAccounts: any[];
}

export default function DataDebug() {
  const { currentProject } = useProject();
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    if (!currentProject?.id) {
      setError("Nenhum projeto selecionado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("=== INICIANDO DEBUG DE DADOS ===");
      console.log("Project ID:", currentProject.id);
      console.log("Data Início:", startDate);
      console.log("Data Fim:", endDate);

      // 1. Buscar Meta Insights
      const { data: metaInsights, error: insightsError } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('project_id', currentProject.id)
        .gte('date_start', startDate)
        .lte('date_stop', endDate);

      if (insightsError) console.error("Erro meta_insights:", insightsError);
      console.log("Meta Insights encontrados:", metaInsights?.length || 0);

      // 2. Buscar Meta Campaigns
      const { data: metaCampaigns, error: campaignsError } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('project_id', currentProject.id);

      if (campaignsError) console.error("Erro meta_campaigns:", campaignsError);
      console.log("Meta Campaigns encontradas:", metaCampaigns?.length || 0);

      // 3. Buscar Meta Adsets
      const { data: metaAdsets, error: adsetsError } = await supabase
        .from('meta_adsets')
        .select('*')
        .eq('project_id', currentProject.id);

      if (adsetsError) console.error("Erro meta_adsets:", adsetsError);
      console.log("Meta Adsets encontrados:", metaAdsets?.length || 0);

      // 4. Buscar Meta Ads
      const { data: metaAds, error: adsError } = await supabase
        .from('meta_ads')
        .select('*')
        .eq('project_id', currentProject.id);

      if (adsError) console.error("Erro meta_ads:", adsError);
      console.log("Meta Ads encontrados:", metaAds?.length || 0);

      // 5. Buscar Hotmart Sales
      const { data: hotmartSales, error: salesError } = await supabase
        .from('hotmart_sales')
        .select('*')
        .eq('project_id', currentProject.id)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate + 'T23:59:59');

      if (salesError) console.error("Erro hotmart_sales:", salesError);
      console.log("Hotmart Sales encontradas:", hotmartSales?.length || 0);

      // 6. Buscar Funnels
      const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('*')
        .eq('project_id', currentProject.id);

      if (funnelsError) console.error("Erro funnels:", funnelsError);
      console.log("Funnels encontrados:", funnels?.length || 0);

      // 7. Buscar Offer Mappings
      const { data: offerMappings, error: mappingsError } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', currentProject.id);

      if (mappingsError) console.error("Erro offer_mappings:", mappingsError);
      console.log("Offer Mappings encontrados:", offerMappings?.length || 0);

      // 8. Buscar Funnel Meta Accounts
      const { data: funnelMetaAccounts, error: fmaError } = await supabase
        .from('funnel_meta_accounts')
        .select('*')
        .eq('project_id', currentProject.id);

      if (fmaError) console.error("Erro funnel_meta_accounts:", fmaError);
      console.log("Funnel Meta Accounts encontrados:", funnelMetaAccounts?.length || 0);

      setRawData({
        metaInsights: metaInsights || [],
        metaCampaigns: metaCampaigns || [],
        metaAdsets: metaAdsets || [],
        metaAds: metaAds || [],
        hotmartSales: hotmartSales || [],
        funnels: funnels || [],
        offerMappings: offerMappings || [],
        funnelMetaAccounts: funnelMetaAccounts || [],
      });

      console.log("=== DEBUG COMPLETO ===");
    } catch (err) {
      console.error("Erro geral:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Cálculos derivados
  const calculations = rawData ? {
    // Meta totals
    totalSpend: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.spend) || 0), 0),
    totalImpressions: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.impressions) || 0), 0),
    totalClicks: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0),
    totalReach: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.reach) || 0), 0),
    
    // Unique campaign IDs in insights
    uniqueCampaignIds: [...new Set(rawData.metaInsights.map(i => i.campaign_id).filter(Boolean))],
    uniqueAdsetIds: [...new Set(rawData.metaInsights.map(i => i.adset_id).filter(Boolean))],
    uniqueAdIds: [...new Set(rawData.metaInsights.map(i => i.ad_id).filter(Boolean))],
    
    // Hotmart totals
    approvedSales: rawData.hotmartSales.filter(s => s.status === 'APPROVED' || s.status === 'COMPLETE'),
    totalRevenue: rawData.hotmartSales
      .filter(s => s.status === 'APPROVED' || s.status === 'COMPLETE')
      .reduce((sum, s) => sum + (Number(s.total_price_brl) || Number(s.total_price) || 0), 0),
    
    // Sales by status
    salesByStatus: rawData.hotmartSales.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    
    // Insights by level
    insightsByCampaign: rawData.metaInsights.filter(i => i.campaign_id && !i.adset_id && !i.ad_id),
    insightsByAdset: rawData.metaInsights.filter(i => i.adset_id && !i.ad_id),
    insightsByAd: rawData.metaInsights.filter(i => i.ad_id),
    insightsAccountLevel: rawData.metaInsights.filter(i => !i.campaign_id && !i.adset_id && !i.ad_id),
  } : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Debug de Dados</h1>
          <a href="/funnel-analysis" className="text-primary hover:underline">
            Voltar para Análise
          </a>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground">Data Início</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Fim</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchAllData} disabled={loading}>
              {loading ? "Carregando..." : "Buscar Dados"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {rawData && calculations && (
          <>
            {/* Contagens Brutas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meta Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{rawData.metaInsights.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meta Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{rawData.metaCampaigns.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meta Adsets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{rawData.metaAdsets.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meta Ads</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{rawData.metaAds.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Insights por Nível */}
            <Card>
              <CardHeader>
                <CardTitle>Meta Insights por Nível</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Account Level</p>
                  <p className="text-xl font-bold">{calculations.insightsAccountLevel.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Campaign Level</p>
                  <p className="text-xl font-bold">{calculations.insightsByCampaign.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Adset Level</p>
                  <p className="text-xl font-bold">{calculations.insightsByAdset.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Ad Level</p>
                  <p className="text-xl font-bold">{calculations.insightsByAd.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Totais Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Totais Meta (Soma de TODOS os Insights)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-xl font-bold text-blue-500">
                    R$ {calculations.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Impressions</p>
                  <p className="text-xl font-bold text-green-500">
                    {calculations.totalImpressions.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-xl font-bold text-purple-500">
                    {calculations.totalClicks.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Reach</p>
                  <p className="text-xl font-bold text-orange-500">
                    {calculations.totalReach.toLocaleString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cálculos Corretos - Apenas Campaign Level */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-primary">⚠️ Cálculo Correto (Apenas Campaign Level)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Spend (Campaign)</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {calculations.insightsByCampaign.reduce((sum, i) => sum + (Number(i.spend) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Impressions (Campaign)</p>
                  <p className="text-xl font-bold text-primary">
                    {calculations.insightsByCampaign.reduce((sum, i) => sum + (Number(i.impressions) || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Clicks (Campaign)</p>
                  <p className="text-xl font-bold text-primary">
                    {calculations.insightsByCampaign.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Reach (Campaign)</p>
                  <p className="text-xl font-bold text-primary">
                    {calculations.insightsByCampaign.reduce((sum, i) => sum + (Number(i.reach) || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Hotmart */}
            <Card>
              <CardHeader>
                <CardTitle>Hotmart Sales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-xl font-bold text-green-500">{rawData.hotmartSales.length}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Vendas Aprovadas</p>
                    <p className="text-xl font-bold text-green-500">{calculations.approvedSales.length}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-xl font-bold text-green-500">
                      R$ {calculations.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Vendas por Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(calculations.salesByStatus).map(([status, count]) => (
                      <span key={status} className="px-3 py-1 bg-muted rounded-full text-sm">
                        {status}: {String(count)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuração */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Funnels</p>
                  <p className="text-xl font-bold">{rawData.funnels.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Offer Mappings</p>
                  <p className="text-xl font-bold">{rawData.offerMappings.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Funnel Meta Accounts</p>
                  <p className="text-xl font-bold">{rawData.funnelMetaAccounts.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* IDs únicos */}
            <Card>
              <CardHeader>
                <CardTitle>IDs Únicos nos Insights</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign IDs</p>
                  <p className="text-xl font-bold">{calculations.uniqueCampaignIds.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adset IDs</p>
                  <p className="text-xl font-bold">{calculations.uniqueAdsetIds.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ad IDs</p>
                  <p className="text-xl font-bold">{calculations.uniqueAdIds.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Amostra de dados brutos */}
            <Card>
              <CardHeader>
                <CardTitle>Amostra de Meta Insights (primeiros 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-96 bg-muted p-4 rounded-lg">
                  {JSON.stringify(rawData.metaInsights.slice(0, 5), null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
