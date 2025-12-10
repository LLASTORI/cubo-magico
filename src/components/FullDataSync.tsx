import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Facebook,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SyncStatus {
  meta: 'idle' | 'syncing' | 'completed' | 'error';
  hotmart: 'idle' | 'syncing' | 'completed' | 'error';
  metaMessage?: string;
  hotmartMessage?: string;
}

export function FullDataSync() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    meta: 'idle',
    hotmart: 'idle',
  });
  const [progress, setProgress] = useState(0);

  const projectId = currentProject?.id;

  // Different periods for each platform
  const endDate = new Date();
  
  // Meta: 13 months (API limitation for consistent data)
  const metaStartDate = subMonths(endDate, 13);
  const metaDateStartStr = format(metaStartDate, 'yyyy-MM-dd');
  const metaDateEndStr = format(endDate, 'yyyy-MM-dd');
  
  // Hotmart: 24 months (sales history is more flexible)
  const hotmartStartDate = subMonths(endDate, 24);
  const hotmartDateStartMs = hotmartStartDate.getTime();
  const hotmartDateEndMs = endDate.getTime();

  // Check if Meta is connected
  const { data: metaCredentials } = useQuery({
    queryKey: ['meta_credentials', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Check if Hotmart is connected
  const { data: hotmartCredentials } = useQuery({
    queryKey: ['hotmart_credentials', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('project_credentials')
        .select('*')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Get active Meta ad accounts
  const { data: metaAccounts } = useQuery({
    queryKey: ['meta_ad_accounts_active', projectId],
    queryFn: async () => {
      if (!projectId) return [];
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

  // Get current data stats
  const { data: dataStats, refetch: refetchStats } = useQuery({
    queryKey: ['data_stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // Count Meta insights
      const { count: metaCount } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get Meta date range
      const { data: metaDates } = await supabase
        .from('meta_insights')
        .select('date_start')
        .eq('project_id', projectId)
        .order('date_start', { ascending: true })
        .limit(1);

      const { data: metaDatesMax } = await supabase
        .from('meta_insights')
        .select('date_start')
        .eq('project_id', projectId)
        .order('date_start', { ascending: false })
        .limit(1);

      // Count Hotmart sales
      const { count: hotmartCount } = await supabase
        .from('hotmart_sales')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get Hotmart date range
      const { data: hotmartDates } = await supabase
        .from('hotmart_sales')
        .select('sale_date')
        .eq('project_id', projectId)
        .order('sale_date', { ascending: true })
        .limit(1);

      const { data: hotmartDatesMax } = await supabase
        .from('hotmart_sales')
        .select('sale_date')
        .eq('project_id', projectId)
        .order('sale_date', { ascending: false })
        .limit(1);

      return {
        metaCount: metaCount || 0,
        metaMinDate: metaDates?.[0]?.date_start,
        metaMaxDate: metaDatesMax?.[0]?.date_start,
        hotmartCount: hotmartCount || 0,
        hotmartMinDate: hotmartDates?.[0]?.sale_date,
        hotmartMaxDate: hotmartDatesMax?.[0]?.sale_date,
      };
    },
    enabled: !!projectId,
  });

  const hasMetaConnection = !!metaCredentials?.access_token;
  const hasHotmartConnection = !!(hotmartCredentials?.client_id && hotmartCredentials?.client_secret);
  const hasMetaAccounts = (metaAccounts?.length || 0) > 0;

  const handleSyncMeta = async () => {
    if (!projectId || !hasMetaAccounts) return;

    setSyncStatus(prev => ({ ...prev, meta: 'syncing', metaMessage: 'Iniciando sincronização...' }));
    setProgress(10);

    try {
      const accountIds = metaAccounts!.map(a => a.account_id);

      // First sync campaigns
      setSyncStatus(prev => ({ ...prev, metaMessage: 'Sincronizando campanhas...' }));
      setProgress(20);

      const { error: campaignError } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_campaigns',
          projectId,
          accountIds,
        },
      });

      if (campaignError) {
        console.error('Campaign sync error:', campaignError);
      }

      setSyncStatus(prev => ({ ...prev, metaMessage: 'Sincronizando insights (13 meses)...' }));
      setProgress(40);

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_insights',
          projectId,
          accountIds,
          dateStart: metaDateStartStr,
          dateStop: metaDateEndStr,
          forceRefresh: false, // Use smart sync to avoid refetching immutable data
        },
      });

      if (error) throw error;

      setSyncStatus(prev => ({ 
        ...prev, 
        meta: 'completed', 
        metaMessage: data?.message || 'Sincronização de 13 meses iniciada!' 
      }));
      setProgress(100);

      toast({
        title: 'Meta Ads',
        description: 'Sincronização de 13 meses iniciada. Os dados serão atualizados em background.',
      });

      // Refresh stats after a delay
      setTimeout(() => refetchStats(), 5000);

    } catch (error: any) {
      console.error('Meta sync error:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        meta: 'error', 
        metaMessage: error.message || 'Erro ao sincronizar' 
      }));
      toast({
        title: 'Erro Meta Ads',
        description: error.message || 'Erro ao sincronizar dados do Meta',
        variant: 'destructive',
      });
    }
  };

  const handleSyncHotmart = async () => {
    if (!projectId || !hasHotmartConnection) return;

    setSyncStatus(prev => ({ ...prev, hotmart: 'syncing', hotmartMessage: 'Iniciando sincronização...' }));
    setProgress(10);

    try {
      // Split 24 months into smaller chunks (3 months each) to avoid timeout
      const chunks: { start: number; end: number }[] = [];
      let chunkStart = new Date(hotmartStartDate);
      
      while (chunkStart < endDate) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setMonth(chunkEnd.getMonth() + 3);
        if (chunkEnd > endDate) {
          chunkEnd.setTime(endDate.getTime());
        }
        
        chunks.push({
          start: chunkStart.getTime(),
          end: chunkEnd.getTime(),
        });
        
        chunkStart = new Date(chunkEnd);
        chunkStart.setDate(chunkStart.getDate() + 1);
      }

      let totalSynced = 0;
      let totalErrors = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkProgress = 10 + ((i + 1) / chunks.length) * 80;
        
        const chunkStartDate = new Date(chunk.start);
        const chunkEndDate = new Date(chunk.end);
        
        setSyncStatus(prev => ({ 
          ...prev, 
          hotmartMessage: `Sincronizando ${format(chunkStartDate, 'MMM yyyy', { locale: ptBR })} - ${format(chunkEndDate, 'MMM yyyy', { locale: ptBR })}... (${i + 1}/${chunks.length})` 
        }));
        setProgress(chunkProgress);

        const { data, error } = await supabase.functions.invoke('hotmart-api', {
          body: {
            action: 'sync_sales',
            projectId,
            startDate: chunk.start,
            endDate: chunk.end,
          },
        });

        if (error) {
          console.error(`Hotmart chunk ${i + 1} error:`, error);
          totalErrors++;
        } else {
          totalSynced += (data?.synced || 0) + (data?.updated || 0);
        }

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setSyncStatus(prev => ({ 
        ...prev, 
        hotmart: 'completed', 
        hotmartMessage: `${totalSynced.toLocaleString()} vendas sincronizadas!` 
      }));
      setProgress(100);

      toast({
        title: 'Hotmart',
        description: `Sincronização concluída! ${totalSynced.toLocaleString()} vendas processadas.`,
      });

      // Refresh stats
      refetchStats();

    } catch (error: any) {
      console.error('Hotmart sync error:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        hotmart: 'error', 
        hotmartMessage: error.message || 'Erro ao sincronizar' 
      }));
      toast({
        title: 'Erro Hotmart',
        description: error.message || 'Erro ao sincronizar dados do Hotmart',
        variant: 'destructive',
      });
    }
  };

  const handleSyncAll = async () => {
    setProgress(0);
    
    // Sync both in sequence (to avoid overwhelming the system)
    if (hasMetaConnection && hasMetaAccounts) {
      await handleSyncMeta();
    }
    
    if (hasHotmartConnection) {
      await handleSyncHotmart();
    }
  };

  const isSyncing = syncStatus.meta === 'syncing' || syncStatus.hotmart === 'syncing';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Sincronização Completa de Dados
            </CardTitle>
            <CardDescription>
              Meta Ads: últimos 13 meses | Hotmart: últimos 24 meses
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className="text-xs">
              Meta: {format(metaStartDate, 'MMM yyyy', { locale: ptBR })} - {format(endDate, 'MMM yyyy', { locale: ptBR })}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Hotmart: {format(hotmartStartDate, 'MMM yyyy', { locale: ptBR })} - {format(endDate, 'MMM yyyy', { locale: ptBR })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar when syncing */}
        {isSyncing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {syncStatus.meta === 'syncing' ? syncStatus.metaMessage : syncStatus.hotmartMessage}
            </p>
          </div>
        )}

        {/* Data Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meta Stats */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Meta Ads</span>
              </div>
              {hasMetaConnection && hasMetaAccounts ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {!hasMetaConnection ? 'Não conectado' : 'Sem contas ativas'}
                </Badge>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registros:</span>
                <span className="font-medium">{dataStats?.metaCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">
                  {dataStats?.metaMinDate && dataStats?.metaMaxDate 
                    ? `${formatDate(dataStats.metaMinDate)} - ${formatDate(dataStats.metaMaxDate)}`
                    : 'Sem dados'
                  }
                </span>
              </div>
              {metaAccounts && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contas ativas:</span>
                  <span className="font-medium">{metaAccounts.length}</span>
                </div>
              )}
            </div>

            {syncStatus.meta !== 'idle' && (
              <div className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
                syncStatus.meta === 'completed' ? 'bg-green-500/10 text-green-600' :
                syncStatus.meta === 'error' ? 'bg-red-500/10 text-red-600' :
                'bg-blue-500/10 text-blue-600'
              }`}>
                {syncStatus.meta === 'syncing' && <Loader2 className="h-3 w-3 animate-spin" />}
                {syncStatus.meta === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                {syncStatus.meta === 'error' && <AlertCircle className="h-3 w-3" />}
                {syncStatus.metaMessage}
              </div>
            )}

            <Button 
              onClick={handleSyncMeta} 
              disabled={!hasMetaConnection || !hasMetaAccounts || isSyncing}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              {syncStatus.meta === 'syncing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Meta Ads
            </Button>
          </div>

          {/* Hotmart Stats */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Hotmart</span>
              </div>
              {hasHotmartConnection ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não conectado
                </Badge>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendas:</span>
                <span className="font-medium">{dataStats?.hotmartCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">
                  {dataStats?.hotmartMinDate && dataStats?.hotmartMaxDate 
                    ? `${formatDate(dataStats.hotmartMinDate)} - ${formatDate(dataStats.hotmartMaxDate)}`
                    : 'Sem dados'
                  }
                </span>
              </div>
            </div>

            {syncStatus.hotmart !== 'idle' && (
              <div className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
                syncStatus.hotmart === 'completed' ? 'bg-green-500/10 text-green-600' :
                syncStatus.hotmart === 'error' ? 'bg-red-500/10 text-red-600' :
                'bg-blue-500/10 text-blue-600'
              }`}>
                {syncStatus.hotmart === 'syncing' && <Loader2 className="h-3 w-3 animate-spin" />}
                {syncStatus.hotmart === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                {syncStatus.hotmart === 'error' && <AlertCircle className="h-3 w-3" />}
                {syncStatus.hotmartMessage}
              </div>
            )}

            <Button 
              onClick={handleSyncHotmart} 
              disabled={!hasHotmartConnection || isSyncing}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              {syncStatus.hotmart === 'syncing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Hotmart
            </Button>
          </div>
        </div>

        {/* Sync All Button */}
        <div className="flex flex-col items-center gap-3 pt-4 border-t">
          <Button 
            onClick={handleSyncAll}
            disabled={(!hasMetaConnection && !hasHotmartConnection) || isSyncing}
            size="lg"
            className="min-w-[200px]"
          >
            {isSyncing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-5 w-5 mr-2" />
            )}
            Sincronizar Tudo
          </Button>
          
          <p className="text-xs text-muted-foreground text-center max-w-md">
            Esta operação pode levar alguns minutos. Os dados antigos (mais de 30 dias) 
            são mantidos em cache para evitar requisições desnecessárias.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
