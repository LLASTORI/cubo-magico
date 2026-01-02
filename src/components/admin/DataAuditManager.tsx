import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Database, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuditData {
  metaInsights: any[];
  metaCampaigns: any[];
  metaAdsets: any[];
  metaAds: any[];
}

export function DataAuditManager() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Fetch all projects for super admin
  const { data: projects } = useQuery({
    queryKey: ['all-projects-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const runAudit = async () => {
    if (!selectedProjectId) {
      toast({ title: 'Selecione um projeto', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const [insightsRes, campaignsRes, adsetsRes, adsRes] = await Promise.all([
        supabase
          .from('meta_insights')
          .select('campaign_id, adset_id, ad_id, spend')
          .eq('project_id', selectedProjectId)
          .gte('date_start', startDate)
          .lte('date_stop', endDate),
        supabase
          .from('meta_campaigns')
          .select('campaign_id, name, status, updated_at')
          .eq('project_id', selectedProjectId),
        supabase
          .from('meta_adsets')
          .select('adset_id, name, status, updated_at')
          .eq('project_id', selectedProjectId),
        supabase
          .from('meta_ads')
          .select('ad_id, name, status, updated_at')
          .eq('project_id', selectedProjectId),
      ]);

      setAuditData({
        metaInsights: insightsRes.data || [],
        metaCampaigns: campaignsRes.data || [],
        metaAdsets: adsetsRes.data || [],
        metaAds: adsRes.data || [],
      });
    } catch (error: any) {
      toast({ title: 'Erro na auditoria', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async () => {
    if (!selectedProjectId) return;

    setSyncing(true);
    try {
      // Get meta credentials for the project
      const { data: creds } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', selectedProjectId)
        .maybeSingle();

      if (!creds) {
        toast({ title: 'Projeto sem credenciais Meta', variant: 'destructive' });
        return;
      }

      // Trigger full sync
      const { error } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_insights',
          projectId: selectedProjectId,
          forceRefresh: true,
        },
      });

      if (error) throw error;

      toast({ title: 'Sincronização iniciada', description: 'Aguarde alguns segundos e rode a auditoria novamente.' });
    } catch (error: any) {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Calculate audit metrics
  const calculations = auditData ? {
    campaignsWithSpendNoHierarchy: (() => {
      const insightIds = new Set(auditData.metaInsights.map(i => i.campaign_id).filter(Boolean));
      const hierarchyIds = new Set(auditData.metaCampaigns.map(c => c.campaign_id));
      return [...insightIds].filter(id => !hierarchyIds.has(id));
    })(),
    adsetsWithSpendNoHierarchy: (() => {
      const insightIds = new Set(auditData.metaInsights.map(i => i.adset_id).filter(Boolean));
      const hierarchyIds = new Set(auditData.metaAdsets.map(a => a.adset_id));
      return [...insightIds].filter(id => !hierarchyIds.has(id));
    })(),
    adsWithSpendNoHierarchy: (() => {
      const insightIds = new Set(auditData.metaInsights.map(i => i.ad_id).filter(Boolean));
      const hierarchyIds = new Set(auditData.metaAds.map(a => a.ad_id));
      return [...insightIds].filter(id => !hierarchyIds.has(id));
    })(),
    campaignStatusDist: auditData.metaCampaigns.reduce((acc, c) => {
      const status = c.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    adsetStatusDist: auditData.metaAdsets.reduce((acc, a) => {
      const status = a.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    adStatusDist: auditData.metaAds.reduce((acc, a) => {
      const status = a.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    lastCampaignUpdate: auditData.metaCampaigns.length > 0
      ? auditData.metaCampaigns.reduce((latest, c) => {
          const updated = new Date(c.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
    lastAdsetUpdate: auditData.metaAdsets.length > 0
      ? auditData.metaAdsets.reduce((latest, a) => {
          const updated = new Date(a.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
    lastAdUpdate: auditData.metaAds.length > 0
      ? auditData.metaAds.reduce((latest, a) => {
          const updated = new Date(a.updated_at || 0);
          return updated > latest ? updated : latest;
        }, new Date(0))
      : null,
  } : null;

  const hasIssues = calculations && (
    calculations.campaignsWithSpendNoHierarchy.length > 0 ||
    calculations.adsetsWithSpendNoHierarchy.length > 0 ||
    calculations.adsWithSpendNoHierarchy.length > 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Auditoria de Dados Meta</CardTitle>
              <CardDescription>Verifique a confiabilidade dos dados de qualquer projeto</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Projeto</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Início</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Fim</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={runAudit} disabled={loading || !selectedProjectId} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Rodar Auditoria
              </Button>
              {selectedProjectId && (
                <Button variant="outline" onClick={forceSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {calculations && (
        <>
          {/* Status Card */}
          <Card className={hasIssues ? 'border-amber-500' : 'border-green-500'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {hasIssues ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <CardTitle className={hasIssues ? 'text-amber-500' : 'text-green-500'}>
                  {hasIssues ? 'Problemas Encontrados' : 'Dados Confiáveis'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${calculations.campaignsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-sm text-muted-foreground">Campanhas sem Hierarquia</p>
                  <p className="text-2xl font-bold">{calculations.campaignsWithSpendNoHierarchy.length}</p>
                </div>
                <div className={`p-4 rounded-lg ${calculations.adsetsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-sm text-muted-foreground">Conjuntos sem Hierarquia</p>
                  <p className="text-2xl font-bold">{calculations.adsetsWithSpendNoHierarchy.length}</p>
                </div>
                <div className={`p-4 rounded-lg ${calculations.adsWithSpendNoHierarchy.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-sm text-muted-foreground">Anúncios sem Hierarquia</p>
                  <p className="text-2xl font-bold">{calculations.adsWithSpendNoHierarchy.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Campanhas ({auditData?.metaCampaigns.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(calculations.campaignStatusDist).map(([status, count]) => (
                      <Badge key={status} variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {status}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Conjuntos ({auditData?.metaAdsets.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(calculations.adsetStatusDist).map(([status, count]) => (
                      <Badge key={status} variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {status}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Anúncios ({auditData?.metaAds.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(calculations.adStatusDist).map(([status, count]) => (
                      <Badge key={status} variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {status}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Última Atualização da Hierarquia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Campanhas: </span>
                  <span className="font-mono">
                    {calculations.lastCampaignUpdate ? format(calculations.lastCampaignUpdate, 'dd/MM/yyyy HH:mm') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Conjuntos: </span>
                  <span className="font-mono">
                    {calculations.lastAdsetUpdate ? format(calculations.lastAdsetUpdate, 'dd/MM/yyyy HH:mm') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Anúncios: </span>
                  <span className="font-mono">
                    {calculations.lastAdUpdate ? format(calculations.lastAdUpdate, 'dd/MM/yyyy HH:mm') : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
