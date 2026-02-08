import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Export funnels (all)
    const { data: funnels, error: fErr } = await supabase
      .from('funnels')
      .select('*')
      .order('project_id')
    
    if (fErr) throw fErr

    // Export offer_mappings in batches (bypass 1000 limit)
    let allMappings: any[] = []
    let offset = 0
    const batchSize = 500
    while (true) {
      const { data: batch, error: mErr } = await supabase
        .from('offer_mappings')
        .select('*')
        .order('id')
        .range(offset, offset + batchSize - 1)
      
      if (mErr) throw mErr
      if (!batch || batch.length === 0) break
      allMappings = allMappings.concat(batch)
      if (batch.length < batchSize) break
      offset += batchSize
    }

    // Generate INSERT SQL for funnels
    const funnelColumns = [
      'id', 'name', 'project_id', 'created_at', 'updated_at',
      'roas_target', 'campaign_name_pattern', 'funnel_type',
      'launch_start_date', 'launch_end_date', 'has_fixed_dates', 'launch_tag'
    ]

    const funnelInserts = funnels!.map(r => {
      const vals = funnelColumns.map(c => sqlVal(r[c]))
      return `(${vals.join(', ')})`
    })

    const funnelSQL = funnels!.length > 0
      ? `INSERT INTO funnels (${funnelColumns.join(', ')}) VALUES\n${funnelInserts.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n`
      : '-- No funnels to insert\n'

    // Generate INSERT SQL for offer_mappings
    const omColumns = [
      'id', 'id_produto', 'nome_produto', 'nome_oferta', 'codigo_oferta',
      'valor', 'status', 'data_ativacao', 'data_desativacao', 'id_funil',
      'anotacoes', 'created_at', 'updated_at', 'tipo_posicao', 'ordem_posicao',
      'nome_posicao', 'id_produto_visual', 'project_id', 'funnel_id', 'moeda',
      'valor_original', 'provider', 'origem'
    ]

    // Split into chunks of 100 for SQL readability
    const chunkSize = 100
    let omSQL = ''
    for (let i = 0; i < allMappings.length; i += chunkSize) {
      const chunk = allMappings.slice(i, i + chunkSize)
      const rows = chunk.map(r => {
        const vals = omColumns.map(c => sqlVal(r[c]))
        return `(${vals.join(', ')})`
      })
      omSQL += `INSERT INTO offer_mappings (${omColumns.join(', ')}) VALUES\n${rows.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n\n`
    }

    const fullSQL = `-- =============================================
-- MIGRATION SCRIPT: Operational Data Export
-- Generated: ${new Date().toISOString()}
-- Source: Lovable Cloud (Cubo Mágico)
-- =============================================
-- Funnels: ${funnels!.length} records
-- Offer Mappings: ${allMappings.length} records
-- =============================================

-- IMPORTANT: Run funnels FIRST (offer_mappings has FK to funnels)

BEGIN;

-- ============ FUNNELS ============
${funnelSQL}

-- ============ OFFER MAPPINGS ============
${omSQL}

COMMIT;
`

    return new Response(JSON.stringify({
      success: true,
      summary: {
        funnels: funnels!.length,
        offer_mappings: allMappings.length,
      },
      sql: fullSQL,
      json: {
        funnels: funnels,
        offer_mappings: allMappings,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function sqlVal(v: any): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  const s = String(v).replace(/'/g, "''")
  return `'${s}'`
}
