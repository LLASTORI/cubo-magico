import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts"

// SECURITY: Restrict CORS to specific origins
const ALLOWED_ORIGINS = [
  'https://cubomagico.leandrolastori.com.br',
  'https://cubomagicoleandrolastoricombr.lovable.app',
  'https://id-preview--17d62d10-743a-42e0-8072-f81bc76fe538.lovable.app',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => 
    origin.startsWith(o.replace('https://', '').split('.')[0]) || origin === o
  ) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Use a dedicated secret for Hotmart state signing
const HOTMART_STATE_SECRET = Deno.env.get('HOTMART_STATE_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// SECURITY: Generate HMAC signature for state validation
async function generateHmac(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(HOTMART_STATE_SECRET)
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
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client with user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const { projectId, redirectUrl } = await req.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user has access to this project
    const { data: membership, error: memberError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError || !membership) {
      console.error('Access denied:', memberError)
      return new Response(JSON.stringify({ error: 'Access denied to this project' }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create signed state object
    const timestamp = Date.now()
    const stateData = { 
      projectId, 
      userId: user.id, 
      redirectUrl: redirectUrl || `${SUPABASE_URL.replace('.supabase.co', '.lovableproject.com')}/settings`,
      timestamp 
    }
    const stateJson = JSON.stringify(stateData)
    const signature = await generateHmac(stateJson)
    
    const signedState = btoa(JSON.stringify({ data: stateData, sig: signature }))

    console.log('✅ Generated Hotmart OAuth state for project:', projectId)

    return new Response(JSON.stringify({ state: signedState }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error generating state:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' }
    })
  }
})
