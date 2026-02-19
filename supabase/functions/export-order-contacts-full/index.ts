import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ALL columns from crm_contacts in ordinal order
const COLUMNS = [
  'id', 'project_id', 'email', 'name', 'phone', 'phone_ddd', 'document',
  'instagram', 'address', 'address_number', 'address_complement',
  'neighborhood', 'city', 'state', 'country', 'cep',
  'source', 'status',
  'first_utm_source', 'first_utm_campaign', 'first_utm_medium', 'first_utm_content',
  'first_utm_term', 'first_utm_adset', 'first_utm_ad',
  'tags', 'custom_fields',
  'total_purchases', 'total_revenue',
  'first_purchase_at', 'last_purchase_at', 'first_seen_at', 'last_activity_at',
  'created_at', 'updated_at',
  'first_utm_creative', 'first_utm_placement', 'first_page_name',
  'pipeline_stage_id', 'notes',
  'first_meta_campaign_id', 'first_meta_adset_id', 'first_meta_ad_id',
  'recovery_stage_id', 'recovery_started_at', 'recovery_updated_at',
  'phone_country_code', 'avatar_url', 'document_encrypted',
  'last_product_name', 'last_product_code', 'last_offer_code', 'last_offer_name',
  'products_purchased', 'subscription_status', 'has_pending_payment',
  'last_transaction_status', 'first_name', 'last_name', 'user_id', 'is_team_member'
]

// Columns that have FK constraints and may not exist in destination
const FK_COLUMNS_TO_NULL = ['pipeline_stage_id', 'recovery_stage_id']

function sqlVal(v: any, colName: string): string {
  // Null out FK columns that reference tables not yet migrated
  if (FK_COLUMNS_TO_NULL.includes(colName) && v !== null && v !== undefined) {
    return 'NULL'
  }
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'::text[]"
    const items = v.map(i => `"${String(i).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "''")}"`)
    return `'{${items.join(',')}}'::text[]`
  }
  if (typeof v === 'object') {
    const s = JSON.stringify(v).replace(/'/g, "''")
    return `'${s}'::jsonb`
  }
  const s = String(v).replace(/'/g, "''")
  return `'${s}'`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('project_id')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!projectId) {
      return new Response('-- Missing project_id\n', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Step 1: Get ALL unique contact_ids from orders for this project
    const { data: orderContacts, error: oErr } = await supabase
      .from('orders')
      .select('contact_id')
      .eq('project_id', projectId)

    if (oErr) throw oErr

    const uniqueIds = [...new Set((orderContacts || []).map(o => o.contact_id).filter(Boolean))]
    uniqueIds.sort() // deterministic ordering

    if (uniqueIds.length === 0) {
      return new Response(`-- No order contact_ids found\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Step 2: Paginate through the unique IDs
    const batch = uniqueIds.slice(offset, offset + limit)

    if (batch.length === 0) {
      return new Response(`-- DONE! No more contacts (offset=${offset}, total_unique=${uniqueIds.length})\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Step 3: Fetch these contacts with ALL fields
    const { data: rows, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .in('id', batch)

    if (error) throw error
    if (!rows || rows.length === 0) {
      return new Response(`-- No contacts found for batch (offset=${offset})\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Step 4: Generate INSERT with ALL columns
    const inserts = rows.map(r => {
      const vals = COLUMNS.map(c => sqlVal((r as any)[c], c))
      return `(${vals.join(', ')})`
    })

    const nextOffset = offset + limit
    const hasMore = nextOffset < uniqueIds.length

    let sql = `-- Order-referenced contacts FULL export (offset=${offset}, batch=${rows.length}, total_unique=${uniqueIds.length})\n`
    sql += `-- Next: offset=${nextOffset}${hasMore ? '' : ' (LAST BATCH)'}\n`
    sql += `INSERT INTO crm_contacts (${COLUMNS.join(', ')}) VALUES\n`
    sql += inserts.join(',\n')
    sql += `\nON CONFLICT (id) DO NOTHING;\n`

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
