/**
 * CSV LEDGER v2.1 IMPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CONTRATO ARQUITETURAL:
 * 1. CSV Hotmart = fonte contábil de fechamento (accounting)
 * 2. Webhook = fonte operacional (tempo real)
 * 3. CSV complementa APENAS campos ausentes no webhook (internacionais)
 * 4. Nenhum valor é estimado ou convertido manualmente
 * 
 * REGRAS DE PRECEDÊNCIA:
 * - Se já existir evento CSV para um order_id → usar valores CSV (accounting_complete)
 * - Webhook permanece como realtime (complete/partial)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  transaction_id: string;
  gross_value: number;
  net_value: number;
  net_value_brl: number;
  platform_fee?: number;
  affiliate_commission?: number;
  coproducer_commission?: number;
  taxes?: number;
  original_currency?: string;
  exchange_rate?: number;
  sale_date?: string;
  status?: string;
  buyer_email?: string;
  product_name?: string;
}

interface ImportResult {
  orders_processed: number;
  ledger_events_created: number;
  orders_updated_to_accounting_complete: number;
  errors: string[];
  totals: {
    producer_net_brl: number;
    platform_fee_brl: number;
    affiliate_brl: number;
    coproducer_brl: number;
    tax_brl: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { project_id, rows, reference_period, file_name } = await req.json() as {
      project_id: string;
      rows: CSVRow[];
      reference_period: string; // YYYY-MM-DD
      file_name?: string;
    };

    if (!project_id) {
      throw new Error('project_id é obrigatório');
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error('rows é obrigatório e deve conter transações');
    }

    if (!reference_period) {
      throw new Error('reference_period é obrigatório (YYYY-MM-DD)');
    }

    console.log(`[CSV Ledger v2.1] Iniciando import para project ${project_id}`, {
      total_rows: rows.length,
      reference_period,
      file_name,
    });

    const result: ImportResult = {
      orders_processed: 0,
      ledger_events_created: 0,
      orders_updated_to_accounting_complete: 0,
      errors: [],
      totals: {
        producer_net_brl: 0,
        platform_fee_brl: 0,
        affiliate_brl: 0,
        coproducer_brl: 0,
        tax_brl: 0,
      },
    };

    // Buscar todos os orders correspondentes
    const transactionIds = rows.map(r => r.transaction_id).filter(Boolean);
    
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, provider_order_id, ledger_status')
      .eq('project_id', project_id)
      .in('provider_order_id', transactionIds);

    if (ordersError) {
      throw new Error(`Erro ao buscar orders: ${ordersError.message}`);
    }

    // Criar mapa de transaction_id → order
    const orderMap = new Map<string, { id: string; ledger_status: string }>();
    for (const order of existingOrders || []) {
      if (order.provider_order_id) {
        orderMap.set(order.provider_order_id, {
          id: order.id,
          ledger_status: order.ledger_status || 'pending',
        });
      }
    }

    console.log(`[CSV Ledger v2.1] Orders encontrados: ${orderMap.size} de ${transactionIds.length}`);

    // Processar cada linha do CSV
    const ledgerEventsToCreate: any[] = [];
    const ordersToUpdate: { id: string; updates: any }[] = [];

    for (const row of rows) {
      if (!row.transaction_id) {
        result.errors.push('Linha sem transaction_id');
        continue;
      }

      const orderInfo = orderMap.get(row.transaction_id);
      
      if (!orderInfo) {
        // Pedido não existe no sistema - pode ser backfill histórico
        console.log(`[CSV Ledger v2.1] Order não encontrado: ${row.transaction_id}`);
        continue;
      }

      result.orders_processed++;

      // ============================================
      // REGRA: Não sobrescrever eventos de webhook
      // Apenas complementar com dados contábeis
      // ============================================

      // Verificar se já existe evento CSV para este order
      const { data: existingCsvEvents } = await supabase
        .from('ledger_events')
        .select('id')
        .eq('order_id', orderInfo.id)
        .eq('source_origin', 'csv')
        .limit(1);

      if (existingCsvEvents && existingCsvEvents.length > 0) {
        console.log(`[CSV Ledger v2.1] Eventos CSV já existem para ${row.transaction_id}, pulando`);
        continue;
      }

      // Extrair valores BRL do CSV
      const netValueBrl = row.net_value_brl || row.net_value || 0;
      const platformFeeBrl = row.platform_fee || 0;
      const affiliateBrl = row.affiliate_commission || 0;
      const coproducerBrl = row.coproducer_commission || 0;
      const taxBrl = row.taxes || 0;
      const grossBrl = row.gross_value || (netValueBrl + platformFeeBrl + affiliateBrl + coproducerBrl + taxBrl);

      // Acumular totais
      result.totals.producer_net_brl += netValueBrl;
      result.totals.platform_fee_brl += platformFeeBrl;
      result.totals.affiliate_brl += affiliateBrl;
      result.totals.coproducer_brl += coproducerBrl;
      result.totals.tax_brl += taxBrl;

      // ============================================
      // CRIAR EVENTOS LEDGER v2.1
      // source_origin = 'csv'
      // confidence_level = 'accounting'
      // ============================================

      const baseEvent = {
        project_id,
        order_id: orderInfo.id,
        provider: 'hotmart',
        source_origin: 'csv',
        confidence_level: 'accounting',
        reference_period,
        source_type: row.original_currency === 'BRL' ? 'native_brl' : 'converted',
        currency: 'BRL',
        occurred_at: row.sale_date || new Date().toISOString(),
        raw_payload: {
          source: 'csv_ledger_v21',
          transaction_id: row.transaction_id,
          file_name: file_name || 'unknown.csv',
          imported_at: new Date().toISOString(),
          original_currency: row.original_currency,
          exchange_rate: row.exchange_rate,
        },
      };

      // Timestamp único para evitar colisões
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);

      // Evento de venda (crédito)
      if (netValueBrl > 0 && grossBrl > 0) {
        ledgerEventsToCreate.push({
          ...baseEvent,
          provider_event_id: `csv_sale_${row.transaction_id}_${timestamp}_${randomSuffix}`,
          event_type: 'sale',
          actor: 'PRODUCER',
          actor_name: 'Producer (CSV)',
          amount: grossBrl,
          amount_brl: grossBrl,
          amount_accounting: row.gross_value,
          currency_accounting: row.original_currency || 'BRL',
        });
      }

      // Evento de taxa de plataforma
      if (platformFeeBrl > 0) {
        ledgerEventsToCreate.push({
          ...baseEvent,
          provider_event_id: `csv_platform_${row.transaction_id}_${timestamp}_${randomSuffix}`,
          event_type: 'platform_fee',
          actor: 'MARKETPLACE',
          actor_name: 'Hotmart (CSV)',
          amount: -platformFeeBrl,
          amount_brl: platformFeeBrl,
          amount_accounting: row.platform_fee,
          currency_accounting: row.original_currency || 'BRL',
        });
      }

      // Evento de afiliado
      if (affiliateBrl > 0) {
        ledgerEventsToCreate.push({
          ...baseEvent,
          provider_event_id: `csv_affiliate_${row.transaction_id}_${timestamp}_${randomSuffix}`,
          event_type: 'affiliate',
          actor: 'AFFILIATE',
          actor_name: row.buyer_email || 'Affiliate (CSV)',
          amount: -affiliateBrl,
          amount_brl: affiliateBrl,
          amount_accounting: row.affiliate_commission,
          currency_accounting: row.original_currency || 'BRL',
        });
      }

      // Evento de coprodução
      if (coproducerBrl > 0) {
        ledgerEventsToCreate.push({
          ...baseEvent,
          provider_event_id: `csv_coproducer_${row.transaction_id}_${timestamp}_${randomSuffix}`,
          event_type: 'coproducer',
          actor: 'CO_PRODUCER',
          actor_name: 'Co-Producer (CSV)',
          amount: -coproducerBrl,
          amount_brl: coproducerBrl,
          amount_accounting: row.coproducer_commission,
          currency_accounting: row.original_currency || 'BRL',
        });
      }

      // Evento de impostos
      if (taxBrl > 0) {
        ledgerEventsToCreate.push({
          ...baseEvent,
          provider_event_id: `csv_tax_${row.transaction_id}_${timestamp}_${randomSuffix}`,
          event_type: 'tax',
          actor: 'TAX',
          actor_name: 'Tax (CSV)',
          amount: -taxBrl,
          amount_brl: taxBrl,
          amount_accounting: row.taxes,
          currency_accounting: row.original_currency || 'BRL',
        });
      }

      // ============================================
      // ATUALIZAR ORDER COM DADOS BRL E STATUS
      // ledger_status = 'accounting_complete'
      // ============================================
      ordersToUpdate.push({
        id: orderInfo.id,
        updates: {
          producer_net_brl: netValueBrl,
          platform_fee_brl: platformFeeBrl,
          affiliate_brl: affiliateBrl,
          coproducer_brl: coproducerBrl,
          tax_brl: taxBrl,
          ledger_status: 'accounting_complete',
        },
      });
    }

    // Inserir eventos de ledger em batch
    if (ledgerEventsToCreate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < ledgerEventsToCreate.length; i += batchSize) {
        const batch = ledgerEventsToCreate.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('ledger_events')
          .insert(batch);

        if (insertError) {
          result.errors.push(`Erro ao inserir eventos batch ${i / batchSize + 1}: ${insertError.message}`);
        } else {
          result.ledger_events_created += batch.length;
        }
      }
    }

    // Atualizar orders em batch
    if (ordersToUpdate.length > 0) {
      for (const { id, updates } of ordersToUpdate) {
        const { error: updateError } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', id);

        if (updateError) {
          result.errors.push(`Erro ao atualizar order ${id}: ${updateError.message}`);
        } else {
          result.orders_updated_to_accounting_complete++;
        }
      }
    }

    console.log(`[CSV Ledger v2.1] Import concluído:`, result);

    return new Response(JSON.stringify({
      success: true,
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[CSV Ledger v2.1] Erro:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
