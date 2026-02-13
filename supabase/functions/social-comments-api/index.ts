import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============= KEYWORD CLASSIFICATION (NO AI) =============
// Keywords for automatic classification without AI

const COMMERCIAL_KEYWORDS = [
  'quero', 'queria', 'interessei', 'interessado', 'interessada', 'comprar', 'adquirir',
  'preço', 'preco', 'valor', 'quanto custa', 'quanto é', 'quanto e', 'quanto ta',
  'como faço', 'como faco', 'onde compro', 'tem link', 'passa o link', 'manda o link',
  'link do', 'quero comprar', 'vou comprar', 'me interessa', 'como adquiro', 'como conseguir',
  'como comprar', 'onde acho', 'tem disponível', 'disponivel', 'ainda tem', 'tem estoque',
  'como participar', 'quero participar', 'me inscrever', 'inscrição', 'inscricao',
  'entrar', 'fazer parte', 'cadastrar', 'como entrar', 'quero entrar', 'vagas',
  'tem vaga', 'onde compra', 'pix', 'parcela', 'parcelado', 'cartão', 'boleto'
]

const PRAISE_KEYWORDS = [
  'top', 'topp', 'toppp', 'lindo', 'linda', 'lindooo', 'lindaaa', 'amei', 'ameii', 'ameiiii',
  'show', 'showw', 'showww', 'maravilhoso', 'maravilhosa', 'perfeito', 'perfeita', 'incrível',
  'incrivel', 'demais', 'sensacional', 'parabéns', 'parabens', 'sucesso', 'arrasou', 'arrasa',
  'espetacular', 'lindo demais', 'muito bom', 'mto bom', 'mt bom', 'excelente', 'top demais',
  'massa', 'foda', 'dahora', 'maravilindo', 'obrigado', 'obrigada', 'gratidão', 'gratidao',
  'muito obrigado', 'muito obrigada', 'adorei', 'adoro', 'amo', 'lacrou', 'lacrou demais'
]

const IGNORABLE_PATTERNS = [
  /^[@\s]+$/,  // Only mentions
  /^[\p{Emoji}\s]+$/u,  // Only emojis
  /^[🔥❤️💪👏👍😍🙏💕💖💗💙💚💛🧡💜🖤🤍🤎]+$/u,  // Common reaction emojis
  /^\.+$/,  // Only dots
  /^!+$/,  // Only exclamation marks
]

interface KeywordClassificationResult {
  classified: boolean
  sentiment?: string
  classification?: string
  intent_score?: number
  summary?: string
  classificationMethod?: string
}

interface CustomKeywords {
  commercial: string[]
  praise: string[]
  spam: string[]
}

const ACTIONS_REQUIRING_META_CREDENTIALS = new Set([
  'get_available_pages',
  'save_pages',
  'sync_posts',
  'sync_comments',
  'sync_ad_comments',
])

function classifyByKeywords(text: string, customKeywords?: CustomKeywords): KeywordClassificationResult {
  if (!text || text.trim().length === 0) {
    return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Comentário vazio', classificationMethod: 'keyword_empty' }
  }

  const normalizedText = text.toLowerCase().trim()

  // Check ignorable patterns first
  for (const pattern of IGNORABLE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Emoji/menção', classificationMethod: 'keyword_pattern' }
    }
  }

  // Very short comments (1-2 characters)
  if (normalizedText.length <= 2) {
    return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Comentário muito curto', classificationMethod: 'keyword_short' }
  }

  // Combine hardcoded keywords with database-configured ones
  const spamKeywords = customKeywords?.spam || []
  const commercialKeywords = [...COMMERCIAL_KEYWORDS, ...(customKeywords?.commercial || [])]
  const praiseKeywords = [...PRAISE_KEYWORDS, ...(customKeywords?.praise || [])]

  // PRIORITY 1: Check spam keywords first
  for (const keyword of spamKeywords) {
    if (keyword && normalizedText.includes(keyword.toLowerCase())) {
      return { 
        classified: true, 
        sentiment: 'negative', 
        classification: 'spam', 
        intent_score: 0, 
        summary: 'Spam detectado por keyword',
        classificationMethod: 'keyword_spam'
      }
    }
  }

  // PRIORITY 2: Check commercial keywords (higher business value)
  for (const keyword of commercialKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return { 
        classified: true, 
        sentiment: 'positive', 
        classification: 'commercial_interest', 
        intent_score: 95, 
        summary: 'Interesse comercial detectado por keyword',
        classificationMethod: 'keyword_commercial'
      }
    }
  }

  // PRIORITY 3: Check praise keywords (only if comment is short - 25 chars or less)
  // Longer praise comments go to AI to detect other signals (like "amei essa cor, onde compro")
  if (normalizedText.length <= 25) {
    for (const keyword of praiseKeywords) {
      if (normalizedText.includes(keyword.toLowerCase()) || normalizedText === keyword.toLowerCase()) {
        return { 
          classified: true, 
          sentiment: 'positive', 
          classification: 'praise', 
          intent_score: 20, 
          summary: 'Elogio simples',
          classificationMethod: 'keyword_praise'
        }
      }
    }
  }

  // Not classified by keywords - needs AI
  return { classified: false }
}

// ============= AI PROMPT BUILDERS =============

function buildClassificationPrompt(knowledgeBase?: any) {
  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Descrição: ${knowledgeBase.business_description || 'Não informado'}
- Público-alvo: ${knowledgeBase.target_audience || 'Não informado'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
${knowledgeBase.commercial_keywords?.length ? `- Palavras comerciais: ${knowledgeBase.commercial_keywords.join(', ')}` : ''}
${knowledgeBase.spam_keywords?.length ? `- Palavras de spam: ${knowledgeBase.spam_keywords.join(', ')}` : ''}
` : ''

  const defaultCategories = {
    product_question: 'Dúvida de Produto - perguntas sobre características, uso, benefícios',
    purchase_question: 'Dúvida de Compra/Preço - perguntas sobre preço, pagamento, entrega',
    commercial_interest: 'Interesse Comercial - demonstra vontade de comprar',
    praise: 'Elogio - feedback positivo, agradecimento',
    complaint: 'Crítica/Reclamação - insatisfação, problema',
    contact_request: 'Pedido de Contato - quer falar por DM, WhatsApp, etc',
    friend_tag: 'Marcação de Amigo - apenas marcou alguém sem contexto relevante',
    spam: 'Spam - conteúdo irrelevante, propaganda, bots',
    other: 'Outro - não se encaixa nas categorias acima'
  }

  const categories = knowledgeBase?.custom_categories || defaultCategories
  const categoryList = Object.entries(categories)
    .map(([key, desc]) => `   - "${key}" - ${desc}`)
    .join('\n')

  return `Você é um especialista em análise de comentários de redes sociais para negócios digitais.
${businessContext}
Analise o comentário abaixo e forneça:
1. sentiment: "positive", "neutral" ou "negative"
2. classification: uma das opções:
${categoryList}
3. intent_score: número de 0 a 100 representando intenção comercial (0 = nenhuma, 100 = muito alta)
4. summary: resumo de 1 linha do comentário (máximo 100 caracteres)

Contexto do post (se disponível): {post_context}

Comentário para análise:
"{comment_text}"

Responda APENAS em JSON válido no formato:
{"sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}`
}

// Build batch prompt for OpenAI (more cost-effective)
function buildBatchPrompt(comments: Array<{id: string, text: string, postContext: string}>, knowledgeBase?: any) {
  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Descrição: ${knowledgeBase.business_description || 'Não informado'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
` : ''

  const commentsText = comments.map((c, i) => 
    `[${i+1}] ID: ${c.id}
Contexto do post: ${c.postContext || 'N/A'}
Comentário: "${c.text}"`
  ).join('\n\n')

  return `${businessContext}

Analise os ${comments.length} comentários abaixo de redes sociais. Para cada um, forneça:
- sentiment: "positive", "neutral" ou "negative"
- classification: "product_question", "purchase_question", "commercial_interest", "praise", "complaint", "contact_request", "friend_tag", "spam" ou "other"
- intent_score: 0-100 (intenção comercial)
- summary: resumo de 1 linha (máx 80 caracteres)

${commentsText}

Responda em JSON array válido no formato:
[{"id": "...", "sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}, ...]`
}

// ============= AI CLASSIFICATION FUNCTIONS =============

// Classify using OpenAI gpt-4o-mini (cheaper)
async function classifyWithOpenAI(comments: Array<{id: string, text: string, postContext: string}>, knowledgeBase?: any) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const prompt = buildBatchPrompt(comments, knowledgeBase)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em análise de comentários de redes sociais para negócios digitais brasileiros. Responda sempre em JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', response.status, errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.error('Invalid OpenAI response:', content)
    throw new Error('Invalid OpenAI response format')
  }

  const results = JSON.parse(jsonMatch[0])
  
  // Calculate token usage and cost
  const inputTokens = data.usage?.prompt_tokens || 0
  const outputTokens = data.usage?.completion_tokens || 0
  const cost = (inputTokens * 0.00000015) + (outputTokens * 0.0000006) // gpt-4o-mini pricing

  return { results, inputTokens, outputTokens, cost }
}

// Classify using Lovable AI (fallback)
async function classifyWithLovableAI(commentText: string, postContext: string, classificationPrompt: string) {
  const prompt = classificationPrompt
    .replace('{post_context}', postContext)
    .replace('{comment_text}', commentText)

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  // Handle credit exhaustion and rate limit errors
  if (response.status === 402) {
    console.error('[LOVABLE_AI] Credits exhausted (402 Payment Required)')
    throw new Error('LOVABLE_CREDITS_EXHAUSTED')
  }
  
  if (response.status === 429) {
    console.error('[LOVABLE_AI] Rate limit exceeded (429)')
    throw new Error('LOVABLE_RATE_LIMITED')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Invalid AI response format')
  }

  return JSON.parse(jsonMatch[0])
}

// ============= QUOTA AND TRACKING FUNCTIONS =============

async function checkAndUseQuota(supabase: any, projectId: string, itemsCount: number) {
  const { data, error } = await supabase.rpc('check_and_use_ai_quota', {
    p_project_id: projectId,
    p_items_count: itemsCount
  })

  if (error) {
    console.error('Error checking AI quota:', error)
    // If quota check fails, allow processing (don't block)
    return { allowed: true, error: error.message }
  }

  return data
}

async function trackAIUsage(supabase: any, projectId: string, params: {
  feature: string
  action: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  itemsProcessed: number
  costEstimate: number
  success: boolean
  errorMessage?: string
}) {
  const { error } = await supabase
    .from('ai_usage_tracking')
    .insert({
      project_id: projectId,
      feature: params.feature,
      action: params.action,
      provider: params.provider,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      items_processed: params.itemsProcessed,
      cost_estimate: params.costEstimate,
      success: params.success,
      error_message: params.errorMessage,
    })

  if (error) {
    console.error('Error tracking AI usage:', error)
  }
}

// ============= MAIN REQUEST HANDLER =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    const { action, projectId, postId, limit } = body

    if (!projectId || typeof projectId !== 'string' || !UUID_REGEX.test(projectId)) {
      return new Response(JSON.stringify({
        error: 'projectId é obrigatório e deve ser um UUID válido',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Social Comments API request:', { action, projectId })

    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle()

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'Acesso negado ao projeto' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let accessToken: string | undefined
    if (ACTIONS_REQUIRING_META_CREDENTIALS.has(action)) {
      // Get Meta credentials only for actions that actually call Graph API
      const { data: credentials, error: credError } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (credError || !credentials) {
        return new Response(JSON.stringify({ 
          error: 'Meta não conectado',
          needsConnection: true 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      accessToken = credentials.access_token
    }

    let result: any

    switch (action) {
      case 'get_available_pages':
        result = await getAvailablePages(accessToken!)
        break

      case 'save_pages': {
        const { pages } = body
        result = await saveSelectedPages(serviceSupabase, projectId, pages)
        break
      }

      case 'get_saved_pages':
        result = await getSavedPages(serviceSupabase, projectId)
        break

      case 'sync_posts':
        result = await syncPosts(serviceSupabase, projectId, accessToken!)
        break

      case 'sync_comments':
        result = await syncComments(serviceSupabase, projectId, accessToken!, postId)
        break

      case 'process_ai':
        result = await processCommentsWithAI(serviceSupabase, projectId, limit || 50)
        break

      case 'link_crm_contacts':
        result = await linkExistingCommentsToCRM(serviceSupabase, projectId)
        break

      case 'get_stats':
        result = await getStats(supabase, projectId)
        break

      case 'remove_page': {
        const { pageId: removePageId } = body
        result = await removePage(serviceSupabase, projectId, removePageId)
        break
      }

      case 'sync_ad_comments':
        result = await syncAdComments(serviceSupabase, projectId, accessToken!)
        break

      case 'generate_reply': {
        const { commentId } = body
        result = await generateReply(serviceSupabase, projectId, commentId)
        break
      }

      case 'get_ai_usage':
        result = await getAIUsage(supabase, projectId)
        break

      case 'get_ai_quota':
        result = await getAIQuota(supabase, projectId)
        break

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Social Comments API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ============= POST SYNC FUNCTIONS =============

async function syncPosts(supabase: any, projectId: string, accessToken: string) {
  console.log('='.repeat(60))
  console.log('[SYNC_POSTS] Starting sync for project:', projectId)
  
  let totalPosts = 0
  const errors: string[] = []

  try {
    const { data: savedPages, error: pagesError } = await supabase
      .from('social_listening_pages')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)

    if (pagesError) {
      console.error('[SYNC_POSTS] Error fetching saved pages:', pagesError)
      throw new Error('Erro ao buscar páginas salvas')
    }

    if (!savedPages || savedPages.length === 0) {
      console.log('[SYNC_POSTS] No saved pages found for project')
      return { success: false, error: 'Nenhuma página configurada. Adicione páginas primeiro.', postsSynced: 0 }
    }

    console.log(`[SYNC_POSTS] Found ${savedPages.length} saved pages to sync`)

    for (const savedPage of savedPages) {
      const pageToken = savedPage.page_access_token
      const pageName = savedPage.page_name
      const rawPageId = savedPage.page_id
      const instagramAccountId = savedPage.instagram_account_id
      const platform = savedPage.platform

      const originalPageId = rawPageId.replace(/_facebook$/, '').replace(/_instagram$/, '')

      if (platform === 'facebook' || (!platform && !instagramAccountId)) {
        try {
          const fbPosts = await fetchFacebookPosts(originalPageId, pageToken)
          for (const post of fbPosts) {
            await upsertPost(supabase, projectId, 'facebook', post, pageName, originalPageId)
            totalPosts++
          }
        } catch (e: any) {
          console.error(`[SYNC_PAGE] FB Page ${pageName} error:`, e.message)
          errors.push(`FB Page ${pageName}: ${e.message}`)
        }
      }

      if (platform === 'instagram' && instagramAccountId) {
        try {
          const igPosts = await fetchInstagramPosts(instagramAccountId, pageToken, accessToken)
          for (const post of igPosts) {
            await upsertPost(supabase, projectId, 'instagram', post, pageName, instagramAccountId)
            totalPosts++
          }
        } catch (e: any) {
          console.error(`[SYNC_PAGE] IG ${pageName} error:`, e.message)
          errors.push(`IG ${pageName}: ${e.message}`)
        }
      }

      await supabase
        .from('social_listening_pages')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', savedPage.id)

      await delay(500)
    }

    console.log(`[SYNC_POSTS] COMPLETED: ${totalPosts} posts synced, ${errors.length} errors`)

    if (totalPosts === 0 && errors.length > 0) {
      return { success: false, error: errors[0], postsSynced: totalPosts, errors }
    }

    return { success: true, postsSynced: totalPosts, errors }
  } catch (error: any) {
    console.error('[SYNC_POSTS] FATAL ERROR:', error)
    return { success: false, error: error.message, errors }
  }
}

async function fetchFacebookPosts(pageId: string, pageToken: string): Promise<any[]> {
  const posts: any[] = []
  let nextUrl: string | null = `${GRAPH_API_BASE}/${pageId}/posts?fields=id,message,created_time,permalink_url,status_type,full_picture&limit=50&access_token=${pageToken}`

  while (nextUrl !== null && posts.length < 100) {
    const currentUrl = nextUrl
    nextUrl = null
    
    const fetchResponse: Response = await fetch(currentUrl)
    const fetchData: any = await fetchResponse.json()

    if (fetchData.error) {
      throw new Error(fetchData.error.message)
    }

    posts.push(...(fetchData.data || []))
    nextUrl = fetchData.paging?.next || null
    await delay(200)
  }

  return posts
}

async function fetchInstagramPosts(igAccountId: string, pageToken: string, mainAccessToken?: string) {
  const tokensToTry = [{ token: pageToken, name: 'page_access_token' }]
  if (mainAccessToken && mainAccessToken !== pageToken) {
    tokensToTry.push({ token: mainAccessToken, name: 'main_access_token' })
  }

  let lastError: Error | null = null

  for (let i = 0; i < tokensToTry.length; i++) {
    const { token, name } = tokensToTry[i]
    const url = `${GRAPH_API_BASE}/${igAccountId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        lastError = new Error(`${data.error.message} (code: ${data.error.code})`)
        if ([10, 190, 200].includes(data.error.code) && i < tokensToTry.length - 1) {
          continue
        }
        throw lastError
      }

      return data.data || []
    } catch (fetchError: any) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError))
      if (i < tokensToTry.length - 1) continue
      throw lastError
    }
  }

  throw lastError || new Error('Falha ao buscar posts do Instagram')
}

async function upsertPost(supabase: any, projectId: string, platform: string, post: any, pageName: string, pageId?: string) {
  const postData: any = {
    project_id: projectId,
    platform,
    post_id_meta: post.id,
    page_id: pageId || null,
    page_name: pageName,
    post_type: 'organic',
    message: platform === 'instagram' ? post.caption : post.message,
    media_type: platform === 'instagram' ? post.media_type?.toLowerCase() : (post.status_type || 'post'),
    permalink: platform === 'instagram' ? post.permalink : post.permalink_url,
    likes_count: post.like_count || 0,
    comments_count: post.comments_count || 0,
    shares_count: post.shares?.count || 0,
    published_at: platform === 'instagram' ? post.timestamp : post.created_time,
    last_synced_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('social_posts')
    .upsert(postData, { onConflict: 'project_id,platform,post_id_meta' })

  if (error) {
    console.error('Error upserting post:', error)
  }
}

// ============= COMMENT SYNC FUNCTIONS =============

async function syncComments(supabase: any, projectId: string, accessToken: string, specificPostId?: string) {
  console.log('Syncing comments for project:', projectId)

  let totalComments = 0
  const errors: string[] = []

  let posts: any[] = []

  if (specificPostId) {
    const { data, error: postError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', specificPostId)
      .limit(1)

    if (postError || !data) {
      return { success: false, error: 'Erro ao buscar post específico' }
    }

    posts = data
  } else {
    const [fbRes, igRes] = await Promise.all([
      supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .order('published_at', { ascending: false })
        .limit(25),
      supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'instagram')
        .order('published_at', { ascending: false })
        .limit(25),
    ])

    posts = [...(fbRes.data || []), ...(igRes.data || [])]
  }

  if (posts.length === 0) {
    return { success: true, commentsSynced: 0, message: 'Nenhum post para sincronizar' }
  }

  // Get page tokens
  const pageIds = [...new Set(posts.map(p => p.page_id).filter(Boolean))]
  const { data: savedPages } = await supabase
    .from('social_listening_pages')
    .select('page_id, instagram_account_id, page_access_token')
    .eq('project_id', projectId)
    .in('page_id', pageIds.length > 0 ? pageIds : ['none'])

  const pageTokenMap = new Map<string, string>()
  for (const page of savedPages || []) {
    if (page.page_id) pageTokenMap.set(page.page_id, page.page_access_token)
    if (page.instagram_account_id) pageTokenMap.set(page.instagram_account_id, page.page_access_token)
  }

  for (const post of posts) {
    const pageToken = pageTokenMap.get(post.page_id) || accessToken

    try {
      const apiComments = await fetchCommentsForPost(post, pageToken, accessToken)

      for (const comment of apiComments) {
        await upsertComment(supabase, projectId, post.id, post.platform, comment, null)
        totalComments++

        if (comment.replies?.data) {
          for (const reply of comment.replies.data) {
            await upsertComment(supabase, projectId, post.id, post.platform, reply, comment.id)
            totalComments++
          }
        }
      }
    } catch (e: any) {
      console.error(`Error syncing comments for post ${post.id}:`, e.message)
      errors.push(`Post ${post.id}: ${e.message}`)
    }

    await delay(300)
  }

  return { success: true, commentsSynced: totalComments, errors }
}

async function fetchCommentsForPost(post: any, pageToken: string, fallbackToken: string): Promise<any[]> {
  const platform = post.platform
  const postIdMeta = post.post_id_meta

  let url: string
  if (platform === 'instagram') {
    url = `${GRAPH_API_BASE}/${postIdMeta}/comments?fields=id,text,timestamp,username,like_count,replies{id,text,timestamp,username,like_count}&limit=100&access_token=${pageToken}`
  } else {
    url = `${GRAPH_API_BASE}/${postIdMeta}/comments?fields=id,message,created_time,from,like_count,comment_count,comments{id,message,created_time,from,like_count}&limit=100&access_token=${pageToken}`
  }

  const response = await fetch(url)
  const data = await response.json()

  if (data.error) {
    if (data.error.code === 190 || data.error.code === 10) {
      const retryUrl = url.replace(pageToken, fallbackToken)
      const retryResponse = await fetch(retryUrl)
      const retryData = await retryResponse.json()
      if (retryData.error) throw new Error(retryData.error.message)
      return retryData.data || []
    }
    throw new Error(data.error.message)
  }

  return data.data || []
}

async function upsertComment(supabase: any, projectId: string, postId: string, platform: string, comment: any, parentId: string | null) {
  const authorUsername = platform === 'instagram' ? comment.username : comment.from?.name
  
  let crmContactId: string | null = null
  if (authorUsername && platform === 'instagram') {
    crmContactId = await findCRMContactByInstagram(supabase, projectId, authorUsername)
  }

  // Check if this comment is from the connected account (own account)
  let isOwnAccount = false
  if (authorUsername) {
    const { data: pages } = await supabase
      .from('social_listening_pages')
      .select('instagram_username, page_name')
      .eq('project_id', projectId)
    
    const normalizedAuthor = authorUsername.toLowerCase().replace(/^@/, '')
    isOwnAccount = pages?.some((p: any) => {
      const pageUsername = (p.instagram_username || p.page_name || '').toLowerCase().replace(/^@/, '')
      return pageUsername && pageUsername === normalizedAuthor
    }) || false
    
    if (isOwnAccount) {
      console.log(`[SYNC] Own account comment detected: @${authorUsername}`)
    }
  }
  
  const commentData: any = {
    project_id: projectId,
    post_id: postId,
    platform,
    comment_id_meta: comment.id,
    parent_comment_id: parentId || null,
    text: platform === 'instagram' ? comment.text : comment.message,
    author_username: authorUsername,
    author_id: platform === 'instagram' ? null : comment.from?.id,
    like_count: comment.like_count || 0,
    reply_count: comment.comment_count || comment.replies?.data?.length || 0,
    comment_timestamp: platform === 'instagram' ? comment.timestamp : comment.created_time,
    ai_processing_status: isOwnAccount ? 'skipped' : 'pending',
    crm_contact_id: crmContactId,
    is_deleted: false,
    is_own_account: isOwnAccount,
  }

  const { error } = await supabase
    .from('social_comments')
    .upsert(commentData, { onConflict: 'project_id,platform,comment_id_meta' })

  if (error) {
    console.error('Error upserting comment:', error)
  }
}

async function findCRMContactByInstagram(supabase: any, projectId: string, instagramUsername: string): Promise<string | null> {
  if (!instagramUsername) return null
  
  const normalizedUsername = instagramUsername.replace(/^@/, '').toLowerCase()
  
  const { data, error } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('project_id', projectId)
    .or(`instagram.ilike.${normalizedUsername},instagram.ilike.@${normalizedUsername}`)
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Error finding CRM contact by Instagram:', error)
    return null
  }
  
  return data?.id || null
}

async function linkExistingCommentsToCRM(supabase: any, projectId: string) {
  console.log('Linking existing comments to CRM contacts for project:', projectId)
  
  let linked = 0
  let notFound = 0
  
  const { data: comments, error } = await supabase
    .from('social_comments')
    .select('id, author_username, platform')
    .eq('project_id', projectId)
    .eq('platform', 'instagram')
    .is('crm_contact_id', null)
    .not('author_username', 'is', null)
    .limit(500)
  
  if (error || !comments?.length) {
    return { success: true, linked: 0, message: 'Nenhum comentário pendente para vincular' }
  }
  
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, instagram')
    .eq('project_id', projectId)
    .not('instagram', 'is', null)
  
  const contactMap = new Map<string, string>()
  for (const contact of contacts || []) {
    if (contact.instagram) {
      const normalizedIG = contact.instagram.toLowerCase().replace(/^@/, '')
      contactMap.set(normalizedIG, contact.id)
    }
  }
  
  for (const comment of comments) {
    if (!comment.author_username) continue
    
    const normalizedUsername = comment.author_username.toLowerCase().replace(/^@/, '')
    const contactId = contactMap.get(normalizedUsername)
    
    if (contactId) {
      const { error: updateError } = await supabase
        .from('social_comments')
        .update({ crm_contact_id: contactId })
        .eq('id', comment.id)
      
      if (!updateError) linked++
    } else {
      notFound++
    }
  }
  
  return { success: true, linked, notFound, totalProcessed: comments.length }
}

// ============= AI PROCESSING (WITH KEYWORDS + OPENAI) =============

async function processCommentsWithAI(supabase: any, projectId: string, limit: number) {
  const batchSize = Math.min(limit, 100)
  console.log(`[AI_PROCESS] Processing up to ${batchSize} comments for project:`, projectId)

  // Reset stuck comments
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: stuckComments } = await supabase
    .from('social_comments')
    .update({ ai_processing_status: 'pending' })
    .eq('project_id', projectId)
    .eq('ai_processing_status', 'processing')
    .lt('updated_at', fiveMinutesAgo)
    .select('id')
  
  if (stuckComments?.length > 0) {
    console.log(`[AI_PROCESS] Reset ${stuckComments.length} stuck comments`)
  }

  // Fetch knowledge base
  const { data: knowledgeBase } = await supabase
    .from('ai_knowledge_base')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  // Get pending comments (exclude own account comments)
  const { data: comments, error } = await supabase
    .from('social_comments')
    .select('id, text, post_id, social_posts!inner(message)')
    .eq('project_id', projectId)
    .eq('ai_processing_status', 'pending')
    .eq('is_own_account', false)
    .limit(batchSize)

  if (error || !comments?.length) {
    return { success: true, processed: 0, message: 'Nenhum comentário pendente' }
  }

  console.log(`[AI_PROCESS] Found ${comments.length} comments to process`)

  let keywordClassified = 0
  let aiProcessed = 0
  let failed = 0

  // ============= PHASE 1: KEYWORD CLASSIFICATION =============
  const commentsForAI: Array<{id: string, text: string, postContext: string}> = []

  // Prepare custom keywords from database
  const customKeywords: CustomKeywords | undefined = knowledgeBase ? {
    commercial: knowledgeBase.commercial_keywords || [],
    praise: knowledgeBase.praise_keywords || [],
    spam: knowledgeBase.spam_keywords || []
  } : undefined

  console.log(`[AI_PROCESS] Custom keywords loaded:`, {
    commercial: customKeywords?.commercial?.length || 0,
    praise: customKeywords?.praise?.length || 0,
    spam: customKeywords?.spam?.length || 0
  })

  for (const comment of comments) {
    const keywordResult = classifyByKeywords(comment.text || '', customKeywords)

    if (keywordResult.classified) {
      // Classify by keyword (no AI needed)
      await supabase
        .from('social_comments')
        .update({
          sentiment: keywordResult.sentiment,
          classification: keywordResult.classification,
          classification_key: keywordResult.classification,
          intent_score: keywordResult.intent_score,
          ai_summary: keywordResult.summary,
          ai_processing_status: 'completed',
          ai_processed_at: new Date().toISOString(),
        })
        .eq('id', comment.id)

      keywordClassified++
      console.log(`[AI_PROCESS] Keyword classified: "${(comment.text || '').substring(0, 30)}..." -> ${keywordResult.classification} (${keywordResult.classificationMethod})`)
    } else {
      // Needs AI classification
      commentsForAI.push({
        id: comment.id,
        text: comment.text || '',
        postContext: comment.social_posts?.message || ''
      })
    }
  }

  console.log(`[AI_PROCESS] Keyword classified: ${keywordClassified}, Needs AI: ${commentsForAI.length}`)

  // ============= PHASE 2: AI CLASSIFICATION (OpenAI or Lovable) =============
  if (commentsForAI.length > 0) {
    // Check quota
    const quotaResult = await checkAndUseQuota(supabase, projectId, commentsForAI.length)
    
    if (!quotaResult.allowed) {
      console.log(`[AI_PROCESS] Quota exceeded:`, quotaResult.reason)
      return {
        success: true,
        processed: keywordClassified,
        keywordClassified,
        aiProcessed: 0,
        failed: 0,
        quotaExceeded: true,
        quotaInfo: quotaResult,
        lovableRemaining: quotaResult.lovable_remaining || 0
      }
    }

    // Check if we need to use fallback provider (Lovable credits exhausted)
    let useFallbackProvider = quotaResult.use_fallback_provider || null
    if (useFallbackProvider === 'openai' && !OPENAI_API_KEY) {
      console.log('[AI_PROCESS] Lovable credits exhausted and no OpenAI key configured')
      return {
        success: false,
        error: 'Créditos de IA esgotados. Configure uma API Key OpenAI para continuar processando.',
        quotaExceeded: true,
        lovableRemaining: 0,
        noFallbackAvailable: true
      }
    }

    // Mark as processing
    await supabase
      .from('social_comments')
      .update({ ai_processing_status: 'processing' })
      .in('id', commentsForAI.map(c => c.id))

    // Get provider preference from quota result or ai_project_quotas
    const providerPreference = quotaResult.provider_preference || 'lovable'
    
    // Determine which provider to use based on preference, availability, and fallback
    const useOpenAI = useFallbackProvider === 'openai' || (providerPreference === 'openai' && !!OPENAI_API_KEY)
    const useLovableFirst = !useOpenAI && (providerPreference === 'lovable' || !OPENAI_API_KEY)
    
    console.log(`[AI_PROCESS] Provider preference: ${providerPreference}, Fallback: ${useFallbackProvider}, Using OpenAI: ${useOpenAI}, Using Lovable First: ${useLovableFirst}`)

    if (useLovableFirst) {
      // Use Lovable AI as primary
      const classificationPrompt = buildClassificationPrompt(knowledgeBase)
      
      for (const comment of commentsForAI) {
        try {
          const result = await classifyWithLovableAI(comment.text, comment.postContext, classificationPrompt)
          
          // Track Lovable AI usage
          await trackAIUsage(supabase, projectId, {
            feature: 'social_listening',
            action: 'classify',
            provider: 'lovable',
            model: 'google/gemini-2.5-flash',
            inputTokens: 0,
            outputTokens: 0,
            itemsProcessed: 1,
            costEstimate: 0, // Lovable AI is free
            success: true
          })

          // Update lovable_credits_used
          await supabase.rpc('increment_lovable_credits', { p_project_id: projectId, p_count: 1 })
          
          await supabase
            .from('social_comments')
            .update({
              sentiment: result.sentiment,
              classification: result.classification,
              classification_key: result.classification,
              intent_score: result.intent_score,
              ai_summary: result.summary,
              ai_processing_status: 'completed',
              ai_processed_at: new Date().toISOString(),
            })
            .eq('id', comment.id)

          aiProcessed++
        } catch (lovableError: any) {
          console.error(`[AI_PROCESS] Lovable AI error for ${comment.id}:`, lovableError.message)
          
          // Check if credits exhausted or rate limited - mark in database
          if (lovableError.message === 'LOVABLE_CREDITS_EXHAUSTED' || lovableError.message === 'LOVABLE_RATE_LIMITED') {
            console.log('[AI_PROCESS] Lovable credits exhausted/rate limited, marking and switching to fallback')
            
            // Update quota to mark Lovable as exhausted
            await supabase
              .from('ai_project_quotas')
              .update({ 
                lovable_credits_used: supabase.raw('lovable_credits_limit'),
                updated_at: new Date().toISOString() 
              })
              .eq('project_id', projectId)
          }
          
          // Try OpenAI as fallback if available
          if (OPENAI_API_KEY) {
            try {
              console.log('[AI_PROCESS] Falling back to OpenAI for single comment')
              const { results, inputTokens, outputTokens, cost } = await classifyWithOpenAI([comment], knowledgeBase)
              
              await trackAIUsage(supabase, projectId, {
                feature: 'social_listening',
                action: 'classify_fallback',
                provider: 'openai',
                model: 'gpt-4o-mini',
                inputTokens,
                outputTokens,
                itemsProcessed: 1,
                costEstimate: cost,
                success: true
              })
              
              if (results?.[0]) {
                await supabase
                  .from('social_comments')
                  .update({
                    sentiment: results[0].sentiment,
                    classification: results[0].classification,
                    classification_key: results[0].classification,
                    intent_score: results[0].intent_score,
                    ai_summary: results[0].summary,
                    ai_processing_status: 'completed',
                    ai_processed_at: new Date().toISOString(),
                  })
                  .eq('id', comment.id)
                
                aiProcessed++
                continue
              }
            } catch (openaiError: any) {
              console.error('[AI_PROCESS] OpenAI fallback also failed:', openaiError.message)
            }
          }
          
          await supabase
            .from('social_comments')
            .update({
              ai_processing_status: 'failed',
              ai_error: lovableError.message
            })
            .eq('id', comment.id)

          failed++
        }

        await delay(200)
      }
    } else if (useOpenAI) {
      // Use OpenAI as primary (user's preference)
      try {
        // Process in batches of 15 for OpenAI
        const openAIBatchSize = 15
        for (let i = 0; i < commentsForAI.length; i += openAIBatchSize) {
          const batch = commentsForAI.slice(i, i + openAIBatchSize)
          
          const { results, inputTokens, outputTokens, cost } = await classifyWithOpenAI(batch, knowledgeBase)

          // Track usage
          await trackAIUsage(supabase, projectId, {
            feature: 'social_listening',
            action: 'batch_classify',
            provider: 'openai',
            model: 'gpt-4o-mini',
            inputTokens,
            outputTokens,
            itemsProcessed: batch.length,
            costEstimate: cost,
            success: true
          })

          // Update openai_credits_used
          await supabase.rpc('increment_openai_credits', { p_project_id: projectId, p_count: batch.length })

          // Update comments with results
          for (const result of results) {
            await supabase
              .from('social_comments')
              .update({
                sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) ? result.sentiment : 'neutral',
                classification: result.classification || 'other',
                classification_key: result.classification || 'other',
                intent_score: Math.min(100, Math.max(0, parseInt(result.intent_score) || 0)),
                ai_summary: (result.summary || '').substring(0, 100),
                ai_processing_status: 'completed',
                ai_processed_at: new Date().toISOString(),
              })
              .eq('id', result.id)

            aiProcessed++
          }

          if (i + openAIBatchSize < commentsForAI.length) {
            await delay(500) // Rate limiting between batches
          }
        }
      } catch (openaiError: any) {
        console.error('[AI_PROCESS] OpenAI error, falling back to Lovable AI:', openaiError.message)
        
        // Track failed usage
        await trackAIUsage(supabase, projectId, {
          feature: 'social_listening',
          action: 'batch_classify',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputTokens: 0,
          outputTokens: 0,
          itemsProcessed: commentsForAI.length,
          costEstimate: 0,
          success: false,
          errorMessage: openaiError.message
        })

        // Fallback to Lovable AI (individual processing)
        const classificationPrompt = buildClassificationPrompt(knowledgeBase)
        
        for (const comment of commentsForAI) {
          try {
            const result = await classifyWithLovableAI(comment.text, comment.postContext, classificationPrompt)
            
            await supabase
              .from('social_comments')
              .update({
                sentiment: result.sentiment,
                classification: result.classification,
                classification_key: result.classification,
                intent_score: result.intent_score,
                ai_summary: result.summary,
                ai_processing_status: 'completed',
                ai_processed_at: new Date().toISOString(),
              })
              .eq('id', comment.id)

            aiProcessed++
          } catch (lovableError: any) {
            console.error(`[AI_PROCESS] Lovable AI error for ${comment.id}:`, lovableError.message)
            
            await supabase
              .from('social_comments')
              .update({
                ai_processing_status: 'failed',
                ai_error: lovableError.message
              })
              .eq('id', comment.id)

            failed++
          }

          await delay(200)
        }
      }
    } else {
      // No OpenAI key, use Lovable AI directly
      const classificationPrompt = buildClassificationPrompt(knowledgeBase)
      
      for (const comment of commentsForAI) {
        try {
          const result = await classifyWithLovableAI(comment.text, comment.postContext, classificationPrompt)
          
          await supabase
            .from('social_comments')
            .update({
              sentiment: result.sentiment,
              classification: result.classification,
              classification_key: result.classification,
              intent_score: result.intent_score,
              ai_summary: result.summary,
              ai_processing_status: 'completed',
              ai_processed_at: new Date().toISOString(),
            })
            .eq('id', comment.id)

          aiProcessed++
        } catch (e: any) {
          await supabase
            .from('social_comments')
            .update({
              ai_processing_status: 'failed',
              ai_error: e.message
            })
            .eq('id', comment.id)

          failed++
        }

        await delay(200)
      }
    }
  }

  const totalProcessed = keywordClassified + aiProcessed
  console.log(`[AI_PROCESS] Completed: ${totalProcessed} total (${keywordClassified} keyword, ${aiProcessed} AI), ${failed} failed`)

  return { 
    success: true, 
    processed: totalProcessed,
    keywordClassified,
    aiProcessed,
    failed,
    total: comments.length
  }
}

// ============= STATS AND USAGE =============

async function getStats(supabase: any, projectId: string) {
  const [totalRes, pendingRes, sentimentRes, classificationRes] = await Promise.all([
    supabase.from('social_comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('social_comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('ai_processing_status', 'pending'),
    supabase.from('social_comments').select('sentiment').eq('project_id', projectId).eq('ai_processing_status', 'completed'),
    supabase.from('social_comments').select('classification').eq('project_id', projectId).eq('ai_processing_status', 'completed'),
  ])

  const sentimentCounts: Record<string, number> = {}
  for (const item of sentimentRes.data || []) {
    sentimentCounts[item.sentiment || 'unknown'] = (sentimentCounts[item.sentiment || 'unknown'] || 0) + 1
  }

  const classificationCounts: Record<string, number> = {}
  for (const item of classificationRes.data || []) {
    classificationCounts[item.classification || 'unknown'] = (classificationCounts[item.classification || 'unknown'] || 0) + 1
  }

  return {
    total: totalRes.count || 0,
    pending: pendingRes.count || 0,
    processed: (totalRes.count || 0) - (pendingRes.count || 0),
    sentiment: sentimentCounts,
    classification: classificationCounts,
  }
}

async function getAIUsage(supabase: any, projectId: string) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [dailyRes, monthlyRes, recentRes] = await Promise.all([
    supabase
      .from('ai_usage_tracking')
      .select('items_processed, cost_estimate')
      .eq('project_id', projectId)
      .gte('created_at', startOfDay),
    supabase
      .from('ai_usage_tracking')
      .select('items_processed, cost_estimate')
      .eq('project_id', projectId)
      .gte('created_at', startOfMonth),
    supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const dailyItems = (dailyRes.data || []).reduce((sum: number, r: any) => sum + (r.items_processed || 0), 0)
  const dailyCost = (dailyRes.data || []).reduce((sum: number, r: any) => sum + parseFloat(r.cost_estimate || 0), 0)
  const monthlyItems = (monthlyRes.data || []).reduce((sum: number, r: any) => sum + (r.items_processed || 0), 0)
  const monthlyCost = (monthlyRes.data || []).reduce((sum: number, r: any) => sum + parseFloat(r.cost_estimate || 0), 0)

  return {
    daily: { items: dailyItems, cost: dailyCost.toFixed(4) },
    monthly: { items: monthlyItems, cost: monthlyCost.toFixed(4) },
    recent: recentRes.data || [],
  }
}

async function getAIQuota(supabase: any, projectId: string) {
  const { data, error } = await supabase
    .from('ai_project_quotas')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  return data || {
    daily_limit: 100,
    monthly_limit: 3000,
    current_daily_usage: 0,
    current_monthly_usage: 0,
    is_unlimited: false,
    provider_preference: 'openai'
  }
}

// ============= PAGE MANAGEMENT =============

async function getAvailablePages(accessToken: string) {
  const pagesUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`
  const response = await fetch(pagesUrl)
  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  const pages: any[] = []
  for (const page of data.data || []) {
    pages.push({
      id: `${page.id}_facebook`,
      page_id: page.id,
      name: `${page.name} (Facebook)`,
      platform: 'facebook',
      access_token: page.access_token,
    })

    if (page.instagram_business_account) {
      pages.push({
        id: `${page.id}_instagram`,
        page_id: page.id,
        instagram_account_id: page.instagram_business_account.id,
        name: `@${page.instagram_business_account.username || page.name} (Instagram)`,
        platform: 'instagram',
        access_token: page.access_token,
        profile_picture: page.instagram_business_account.profile_picture_url,
      })
    }
  }

  return { pages }
}

async function saveSelectedPages(supabase: any, projectId: string, pages: any[]) {
  const normalizedPages = Array.isArray(pages) ? pages : []
  console.log(`[SAVE_PAGES] Received ${normalizedPages.length} page(s) for project ${projectId}`)

  let insertedCount = 0
  const errors: string[] = []

  for (const rawPage of normalizedPages) {

    // 🔥 NORMALIZAÇÃO INTELIGENTE (resolve seu erro)
    const page_id = rawPage?.page_id || rawPage?.id
    const name = rawPage?.name
    const platform = rawPage?.platform
    const access_token = rawPage?.access_token

    if (!page_id || !name || !platform || !access_token) {
      console.warn('[SAVE_PAGES] Skipping invalid page payload:', rawPage)
      errors.push(`Payload inválido para página ${rawPage?.id || 'unknown'}`)
      continue
    }

    console.log(`[SAVE_PAGES] Upserting page: ${page_id} (${platform})`)

    const { data: upsertedPage, error } = await supabase
      .from('social_listening_pages')
      .upsert({
        project_id: projectId,
        page_id: page_id, // ✅ sempre ID real
        page_name: name,
        platform: platform,
        page_access_token: access_token,
        instagram_account_id: rawPage?.instagram_account_id || null,
        instagram_username: rawPage?.instagram_username || null,
        is_active: true,
      }, { onConflict: 'project_id,page_id' })
      .select('id, page_id, platform')
      .single()

    if (error) {
      console.error('[SAVE_PAGES] Error saving page:', error)
      errors.push(`${page_id}: ${error.message}`)
      continue
    }

    console.log('[SAVE_PAGES] Upsert result:', upsertedPage)
    insertedCount += 1
  }

  console.log(
    `[SAVE_PAGES] Upserted ${insertedCount} page(s) for project ${projectId}`
  )

  if (errors.length > 0) {
    console.warn('[SAVE_PAGES] Errors:', errors)
  }

  return {
    success: errors.length === 0,
    savedCount: insertedCount,
    errors,
  }
}


// ============= AD COMMENTS SYNC =============

async function syncAdComments(supabase: any, projectId: string, accessToken: string) {
  console.log('Syncing ad comments for project:', projectId)

  let totalComments = 0
  const errors: string[] = []

  try {
    const { data: adAccounts } = await supabase
      .from('meta_ad_accounts')
      .select('account_id')
      .eq('project_id', projectId)
      .eq('is_selected', true)

    if (!adAccounts?.length) {
      return { success: true, commentsSynced: 0, message: 'Nenhuma conta de anúncio configurada' }
    }

    for (const account of adAccounts) {
      try {
        const adsUrl = `${GRAPH_API_BASE}/${account.account_id}/ads?fields=id,name,effective_status,creative{effective_object_story_id}&limit=50&access_token=${accessToken}`
        const adsResponse = await fetch(adsUrl)
        const adsData = await adsResponse.json()

        if (adsData.error) {
          errors.push(`Account ${account.account_id}: ${adsData.error.message}`)
          continue
        }

        for (const ad of adsData.data || []) {
          const storyId = ad.creative?.effective_object_story_id
          if (!storyId) continue

          try {
            const commentsUrl = `${GRAPH_API_BASE}/${storyId}/comments?fields=id,message,created_time,from,like_count,comment_count&limit=100&access_token=${accessToken}`
            const commentsResponse = await fetch(commentsUrl)
            const commentsData = await commentsResponse.json()

            if (commentsData.error) continue

            let postId: string | null = null
            const { data: existingPost } = await supabase
              .from('social_posts')
              .select('id')
              .eq('project_id', projectId)
              .eq('post_id_meta', storyId)
              .maybeSingle()

            if (existingPost) {
              postId = existingPost.id
            } else {
              const { data: newPost } = await supabase
                .from('social_posts')
                .insert({
                  project_id: projectId,
                  platform: 'facebook',
                  post_id_meta: storyId,
                  post_type: 'ad',
                  message: ad.name,
                  ad_id: ad.id,
                  last_synced_at: new Date().toISOString(),
                })
                .select('id')
                .single()

              postId = newPost?.id
            }

            if (postId) {
              for (const comment of commentsData.data || []) {
                await upsertComment(supabase, projectId, postId, 'facebook', comment, null)
                totalComments++
              }
            }
          } catch (commentError: any) {
            console.error(`Error syncing comments for ad ${ad.id}:`, commentError.message)
          }

          await delay(200)
        }
      } catch (accountError: any) {
        errors.push(`Account ${account.account_id}: ${accountError.message}`)
      }

      await delay(500)
    }

    return { success: true, commentsSynced: totalComments, errors }
  } catch (error: any) {
    return { success: false, error: error.message, errors }
  }
}

// ============= REPLY GENERATION =============

async function generateReply(supabase: any, projectId: string, commentId: string) {
  console.log('[GENERATE_REPLY] Starting for comment:', commentId, 'project:', projectId)
  
  const { data: comment, error } = await supabase
    .from('social_comments')
    .select('*, social_posts!inner(message)')
    .eq('id', commentId)
    .single()

  if (error || !comment) {
    console.error('[GENERATE_REPLY] Comment not found:', error)
    throw new Error('Comentário não encontrado')
  }

  // Get provider preference from project quotas
  const { data: quotaData } = await supabase
    .from('ai_project_quotas')
    .select('provider_preference')
    .eq('project_id', projectId)
    .maybeSingle()
  
  const providerPreference = quotaData?.provider_preference || 'lovable'
  console.log('[GENERATE_REPLY] Provider preference:', providerPreference)

  const { data: knowledgeBase } = await supabase
    .from('ai_knowledge_base')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Tom de voz: ${knowledgeBase.tone_of_voice || 'Profissional e amigável'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
` : ''

  const prompt = `${businessContext}

Você é um especialista em atendimento ao cliente em redes sociais. Gere uma resposta curta e profissional para o comentário abaixo.

Classificação do comentário: ${comment.classification || 'não classificado'}
Sentimento: ${comment.sentiment || 'neutro'}
Contexto do post: ${comment.social_posts?.message || 'N/A'}

Comentário: "${comment.text}"

Gere uma resposta de no máximo 2 linhas, adequada para redes sociais. Seja empático e útil.`

  let reply: string = ''
  let usedProvider: string = 'lovable'

  // Respect provider preference
  if (providerPreference === 'openai' && OPENAI_API_KEY) {
    console.log('[GENERATE_REPLY] Using OpenAI as preferred provider')
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[GENERATE_REPLY] OpenAI API error:', response.status, errorText)
        throw new Error(`OpenAI error: ${response.status}`)
      }

      const data = await response.json()
      reply = data.choices?.[0]?.message?.content || ''
      usedProvider = 'openai'
      console.log('[GENERATE_REPLY] OpenAI reply generated, length:', reply.length)

      // Track usage
      const inputTokens = data.usage?.prompt_tokens || 0
      const outputTokens = data.usage?.completion_tokens || 0
      await trackAIUsage(supabase, projectId, {
        feature: 'social_listening',
        action: 'generate_reply',
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens,
        outputTokens,
        itemsProcessed: 1,
        costEstimate: (inputTokens * 0.00000015) + (outputTokens * 0.0000006),
        success: true
      })
    } catch (openaiError) {
      console.error('[GENERATE_REPLY] OpenAI error, falling back to Lovable AI:', openaiError)
      reply = await generateReplyWithLovableAI(prompt, supabase, projectId)
      usedProvider = 'lovable'
    }
  } else {
    console.log('[GENERATE_REPLY] Using Lovable AI as preferred provider')
    reply = await generateReplyWithLovableAI(prompt, supabase, projectId)
    usedProvider = 'lovable'
  }

  console.log('[GENERATE_REPLY] Final reply length:', reply.length, 'provider:', usedProvider)

  // Save to ai_suggested_reply field (not suggested_reply)
  const { error: updateError } = await supabase
    .from('social_comments')
    .update({ ai_suggested_reply: reply })
    .eq('id', commentId)

  if (updateError) {
    console.error('[GENERATE_REPLY] Error saving reply:', updateError)
  }

  return { success: true, reply, provider: usedProvider }
}

async function generateReplyWithLovableAI(prompt: string, supabase?: any, projectId?: string): Promise<string> {
  console.log('[LOVABLE_AI] Generating reply...')
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }),
  })

  if (response.status === 402) {
    console.error('[LOVABLE_AI] Credits exhausted (402)')
    throw new Error('Créditos de IA esgotados. Adicione créditos para continuar.')
  }
  
  if (response.status === 429) {
    console.error('[LOVABLE_AI] Rate limit exceeded (429)')
    throw new Error('Limite de requisições excedido. Aguarde alguns segundos.')
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[LOVABLE_AI] Error:', response.status, errorText)
    throw new Error('Falha ao gerar resposta com IA')
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || ''
  console.log('[LOVABLE_AI] Reply generated, length:', reply.length)

  // Track usage if supabase and projectId provided
  if (supabase && projectId) {
    await trackAIUsage(supabase, projectId, {
      feature: 'social_listening',
      action: 'generate_reply',
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      inputTokens: 0,
      outputTokens: 0,
      itemsProcessed: 1,
      costEstimate: 0,
      success: true
    })
  }

  return reply
}
