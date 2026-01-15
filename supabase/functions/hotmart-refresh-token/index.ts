import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================
// HOTMART REFRESH TOKEN - Get Fresh Access Token
// ============================================
// This edge function refreshes the Hotmart access token using the refresh_token.
// It should be called before making any Hotmart API calls.
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-id',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Browser-like headers to avoid WAF blocks
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Dest": "empty",
}

interface TokenRefreshResult {
  access_token: string
  expires_at: string
  refreshed: boolean
}

// Refresh the access token using refresh_token
async function refreshAccessToken(
  supabase: any,
  projectId: string,
  credentials: {
    client_id: string
    client_secret: string
    hotmart_refresh_token: string
  }
): Promise<TokenRefreshResult> {
  console.log('[REFRESH] Refreshing access token for project:', projectId)

  const tokenUrl = 'https://developers.hotmart.com/oauth/token'
  
  const tokenBody = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    refresh_token: credentials.hotmart_refresh_token,
  })

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody,
  })

  const tokenText = await tokenResponse.text()

  if (!tokenResponse.ok) {
    console.error('[REFRESH] Token refresh failed:', tokenText.slice(0, 500))
    
    // Check if it's an HTML response (WAF block)
    if (tokenText.includes('<!DOCTYPE') || tokenText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Reconecte via OAuth.')
    }
    
    throw new Error(`Refresh failed: ${tokenText.slice(0, 200)}`)
  }

  let tokenData
  try {
    tokenData = JSON.parse(tokenText)
  } catch {
    throw new Error(`Invalid JSON from refresh: ${tokenText.slice(0, 200)}`)
  }

  const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData

  if (!access_token) {
    throw new Error('No access_token in refresh response')
  }

  // Calculate expiration
  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

  // Update database with new tokens
  const updateData: any = {
    hotmart_access_token: access_token,
    hotmart_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }

  // If a new refresh token was provided, update it too
  if (new_refresh_token) {
    updateData.hotmart_refresh_token = new_refresh_token
  }

  const { error: updateError } = await supabase
    .from('project_credentials')
    .update(updateData)
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')

  if (updateError) {
    console.error('[REFRESH] Failed to save new token:', updateError)
    // Don't throw - we still have the token, just couldn't save it
  } else {
    console.log('[REFRESH] ✅ New access token saved, expires:', expiresAt)
  }

  return {
    access_token,
    expires_at: expiresAt,
    refreshed: true,
  }
}

// Get a valid access token (refresh if needed)
export async function getValidAccessToken(
  supabase: any,
  projectId: string
): Promise<string> {
  // Get current credentials
  const { data: credentials, error: credError } = await supabase
    .from('project_credentials')
    .select('client_id, client_secret, hotmart_access_token, hotmart_refresh_token, hotmart_expires_at')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .maybeSingle()

  if (credError || !credentials) {
    throw new Error('Hotmart credentials not found')
  }

  // Check if we have OAuth tokens
  if (!credentials.hotmart_refresh_token) {
    throw new Error('Hotmart não conectado via OAuth. Use o botão "Conectar Hotmart (OAuth)" nas configurações.')
  }

  // Check if token is still valid (with 5 minute buffer)
  const expiresAt = credentials.hotmart_expires_at ? new Date(credentials.hotmart_expires_at) : null
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minutes

  if (credentials.hotmart_access_token && expiresAt && expiresAt.getTime() > now.getTime() + bufferMs) {
    // Token still valid
    console.log('[REFRESH] Token still valid, expires:', expiresAt.toISOString())
    return credentials.hotmart_access_token
  }

  // Token expired or about to expire - refresh it
  console.log('[REFRESH] Token expired or expiring soon, refreshing...')
  
  if (!credentials.client_id || !credentials.client_secret) {
    throw new Error('Client ID/Secret não configurados')
  }

  const result = await refreshAccessToken(supabase, projectId, {
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    hotmart_refresh_token: credentials.hotmart_refresh_token,
  })

  return result.access_token
}

// HTTP endpoint for manual refresh
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const access_token = await getValidAccessToken(supabase, projectId)

    return new Response(JSON.stringify({ 
      success: true, 
      access_token,
      message: 'Token válido ou renovado com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[REFRESH] Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to refresh token' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
