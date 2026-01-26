/**
 * SALES HISTORY ORDERS TABLE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tabela de visualização de pedidos históricos importados via CSV.
 * Dados são somente leitura e isolados do sistema operacional.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useSalesHistoryOrders, 
  useSalesHistoryStats,
  useSalesHistoryProducts,
  useSalesHistoryStatuses
} from '@/hooks/useSalesHistoryOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Search, 
  History, 
  ChevronLeft, 
  ChevronRight,
  Info,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';

export function SalesHistoryOrdersTable() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [product, setProduct] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: result, isLoading, error } = useSalesHistoryOrders({
    search: search || undefined,
    status: status || undefined,
    product: product || undefined,
    page,
    pageSize,
  });

  const { data: stats } = useSalesHistoryStats();
  const { data: products } = useSalesHistoryProducts();
  const { data: statuses } = useSalesHistoryStatuses();

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-muted text-muted-foreground';
    const lower = status.toLowerCase();
    if (lower.includes('aprovad') || lower.includes('complet') || lower === 'approved') {
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    }
    if (lower.includes('recus') || lower.includes('cancel') || lower.includes('refund')) {
      return 'bg-red-500/10 text-red-600 border-red-500/30';
    }
    if (lower.includes('pend') || lower.includes('aguard')) {
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    }
    return 'bg-muted text-muted-foreground';
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleProductChange = (value: string) => {
    setProduct(value === 'all' ? '' : value);
    setPage(1);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Erro ao carregar histórico: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <History className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Pedidos Históricos
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                  CSV
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Esses dados são históricos importados via CSV. 
                        Não interferem em vendas atuais, métricas ou financeiro em tempo real.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                {stats?.total || 0} registros importados
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou transação..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Select value={status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses?.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={product || 'all'} onValueChange={handleProductChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : result?.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum pedido histórico encontrado</p>
            <p className="text-sm text-muted-foreground">
              Importe um CSV de vendas para visualizar o histórico aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result?.data.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.provider_transaction_id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.order_date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{order.buyer_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{order.buyer_email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {order.product_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                          {order.status || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(order.net_value, order.original_currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {result.page} de {result.totalPages} ({result.count} registros)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                    disabled={page >= result.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
