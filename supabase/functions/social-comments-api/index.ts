import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY_ENV = Deno.env.get('OPENAI_API_KEY')

// Resolve OpenAI key: DB platform_settings takes precedence over env var
async function getOpenAIKey(supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_platform_setting_internal', { p_key: 'openai_api_key' })
    if (!error && data) return data as string
  } catch (_) { /* ignore, fall through to env var */ }
  return OPENAI_API_KEY_ENV || null
}

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

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

  // PRIORITY 3: Check praise keywords (only if comment is short - 60 chars or less)
  // Longer comments go to AI to detect mixed signals (like "amei essa cor, onde compro?")
  if (normalizedText.length <= 60) {
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
  const faqsContext = knowledgeBase?.faqs?.length
    ? `\nPERGUNTAS FREQUENTES DO NEGÓCIO (use para contextualizar dúvidas):\n${(knowledgeBase.faqs as Array<{question: string, answer: string}>).map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`).join('\n')}\n`
    : ''

  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Descrição: ${knowledgeBase.business_description || 'Não informado'}
- Público-alvo: ${knowledgeBase.target_audience || 'Não informado'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
${knowledgeBase.commercial_keywords?.length ? `- Palavras comerciais: ${knowledgeBase.commercial_keywords.join(', ')}` : ''}
${knowledgeBase.spam_keywords?.length ? `- Palavras de spam: ${knowledgeBase.spam_keywords.join(', ')}` : ''}
${faqsContext}` : ''

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
  const defaultCategories = {
    product_question: 'Dúvida de Produto - perguntas sobre características, uso, benefícios',
    purchase_question: 'Dúvida de Compra/Preço - perguntas sobre preço, pagamento, entrega',
    commercial_interest: 'Interesse Comercial - demonstra vontade de comprar',
    praise: 'Elogio - feedback positivo, agradecimento',
    complaint: 'Crítica/Reclamação - insatisfação, problema',
    contact_request: 'Pedido de Contato - quer falar por DM, WhatsApp, etc',
    friend_tag: 'Marcação de Amigo - apenas marcou alguém sem contexto relevante',
    spam: 'Spam - conteúdo irrelevante, propaganda, bots',
    other: 'Outro - não se encaixa nas categorias acima',
  }
  const categories = knowledgeBase?.custom_categories || defaultCategories
  const categoryKeys = Object.keys(categories).map(k => `"${k}"`).join(', ')
  const categoryList = Object.entries(categories)
    .map(([key, desc]) => `   - "${key}" - ${desc}`)
    .join('\n')

  const faqsContext = knowledgeBase?.faqs?.length
    ? `\nPERGUNTAS FREQUENTES DO NEGÓCIO (use para contextualizar dúvidas):\n${(knowledgeBase.faqs as Array<{question: string, answer: string}>).map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`).join('\n')}\n`
    : ''

  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Descrição: ${knowledgeBase.business_description || 'Não informado'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
${faqsContext}` : ''

  const commentsText = comments.map((c, i) =>
    `[${i+1}] ID: ${c.id}
Contexto do post: ${c.postContext || 'N/A'}
Comentário: "${c.text}"`
  ).join('\n\n')

  return `${businessContext}
Analise os ${comments.length} comentários abaixo de redes sociais. Para cada um, forneça:
- sentiment: "positive", "neutral" ou "negative"
- classification: uma das opções: ${categoryKeys}
${categoryList}
- intent_score: 0-100 (intenção comercial)
- summary: resumo de 1 linha (máx 80 caracteres)

${commentsText}

Responda em JSON array válido no formato:
[{"id": "...", "sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}, ...]`
}

// ============= AI CLASSIFICATION FUNCTIONS =============

// Classify using OpenAI gpt-4o-mini (cheaper)
async function classifyWithOpenAI(comments: Array<{id: string, text: string, postContext: string}>, knowledgeBase?: any, apiKey?: string) {
  const key = apiKey || OPENAI_API_KEY_ENV
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const prompt = buildBatchPrompt(comments, knowledgeBase)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
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

    console.log('Social Comments API request:', { action, projectId })

    // Actions that don't require Meta credentials
    if (action === 'test_openai_connection') {
      const serviceSupabase2 = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const result = await testOpenAIConnection(serviceSupabase2)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'generate_reply') {
      const { commentId } = body
      const serviceSupabase2 = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const result = await generateReply(serviceSupabase2, projectId, commentId)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Meta credentials
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

    const accessToken = credentials.access_token

    let result: any

    switch (action) {
      case 'get_available_pages':
        result = await getAvailablePages(accessToken)
        break

      case 'save_pages':
        const { pages } = body
        result = await saveSelectedPages(serviceSupabase, projectId, accessToken, pages)
        break

      case 'get_saved_pages':
        result = await getSavedPages(supabase, projectId)
        break

      case 'sync_posts':
        result = await syncPosts(serviceSupabase, projectId, accessToken)
        break

      case 'sync_comments':
        result = await syncComments(serviceSupabase, projectId, accessToken, postId)
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

      case 'remove_page':
        const { pageId: removePageId } = body
        result = await removePage(serviceSupabase, projectId, removePageId)
        break

      case 'sync_ad_comments':
        result = await syncAdComments(serviceSupabase, projectId, accessToken)
        break

      case 'generate_reply':
        const { commentId } = body
        result = await generateReply(serviceSupabase, projectId, commentId)
        break

      case 'test_openai_connection':
        result = await testOpenAIConnection(serviceSupabase)
        break

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
      const pageToken = savedPage.access_token || accessToken
      const pageName = savedPage.page_name
      const rawPageId = savedPage.page_id
      const platform = savedPage.platform

      const originalPageId = rawPageId.replace(/_facebook$/, '').replace(/_instagram$/, '')

      if (platform === 'facebook') {
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

      if (platform === 'instagram') {
        try {
          const igPosts = await fetchInstagramPosts(originalPageId, pageToken, accessToken)
          for (const post of igPosts) {
            await upsertPost(supabase, projectId, 'instagram', post, pageName, originalPageId)
            totalPosts++
          }
        } catch (e: any) {
          console.error(`[SYNC_PAGE] IG ${pageName} error:`, e.message)
          errors.push(`IG ${pageName}: ${e.message}`)
        }
      }
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

  // Pre-load pages + CRM contacts ONCE (avoids N+1 queries per comment)
  const [pagesRes, contactsRes] = await Promise.all([
    supabase
      .from('social_listening_pages')
      .select('page_id, access_token, instagram_username, page_name')
      .eq('project_id', projectId)
      .eq('is_active', true),
    supabase
      .from('crm_contacts')
      .select('id, instagram, name')
      .eq('project_id', projectId),
  ])

  const savedPages = pagesRes.data || []

  const pageTokenMap = new Map<string, string>()
  const ownAccountUsernames = new Set<string>()

  for (const page of savedPages) {
    if (!page.page_id || !page.access_token) continue
    const normalizedPageId = String(page.page_id)
    const basePageId = normalizedPageId.replace(/_facebook$/, '').replace(/_instagram$/, '')
    pageTokenMap.set(normalizedPageId, page.access_token)
    pageTokenMap.set(basePageId, page.access_token)

    const username = (page.instagram_username || page.page_name || '').toLowerCase().replace(/^@/, '')
    if (username) ownAccountUsernames.add(username)
  }

  const crmContactMap = new Map<string, string>()
  const contactNameMap = new Map<string, string>()
  for (const contact of contactsRes.data || []) {
    if (contact.instagram) {
      crmContactMap.set(contact.instagram.toLowerCase().replace(/^@/, ''), contact.id)
    }
    if (contact.name) {
      contactNameMap.set(contact.name.toLowerCase().trim(), contact.id)
    }
  }

  // Collect all comments to batch-upsert
  const commentRows: any[] = []

  for (const post of posts) {
    const pageToken = pageTokenMap.get(post.page_id) || accessToken

    try {
      const apiComments = await fetchCommentsForPost(post, pageToken, accessToken)

      for (const comment of apiComments) {
        commentRows.push(buildCommentRow(projectId, post.id, post.platform, comment, null, ownAccountUsernames, crmContactMap, contactNameMap))
        totalComments++

        if (comment.replies?.data) {
          for (const reply of comment.replies.data) {
            commentRows.push(buildCommentRow(projectId, post.id, post.platform, reply, comment.id, ownAccountUsernames, crmContactMap, contactNameMap))
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

  // Batch upsert in chunks of 200
  const CHUNK = 200
  for (let i = 0; i < commentRows.length; i += CHUNK) {
    const chunk = commentRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('social_comments')
      .upsert(chunk, { onConflict: 'project_id,platform,comment_id_meta' })
    if (error) {
      console.error('Error batch upserting comments:', error)
      errors.push(`Batch upsert erro: ${error.message}`)
    }
  }

  // Update last_synced_at for all pages that had posts synced
  const syncedPageIds = [...new Set(posts.map((p: any) => p.page_id).filter(Boolean))]
  if (syncedPageIds.length > 0) {
    await supabase
      .from('social_listening_pages')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .in('page_id', syncedPageIds)
  }

  return { success: true, commentsSynced: totalComments, errors, partialFailure: errors.length > 0 }
}

function buildCommentRow(
  projectId: string,
  postId: string,
  platform: string,
  comment: any,
  parentId: string | null,
  ownAccountUsernames: Set<string>,
  crmContactMap: Map<string, string>,
  contactNameMap?: Map<string, string>,
): any {
  const authorUsername = platform === 'instagram' ? comment.username : comment.from?.name
  const normalizedAuthor = authorUsername ? authorUsername.toLowerCase().replace(/^@/, '').trim() : null
  const isOwnAccount = normalizedAuthor ? ownAccountUsernames.has(normalizedAuthor) : false

  let crmContactId: string | null = null
  if (normalizedAuthor) {
    if (platform === 'instagram') {
      crmContactId = crmContactMap.get(normalizedAuthor) ?? null
    } else if (platform === 'facebook' && contactNameMap) {
      crmContactId = contactNameMap.get(normalizedAuthor) ?? null
    }
  }

  return {
    project_id: projectId,
    post_id: postId,
    platform,
    comment_id_meta: comment.id,
    parent_comment_id: null, // Meta IDs are not UUIDs; parent resolution requires a second pass
    text: platform === 'instagram' ? comment.text : comment.message,
    author_username: authorUsername,
    author_id: platform === 'instagram' ? null : comment.from?.id,
    like_count: comment.like_count || 0,
    reply_count: comment.comment_count || comment.replies?.data?.length || 0,
    comment_timestamp: platform === 'instagram' ? comment.timestamp : comment.created_time,
    ai_processing_status: isOwnAccount ? 'skipped' : 'pending',
    crm_contact_id: crmContactId,
    contact_id: crmContactId,
    is_deleted: false,
    is_own_account: isOwnAccount,
  }
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


async function linkExistingCommentsToCRM(supabase: any, projectId: string) {
  console.log('Linking existing comments to CRM contacts for project:', projectId)

  let linked = 0
  let notFound = 0

  // Fetch unlinked comments from both Instagram and Facebook
  const { data: comments, error } = await supabase
    .from('social_comments')
    .select('id, author_username, platform')
    .eq('project_id', projectId)
    .is('crm_contact_id', null)
    .not('author_username', 'is', null)
    .limit(500)

  if (error || !comments?.length) {
    return { success: true, linked: 0, message: 'Nenhum comentário pendente para vincular' }
  }

  // Fetch all contacts with instagram handle or name
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, instagram, name')
    .eq('project_id', projectId)

  const contactByInstagram = new Map<string, string>()
  const contactByName = new Map<string, string>()
  for (const contact of contacts || []) {
    if (contact.instagram) {
      contactByInstagram.set(contact.instagram.toLowerCase().replace(/^@/, ''), contact.id)
    }
    if (contact.name) {
      contactByName.set(contact.name.toLowerCase().trim(), contact.id)
    }
  }

  for (const comment of comments) {
    if (!comment.author_username) continue

    const normalizedUsername = comment.author_username.toLowerCase().replace(/^@/, '').trim()
    let contactId: string | undefined

    if (comment.platform === 'instagram') {
      contactId = contactByInstagram.get(normalizedUsername)
    } else if (comment.platform === 'facebook') {
      // Facebook comments have from.name as author_username — match against contact name
      contactId = contactByName.get(normalizedUsername)
    }

    if (contactId) {
      const { error: updateError } = await supabase
        .from('social_comments')
        .update({ crm_contact_id: contactId, contact_id: contactId })
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
  const batchSize = Math.min(limit, 30)
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
    .neq('manually_classified', true)
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

  const keywordUpdatePromises: Promise<any>[] = []

  for (const comment of comments) {
    const keywordResult = classifyByKeywords(comment.text || '', customKeywords)

    if (keywordResult.classified) {
      // Classify by keyword (no AI needed) — fire updates in parallel
      keywordUpdatePromises.push(
        supabase
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
      )

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

  // Await all keyword updates in parallel
  if (keywordUpdatePromises.length > 0) {
    await Promise.all(keywordUpdatePromises)
  }

  console.log(`[AI_PROCESS] Keyword classified: ${keywordClassified}, Needs AI: ${commentsForAI.length}`)

  // ============= PHASE 2: AI CLASSIFICATION (OpenAI) =============
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
      }
    }

    // Mark as processing
    await supabase
      .from('social_comments')
      .update({ ai_processing_status: 'processing' })
      .in('id', commentsForAI.map(c => c.id))

    // Use OpenAI for all AI classification
    const openAIKey = await getOpenAIKey(supabase)
    if (!openAIKey) {
      // Reset comments back to pending so they can be tried again later
      await supabase
        .from('social_comments')
        .update({ ai_processing_status: 'pending' })
        .in('id', commentsForAI.map((c: any) => c.id))

      return {
        success: false,
        error: 'API Key OpenAI não configurada. Configure a chave em Admin → Uso de IA para classificar comentários.',
        processed: keywordClassified,
        remaining: commentsForAI.length,
      }
    }

    console.log(`[AI_PROCESS] Using OpenAI for ${commentsForAI.length} comments`)

    try {
      // Process in batches of 15 for efficiency
      const openAIBatchSize = 15
      for (let i = 0; i < commentsForAI.length; i += openAIBatchSize) {
        const batch = commentsForAI.slice(i, i + openAIBatchSize)

        const { results, inputTokens, outputTokens, cost } = await classifyWithOpenAI(batch, knowledgeBase, openAIKey)

        await trackAIUsage(supabase, projectId, {
          feature: 'social_listening',
          action: 'batch_classify',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputTokens,
          outputTokens,
          itemsProcessed: batch.length,
          costEstimate: cost,
          success: true,
        })

        await supabase.rpc('increment_openai_credits', { p_project_id: projectId, p_count: batch.length })

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
          await delay(500)
        }
      }
    } catch (openaiError: any) {
      console.error('[AI_PROCESS] OpenAI error:', openaiError.message)

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
        errorMessage: openaiError.message,
      })

      await supabase
        .from('social_comments')
        .update({ ai_processing_status: 'failed', ai_error: openaiError.message })
        .in('id', commentsForAI.map((c: any) => c.id))

      failed += commentsForAI.length
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
    supabase.from('social_comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false),
    supabase.from('social_comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false).eq('ai_processing_status', 'pending'),
    supabase.from('social_comments').select('sentiment').eq('project_id', projectId).eq('is_deleted', false).eq('ai_processing_status', 'completed'),
    supabase.from('social_comments').select('classification').eq('project_id', projectId).eq('is_deleted', false).eq('ai_processing_status', 'completed'),
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

async function saveSelectedPages(supabase: any, projectId: string, accessToken: string, pages: any[]) {
  const errors: string[] = []
  let savedCount = 0

  for (const page of pages) {
    const basePageId = String(page.id || '').replace(/_facebook$/, '').replace(/_instagram$/, '')
    const canonicalPageId = page.platform === 'instagram'
      ? `${String(page.instagram_account_id || basePageId)}_instagram`
      : `${basePageId}_facebook`

    const { error } = await supabase
      .from('social_listening_pages')
      .upsert({
        project_id: projectId,
        page_id: canonicalPageId,
        page_name: page.name,
        platform: page.platform,
        access_token: page.access_token || accessToken,
        instagram_username: page.instagram_username || null,
        is_active: true,
      }, { onConflict: 'project_id,page_id' })

    if (error) {
      console.error('Error saving page:', error)
      errors.push(`${canonicalPageId}: ${error.message}`)
      continue
    }

    savedCount++
  }

  return {
    success: errors.length === 0,
    savedCount,
    errors,
  }
}

async function getSavedPages(supabase: any, projectId: string) {
  const { data, error } = await supabase
    .from('social_listening_pages')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (error) {
    throw new Error(error.message)
  }

  return { pages: data || [] }
}

async function removePage(supabase: any, projectId: string, pageId: string) {
  const { error } = await supabase
    .from('social_listening_pages')
    .update({ is_active: false })
    .eq('project_id', projectId)
    .eq('page_id', pageId)

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
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

            if (commentsData.error) {
              const errorMessage = `[SYNC_AD_COMMENTS][GRAPH_ERROR] account=${account.account_id} ad=${ad.id} story=${storyId} code=${commentsData.error.code || 'n/a'} message=${commentsData.error.message || 'unknown'}`
              console.error(errorMessage)
              errors.push(errorMessage)
              continue
            }

            let postId: string | null = null
            const { data: existingPost } = await supabase
              .from('social_posts')
              .select('id')
              .eq('project_id', projectId)
              .eq('post_id_meta', storyId)
              .maybeSingle()

            if (existingPost) {
              postId = existingPost.id
              // Ensure is_ad is set on existing post
              await supabase.from('social_posts').update({ is_ad: true, post_type: 'ad' }).eq('id', existingPost.id)
            } else {
              const { data: newPost } = await supabase
                .from('social_posts')
                .insert({
                  project_id: projectId,
                  platform: 'facebook',
                  post_id_meta: storyId,
                  post_type: 'ad',
                  is_ad: true,
                  message: ad.name,
                })
                .select('id')
                .single()

              postId = newPost?.id
            }

            if (postId) {
              const commentRows = (commentsData.data || []).map((comment: any) => ({
                project_id: projectId,
                post_id: postId,
                platform: 'facebook',
                comment_id_meta: comment.id,
                text: comment.message,
                author_username: comment.from?.name || null,
                author_id: comment.from?.id || null,
                like_count: comment.like_count || 0,
                reply_count: comment.comment_count || 0,
                comment_timestamp: comment.created_time,
                ai_processing_status: 'pending',
                is_deleted: false,
                is_own_account: false,
              }))
              if (commentRows.length > 0) {
                const { error: upsertError } = await supabase
                  .from('social_comments')
                  .upsert(commentRows, { onConflict: 'project_id,platform,comment_id_meta' })
                if (upsertError) {
                  console.error(`[SYNC_AD_COMMENTS] Upsert error for ad ${ad.id}:`, upsertError.message)
                } else {
                  totalComments += commentRows.length
                }
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

    return { success: true, commentsSynced: totalComments, errors, partialFailure: errors.length > 0 }
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

  const { data: knowledgeBase } = await supabase
    .from('ai_knowledge_base')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  const faqsContext = knowledgeBase?.faqs?.length
    ? `\nPERGUNTAS FREQUENTES (use para formular respostas precisas):\n${(knowledgeBase.faqs as Array<{question: string, answer: string}>).map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`).join('\n')}\n`
    : ''

  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Tom de voz: ${knowledgeBase.tone_of_voice || 'Profissional e amigável'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
${faqsContext}` : ''

  const prompt = `${businessContext}

Você é um especialista em atendimento ao cliente em redes sociais. Gere uma resposta curta e profissional para o comentário abaixo.

Classificação do comentário: ${comment.classification || 'não classificado'}
Sentimento: ${comment.sentiment || 'neutro'}
Contexto do post: ${comment.social_posts?.message || 'N/A'}

Comentário: "${comment.text}"

Gere uma resposta de no máximo 2 linhas, adequada para redes sociais. Seja empático e útil.`

  const openAIKey = await getOpenAIKey(supabase)
  if (!openAIKey) {
    return {
      success: false,
      error: 'API Key OpenAI não configurada. Configure a chave em Admin → Uso de IA para gerar respostas.',
    }
  }

  let reply: string = ''

  console.log('[GENERATE_REPLY] Using OpenAI')
  let openaiResponse: Response
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })
  } catch (fetchError: any) {
    console.error('[GENERATE_REPLY] OpenAI fetch error:', fetchError.message)
    return { success: false, error: `Falha na conexão com OpenAI: ${fetchError.message}` }
  }

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text()
    console.error('[GENERATE_REPLY] OpenAI API error:', openaiResponse.status, errorText)
    return { success: false, error: `Erro OpenAI ${openaiResponse.status}: ${errorText.substring(0, 200)}` }
  }

  const data = await openaiResponse.json()
  reply = data.choices?.[0]?.message?.content || ''
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

  console.log('[GENERATE_REPLY] Final reply length:', reply.length)

  // Save to ai_suggested_reply field (not suggested_reply)
  const { error: updateError } = await supabase
    .from('social_comments')
    .update({ ai_suggested_reply: reply })
    .eq('id', commentId)

  if (updateError) {
    console.error('[GENERATE_REPLY] Error saving reply:', updateError)
  }

  return { success: true, reply, provider: 'openai' }
}

// ============= OPENAI CONNECTION TEST =============

async function testOpenAIConnection(supabase: any) {
  const key = await getOpenAIKey(supabase)
  if (!key) {
    return { success: false, configured: false, error: 'API Key não configurada.' }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
    })

    if (response.status === 401) {
      return { success: false, configured: true, error: 'API Key inválida ou expirada.' }
    }
    if (!response.ok) {
      return { success: false, configured: true, error: `Erro OpenAI: ${response.status}` }
    }

    return { success: true, configured: true, model: 'gpt-4o-mini' }
  } catch (err: any) {
    return { success: false, configured: true, error: `Falha de conexão: ${err.message}` }
  }
}
