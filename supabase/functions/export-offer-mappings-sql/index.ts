import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COLUMNS = [
  'id', 'id_produto', 'nome_produto', 'nome_oferta', 'codigo_oferta',
  'valor', 'status', 'data_ativacao', 'data_desativacao', 'id_funil',
  'anotacoes', 'created_at', 'updated_at', 'tipo_posicao', 'ordem_posicao',
  'nome_posicao', 'id_produto_visual', 'project_id', 'funnel_id', 'moeda',
  'valor_original', 'provider', 'origem'
]

function sqlVal(v: any): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // If no project_id, return summary
    if (!projectId) {
      const { data, error } = await supabase.rpc('', {}).maybeSingle()
      // Manual count per project
      const projects: Record<string, string> = {
        '1e1a89a4-81d5-4aa7-8431-538828def2a3': 'Alice Salazar',
        '41f3c092-b3f4-4211-b80e-9d4e4f3a1e45': 'Leandro Lastori',
        'a59d30c7-1009-4aa2-b106-6826011466e9': 'Camila Leal',
        'ae0894d4-6212-49f5-8b87-0b5a8cc11455': 'Natalia Canezin',
        'b92c4dfd-d220-4a80-bac2-c9779a336548': 'James Olaya',
        '7f44b177-5255-4393-a648-3f0dfc681be9': 'Lilian Anacleto',
      }

      const counts: any[] = []
      for (const [pid, name] of Object.entries(projects)) {
        const { count } = await supabase
          .from('offer_mappings')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', pid)
        counts.push({ project_id: pid, name, total: count })
      }

      const instructions = counts.map(c => {
        const blocks = Math.ceil((c.total || 0) / 50)
        const urls: string[] = []
        for (let i = 0; i < blocks; i++) {
          urls.push(`?project_id=${c.project_id}&offset=${i * 50}&limit=50`)
        }
        return { ...c, blocks, urls }
      })

      return new Response(JSON.stringify({ instructions }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch batch
    const { data: rows, error } = await supabase
      .from('offer_mappings')
      .select('*')
      .eq('project_id', projectId)
      .order('id')
      .range(offset, offset + limit - 1)

    if (error) throw error
    if (!rows || rows.length === 0) {
      return new Response('-- No records found for this range\n', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Build SQL
    const inserts = rows.map(r => {
      const vals = COLUMNS.map(c => sqlVal(r[c]))
      return `(${vals.join(', ')})`
    })

    const sql = `INSERT INTO offer_mappings (${COLUMNS.join(', ')}) VALUES\n${inserts.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n`

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
