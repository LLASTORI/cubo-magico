import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Tag, Layers } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface LaunchProductsSalesBreakdownProps {
  projectId: string;
  funnelId: string;
  startDate: Date;
  endDate: Date;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const LaunchProductsSalesBreakdown = ({
  projectId,
  funnelId,
  startDate,
  endDate,
}: LaunchProductsSalesBreakdownProps) => {
  // Fetch launch products with offer mappings
  const { data: launchProducts = [] } = useQuery({
    queryKey: ['launch-products', funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('launch_products')
        .select(`
          *,
          offer_mappings (
            id,
            nome_produto,
            nome_oferta,
            codigo_oferta,
            valor,
            tipo_posicao,
            nome_posicao
          )
        `)
        .eq('funnel_id', funnelId)
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!funnelId && !!projectId,
  });

  // Fetch sales data
  const { data: salesData = [] } = useQuery({
    queryKey: ['hotmart-sales-products', projectId, funnelId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!projectId || launchProducts.length === 0) return [];

      const brazilTz = 'America/Sao_Paulo';
      const startInBrazil = toZonedTime(startDate, brazilTz);
      startInBrazil.setHours(0, 0, 0, 0);
      const endInBrazil = toZonedTime(endDate, brazilTz);
      endInBrazil.setHours(23, 59, 59, 999);

      const offerCodes = launchProducts
        .map(lp => lp.offer_mappings?.codigo_oferta)
        .filter(Boolean);

      if (offerCodes.length === 0) return [];

      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('*')
        .eq('project_id', projectId)
        .in('offer_code', offerCodes)
        .gte('sale_date', startInBrazil.toISOString())
        .lte('sale_date', endInBrazil.toISOString())
        .in('status', ['APPROVED', 'COMPLETE']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && launchProducts.length > 0,
  });

  // Group products by lot and product type
  const productBreakdown = useMemo(() => {
    if (launchProducts.length === 0) return [];

    const totalRevenue = salesData.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    const totalSales = salesData.length;

    // Group by lot_name first, then by product_type
    const lotGroups: Record<string, {
      lotName: string;
      products: Array<{
        id: string;
        productType: string;
        offerCode: string;
        offerName: string;
        productName: string;
        price: number;
        position: string;
        revenue: number;
        sales: number;
        percentage: number;
      }>;
      totalRevenue: number;
      totalSales: number;
      percentage: number;
    }> = {};

    launchProducts.forEach(lp => {
      const lotName = lp.lot_name || 'Sem Lote';
      const offerMapping = lp.offer_mappings;
      
      if (!offerMapping) return;

      const offerCode = offerMapping.codigo_oferta;
      const productSales = salesData.filter(s => s.offer_code === offerCode);
      const revenue = productSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      const salesCount = productSales.length;

      if (!lotGroups[lotName]) {
        lotGroups[lotName] = {
          lotName,
          products: [],
          totalRevenue: 0,
          totalSales: 0,
          percentage: 0,
        };
      }

      lotGroups[lotName].products.push({
        id: lp.id,
        productType: lp.product_type,
        offerCode: offerCode || '',
        offerName: offerMapping.nome_oferta || '',
        productName: offerMapping.nome_produto || '',
        price: offerMapping.valor || 0,
        position: offerMapping.tipo_posicao || '',
        revenue,
        sales: salesCount,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      });

      lotGroups[lotName].totalRevenue += revenue;
      lotGroups[lotName].totalSales += salesCount;
    });

    // Calculate percentages for lots
    Object.values(lotGroups).forEach(lot => {
      lot.percentage = totalRevenue > 0 ? (lot.totalRevenue / totalRevenue) * 100 : 0;
    });

    return Object.values(lotGroups).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [launchProducts, salesData]);

  if (launchProducts.length === 0) {
    return null;
  }

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'main':
        return <Badge variant="default" className="text-xs">Principal</Badge>;
      case 'upsell':
        return <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-600">Upsell</Badge>;
      case 'downsell':
        return <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-600">Downsell</Badge>;
      case 'order_bump':
        return <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-600">Order Bump</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Detalhamento por Produto/Lote
        </h4>
      </div>

      {productBreakdown.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground text-sm">
          Nenhum produto configurado ou sem vendas no período
        </Card>
      ) : (
        <div className="space-y-4">
          {productBreakdown.map((lot) => (
            <Card key={lot.lotName} className="overflow-hidden">
              {/* Lot Header */}
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-medium">{lot.lotName}</span>
                  <Badge variant="outline" className="text-xs">
                    {lot.products.length} {lot.products.length === 1 ? 'oferta' : 'ofertas'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Receita:</span>
                    <span className="font-semibold ml-1">{formatCurrency(lot.totalRevenue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="font-semibold ml-1">{lot.totalSales}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">%:</span>
                    <span className="font-semibold ml-1">{lot.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Produto/Oferta</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Posição</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lot.products.map((product) => (
                    <TableRow key={product.id} className="text-sm">
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.offerName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getProductTypeBadge(product.productType)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {product.position || 'N/C'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {product.sales}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs">{product.percentage.toFixed(1)}%</span>
                          <Progress 
                            value={product.percentage} 
                            className="h-1 w-12"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
