import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CubeLoader } from "@/components/CubeLoader";
import { ArrowLeft } from "lucide-react";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentProject } = useProject();
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Check authorization: super_admin OR project owner
  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if super_admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'super_admin') {
        setIsAuthorized(true);
        return;
      }

      // Check if project owner
      if (currentProject) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', currentProject.id)
          .single();

        if (projectData?.user_id === user.id) {
          setIsAuthorized(true);
          return;
        }
      }

      // Not authorized
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/projects');
    };

    checkAuth();
  }, [user, currentProject, navigate, toast]);

  if (isAuthorized === null) {
    return <CubeLoader message="Verificando permissões..." />;
  }

  if (!isAuthorized) {
    return null;
  }

  // Function to fetch all data - defined inside component to access state
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
      const startTimestamp = `${startDate}T03:00:00.000Z`;
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndDate = endDateObj.toISOString().split('T')[0];
      const endTimestamp = `${adjustedEndDate}T02:59:59.999Z`;
      
      const { data: hotmartSales, error: salesError } = await supabase
        .from('hotmart_sales')
        .select('*')
        .eq('project_id', currentProject.id)
        .gte('sale_date', startTimestamp)
        .lte('sale_date', endTimestamp);

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
    totalSpend: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.spend) || 0), 0),
    totalImpressions: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.impressions) || 0), 0),
    totalClicks: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0),
    totalReach: rawData.metaInsights.reduce((sum, i) => sum + (Number(i.reach) || 0), 0),
    uniqueCampaignIds: [...new Set(rawData.metaInsights.map(i => i.campaign_id).filter(Boolean))],
    uniqueAdsetIds: [...new Set(rawData.metaInsights.map(i => i.adset_id).filter(Boolean))],
    uniqueAdIds: [...new Set(rawData.metaInsights.map(i => i.ad_id).filter(Boolean))],
    insightsByCampaign: rawData.metaInsights.filter(i => i.campaign_id && !i.adset_id && !i.ad_id),
    insightsByAdset: rawData.metaInsights.filter(i => i.adset_id && !i.ad_id),
    insightsByAd: rawData.metaInsights.filter(i => i.ad_id),
    insightsAccountLevel: rawData.metaInsights.filter(i => !i.campaign_id && !i.adset_id && !i.ad_id),
    spendByCampaign: rawData.metaInsights.reduce((acc, i) => {
      if (!i.campaign_id) return acc;
      acc[i.campaign_id] = (acc[i.campaign_id] || 0) + (Number(i.spend) || 0);
      return acc;
    }, {} as Record<string, number>),
    spendByAdset: rawData.metaInsights.reduce((acc, i) => {
      if (!i.adset_id) return acc;
      acc[i.adset_id] = (acc[i.adset_id] || 0) + (Number(i.spend) || 0);
      return acc;
    }, {} as Record<string, number>),
    approvedSales: rawData.hotmartSales.filter(s => s.status === 'APPROVED' || s.status === 'COMPLETE'),
    totalRevenue: rawData.hotmartSales
      .filter(s => s.status === 'APPROVED' || s.status === 'COMPLETE')
      .reduce((sum, s) => sum + (Number(s.total_price_brl) || Number(s.total_price) || 0), 0),
    salesByStatus: rawData.hotmartSales.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    campaignsWithSpendNoHierarchy: (() => {
      const insightCampaignIds = new Set(rawData.metaInsights.map(i => i.campaign_id).filter(Boolean));
      const hierarchyCampaignIds = new Set(rawData.metaCampaigns.map(c => c.campaign_id));
      return [...insightCampaignIds].filter(id => !hierarchyCampaignIds.has(id));
    })(),
    adsetsWithSpendNoHierarchy: (() => {
      const insightAdsetIds = new Set(rawData.metaInsights.map(i => i.adset_id).filter(Boolean));
      const hierarchyAdsetIds = new Set(rawData.metaAdsets.map(a => a.adset_id));
      return [...insightAdsetIds].filter(id => !hierarchyAdsetIds.has(id));
    })(),
    adsWithSpendNoHierarchy: (() => {
      const insightAdIds = new Set(rawData.metaInsights.map(i => i.ad_id).filter(Boolean));
      const hierarchyAdIds = new Set(rawData.metaAds.map(a => a.ad_id));
      return [...insightAdIds].filter(id => !hierarchyAdIds.has(id));
    })(),
    campaignStatusDistribution: rawData.metaCampaigns.reduce((acc, c) => {
      const status = c.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    adsetStatusDistribution: rawData.metaAdsets.reduce((acc, a) => {
      const status = a.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    adStatusDistribution: rawData.metaAds.reduce((acc, a) => {
      const status = a.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    lastCampaignUpdate: rawData.metaCampaigns.length > 0 
      ? rawData.metaCampaigns.reduce((latest, c) => {
          const updated = new Date(c.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
    lastAdsetUpdate: rawData.metaAdsets.length > 0
      ? rawData.metaAdsets.reduce((latest, a) => {
          const updated = new Date(a.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
    lastAdUpdate: rawData.metaAds.length > 0
      ? rawData.metaAds.reduce((latest, a) => {
          const updated = new Date(a.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
  } : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Debug de Dados</h1>
          </div>
          <span className="text-muted-foreground">
            Projeto: <span className="font-medium text-foreground">{currentProject?.name || 'N/A'}</span>
          </span>
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

            {/* AUDITORIA DE CONFIABILIDADE META */}
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-orange-500">🔍 Auditoria de Confiabilidade Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hierarquia incompleta */}
                <div>
                  <h4 className="font-medium mb-2">Itens com Spend mas sem Hierarquia (Status "Desconhecido")</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-lg ${calculations.campaignsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground">Campanhas</p>
                      <p className="text-xl font-bold">{calculations.campaignsWithSpendNoHierarchy.length}</p>
                      {calculations.campaignsWithSpendNoHierarchy.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Sincronize para corrigir</p>
                      )}
                    </div>
                    <div className={`p-4 rounded-lg ${calculations.adsetsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground">Conjuntos</p>
                      <p className="text-xl font-bold">{calculations.adsetsWithSpendNoHierarchy.length}</p>
                      {calculations.adsetsWithSpendNoHierarchy.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Sincronize para corrigir</p>
                      )}
                    </div>
                    <div className={`p-4 rounded-lg ${calculations.adsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground">Anúncios</p>
                      <p className="text-xl font-bold">{calculations.adsWithSpendNoHierarchy.length}</p>
                      {calculations.adsWithSpendNoHierarchy.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Sincronize para corrigir</p>
                      )}
                    </div>
                  </div>
                  
                  {(calculations.campaignsWithSpendNoHierarchy.length === 0 && 
                    calculations.adsetsWithSpendNoHierarchy.length === 0 && 
                    calculations.adsWithSpendNoHierarchy.length === 0) && (
                    <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <p className="text-green-600 text-sm">✓ Hierarquia completa! Todos os itens com spend têm status definido.</p>
                    </div>
                  )}
                </div>

                {/* Distribuição de Status */}
                <div>
                  <h4 className="font-medium mb-2">Distribuição de Status na Hierarquia</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Campanhas</p>
                      <div className="space-y-1">
                        {Object.entries(calculations.campaignStatusDistribution).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className={status === 'ACTIVE' ? 'text-green-500' : status === 'PAUSED' ? 'text-yellow-500' : 'text-gray-500'}>
                              {status === 'ACTIVE' ? 'Ativo' : status === 'PAUSED' ? 'Inativo' : status}
                            </span>
                            <span className="font-mono">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Conjuntos</p>
                      <div className="space-y-1">
                        {Object.entries(calculations.adsetStatusDistribution).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className={status === 'ACTIVE' ? 'text-green-500' : status === 'PAUSED' ? 'text-yellow-500' : 'text-gray-500'}>
                              {status === 'ACTIVE' ? 'Ativo' : status === 'PAUSED' ? 'Inativo' : status}
                            </span>
                            <span className="font-mono">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Anúncios</p>
                      <div className="space-y-1">
                        {Object.entries(calculations.adStatusDistribution).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className={status === 'ACTIVE' ? 'text-green-500' : status === 'PAUSED' ? 'text-yellow-500' : 'text-gray-500'}>
                              {status === 'ACTIVE' ? 'Ativo' : status === 'PAUSED' ? 'Inativo' : status}
                            </span>
                            <span className="font-mono">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Última atualização */}
                <div>
                  <h4 className="font-medium mb-2">Última Atualização da Hierarquia</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Campanhas</p>
                      <p className="text-sm font-mono">
                        {calculations.lastCampaignUpdate 
                          ? calculations.lastCampaignUpdate.toLocaleString('pt-BR')
                          : 'Nunca'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Conjuntos</p>
                      <p className="text-sm font-mono">
                        {calculations.lastAdsetUpdate 
                          ? calculations.lastAdsetUpdate.toLocaleString('pt-BR')
                          : 'Nunca'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Anúncios</p>
                      <p className="text-sm font-mono">
                        {calculations.lastAdUpdate 
                          ? calculations.lastAdUpdate.toLocaleString('pt-BR')
                          : 'Nunca'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validação da Estrutura - Apenas Ad Level */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-primary">✅ Validação da Estrutura (Apenas Ad Level)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${calculations.insightsAccountLevel.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className="text-sm text-muted-foreground">Account Level</p>
                    <p className="text-xl font-bold">{calculations.insightsAccountLevel.length}</p>
                    <p className="text-xs">{calculations.insightsAccountLevel.length === 0 ? '✓ OK' : '⚠️ Deveria ser 0'}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${calculations.insightsByCampaign.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className="text-sm text-muted-foreground">Campaign Level</p>
                    <p className="text-xl font-bold">{calculations.insightsByCampaign.length}</p>
                    <p className="text-xs">{calculations.insightsByCampaign.length === 0 ? '✓ OK' : '⚠️ Deveria ser 0'}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${calculations.insightsByAdset.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className="text-sm text-muted-foreground">Adset Level</p>
                    <p className="text-xl font-bold">{calculations.insightsByAdset.length}</p>
                    <p className="text-xs">{calculations.insightsByAdset.length === 0 ? '✓ OK' : '⚠️ Deveria ser 0'}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${calculations.insightsByAd.length > 0 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    <p className="text-sm text-muted-foreground">Ad Level</p>
                    <p className="text-xl font-bold">{calculations.insightsByAd.length}</p>
                    <p className="text-xs">{calculations.insightsByAd.length > 0 ? '✓ OK - Dados granulares' : '⚠️ Sem dados'}</p>
                  </div>
                </div>
                
                {calculations.insightsByCampaign.length === 0 && 
                 calculations.insightsByAdset.length === 0 && 
                 calculations.insightsByAd.length > 0 && (
                  <div className="p-4 bg-green-500/20 rounded-lg border border-green-500">
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      ✓ Estrutura correta! Todos os {calculations.insightsByAd.length} insights são de nível Ad.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totais Meta - Ad Level (sem duplicação) */}
            <Card>
              <CardHeader>
                <CardTitle>Totais Meta (Soma de Todos os Ads)</CardTitle>
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

            {/* Agregação por Campaign (derivada dos ads) */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Agregação por Campaign (derivada dos Ads)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {Object.entries(calculations.spendByCampaign)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([campaignId, spend]) => {
                      const campaign = rawData.metaCampaigns.find(c => c.campaign_id === campaignId);
                      return (
                        <div key={campaignId} className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground truncate" title={campaign?.campaign_name || campaignId}>
                            {campaign?.campaign_name || campaignId}
                          </p>
                          <p className="text-sm font-bold">
                            R$ {(spend as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Mostrando top 10 de {Object.keys(calculations.spendByCampaign).length} campaigns
                </p>
              </CardContent>
            </Card>

            {/* Agregação por Adset (derivada dos ads) */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Agregação por Adset (derivada dos Ads)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {Object.entries(calculations.spendByAdset)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([adsetId, spend]) => {
                      const adset = rawData.metaAdsets.find(a => a.adset_id === adsetId);
                      return (
                        <div key={adsetId} className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground truncate" title={adset?.adset_name || adsetId}>
                            {adset?.adset_name || adsetId}
                          </p>
                          <p className="text-sm font-bold">
                            R$ {(spend as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Mostrando top 10 de {Object.keys(calculations.spendByAdset).length} adsets
                </p>
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
