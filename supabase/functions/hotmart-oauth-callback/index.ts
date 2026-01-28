import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts"

// ============================================
// HOTMART OAUTH CALLBACK - Authorization Code Flow
// ============================================
// This edge function handles the OAuth callback from Hotmart.
// It receives the authorization code and exchanges it for access/refresh tokens.
// ============================================

// SECURITY: Restrict CORS to specific origins
const ALLOWED_ORIGINS = [
  'https://cubomagico.leandrolastori.com.br',
  'https://cubomagicoleandrolastoricombr.lovable.app',
  'https://id-preview--17d62d10-743a-42e0-8072-f81bc76fe538.lovable.app',
  'https://17d62d10-743a-42e0-8072-f81bc76fe538.lovableproject.com',
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Use a dedicated secret for Hotmart state signing
const HOTMART_STATE_SECRET = Deno.env.get('HOTMART_STATE_SECRET') || SUPABASE_SERVICE_ROLE_KEY

// Browser-like headers to avoid WAF blocks
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Dest": "empty",
}

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

// SECURITY: Validate HMAC signature
async function validateHmac(data: string, signature: string): Promise<boolean> {
  const expectedSignature = await generateHmac(data)
  return signature === expectedSignature
}

function redirectWithError(message: string, redirectUrl: string, corsHeaders: Record<string, string>): Response {
  const errorUrl = new URL(redirectUrl)
  errorUrl.searchParams.set('hotmart_error', message)
  
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': errorUrl.toString(),
    },
  })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const fallbackRedirectUrl = 'https://cubomagico.leandrolastori.com.br/settings'

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    console.log('[HOTMART-OAUTH] Callback received:', { code: !!code, state: !!state, error })

    // Parse state first to get redirect URL
    let stateData: { projectId: string; userId: string; redirectUrl: string; timestamp: number } | null = null
    let signature: string | null = null
    
    if (state) {
      try {
        const parsed = JSON.parse(atob(state))
        if (parsed.data && parsed.sig) {
          stateData = parsed.data
          signature = parsed.sig
        } else {
          stateData = parsed
          console.warn('⚠️ Legacy state format detected (no signature)')
        }
      } catch (e) {
        console.error('[HOTMART-OAUTH] Invalid state:', e)
      }
    }
    
    const baseRedirectUrl = stateData?.redirectUrl || fallbackRedirectUrl

    if (error) {
      console.error('[HOTMART-OAUTH] OAuth error:', error, errorDescription)
      return redirectWithError(`Erro no login Hotmart: ${errorDescription || error}`, baseRedirectUrl, corsHeaders)
    }

    if (!code || !stateData) {
      console.error('[HOTMART-OAUTH] Missing code or state')
      return redirectWithError('Parâmetros inválidos', baseRedirectUrl, corsHeaders)
    }

    // SECURITY: Validate HMAC signature if present
    if (signature) {
      const stateJson = JSON.stringify(stateData)
      const isValid = await validateHmac(stateJson, signature)
      
      if (!isValid) {
        console.error('[HOTMART-OAUTH] ❌ Invalid state signature - potential CSRF attack')
        return redirectWithError('Assinatura inválida. Tente novamente.', baseRedirectUrl, corsHeaders)
      }
      
      // Check timestamp (state expires after 10 minutes)
      const stateAge = Date.now() - stateData.timestamp
      const maxAge = 10 * 60 * 1000 // 10 minutes
      
      if (stateAge > maxAge) {
        console.error('[HOTMART-OAUTH] ❌ State expired:', stateAge, 'ms')
        return redirectWithError('Sessão expirada. Tente novamente.', baseRedirectUrl, corsHeaders)
      }
      
      console.log('[HOTMART-OAUTH] ✅ State signature validated successfully')
    }

    const { projectId, userId, redirectUrl } = stateData
    console.log('[HOTMART-OAUTH] State parsed:', { projectId, userId })

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get project credentials using RPC to decrypt client_secret
    const { data: credentialsArray, error: credError } = await supabase
      .rpc('get_project_credentials_internal', { p_project_id: projectId })

    if (credError) {
      console.error('[HOTMART-OAUTH] RPC error:', credError)
      return redirectWithError('Erro ao obter credenciais', redirectUrl, corsHeaders)
    }

    const credentials = credentialsArray?.find((c: any) => c.provider === 'hotmart')
    
    if (!credentials?.client_id || !credentials?.client_secret) {
      console.error('[HOTMART-OAUTH] Credentials not found or incomplete')
      return redirectWithError('Credenciais Hotmart não configuradas. Configure Client ID e Secret primeiro.', redirectUrl, corsHeaders)
    }

    // Exchange authorization code for tokens
    console.log('[HOTMART-OAUTH] Exchanging code for tokens...')
    
    const tokenUrl = 'https://developers.hotmart.com/oauth/token'
    const redirectUri = `${SUPABASE_URL}/functions/v1/hotmart-oauth-callback`
    
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      code,
      redirect_uri: redirectUri,
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
    console.log('[HOTMART-OAUTH] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      console.error('[HOTMART-OAUTH] Token exchange failed:', tokenText.slice(0, 500))
      
      // Check if it's an HTML response (WAF block)
      if (tokenText.includes('<!DOCTYPE') || tokenText.includes('<html')) {
        return redirectWithError('Hotmart bloqueou a requisição. Tente novamente em alguns minutos.', redirectUrl, corsHeaders)
      }
      
      return redirectWithError(`Erro ao obter token: ${tokenText.slice(0, 200)}`, redirectUrl, corsHeaders)
    }

    let tokenData
    try {
      tokenData = JSON.parse(tokenText)
    } catch {
      console.error('[HOTMART-OAUTH] Invalid JSON from token endpoint:', tokenText.slice(0, 500))
      return redirectWithError('Resposta inválida da Hotmart', redirectUrl, corsHeaders)
    }

    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      console.error('[HOTMART-OAUTH] Missing tokens in response:', tokenData)
      return redirectWithError('Tokens não retornados pela Hotmart', redirectUrl, corsHeaders)
    }

    console.log('[HOTMART-OAUTH] ✅ Tokens received, expires_in:', expires_in)

    // Calculate expiration date
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString() // Default 1 hour

    // Save tokens to database
    const { error: updateError } = await supabase
      .from('project_credentials')
      .update({
        hotmart_access_token: access_token,
        hotmart_refresh_token: refresh_token,
        hotmart_expires_at: expiresAt,
        hotmart_connected_at: new Date().toISOString(),
        is_validated: true,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')

    if (updateError) {
      console.error('[HOTMART-OAUTH] Database error:', updateError)
      return redirectWithError('Erro ao salvar credenciais', redirectUrl, corsHeaders)
    }

    console.log('[HOTMART-OAUTH] ✅ Credentials saved successfully for project:', projectId)

    // Redirect back to app with success
    const successUrl = new URL(redirectUrl)
    successUrl.searchParams.set('hotmart_connected', 'true')
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': successUrl.toString(),
      },
    })

  } catch (error) {
    console.error('[HOTMART-OAUTH] Unexpected error:', error)
    return redirectWithError('Erro inesperado', fallbackRedirectUrl, getCorsHeaders(null))
  }
})
