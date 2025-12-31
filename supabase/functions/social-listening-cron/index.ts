import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface SyncResult {
  projectId: string
  projectName: string
  success: boolean
  postsSynced: number
  commentsSynced: number
  aiProcessed: number
  stuckReset: number
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('='.repeat(60))
  console.log('[SOCIAL-LISTENING-CRON] Starting automatic sync at', new Date().toISOString())

  try {
    // Validate request - accept cron secret or service role key
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

    // Get all projects with active social listening pages
    const { data: activeProjects, error: projectsError } = await supabase
      .from('social_listening_pages')
      .select('project_id, projects!inner(id, name)')
      .eq('is_active', true)
    
    if (projectsError) {
      console.error('[SOCIAL-LISTENING-CRON] Error fetching active projects:', projectsError)
      throw new Error('Erro ao buscar projetos ativos')
    }

    // Get unique project IDs
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
        aiProcessed: 0,
        stuckReset: 0,
      }

      try {
        // Step 1: Reset stuck comments (processing for more than 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        const { data: stuckComments } = await supabase
          .from('social_comments')
          .update({ 
            ai_processing_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('ai_processing_status', 'processing')
          .lt('updated_at', twoMinutesAgo)
          .select('id')

        result.stuckReset = stuckComments?.length || 0
        if (result.stuckReset > 0) {
          console.log(`[SOCIAL-LISTENING-CRON] Reset ${result.stuckReset} stuck comments`)
        }

        // Step 2: Get Meta credentials for this project
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

        // Step 3: Sync posts from all configured pages
        const postsResult = await syncPostsForProject(supabase, projectId, credentials.access_token)
        result.postsSynced = postsResult.postsSynced || 0
        
        if (!postsResult.success && postsResult.error) {
          console.log(`[SOCIAL-LISTENING-CRON] Posts sync warning: ${postsResult.error}`)
        }

        // Step 4: Sync comments for recent posts
        const commentsResult = await syncCommentsForProject(supabase, projectId, credentials.access_token)
        result.commentsSynced = commentsResult.commentsSynced || 0

        // Step 5: Process pending comments with AI (max 50 per run to avoid timeout)
        const aiResult = await processAIForProject(supabase, projectId, 50)
        result.aiProcessed = aiResult.processed || 0

        // Update last sync timestamp on pages
        await supabase
          .from('social_listening_pages')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('is_active', true)

        console.log(`[SOCIAL-LISTENING-CRON] Project ${projectName} completed:`, {
          posts: result.postsSynced,
          comments: result.commentsSynced,
          ai: result.aiProcessed,
          stuck: result.stuckReset
        })

      } catch (projectError: any) {
        console.error(`[SOCIAL-LISTENING-CRON] Error processing project ${projectName}:`, projectError.message)
        result.success = false
        result.error = projectError.message
      }

      results.push(result)
      
      // Rate limiting between projects
      await delay(1000)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const successCount = results.filter(r => r.success).length
    const totalPosts = results.reduce((sum, r) => sum + r.postsSynced, 0)
    const totalComments = results.reduce((sum, r) => sum + r.commentsSynced, 0)
    const totalAI = results.reduce((sum, r) => sum + r.aiProcessed, 0)

    console.log('='.repeat(60))
    console.log(`[SOCIAL-LISTENING-CRON] COMPLETED in ${duration}s`)
    console.log(`[SOCIAL-LISTENING-CRON] Projects: ${successCount}/${results.length} successful`)
    console.log(`[SOCIAL-LISTENING-CRON] Total: ${totalPosts} posts, ${totalComments} comments, ${totalAI} AI processed`)

    return new Response(JSON.stringify({
      success: true,
      duration: `${duration}s`,
      projectsProcessed: results.length,
      projectsSuccessful: successCount,
      totalPostsSynced: totalPosts,
      totalCommentsSynced: totalComments,
      totalAIProcessed: totalAI,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[SOCIAL-LISTENING-CRON] FATAL ERROR:', error.message)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Sync posts from saved pages
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
          // Facebook posts
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
          // Instagram posts
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

// Sync comments for recent posts
async function syncCommentsForProject(supabase: any, projectId: string, accessToken: string) {
  const GRAPH_API_VERSION = 'v19.0'
  const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
  
  let totalComments = 0

  try {
    // Get recent posts from both platforms
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
              await upsertComment(supabase, projectId, post.id, 'facebook', comment)
              totalComments++
            }
          }
        } else if (post.platform === 'instagram') {
          const url = `${GRAPH_API_BASE}/${post.post_id_meta}/comments?fields=id,text,timestamp,username,like_count,replies&limit=50&access_token=${pageToken}`
          const response = await fetch(url)
          const data = await response.json()

          if (!data.error && data.data) {
            for (const comment of data.data) {
              await upsertCommentIG(supabase, projectId, post.id, comment)
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

async function upsertComment(supabase: any, projectId: string, postId: string, platform: string, comment: any) {
  await supabase
    .from('social_comments')
    .upsert({
      project_id: projectId,
      post_id: postId,
      platform,
      comment_id_meta: comment.id,
      text: comment.message,
      author_name: comment.from?.name,
      author_id: comment.from?.id,
      likes_count: comment.like_count || 0,
      replies_count: comment.comment_count || 0,
      comment_timestamp: comment.created_time,
      is_deleted: false,
      ai_processing_status: 'pending',
    }, { onConflict: 'project_id,platform,comment_id_meta' })
}

async function upsertCommentIG(supabase: any, projectId: string, postId: string, comment: any) {
  await supabase
    .from('social_comments')
    .upsert({
      project_id: projectId,
      post_id: postId,
      platform: 'instagram',
      comment_id_meta: comment.id,
      text: comment.text,
      author_username: comment.username,
      likes_count: comment.like_count || 0,
      replies_count: comment.replies?.data?.length || 0,
      comment_timestamp: comment.timestamp,
      is_deleted: false,
      ai_processing_status: 'pending',
    }, { onConflict: 'project_id,platform,comment_id_meta' })
}

// Process pending comments with AI
async function processAIForProject(supabase: any, projectId: string, limit: number) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
  
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
      return { success: true, processed: 0 }
    }

    let processed = 0

    // Process in small batches with timeout
    for (const comment of comments) {
      try {
        await supabase
          .from('social_comments')
          .update({ ai_processing_status: 'processing' })
          .eq('id', comment.id)

        const postContext = comment.social_posts?.message || ''
        const prompt = buildPrompt(comment.text, postContext, knowledgeBase)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

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
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ''
          const jsonMatch = content.match(/\{[\s\S]*\}/)

          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0])
            
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
              .eq('id', comment.id)

            processed++
          } else {
            throw new Error('Invalid AI response')
          }
        } else {
          throw new Error(`AI API error: ${response.status}`)
        }
      } catch (commentError: any) {
        await supabase
          .from('social_comments')
          .update({
            ai_processing_status: 'failed',
            ai_error: commentError.message?.substring(0, 200),
          })
          .eq('id', comment.id)
      }

      await delay(100)
    }

    return { success: true, processed }
  } catch (error: any) {
    return { success: false, processed: 0, error: error.message }
  }
}

function buildPrompt(text: string, postContext: string, kb?: any) {
  const businessContext = kb ? `
CONTEXTO: ${kb.business_name || ''} - ${kb.business_description || ''}
` : ''

  return `${businessContext}
Analise o comentário e responda em JSON:
{"sentiment": "positive/neutral/negative", "classification": "product_question/purchase_question/commercial_interest/praise/complaint/contact_request/friend_tag/spam/other", "intent_score": 0-100, "summary": "resumo curto"}

Post: "${postContext?.substring(0, 200)}"
Comentário: "${text}"

JSON:`
}
