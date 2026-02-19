import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ORDER_COLS = [
  'id', 'project_id', 'provider', 'provider_order_id', 'status',
  'buyer_name', 'buyer_email', 'contact_id',
  'currency', 'customer_paid', 'gross_base', 'producer_net', 'producer_net_brl',
  'platform_fee_brl', 'affiliate_brl', 'coproducer_brl', 'tax_brl',
  'payment_method', 'payment_type', 'installments',
  'ordered_at', 'approved_at', 'completed_at',
  'raw_sck', 'utm_source', 'utm_campaign', 'utm_adset', 'utm_creative', 'utm_placement',
  'meta_ad_id', 'meta_adset_id', 'meta_campaign_id',
  'ledger_status', 'raw_payload', 'created_at', 'updated_at'
]

const ITEM_COLS = [
  'id', 'order_id', 'project_id', 'product_name', 'offer_name',
  'provider_product_id', 'provider_offer_id', 'offer_mapping_id',
  'item_type', 'base_price', 'quantity',
  'funnel_id', 'funnel_position', 'metadata', 'created_at'
]

const LEDGER_COLS = [
  'id', 'project_id', 'order_id', 'event_type', 'provider',
  'amount', 'currency', 'amount_brl', 'amount_accounting', 'currency_accounting',
  'conversion_rate', 'actor', 'actor_name',
  'occurred_at', 'provider_event_id', 'source_type', 'source_origin',
  'confidence_level', 'reference_period', 'raw_payload', 'created_at'
]

function sqlVal(v: any): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'::text[]"
    const items = v.map(i => `"${String(i).replace(/"/g, '\\"').replace(/'/g, "''")}"`)
    return `'{${items.join(',')}}'::text[]`
  }
  if (typeof v === 'object') {
    const s = JSON.stringify(v).replace(/'/g, "''")
    return `'${s}'::jsonb`
  }
  const s = String(v).replace(/'/g, "''")
  return `'${s}'`
}

const PROJECTS: Record<string, string> = {
  '1e1a89a4-81d5-4aa7-8431-538828def2a3': 'Alice Salazar',
  '41f3c092-b3f4-4211-b80e-9d4e4f3a1e45': 'Leandro Lastori',
  'a59d30c7-1009-4aa2-b106-6826011466e9': 'Camila Leal',
  'ae0894d4-6212-49f5-8b87-0b5a8cc11455': 'Natalia Canezin',
  'b92c4dfd-d220-4a80-bac2-c9779a336548': 'James Olaya',
  '7f44b177-5255-4393-a648-3f0dfc681be9': 'Lilian Anacleto',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('project_id')
    const table = url.searchParams.get('table') || 'orders' // orders | order_items | ledger_events
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '500')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Summary mode
    if (!projectId) {
      const counts: any[] = []
      for (const [pid, name] of Object.entries(PROJECTS)) {
        const { count: oCount } = await supabase
          .from('orders').select('*', { count: 'exact', head: true }).eq('project_id', pid)
        const { count: lCount } = await supabase
          .from('ledger_events').select('*', { count: 'exact', head: true }).eq('project_id', pid)
        
        // order_items doesn't have project_id, count via orders
        const { data: orderIds } = await supabase
          .from('orders').select('id').eq('project_id', pid)
        let iCount = 0
        if (orderIds && orderIds.length > 0) {
          const ids = orderIds.map(o => o.id)
          // Count in batches
          for (let i = 0; i < ids.length; i += 100) {
            const batch = ids.slice(i, i + 100)
            const { count } = await supabase
              .from('order_items').select('*', { count: 'exact', head: true }).in('order_id', batch)
            iCount += (count || 0)
          }
        }

        counts.push({
          project_id: pid, name,
          orders: oCount, order_items: iCount, ledger_events: lCount,
          order_blocks: Math.ceil((oCount || 0) / 50),
          item_blocks: Math.ceil(iCount / 50),
          ledger_blocks: Math.ceil((lCount || 0) / 50),
        })
      }
      return new Response(JSON.stringify({ counts }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let columns: string[]
    let tableName: string
    let rows: any[] | null = null
    let error: any = null

    if (table === 'orders') {
      columns = ORDER_COLS
      tableName = 'orders'
      const res = await supabase.from('orders').select('*')
        .eq('project_id', projectId).order('created_at').range(offset, offset + limit - 1)
      rows = res.data; error = res.error
    } else if (table === 'order_items') {
      columns = ITEM_COLS
      tableName = 'order_items'
      // Get order IDs for this project first
      const { data: orderIds } = await supabase
        .from('orders').select('id').eq('project_id', projectId).order('created_at')
      if (orderIds && orderIds.length > 0) {
        const ids = orderIds.map(o => o.id)
        const res = await supabase.from('order_items').select('*')
          .in('order_id', ids).order('created_at').range(offset, offset + limit - 1)
        // Inject project_id into each row since source table doesn't have it
        rows = (res.data || []).map(r => ({ ...r, project_id: projectId }))
        error = res.error
      } else {
        rows = []
      }
    } else if (table === 'ledger_events') {
      columns = LEDGER_COLS
      tableName = 'ledger_events'
      const res = await supabase.from('ledger_events').select('*')
        .eq('project_id', projectId).order('created_at').range(offset, offset + limit - 1)
      rows = res.data; error = res.error
    } else {
      throw new Error(`Unknown table: ${table}`)
    }

    if (error) throw error
    if (!rows || rows.length === 0) {
      return new Response(`-- No ${tableName} found (offset=${offset})\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const inserts = rows.map(r => {
      const vals = columns.map(c => sqlVal(r[c]))
      return `(${vals.join(', ')})`
    })

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${inserts.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n`

    return new Response(sql, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })

  } catch (error: any) {
    return new Response(`-- ERROR: ${error.message}\n`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
})
