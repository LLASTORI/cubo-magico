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

// Sync posts from Facebook Pages and Instagram - using SAVED pages only
async function syncPosts(supabase: any, projectId: string, accessToken: string) {
  console.log('='.repeat(60))
  console.log('[SYNC_POSTS] Starting sync for project:', projectId)
  console.log('[SYNC_POSTS] Access token preview:', accessToken?.substring(0, 20) + '...')
  
  let totalPosts = 0
  const errors: string[] = []

  try {
    // Get SAVED pages from database (not all user pages)
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

    console.log(`[SYNC_POSTS] Found ${savedPages.length} saved pages to sync:`)
    savedPages.forEach((p: any, i: number) => {
      console.log(`  [${i + 1}] ${p.page_name} (${p.platform}) - pageId: ${p.page_id}, igId: ${p.instagram_account_id || 'N/A'}`)
    })

    for (const savedPage of savedPages) {
      const pageToken = savedPage.page_access_token
      const pageName = savedPage.page_name
      const rawPageId = savedPage.page_id
      const instagramAccountId = savedPage.instagram_account_id
      const platform = savedPage.platform

      // Extract original page ID (remove _facebook or _instagram suffix if present)
      const originalPageId = rawPageId.replace(/_facebook$/, '').replace(/_instagram$/, '')

      console.log('-'.repeat(40))
      console.log(`[SYNC_PAGE] Processing: ${pageName}`)
      console.log(`[SYNC_PAGE] Platform: ${platform}`)
      console.log(`[SYNC_PAGE] Raw Page ID: ${rawPageId}`)
      console.log(`[SYNC_PAGE] Original Page ID (for API): ${originalPageId}`)
      console.log(`[SYNC_PAGE] Instagram Account ID: ${instagramAccountId || 'N/A'}`)
      console.log(`[SYNC_PAGE] Token preview: ${pageToken?.substring(0, 20)}...`)

      // Sync based on platform
      if (platform === 'facebook' || (!platform && !instagramAccountId)) {
        // Sync Facebook Page posts
        try {
          console.log(`[SYNC_PAGE] Fetching Facebook posts using ID: ${originalPageId}`)
          const fbPosts = await fetchFacebookPosts(originalPageId, pageToken)
          console.log(`[SYNC_PAGE] Fetched ${fbPosts.length} Facebook posts for ${pageName}`)
          for (const post of fbPosts) {
            await upsertPost(supabase, projectId, 'facebook', post, pageName, originalPageId)
            totalPosts++
          }
        } catch (e: any) {
          console.error(`[SYNC_PAGE] FB Page ${pageName} error:`, e.message)
          errors.push(`FB Page ${pageName}: ${e.message}`)
        }
      }

      // Sync Instagram posts if this is an Instagram page or has Instagram connected
      if (platform === 'instagram' && instagramAccountId) {
        try {
          console.log(`[SYNC_PAGE] Fetching Instagram posts for IG Account: ${instagramAccountId}`)
          const igPosts = await fetchInstagramPosts(instagramAccountId, pageToken, accessToken)
          console.log(`[SYNC_PAGE] Fetched ${igPosts.length} Instagram posts for ${pageName}`)
          
          if (igPosts.length === 0) {
            console.log(`[SYNC_PAGE] WARNING: No Instagram posts returned. Check token permissions.`)
          }
          
          for (const post of igPosts) {
            await upsertPost(supabase, projectId, 'instagram', post, pageName, instagramAccountId)
            totalPosts++
          }
        } catch (e: any) {
          console.error(`[SYNC_PAGE] IG ${pageName} error:`, e.message)
          errors.push(`IG ${pageName}: ${e.message}`)
        }
      }

      // Update last_synced_at
      await supabase
        .from('social_listening_pages')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', savedPage.id)

      await delay(500) // Rate limiting
    }

    console.log('='.repeat(60))
    console.log(`[SYNC_POSTS] COMPLETED: ${totalPosts} posts synced, ${errors.length} errors`)
    if (errors.length > 0) {
      console.log(`[SYNC_POSTS] Errors:`, errors)

      // If nothing was synced and we have errors, surface it to the UI
      if (totalPosts === 0) {
        return {
          success: false,
          error: errors[0],
          postsSynced: totalPosts,
          errors,
        }
      }
    }

    return { success: true, postsSynced: totalPosts, errors }
  } catch (error: any) {
    console.error('[SYNC_POSTS] FATAL ERROR:', error)
    return { success: false, error: error.message, errors }
  }
}

async function fetchFacebookPosts(pageId: string, pageToken: string): Promise<any[]> {
  const posts: any[] = []
  // Updated fields - removed deprecated 'shares' and 'type' fields (deprecated in v3.3+)
  // Using 'status_type' instead of 'type', and getting share count from insights if needed
  let nextUrl: string | null = `${GRAPH_API_BASE}/${pageId}/posts?fields=id,message,created_time,permalink_url,status_type,full_picture&limit=50&access_token=${pageToken}`

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

async function fetchInstagramPosts(igAccountId: string, pageToken: string, mainAccessToken?: string) {
  console.log(`[FETCH_IG_POSTS] Starting for IG Account: ${igAccountId}`)

  // Try with page token first, then fall back to main access token
  const tokensToTry: Array<{ token: string; name: string }> = [
    { token: pageToken, name: 'page_access_token' },
  ]

  // Add main access token as fallback if available and different
  if (mainAccessToken && mainAccessToken !== pageToken) {
    tokensToTry.push({ token: mainAccessToken, name: 'main_access_token' })
  }

  let lastError: Error | null = null

  for (let i = 0; i < tokensToTry.length; i++) {
    const { token, name } = tokensToTry[i]

    console.log(`[FETCH_IG_POSTS] Trying with ${name}...`)
    console.log(`[FETCH_IG_POSTS] Token preview: ${token?.substring(0, 20)}...`)

    const url = `${GRAPH_API_BASE}/${igAccountId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`
    console.log(`[FETCH_IG_POSTS] Request URL (token hidden): ${url.replace(token, 'TOKEN_HIDDEN')}`)

    try {
      const response = await fetch(url)
      const statusCode = response.status
      const data = await response.json()

      console.log(`[FETCH_IG_POSTS] Response status: ${statusCode}`)
      console.log(
        `[FETCH_IG_POSTS] Response data:`,
        JSON.stringify({
          hasData: !!data.data,
          dataLength: data.data?.length,
          error: data.error,
          firstPostId: data.data?.[0]?.id,
        })
      )

      if (data.error) {
        console.error(`[FETCH_IG_POSTS] API Error with ${name}:`, JSON.stringify(data.error))

        const err = new Error(`${data.error.message} (code: ${data.error.code})`)
        lastError = err

        // Common auth/permission errors. If we have another token to try, continue.
        if ([10, 190, 200].includes(data.error.code) && i < tokensToTry.length - 1) {
          console.log(`[FETCH_IG_POSTS] Permission/auth error, trying next token...`)
          continue
        }

        throw err
      }

      const posts = data.data || []
      console.log(`[FETCH_IG_POSTS] SUCCESS with ${name}: Found ${posts.length} posts`)

      if (posts.length > 0) {
        console.log(
          `[FETCH_IG_POSTS] First post sample:`,
          JSON.stringify({
            id: posts[0].id,
            caption: posts[0].caption?.substring(0, 50),
            media_type: posts[0].media_type,
            timestamp: posts[0].timestamp,
          })
        )
      }

      return posts
    } catch (fetchError: any) {
      const err = fetchError instanceof Error ? fetchError : new Error(String(fetchError))
      lastError = err
      console.error(`[FETCH_IG_POSTS] Fetch error with ${name}:`, err.message)

      if (i < tokensToTry.length - 1) {
        continue
      }

      throw err
    }
  }

  // If we got here, nothing worked.
  console.log(`[FETCH_IG_POSTS] All tokens failed`) 
  throw lastError || new Error('Falha ao buscar posts do Instagram')
}

async function upsertPost(supabase: any, projectId: string, platform: string, post: any, pageName: string, pageId?: string) {
  const postData: any = {
    project_id: projectId,
    platform,
    post_id_meta: post.id,
    page_id: pageId || null, // Store page_id for token lookup later
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

  console.log(`[SYNC_COMMENTS] Found ${posts.length} posts to sync comments`)

  // Get saved pages with their tokens for this project
  const { data: savedPages } = await supabase
    .from('social_listening_pages')
    .select('page_id, page_access_token, instagram_account_id, platform')
    .eq('project_id', projectId)
    .eq('is_active', true)

  // Build token map: page_id -> token (for both FB page ID and IG account ID)
  const pageTokenMap = new Map<string, string>()
  for (const page of savedPages || []) {
    // Store by raw page_id (with suffix)
    if (page.page_access_token) {
      pageTokenMap.set(page.page_id, page.page_access_token)
      // Also store by original ID (without suffix) for lookup
      const originalId = page.page_id.replace(/_facebook$/, '').replace(/_instagram$/, '')
      pageTokenMap.set(originalId, page.page_access_token)
      // Store by IG account ID if available
      if (page.instagram_account_id) {
        pageTokenMap.set(page.instagram_account_id, page.page_access_token)
      }
    }
  }

  console.log(`[SYNC_COMMENTS] Built token map with ${pageTokenMap.size} entries`)

  for (const post of posts) {
    try {
      // Determine the correct token to use for this post
      let tokenToUse = accessToken // fallback to user token
      
      if (post.page_id) {
        const pageToken = pageTokenMap.get(post.page_id)
        if (pageToken) {
          tokenToUse = pageToken
          console.log(`[SYNC_COMMENTS] Using page token for post ${post.post_id_meta} (page: ${post.page_id})`)
        } else {
          console.log(`[SYNC_COMMENTS] No page token found for page_id: ${post.page_id}, using user token`)
        }
      } else {
        // Try to extract page ID from post_id_meta (format: pageId_postId for FB)
        if (post.platform === 'facebook' && post.post_id_meta.includes('_')) {
          const extractedPageId = post.post_id_meta.split('_')[0]
          const pageToken = pageTokenMap.get(extractedPageId)
          if (pageToken) {
            tokenToUse = pageToken
            console.log(`[SYNC_COMMENTS] Extracted page ID ${extractedPageId} from post_id_meta, using page token`)
          }
        }
      }

      const comments = await fetchCommentsForPost(post, tokenToUse)
      
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
      console.warn(`[SYNC_COMMENTS] Error for post ${post.post_id_meta}: ${e.message}`)
      errors.push(`Post ${post.post_id_meta}: ${e.message}`)
    }

    await delay(300)
  }

  console.log(`[SYNC_COMMENTS] Completed: ${totalComments} comments synced, ${errors.length} errors`)
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
  const authorUsername = platform === 'instagram' ? comment.username : comment.from?.name
  
  // Try to match with CRM contact by Instagram username
  let crmContactId: string | null = null
  if (authorUsername && platform === 'instagram') {
    crmContactId = await findCRMContactByInstagram(supabase, projectId, authorUsername)
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
    ai_processing_status: 'pending',
    crm_contact_id: crmContactId,
  }

  const { error } = await supabase
    .from('social_comments')
    .upsert(commentData, { onConflict: 'project_id,platform,comment_id_meta' })

  if (error) {
    console.error('Error upserting comment:', error)
  }
}

// Find CRM contact by Instagram username
async function findCRMContactByInstagram(supabase: any, projectId: string, instagramUsername: string): Promise<string | null> {
  if (!instagramUsername) return null
  
  // Normalize username (remove @ if present)
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
  
  if (data) {
    console.log(`Matched Instagram @${normalizedUsername} to CRM contact: ${data.id}`)
  }
  
  return data?.id || null
}

// Link existing comments to CRM contacts (batch operation)
async function linkExistingCommentsToCRM(supabase: any, projectId: string) {
  console.log('Linking existing comments to CRM contacts for project:', projectId)
  
  let linked = 0
  let notFound = 0
  
  // Get comments without CRM link that have Instagram usernames
  const { data: comments, error } = await supabase
    .from('social_comments')
    .select('id, author_username, platform')
    .eq('project_id', projectId)
    .eq('platform', 'instagram')
    .is('crm_contact_id', null)
    .not('author_username', 'is', null)
    .limit(500)
  
  if (error) {
    console.error('Error fetching comments for CRM linking:', error)
    return { success: false, error: error.message }
  }
  
  if (!comments || comments.length === 0) {
    return { success: true, linked: 0, message: 'Nenhum comentário pendente para vincular' }
  }
  
  console.log(`Found ${comments.length} comments to try linking`)
  
  // Get all unique usernames
  const uniqueUsernames = [...new Set(comments.map((c: any) => c.author_username?.toLowerCase()?.replace(/^@/, '')))]
  
  // Get all CRM contacts with Instagram usernames for this project
  const { data: contacts, error: contactsError } = await supabase
    .from('crm_contacts')
    .select('id, instagram')
    .eq('project_id', projectId)
    .not('instagram', 'is', null)
  
  if (contactsError) {
    console.error('Error fetching CRM contacts:', contactsError)
    return { success: false, error: contactsError.message }
  }
  
  // Create a map for fast lookup (normalize Instagram usernames)
  const contactMap = new Map<string, string>()
  for (const contact of contacts || []) {
    if (contact.instagram) {
      const normalizedIG = contact.instagram.toLowerCase().replace(/^@/, '')
      contactMap.set(normalizedIG, contact.id)
    }
  }
  
  console.log(`Found ${contactMap.size} CRM contacts with Instagram usernames`)
  
  // Update comments with matched CRM contact IDs
  for (const comment of comments) {
    if (!comment.author_username) continue
    
    const normalizedUsername = comment.author_username.toLowerCase().replace(/^@/, '')
    const contactId = contactMap.get(normalizedUsername)
    
    if (contactId) {
      const { error: updateError } = await supabase
        .from('social_comments')
        .update({ crm_contact_id: contactId })
        .eq('id', comment.id)
      
      if (!updateError) {
        linked++
      }
    } else {
      notFound++
    }
  }
  
  console.log(`Linked ${linked} comments to CRM contacts. ${notFound} usernames not found in CRM.`)
  
  return { success: true, linked, notFound, totalProcessed: comments.length }
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
    
    // Get user pages - with pagination support
    const allPages: any[] = []
    let nextUrl: string | null = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,username,profile_picture_url}&limit=100&access_token=${accessToken}`
    
    while (nextUrl) {
      console.log('Fetching pages from:', nextUrl.replace(accessToken, 'TOKEN_HIDDEN'))
      
      const response: Response = await fetch(nextUrl)
      const data: any = await response.json()

      console.log('Pages API response:', JSON.stringify({
        hasData: !!data.data,
        dataLength: data.data?.length,
        error: data.error,
        hasNextPage: !!data.paging?.next,
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

      if (data.data) {
        allPages.push(...data.data)
      }
      
      // Check for next page
      nextUrl = data.paging?.next || null
      
      // Safety limit to prevent infinite loops (max 500 pages)
      if (allPages.length >= 500) {
        console.log('Reached max pages limit (500)')
        break
      }
    }

    // Create separate entries for Facebook and Instagram
    const pages: any[] = []
    
    for (const page of allPages) {
      // Always add Facebook page entry
      pages.push({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        pagePicture: page.picture?.data?.url,
        platform: 'facebook',
        instagramAccountId: null,
        instagramUsername: null,
        instagramPicture: null,
      })
      
      // If page has Instagram Business Account, add separate Instagram entry
      if (page.instagram_business_account?.id) {
        pages.push({
          pageId: page.id, // Same page ID, but will be saved with platform: instagram
          pageName: page.name,
          pageAccessToken: page.access_token,
          pagePicture: page.picture?.data?.url,
          platform: 'instagram',
          instagramAccountId: page.instagram_business_account.id,
          instagramUsername: page.instagram_business_account.username,
          instagramPicture: page.instagram_business_account.profile_picture_url,
        })
      }
    }

    console.log(`Found ${allPages.length} Facebook pages, expanded to ${pages.length} entries (FB + IG)`)
    
    // If no pages found, check if user has pages but no permission
    if (pages.length === 0) {
      console.log('No pages found. This could mean:')
      console.log('1. User has no Facebook Pages')
      console.log('2. User did not grant pages_show_list permission')
      console.log('3. User did not grant pages_read_engagement permission')
      console.log('Token scopes:', debugData.data?.scopes)
    }
    
    return { success: true, pages, scopes: debugData.data?.scopes, totalFetched: pages.length }
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
      // Use platform from the page object, or determine from instagramAccountId
      const platform = page.platform || (page.instagramAccountId ? 'instagram' : 'facebook')
      
      // Create unique identifier: page_id + platform
      const uniquePageId = `${page.pageId}_${platform}`
      
      const pageData: any = {
        project_id: projectId,
        platform: platform,
        page_id: uniquePageId, // Use unique ID with platform suffix
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
        errors.push(`${page.pageName} (${platform}): ${error.message}`)
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

// Remove a page from monitoring
async function removePage(supabase: any, projectId: string, pageId: string) {
  console.log(`Removing page ${pageId} from project ${projectId}`)
  
  const { error } = await supabase
    .from('social_listening_pages')
    .delete()
    .eq('project_id', projectId)
    .eq('page_id', pageId)

  if (error) {
    console.error('Error removing page:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
