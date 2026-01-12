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
import { Info } from "lucide-react";

interface Sale {
  transaction: string;
  product: string;
  buyer: string;
  value: number; // Net amount (after fees)
  grossValue?: number; // Gross amount (optional)
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
  showGrossColumn?: boolean;
}

const SalesTable = ({ sales, showGrossColumn = false }: SalesTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'complete':
      case 'purchase':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'refunded':
      case 'refund':
      case 'cancelled':
      case 'cancellation':
      case 'chargeback':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'approved': 'Aprovada',
      'complete': 'Completa',
      'purchase': 'Aprovada',
      'pending': 'Pendente',
      'refunded': 'Reembolsada',
      'refund': 'Reembolsada',
      'cancelled': 'Cancelada',
      'cancellation': 'Cancelada',
      'chargeback': 'Chargeback',
    };
    return labels[status.toLowerCase()] || status;
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
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Transações</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Dados do Financial Core</p>
                <p className="text-xs text-muted-foreground">Valores líquidos (após taxas da plataforma)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Transação</TableHead>
                <TableHead className="text-muted-foreground">Produto</TableHead>
                <TableHead className="text-muted-foreground">Comprador</TableHead>
                <TableHead className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    Valor Líquido
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Após taxas da Hotmart</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                {showGrossColumn && (
                  <TableHead className="text-muted-foreground">Valor Bruto</TableHead>
                )}
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">UTM Source</TableHead>
                <TableHead className="text-muted-foreground">Campanha</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale, index) => (
                <TableRow key={`${sale.transaction}-${index}`} className="border-border hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-sm text-foreground">{sale.transaction}</TableCell>
                  <TableCell className="font-medium text-foreground max-w-[200px] truncate" title={sale.product}>
                    {sale.product}
                  </TableCell>
                  <TableCell className="text-foreground max-w-[150px] truncate" title={sale.buyer}>
                    {sale.buyer}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(sale.value)}
                  </TableCell>
                  {showGrossColumn && (
                    <TableCell className="text-muted-foreground">
                      {sale.grossValue ? formatCurrency(sale.grossValue) : '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(sale.status)}>
                      {getStatusLabel(sale.status)}
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
