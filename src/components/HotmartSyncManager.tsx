import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, AlertCircle, Target, HelpCircle, History, Megaphone, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HotmartSyncManagerProps {
  projectId: string;
  startDate: Date;
  endDate: Date;
  onSyncComplete?: () => void;
}

interface SyncResult {
  synced: number;
  updated: number;
  errors: number;
  categoryStats: {
    funnel_ads: number;
    funnel_no_ads: number;
    unidentified_origin: number;
    other_origin: number;
  };
}

export function HotmartSyncManager({ projectId, startDate, endDate, onSyncComplete }: HotmartSyncManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncType, setSyncType] = useState<'period' | 'full'>('period');

  const handleSync = async (useFullYear: boolean = false) => {
    setSyncing(true);
    setLastSyncResult(null);
    setSyncType(useFullYear ? 'full' : 'period');

    try {
      let syncStartDate = startDate.getTime();
      let syncEndDate = endDate.getTime();

      // If full year sync requested, use last 365 days
      if (useFullYear) {
        const now = new Date();
        syncEndDate = now.getTime();
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        syncStartDate = oneYearAgo.getTime();
        toast.info('Iniciando sincronização do último ano...');
      }

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          projectId,
          action: 'sync_sales',
          startDate: syncStartDate,
          endDate: syncEndDate,
        },
      });

      if (error) throw error;

      setLastSyncResult(data);
      
      const total = data.synced + data.updated;
      toast.success(`Sincronização concluída: ${total} vendas processadas`);
      
      onSyncComplete?.();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar vendas do Hotmart');
    } finally {
      setSyncing(false);
    }
  };

  const formatDateRange = () => {
    return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'funnel_ads':
        return <Target className="w-4 h-4 text-green-500" />;
      case 'funnel_no_ads':
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case 'other_origin':
        return <Share2 className="w-4 h-4 text-purple-500" />;
      case 'unidentified_origin':
      default:
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'funnel_ads':
        return 'Funil + Ads';
      case 'funnel_no_ads':
        return 'Funil sem Ads';
      case 'other_origin':
        return 'Outras Origens';
      case 'unidentified_origin':
      default:
        return 'Origem Não Identificada';
    }
  };

  const totalSales = lastSyncResult 
    ? Object.values(lastSyncResult.categoryStats || {}).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Sincronização Hotmart</CardTitle>
            <CardDescription className="text-xs">
              Período: {formatDateRange()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={syncing}
                  size="sm"
                >
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSync(true)}>
                  <History className="w-4 h-4 mr-2" />
                  Sincronizar último ano
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              onClick={() => handleSync(false)} 
              disabled={syncing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {syncing && (
          <div className="space-y-2">
            <Progress value={undefined} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Buscando vendas da API Hotmart...
            </p>
          </div>
        )}

        {lastSyncResult && !syncing && (
          <div className="space-y-4">
            {/* Sync Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{lastSyncResult.synced} novas</span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span>{lastSyncResult.updated} atualizadas</span>
              </div>
              {lastSyncResult.errors > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{lastSyncResult.errors} erros</span>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            {totalSales > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Classificação das Vendas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lastSyncResult.categoryStats || {})
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const percentage = ((count / totalSales) * 100).toFixed(1);
                      return (
                        <div 
                          key={type} 
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(type)}
                            <span className="text-xs">{getCategoryLabel(type)}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count} ({percentage}%)
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Data Quality Indicator */}
            {totalSales > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Vendas em Funis:</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const funnelSales = (lastSyncResult.categoryStats?.funnel_ads || 0) + (lastSyncResult.categoryStats?.funnel_no_ads || 0);
                      const funnelPercentage = (funnelSales / totalSales) * 100;
                      if (funnelPercentage >= 70) {
                        return (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Ótimo ({funnelPercentage.toFixed(0)}% em funis)
                          </Badge>
                        );
                      } else if (funnelPercentage >= 40) {
                        return (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            Regular ({funnelPercentage.toFixed(0)}% em funis)
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                            Baixo ({funnelPercentage.toFixed(0)}% em funis)
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!lastSyncResult && !syncing && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Clique em "Sincronizar" para buscar as vendas do período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
