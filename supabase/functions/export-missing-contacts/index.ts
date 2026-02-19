import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COLUMNS = [
  'id', 'project_id', 'email', 'name', 'first_name', 'last_name',
  'phone', 'phone_country_code', 'phone_ddd', 'document', 'document_encrypted',
  'instagram', 'avatar_url', 'address', 'address_number', 'address_complement',
  'neighborhood', 'city', 'state', 'country', 'cep',
  'source', 'status', 'tags', 'notes', 'pipeline_stage_id',
  'first_utm_source', 'first_utm_campaign', 'first_utm_medium', 'first_utm_content',
  'first_utm_term', 'first_utm_adset', 'first_utm_ad', 'first_utm_creative',
  'first_utm_placement', 'first_page_name',
  'first_meta_ad_id', 'first_meta_adset_id', 'first_meta_campaign_id',
  'total_purchases', 'total_revenue', 'first_purchase_at', 'last_purchase_at',
  'first_seen_at', 'last_activity_at', 'created_at', 'updated_at',
  'custom_fields', 'has_pending_payment', 'is_team_member',
  'last_offer_code', 'last_offer_name', 'last_product_code', 'last_product_name',
  'last_transaction_status', 'products_purchased', 'subscription_status',
  'recovery_started_at', 'recovery_updated_at'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('project_id')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '200')

    if (!projectId) {
      return new Response('-- Missing project_id\n', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all unique contact_ids from orders for this project
    const { data: orderContacts, error: oErr } = await supabase
      .from('orders')
      .select('contact_id')
      .eq('project_id', projectId)

    if (oErr) throw oErr

    const uniqueIds = [...new Set((orderContacts || []).map(o => o.contact_id).filter(Boolean))]

    if (uniqueIds.length === 0) {
      return new Response(`-- No order contact_ids found\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Paginate through the unique IDs
    const batch = uniqueIds.slice(offset, offset + limit)

    if (batch.length === 0) {
      return new Response(`-- No more contacts (offset=${offset}, total unique=${uniqueIds.length})\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Fetch these contacts
    const { data: rows, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .in('id', batch)

    if (error) throw error
    if (!rows || rows.length === 0) {
      return new Response(`-- No contacts found for batch\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const inserts = rows.map(r => {
      const vals = COLUMNS.map(c => sqlVal((r as any)[c]))
      return `(${vals.join(', ')})`
    })

    const sql = `-- Order-referenced contacts batch (offset=${offset}, count=${rows.length}, total_unique=${uniqueIds.length})\nINSERT INTO crm_contacts (${COLUMNS.join(', ')}) VALUES\n${inserts.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n`

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
