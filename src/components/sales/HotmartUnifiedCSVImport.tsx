/**
 * HOTMART CANONICAL CSV BACKFILL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO: Backfill oficial de vendas Hotmart via CSV
 * Trata o CSV como replay histórico de eventos de webhook.
 * 
 * PIPELINE CANÔNICO:
 * 1. Normaliza dados (PT-BR dates, locale-aware numbers)
 * 2. Resolve pedido lógico (remove C1/C2/C3 ou usa Transação Principal)
 * 3. Classifica item (main vs bump)
 * 4. Classifica status (apenas Aprovado gera evento financeiro)
 * 5. Idempotência (se provider_order_id existir → IGNORAR)
 * 6. Persistência (orders, order_items, ledger_events com source=csv)
 * 
 * CONTRATO:
 * - Webhook SEMPRE prevalece
 * - CSV cria estado inicial histórico
 * - Nunca duplica dados existentes
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

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN MAPPING - Hotmart Detailed Export
// ═══════════════════════════════════════════════════════════════════════════════

const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Transaction ID (required)
  'codigo da transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  'transacao': 'transaction_id',
  'transação': 'transaction_id',
  
  // Status
  'status da transacao': 'status',
  'status da transação': 'status',
  'status': 'status',
  
  // Dates
  'data da transacao': 'order_date',
  'data da transação': 'order_date',
  'data de venda': 'order_date',
  'confirmacao do pagamento': 'confirmation_date',
  'confirmação do pagamento': 'confirmation_date',
  
  // Product Info
  'codigo do produto': 'product_code',
  'código do produto': 'product_code',
  'produto': 'product_name',
  'nome do produto': 'product_name',
  'codigo do preco': 'offer_code',
  'código do preço': 'offer_code',
  'nome deste preco': 'offer_name',
  'nome deste preço': 'offer_name',
  
  // Financial - Customer Paid
  'valor de compra com impostos': 'customer_paid',
  'valor total': 'customer_paid',
  'preco total': 'customer_paid',
  'preço total': 'customer_paid',
  
  // Financial - Gross Base
  'valor de compra sem impostos': 'gross_base',
  'faturamento bruto sem impostos': 'gross_base',
  'faturamento bruto': 'gross_base',
  
  // Financial - Producer Net
  'faturamento liquido do a produtor a': 'producer_net',
  'faturamento líquido do(a) produtor(a)': 'producer_net',
  'faturamento liquido': 'producer_net',
  'faturamento líquido': 'producer_net',
  'valor liquido': 'producer_net',
  'valor líquido': 'producer_net',
  
  // Fees
  'taxa de processamento': 'platform_fee',
  'taxa hotmart': 'platform_fee',
  'comissao do a afiliado a': 'affiliate_commission',
  'comissão do(a) afiliado(a)': 'affiliate_commission',
  'faturamento do a coprodutor a': 'coproducer_commission',
  'faturamento do(a) coprodutor(a)': 'coproducer_commission',
  'impostos locais': 'local_taxes',
  'taxa de parcelamento': 'installment_fee',
  
  // Currency
  'moeda de compra': 'currency',
  'moeda de recebimento': 'receive_currency',
  'taxa de conversao moeda de compra': 'exchange_rate',
  'taxa de conversão (moeda de compra)': 'exchange_rate',
  
  // Payment
  'metodo de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
  'tipo de cobranca': 'payment_type',
  'tipo de cobrança': 'payment_type',
  'quantidade total de parcelas': 'installments',
  
  // Buyer Info
  'comprador a': 'buyer_name',
  'comprador(a)': 'buyer_name',
  'email do a comprador a': 'buyer_email',
  'email do(a) comprador(a)': 'buyer_email',
  'telefone': 'buyer_phone',
  'documento': 'buyer_document',
  'pais': 'buyer_country',
  'país': 'buyer_country',
  
  // Tracking/Attribution
  'codigo sck': 'raw_sck',
  'código sck': 'raw_sck',
  'codigo src': 'src_code',
  'código src': 'src_code',
  'canal usado para venda': 'sales_channel',
  
  // Item Classification
  'ferramenta de venda': 'item_type_raw',
  'transacao do produto principal': 'parent_transaction',
  'transação do produto principal': 'parent_transaction',
  
  // Affiliate
  'nome do a afiliado a': 'affiliate_name',
  'nome do(a) afiliado(a)': 'affiliate_name',
};

// Status mapping - only 'Aprovado' is financially effective
const STATUS_MAP: Record<string, { normalized: string; isFinancial: boolean }> = {
  'aprovado': { normalized: 'approved', isFinancial: true },
  'aprovada': { normalized: 'approved', isFinancial: true },
  'completo': { normalized: 'completed', isFinancial: true },
  'completa': { normalized: 'completed', isFinancial: true },
  'cancelado': { normalized: 'cancelled', isFinancial: false },
  'cancelada': { normalized: 'cancelled', isFinancial: false },
  'expirado': { normalized: 'expired', isFinancial: false },
  'expirada': { normalized: 'expired', isFinancial: false },
  'atrasado': { normalized: 'overdue', isFinancial: false },
  'atrasada': { normalized: 'overdue', isFinancial: false },
  'reembolsado': { normalized: 'refunded', isFinancial: false },
  'reembolsada': { normalized: 'refunded', isFinancial: false },
  'estornado': { normalized: 'refunded', isFinancial: false },
  'estornada': { normalized: 'refunded', isFinancial: false },
  'pendente': { normalized: 'pending', isFinancial: false },
  'aguardando pagamento': { normalized: 'pending', isFinancial: false },
};

// Item type classification from 'Ferramenta de Venda' column
const ITEM_TYPE_MAP: Record<string, string> = {
  'produto principal': 'main',
  'produto order bump': 'bump',
  'order bump': 'bump',
  'upsell': 'upsell',
  'downsell': 'downsell',
};

interface ParsedCSVRow {
  transaction_id: string;
  logical_order_id: string; // Resolved from C1/C2 or parent_transaction
  status: string;
  is_financial: boolean;
  order_date: Date | null;
  confirmation_date: Date | null;
  
  // Product
  product_code: string;
  product_name: string;
  offer_code: string;
  offer_name: string;
  item_type: string; // main, bump, upsell
  
  // Financial
  customer_paid: number;
  gross_base: number;
  producer_net: number;
  platform_fee: number;
  affiliate_commission: number;
  coproducer_commission: number;
  local_taxes: number;
  installment_fee: number;
  currency: string;
  
  // Payment
  payment_method: string;
  payment_type: string;
  installments: number;
  
  // Buyer
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_document: string;
  buyer_country: string;
  
  // Attribution (parsed from SCK)
  raw_sck: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  
  // Affiliate
  affiliate_name: string;
}

interface LogicalOrder {
  logical_order_id: string;
  items: ParsedCSVRow[];
  main_item: ParsedCSVRow | null;
  total_customer_paid: number;
  total_producer_net: number;
  status: string;
  is_financial: boolean;
}

interface ImportSummary {
  totalRows: number;
  ordersCreated: number;
  ordersSkipped: number;
  itemsCreated: number;
  ledgerEventsCreated: number;
  contactsEnriched: number;
  contactsCreated: number;
  errors: string[];
}

export function HotmartUnifiedCSVImport() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const projectId = currentProject?.id;

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  const normalizeColumn = (col: string): string => {
    return col.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
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
        } else if (char === '\t' || char === ',' || char === ';') {
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

  // Parse PT-BR number format: 1.234,56 → 1234.56
  const parseNumber = (value: string): number => {
    if (!value || value === '(none)') return 0;
    
    let cleaned = value
      .replace(/[R$€$\s]/g, '')
      .trim();
    
    // Detect format: if last separator is comma and has 2 digits after → PT-BR
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // PT-BR format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Parse PT-BR date format: DD/MM/YYYY HH:mm:ss
  const parseDate = (value: string): Date | null => {
    if (!value || value === '(none)') return null;
    
    // Format: DD/MM/YYYY HH:mm:ss
    const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2}):?(\d{2})?/);
    if (match) {
      const [, day, month, year, hour, min, sec = '0'] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      );
    }
    
    // Fallback: DD/MM/YYYY
    const dateOnlyMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  };

  // Parse SCK to UTMs (same logic as webhook)
  const parseSCKtoUTMs = (sck: string): {
    utm_source: string | null;
    utm_campaign: string | null;
    utm_adset: string | null;
    utm_placement: string | null;
    utm_creative: string | null;
    meta_campaign_id: string | null;
    meta_adset_id: string | null;
    meta_ad_id: string | null;
  } => {
    const result = {
      utm_source: null as string | null,
      utm_campaign: null as string | null,
      utm_adset: null as string | null,
      utm_placement: null as string | null,
      utm_creative: null as string | null,
      meta_campaign_id: null as string | null,
      meta_adset_id: null as string | null,
      meta_ad_id: null as string | null,
    };
    
    if (!sck || sck === '(none)') return result;
    
    const parts = sck.split('|').map(p => p.trim());
    
    // parts[0] = utm_source
    if (parts.length >= 1 && parts[0]) result.utm_source = parts[0];
    
    // parts[1] = utm_adset (with meta_adset_id)
    if (parts.length >= 2 && parts[1]) {
      result.utm_adset = parts[1];
      const match = parts[1].match(/_(\d{10,})$/);
      if (match) result.meta_adset_id = match[1];
    }
    
    // parts[2] = utm_campaign (with meta_campaign_id)
    if (parts.length >= 3 && parts[2]) {
      result.utm_campaign = parts[2];
      const match = parts[2].match(/_(\d{10,})$/);
      if (match) result.meta_campaign_id = match[1];
    }
    
    // parts[3] = utm_placement
    if (parts.length >= 4 && parts[3]) result.utm_placement = parts[3];
    
    // parts[4] = utm_creative (with meta_ad_id)
    if (parts.length >= 5 && parts[4]) {
      result.utm_creative = parts[4];
      const match = parts[4].match(/_(\d{10,})$/);
      if (match) result.meta_ad_id = match[1];
    }
    
    return result;
  };

  // Resolve logical order ID: remove C1/C2/C3 suffix OR use parent_transaction
  const resolveLogicalOrderId = (transactionId: string, parentTransaction: string): string => {
    // If parent_transaction exists and is not (none), use it
    if (parentTransaction && parentTransaction !== '(none)') {
      return parentTransaction;
    }
    
    // Otherwise, remove C1/C2/C3 suffix from transaction_id
    return transactionId.replace(/C\d+$/i, '');
  };

  // Classify item type from 'Ferramenta de Venda' column
  const classifyItemType = (rawType: string, parentTransaction: string, transactionId: string): string => {
    const normalized = rawType?.toLowerCase()?.trim() || '';
    
    // Direct mapping
    if (ITEM_TYPE_MAP[normalized]) {
      return ITEM_TYPE_MAP[normalized];
    }
    
    // Heuristic: if has parent_transaction and it's different → bump
    if (parentTransaction && parentTransaction !== '(none)' && parentTransaction !== transactionId) {
      return 'bump';
    }
    
    // Default to main
    return 'main';
  };

  const detectHotmartCSV = (headers: string[]): boolean => {
    const normalized = headers.map(h => normalizeColumn(h));
    const hotmartSignals = [
      'codigo da transacao', 'status da transacao', 'faturamento liquido',
      'codigo sck', 'ferramenta de venda', 'transacao do produto principal'
    ];
    const matchCount = hotmartSignals.filter(s => 
      normalized.some(h => h.includes(s))
    ).length;
    return matchCount >= 2;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

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
          'Este arquivo não parece ser o CSV "Detalhado de Vendas" da Hotmart.\n\n' +
          'Exporte o relatório completo diretamente do painel da Hotmart.'
        );
        return;
      }

      // Map columns by index
      const mapping: Record<number, string> = {};
      headers.forEach((header, index) => {
        const normalized = normalizeColumn(header);
        const mappedField = HOTMART_COLUMN_MAP[normalized];
        if (mappedField) {
          mapping[index] = mappedField;
        }
      });

      // Validate required column
      if (!Object.values(mapping).includes('transaction_id')) {
        setValidationError('Coluna obrigatória "Código da transação" não encontrada.');
        return;
      }

      // Parse data rows
      const rows: ParsedCSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const raw: Record<string, string> = {};

        Object.entries(mapping).forEach(([colIndex, field]) => {
          const value = line[parseInt(colIndex)] || '';
          raw[field] = value;
        });

        if (!raw.transaction_id) continue;

        // Parse status
        const rawStatus = (raw.status || '').toLowerCase().trim();
        const statusInfo = STATUS_MAP[rawStatus] || { normalized: rawStatus, isFinancial: false };
        
        // Parse UTMs from SCK
        const utms = parseSCKtoUTMs(raw.raw_sck || '');
        
        // Resolve logical order ID
        const logicalOrderId = resolveLogicalOrderId(
          raw.transaction_id.trim(),
          raw.parent_transaction || ''
        );
        
        // Classify item type
        const itemType = classifyItemType(
          raw.item_type_raw || '',
          raw.parent_transaction || '',
          raw.transaction_id.trim()
        );

        rows.push({
          transaction_id: raw.transaction_id.trim(),
          logical_order_id: logicalOrderId,
          status: statusInfo.normalized,
          is_financial: statusInfo.isFinancial,
          order_date: parseDate(raw.order_date || ''),
          confirmation_date: parseDate(raw.confirmation_date || ''),
          
          product_code: raw.product_code || '',
          product_name: raw.product_name || '',
          offer_code: raw.offer_code || '',
          offer_name: raw.offer_name || '',
          item_type: itemType,
          
          customer_paid: parseNumber(raw.customer_paid || ''),
          gross_base: parseNumber(raw.gross_base || ''),
          producer_net: parseNumber(raw.producer_net || ''),
          platform_fee: parseNumber(raw.platform_fee || ''),
          affiliate_commission: parseNumber(raw.affiliate_commission || ''),
          coproducer_commission: parseNumber(raw.coproducer_commission || ''),
          local_taxes: parseNumber(raw.local_taxes || ''),
          installment_fee: parseNumber(raw.installment_fee || ''),
          currency: raw.currency || 'BRL',
          
          payment_method: raw.payment_method || '',
          payment_type: raw.payment_type || '',
          installments: parseInt(raw.installments || '1') || 1,
          
          buyer_name: raw.buyer_name || '',
          buyer_email: (raw.buyer_email || '').toLowerCase().trim(),
          buyer_phone: raw.buyer_phone || '',
          buyer_document: raw.buyer_document || '',
          buyer_country: raw.buyer_country || 'Brasil',
          
          raw_sck: raw.raw_sck || '',
          ...utms,
          
          affiliate_name: raw.affiliate_name || '',
        });
      }

      if (rows.length === 0) {
        setValidationError('Nenhuma transação válida encontrada no arquivo.');
        return;
      }

      setParsedData(rows);

      toast({
        title: 'Arquivo carregado!',
        description: `${rows.length.toLocaleString()} transações prontas para importar.`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setValidationError('Erro ao processar o arquivo.');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CANONICAL IMPORT - Write to orders, order_items, ledger_events
  // ═══════════════════════════════════════════════════════════════════════════

  const handleImport = async () => {
    if (!projectId || !user || parsedData.length === 0) return;

    cancelRef.current = false;
    setImporting(true);
    setProgress(0);
    setProgressMessage('Analisando dados...');
    setSummary(null);

    const result: ImportSummary = {
      totalRows: parsedData.length,
      ordersCreated: 0,
      ordersSkipped: 0,
      itemsCreated: 0,
      ledgerEventsCreated: 0,
      contactsEnriched: 0,
      contactsCreated: 0,
      errors: [],
    };

    try {
      // Step 1: Group rows by logical_order_id
      setProgressMessage('Agrupando pedidos...');
      const orderGroups = new Map<string, LogicalOrder>();
      
      for (const row of parsedData) {
        if (!orderGroups.has(row.logical_order_id)) {
          orderGroups.set(row.logical_order_id, {
            logical_order_id: row.logical_order_id,
            items: [],
            main_item: null,
            total_customer_paid: 0,
            total_producer_net: 0,
            status: row.status,
            is_financial: row.is_financial,
          });
        }
        
        const order = orderGroups.get(row.logical_order_id)!;
        order.items.push(row);
        order.total_customer_paid += row.customer_paid;
        order.total_producer_net += row.producer_net;
        
        if (row.item_type === 'main') {
          order.main_item = row;
        }
        
        // Order is financial if any item is financial
        if (row.is_financial) {
          order.is_financial = true;
          order.status = 'approved';
        }
      }

      // Step 2: Check existing orders (webhook prevails)
      setProgressMessage('Verificando pedidos existentes...');
      const logicalOrderIds = Array.from(orderGroups.keys());
      
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('provider_order_id')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .in('provider_order_id', logicalOrderIds);
      
      const existingOrderIds = new Set(existingOrders?.map(o => o.provider_order_id) || []);

      // Step 3: Get existing contacts
      setProgressMessage('Verificando contatos...');
      const emails = [...new Set(parsedData.filter(r => r.buyer_email).map(r => r.buyer_email))];
      
      const { data: existingContacts } = await supabase
        .from('crm_contacts')
        .select('id, email, name, phone')
        .eq('project_id', projectId)
        .in('email', emails);
      
      const contactMap = new Map(existingContacts?.map(c => [c.email, c]) || []);

      // Step 4: Process orders in batches
      const ordersArray = Array.from(orderGroups.values());
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < ordersArray.length; i += batchSize) {
        batches.push(ordersArray.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (cancelRef.current) break;

        const batch = batches[batchIndex];
        const pct = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(pct);
        setProgressMessage(`Processando lote ${batchIndex + 1} de ${batches.length}...`);

        for (const order of batch) {
          if (cancelRef.current) break;

          try {
            // Skip if order already exists (webhook prevails)
            if (existingOrderIds.has(order.logical_order_id)) {
              result.ordersSkipped++;
              continue;
            }

            const mainItem = order.main_item || order.items[0];
            if (!mainItem) continue;

            // Find or create contact
            let contactId: string | null = null;
            if (mainItem.buyer_email) {
              const existingContact = contactMap.get(mainItem.buyer_email);
              
              if (existingContact) {
                contactId = existingContact.id;
                
                // Enrich null fields
                const updates: Record<string, string> = {};
                if (!existingContact.name && mainItem.buyer_name) updates.name = mainItem.buyer_name;
                if (!existingContact.phone && mainItem.buyer_phone) updates.phone = mainItem.buyer_phone;
                
                if (Object.keys(updates).length > 0) {
                  await supabase
                    .from('crm_contacts')
                    .update(updates)
                    .eq('id', existingContact.id);
                  result.contactsEnriched++;
                }
              } else {
                // Create new contact
                const { data: newContact } = await supabase
                  .from('crm_contacts')
                  .insert({
                    project_id: projectId,
                    email: mainItem.buyer_email,
                    name: mainItem.buyer_name,
                    phone: mainItem.buyer_phone,
                    source: 'csv_import',
                    status: 'customer',
                  })
                  .select('id, email, name, phone')
                  .single();

                if (newContact) {
                  contactId = newContact.id;
                  contactMap.set(mainItem.buyer_email, newContact);
                  result.contactsCreated++;

                  // Create identity event
                  await supabase
                    .from('contact_identity_events')
                    .insert({
                      project_id: projectId,
                      contact_id: newContact.id,
                      source_type: 'csv_import',
                      source_name: 'Hotmart CSV Backfill',
                      field_name: 'email',
                      field_value: mainItem.buyer_email,
                      is_declared: true,
                    });
                }
              }
            }

            // Create ORDER
            const { data: createdOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                project_id: projectId,
                provider: 'hotmart',
                provider_order_id: order.logical_order_id,
                buyer_email: mainItem.buyer_email,
                buyer_name: mainItem.buyer_name,
                contact_id: contactId,
                status: order.status,
                currency: mainItem.currency,
                customer_paid: order.is_financial ? order.total_customer_paid : null,
                gross_base: order.is_financial ? order.items.reduce((sum, i) => sum + i.gross_base, 0) : null,
                producer_net: order.is_financial ? order.total_producer_net : null,
                ordered_at: mainItem.order_date?.toISOString(),
                approved_at: mainItem.confirmation_date?.toISOString(),
                payment_method: mainItem.payment_method,
                payment_type: mainItem.payment_type,
                installments: mainItem.installments,
                // Attribution
                raw_sck: mainItem.raw_sck,
                utm_source: mainItem.utm_source,
                utm_campaign: mainItem.utm_campaign,
                utm_adset: mainItem.utm_adset,
                utm_placement: mainItem.utm_placement,
                utm_creative: mainItem.utm_creative,
                meta_campaign_id: mainItem.meta_campaign_id,
                meta_adset_id: mainItem.meta_adset_id,
                meta_ad_id: mainItem.meta_ad_id,
                raw_payload: { source: 'csv', imported_by: user.id, imported_at: new Date().toISOString() },
              })
              .select('id')
              .single();

            if (orderError) {
              if (orderError.code === '23505') {
                result.ordersSkipped++;
              } else {
                result.errors.push(`Order ${order.logical_order_id}: ${orderError.message}`);
              }
              continue;
            }

            result.ordersCreated++;
            const orderId = createdOrder.id;

            // Create ORDER_ITEMS for each product in the order
            for (const item of order.items) {
              const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                  order_id: orderId,
                  provider_product_id: item.product_code,
                  provider_offer_id: item.offer_code,
                  product_name: item.product_name,
                  offer_name: item.offer_name,
                  item_type: item.item_type,
                  funnel_position: item.item_type === 'main' ? 'front' : 'middle',
                  base_price: item.gross_base,
                  quantity: 1,
                  metadata: { source: 'csv', transaction_id: item.transaction_id },
                });

              if (!itemError) {
                result.itemsCreated++;
              } else if (itemError.code !== '23505') {
                result.errors.push(`Item ${item.transaction_id}: ${itemError.message}`);
              }
            }

            // Create LEDGER_EVENTS only for financially effective orders
            if (order.is_financial) {
              for (const item of order.items) {
                if (!item.is_financial) continue;

                // Sale event (positive)
                const saleEventId = `csv_sale_${item.transaction_id}`;
                const { error: saleError } = await supabase
                  .from('ledger_events')
                  .insert({
                    order_id: orderId,
                    project_id: projectId,
                    provider: 'hotmart',
                    event_type: 'sale',
                    actor: 'producer',
                    amount: item.gross_base,
                    currency: item.currency,
                    provider_event_id: saleEventId,
                    occurred_at: item.confirmation_date?.toISOString() || item.order_date?.toISOString(),
                    raw_payload: { source: 'csv', transaction_id: item.transaction_id },
                  });

                if (!saleError) result.ledgerEventsCreated++;

                // Platform fee (negative)
                if (item.platform_fee > 0) {
                  const { error: feeError } = await supabase
                    .from('ledger_events')
                    .insert({
                      order_id: orderId,
                      project_id: projectId,
                      provider: 'hotmart',
                      event_type: 'platform_fee',
                      actor: 'platform',
                      actor_name: 'Hotmart',
                      amount: -item.platform_fee,
                      currency: item.currency,
                      provider_event_id: `csv_fee_${item.transaction_id}`,
                      occurred_at: item.confirmation_date?.toISOString() || item.order_date?.toISOString(),
                      raw_payload: { source: 'csv' },
                    });
                  if (!feeError) result.ledgerEventsCreated++;
                }

                // Affiliate commission (negative)
                if (item.affiliate_commission > 0) {
                  const { error: affError } = await supabase
                    .from('ledger_events')
                    .insert({
                      order_id: orderId,
                      project_id: projectId,
                      provider: 'hotmart',
                      event_type: 'affiliate',
                      actor: 'affiliate',
                      actor_name: item.affiliate_name || null,
                      amount: -item.affiliate_commission,
                      currency: item.currency,
                      provider_event_id: `csv_aff_${item.transaction_id}`,
                      occurred_at: item.confirmation_date?.toISOString() || item.order_date?.toISOString(),
                      raw_payload: { source: 'csv' },
                    });
                  if (!affError) result.ledgerEventsCreated++;
                }

                // Coproducer (negative)
                if (item.coproducer_commission > 0) {
                  const { error: coError } = await supabase
                    .from('ledger_events')
                    .insert({
                      order_id: orderId,
                      project_id: projectId,
                      provider: 'hotmart',
                      event_type: 'coproducer',
                      actor: 'coproducer',
                      amount: -item.coproducer_commission,
                      currency: item.currency,
                      provider_event_id: `csv_copro_${item.transaction_id}`,
                      occurred_at: item.confirmation_date?.toISOString() || item.order_date?.toISOString(),
                      raw_payload: { source: 'csv' },
                    });
                  if (!coError) result.ledgerEventsCreated++;
                }

                // Taxes (negative)
                if (item.local_taxes > 0) {
                  const { error: taxError } = await supabase
                    .from('ledger_events')
                    .insert({
                      order_id: orderId,
                      project_id: projectId,
                      provider: 'hotmart',
                      event_type: 'tax',
                      actor: 'tax_authority',
                      amount: -item.local_taxes,
                      currency: item.currency,
                      provider_event_id: `csv_tax_${item.transaction_id}`,
                      occurred_at: item.confirmation_date?.toISOString() || item.order_date?.toISOString(),
                      raw_payload: { source: 'csv' },
                    });
                  if (!taxError) result.ledgerEventsCreated++;
                }
              }
            }

          } catch (error) {
            result.errors.push(`${order.logical_order_id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }

      setSummary(result);
      setProgress(100);
      setProgressMessage('Importação concluída!');

      toast({
        title: '✅ Backfill concluído!',
        description: `${result.ordersCreated} pedidos criados, ${result.itemsCreated} itens, ${result.ledgerEventsCreated} eventos financeiros.`,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Importar Histórico da Hotmart
              <Badge variant="outline" className="text-xs">Uma vez</Badge>
            </CardTitle>
            <CardDescription>
              Usado uma única vez para importar vendas passadas antes do webhook
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Backfill Canônico:</strong> O CSV será tratado como replay histórico de eventos.
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Cria pedidos, itens e eventos financeiros <strong>reais</strong></li>
              <li>Vendas já recebidas via webhook são <strong>ignoradas</strong></li>
              <li>Contatos são enriquecidos automaticamente</li>
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
            <p className="text-sm text-muted-foreground mt-1">CSV "Detalhado de Vendas" da Hotmart</p>
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
                <Sparkles className="h-4 w-4 mr-2" />
                Executar Backfill
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
              <span className="font-semibold">Backfill concluído com sucesso</span>
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
                  <span className="text-sm">Pedidos criados</span>
                </div>
                <Badge className="bg-emerald-600">{summary.ordersCreated.toLocaleString()}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Já existiam (webhook)</span>
                </div>
                <Badge variant="outline">{summary.ordersSkipped.toLocaleString()}</Badge>
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

              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Itens + Eventos financeiros</span>
                </div>
                <Badge className="bg-amber-600">
                  {(summary.itemsCreated + summary.ledgerEventsCreated).toLocaleString()}
                </Badge>
              </div>
            </div>

            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                Dados históricos integrados. Webhooks futuros atualizarão normalmente.
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
