/**
 * SALES HISTORY ORDERS CSV IMPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * Importar histórico de vendas via CSV para visualização e análise.
 * 
 * CONTRATO ARQUITETURAL:
 * - Escreve APENAS em sales_history_orders (Camada 3)
 * - NUNCA escreve em orders, order_items, ledger_events
 * - NUNCA afeta métricas operacionais
 * - Idempotência por project_id + provider_transaction_id
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  X,
  Info,
  History
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

// Column mapping for Hotmart CSV
const COLUMN_MAP: Record<string, string> = {
  // Transaction ID (required)
  'transacao': 'transaction_id',
  'transação': 'transaction_id',
  'transaction': 'transaction_id',
  'transaction_id': 'transaction_id',
  'codigo da transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  
  // Financial values
  'preco total': 'gross_value',
  'preço total': 'gross_value',
  'valor bruto': 'gross_value',
  'valor total': 'gross_value',
  
  'taxa hotmart': 'platform_fee',
  'taxa da plataforma': 'platform_fee',
  'taxa marketplace': 'platform_fee',
  
  'comissao afiliado': 'affiliate_commission',
  'comissão afiliado': 'affiliate_commission',
  'valor afiliado': 'affiliate_commission',
  
  'comissao coprodutor': 'coproducer_commission',
  'comissão coprodutor': 'coproducer_commission',
  'valor coprodutor': 'coproducer_commission',
  
  'impostos': 'taxes',
  'imposto': 'taxes',
  
  'valor liquido': 'net_value',
  'valor líquido': 'net_value',
  'comissao': 'net_value',
  'comissão': 'net_value',
  'voce recebeu': 'net_value',
  'você recebeu': 'net_value',
  
  // Currency
  'moeda': 'original_currency',
  'currency': 'original_currency',
  'taxa de cambio': 'exchange_rate',
  'taxa de câmbio': 'exchange_rate',
  
  // Dates
  'data de venda': 'order_date',
  'data da compra': 'order_date',
  'data compra': 'order_date',
  'data de confirmacao': 'confirmation_date',
  'data de confirmação': 'confirmation_date',
  
  // Status
  'status': 'status',
  'situacao': 'status',
  'situação': 'status',
  
  // Payment
  'meio de pagamento': 'payment_method',
  'forma de pagamento': 'payment_method',
  'tipo de pagamento': 'payment_type',
  'parcelas': 'installments',
  
  // Product/Offer
  'nome do produto': 'product_name',
  'produto': 'product_name',
  'codigo do produto': 'product_code',
  'código do produto': 'product_code',
  'nome da oferta': 'offer_name',
  'codigo de oferta': 'offer_code',
  'código de oferta': 'offer_code',
  
  // Buyer
  'nome': 'buyer_name',
  'nome do comprador': 'buyer_name',
  'comprador': 'buyer_name',
  'email': 'buyer_email',
  'e-mail': 'buyer_email',
  
  // Affiliate
  'nome do afiliado': 'affiliate_name',
  'afiliado': 'affiliate_name',
  'codigo do afiliado': 'affiliate_code',
  'código do afiliado': 'affiliate_code',
  
  // Coproducer
  'nome do coprodutor': 'coproducer_name',
  'coprodutor': 'coproducer_name',
  
  // Payout
  'id repasse': 'payout_id',
  'data repasse': 'payout_date',
  'data do repasse': 'payout_date',
};

interface ParsedRow {
  transaction_id: string;
  order_date?: Date;
  confirmation_date?: Date;
  buyer_name?: string;
  buyer_email?: string;
  product_name?: string;
  product_code?: string;
  offer_name?: string;
  offer_code?: string;
  gross_value: number;
  platform_fee: number;
  affiliate_commission: number;
  coproducer_commission: number;
  taxes: number;
  net_value: number;
  original_currency: string;
  exchange_rate: number;
  status?: string;
  payment_method?: string;
  payment_type?: string;
  installments?: number;
  affiliate_name?: string;
  affiliate_code?: string;
  coproducer_name?: string;
  payout_id?: string;
  payout_date?: Date;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function SalesHistoryOrdersImport() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const projectId = currentProject?.id;

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',' || char === ';') {
          currentLine.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentLine.push(currentField.trim());
          if (currentLine.some(f => f !== '')) {
            lines.push(currentLine);
          }
          currentLine = [];
          currentField = '';
          if (char === '\r') i++;
        } else {
          currentField += char;
        }
      }
    }

    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f !== '')) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string): Date | undefined => {
    if (!value) return undefined;
    
    // Try various formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2}):?(\d{2})?/, // DD/MM/YYYY HH:MM:SS
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?:?(\d{2})?/, // ISO
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format === formats[0] || format === formats[1]) {
          const [, day, month, year, hour = '0', min = '0', sec = '0'] = match;
          return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(min),
            parseInt(sec)
          );
        } else {
          return new Date(value);
        }
      }
    }
    
    return undefined;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    setValidationError(null);

    try {
      const text = await selectedFile.text();
      const lines = parseCSV(text);

      if (lines.length < 2) {
        setValidationError('Arquivo vazio ou sem dados válidos.');
        return;
      }

      const headers = lines[0].map(h => h.toLowerCase().trim());
      const mapping: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        const normalized = header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const mappedField = COLUMN_MAP[header] || COLUMN_MAP[normalized];
        if (mappedField) {
          mapping[index.toString()] = mappedField;
        }
      });

      // Validate required columns
      const hasTransaction = Object.values(mapping).includes('transaction_id');
      if (!hasTransaction) {
        setValidationError('Coluna obrigatória não encontrada: Transação (transaction_id)');
        return;
      }

      setColumnMapping(mapping);

      // Parse data rows
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row: Record<string, any> = {};

        Object.entries(mapping).forEach(([colIndex, field]) => {
          const value = line[parseInt(colIndex)] || '';
          row[field] = value;
        });

        if (!row.transaction_id) continue;

        rows.push({
          transaction_id: row.transaction_id,
          order_date: parseDate(row.order_date),
          confirmation_date: parseDate(row.confirmation_date),
          buyer_name: row.buyer_name,
          buyer_email: row.buyer_email?.toLowerCase()?.trim(),
          product_name: row.product_name,
          product_code: row.product_code,
          offer_name: row.offer_name,
          offer_code: row.offer_code,
          gross_value: parseNumber(row.gross_value),
          platform_fee: parseNumber(row.platform_fee),
          affiliate_commission: parseNumber(row.affiliate_commission),
          coproducer_commission: parseNumber(row.coproducer_commission),
          taxes: parseNumber(row.taxes),
          net_value: parseNumber(row.net_value),
          original_currency: row.original_currency || 'BRL',
          exchange_rate: parseNumber(row.exchange_rate) || 1,
          status: row.status,
          payment_method: row.payment_method,
          payment_type: row.payment_type,
          installments: row.installments ? parseInt(row.installments) : undefined,
          affiliate_name: row.affiliate_name,
          affiliate_code: row.affiliate_code,
          coproducer_name: row.coproducer_name,
          payout_id: row.payout_id,
          payout_date: parseDate(row.payout_date),
        });
      }

      setParsedData(rows);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setValidationError('Erro ao processar o arquivo CSV.');
    }
  };

  const handleImport = async () => {
    if (!projectId || parsedData.length === 0 || !user) return;

    cancelImportRef.current = false;
    setImporting(true);
    setProgress(0);
    setProgressMessage('Iniciando importação...');
    setImportResult(null);

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Create import batch
      const { data: batch, error: batchError } = await supabase
        .from('sales_history_import_batches')
        .insert({
          project_id: projectId,
          file_name: file?.name,
          provider: 'HOTMART',
          total_rows: parsedData.length,
          status: 'processing',
          imported_by: user.id,
        })
        .select('id')
        .single();

      if (batchError) throw batchError;
      const batchId = batch.id;

      // Process in batches
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (cancelImportRef.current) {
          setProgressMessage('Importação cancelada pelo usuário');
          break;
        }

        const currentBatch = batches[batchIndex];
        const batchProgress = ((batchIndex + 1) / batches.length) * 100;
        setProgress(batchProgress);
        setProgressMessage(`Processando lote ${batchIndex + 1} de ${batches.length}...`);

        for (const row of currentBatch) {
          if (cancelImportRef.current) break;

          try {
            // Try to insert (will fail on duplicate due to unique constraint)
            const { error: insertError } = await supabase
              .from('sales_history_orders')
              .insert({
                project_id: projectId,
                provider: 'HOTMART',
                provider_transaction_id: row.transaction_id,
                order_date: row.order_date?.toISOString(),
                confirmation_date: row.confirmation_date?.toISOString(),
                buyer_name: row.buyer_name,
                buyer_email: row.buyer_email,
                product_name: row.product_name,
                product_code: row.product_code,
                offer_name: row.offer_name,
                offer_code: row.offer_code,
                gross_value: row.gross_value,
                platform_fee: row.platform_fee,
                affiliate_commission: row.affiliate_commission,
                coproducer_commission: row.coproducer_commission,
                taxes: row.taxes,
                net_value: row.net_value,
                original_currency: row.original_currency,
                exchange_rate: row.exchange_rate,
                status: row.status,
                payment_method: row.payment_method,
                payment_type: row.payment_type,
                installments: row.installments,
                affiliate_name: row.affiliate_name,
                affiliate_code: row.affiliate_code,
                coproducer_name: row.coproducer_name,
                payout_id: row.payout_id,
                payout_date: row.payout_date?.toISOString(),
                source: 'csv',
                import_batch_id: batchId,
                imported_by: user.id,
              });

            if (insertError) {
              if (insertError.code === '23505') {
                // Duplicate - skip
                result.skipped++;
              } else {
                result.errors.push(`${row.transaction_id}: ${insertError.message}`);
              }
            } else {
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`${row.transaction_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Update batch status
      await supabase
        .from('sales_history_import_batches')
        .update({
          status: cancelImportRef.current ? 'cancelled' : 'completed',
          imported_count: result.imported,
          skipped_count: result.skipped,
          error_count: result.errors.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      setImportResult(result);
      setProgress(100);
      setProgressMessage('Importação concluída!');

      toast({
        title: 'Importação concluída',
        description: `${result.imported} importados, ${result.skipped} ignorados`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    cancelImportRef.current = true;
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setImportResult(null);
    setValidationError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!projectId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Selecione um projeto para importar histórico.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" />
          Importar Pedidos Históricos
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
            Histórico
          </Badge>
        </CardTitle>
        <CardDescription>
          Importe vendas históricas da Hotmart para visualização e análise. Dados são somente leitura.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warning Banner */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium mb-1">ℹ️ Importação Histórica</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Dados ficam disponíveis apenas em <strong>Pedidos Históricos</strong></li>
              <li>Não afeta Busca Rápida, métricas ou financeiro</li>
              <li>Transações duplicadas são ignoradas automaticamente</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        {!file && (
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Arraste um arquivo CSV ou clique para selecionar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Selecionar CSV
              </label>
            </Button>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* File Selected */}
        {file && !validationError && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} transações encontradas
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview */}
            {parsedData.length > 0 && !importing && !importResult && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transação</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.transaction_id}</TableCell>
                          <TableCell className="text-sm">{row.buyer_name || row.buyer_email || '-'}</TableCell>
                          <TableCell className="text-sm">{row.product_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.original_currency} {row.net_value.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mostrando 5 de {parsedData.length} registros
                  </p>
                )}

                <Button onClick={handleImport} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parsedData.length} Registros
                </Button>
              </>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{progressMessage}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-emerald-600">{importResult.imported}</p>
                    <p className="text-xs text-muted-foreground">Importados</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                    <Info className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-600">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Ignorados</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-600">{importResult.errors.length}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-1">Erros encontrados:</p>
                      <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... e mais {importResult.errors.length - 5} erros</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button variant="outline" onClick={handleReset} className="w-full">
                  Nova Importação
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
