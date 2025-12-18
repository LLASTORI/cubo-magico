import { useState, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
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
  Info
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

// Hotmart CSV column mapping (Portuguese to our schema)
const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Transaction info
  'codigo da transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  'transaction': 'transaction_id',
  'transaction_id': 'transaction_id',
  
  // Dates
  'data da compra': 'sale_date',
  'data compra': 'sale_date',
  'purchase_date': 'sale_date',
  'data da confirmacao': 'confirmation_date',
  'data da confirmação': 'confirmation_date',
  'confirmation_date': 'confirmation_date',
  
  // Status
  'status': 'status',
  'status da transacao': 'status',
  'status da transação': 'status',
  
  // Buyer info
  'nome do comprador': 'buyer_name',
  'comprador': 'buyer_name',
  'buyer_name': 'buyer_name',
  'e-mail do comprador': 'buyer_email',
  'email do comprador': 'buyer_email',
  'email': 'buyer_email',
  'buyer_email': 'buyer_email',
  'telefone': 'buyer_phone',
  'telefone do comprador': 'buyer_phone',
  'buyer_phone': 'buyer_phone',
  'ddd': 'buyer_phone_ddd',
  'documento': 'buyer_document',
  'cpf': 'buyer_document',
  'buyer_document': 'buyer_document',
  
  // Address
  'cidade': 'buyer_city',
  'city': 'buyer_city',
  'estado': 'buyer_state',
  'state': 'buyer_state',
  'pais': 'buyer_country',
  'país': 'buyer_country',
  'country': 'buyer_country',
  'cep': 'buyer_cep',
  'zipcode': 'buyer_cep',
  
  // Product info
  'produto': 'product_name',
  'nome do produto': 'product_name',
  'product_name': 'product_name',
  'codigo do produto': 'product_code',
  'código do produto': 'product_code',
  'product_id': 'product_code',
  'product_code': 'product_code',
  
  // Pricing
  'valor do produto': 'product_price',
  'preco do produto': 'product_price',
  'product_price': 'product_price',
  'valor da oferta': 'offer_price',
  'offer_price': 'offer_price',
  'valor total': 'total_price',
  'total': 'total_price',
  'total_price': 'total_price',
  'valor liquido': 'net_revenue',
  'valor líquido': 'net_revenue',
  'comissao': 'net_revenue',
  'comissão': 'net_revenue',
  'net_revenue': 'net_revenue',
  
  // Offer info
  'oferta': 'offer_code',
  'codigo da oferta': 'offer_code',
  'código da oferta': 'offer_code',
  'offer_code': 'offer_code',
  
  // Payment
  'metodo de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
  'forma de pagamento': 'payment_method',
  'payment_method': 'payment_method',
  'tipo de pagamento': 'payment_type',
  'payment_type': 'payment_type',
  'parcelas': 'installment_number',
  'numero de parcelas': 'installment_number',
  'installments': 'installment_number',
  
  // Affiliate
  'afiliado': 'affiliate_name',
  'nome do afiliado': 'affiliate_name',
  'affiliate_name': 'affiliate_name',
  'codigo do afiliado': 'affiliate_code',
  'código do afiliado': 'affiliate_code',
  'affiliate_code': 'affiliate_code',
  
  // UTM
  'utm_source': 'utm_source',
  'origem': 'utm_source',
  'utm_campaign': 'utm_campaign_id',
  'campanha': 'utm_campaign_id',
  
  // Coupon
  'cupom': 'coupon',
  'coupon': 'coupon',
  'codigo do cupom': 'coupon',
  
  // Currency
  'moeda': 'product_currency',
  'currency': 'product_currency',
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

interface ParsedRow {
  transaction_id: string;
  status: string;
  buyer_email?: string;
  buyer_name?: string;
  product_name?: string;
  total_price?: number;
  sale_date?: string;
  [key: string]: any;
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export const HotmartCSVImport = () => {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const projectId = currentProject?.id;

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
    
    // Try different date formats
    const formats = [
      // DD/MM/YYYY HH:mm:ss
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // DD/MM/YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{2})-(\d{2})$/,
    ];

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
    setImportResult(null);
    setParseError(null);

    try {
      const content = await selectedFile.text();
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0 || rows.length === 0) {
        setParseError('Arquivo CSV vazio ou inválido.');
        return;
      }

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
        setParseError('Coluna "Código da transação" não encontrada. Verifique se é um CSV exportado da Hotmart.');
        return;
      }

      if (!mappedFields.includes('status')) {
        setParseError('Coluna "Status" não encontrada. Verifique se é um CSV exportado da Hotmart.');
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
            } else if (field === 'sale_date' || field === 'confirmation_date') {
              obj[field] = parseDate(value) || undefined;
            } else if (['product_price', 'offer_price', 'total_price', 'net_revenue', 'installment_number'].includes(field)) {
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
        description: `${parsed.length} vendas encontradas.`,
      });
    } catch (error: any) {
      console.error('CSV parse error:', error);
      setParseError(`Erro ao processar arquivo: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!projectId || parsedData.length === 0) return;

    setImporting(true);
    setProgress(0);
    setProgressMessage('Preparando importação...');
    setImportResult(null);

    const result: ImportResult = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchProgress = ((batchIndex + 1) / batches.length) * 100;
        
        setProgress(batchProgress);
        setProgressMessage(`Importando lote ${batchIndex + 1} de ${batches.length}...`);

        const records = batch.map(row => ({
          project_id: projectId,
          transaction_id: row.transaction_id,
          status: row.status,
          product_name: row.product_name || 'Produto Importado',
          buyer_name: row.buyer_name,
          buyer_email: row.buyer_email,
          buyer_phone: row.buyer_phone,
          buyer_phone_ddd: row.buyer_phone_ddd,
          buyer_document: row.buyer_document,
          buyer_city: row.buyer_city,
          buyer_state: row.buyer_state,
          buyer_country: row.buyer_country,
          buyer_cep: row.buyer_cep,
          product_code: row.product_code,
          product_price: row.product_price,
          offer_price: row.offer_price,
          offer_code: row.offer_code,
          total_price: row.total_price,
          net_revenue: row.net_revenue,
          sale_date: row.sale_date,
          confirmation_date: row.confirmation_date,
          payment_method: row.payment_method,
          payment_type: row.payment_type,
          installment_number: row.installment_number,
          affiliate_name: row.affiliate_name,
          affiliate_code: row.affiliate_code,
          utm_source: row.utm_source,
          utm_campaign_id: row.utm_campaign_id,
          coupon: row.coupon,
          product_currency: row.product_currency || 'BRL',
          sale_origin: 'csv_import',
          last_synced_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
          .from('hotmart_sales')
          .upsert(records, {
            onConflict: 'project_id,transaction_id',
            ignoreDuplicates: false,
          })
          .select('id');

        if (error) {
          console.error('Batch import error:', error);
          result.errors.push(`Lote ${batchIndex + 1}: ${error.message}`);
        } else {
          // Count as updated (upsert doesn't differentiate)
          result.updated += data?.length || 0;
        }

        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setProgress(100);
      setProgressMessage('Importação concluída!');
      setImportResult(result);

      toast({
        title: 'Importação concluída!',
        description: `${result.updated} vendas processadas. ${result.errors.length > 0 ? `${result.errors.length} erros.` : ''}`,
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
    setImportResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatPrice = (value: number | undefined): string => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
              Importe histórico de vendas do Hotmart via arquivo CSV
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Formato suportado</AlertTitle>
          <AlertDescription className="text-xs">
            Exporte o relatório de vendas da Hotmart no formato CSV. As colunas são detectadas automaticamente.
            Vendas com o mesmo código de transação serão atualizadas.
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
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {/* File loaded - show preview */}
        {file && parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{parsedData.length} vendas</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted">Transação</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Status</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Comprador</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Produto</TableHead>
                      <TableHead className="sticky top-0 bg-muted">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{row.transaction_id}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'APPROVED' || row.status === 'COMPLETE' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{row.buyer_name || '-'}</div>
                          <div className="text-xs text-muted-foreground">{row.buyer_email || '-'}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {row.product_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{formatPrice(row.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <div className="p-2 bg-muted text-center text-xs text-muted-foreground">
                  Mostrando 10 de {parsedData.length} vendas
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
                <AlertDescription>
                  <p>{importResult.updated} vendas processadas</p>
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
              <Button variant="outline" onClick={handleClear} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || !projectId}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {parsedData.length} vendas
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
