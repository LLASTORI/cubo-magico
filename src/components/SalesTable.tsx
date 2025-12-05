import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";

interface Sale {
  transaction: string;
  product: string;
  buyer: string;
  value: number;
  status: string;
  date: string;
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
  originalCurrency?: string;
  originalValue?: number;
  wasConverted?: boolean;
  exchangeRate?: number;
}

interface SalesTableProps {
  sales: Sale[];
}

const SalesTable = ({ sales }: SalesTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'complete':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'refunded':
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="border-border shadow-[var(--shadow-card)]">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">Transações Recentes</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Transação</TableHead>
                <TableHead className="text-muted-foreground">Produto</TableHead>
                <TableHead className="text-muted-foreground">Comprador</TableHead>
                <TableHead className="text-muted-foreground">Valor</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">UTM Source</TableHead>
                <TableHead className="text-muted-foreground">Campanha</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.transaction} className="border-border hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-sm text-foreground">{sale.transaction}</TableCell>
                  <TableCell className="font-medium text-foreground">{sale.product}</TableCell>
                  <TableCell className="text-foreground">{sale.buyer}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    <div className="flex items-center gap-1.5">
                      {formatCurrency(sale.value)}
                      {sale.wasConverted && sale.originalCurrency && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <RefreshCw className="w-2.5 h-2.5" />
                                {sale.originalCurrency}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Convertido de {sale.originalCurrency} {sale.originalValue?.toFixed(2)}</p>
                              {sale.exchangeRate && (
                                <p className="text-xs text-muted-foreground">Taxa: 1 {sale.originalCurrency} = R$ {sale.exchangeRate.toFixed(2)}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(sale.status)}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sale.utmSource || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={sale.utmCampaign}>
                    {sale.utmCampaign || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sale.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default SalesTable;
