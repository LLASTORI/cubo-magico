import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Users, TrendingUp, RefreshCcw, ShoppingBag, Clock, Target } from 'lucide-react';
import { SegmentInsights } from '@/hooks/useCRMContactJourney';

interface ContactSegmentInsightsProps {
  insights: SegmentInsights | null | undefined;
  isLoading: boolean;
  contactLTV: number;
  contactPurchases: number;
}

export function ContactSegmentInsights({ 
  insights, 
  isLoading, 
  contactLTV, 
  contactPurchases 
}: ContactSegmentInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Comparar o cliente com a média do segmento
  const ltvComparison = insights.averageLTV > 0 
    ? ((contactLTV / insights.averageLTV) * 100 - 100).toFixed(0)
    : 0;
  const purchasesComparison = insights.averagePurchases > 0
    ? ((contactPurchases / insights.averagePurchases) * 100 - 100).toFixed(0)
    : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Insights do Segmento</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2">
          Comparação com <Badge variant="secondary" className="font-mono">{insights.segmentName}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tamanho do segmento */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Clientes no segmento:</span>
          </div>
          <span className="font-medium">{insights.totalCustomers}</span>
        </div>

        <Separator />

        {/* LTV Médio */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">LTV médio:</span>
            </div>
            <span className="font-medium">{formatCurrency(insights.averageLTV)}</span>
          </div>
          {contactLTV > 0 && (
            <div className="text-xs text-right">
              <span className="text-muted-foreground">Este cliente: </span>
              <span className={Number(ltvComparison) >= 0 ? 'text-green-600' : 'text-red-500'}>
                {Number(ltvComparison) >= 0 ? '+' : ''}{ltvComparison}% {Number(ltvComparison) >= 0 ? 'acima' : 'abaixo'}
              </span>
            </div>
          )}
        </div>

        {/* Taxa de Recompra */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Taxa de recompra:</span>
          </div>
          <Badge variant={insights.repurchaseRate >= 30 ? 'default' : 'secondary'}>
            {insights.repurchaseRate.toFixed(1)}%
          </Badge>
        </div>

        {/* Compras Médias */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Compras médias:</span>
            </div>
            <span className="font-medium">{insights.averagePurchases.toFixed(1)}</span>
          </div>
          {contactPurchases > 0 && (
            <div className="text-xs text-right">
              <span className="text-muted-foreground">Este cliente: </span>
              <span className={Number(purchasesComparison) >= 0 ? 'text-green-600' : 'text-red-500'}>
                {Number(purchasesComparison) >= 0 ? '+' : ''}{purchasesComparison}% {Number(purchasesComparison) >= 0 ? 'acima' : 'abaixo'}
              </span>
            </div>
          )}
        </div>

        {/* Tempo até primeira compra */}
        {insights.averageTimeToFirstPurchase !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tempo até 1ª compra:</span>
            </div>
            <span className="font-medium">
              {insights.averageTimeToFirstPurchase < 1 
                ? '< 1 dia' 
                : `${insights.averageTimeToFirstPurchase.toFixed(0)} dias`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
