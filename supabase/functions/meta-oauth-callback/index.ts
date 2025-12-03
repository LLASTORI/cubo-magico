import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const META_APP_ID = Deno.env.get('META_APP_ID')
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Contains projectId and userId
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    console.log('OAuth callback received:', { code: !!code, state, error })

    if (error) {
      console.error('OAuth error:', error, errorDescription)
      return redirectWithError(`Erro no login: ${errorDescription || error}`)
    }

    if (!code || !state) {
      console.error('Missing code or state')
      return redirectWithError('Parâmetros inválidos')
    }

    // Parse state
    let stateData: { projectId: string; userId: string; redirectUrl: string }
    try {
      stateData = JSON.parse(atob(state))
    } catch (e) {
      console.error('Invalid state:', e)
      return redirectWithError('Estado inválido')
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
      return redirectWithError(`Erro ao obter token: ${tokenData.error.message}`)
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
      return redirectWithError('Erro ao salvar credenciais')
    }

    console.log('Credentials saved successfully')

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
    return redirectWithError('Erro inesperado')
  }
})

function redirectWithError(message: string): Response {
  // Redirect to app with error
  const errorUrl = new URL('https://jcbzwxgayxrnxlgmmlni.lovableproject.com/settings')
  errorUrl.searchParams.set('meta_error', message)
  
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': errorUrl.toString(),
    },
  })
}
