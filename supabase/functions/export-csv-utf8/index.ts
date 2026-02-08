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
    const url = new URL(req.url)
    const table = url.searchParams.get('table') // 'funnels' or 'offer_mappings'

    if (!table || !['funnels', 'offer_mappings'].includes(table)) {
      return new Response(JSON.stringify({ error: 'Parameter ?table=funnels or ?table=offer_mappings required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let csv = ''

    if (table === 'funnels') {
      const cols = ['id', 'name', 'campaign_name_pattern', 'launch_tag']
      csv = cols.join(',') + '\n'

      const { data, error } = await supabase
        .from('funnels')
        .select(cols.join(','))
        .order('id')

      if (error) throw error

      for (const row of data || []) {
        csv += cols.map(c => csvVal(row[c])).join(',') + '\n'
      }
    } else {
      const cols = ['id', 'nome_produto', 'nome_oferta', 'anotacoes', 'nome_posicao', 'id_produto_visual']
      csv = cols.join(',') + '\n'

      // Paginate to bypass 1000 limit
      let offset = 0
      const batchSize = 500
      while (true) {
        const { data, error } = await supabase
          .from('offer_mappings')
          .select(cols.join(','))
          .order('id')
          .range(offset, offset + batchSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break

        for (const row of data) {
          csv += cols.map(c => csvVal(row[c])).join(',') + '\n'
        }

        if (data.length < batchSize) break
        offset += batchSize
      }
    }

    const fileName = table === 'funnels' ? 'funnels_utf8.csv' : 'offer_mappings_utf8.csv'

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function csvVal(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Escape if contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
