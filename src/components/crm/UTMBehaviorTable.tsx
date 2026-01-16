import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UTMMetrics } from '@/hooks/useUTMBehaviorData';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This component displays metrics from Orders Core:
 * - totalCustomerPaid: What customer paid
 * - totalProducerNet: What producer received
 */

interface UTMBehaviorTableProps {
  data: UTMMetrics[];
  dimensionLabel: string;
}

type SortField = 'key' | 'totalContacts' | 'totalCustomers' | 'conversionRate' | 'totalCustomerPaid' | 'avgLTV' | 'avgTicket' | 'repurchaseRate';

export function UTMBehaviorTable({ data, dimensionLabel }: UTMBehaviorTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalCustomerPaid');
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate averages for comparison
  const avgConversion = data.length > 0 ? data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length : 0;
  const avgLTV = data.length > 0 ? data.reduce((sum, d) => sum + d.avgLTV, 0) / data.length : 0;

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível para esta dimensão
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <SortHeader field="key">{dimensionLabel}</SortHeader>
            <SortHeader field="totalContacts">Contatos</SortHeader>
            <SortHeader field="totalCustomers">Clientes</SortHeader>
            <SortHeader field="conversionRate">Conversão</SortHeader>
            <SortHeader field="totalCustomerPaid">Receita Bruta</SortHeader>
            <SortHeader field="avgLTV">LTV Médio</SortHeader>
            <SortHeader field="avgTicket">Ticket Médio</SortHeader>
            <SortHeader field="repurchaseRate">Recompra</SortHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.slice(0, 20).map((row) => (
            <TableRow key={row.key} className="hover:bg-muted/20">
              <TableCell className="font-medium max-w-[200px] truncate" title={row.key}>
                {row.key}
              </TableCell>
              <TableCell>{row.totalContacts.toLocaleString('pt-BR')}</TableCell>
              <TableCell>{row.totalCustomers.toLocaleString('pt-BR')}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {formatPercent(row.conversionRate)}
                  {row.conversionRate > avgConversion ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : row.conversionRate < avgConversion ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(row.totalCustomerPaid)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {formatCurrency(row.avgLTV)}
                  {row.avgLTV > avgLTV ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : row.avgLTV < avgLTV ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(row.avgTicket)}</TableCell>
              <TableCell>{formatPercent(row.repurchaseRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 20 && (
        <div className="text-center py-2 text-sm text-muted-foreground bg-muted/20">
          Mostrando 20 de {data.length} registros
        </div>
      )}
    </div>
  );
}
