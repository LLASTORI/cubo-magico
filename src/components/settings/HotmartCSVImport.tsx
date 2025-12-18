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
  ShieldCheck
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

// Hotmart CSV column mapping - EXACT column names from Hotmart export
const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Transação (campo obrigatório para identificação)
  'transacao': 'transaction_id',
  'transação': 'transaction_id',
  'transaction': 'transaction_id',
  'transaction_id': 'transaction_id',
  'codigo da transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  
  // Status (campo obrigatório)
  'status': 'status',
  
  // Dados de Contato (campos que serão ATUALIZADOS)
  'nome': 'buyer_name',
  'nome do comprador': 'buyer_name',
  'comprador': 'buyer_name',
  'buyer_name': 'buyer_name',
  'email': 'buyer_email',
  'e-mail': 'buyer_email',
  'e-mail do comprador': 'buyer_email',
  'email do comprador': 'buyer_email',
  'buyer_email': 'buyer_email',
  'ddd': 'buyer_phone_ddd',
  'telefone': 'buyer_phone',
  'telefone do comprador': 'buyer_phone',
  'buyer_phone': 'buyer_phone',
  'instagram': 'buyer_instagram',
  'documento': 'buyer_document',
  'cpf': 'buyer_document',
  'buyer_document': 'buyer_document',
  
  // Endereço (lidos para referência, não atualizados)
  'cep': 'buyer_cep',
  'zipcode': 'buyer_cep',
  'cidade': 'buyer_city',
  'city': 'buyer_city',
  'estado': 'buyer_state',
  'state': 'buyer_state',
  'bairro': 'buyer_neighborhood',
  'pais': 'buyer_country',
  'país': 'buyer_country',
  'country': 'buyer_country',
  'endereco': 'buyer_address',
  'endereço': 'buyer_address',
  'numero': 'buyer_address_number',
  'número': 'buyer_address_number',
  'complemento': 'buyer_address_complement',
  
  // Produto (lidos para referência/log)
  'nome do produto': 'product_name',
  'produto': 'product_name',
  'product_name': 'product_name',
  'codigo do produto': 'product_code',
  'código do produto': 'product_code',
  'product_id': 'product_code',
  'product_code': 'product_code',
  
  // Produtor
  'nome do produtor': 'producer_name',
  'documento do produtor': 'producer_document',
  
  // Afiliado
  'nome do afiliado': 'affiliate_name',
  'afiliado': 'affiliate_name',
  'affiliate_name': 'affiliate_name',
  'codigo da afiliacao': 'affiliate_code',
  'código da afiliação': 'affiliate_code',
  'codigo do afiliado': 'affiliate_code',
  'código do afiliado': 'affiliate_code',
  'affiliate_code': 'affiliate_code',
  
  // Pagamento
  'meio de pagamento': 'payment_method',
  'metodo de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
  'forma de pagamento': 'payment_method',
  'payment_method': 'payment_method',
  'tipo de pagamento': 'payment_type',
  'tipo pagamento oferta': 'payment_type',
  'payment_type': 'payment_type',
  'numero da parcela': 'installment_number',
  'número da parcela': 'installment_number',
  'parcelas': 'installment_number',
  'installments': 'installment_number',
  
  // Valores (lidos para referência, NÃO atualizados)
  'preco do produto': 'product_price',
  'preço do produto': 'product_price',
  'valor do produto': 'product_price',
  'product_price': 'product_price',
  'preco da oferta': 'offer_price',
  'preço da oferta': 'offer_price',
  'valor da oferta': 'offer_price',
  'offer_price': 'offer_price',
  'preco original': 'original_price',
  'preço original': 'original_price',
  'preco total': 'total_price',
  'preço total': 'total_price',
  'valor total': 'total_price',
  'total': 'total_price',
  'total_price': 'total_price',
  'preco total convertido': 'total_price_brl',
  'preço total convertido': 'total_price_brl',
  'valor que voce recebeu convertido': 'received_value',
  'valor que você recebeu convertido': 'received_value',
  'faturamento liquido': 'net_revenue',
  'faturamento líquido': 'net_revenue',
  'valor liquido': 'net_revenue',
  'valor líquido': 'net_revenue',
  'comissao': 'net_revenue',
  'comissão': 'net_revenue',
  'net_revenue': 'net_revenue',
  'taxa de cambio': 'exchange_rate',
  'taxa de câmbio': 'exchange_rate',
  'taxa de cambio real': 'exchange_rate_used',
  'taxa de câmbio real': 'exchange_rate_used',
  'taxa de cambio do valor recebido': 'exchange_rate_used',
  'taxa de câmbio do valor recebido': 'exchange_rate_used',
  
  // Datas
  'data de venda': 'sale_date',
  'data da compra': 'sale_date',
  'data compra': 'sale_date',
  'purchase_date': 'sale_date',
  'data de confirmacao': 'confirmation_date',
  'data de confirmação': 'confirmation_date',
  'data da confirmacao': 'confirmation_date',
  'data da confirmação': 'confirmation_date',
  'confirmation_date': 'confirmation_date',
  'data vencimento': 'due_date',
  'data de vencimento': 'due_date',
  
  // Oferta
  'codigo de oferta': 'offer_code',
  'código de oferta': 'offer_code',
  'oferta': 'offer_code',
  'offer_code': 'offer_code',
  
  // Origem
  'origem': 'origin',
  'origem de checkout': 'checkout_origin',
  'origem da venda': 'sale_origin',
  
  // UTM
  'utm_source': 'utm_source',
  'chave': 'utm_source', // Hotmart uses "chave" for tracking
  
  // Cupom
  'cupom': 'coupon',
  'coupon': 'coupon',
  'codigo do cupom': 'coupon',
  
  // Moeda
  'moeda': 'product_currency',
  'moeda de recebimento': 'offer_currency',
  'currency': 'product_currency',
  
  // Outros
  'recorrencia': 'recurrence',
  'recorrência': 'recurrence',
  'periodo gratis': 'free_period',
  'período grátis': 'free_period',
  'tem co-producao': 'has_coproduction',
  'tem co-produção': 'has_coproduction',
  'venda feita como': 'sold_as',
  'quantidade de itens': 'items_quantity',
  'quantidade de itensoferta de upgrade': 'items_quantity', // Hotmart concatenation bug
  'oferta de upgrade': 'is_upgrade',
  'codigo do assinante': 'subscriber_code',
  'código do assinante': 'subscriber_code',
  'nota fiscal': 'invoice_number',
  'valor do frete bruto': 'shipping_value',
};

// Status mapping from Hotmart Portuguese to our format
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
  // English versions
  'approved': 'APPROVED',
  'complete': 'COMPLETE',
  'canceled': 'CANCELED',
  'refunded': 'REFUNDED',
  'expired': 'EXPIRED',
  'pending': 'WAITING_PAYMENT',
  'dispute': 'DISPUTE',
  'overdue': 'OVERDUE',
};

// Campos de contato que serão atualizados (modo seguro)
const CONTACT_FIELDS = [
  'buyer_name',
  'buyer_email',
  'buyer_phone_ddd',
  'buyer_phone',
  'buyer_instagram',
  'buyer_document',
];

interface ParsedRow {
  transaction_id: string;
  status: string;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_phone_ddd?: string;
  buyer_instagram?: string;
  buyer_document?: string;
  product_name?: string;
  total_price?: number;
  sale_date?: string;
  [key: string]: any;
}

interface ImportResult {
  updated: number;
  skipped: number;
  notFound: number;
  errors: string[];
}

export const HotmartCSVImport = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [foundHeaders, setFoundHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const projectId = currentProject?.id;
  const userId = user?.id;

  const normalizeColumnName = (col: string): string => {
    return col.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[_-]/g, ' ')
      .trim();
  };

  const parseCSV = (content: string): { headers: string[]; rows: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    // Detect delimiter (semicolon is common in Brazilian CSVs)
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
    
    // DD/MM/YYYY format
    const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (brMatch) {
      const [, day, month, year, hour = '00', min = '00', sec = '00'] = brMatch;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
    }

    // ISO format
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (isoMatch) {
      const [, year, month, day, hour = '00', min = '00', sec = '00'] = isoMatch;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
    }

    // Try native Date parsing as fallback
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {}

    return null;
  };

  const parseNumber = (value: string): number | null => {
    if (!value) return null;
    // Handle Brazilian number format (1.234,56 → 1234.56)
    const cleaned = value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
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
        const mappedField = HOTMART_COLUMN_MAP[normalized];
        if (mappedField) {
          mapping[index.toString()] = mappedField;
        }
      });

      // Check required fields
      const mappedFields = Object.values(mapping);
      if (!mappedFields.includes('transaction_id')) {
        const foundColumnsSample = headers.slice(0, 15).join(', ');
        setParseError(
          `Coluna de transação não encontrada.\n\n` +
          `Esperado: "Transação" ou "Transacao"\n\n` +
          `Colunas encontradas: ${foundColumnsSample}${headers.length > 15 ? '...' : ''}`
        );
        return;
      }

      setColumnMapping(mapping);

      // Parse rows
      const parsed: ParsedRow[] = rows
        .filter(row => row.some(cell => cell.trim())) // Skip empty rows
        .map(row => {
          const obj: ParsedRow = { transaction_id: '', status: '' };
          
          Object.entries(mapping).forEach(([index, field]) => {
            const value = row[parseInt(index)] || '';
            
            if (field === 'status') {
              const normalizedStatus = value.toLowerCase().trim();
              obj[field] = STATUS_MAP[normalizedStatus] || value.toUpperCase();
            } else if (field === 'sale_date' || field === 'confirmation_date' || field === 'due_date') {
              obj[field] = parseDate(value) || undefined;
            } else if (['product_price', 'offer_price', 'total_price', 'net_revenue', 'installment_number', 'recurrence'].includes(field)) {
              const num = parseNumber(value);
              if (num !== null) obj[field] = num;
            } else {
              obj[field] = value || undefined;
            }
          });

          return obj;
        })
        .filter(row => row.transaction_id); // Must have transaction_id

      if (parsed.length === 0) {
        setParseError('Nenhuma venda válida encontrada no arquivo.');
        return;
      }

      setParsedData(parsed);

      toast({
        title: 'Arquivo carregado!',
        description: `${parsed.length} transações encontradas para atualização de contatos.`,
      });
    } catch (error: any) {
      console.error('CSV parse error:', error);
      setParseError(`Erro ao processar arquivo: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!projectId || parsedData.length === 0) return;

    cancelImportRef.current = false; // Reset cancel flag
    setImporting(true);
    setProgress(0);
    setProgressMessage('Preparando importação segura...');
    setImportResult(null);

    const result: ImportResult = {
      updated: 0,
      skipped: 0,
      notFound: 0,
      errors: [],
    };

    try {
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check if import was cancelled
        if (cancelImportRef.current) {
          setProgressMessage('Importação cancelada pelo usuário');
          result.errors.push('Importação cancelada pelo usuário');
          break;
        }

        const batch = batches[batchIndex];
        const batchProgress = ((batchIndex + 1) / batches.length) * 100;
        
        setProgress(batchProgress);
        setProgressMessage(`Atualizando contatos - lote ${batchIndex + 1} de ${batches.length}...`);

        // Process each record individually to check if exists
        for (const row of batch) {
          // Check cancellation inside batch loop too
          if (cancelImportRef.current) break;
          try {
            // Check if transaction exists
            const { data: existing, error: selectError } = await supabase
              .from('hotmart_sales')
              .select('id')
              .eq('project_id', projectId)
              .eq('transaction_id', row.transaction_id)
              .maybeSingle();

            if (selectError) {
              result.errors.push(`Erro ao buscar ${row.transaction_id}: ${selectError.message}`);
              continue;
            }

            if (existing) {
              // Update ONLY contact fields
              const updateData: Record<string, any> = {
                updated_at: new Date().toISOString(),
              };

              // Only add contact fields that have values
              if (row.buyer_name) updateData.buyer_name = row.buyer_name;
              if (row.buyer_email) updateData.buyer_email = row.buyer_email;
              if (row.buyer_phone_ddd) updateData.buyer_phone_ddd = row.buyer_phone_ddd;
              if (row.buyer_phone) updateData.buyer_phone = row.buyer_phone;
              if (row.buyer_instagram) updateData.buyer_instagram = row.buyer_instagram;
              if (row.buyer_document) updateData.buyer_document = row.buyer_document;

              const { data: updatedData, error: updateError } = await supabase
                .from('hotmart_sales')
                .update(updateData)
                .eq('project_id', projectId)
                .eq('transaction_id', row.transaction_id)
                .select('id');

              if (updateError) {
                result.errors.push(`Erro ao atualizar ${row.transaction_id}: ${updateError.message}`);
              } else if (updatedData && updatedData.length > 0) {
                result.updated++;
              }
            } else {
              // Transaction not found - skip (don't create new)
              result.notFound++;
            }
          } catch (err: any) {
            result.errors.push(`Erro em ${row.transaction_id}: ${err.message}`);
          }
        }

        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setProgress(100);
      setProgressMessage('Importação concluída!');
      setImportResult(result);

      // Log import activity
      if (userId && projectId) {
        await supabase.from('user_activity_logs').insert({
          user_id: userId,
          project_id: projectId,
          action: 'csv_import',
          entity_type: 'hotmart_sales',
          entity_name: file?.name || 'CSV Import',
          details: {
            mode: 'contacts_only',
            records_updated: result.updated,
            records_skipped: result.skipped,
            records_not_found: result.notFound,
            errors_count: result.errors.length,
            fields_updated: CONTACT_FIELDS,
            file_name: file?.name,
            file_size: file?.size,
          },
        });
      }

      toast({
        title: 'Importação concluída!',
        description: `${result.updated} contatos atualizados. ${result.notFound > 0 ? `${result.notFound} transações não encontradas.` : ''}`,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-base">Importar CSV</CardTitle>
            <CardDescription>
              Atualize dados de contato das vendas existentes via CSV da Hotmart
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info alert - Modo Seguro */}
        <Alert className="border-green-500/50 bg-green-500/5">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700 dark:text-green-400">Modo Seguro: Somente Contatos</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p><strong>Campos que serão atualizados:</strong> Nome, Email, DDD, Telefone, Instagram, Documento</p>
            <p><strong>Campos preservados:</strong> Todos os valores financeiros, datas e dados de vendas existentes</p>
            <p><strong>Transações não encontradas:</strong> Serão ignoradas (não criam registros novos)</p>
          </AlertDescription>
        </Alert>

        {/* File input */}
        {!file && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar arquivo CSV</p>
              <p className="text-xs text-muted-foreground">ou arraste e solte aqui</p>
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

        {/* File loaded - show preview */}
        {file && parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{parsedData.length} transações</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Contact fields info */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Campos a atualizar:</span>
              <Badge variant="outline" className="text-xs">Nome</Badge>
              <Badge variant="outline" className="text-xs">Email</Badge>
              <Badge variant="outline" className="text-xs">DDD</Badge>
              <Badge variant="outline" className="text-xs">Telefone</Badge>
              <Badge variant="outline" className="text-xs">Instagram</Badge>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted">Transação</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Nome</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Email</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{row.transaction_id}</TableCell>
                        <TableCell className="text-sm">{row.buyer_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.buyer_email || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {row.buyer_phone_ddd && row.buyer_phone 
                            ? `(${row.buyer_phone_ddd}) ${row.buyer_phone}`
                            : row.buyer_phone || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <div className="p-2 bg-muted text-center text-xs text-muted-foreground">
                  Mostrando 10 de {parsedData.length} transações
                </div>
              )}
            </div>

            {/* Import progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">{progressMessage}</p>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <Alert variant={importResult.errors.length > 0 ? 'destructive' : 'default'}>
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>Resultado da importação</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>✅ {importResult.updated} contatos atualizados</p>
                  {importResult.notFound > 0 && (
                    <p className="text-muted-foreground">⏭️ {importResult.notFound} transações não encontradas (ignoradas)</p>
                  )}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... e mais {importResult.errors.length - 5} erros</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Import button */}
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
                  Parar Importação
                </Button>
              ) : (
                <Button variant="outline" onClick={handleClear}>
                  Limpar
                </Button>
              )}
              <Button onClick={handleImport} disabled={importing || !projectId}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando contatos...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Atualizar Contatos
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
