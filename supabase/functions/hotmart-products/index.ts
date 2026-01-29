import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================
// HOTMART PRODUCTS API - Clean Room Implementation
// ============================================
// Purpose: Fetch products, offers, and plans from Hotmart
// Authentication: Client Credentials ONLY (no OAuth)
// Scope: Product catalog management for offer_mappings
// 
// This function does NOT touch:
// - Webhook/Sales data
// - Ledger/Financial data
// - CSV imports
// - Orders/Transactions
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Hotmart API endpoints (OFFICIAL DOCUMENTATION)
// Ref: https://developers.hotmart.com/docs/pt-BR/v1/product/product-offers/
const HOTMART_TOKEN_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token'
const HOTMART_PRODUCTS_BASE = 'https://developers.hotmart.com/products/api/v1'

// Browser-like headers to avoid WAF blocks
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

interface HotmartCredentials {
  client_id: string
  client_secret: string
  basic_auth: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface HotmartProduct {
  id: number
  ucode: string
  name: string
  status: string
  format: string
  created_at: number
  is_subscription: boolean
}

interface HotmartOffer {
  code: string
  name: string
  is_main_offer: boolean
  price: {
    value: number
    currency_code: string
  }
  payment_mode: string
  status?: string
}

// ============================================
// AUTHENTICATION - Client Credentials Flow
// ============================================
// Generates a short-lived access token on-demand
// Token is used in memory only, never persisted
// ============================================

async function getAccessToken(credentials: HotmartCredentials): Promise<string> {
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
  })

  // Normalize basic_auth: remove "Basic " prefix if user included it
  let basicAuth = credentials.basic_auth.trim()
  if (basicAuth.toLowerCase().startsWith('basic ')) {
    basicAuth = basicAuth.substring(6).trim()
  }

  // Diagnostic logging (masked for security)
  const basicAuthPreview = basicAuth.length > 10 
    ? `${basicAuth.slice(0, 5)}...${basicAuth.slice(-5)} (len: ${basicAuth.length})` 
    : `[too short: ${basicAuth.length}]`
  console.log(`[HOTMART-PRODUCTS] Requesting access token with Basic: ${basicAuthPreview}`)
  console.log(`[HOTMART-PRODUCTS] Client ID: ${credentials.client_id}`)

  const response = await fetch(HOTMART_TOKEN_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: tokenBody,
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error('[HOTMART-PRODUCTS] Token request failed:', response.status, responseText.slice(0, 300))
    
    // Check for WAF block (HTML response)
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Tente novamente em alguns minutos.')
    }
    
    throw new Error(`Falha na autenticação (${response.status}): ${responseText.slice(0, 200)}`)
  }

  let tokenData: TokenResponse
  try {
    tokenData = JSON.parse(responseText)
  } catch {
    throw new Error(`Resposta inválida do servidor Hotmart: ${responseText.slice(0, 200)}`)
  }

  if (!tokenData.access_token) {
    throw new Error('Token de acesso não retornado pela Hotmart')
  }

  console.log('[HOTMART-PRODUCTS] ✅ Token obtained successfully')
  return tokenData.access_token
}

// ============================================
// API CALLS - Products, Offers, Plans
// ============================================

async function fetchProducts(accessToken: string): Promise<HotmartProduct[]> {
  console.log('[HOTMART-PRODUCTS] Fetching products...')

  const response = await fetch(`${HOTMART_PRODUCTS_BASE}/products`, {
    method: 'GET',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[HOTMART-PRODUCTS] Products fetch failed:', response.status, errorText.slice(0, 300))
    throw new Error(`Erro ao buscar produtos: ${response.status}`)
  }

  const data = await response.json()
  const products = data.items || data || []
  console.log(`[HOTMART-PRODUCTS] ✅ Found ${products.length} products`)
  return products
}

async function fetchOffers(accessToken: string, productUcode: string): Promise<HotmartOffer[]> {
  console.log(`[HOTMART-PRODUCTS] Fetching offers for product ${productUcode}...`)

  const response = await fetch(`${HOTMART_PRODUCTS_BASE}/products/${productUcode}/offers`, {
    method: 'GET',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    // Some products may not have offers - this is not an error
    if (response.status === 404) {
      console.log(`[HOTMART-PRODUCTS] No offers for product ${productUcode}`)
      return []
    }
    const errorText = await response.text()
    console.error(`[HOTMART-PRODUCTS] Offers fetch failed for ${productUcode}:`, response.status, errorText.slice(0, 200))
    return [] // Don't throw - continue with other products
  }

  const data = await response.json()
  const offers = data.items || data || []
  console.log(`[HOTMART-PRODUCTS] ✅ Found ${offers.length} offers for product ${productUcode}`)
  return offers
}

// ============================================
// CREDENTIAL RETRIEVAL
// ============================================

async function getCredentials(supabase: any, projectId: string): Promise<HotmartCredentials> {
  // Use RPC to get decrypted credentials
  const { data, error } = await supabase
    .rpc('get_project_credentials_internal', { p_project_id: projectId })

  if (error) {
    console.error('[HOTMART-PRODUCTS] RPC error:', error)
    throw new Error(`Erro ao obter credenciais: ${error.message}`)
  }

  const hotmartCred = data?.find((c: any) => c.provider === 'hotmart')

  // Validate ALL 3 required fields
  if (!hotmartCred?.client_id) {
    throw new Error('Client ID não configurado. Acesse Configurações > Integrações > Hotmart.')
  }
  if (!hotmartCred?.client_secret) {
    throw new Error('Client Secret não configurado. Reinsira as credenciais em Configurações > Integrações > Hotmart.')
  }
  if (!hotmartCred?.basic_auth) {
    throw new Error('Basic Auth não configurado. Reinsira as credenciais em Configurações > Integrações > Hotmart.')
  }

  return {
    client_id: hotmartCred.client_id,
    client_secret: hotmartCred.client_secret,
    basic_auth: hotmartCred.basic_auth,
  }
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, projectId } = await req.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get credentials
    let credentials: HotmartCredentials
    try {
      credentials = await getCredentials(supabase, projectId)
    } catch (credError: any) {
      return new Response(JSON.stringify({ 
        success: false,
        error: credError.message,
        step: 'credentials',
        credentials: {
          client_id: false,
          client_secret: false,
          basic_auth: false,
        }
      }), {
        status: 200, // Return 200 so frontend can handle gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get access token (on-demand, in-memory only)
    let accessToken: string
    try {
      accessToken = await getAccessToken(credentials)
    } catch (tokenError: any) {
      return new Response(JSON.stringify({ 
        success: false,
        error: tokenError.message,
        step: 'token',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle actions
    switch (action) {
      case 'test-connection': {
        // Simple test: fetch products and return count
        const products = await fetchProducts(accessToken)
        
        // Mark as validated in database
        await supabase
          .from('project_credentials')
          .update({ 
            is_validated: true, 
            validated_at: new Date().toISOString() 
          })
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')

        return new Response(JSON.stringify({
          success: true,
          message: `Conexão OK. ${products.length} produtos encontrados.`,
          productCount: products.length,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get-products': {
        const products = await fetchProducts(accessToken)
        return new Response(JSON.stringify({
          success: true,
          items: products,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get-offers': {
        const { productUcode } = await req.json()
        if (!productUcode) {
          return new Response(JSON.stringify({ error: 'productUcode é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const offers = await fetchOffers(accessToken, productUcode)
        return new Response(JSON.stringify({
          success: true,
          items: offers,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get-all-offers': {
        // Fetch all products and all their offers
        const products = await fetchProducts(accessToken)
        const allOffers: Array<HotmartOffer & { product_ucode: string; product_name: string; product_id: number }> = []

        for (const product of products) {
          try {
            const offers = await fetchOffers(accessToken, product.ucode)
            for (const offer of offers) {
              allOffers.push({
                ...offer,
                product_ucode: product.ucode,
                product_name: product.name,
                product_id: product.id,
              })
            }
          } catch (e) {
            console.error(`[HOTMART-PRODUCTS] Error fetching offers for ${product.ucode}:`, e)
            // Continue with other products
          }
        }

        return new Response(JSON.stringify({
          success: true,
          products: products.length,
          offers: allOffers,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'sync-offers': {
        // Fetch all offers and upsert to offer_mappings
        const products = await fetchProducts(accessToken)
        let syncedCount = 0
        let updatedCount = 0
        const errors: string[] = []

        // Get the "A Definir" funnel for new offers
        const { data: defaultFunnel } = await supabase
          .from('funnels')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', 'A Definir')
          .maybeSingle()
        
        const defaultFunnelId = defaultFunnel?.id || null

        for (const product of products) {
          try {
            const offers = await fetchOffers(accessToken, product.ucode)

            for (const offer of offers) {
              // Check if offer already exists
              const { data: existing } = await supabase
                .from('offer_mappings')
                .select('id, funnel_id, id_funil')
                .eq('project_id', projectId)
                .eq('provider', 'hotmart')
                .eq('codigo_oferta', offer.code)
                .maybeSingle()

              if (existing) {
                // Update existing offer (preserve funnel_id and id_funil)
                const { error: updateError } = await supabase
                  .from('offer_mappings')
                  .update({
                    id_produto: product.ucode,
                    id_produto_visual: `ID ${product.id}`,
                    nome_produto: product.name,
                    nome_oferta: offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome'),
                    valor: offer.price?.value || null,
                    moeda: offer.price?.currency_code || 'BRL',
                    status: offer.status || 'Ativo',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id)

                if (updateError) {
                  errors.push(`Erro ao atualizar ${offer.code}: ${updateError.message}`)
                } else {
                  updatedCount++
                }
              } else {
                // Insert new offer
                const { error: insertError } = await supabase
                  .from('offer_mappings')
                  .insert({
                    project_id: projectId,
                    provider: 'hotmart',
                    id_produto: product.ucode,
                    id_produto_visual: `ID ${product.id}`,
                    nome_produto: product.name,
                    nome_oferta: offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome'),
                    codigo_oferta: offer.code,
                    valor: offer.price?.value || null,
                    moeda: offer.price?.currency_code || 'BRL',
                    status: 'Ativo',
                    id_funil: 'A Definir',
                    funnel_id: defaultFunnelId,
                    data_ativacao: new Date().toISOString().split('T')[0],
                    origem: 'api_sync',
                  })

                if (insertError) {
                  // Ignore duplicate key errors (offer already exists from sales)
                  if (insertError.code !== '23505') {
                    errors.push(`Erro ao inserir ${offer.code}: ${insertError.message}`)
                  }
                } else {
                  syncedCount++
                }
              }
            }
          } catch (e: any) {
            errors.push(`Erro no produto ${product.name}: ${e.message}`)
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Sincronização concluída. ${syncedCount} novas ofertas, ${updatedCount} atualizadas.`,
          synced: syncedCount,
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

  } catch (error: any) {
    console.error('[HOTMART-PRODUCTS] Unexpected error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro inesperado',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
