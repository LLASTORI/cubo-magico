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
import { Loader2, Package, ShoppingCart, CreditCard } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyRevenueDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  month: string; // formato yyyy-MM
  monthLabel: string;
  year: number;
}

interface ProductSummary {
  productName: string;
  offerName: string | null;
  offerCode: string | null;
  count: number;
  revenue: number;
  avgPrice: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function MonthlyRevenueDetailDialog({
  open,
  onOpenChange,
  projectId,
  month,
  monthLabel,
  year,
}: MonthlyRevenueDetailDialogProps) {
  const [viewMode, setViewMode] = useState<'products' | 'sales'>('products');

  // Parse month to get date range
  const dateRange = useMemo(() => {
    const [yearStr, monthStr] = month.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  }, [month]);

  // Fetch sales for this month
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['monthly-revenue-detail', projectId, month],
    queryFn: async () => {
      let allSales: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('*')
          .eq('project_id', projectId)
          .gte('sale_date', dateRange.start.toISOString())
          .lte('sale_date', dateRange.end.toISOString())
          .in('status', ['APPROVED', 'COMPLETE'])
          .order('sale_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allSales = [...allSales, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      return allSales;
    },
    enabled: open && !!projectId && !!month,
  });

  // Group sales by product/offer
  const productSummary = useMemo((): ProductSummary[] => {
    if (!salesData) return [];

    const grouped = salesData.reduce((acc, sale) => {
      const key = `${sale.product_name}||${sale.offer_code || 'sem-oferta'}`;
      if (!acc[key]) {
        acc[key] = {
          productName: sale.product_name,
          offerName: sale.offer_code ? (sale.offer_code) : null,
          offerCode: sale.offer_code,
          count: 0,
          revenue: 0,
        };
      }
      acc[key].count++;
      acc[key].revenue += sale.total_price_brl || sale.total_price || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        avgPrice: item.count > 0 ? item.revenue / item.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [salesData]);

  const totalRevenue = useMemo(() => {
    return salesData?.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0) || 0;
  }, [salesData]);

  const totalSales = salesData?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Detalhamento - {monthLabel} de {year}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : salesData && salesData.length > 0 ? (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Faturamento Total</span>
                </div>
                <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm font-medium">Total de Vendas</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{totalSales}</p>
              </div>
            </div>

            {/* Tabs for view mode */}
            <div className="flex gap-2 border-b border-border pb-2">
              <button
                onClick={() => setViewMode('products')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'products'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Por Produto/Oferta
              </button>
              <button
                onClick={() => setViewMode('sales')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'sales'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Todas as Vendas ({totalSales})
              </button>
            </div>

            {/* Content */}
            <div className="overflow-auto flex-1">
              {viewMode === 'products' ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produto / Oferta</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummary.map((item, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{item.productName}</span>
                            {item.offerCode && (
                              <Badge variant="outline" className="w-fit text-xs">
                                {item.offerCode}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.avgPrice)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-400">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">
                          {sale.sale_date
                            ? format(parseISO(sale.sale_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm truncate max-w-[200px]">
                              {sale.product_name}
                            </span>
                            {sale.offer_code && (
                              <Badge variant="outline" className="w-fit text-xs">
                                {sale.offer_code}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {sale.buyer_name || sale.buyer_email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {sale.payment_method || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-400">
                          {formatCurrency(sale.total_price_brl || sale.total_price || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma venda registrada neste mês</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
