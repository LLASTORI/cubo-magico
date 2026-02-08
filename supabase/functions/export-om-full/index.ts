import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COLUMNS = [
  'id', 'project_id', 'funnel_id', 'nome_produto', 'nome_oferta',
  'anotacoes', 'nome_posicao', 'id_produto_visual', 'origem', 'moeda',
  'created_at', 'updated_at'
] as const

function csvVal(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

async function fetchAll(supabase: any, filter: 'valid' | 'orphans' | 'all'): Promise<any[]> {
  const rows: any[] = []
  let offset = 0
  const batchSize = 500

  while (true) {
    let query = supabase
      .from('offer_mappings')
      .select(COLUMNS.join(','))
      .order('project_id', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1)

    if (filter === 'valid') {
      query = query.not('funnel_id', 'is', null)
    } else if (filter === 'orphans') {
      query = query.is('funnel_id', null)
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < batchSize) break
    offset += batchSize
  }

  return rows
}

function buildCsv(rows: any[]): string {
  let csv = COLUMNS.join(',') + '\n'
  for (const row of rows) {
    csv += COLUMNS.map(c => csvVal(row[c])).join(',') + '\n'
  }
  return csv
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') || 'all'
    // mode=all → single CSV with everything
    // mode=valid → only rows where funnel_id IS NOT NULL
    // mode=orphans → only rows where funnel_id IS NULL
    // mode=report → JSON summary of orphans + valid CSV

    if (!['all', 'valid', 'orphans', 'report'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'mode must be: all, valid, orphans, or report' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[export-full-offer-mappings] mode=${mode}`)

    if (mode === 'report') {
      const [validRows, orphanRows] = await Promise.all([
        fetchAll(supabase, 'valid'),
        fetchAll(supabase, 'orphans'),
      ])

      const orphansByProject: Record<string, any[]> = {}
      for (const row of orphanRows) {
        const pid = row.project_id
        if (!orphansByProject[pid]) orphansByProject[pid] = []
        orphansByProject[pid].push({
          id: row.id,
          nome_oferta: row.nome_oferta,
          nome_produto: row.nome_produto,
        })
      }

      const validCsv = buildCsv(validRows)

      return new Response(JSON.stringify({
        summary: {
          total_records: validRows.length + orphanRows.length,
          valid_records: validRows.length,
          orphan_records: orphanRows.length,
          orphans_by_project: Object.fromEntries(
            Object.entries(orphansByProject).map(([pid, rows]) => [pid, rows.length])
          ),
        },
        orphan_details: orphansByProject,
        valid_csv: validCsv,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // CSV modes
    const filter = mode as 'valid' | 'orphans' | 'all'
    const rows = await fetchAll(supabase, filter)
    const csv = buildCsv(rows)

    console.log(`[export-full-offer-mappings] exported ${rows.length} rows (mode=${mode})`)

    const fileName = mode === 'orphans'
      ? 'offer_mappings_orphans.csv'
      : mode === 'valid'
        ? 'offer_mappings_valid.csv'
        : 'offer_mappings_full.csv'

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error: any) {
    console.error(`[export-full-offer-mappings] ERROR: ${error.message}`)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
