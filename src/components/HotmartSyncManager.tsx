import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Target, HelpCircle, Megaphone, Share2 } from 'lucide-react';

interface HotmartSyncManagerProps {
  projectId: string;
  startDate: Date;
  endDate: Date;
  syncResult?: SyncResult | null;
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

export function HotmartSyncManager({ projectId, startDate, endDate, syncResult }: HotmartSyncManagerProps) {
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

  // If no sync result, don't show anything
  if (!syncResult) {
    return null;
  }

  const totalSales = Object.values(syncResult.categoryStats || {}).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resultado da Sincronização Hotmart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sync Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{syncResult.synced} novas</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span>{syncResult.updated} atualizadas</span>
            </div>
            {syncResult.errors > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{syncResult.errors} erros</span>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          {totalSales > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Classificação das Vendas:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(syncResult.categoryStats || {})
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
                    const funnelSales = (syncResult.categoryStats?.funnel_ads || 0) + (syncResult.categoryStats?.funnel_no_ads || 0);
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
      </CardContent>
    </Card>
  );
}