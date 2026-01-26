/**
 * HOTMART UNIFIED CSV IMPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UMA ÚNICA EXPERIÊNCIA DE IMPORTAÇÃO:
 * - O usuário importa o CSV completo da Hotmart
 * - O sistema decide automaticamente o que fazer com cada linha
 * 
 * PIPELINE AUTOMÁTICO:
 * 1. HISTÓRICO: Se transaction_id NÃO existir em orders → sales_history_orders
 * 2. CRM: Upsert contato por email (campos nulos apenas)
 * 3. FINANCEIRO: Se NÃO existir ledger_event → ledger_official (auditoria)
 * 
 * CONTRATO INEGOCIÁVEL:
 * - NUNCA altera ledger_events
 * - NUNCA altera orders existentes
 * - NUNCA altera order_items
 * - Webhook continua soberano
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
  History,
  Users,
  FileCheck,
  Sparkles
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

// Unified column mapping for Hotmart CSVs (both models)
const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Transaction ID (required)
  'transacao': 'transaction_id',
  'transação': 'transaction_id',
  'transaction': 'transaction_id',
  'transaction_id': 'transaction_id',
  'codigo da transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  
  // Status
  'status': 'status',
  'situacao': 'status',
  'situação': 'status',
  
  // Buyer info
  'nome': 'buyer_name',
  'nome do comprador': 'buyer_name',
  'comprador': 'buyer_name',
  'email': 'buyer_email',
  'e-mail': 'buyer_email',
  'email do comprador': 'buyer_email',
  'e-mail do comprador': 'buyer_email',
  'ddd': 'buyer_phone_ddd',
  'telefone': 'buyer_phone',
  'telefone do comprador': 'buyer_phone',
  'instagram': 'buyer_instagram',
  'documento': 'buyer_document',
  'cpf': 'buyer_document',
  
  // Financial values
  'preco total': 'gross_value',
  'preço total': 'gross_value',
  'valor bruto': 'gross_value',
  'valor total': 'gross_value',
  'total': 'gross_value',
  
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
  'valor coprodutor': 'coproducer_commission',
  
  'impostos': 'taxes',
  'imposto': 'taxes',
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
  'data da confirmacao': 'confirmation_date',
  'data da confirmação': 'confirmation_date',
  
  // Payment
  'meio de pagamento': 'payment_method',
  'forma de pagamento': 'payment_method',
  'metodo de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
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
  'nome da oferta': 'offer_name',
  'codigo de oferta': 'offer_code',
  'código de oferta': 'offer_code',
  'oferta': 'offer_code',
  
  // Affiliate
  'nome do afiliado': 'affiliate_name',
  'afiliado': 'affiliate_name',
  'codigo do afiliado': 'affiliate_code',
  'código do afiliado': 'affiliate_code',
  'codigo da afiliacao': 'affiliate_code',
  'código da afiliação': 'affiliate_code',
  
  // Coproducer
  'nome do coprodutor': 'coproducer_name',
  'coprodutor': 'coproducer_name',
  'nome do co-produtor': 'coproducer_name',
  'co-produtor': 'coproducer_name',
  
  // Payout
  'id repasse': 'payout_id',
  'data repasse': 'payout_date',
  'data do repasse': 'payout_date',
};

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'aprovado': 'APPROVED',
  'aprovada': 'APPROVED',
  'completo': 'COMPLETE',
  'completa': 'COMPLETE',
  'cancelado': 'CANCELED',
  'cancelada': 'CANCELED',
  'estornado': 'REFUNDED',
  'estornada': 'REFUNDED',
  'reembolsado': 'REFUNDED',
  'reembolsada': 'REFUNDED',
  'expirado': 'EXPIRED',
  'expirada': 'EXPIRED',
  'pendente': 'WAITING_PAYMENT',
  'aguardando pagamento': 'WAITING_PAYMENT',
  'boleto impresso': 'BILLET_PRINTED',
  'em disputa': 'DISPUTE',
  'chargeback': 'CHARGEBACK',
  'atrasado': 'OVERDUE',
  'atrasada': 'OVERDUE',
  'approved': 'APPROVED',
  'complete': 'COMPLETE',
  'canceled': 'CANCELED',
  'refunded': 'REFUNDED',
  'expired': 'EXPIRED',
  'pending': 'WAITING_PAYMENT',
  'dispute': 'DISPUTE',
  'overdue': 'OVERDUE',
};

interface ParsedRow {
  transaction_id: string;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_phone_ddd?: string;
  buyer_instagram?: string;
  buyer_document?: string;
  order_date?: Date;
  confirmation_date?: Date;
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

interface ImportSummary {
  totalRows: number;
  historicalOrdersAdded: number;
  ordersAlreadyExist: number;
  contactsEnriched: number;
  contactsCreated: number;
  ledgerRecordsAdded: number;
  errors: string[];
}

export function HotmartUnifiedCSVImport() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const projectId = currentProject?.id;

  const normalizeColumn = (col: string): string => {
    return col.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]/g, ' ')
      .trim();
  };

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
      .replace(/[R$\s€$]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: string): Date | undefined => {
    if (!value) return undefined;
    
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2}):?(\d{2})?/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?:?(\d{2})?/,
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

  const detectHotmartCSV = (headers: string[]): boolean => {
    const normalized = headers.map(h => normalizeColumn(h));
    const hotmartSignals = [
      'transacao', 'transacão', 'status', 'email', 'nome do produto',
      'valor total', 'preco total', 'preco total', 'taxa hotmart'
    ];
    const matchCount = hotmartSignals.filter(s => 
      normalized.some(h => h.includes(s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
    ).length;
    return matchCount >= 2;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSummary(null);
    setValidationError(null);
    setParsedData([]);

    try {
      const text = await selectedFile.text();
      const lines = parseCSV(text);

      if (lines.length < 2) {
        setValidationError('Arquivo vazio ou sem dados válidos.');
        return;
      }

      const headers = lines[0];
      
      // Detect if it's a Hotmart CSV
      if (!detectHotmartCSV(headers)) {
        setValidationError(
          'Este arquivo não parece ser um CSV da Hotmart.\n\n' +
          'Faça o download do relatório de vendas diretamente do painel da Hotmart.'
        );
        return;
      }

      // Map columns
      const mapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalized = normalizeColumn(header);
        const mappedField = HOTMART_COLUMN_MAP[normalized];
        if (mappedField) {
          mapping[index.toString()] = mappedField;
        }
      });

      // Validate required column
      if (!Object.values(mapping).includes('transaction_id')) {
        setValidationError('Coluna obrigatória "Transação" não encontrada.');
        return;
      }

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

        // Normalize status
        const rawStatus = (row.status || '').toLowerCase().trim();
        const normalizedStatus = STATUS_MAP[rawStatus] || row.status?.toUpperCase();

        rows.push({
          transaction_id: row.transaction_id.trim(),
          buyer_email: row.buyer_email?.toLowerCase()?.trim(),
          buyer_name: row.buyer_name?.trim(),
          buyer_phone: row.buyer_phone?.trim(),
          buyer_phone_ddd: row.buyer_phone_ddd?.trim(),
          buyer_instagram: row.buyer_instagram?.trim(),
          buyer_document: row.buyer_document?.trim(),
          order_date: parseDate(row.order_date),
          confirmation_date: parseDate(row.confirmation_date),
          product_name: row.product_name?.trim(),
          product_code: row.product_code?.trim(),
          offer_name: row.offer_name?.trim(),
          offer_code: row.offer_code?.trim(),
          gross_value: parseNumber(row.gross_value),
          platform_fee: parseNumber(row.platform_fee),
          affiliate_commission: parseNumber(row.affiliate_commission),
          coproducer_commission: parseNumber(row.coproducer_commission),
          taxes: parseNumber(row.taxes),
          net_value: parseNumber(row.net_value),
          original_currency: row.original_currency || 'BRL',
          exchange_rate: parseNumber(row.exchange_rate) || 1,
          status: normalizedStatus,
          payment_method: row.payment_method?.trim(),
          payment_type: row.payment_type?.trim(),
          installments: row.installments ? parseInt(row.installments) : undefined,
          affiliate_name: row.affiliate_name?.trim(),
          affiliate_code: row.affiliate_code?.trim(),
          coproducer_name: row.coproducer_name?.trim(),
          payout_id: row.payout_id?.trim(),
          payout_date: parseDate(row.payout_date),
        });
      }

      if (rows.length === 0) {
        setValidationError('Nenhuma transação válida encontrada no arquivo.');
        return;
      }

      setParsedData(rows);

      toast({
        title: 'Arquivo carregado!',
        description: `${rows.length} transações prontas para importar.`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setValidationError('Erro ao processar o arquivo.');
    }
  };

  const handleImport = async () => {
    if (!projectId || !user || parsedData.length === 0) return;

    cancelRef.current = false;
    setImporting(true);
    setProgress(0);
    setProgressMessage('Analisando dados...');
    setSummary(null);

    const result: ImportSummary = {
      totalRows: parsedData.length,
      historicalOrdersAdded: 0,
      ordersAlreadyExist: 0,
      contactsEnriched: 0,
      contactsCreated: 0,
      ledgerRecordsAdded: 0,
      errors: [],
    };

    try {
      // Step 1: Get existing orders (from webhook)
      setProgressMessage('Verificando pedidos existentes...');
      const transactionIds = parsedData.map(r => r.transaction_id);
      
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('provider_order_id')
        .eq('project_id', projectId)
        .in('provider_order_id', transactionIds);
      
      const existingOrderIds = new Set(existingOrders?.map(o => o.provider_order_id) || []);

      // Step 2: Get existing ledger_events
      setProgressMessage('Verificando registros financeiros...');
      const { data: existingLedger } = await supabase
        .from('ledger_events')
        .select('provider_event_id')
        .eq('project_id', projectId)
        .in('provider_event_id', transactionIds);
      
      const existingLedgerIds = new Set(existingLedger?.map(l => l.provider_event_id) || []);

      // Step 3: Get existing contacts by email
      setProgressMessage('Verificando contatos...');
      const emails = [...new Set(parsedData.filter(r => r.buyer_email).map(r => r.buyer_email!))];
      
      const { data: existingContacts } = await supabase
        .from('crm_contacts')
        .select('id, email, name, phone')
        .eq('project_id', projectId)
        .in('email', emails);
      
      const contactMap = new Map(existingContacts?.map(c => [c.email, c]) || []);

      // Step 4: Process data in batches
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (cancelRef.current) break;

        const batch = batches[batchIndex];
        const pct = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(pct);
        setProgressMessage(`Processando lote ${batchIndex + 1} de ${batches.length}...`);

        for (const row of batch) {
          if (cancelRef.current) break;

          try {
            // Pipeline 1: Historical Orders
            if (!existingOrderIds.has(row.transaction_id)) {
              const { error: historyError } = await supabase
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
                  imported_by: user.id,
                });

              if (!historyError) {
                result.historicalOrdersAdded++;
              } else if (historyError.code !== '23505') {
                // Not a duplicate error
                result.errors.push(`Histórico ${row.transaction_id}: ${historyError.message}`);
              }
            } else {
              result.ordersAlreadyExist++;
            }

            // Pipeline 2: CRM Enrichment
            if (row.buyer_email) {
              const existingContact = contactMap.get(row.buyer_email);
              
              if (existingContact) {
                // Update only null fields
                const updates: Record<string, any> = {};
                if (!existingContact.name && row.buyer_name) updates.name = row.buyer_name;
                if (!existingContact.phone && row.buyer_phone) {
                  const phone = row.buyer_phone_ddd 
                    ? `${row.buyer_phone_ddd}${row.buyer_phone}`
                    : row.buyer_phone;
                  updates.phone = phone;
                }
                
                if (Object.keys(updates).length > 0) {
                  await supabase
                    .from('crm_contacts')
                    .update(updates)
                    .eq('id', existingContact.id);
                  result.contactsEnriched++;
                }
              } else {
                // Create new contact
                const phone = row.buyer_phone_ddd 
                  ? `${row.buyer_phone_ddd}${row.buyer_phone}`
                  : row.buyer_phone;

                const { data: newContact } = await supabase
                  .from('crm_contacts')
                  .insert({
                    project_id: projectId,
                    email: row.buyer_email,
                    name: row.buyer_name,
                    phone,
                    source: 'csv_import',
                    status: 'lead',
                  })
                  .select('id, email, name, phone')
                  .single();

                if (newContact) {
                  contactMap.set(row.buyer_email, newContact);
                  result.contactsCreated++;

                  // Create identity event
                  await supabase
                    .from('contact_identity_events')
                    .insert({
                      project_id: projectId,
                      contact_id: newContact.id,
                      source_type: 'csv_import',
                      source_name: 'Hotmart CSV',
                      field_name: 'email',
                      field_value: row.buyer_email,
                      is_declared: true,
                    });
                }
              }
            }

            // Pipeline 3: Ledger Official (Audit)
            if (!existingLedgerIds.has(row.transaction_id) && row.net_value > 0) {
              const { error: ledgerError } = await supabase
                .from('ledger_official')
                .insert({
                  project_id: projectId,
                  transaction_id: row.transaction_id,
                  gross_value: row.gross_value,
                  net_value: row.net_value,
                  net_value_brl: row.net_value, // Assuming BRL for now
                  platform_fee: row.platform_fee,
                  affiliate_commission: row.affiliate_commission,
                  coproducer_commission: row.coproducer_commission,
                  taxes: row.taxes,
                  original_currency: row.original_currency,
                  exchange_rate: row.exchange_rate,
                  payout_id: row.payout_id,
                  payout_date: row.payout_date?.toISOString(),
                  sale_date: row.order_date?.toISOString(),
                  confirmation_date: row.confirmation_date?.toISOString(),
                  status: row.status,
                  product_name: row.product_name,
                  product_code: row.product_code,
                  offer_code: row.offer_code,
                  buyer_email: row.buyer_email,
                  buyer_name: row.buyer_name,
                  source: 'csv',
                });

              if (!ledgerError) {
                result.ledgerRecordsAdded++;
              } else if (ledgerError.code !== '23505') {
                result.errors.push(`Ledger ${row.transaction_id}: ${ledgerError.message}`);
              }
            }
          } catch (error) {
            result.errors.push(`${row.transaction_id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }

      setSummary(result);
      setProgress(100);
      setProgressMessage('Importação concluída!');

      toast({
        title: '✅ Importação concluída!',
        description: `${result.historicalOrdersAdded} vendas adicionadas ao histórico.`,
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
    cancelRef.current = true;
    setProgressMessage('Cancelando...');
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setSummary(null);
    setValidationError(null);
    setProgress(0);
    setProgressMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!currentProject) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Importar CSV da Hotmart</CardTitle>
            <CardDescription>
              Importação inteligente: histórico, CRM e auditoria em uma única ação
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
            O sistema analisa automaticamente cada linha e decide:
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Vendas novas vão para o <strong>histórico</strong></li>
              <li>Contatos são <strong>enriquecidos ou criados</strong></li>
              <li>Dados financeiros não duplicam o webhook</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* File Input */}
        {!file && !summary && (
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Clique para selecionar o arquivo</p>
            <p className="text-sm text-muted-foreground mt-1">CSV ou XLS da Hotmart</p>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              {validationError}
            </AlertDescription>
          </Alert>
        )}

        {/* File Selected - Ready to Import */}
        {file && parsedData.length > 0 && !importing && !summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length.toLocaleString()} transações encontradas
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Importar Agora
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Importing Progress */}
        {importing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{progressMessage}</span>
            </div>
            <Progress value={progress} />
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Summary - User Friendly */}
        {summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">CSV processado com sucesso</span>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Registros analisados</span>
                </div>
                <Badge variant="outline">{summary.totalRows.toLocaleString()}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm">Vendas adicionadas ao histórico</span>
                </div>
                <Badge className="bg-emerald-600">{summary.historicalOrdersAdded.toLocaleString()}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Vendas já existiam (webhook)</span>
                </div>
                <Badge variant="outline">{summary.ordersAlreadyExist.toLocaleString()}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Contatos enriquecidos/criados</span>
                </div>
                <Badge className="bg-blue-600">
                  {(summary.contactsEnriched + summary.contactsCreated).toLocaleString()}
                </Badge>
              </div>
            </div>

            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                Nenhum dado financeiro operacional foi alterado.
              </AlertDescription>
            </Alert>

            {summary.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {summary.errors.length} erro(s) encontrado(s). 
                  {summary.errors.length <= 3 && (
                    <ul className="list-disc list-inside mt-1">
                      {summary.errors.slice(0, 3).map((e, i) => (
                        <li key={i} className="truncate">{e}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" onClick={handleReset} className="w-full">
              Importar outro arquivo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
