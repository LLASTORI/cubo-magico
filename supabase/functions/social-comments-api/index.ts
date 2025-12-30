import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// AI Classification prompt
const CLASSIFICATION_PROMPT = `Você é um especialista em análise de comentários de redes sociais para negócios digitais.

Analise o comentário abaixo e forneça:
1. sentiment: "positive", "neutral" ou "negative"
2. classification: uma das opções:
   - "question" - pergunta sobre produto/serviço
   - "commercial_interest" - demonstra interesse em comprar
   - "complaint" - reclamação ou insatisfação
   - "praise" - elogio ou feedback positivo
   - "negative_feedback" - crítica construtiva ou negativa
   - "spam" - conteúdo irrelevante ou spam
   - "other" - não se encaixa nas categorias
3. intent_score: número de 0 a 100 representando intenção comercial (0 = nenhuma, 100 = muito alta)
4. summary: resumo de 1 linha do comentário (máximo 100 caracteres)

Contexto do post (se disponível): {post_context}

Comentário para análise:
"{comment_text}"

Responda APENAS em JSON válido no formato:
{"sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}`

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

      case 'get_stats':
        result = await getStats(supabase, projectId)
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

// Sync posts from Facebook Pages and Instagram
async function syncPosts(supabase: any, projectId: string, accessToken: string) {
  console.log('Syncing posts for project:', projectId)
  
  let totalPosts = 0
  const errors: string[] = []

  try {
    // Get user's pages
    const pagesUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
    const pagesResponse = await fetch(pagesUrl)
    const pagesData = await pagesResponse.json()

    if (pagesData.error) {
      throw new Error(pagesData.error.message)
    }

    const pages = pagesData.data || []
    console.log(`Found ${pages.length} pages`)

    for (const page of pages) {
      // Sync Facebook Page posts
      try {
        const fbPosts = await fetchFacebookPosts(page.id, page.access_token)
        for (const post of fbPosts) {
          await upsertPost(supabase, projectId, 'facebook', post, page.name)
          totalPosts++
        }
      } catch (e: any) {
        errors.push(`FB Page ${page.name}: ${e.message}`)
      }

      // Sync Instagram posts if connected
      if (page.instagram_business_account?.id) {
        try {
          const igPosts = await fetchInstagramPosts(page.instagram_business_account.id, page.access_token)
          for (const post of igPosts) {
            await upsertPost(supabase, projectId, 'instagram', post, page.name)
            totalPosts++
          }
        } catch (e: any) {
          errors.push(`IG ${page.name}: ${e.message}`)
        }
      }

      await delay(500) // Rate limiting
    }

    return { success: true, postsSynced: totalPosts, errors }
  } catch (error: any) {
    console.error('Sync posts error:', error)
    return { success: false, error: error.message, errors }
  }
}

async function fetchFacebookPosts(pageId: string, pageToken: string): Promise<any[]> {
  const posts: any[] = []
  let nextUrl: string | null = `${GRAPH_API_BASE}/${pageId}/posts?fields=id,message,created_time,permalink_url,shares,type&limit=50&access_token=${pageToken}`

  while (nextUrl !== null && posts.length < 100) {
    const currentUrl = nextUrl
    nextUrl = null // Reset before fetch to avoid circular reference
    
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

async function fetchInstagramPosts(igAccountId: string, pageToken: string) {
  const posts: any[] = []
  const url = `${GRAPH_API_BASE}/${igAccountId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=50&access_token=${pageToken}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.data || []
}

async function upsertPost(supabase: any, projectId: string, platform: string, post: any, pageName: string) {
  const postData: any = {
    project_id: projectId,
    platform,
    post_id_meta: post.id,
    page_name: pageName,
    post_type: 'organic',
    message: platform === 'instagram' ? post.caption : post.message,
    media_type: platform === 'instagram' ? post.media_type?.toLowerCase() : post.type,
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

// Sync comments for posts
async function syncComments(supabase: any, projectId: string, accessToken: string, specificPostId?: string) {
  console.log('Syncing comments for project:', projectId)

  let totalComments = 0
  const errors: string[] = []

  // Get posts to sync
  let query = supabase
    .from('social_posts')
    .select('*')
    .eq('project_id', projectId)

  if (specificPostId) {
    query = query.eq('id', specificPostId)
  }

  const { data: posts, error: postsError } = await query.limit(50)

  if (postsError || !posts) {
    return { success: false, error: 'Erro ao buscar posts' }
  }

  // Get page tokens
  const { data: credentials } = await supabase
    .from('meta_credentials')
    .select('access_token')
    .eq('project_id', projectId)
    .single()

  const userToken = credentials?.access_token || accessToken

  // Get page tokens for each page
  const pagesUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,access_token,instagram_business_account&access_token=${userToken}`
  const pagesResponse = await fetch(pagesUrl)
  const pagesData = await pagesResponse.json()
  
  const pageTokenMap = new Map<string, string>()
  for (const page of pagesData.data || []) {
    pageTokenMap.set(page.id, page.access_token)
    if (page.instagram_business_account?.id) {
      pageTokenMap.set(page.instagram_business_account.id, page.access_token)
    }
  }

  for (const post of posts) {
    try {
      const comments = await fetchCommentsForPost(post, userToken)
      
      for (const comment of comments) {
        await upsertComment(supabase, projectId, post.id, post.platform, comment)
        totalComments++

        // Also sync replies
        if (comment.replies?.data) {
          for (const reply of comment.replies.data) {
            const parentComment = await getCommentByMetaId(supabase, projectId, comment.id)
            await upsertComment(supabase, projectId, post.id, post.platform, reply, parentComment?.id)
            totalComments++
          }
        }
      }
    } catch (e: any) {
      errors.push(`Post ${post.id}: ${e.message}`)
    }

    await delay(300)
  }

  return { success: true, commentsSynced: totalComments, errors }
}

async function fetchCommentsForPost(post: any, accessToken: string) {
  const comments: any[] = []
  
  const fields = post.platform === 'instagram' 
    ? 'id,text,timestamp,username,like_count,replies{id,text,timestamp,username,like_count}'
    : 'id,message,created_time,from,like_count,comment_count,comments{id,message,created_time,from,like_count}'

  const url = `${GRAPH_API_BASE}/${post.post_id_meta}/comments?fields=${fields}&limit=100&access_token=${accessToken}`
  
  const response = await fetch(url)
  const data = await response.json()

  if (data.error) {
    // Some posts may not have comment access
    console.warn(`Comments fetch warning for post ${post.post_id_meta}:`, data.error.message)
    return []
  }

  return data.data || []
}

async function getCommentByMetaId(supabase: any, projectId: string, metaId: string) {
  const { data } = await supabase
    .from('social_comments')
    .select('id')
    .eq('project_id', projectId)
    .eq('comment_id_meta', metaId)
    .single()
  
  return data
}

async function upsertComment(supabase: any, projectId: string, postId: string, platform: string, comment: any, parentId?: string) {
  const commentData: any = {
    project_id: projectId,
    post_id: postId,
    platform,
    comment_id_meta: comment.id,
    parent_comment_id: parentId || null,
    text: platform === 'instagram' ? comment.text : comment.message,
    author_username: platform === 'instagram' ? comment.username : comment.from?.name,
    author_id: platform === 'instagram' ? null : comment.from?.id,
    like_count: comment.like_count || 0,
    reply_count: comment.comment_count || comment.replies?.data?.length || 0,
    comment_timestamp: platform === 'instagram' ? comment.timestamp : comment.created_time,
    ai_processing_status: 'pending',
  }

  const { error } = await supabase
    .from('social_comments')
    .upsert(commentData, { onConflict: 'project_id,platform,comment_id_meta' })

  if (error) {
    console.error('Error upserting comment:', error)
  }
}

// Process comments with AI
async function processCommentsWithAI(supabase: any, projectId: string, limit: number) {
  console.log(`Processing up to ${limit} comments with AI for project:`, projectId)

  // Get pending comments
  const { data: comments, error } = await supabase
    .from('social_comments')
    .select(`
      id,
      text,
      post_id,
      social_posts!inner(message)
    `)
    .eq('project_id', projectId)
    .eq('ai_processing_status', 'pending')
    .limit(limit)

  if (error || !comments || comments.length === 0) {
    return { success: true, processed: 0, message: 'Nenhum comentário pendente' }
  }

  console.log(`Found ${comments.length} comments to process`)

  let processed = 0
  let failed = 0

  for (const comment of comments) {
    try {
      // Mark as processing
      await supabase
        .from('social_comments')
        .update({ ai_processing_status: 'processing' })
        .eq('id', comment.id)

      // Call AI
      const postContext = comment.social_posts?.message || 'Contexto não disponível'
      const aiResult = await classifyComment(comment.text, postContext)

      // Update with results
      await supabase
        .from('social_comments')
        .update({
          sentiment: aiResult.sentiment,
          classification: aiResult.classification,
          intent_score: aiResult.intent_score,
          ai_summary: aiResult.summary,
          ai_processing_status: 'completed',
          ai_processed_at: new Date().toISOString(),
        })
        .eq('id', comment.id)

      processed++
    } catch (e: any) {
      console.error(`Error processing comment ${comment.id}:`, e.message)
      
      await supabase
        .from('social_comments')
        .update({
          ai_processing_status: 'failed',
          ai_error: e.message,
        })
        .eq('id', comment.id)

      failed++
    }

    // Rate limiting between AI calls
    await delay(500)
  }

  return { success: true, processed, failed, total: comments.length }
}

async function classifyComment(commentText: string, postContext: string) {
  const prompt = CLASSIFICATION_PROMPT
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
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid AI response format')
  }

  const result = JSON.parse(jsonMatch[0])

  // Validate and normalize
  return {
    sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) 
      ? result.sentiment 
      : 'neutral',
    classification: ['question', 'commercial_interest', 'complaint', 'praise', 'negative_feedback', 'spam', 'other'].includes(result.classification)
      ? result.classification
      : 'other',
    intent_score: Math.min(100, Math.max(0, parseInt(result.intent_score) || 0)),
    summary: (result.summary || '').substring(0, 100),
  }
}

// Get stats for dashboard
async function getStats(supabase: any, projectId: string) {
  const { data: totalComments } = await supabase
    .from('social_comments')
    .select('id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  const { data: pendingAI } = await supabase
    .from('social_comments')
    .select('id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('ai_processing_status', 'pending')

  const { data: sentimentStats } = await supabase
    .from('social_comments')
    .select('sentiment')
    .eq('project_id', projectId)
    .not('sentiment', 'is', null)

  const { data: classificationStats } = await supabase
    .from('social_comments')
    .select('classification')
    .eq('project_id', projectId)
    .not('classification', 'is', null)

  // Calculate distributions
  const sentimentDist = { positive: 0, neutral: 0, negative: 0 }
  const classificationDist: Record<string, number> = {}

  sentimentStats?.forEach((c: any) => {
    if (c.sentiment) sentimentDist[c.sentiment as keyof typeof sentimentDist]++
  })

  classificationStats?.forEach((c: any) => {
    if (c.classification) {
      classificationDist[c.classification] = (classificationDist[c.classification] || 0) + 1
    }
  })

  return {
    totalComments: totalComments?.length || 0,
    pendingAI: pendingAI?.length || 0,
    sentimentDistribution: sentimentDist,
    classificationDistribution: classificationDist,
  }
}

// Get available Facebook Pages and Instagram accounts
async function getAvailablePages(accessToken: string) {
  console.log('Getting available pages for user')
  
  try {
    // First, check token permissions
    const debugUrl = `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    const debugResponse = await fetch(debugUrl)
    const debugData = await debugResponse.json()
    
    console.log('Token debug info:', JSON.stringify({
      isValid: debugData.data?.is_valid,
      scopes: debugData.data?.scopes,
      expiresAt: debugData.data?.expires_at,
      userId: debugData.data?.user_id,
    }))
    
    // Get user pages
    const pagesUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`
    console.log('Fetching pages from:', pagesUrl.replace(accessToken, 'TOKEN_HIDDEN'))
    
    const response = await fetch(pagesUrl)
    const data = await response.json()

    console.log('Pages API response:', JSON.stringify({
      hasData: !!data.data,
      dataLength: data.data?.length,
      error: data.error,
      paging: !!data.paging,
    }))

    if (data.error) {
      console.error('Meta API error:', data.error)
      return { 
        success: false, 
        error: data.error.message,
        errorCode: data.error.code,
        errorType: data.error.type,
        pages: [] 
      }
    }

    const pages = (data.data || []).map((page: any) => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      pagePicture: page.picture?.data?.url,
      instagramAccountId: page.instagram_business_account?.id,
      instagramUsername: page.instagram_business_account?.username,
      instagramPicture: page.instagram_business_account?.profile_picture_url,
    }))

    console.log(`Found ${pages.length} pages`)
    
    // If no pages found, check if user has pages but no permission
    if (pages.length === 0) {
      console.log('No pages found. This could mean:')
      console.log('1. User has no Facebook Pages')
      console.log('2. User did not grant pages_show_list permission')
      console.log('3. User did not grant pages_read_engagement permission')
      console.log('Token scopes:', debugData.data?.scopes)
    }
    
    return { success: true, pages, scopes: debugData.data?.scopes }
  } catch (error: any) {
    console.error('Error getting pages:', error)
    return { success: false, error: error.message, pages: [] }
  }
}

// Save selected pages to database
async function saveSelectedPages(supabase: any, projectId: string, accessToken: string, pages: any[]) {
  console.log(`Saving ${pages.length} pages for project:`, projectId)

  const errors: string[] = []
  let saved = 0

  for (const page of pages) {
    try {
      const pageData: any = {
        project_id: projectId,
        platform: page.instagramAccountId ? 'instagram' : 'facebook',
        page_id: page.pageId,
        page_name: page.pageName,
        page_access_token: page.pageAccessToken,
        instagram_account_id: page.instagramAccountId || null,
        instagram_username: page.instagramUsername || null,
        is_active: true,
      }

      const { error } = await supabase
        .from('social_listening_pages')
        .upsert(pageData, { onConflict: 'project_id,page_id' })

      if (error) {
        errors.push(`${page.pageName}: ${error.message}`)
      } else {
        saved++
      }
    } catch (e: any) {
      errors.push(`${page.pageName}: ${e.message}`)
    }
  }

  return { success: errors.length === 0, saved, errors }
}

// Get saved pages from database
async function getSavedPages(supabase: any, projectId: string) {
  const { data, error } = await supabase
    .from('social_listening_pages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { success: false, error: error.message, pages: [] }
  }

  return { success: true, pages: data || [] }
}
