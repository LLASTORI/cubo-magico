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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface SyncResult {
  projectId: string
  projectName: string
  success: boolean
  postsSynced: number
  commentsSynced: number
  keywordClassified: number
  aiProcessed: number
  stuckReset: number
  error?: string
}

// ============= KEYWORD CLASSIFICATION (NO AI) =============

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
  /^[@\s]+$/,
  /^[\p{Emoji}\s]+$/u,
  /^[🔥❤️💪👏👍😍🙏💕💖💗💙💚💛🧡💜🖤🤍🤎]+$/u,
  /^\.+$/,
  /^!+$/,
]

interface KeywordResult {
  classified: boolean
  sentiment?: string
  classification?: string
  intent_score?: number
  summary?: string
}

function classifyByKeywords(text: string): KeywordResult {
  if (!text || text.trim().length === 0) {
    return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Comentário vazio' }
  }

  const normalizedText = text.toLowerCase().trim()

  for (const pattern of IGNORABLE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Emoji/menção' }
    }
  }

  if (normalizedText.length <= 2) {
    return { classified: true, sentiment: 'neutral', classification: 'other', intent_score: 0, summary: 'Comentário muito curto' }
  }

  for (const keyword of COMMERCIAL_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      return { classified: true, sentiment: 'positive', classification: 'commercial_interest', intent_score: 95, summary: 'Interesse comercial detectado' }
    }
  }

  if (normalizedText.length <= 50) {
    for (const keyword of PRAISE_KEYWORDS) {
      if (normalizedText.includes(keyword) || normalizedText === keyword) {
        return { classified: true, sentiment: 'positive', classification: 'praise', intent_score: 20, summary: 'Elogio simples' }
      }
    }
  }

  return { classified: false }
}

// ============= MAIN CRON HANDLER =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('='.repeat(60))
  console.log('[SOCIAL-LISTENING-CRON] Starting automatic sync at', new Date().toISOString())

  try {
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    const isValidCron = cronSecret && authHeader === `Bearer ${cronSecret}`
    const isValidServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    const isValidAnon = authHeader === `Bearer ${SUPABASE_ANON_KEY}`
    
    if (!isValidCron && !isValidServiceRole && !isValidAnon) {
      console.log('[SOCIAL-LISTENING-CRON] Unauthorized request')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: activeProjects, error: projectsError } = await supabase
      .from('social_listening_pages')
      .select('project_id, projects!inner(id, name)')
      .eq('is_active', true)
    
    if (projectsError) {
      console.error('[SOCIAL-LISTENING-CRON] Error fetching active projects:', projectsError)
      throw new Error('Erro ao buscar projetos ativos')
    }

    const projectIds = [...new Set((activeProjects || []).map(p => p.project_id))]
    console.log(`[SOCIAL-LISTENING-CRON] Found ${projectIds.length} projects with active social listening`)

    const results: SyncResult[] = []

    for (const projectId of projectIds) {
      const projectInfo = activeProjects?.find(p => p.project_id === projectId)
      const projectName = (projectInfo?.projects as any)?.name || 'Unknown'
      
      console.log('-'.repeat(40))
      console.log(`[SOCIAL-LISTENING-CRON] Processing project: ${projectName} (${projectId})`)

      const result: SyncResult = {
        projectId,
        projectName,
        success: true,
        postsSynced: 0,
        commentsSynced: 0,
        keywordClassified: 0,
        aiProcessed: 0,
        stuckReset: 0,
      }

      try {
        // Step 1: Reset stuck comments
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        const { data: stuckComments } = await supabase
          .from('social_comments')
          .update({ ai_processing_status: 'pending', updated_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('ai_processing_status', 'processing')
          .lt('updated_at', twoMinutesAgo)
          .select('id')

        result.stuckReset = stuckComments?.length || 0
        if (result.stuckReset > 0) {
          console.log(`[SOCIAL-LISTENING-CRON] Reset ${result.stuckReset} stuck comments`)
        }

        // Step 2: Get Meta credentials
        const { data: credentials, error: credError } = await supabase
          .from('meta_credentials')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle()

        if (credError || !credentials?.access_token) {
          console.log(`[SOCIAL-LISTENING-CRON] No Meta credentials for project ${projectName}`)
          result.error = 'Meta não conectado'
          results.push(result)
          continue
        }

        // Step 3: Sync posts
        const postsResult = await syncPostsForProject(supabase, projectId, credentials.access_token)
        result.postsSynced = postsResult.postsSynced || 0

        // Step 4: Sync comments
        const commentsResult = await syncCommentsForProject(supabase, projectId, credentials.access_token)
        result.commentsSynced = commentsResult.commentsSynced || 0

        // Step 5: Process pending comments with AI (max 50 per run)
        const aiResult = await processAIForProject(supabase, projectId, 50)
        result.keywordClassified = aiResult.keywordClassified || 0
        result.aiProcessed = aiResult.aiProcessed || 0

        // Update last sync timestamp
        await supabase
          .from('social_listening_pages')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('is_active', true)

        console.log(`[SOCIAL-LISTENING-CRON] Project ${projectName} completed:`, {
          posts: result.postsSynced,
          comments: result.commentsSynced,
          keyword: result.keywordClassified,
          ai: result.aiProcessed,
          stuck: result.stuckReset
        })

      } catch (projectError: any) {
        console.error(`[SOCIAL-LISTENING-CRON] Error processing project ${projectName}:`, projectError.message)
        result.success = false
        result.error = projectError.message
      }

      results.push(result)
      await delay(1000)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const successCount = results.filter(r => r.success).length
    const totalPosts = results.reduce((sum, r) => sum + r.postsSynced, 0)
    const totalComments = results.reduce((sum, r) => sum + r.commentsSynced, 0)
    const totalKeyword = results.reduce((sum, r) => sum + r.keywordClassified, 0)
    const totalAI = results.reduce((sum, r) => sum + r.aiProcessed, 0)

    console.log('='.repeat(60))
    console.log(`[SOCIAL-LISTENING-CRON] COMPLETED in ${duration}s`)
    console.log(`[SOCIAL-LISTENING-CRON] Projects: ${successCount}/${results.length} successful`)
    console.log(`[SOCIAL-LISTENING-CRON] Total: ${totalPosts} posts, ${totalComments} comments`)
    console.log(`[SOCIAL-LISTENING-CRON] Classification: ${totalKeyword} keyword, ${totalAI} AI`)

    return new Response(JSON.stringify({
      success: true,
      duration: `${duration}s`,
      projectsProcessed: results.length,
      projectsSuccessful: successCount,
      totalPostsSynced: totalPosts,
      totalCommentsSynced: totalComments,
      totalKeywordClassified: totalKeyword,
      totalAIProcessed: totalAI,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[SOCIAL-LISTENING-CRON] FATAL ERROR:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ============= POST SYNC =============

async function syncPostsForProject(supabase: any, projectId: string, accessToken: string) {
  const GRAPH_API_VERSION = 'v19.0'
  const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
  
  let totalPosts = 0
  const errors: string[] = []

  try {
    const { data: savedPages, error: pagesError } = await supabase
      .from('social_listening_pages')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)

    if (pagesError || !savedPages?.length) {
      return { success: false, postsSynced: 0, error: 'Nenhuma página configurada' }
    }

    for (const page of savedPages) {
      const pageToken = page.page_access_token
      const originalPageId = page.page_id.replace(/_facebook$/, '').replace(/_instagram$/, '')

      try {
        if (page.platform === 'facebook' || (!page.platform && !page.instagram_account_id)) {
          const url = `${GRAPH_API_BASE}/${originalPageId}/posts?fields=id,message,created_time,permalink_url,status_type,full_picture&limit=20&access_token=${pageToken}`
          const response = await fetch(url)
          const data = await response.json()

          if (data.error) throw new Error(data.error.message)

          for (const post of (data.data || [])) {
            await upsertPost(supabase, projectId, 'facebook', post, page.page_name, originalPageId)
            totalPosts++
          }
        }

        if (page.platform === 'instagram' && page.instagram_account_id) {
          const url = `${GRAPH_API_BASE}/${page.instagram_account_id}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=20&access_token=${pageToken}`
          const response = await fetch(url)
          const data = await response.json()

          if (data.error) throw new Error(data.error.message)

          for (const post of (data.data || [])) {
            await upsertPostIG(supabase, projectId, post, page.page_name, page.instagram_account_id)
            totalPosts++
          }
        }
      } catch (pageError: any) {
        errors.push(`${page.page_name}: ${pageError.message}`)
      }

      await delay(300)
    }

    return { success: true, postsSynced: totalPosts, errors }
  } catch (error: any) {
    return { success: false, postsSynced: totalPosts, error: error.message }
  }
}

async function upsertPost(supabase: any, projectId: string, platform: string, post: any, pageName: string, pageId: string) {
  await supabase
    .from('social_posts')
    .upsert({
      project_id: projectId,
      platform,
      post_id_meta: post.id,
      page_id: pageId,
      page_name: pageName,
      post_type: 'organic',
      message: post.message,
      media_type: post.status_type || 'post',
      permalink: post.permalink_url,
      shares_count: post.shares?.count || 0,
      published_at: post.created_time,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'project_id,platform,post_id_meta' })
}

async function upsertPostIG(supabase: any, projectId: string, post: any, pageName: string, pageId: string) {
  await supabase
    .from('social_posts')
    .upsert({
      project_id: projectId,
      platform: 'instagram',
      post_id_meta: post.id,
      page_id: pageId,
      page_name: pageName,
      post_type: 'organic',
      message: post.caption,
      media_type: post.media_type?.toLowerCase() || 'post',
      permalink: post.permalink,
      likes_count: post.like_count || 0,
      comments_count: post.comments_count || 0,
      published_at: post.timestamp,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'project_id,platform,post_id_meta' })
}

// ============= COMMENT SYNC =============

async function syncCommentsForProject(supabase: any, projectId: string, accessToken: string) {
  const GRAPH_API_VERSION = 'v19.0'
  const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
  
  let totalComments = 0

  try {
    // Get connected pages to identify own account comments
    const { data: pages } = await supabase
      .from('social_listening_pages')
      .select('page_id, instagram_username, page_name')
      .eq('project_id', projectId)
      .eq('is_active', true)
    
    // Build lists of connected page IDs and Instagram usernames
    const connectedPageIds: string[] = (pages || []).map((p: any) => p.page_id).filter(Boolean)
    const connectedUsernames: string[] = (pages || [])
      .map((p: any) => (p.instagram_username || p.page_name || '').toLowerCase().replace(/^@/, ''))
      .filter(Boolean)
    
    console.log(`[SYNC_COMMENTS] Connected pages: ${connectedPageIds.length}, IG usernames: ${connectedUsernames.join(', ')}`)

    const { data: posts } = await supabase
      .from('social_posts')
      .select('*, social_listening_pages!inner(page_access_token)')
      .eq('project_id', projectId)
      .order('published_at', { ascending: false })
      .limit(20)

    if (!posts?.length) {
      return { success: true, commentsSynced: 0 }
    }

    for (const post of posts) {
      const pageToken = post.social_listening_pages?.page_access_token || accessToken

      try {
        if (post.platform === 'facebook') {
          const url = `${GRAPH_API_BASE}/${post.post_id_meta}/comments?fields=id,message,created_time,from,like_count,comment_count&limit=50&access_token=${pageToken}`
          const response = await fetch(url)
          const data = await response.json()

          if (!data.error && data.data) {
            for (const comment of data.data) {
              await upsertComment(supabase, projectId, post.id, 'facebook', comment, connectedPageIds)
              totalComments++
            }
          }
        } else if (post.platform === 'instagram') {
          const url = `${GRAPH_API_BASE}/${post.post_id_meta}/comments?fields=id,text,timestamp,username,like_count,replies&limit=50&access_token=${pageToken}`
          const response = await fetch(url)
          const data = await response.json()

          if (!data.error && data.data) {
            for (const comment of data.data) {
              await upsertCommentIG(supabase, projectId, post.id, comment, connectedUsernames)
              totalComments++
            }
          }
        }
      } catch (postError: any) {
        console.log(`[SYNC_COMMENTS] Error for post ${post.id}:`, postError.message)
      }

      await delay(200)
    }

    return { success: true, commentsSynced: totalComments }
  } catch (error: any) {
    return { success: false, commentsSynced: totalComments, error: error.message }
  }
}

async function upsertComment(supabase: any, projectId: string, postId: string, platform: string, comment: any, connectedPageIds: string[]) {
  const authorId = comment.from?.id
  const authorName = comment.from?.name
  
  // Check if comment is from the connected page (own account)
  const isOwnAccount = authorId ? connectedPageIds.includes(authorId) : false
  
  if (isOwnAccount) {
    console.log(`[SYNC] Own account comment detected (FB): ${authorName} (${authorId})`)
  }
  
  await supabase
    .from('social_comments')
    .upsert({
      project_id: projectId,
      post_id: postId,
      platform,
      comment_id_meta: comment.id,
      text: comment.message,
      author_name: authorName,
      author_id: authorId,
      likes_count: comment.like_count || 0,
      replies_count: comment.comment_count || 0,
      comment_timestamp: comment.created_time,
      is_deleted: false,
      is_own_account: isOwnAccount,
      ai_processing_status: isOwnAccount ? 'skipped' : 'pending',
    }, { onConflict: 'project_id,platform,comment_id_meta' })
}

async function upsertCommentIG(supabase: any, projectId: string, postId: string, comment: any, connectedUsernames: string[]) {
  const authorUsername = comment.username
  
  // Check if comment is from the connected Instagram account (own account)
  const normalizedAuthor = (authorUsername || '').toLowerCase().replace(/^@/, '')
  const isOwnAccount = connectedUsernames.some(u => u === normalizedAuthor)
  
  if (isOwnAccount) {
    console.log(`[SYNC] Own account comment detected (IG): @${authorUsername}`)
  }
  
  await supabase
    .from('social_comments')
    .upsert({
      project_id: projectId,
      post_id: postId,
      platform: 'instagram',
      comment_id_meta: comment.id,
      text: comment.text,
      author_username: authorUsername,
      likes_count: comment.like_count || 0,
      replies_count: comment.replies?.data?.length || 0,
      comment_timestamp: comment.timestamp,
      is_deleted: false,
      is_own_account: isOwnAccount,
      ai_processing_status: isOwnAccount ? 'skipped' : 'pending',
    }, { onConflict: 'project_id,platform,comment_id_meta' })
}

// ============= AI PROCESSING WITH KEYWORDS + OPENAI =============

async function processAIForProject(supabase: any, projectId: string, limit: number) {
  try {
    // Get knowledge base
    const { data: knowledgeBase } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    // Get pending comments
    const { data: comments } = await supabase
      .from('social_comments')
      .select('id, text, post_id, social_posts!inner(message)')
      .eq('project_id', projectId)
      .eq('ai_processing_status', 'pending')
      .limit(limit)

    if (!comments?.length) {
      return { success: true, keywordClassified: 0, aiProcessed: 0 }
    }

    let keywordClassified = 0
    let aiProcessed = 0

    // Phase 1: Keyword classification
    const commentsForAI: Array<{id: string, text: string, postContext: string}> = []

    for (const comment of comments) {
      const keywordResult = classifyByKeywords(comment.text || '')

      if (keywordResult.classified) {
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
      } else {
        commentsForAI.push({
          id: comment.id,
          text: comment.text || '',
          postContext: comment.social_posts?.message || ''
        })
      }
    }

    console.log(`[AI_PROCESS] Keyword: ${keywordClassified}, Needs AI: ${commentsForAI.length}`)

    // Phase 2: AI classification
    if (commentsForAI.length > 0) {
      // Check quota
      const { data: quotaResult } = await supabase.rpc('check_and_use_ai_quota', {
        p_project_id: projectId,
        p_items_count: commentsForAI.length
      })

      if (quotaResult && !quotaResult.allowed) {
        console.log(`[AI_PROCESS] Quota exceeded:`, quotaResult.reason)
        return { success: true, keywordClassified, aiProcessed: 0, quotaExceeded: true }
      }

      // Mark as processing
      await supabase
        .from('social_comments')
        .update({ ai_processing_status: 'processing' })
        .in('id', commentsForAI.map(c => c.id))

      // Try OpenAI batch processing
      if (OPENAI_API_KEY) {
        try {
          const batchSize = 15
          for (let i = 0; i < commentsForAI.length; i += batchSize) {
            const batch = commentsForAI.slice(i, i + batchSize)
            const { results, inputTokens, outputTokens, cost } = await classifyBatchWithOpenAI(batch, knowledgeBase)

            // Track usage
            await supabase.from('ai_usage_tracking').insert({
              project_id: projectId,
              feature: 'social_listening',
              action: 'batch_classify',
              provider: 'openai',
              model: 'gpt-4o-mini',
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              items_processed: batch.length,
              cost_estimate: cost,
              success: true
            })

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

            if (i + batchSize < commentsForAI.length) {
              await delay(500)
            }
          }
        } catch (openaiError: any) {
          console.error('[AI_PROCESS] OpenAI error, falling back:', openaiError.message)
          
          // Fallback to Lovable AI
          for (const comment of commentsForAI) {
            try {
              const result = await classifyWithLovableAI(comment.text, comment.postContext, knowledgeBase)
              
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
                .update({ ai_processing_status: 'failed', ai_error: e.message })
                .eq('id', comment.id)
            }

            await delay(200)
          }
        }
      } else {
        // No OpenAI, use Lovable AI
        for (const comment of commentsForAI) {
          try {
            const result = await classifyWithLovableAI(comment.text, comment.postContext, knowledgeBase)
            
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
              .update({ ai_processing_status: 'failed', ai_error: e.message })
              .eq('id', comment.id)
          }

          await delay(200)
        }
      }
    }

    return { success: true, keywordClassified, aiProcessed }
  } catch (error: any) {
    console.error('[AI_PROCESS] Error:', error.message)
    return { success: false, keywordClassified: 0, aiProcessed: 0, error: error.message }
  }
}

async function classifyBatchWithOpenAI(comments: Array<{id: string, text: string, postContext: string}>, knowledgeBase?: any) {
  const businessContext = knowledgeBase ? `
CONTEXTO DO NEGÓCIO:
- Nome: ${knowledgeBase.business_name || 'Não informado'}
- Produtos/Serviços: ${knowledgeBase.products_services || 'Não informado'}
` : ''

  const commentsText = comments.map((c, i) => 
    `[${i+1}] ID: ${c.id}
Contexto: ${c.postContext || 'N/A'}
Comentário: "${c.text}"`
  ).join('\n\n')

  const prompt = `${businessContext}

Analise os ${comments.length} comentários abaixo. Para cada um, forneça:
- sentiment: "positive", "neutral" ou "negative"
- classification: "product_question", "purchase_question", "commercial_interest", "praise", "complaint", "contact_request", "friend_tag", "spam" ou "other"
- intent_score: 0-100 (intenção comercial)
- summary: resumo de 1 linha (máx 80 caracteres)

${commentsText}

Responda em JSON array:
[{"id": "...", "sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}, ...]`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em análise de comentários de redes sociais. Responda sempre em JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Invalid OpenAI response format')
  }

  const results = JSON.parse(jsonMatch[0])
  const inputTokens = data.usage?.prompt_tokens || 0
  const outputTokens = data.usage?.completion_tokens || 0
  const cost = (inputTokens * 0.00000015) + (outputTokens * 0.0000006)

  return { results, inputTokens, outputTokens, cost }
}

async function classifyWithLovableAI(text: string, postContext: string, knowledgeBase?: any) {
  const prompt = `Analise o comentário abaixo e forneça em JSON:
- sentiment: "positive", "neutral" ou "negative"
- classification: "product_question", "purchase_question", "commercial_interest", "praise", "complaint", "contact_request", "friend_tag", "spam" ou "other"
- intent_score: 0-100 (intenção comercial)
- summary: resumo de 1 linha (máx 80 caracteres)

Contexto do post: ${postContext || 'N/A'}
Comentário: "${text}"

Responda APENAS em JSON: {"sentiment": "...", "classification": "...", "intent_score": 0, "summary": "..."}`

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Invalid AI response')
  }

  return JSON.parse(jsonMatch[0])
}
