import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, AlertCircle, TrendingUp, Users, Target, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  attributionStats: {
    paid_tracked: number;
    paid_untracked: number;
    organic_funnel: number;
    organic_pure: number;
    unknown: number;
  };
}

export function HotmartSyncManager({ projectId, startDate, endDate, onSyncComplete }: HotmartSyncManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setLastSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          projectId,
          action: 'sync_sales',
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
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

  const getAttributionIcon = (type: string) => {
    switch (type) {
      case 'paid_tracked':
        return <Target className="w-4 h-4 text-green-500" />;
      case 'paid_untracked':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'organic_pure':
        return <Leaf className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAttributionLabel = (type: string) => {
    switch (type) {
      case 'paid_tracked':
        return 'Paga Rastreada';
      case 'paid_untracked':
        return 'Paga Não-Rastreada';
      case 'organic_funnel':
        return 'Orgânica de Funil';
      case 'organic_pure':
        return 'Orgânica Pura';
      default:
        return 'Desconhecido';
    }
  };

  const totalSales = lastSyncResult 
    ? Object.values(lastSyncResult.attributionStats).reduce((a, b) => a + b, 0)
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
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
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

            {/* Attribution Breakdown */}
            {totalSales > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Classificação das Vendas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lastSyncResult.attributionStats)
                    .filter(([_, count]) => count > 0)
                    .map(([type, count]) => {
                      const percentage = ((count / totalSales) * 100).toFixed(1);
                      return (
                        <div 
                          key={type} 
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {getAttributionIcon(type)}
                            <span className="text-xs">{getAttributionLabel(type)}</span>
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
                  <span className="text-xs text-muted-foreground">Qualidade do Rastreamento:</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const trackedPercentage = (lastSyncResult.attributionStats.paid_tracked / totalSales) * 100;
                      if (trackedPercentage >= 70) {
                        return (
                          <>
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Ótimo ({trackedPercentage.toFixed(0)}% rastreado)
                            </Badge>
                          </>
                        );
                      } else if (trackedPercentage >= 40) {
                        return (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            Regular ({trackedPercentage.toFixed(0)}% rastreado)
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                            Baixo ({trackedPercentage.toFixed(0)}% rastreado)
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
