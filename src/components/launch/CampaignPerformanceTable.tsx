import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Megaphone } from 'lucide-react';

interface SaleRecord {
  meta_campaign_id?: string | null;
  gross_amount: number;
}

interface MetaInsight {
  campaign_id: string;
  campaign_name?: string;
  spend: number;
  impressions?: number;
  clicks?: number;
}

interface CampaignPerformanceTableProps {
  salesData: SaleRecord[];
  metaInsights: MetaInsight[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

export function CampaignPerformanceTable({
  salesData, metaInsights,
}: CampaignPerformanceTableProps) {
  const campaignData = useMemo(() => {
    // Agrupar spend por campanha (fonte: Meta Ads)
    const spendMap = new Map<string, {
      name: string; spend: number;
      impressions: number; clicks: number;
    }>();

    for (const m of metaInsights) {
      const id = m.campaign_id;
      if (!id) continue;
      const existing = spendMap.get(id) || {
        name: m.campaign_name || id,
        spend: 0, impressions: 0, clicks: 0,
      };
      existing.spend += Number(m.spend) || 0;
      existing.impressions += Number(m.impressions) || 0;
      existing.clicks += Number(m.clicks) || 0;
      spendMap.set(id, existing);
    }

    // Contar vendas por campanha (fonte: Hotmart via UTM)
    const salesMap = new Map<string, { count: number; revenue: number }>();
    for (const s of salesData) {
      const id = s.meta_campaign_id;
      if (!id) continue;
      const existing = salesMap.get(id) || { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += s.gross_amount || 0;
      salesMap.set(id, existing);
    }

    // Mesclar
    const result: {
      campaignId: string;
      name: string;
      spend: number;
      impressions: number;
      clicks: number;
      sales: number;
      revenue: number;
      roas: number;
      cpa: number;
    }[] = [];

    for (const [id, meta] of spendMap) {
      const sales = salesMap.get(id) || { count: 0, revenue: 0 };
      result.push({
        campaignId: id,
        name: meta.name,
        spend: meta.spend,
        impressions: meta.impressions,
        clicks: meta.clicks,
        sales: sales.count,
        revenue: sales.revenue,
        roas: meta.spend > 0 ? sales.revenue / meta.spend : 0,
        cpa: sales.count > 0 ? meta.spend / sales.count : 0,
      });
    }

    // Ordenar por spend desc
    return result.sort((a, b) => b.spend - a.spend);
  }, [salesData, metaInsights]);

  // Totais
  const totals = useMemo(() => {
    const t = { spend: 0, sales: 0, revenue: 0 };
    for (const c of campaignData) {
      t.spend += c.spend;
      t.sales += c.sales;
      t.revenue += c.revenue;
    }
    return {
      ...t,
      roas: t.spend > 0 ? t.revenue / t.spend : 0,
      cpa: t.sales > 0 ? t.spend / t.sales : 0,
    };
  }, [campaignData]);

  if (campaignData.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Performance de Campanhas
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {campaignData.length} campanhas
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Spend: Meta Ads</span>
          <span>Vendas: Hotmart (UTM)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead className="py-2">Campanha</TableHead>
              <TableHead className="text-right py-2">Gasto</TableHead>
              <TableHead className="text-right py-2">Compras</TableHead>
              <TableHead className="text-right py-2">ROAS</TableHead>
              <TableHead className="text-right py-2">CPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignData.map(c => (
              <TableRow key={c.campaignId} className="text-xs">
                <TableCell className="py-2 max-w-[250px]">
                  <span className="truncate block" title={c.name}>
                    {c.name}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2 text-red-400">
                  {fmt(c.spend)}
                </TableCell>
                <TableCell className="text-right py-2 font-bold">
                  {c.sales}
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className={`font-bold ${
                    c.roas >= 1 ? 'text-green-400' :
                    c.roas >= 0.5 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {c.roas.toFixed(1)}x
                  </span>
                </TableCell>
                <TableCell className="text-right py-2 font-mono">
                  {c.sales > 0 ? fmt(c.cpa) : '—'}
                </TableCell>
              </TableRow>
            ))}

            {/* TOTAL */}
            <TableRow className="bg-muted/30 font-bold text-xs border-t-2">
              <TableCell className="py-2">
                TOTAL ({campaignData.length} campanhas)
              </TableCell>
              <TableCell className="text-right py-2 text-red-400">
                {fmt(totals.spend)}
              </TableCell>
              <TableCell className="text-right py-2">
                {totals.sales}
              </TableCell>
              <TableCell className="text-right py-2">
                <span className={totals.roas >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {totals.roas.toFixed(1)}x
                </span>
              </TableCell>
              <TableCell className="text-right py-2 font-mono">
                {fmt(totals.cpa)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
