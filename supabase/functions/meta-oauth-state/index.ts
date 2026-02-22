import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from 'https://deno.land/std@0.208.0/encoding/hex.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const META_APP_ID = Deno.env.get('META_APP_ID')
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

async function generateHmac(data: string): Promise<string> {
  const encoder = new TextEncoder()

  const keyData = encoder.encode(META_APP_SECRET || '')
  const messageData = encoder.encode(data)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)

  return new TextDecoder().decode(hexEncode(new Uint8Array(signature)))
}

Deno.serve(async (req) => {

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // Validate env
  if (!META_APP_ID || !META_APP_SECRET) {
    const missingVars = [
      !META_APP_ID ? 'META_APP_ID' : null,
      !META_APP_SECRET ? 'META_APP_SECRET' : null,
    ].filter(Boolean)

    console.error('Missing required Meta env vars:', missingVars)

    return new Response(JSON.stringify({
      error: 'Meta OAuth not configured',
      details: `Missing env vars: ${missingVars.join(', ')}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User verification failed:', userError)

      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    const { projectId, redirectUrl } = body

    if (!projectId || !redirectUrl) {
      return new Response(JSON.stringify({ error: 'Missing projectId or redirectUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: projectAccess, error: accessError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (accessError || !projectAccess) {
      console.error('Project access denied:', accessError)

      return new Response(JSON.stringify({ error: 'Access denied to project' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const timestamp = Date.now()

    const stateData = {
      projectId,
      userId: user.id,
      redirectUrl,
      timestamp,
    }

    const stateJson = JSON.stringify(stateData)

    const signature = await generateHmac(stateJson)

    const signedState = btoa(
      JSON.stringify({
        data: stateData,
        sig: signature,
      })
    )

    console.log('✅ Generated signed OAuth state for project:', projectId)

    return new Response(JSON.stringify({ state: signedState }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error generating OAuth state:', error)

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message || String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
