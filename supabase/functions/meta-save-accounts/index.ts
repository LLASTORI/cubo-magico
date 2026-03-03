import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRole)

    const body = await req.json()
    const { projectId, accounts } = body

    if (!projectId || !accounts?.length) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: corsHeaders })
    }

    const rows = accounts.map((a: any) => ({
      project_id: projectId,
      account_id: a.id,
      account_name: a.name,
      currency: a.currency,
      timezone: a.timezone_name,
      is_active: true,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('meta_ad_accounts')
      .upsert(rows, { onConflict: 'project_id,account_id' })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
