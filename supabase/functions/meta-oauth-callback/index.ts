import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from 'https://deno.land/std@0.208.0/encoding/hex.ts'

/* ======================================================
   CONFIG
====================================================== */

const ALLOWED_ORIGINS = [
  'https://cubomagico.leandrolastori.com.br',
  'https://cubomagicoleandrolastoricombr.vercel.app',
]

const ALLOWED_REDIRECT_BASES = [
  'https://cubomagico.leandrolastori.com.br',
  'https://cubomagicoleandrolastoricombr.vercel.app',
]

const META_APP_ID = Deno.env.get('META_APP_ID')!
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!META_APP_ID || !META_APP_SECRET || !SUPABASE_URL) {
  throw new Error('Missing env vars for Meta OAuth')
}

/* ======================================================
   CORS
====================================================== */

function getCorsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  }
}

/* ======================================================
   HMAC
====================================================== */

async function generateHmac(data: string): Promise<string> {
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )

  return new TextDecoder().decode(hexEncode(new Uint8Array(signature)))
}

async function validateHmac(data: string, sig: string) {
  const expected = await generateHmac(data)
  return sig === expected
}

/* ======================================================
   HELPERS
====================================================== */

function isRedirectAllowed(url: string) {
  return ALLOWED_REDIRECT_BASES.some((base) =>
    url.startsWith(base)
  )
}

function errorRedirect(
  msg: string,
  redirect: string,
  cors: Record<string, string>
) {
  const url = new URL(redirect)

  url.searchParams.set('meta_error', msg)

  return new Response(null, {
    status: 302,
    headers: {
      ...cors,
      Location: url.toString(),
    },
  })
}

/* ======================================================
   MAIN
====================================================== */

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  try {
    const url = new URL(req.url)

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDesc = url.searchParams.get('error_description')

    /* ======================================
       Decode state
    ====================================== */

    if (!state) {
      return errorRedirect(
        'State ausente',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    let parsedState: any

    try {
      parsedState = JSON.parse(atob(state))
    } catch {
      return errorRedirect(
        'State inválido',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    if (!parsedState.data || !parsedState.sig) {
      return errorRedirect(
        'State malformado',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    const stateData = parsedState.data
    const signature = parsedState.sig

    const stateJson = JSON.stringify(stateData)

    const valid = await validateHmac(stateJson, signature)

    if (!valid) {
      return errorRedirect(
        'Assinatura inválida',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    const age = Date.now() - stateData.timestamp

    if (age > 10 * 60 * 1000) {
      return errorRedirect(
        'Sessão expirada',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    const { projectId, redirectUrl } = stateData

    if (!projectId || !redirectUrl) {
      return errorRedirect(
        'State incompleto',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    if (!isRedirectAllowed(redirectUrl)) {
      console.error('Blocked redirect:', redirectUrl)

      return errorRedirect(
        'Redirect não autorizado',
        ALLOWED_REDIRECT_BASES[0],
        cors
      )
    }

    /* ======================================
       OAuth Errors
    ====================================== */

    if (error) {
      return errorRedirect(
        errorDesc || error,
        redirectUrl,
        cors
      )
    }

    if (!code) {
      return errorRedirect('Code ausente', redirectUrl, cors)
    }

    /* ======================================
       Exchange Token
    ====================================== */

    const callbackUrl =
      `${SUPABASE_URL}/functions/v1/meta-oauth-callback`

    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: callbackUrl,
      code,
    })

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`
    )

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('TOKEN ERROR:', tokenData)

      return errorRedirect(
        tokenData.error.message,
        redirectUrl,
        cors
      )
    }

    const shortToken = tokenData.access_token
    const shortExpires = tokenData.expires_in

    /* ======================================
       Long-lived token
    ====================================== */

    const longParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortToken,
    })

    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${longParams}`
    )

    const longData = await longRes.json()

    const finalToken = longData.access_token || shortToken
    const finalExpires = longData.expires_in || shortExpires

    /* ======================================
       User Info
    ====================================== */

    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${finalToken}`
    )

    const me = await meRes.json()

    if (!me?.id) {
      console.error('INVALID META USER:', me)

      return errorRedirect(
        'Erro ao obter usuário Meta',
        redirectUrl,
        cors
      )
    }

    /* ======================================
       Save DB
    ====================================== */

    const expiresAt = finalExpires
      ? new Date(Date.now() + finalExpires * 1000).toISOString()
      : null

    const payload = {
      project_id: projectId,
      access_token: finalToken,
      token_type: 'Bearer',
      expires_at: expiresAt,
      user_id: me.id,
      user_name: me.name || null,
      updated_at: new Date().toISOString(),
    }

    console.log('UPSERT META_CREDENTIALS:', payload)

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    const { error: dbError } = await supabase
      .from('meta_credentials')
      .upsert(payload, {
        onConflict: 'project_id',
      })

    if (dbError) {
      console.error('DB ERROR META_CREDENTIALS:', dbError)

      return errorRedirect(
        'Erro ao salvar token: ' + dbError.message,
        redirectUrl,
        cors
      )
    }

    /* ======================================
       Redirect Success
    ====================================== */

    const success = new URL(redirectUrl)

    success.searchParams.set('meta_connected', 'true')

    return new Response(null, {
      status: 302,
      headers: {
        ...cors,
        Location: success.toString(),
      },
    })
  } catch (err) {
    console.error('OAUTH CRASH:', err)

    return errorRedirect(
      'Erro interno: ' + String(err),
      ALLOWED_REDIRECT_BASES[0],
      getCorsHeaders(null)
    )
  }
})
