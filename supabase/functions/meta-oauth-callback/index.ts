import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts"

// SECURITY: Restrict CORS to specific origins
const ALLOWED_ORIGINS = [
  'https://cubomagico.leandrolastori.com.br',
  'https://id-preview--17d62d10-743a-42e0-8072-f81bc76fe538.lovable.app',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o.replace('https://', '').split('.')[0]) || origin === o)
    ? origin
    : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const META_APP_ID = Deno.env.get('META_APP_ID')
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// SECURITY: Generate HMAC signature for state validation
async function generateHmac(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(META_APP_SECRET || 'fallback-secret')
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

// Helper to create signed state
export async function createSignedState(projectId: string, userId: string, redirectUrl: string): Promise<string> {
  const timestamp = Date.now()
  const stateData = { projectId, userId, redirectUrl, timestamp }
  const stateJson = JSON.stringify(stateData)
  const signature = await generateHmac(stateJson)
  
  return btoa(JSON.stringify({ data: stateData, sig: signature }))
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Contains projectId, userId and signature
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    console.log('OAuth callback received:', { code: !!code, state: !!state, error })

    // Parse state first to get redirect URL
    let stateData: { projectId: string; userId: string; redirectUrl: string; timestamp: number } | null = null
    let signature: string | null = null
    
    if (state) {
      try {
        const parsed = JSON.parse(atob(state))
        // Check if it's the new signed format
        if (parsed.data && parsed.sig) {
          stateData = parsed.data
          signature = parsed.sig
        } else {
          // Legacy format (backwards compatibility)
          stateData = parsed
          console.warn('⚠️ Legacy state format detected (no signature)')
        }
      } catch (e) {
        console.error('Invalid state:', e)
      }
    }
    
    const baseRedirectUrl = stateData?.redirectUrl || `${SUPABASE_URL?.replace('.supabase.co', '.lovableproject.com')}/settings`

    if (error) {
      console.error('OAuth error:', error, errorDescription)
      return redirectWithError(`Erro no login: ${errorDescription || error}`, baseRedirectUrl, corsHeaders)
    }

    if (!code || !stateData) {
      console.error('Missing code or state')
      return redirectWithError('Parâmetros inválidos', baseRedirectUrl, corsHeaders)
    }

    // SECURITY: Validate HMAC signature if present
    if (signature) {
      const stateJson = JSON.stringify(stateData)
      const isValid = await validateHmac(stateJson, signature)
      
      if (!isValid) {
        console.error('❌ Invalid state signature - potential CSRF attack')
        return redirectWithError('Assinatura inválida. Tente novamente.', baseRedirectUrl, corsHeaders)
      }
      
      // Check timestamp (state expires after 10 minutes)
      const stateAge = Date.now() - stateData.timestamp
      const maxAge = 10 * 60 * 1000 // 10 minutes
      
      if (stateAge > maxAge) {
        console.error('❌ State expired:', stateAge, 'ms')
        return redirectWithError('Sessão expirada. Tente novamente.', baseRedirectUrl, corsHeaders)
      }
      
      console.log('✅ State signature validated successfully')
    } else {
      console.warn('⚠️ No signature in state - accepting for backwards compatibility')
    }

    const { projectId, userId, redirectUrl } = stateData
    console.log('State parsed:', { projectId, userId })

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID!,
      client_secret: META_APP_SECRET!,
      redirect_uri: `${SUPABASE_URL}/functions/v1/meta-oauth-callback`,
      code,
    })

    console.log('Exchanging code for token...')
    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams}`)
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error)
      return redirectWithError(`Erro ao obter token: ${tokenData.error.message}`, redirectUrl, corsHeaders)
    }

    const { access_token, expires_in } = tokenData
    console.log('Token obtained, expires_in:', expires_in)

    // Get long-lived token
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token`
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID!,
      client_secret: META_APP_SECRET!,
      fb_exchange_token: access_token,
    })

    console.log('Getting long-lived token...')
    const longLivedResponse = await fetch(`${longLivedUrl}?${longLivedParams}`)
    const longLivedData = await longLivedResponse.json()

    const finalToken = longLivedData.access_token || access_token
    const finalExpires = longLivedData.expires_in || expires_in
    console.log('Final token obtained, expires_in:', finalExpires)

    // Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${finalToken}`
    )
    const userData = await userResponse.json()
    console.log('User data:', userData)

    // Calculate expiration date
    const expiresAt = finalExpires 
      ? new Date(Date.now() + finalExpires * 1000).toISOString()
      : null

    // Save to database using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { error: upsertError } = await supabase
      .from('meta_credentials')
      .upsert({
        project_id: projectId,
        access_token: finalToken,
        token_type: 'Bearer',
        expires_at: expiresAt,
        user_id: userData.id,
        user_name: userData.name,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id',
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return redirectWithError('Erro ao salvar credenciais', redirectUrl, corsHeaders)
    }

    console.log('✅ Credentials saved successfully')

    // Redirect back to app with success
    const successUrl = new URL(redirectUrl)
    successUrl.searchParams.set('meta_connected', 'true')
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': successUrl.toString(),
      },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    // Use a fallback URL for unexpected errors
    const fallbackUrl = `${SUPABASE_URL?.replace('.supabase.co', '.lovableproject.com')}/settings`
    return redirectWithError('Erro inesperado', fallbackUrl, getCorsHeaders(null))
  }
})

function redirectWithError(message: string, redirectUrl: string, corsHeaders: Record<string, string>): Response {
  // Redirect to app with error
  const errorUrl = new URL(redirectUrl)
  errorUrl.searchParams.set('meta_error', message)
  
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': errorUrl.toString(),
    },
  })
}
