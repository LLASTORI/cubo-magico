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

// Fallback map: project_id → "A Definir" funnel_id for orphan resolution
const FALLBACK_FUNNEL: Record<string, string> = {
  'b92c4dfd-d220-4a80-bac2-c9779a336548': '0202dae2-3f1c-41c8-8f06-94cad66d8e6c',  // James Olaya
  '7f44b177-5255-4393-a648-3f0dfc681be9': 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2',  // Lilian Anacleto
  '1e1a89a4-81d5-4aa7-8431-538828def2a3': '626ec2cd-f941-41d3-b3aa-321b9d5f8352',  // Alice Salazar
  '41f3c092-b3f4-4211-b80e-9d4e4f3a1e45': '8f5ad16b-cf34-4013-b21a-022c6aa9a37a',  // Leandro Lastori
  'a59d30c7-1009-4aa2-b106-6826011466e9': 'bf24a6df-e98a-4d1e-8bc9-6b097a084a1b',  // Camila Leal
  'ae0894d4-6212-49f5-8b87-0b5a8cc11455': '6e35fbf9-e171-42d7-880b-d4fe9f780f7a',  // Natalia Canezin
}

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

function resolveOrphans(rows: any[]): { resolved: any[], unresolved: any[] } {
  const resolved: any[] = []
  const unresolved: any[] = []

  for (const row of rows) {
    if (row.funnel_id) {
      resolved.push(row)
    } else {
      const fallback = FALLBACK_FUNNEL[row.project_id]
      if (fallback) {
        resolved.push({ ...row, funnel_id: fallback })
      } else {
        unresolved.push(row)
      }
    }
  }

  return { resolved, unresolved }
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

    if (!['all', 'valid', 'orphans', 'report', 'fixed'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'mode must be: all, valid, orphans, report, or fixed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[export-om-full] mode=${mode}`)

    // MODE: fixed — full dump with all orphans resolved via fallback
    if (mode === 'fixed') {
      const allRows = await fetchAll(supabase, 'all')
      const { resolved, unresolved } = resolveOrphans(allRows)

      if (unresolved.length > 0) {
        console.warn(`[export-om-full] ${unresolved.length} unresolved orphans (no fallback funnel)`)
        return new Response(JSON.stringify({
          error: `${unresolved.length} orphans could not be resolved — missing fallback funnel`,
          unresolved_project_ids: [...new Set(unresolved.map(r => r.project_id))],
        }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const csv = buildCsv(resolved)
      console.log(`[export-om-full] fixed export: ${resolved.length} rows, 0 nulls`)

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="offer_mappings_full_fixed.csv"',
        },
      })
    }

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

    // CSV modes: all, valid, orphans
    const filter = mode as 'valid' | 'orphans' | 'all'
    const rows = await fetchAll(supabase, filter)
    const csv = buildCsv(rows)

    console.log(`[export-om-full] exported ${rows.length} rows (mode=${mode})`)

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
    console.error(`[export-om-full] ERROR: ${error.message}`)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
