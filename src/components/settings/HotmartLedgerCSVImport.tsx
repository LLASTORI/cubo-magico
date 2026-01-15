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
  DollarSign,
  AlertTriangle,
  Scale,
  TrendingDown,
  TrendingUp
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
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Hotmart Detailed Sales CSV column mapping
const LEDGER_COLUMN_MAP: Record<string, string> = {
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
  'total': 'gross_value',
  
  'preco do produto': 'product_price',
  'preço do produto': 'product_price',
  'valor do produto': 'product_price',
  
  'preco da oferta': 'offer_price',
  'preço da oferta': 'offer_price',
  'valor da oferta': 'offer_price',
  
  'taxa hotmart': 'platform_fee',
  'taxa da plataforma': 'platform_fee',
  'taxa marketplace': 'platform_fee',
  'comissao hotmart': 'platform_fee',
  'comissão hotmart': 'platform_fee',
  
  'comissao afiliado': 'affiliate_commission',
  'comissão afiliado': 'affiliate_commission',
  'comissao do afiliado': 'affiliate_commission',
  'comissão do afiliado': 'affiliate_commission',
  'valor afiliado': 'affiliate_commission',
  
  'comissao coprodutor': 'coproducer_commission',
  'comissão coprodutor': 'coproducer_commission',
  'comissao co-produtor': 'coproducer_commission',
  'comissão co-produtor': 'coproducer_commission',
  'comissao do coprodutor': 'coproducer_commission',
  'comissão do coprodutor': 'coproducer_commission',
  'valor coprodutor': 'coproducer_commission',
  
  'impostos': 'taxes',
  'imposto': 'taxes',
  'tax': 'taxes',
  'ir': 'taxes',
  'imposto retido': 'taxes',
  
  'valor liquido': 'net_value',
  'valor líquido': 'net_value',
  'faturamento liquido': 'net_value',
  'faturamento líquido': 'net_value',
  'comissao': 'net_value',
  'comissão': 'net_value',
  'voce recebeu': 'net_value',
  'você recebeu': 'net_value',
  'valor que voce recebeu': 'net_value',
  'valor que você recebeu': 'net_value',
  'valor recebido': 'net_value',
  
  'valor recebido convertido': 'net_value_brl',
  'valor que voce recebeu convertido': 'net_value_brl',
  'valor que você recebeu convertido': 'net_value_brl',
  
  // Currency and exchange
  'moeda': 'original_currency',
  'currency': 'original_currency',
  'taxa de cambio': 'exchange_rate',
  'taxa de câmbio': 'exchange_rate',
  'taxa de cambio real': 'exchange_rate',
  'taxa de câmbio real': 'exchange_rate',
  
  // Payout
  'id repasse': 'payout_id',
  'codigo repasse': 'payout_id',
  'código repasse': 'payout_id',
  'id do repasse': 'payout_id',
  'payout_id': 'payout_id',
  'data repasse': 'payout_date',
  'data do repasse': 'payout_date',
  
  // Dates
  'data de venda': 'sale_date',
  'data da compra': 'sale_date',
  'data compra': 'sale_date',
  'purchase_date': 'sale_date',
  'data de confirmacao': 'confirmation_date',
  'data de confirmação': 'confirmation_date',
  'data da confirmacao': 'confirmation_date',
  'data da confirmação': 'confirmation_date',
  
  // Status
  'status': 'status',
  'situacao': 'status',
  'situação': 'status',
  
  // Payment
  'meio de pagamento': 'payment_method',
  'metodo de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
  'forma de pagamento': 'payment_method',
  'tipo de pagamento': 'payment_type',
  'tipo pagamento oferta': 'payment_type',
  'parcelas': 'installments',
  'numero da parcela': 'installments',
  'número da parcela': 'installments',
  
  // Product/Offer
  'nome do produto': 'product_name',
  'produto': 'product_name',
  'codigo do produto': 'product_code',
  'código do produto': 'product_code',
  'codigo de oferta': 'offer_code',
  'código de oferta': 'offer_code',
  'oferta': 'offer_code',
  'nome da oferta': 'offer_name',
  
  // Buyer
  'nome': 'buyer_name',
  'nome do comprador': 'buyer_name',
  'comprador': 'buyer_name',
  'email': 'buyer_email',
  'e-mail': 'buyer_email',
  'email do comprador': 'buyer_email',
  
  // Affiliate
  'nome do afiliado': 'affiliate_name',
  'afiliado': 'affiliate_name',
  'codigo da afiliacao': 'affiliate_code',
  'código da afiliação': 'affiliate_code',
  'codigo do afiliado': 'affiliate_code',
  'código do afiliado': 'affiliate_code',
  
  // Coproducer
  'nome do coprodutor': 'coproducer_name',
  'coprodutor': 'coproducer_name',
  'nome do co-produtor': 'coproducer_name',
  'co-produtor': 'coproducer_name',
};

interface ParsedLedgerRow {
  transaction_id: string;
  gross_value: number;
  net_value: number;
  net_value_brl: number;
  product_price?: number;
  offer_price?: number;
  platform_fee?: number;
  affiliate_commission?: number;
  coproducer_commission?: number;
  taxes?: number;
  original_currency?: string;
  exchange_rate?: number;
  payout_id?: string;
  payout_date?: string;
  sale_date?: string;
  confirmation_date?: string;
  status?: string;
  payment_method?: string;
  payment_type?: string;
  installments?: number;
  product_code?: string;
  product_name?: string;
  offer_code?: string;
  offer_name?: string;
  buyer_email?: string;
  buyer_name?: string;
  affiliate_code?: string;
  affiliate_name?: string;
  coproducer_name?: string;
  raw_row: Record<string, string>;
}

interface ReconciliationResult {
  transaction_id: string;
  csv_net: number;
  webhook_net: number | null;
  difference: number;
  difference_pct: number;
  status: 'matched' | 'divergent' | 'new';
  divergence_type?: string;
}

interface ImportResult {
  imported: number;
  reconciled: number;
  divergent: number;
  new_transactions: number;
  skipped: number;
  errors: string[];
  totals: {
    gross: number;
    net: number;
    platform_fees: number;
    affiliate_commissions: number;
    coproducer_commissions: number;
    taxes: number;
  };
  divergences: ReconciliationResult[];
}

export const HotmartLedgerCSVImport = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLedgerRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [foundHeaders, setFoundHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('preview');
  
  const projectId = currentProject?.id;
  const userId = user?.id;

  const normalizeColumnName = (col: string): string => {
    return col.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]/g, ' ')
      .trim();
  };

  const parseCSV = (content: string): { headers: string[]; rows: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows };
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (brMatch) {
      const [, day, month, year, hour = '00', min = '00', sec = '00'] = brMatch;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
    }

    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (isoMatch) {
      const [, year, month, day, hour = '00', min = '00', sec = '00'] = isoMatch;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
    }

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {}

    return null;
  };

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value
      .replace(/[R$\s€$]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData([]);
    setColumnMapping({});
    setFoundHeaders([]);
    setImportResult(null);
    setParseError(null);

    try {
      const content = await selectedFile.text();
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0 || rows.length === 0) {
        setParseError('Arquivo CSV vazio ou inválido.');
        return;
      }

      setFoundHeaders(headers);

      // Map columns
      const mapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalized = normalizeColumnName(header);
        const mappedField = LEDGER_COLUMN_MAP[normalized];
        if (mappedField) {
          mapping[index.toString()] = mappedField;
        }
      });

      // Check required fields
      const mappedFields = Object.values(mapping);
      if (!mappedFields.includes('transaction_id')) {
        setParseError(`Coluna de transação não encontrada.\n\nEsperado: "Transação"\n\nColunas encontradas: ${headers.slice(0, 10).join(', ')}...`);
        return;
      }
      if (!mappedFields.includes('net_value') && !mappedFields.includes('net_value_brl')) {
        setParseError(`Coluna de valor líquido não encontrada.\n\nEsperado: "Valor Líquido" ou "Faturamento Líquido"`);
        return;
      }

      setColumnMapping(mapping);

      // Parse rows
      const parsed: ParsedLedgerRow[] = rows
        .filter(row => row.some(cell => cell.trim()))
        .map((row, rowIndex) => {
          const rawRow: Record<string, string> = {};
          headers.forEach((h, i) => { rawRow[h] = row[i] || ''; });
          
          const obj: ParsedLedgerRow = { 
            transaction_id: '', 
            gross_value: 0, 
            net_value: 0, 
            net_value_brl: 0,
            raw_row: rawRow 
          };
          
          Object.entries(mapping).forEach(([index, field]) => {
            const value = row[parseInt(index)] || '';
            
            if (field === 'transaction_id') {
              obj.transaction_id = value;
            } else if (field === 'status') {
              obj.status = value;
            } else if (['sale_date', 'confirmation_date', 'payout_date'].includes(field)) {
              (obj as any)[field] = parseDate(value) || undefined;
            } else if ([
              'gross_value', 'net_value', 'net_value_brl', 'product_price', 
              'offer_price', 'platform_fee', 'affiliate_commission', 
              'coproducer_commission', 'taxes', 'exchange_rate'
            ].includes(field)) {
              (obj as any)[field] = parseNumber(value);
            } else if (field === 'installments') {
              obj.installments = parseInt(value) || undefined;
            } else {
              (obj as any)[field] = value || undefined;
            }
          });

          // If net_value_brl is not provided, use net_value
          if (!obj.net_value_brl && obj.net_value) {
            obj.net_value_brl = obj.net_value;
          }
          // If gross_value is not provided, calculate from net + fees
          if (!obj.gross_value && obj.net_value) {
            obj.gross_value = obj.net_value + 
              (obj.platform_fee || 0) + 
              (obj.affiliate_commission || 0) + 
              (obj.coproducer_commission || 0) + 
              (obj.taxes || 0);
          }

          return obj;
        })
        .filter(row => row.transaction_id && (row.net_value > 0 || row.net_value_brl > 0));

      if (parsed.length === 0) {
        setParseError('Nenhuma transação válida encontrada no arquivo.');
        return;
      }

      setParsedData(parsed);

      toast({
        title: 'Arquivo carregado!',
        description: `${parsed.length} transações financeiras encontradas.`,
      });
    } catch (error: any) {
      console.error('CSV parse error:', error);
      setParseError(`Erro ao processar arquivo: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!projectId || !userId || parsedData.length === 0) return;

    cancelImportRef.current = false;
    setImporting(true);
    setProgress(0);
    setProgressMessage('Preparando importação financeira...');
    setImportResult(null);

    const result: ImportResult = {
      imported: 0,
      reconciled: 0,
      divergent: 0,
      new_transactions: 0,
      skipped: 0,
      errors: [],
      totals: {
        gross: 0,
        net: 0,
        platform_fees: 0,
        affiliate_commissions: 0,
        coproducer_commissions: 0,
        taxes: 0,
      },
      divergences: [],
    };

    try {
      // Create import batch
      setProgressMessage('Criando lote de importação...');
      const batchId = crypto.randomUUID();
      
      const { error: batchError } = await supabase
        .from('ledger_import_batches')
        .insert({
          id: batchId,
          project_id: projectId,
          file_name: file?.name || 'unknown.csv',
          file_size: file?.size,
          total_rows: parsedData.length,
          imported_rows: 0,
          imported_by: userId,
          status: 'processing',
        });

      if (batchError) {
        throw new Error(`Erro ao criar lote: ${batchError.message}`);
      }

      // Fetch existing finance_ledger data for reconciliation
      setProgressMessage('Buscando dados do webhook para reconciliação...');
      const transactionIds = parsedData.map(r => r.transaction_id);
      
      const { data: existingLedger } = await supabase
        .from('finance_ledger')
        .select('transaction_id, amount, event_type')
        .eq('project_id', projectId)
        .in('transaction_id', transactionIds);

      // Build a map of webhook net values
      const webhookNetMap = new Map<string, number>();
      if (existingLedger) {
        for (const entry of existingLedger) {
          const current = webhookNetMap.get(entry.transaction_id) || 0;
          if (['credit', 'producer'].includes(entry.event_type)) {
            webhookNetMap.set(entry.transaction_id, current + Number(entry.amount));
          } else if (['affiliate', 'coproducer', 'platform_fee', 'tax'].includes(entry.event_type)) {
            webhookNetMap.set(entry.transaction_id, current - Math.abs(Number(entry.amount)));
          }
        }
      }

      // Process in batches
      const batchSize = 100;
      const batches: ParsedLedgerRow[][] = [];
      
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (cancelImportRef.current) {
          result.errors.push('Importação cancelada pelo usuário');
          break;
        }

        const batch = batches[batchIndex];
        const batchProgress = ((batchIndex + 1) / batches.length) * 100;
        
        setProgress(batchProgress);
        setProgressMessage(`Processando lote ${batchIndex + 1} de ${batches.length}...`);

        const ledgerRows = batch.map((row, rowIndex) => {
          // Calculate totals
          result.totals.gross += row.gross_value;
          result.totals.net += row.net_value_brl;
          result.totals.platform_fees += row.platform_fee || 0;
          result.totals.affiliate_commissions += row.affiliate_commission || 0;
          result.totals.coproducer_commissions += row.coproducer_commission || 0;
          result.totals.taxes += row.taxes || 0;

          // Track date range
          if (row.sale_date) {
            const saleDate = new Date(row.sale_date);
            if (!periodStart || saleDate < periodStart) periodStart = saleDate;
            if (!periodEnd || saleDate > periodEnd) periodEnd = saleDate;
          }

          // Reconciliation check
          const webhookNet = webhookNetMap.get(row.transaction_id);
          let isReconciled = false;
          let hasDivergence = false;
          let divergenceType: string | undefined;
          let divergenceAmount: number | undefined;

          if (webhookNet !== undefined) {
            const diff = Math.abs(row.net_value_brl - webhookNet);
            const diffPct = webhookNet !== 0 ? (diff / Math.abs(webhookNet)) * 100 : 0;
            
            if (diff < 0.01 || diffPct < 0.1) {
              isReconciled = true;
              result.reconciled++;
            } else {
              hasDivergence = true;
              divergenceType = 'net_value';
              divergenceAmount = diff;
              result.divergent++;
              result.divergences.push({
                transaction_id: row.transaction_id,
                csv_net: row.net_value_brl,
                webhook_net: webhookNet,
                difference: row.net_value_brl - webhookNet,
                difference_pct: diffPct,
                status: 'divergent',
                divergence_type: 'net_value',
              });
            }
          } else {
            result.new_transactions++;
          }

          return {
            project_id: projectId,
            transaction_id: row.transaction_id,
            gross_value: row.gross_value,
            product_price: row.product_price,
            offer_price: row.offer_price,
            platform_fee: row.platform_fee || 0,
            affiliate_commission: row.affiliate_commission || 0,
            coproducer_commission: row.coproducer_commission || 0,
            taxes: row.taxes || 0,
            net_value: row.net_value,
            original_currency: row.original_currency || 'BRL',
            exchange_rate: row.exchange_rate || 1.0,
            net_value_brl: row.net_value_brl,
            payout_id: row.payout_id,
            payout_date: row.payout_date ? new Date(row.payout_date).toISOString().split('T')[0] : null,
            sale_date: row.sale_date,
            confirmation_date: row.confirmation_date,
            status: row.status,
            payment_method: row.payment_method,
            payment_type: row.payment_type,
            installments: row.installments,
            product_code: row.product_code,
            product_name: row.product_name,
            offer_code: row.offer_code,
            offer_name: row.offer_name,
            buyer_email: row.buyer_email,
            buyer_name: row.buyer_name,
            affiliate_code: row.affiliate_code,
            affiliate_name: row.affiliate_name,
            coproducer_name: row.coproducer_name,
            is_reconciled: isReconciled,
            reconciled_at: isReconciled ? new Date().toISOString() : null,
            reconciled_by: isReconciled ? userId : null,
            has_divergence: hasDivergence,
            divergence_type: divergenceType,
            divergence_webhook_value: webhookNet,
            divergence_csv_value: row.net_value_brl,
            divergence_amount: divergenceAmount,
            import_batch_id: batchId,
            imported_by: userId,
            source_file_name: file?.name,
            source_row_number: batchIndex * batchSize + rowIndex + 1,
            raw_csv_row: row.raw_row,
          };
        });

        // Upsert to ledger_official
        const { error: upsertError } = await supabase
          .from('ledger_official')
          .upsert(ledgerRows, {
            onConflict: 'project_id,transaction_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          result.errors.push(`Erro no lote ${batchIndex + 1}: ${upsertError.message}`);
        } else {
          result.imported += ledgerRows.length;
        }

        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Update batch with final stats
      await supabase
        .from('ledger_import_batches')
        .update({
          imported_rows: result.imported,
          skipped_rows: result.skipped,
          error_rows: result.errors.length,
          reconciled_count: result.reconciled,
          divergence_count: result.divergent,
          new_transactions_count: result.new_transactions,
          total_gross: result.totals.gross,
          total_net: result.totals.net,
          total_platform_fees: result.totals.platform_fees,
          total_affiliate_commissions: result.totals.affiliate_commissions,
          total_coproducer_commissions: result.totals.coproducer_commissions,
          total_taxes: result.totals.taxes,
          period_start: periodStart?.toISOString().split('T')[0],
          period_end: periodEnd?.toISOString().split('T')[0],
          status: 'completed',
        })
        .eq('id', batchId);

      setProgress(100);
      setProgressMessage('Importação concluída!');
      setImportResult(result);
      setActiveTab('result');

      // Log activity
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        project_id: projectId,
        action: 'ledger_csv_import',
        entity_type: 'ledger_official',
        entity_name: file?.name || 'Ledger CSV Import',
        details: {
          batch_id: batchId,
          imported: result.imported,
          reconciled: result.reconciled,
          divergent: result.divergent,
          new_transactions: result.new_transactions,
          totals: result.totals,
        },
      });

      toast({
        title: 'Importação concluída!',
        description: `${result.imported} transações importadas. ${result.reconciled} reconciliadas, ${result.divergent} com divergências.`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });

    } catch (error: any) {
      console.error('Import error:', error);
      result.errors.push(error.message);
      setImportResult(result);
      
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setFoundHeaders([]);
    setImportResult(null);
    setParseError(null);
    setActiveTab('preview');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <DollarSign className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-base">Ledger Oficial (CSV Financeiro)</CardTitle>
            <CardDescription>
              Importe o "Modelo Detalhado de Vendas" da Hotmart para fechar o financeiro
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info alert */}
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <Scale className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Reconciliação Financeira</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p><strong>Fonte oficial:</strong> CSV exportado da Hotmart com todos os valores financeiros detalhados</p>
            <p><strong>Reconciliação:</strong> Compara com dados do webhook e identifica divergências</p>
            <p><strong>Campos importados:</strong> Gross, Net, Taxa Hotmart, Afiliado, Co-produtor, Impostos, Repasse</p>
          </AlertDescription>
        </Alert>

        {/* File input */}
        {!file && (
          <div className="border-2 border-dashed border-amber-500/25 rounded-lg p-6 text-center hover:border-amber-500/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="ledger-csv-upload"
            />
            <label htmlFor="ledger-csv-upload" className="cursor-pointer space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Selecione o CSV "Modelo Detalhado de Vendas"</p>
              <p className="text-xs text-muted-foreground">Exportado de: Hotmart → Vendas → Exportar → Modelo Detalhado</p>
            </label>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao processar arquivo</AlertTitle>
            <AlertDescription className="whitespace-pre-line text-xs">{parseError}</AlertDescription>
          </Alert>
        )}

        {/* File loaded */}
        {file && parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
                  {parsedData.length} transações
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="totals">Totais</TabsTrigger>
                <TabsTrigger value="result" disabled={!importResult}>
                  Resultado
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                {/* Preview table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-muted">Transação</TableHead>
                          <TableHead className="sticky top-0 bg-muted text-right">Bruto</TableHead>
                          <TableHead className="sticky top-0 bg-muted text-right">Líquido</TableHead>
                          <TableHead className="sticky top-0 bg-muted text-right">Taxa</TableHead>
                          <TableHead className="sticky top-0 bg-muted">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.slice(0, 15).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{row.transaction_id}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(row.gross_value)}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-green-600">{formatCurrency(row.net_value_brl)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(row.platform_fee || 0)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{row.status || '-'}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {parsedData.length > 15 && (
                    <div className="p-2 bg-muted text-center text-xs text-muted-foreground">
                      Mostrando 15 de {parsedData.length} transações
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="totals" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Bruto Total</p>
                    <p className="text-lg font-bold">{formatCurrency(parsedData.reduce((s, r) => s + r.gross_value, 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <p className="text-xs text-muted-foreground">Líquido Total</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(parsedData.reduce((s, r) => s + r.net_value_brl, 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Taxa Hotmart</p>
                    <p className="text-lg font-bold">{formatCurrency(parsedData.reduce((s, r) => s + (r.platform_fee || 0), 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Afiliados</p>
                    <p className="text-lg font-bold">{formatCurrency(parsedData.reduce((s, r) => s + (r.affiliate_commission || 0), 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Co-produtores</p>
                    <p className="text-lg font-bold">{formatCurrency(parsedData.reduce((s, r) => s + (r.coproducer_commission || 0), 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Impostos</p>
                    <p className="text-lg font-bold">{formatCurrency(parsedData.reduce((s, r) => s + (r.taxes || 0), 0))}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="result" className="space-y-4">
                {importResult && (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <p className="text-xs text-muted-foreground">Importadas</p>
                        <p className="text-xl font-bold text-green-600">{importResult.imported}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        <p className="text-xs text-muted-foreground">Reconciliadas</p>
                        <p className="text-xl font-bold text-blue-600">{importResult.reconciled}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10">
                        <p className="text-xs text-muted-foreground">Divergências</p>
                        <p className="text-xl font-bold text-amber-600">{importResult.divergent}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10">
                        <p className="text-xs text-muted-foreground">Novas (sem webhook)</p>
                        <p className="text-xl font-bold text-purple-600">{importResult.new_transactions}</p>
                      </div>
                    </div>

                    {/* Divergences list */}
                    {importResult.divergences.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              {importResult.divergences.length} Divergências Encontradas
                            </span>
                            <Info className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Transação</TableHead>
                                  <TableHead className="text-right">CSV</TableHead>
                                  <TableHead className="text-right">Webhook</TableHead>
                                  <TableHead className="text-right">Diferença</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.divergences.map((d, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{d.transaction_id}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(d.csv_net)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(d.webhook_net || 0)}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={d.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {d.difference > 0 ? '+' : ''}{formatCurrency(d.difference)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erros durante importação</AlertTitle>
                        <AlertDescription>
                          <ul className="text-xs list-disc list-inside">
                            {importResult.errors.slice(0, 5).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Import progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progressMessage}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              {importing ? (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    cancelImportRef.current = true;
                    setProgressMessage('Cancelando...');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Parar
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClear}>
                    Limpar
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={importing || !projectId}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Importar Ledger Oficial
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
