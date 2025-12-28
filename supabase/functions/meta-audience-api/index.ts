import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Batch size for Meta API (max 10,000 per request)
const META_BATCH_SIZE = 10000

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// SHA-256 hash function using Web Crypto API
async function sha256(str: string): Promise<string> {
  if (!str) return ''
  const msgBuffer = new TextEncoder().encode(str.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Normalize email for hashing
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// Normalize phone to international format
function normalizePhone(phone: string, countryCode: string = '55'): string {
  if (!phone) return ''
  // Remove all non-numeric characters
  const clean = phone.replace(/\D/g, '')
  // If already has country code, return as is
  if (clean.length >= 12 && clean.startsWith(countryCode)) {
    return clean
  }
  // Add country code
  return countryCode + clean
}

// Normalize name for hashing
function normalizeName(name: string): string {
  if (!name) return ''
  return name.toLowerCase().trim()
}

// Get first name from full name
function getFirstName(fullName: string): string {
  if (!fullName) return ''
  return fullName.split(' ')[0] || ''
}

// Get last name from full name
function getLastName(fullName: string): string {
  if (!fullName) return ''
  const parts = fullName.split(' ')
  if (parts.length < 2) return ''
  return parts.slice(1).join(' ')
}

// Build contact query for fetching data
function buildContactQuery(
  supabase: any,
  projectId: string,
  segmentConfig: { tags: string[], operator: 'AND' | 'OR' }
) {
  let query = supabase
    .from('crm_contacts')
    .select('id, email, phone, phone_country_code, name, first_name, last_name')
    .eq('project_id', projectId)
  
  const { tags, operator } = segmentConfig
  
  if (tags && tags.length > 0) {
    if (operator === 'AND') {
      query = query.contains('tags', tags)
    } else {
      query = query.overlaps('tags', tags)
    }
  }
  
  query = query.or('email.neq.null,phone.neq.null')
  
  return query
}

// Get count using POST-based RPC to avoid URL length limits
async function getContactCount(
  supabase: any,
  projectId: string,
  segmentConfig: { tags: string[], operator: 'AND' | 'OR' }
): Promise<number> {
  const { tags, operator } = segmentConfig
  
  // Build filter conditions - we'll use a simple approach with pagination to count
  // Since the URL can get too long with many tags, we'll fetch in batches and count
  let query = supabase
    .from('crm_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  
  // Limit the number of tags to avoid URL length issues
  // If there are many tags, we'll use a subset for estimation
  const maxTagsForQuery = 20
  const tagsToUse = tags && tags.length > maxTagsForQuery ? tags.slice(0, maxTagsForQuery) : tags
  
  if (tagsToUse && tagsToUse.length > 0) {
    if (operator === 'AND') {
      query = query.contains('tags', tagsToUse)
    } else {
      query = query.overlaps('tags', tagsToUse)
    }
  }
  
  query = query.or('email.neq.null,phone.neq.null')
  
  const { count, error } = await query
  
  if (error) {
    console.error('Error in getContactCount:', error)
    throw error
  }
  
  return count || 0
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    console.log('Meta Audience API request:', { action })

    // For scheduled sync, use service role directly
    if (action === 'sync_scheduled') {
      const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const result = await handleScheduledSync(serviceSupabase, body.frequency)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For other actions, require auth
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

    let result: any

    switch (action) {
      case 'create_audience':
        result = await createAudience(supabase, serviceSupabase, body)
        break

      case 'update_audience':
        result = await updateAudience(supabase, serviceSupabase, body)
        break

      case 'sync_audience':
        result = await syncAudience(supabase, serviceSupabase, body.audienceId)
        break

      case 'delete_audience':
        result = await deleteAudience(supabase, serviceSupabase, body.audienceId)
        break

      case 'create_lookalike':
        result = await createLookalike(supabase, serviceSupabase, body)
        break

      case 'get_estimated_size':
        result = await getEstimatedSize(supabase, body.projectId, body.segmentConfig)
        break

      case 'get_available_tags':
        result = await getAvailableTags(supabase, body.projectId)
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
    console.error('Meta Audience API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Get available tags from contacts - with pagination to get ALL contacts
async function getAvailableTags(supabase: any, projectId: string) {
  console.log('Getting available tags for project:', projectId)
  
  // Use pagination to get ALL contacts (Supabase default limit is 1000)
  const tagCounts = new Map<string, number>()
  const PAGE_SIZE = 1000
  let offset = 0
  let hasMore = true
  let totalProcessed = 0
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('tags')
      .eq('project_id', projectId)
      .not('tags', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1)
    
    if (error) {
      console.error('Error getting tags:', error)
      throw error
    }
    
    // Process this batch
    for (const contact of data || []) {
      if (contact.tags && Array.isArray(contact.tags)) {
        for (const tag of contact.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
      }
    }
    
    totalProcessed += (data?.length || 0)
    
    // Check if there are more records
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false
    } else {
      offset += PAGE_SIZE
    }
  }
  
  console.log(`Processed ${totalProcessed} contacts, found ${tagCounts.size} unique tags`)
  
  // Sort by count descending
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
  
  return { tags: sortedTags, totalContacts: totalProcessed }
}

// Get estimated size based on segment config
async function getEstimatedSize(
  supabase: any, 
  projectId: string, 
  segmentConfig: { tags: string[], operator: 'AND' | 'OR' }
) {
  console.log('Getting estimated size for segment:', segmentConfig)
  
  try {
    const count = await getContactCount(supabase, projectId, segmentConfig)
    console.log('Estimated size result:', count)
    return { estimatedSize: count }
  } catch (error) {
    console.error('Error getting estimated size:', error)
    throw error
  }
}

// Create a new Custom Audience on Meta
async function createAudience(
  supabase: any,
  serviceSupabase: any,
  params: {
    projectId: string
    adAccountId: string
    name: string
    segmentConfig: { tags: string[], operator: 'AND' | 'OR' }
    syncFrequency: string
  }
) {
  const { projectId, adAccountId, name, segmentConfig, syncFrequency } = params
  
  console.log('Creating audience:', { projectId, adAccountId, name, segmentConfig })
  
  // Get Meta credentials
  const { data: credentials, error: credError } = await supabase
    .from('meta_credentials')
    .select('access_token, expires_at')
    .eq('project_id', projectId)
    .maybeSingle()
  
  if (credError || !credentials) {
    throw new Error('Meta não conectado')
  }
  
  if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
    throw new Error('Token Meta expirado. Reconecte sua conta.')
  }
  
  const accessToken = credentials.access_token
  
  // Create Custom Audience on Meta
  // Ensure adAccountId doesn't have duplicate 'act_' prefix
  const cleanAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const createUrl = `${GRAPH_API_BASE}/${cleanAdAccountId}/customaudiences`
  
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      name: name,
      subtype: 'CUSTOM',
      description: `Público criado pelo CRM - Tags: ${segmentConfig.tags.join(', ')} (${segmentConfig.operator})`,
      customer_file_source: 'USER_PROVIDED_ONLY',
    }),
  })
  
  const metaResult = await response.json()
  
  if (metaResult.error) {
    console.error('Meta API error:', metaResult.error)
    throw new Error(metaResult.error.message || 'Erro ao criar público no Meta')
  }
  
  console.log('Meta audience created:', metaResult)
  
  // Get estimated size
  const { estimatedSize } = await getEstimatedSize(supabase, projectId, segmentConfig)
  
  // Save audience to database
  const { data: audience, error: insertError } = await serviceSupabase
    .from('meta_ad_audiences')
    .insert({
      project_id: projectId,
      ad_account_id: adAccountId,
      name: name,
      meta_audience_id: metaResult.id,
      segment_type: 'tag',
      segment_config: segmentConfig,
      status: 'pending',
      sync_frequency: syncFrequency,
      estimated_size: estimatedSize,
    })
    .select()
    .single()
  
  if (insertError) {
    console.error('Error saving audience:', insertError)
    // Try to delete the audience from Meta since we couldn't save it
    await fetch(`${GRAPH_API_BASE}/${metaResult.id}?access_token=${accessToken}`, {
      method: 'DELETE',
    })
    throw new Error('Erro ao salvar público no banco de dados')
  }
  
  // Trigger initial sync
  const syncResult = await syncAudienceInternal(serviceSupabase, audience, credentials.access_token)
  
  return { 
    success: true, 
    audience,
    syncResult,
  }
}

// Update an existing audience
async function updateAudience(
  supabase: any,
  serviceSupabase: any,
  params: {
    audienceId: string
    name?: string
    segmentConfig?: { tags: string[], operator: 'AND' | 'OR' }
    syncFrequency?: string
  }
) {
  const { audienceId, name, segmentConfig, syncFrequency } = params
  
  console.log('Updating audience:', { audienceId, name, segmentConfig, syncFrequency })
  
  // Get audience details
  const { data: audience, error: audienceError } = await supabase
    .from('meta_ad_audiences')
    .select('*')
    .eq('id', audienceId)
    .single()
  
  if (audienceError || !audience) {
    throw new Error('Público não encontrado')
  }
  
  // Build update object
  const updateData: any = { updated_at: new Date().toISOString() }
  
  if (name) {
    updateData.name = name
    
    // Also update name in Meta if connected
    const { data: credentials } = await supabase
      .from('meta_credentials')
      .select('access_token, expires_at')
      .eq('project_id', audience.project_id)
      .maybeSingle()
    
    if (credentials?.access_token && audience.meta_audience_id) {
      try {
        const response = await fetch(
          `${GRAPH_API_BASE}/${audience.meta_audience_id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: credentials.access_token,
              name: name,
            }),
          }
        )
        const result = await response.json()
        if (result.error) {
          console.warn('Failed to update name in Meta:', result.error)
        }
      } catch (e) {
        console.warn('Error updating name in Meta:', e)
      }
    }
  }
  
  if (segmentConfig) {
    updateData.segment_config = segmentConfig
    // Recalculate estimated size
    const { estimatedSize } = await getEstimatedSize(supabase, audience.project_id, segmentConfig)
    updateData.estimated_size = estimatedSize
  }
  
  if (syncFrequency) {
    updateData.sync_frequency = syncFrequency
  }
  
  // Update in database
  const { data: updated, error: updateError } = await serviceSupabase
    .from('meta_ad_audiences')
    .update(updateData)
    .eq('id', audienceId)
    .select()
    .single()
  
  if (updateError) {
    console.error('Error updating audience:', updateError)
    throw new Error('Erro ao atualizar público')
  }
  
  return { success: true, audience: updated }
}

// Sync an audience with Meta (delta sync)
async function syncAudience(
  supabase: any,
  serviceSupabase: any,
  audienceId: string
) {
  console.log('Syncing audience:', audienceId)
  
  // Get audience details
  const { data: audience, error: audienceError } = await supabase
    .from('meta_ad_audiences')
    .select('*, project:projects(id)')
    .eq('id', audienceId)
    .single()
  
  if (audienceError || !audience) {
    throw new Error('Público não encontrado')
  }
  
  // Get Meta credentials
  const { data: credentials, error: credError } = await supabase
    .from('meta_credentials')
    .select('access_token, expires_at')
    .eq('project_id', audience.project_id)
    .maybeSingle()
  
  if (credError || !credentials) {
    throw new Error('Meta não conectado')
  }
  
  if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
    throw new Error('Token Meta expirado. Reconecte sua conta.')
  }
  
  return await syncAudienceInternal(serviceSupabase, audience, credentials.access_token)
}

// Internal sync function
async function syncAudienceInternal(
  serviceSupabase: any,
  audience: any,
  accessToken: string
) {
  const startTime = Date.now()
  const audienceId = audience.id
  const projectId = audience.project_id
  const segmentConfig = audience.segment_config as { tags: string[], operator: 'AND' | 'OR' }
  
  console.log('Starting sync for audience:', audienceId)
  
  // Update status to syncing
  await serviceSupabase
    .from('meta_ad_audiences')
    .update({ status: 'syncing' })
    .eq('id', audienceId)
  
  try {
    // Get current contacts matching segment
    const { data: contacts, error: contactsError } = await buildContactQuery(
      serviceSupabase, 
      projectId, 
      segmentConfig
    )
    
    if (contactsError) {
      throw new Error('Erro ao buscar contatos')
    }
    
    console.log(`Found ${contacts?.length || 0} contacts matching segment`)
    
    // Get previously synced contacts
    const { data: syncedContacts } = await serviceSupabase
      .from('meta_audience_contacts')
      .select('contact_id, email_hash, phone_hash')
      .eq('audience_id', audienceId)
      .is('removed_at', null)
    
    const syncedContactIds = new Set((syncedContacts || []).map((c: any) => c.contact_id))
    const currentContactIds = new Set((contacts || []).map((c: any) => c.id))
    
    // Determine contacts to add and remove
    const contactsToAdd: any[] = []
    const contactsToRemove: string[] = []
    
    // Find new contacts to add
    for (const contact of contacts || []) {
      if (!syncedContactIds.has(contact.id)) {
        contactsToAdd.push(contact)
      }
    }
    
    // Find contacts to remove
    for (const syncedId of Array.from(syncedContactIds)) {
      if (!currentContactIds.has(syncedId)) {
        contactsToRemove.push(syncedId as string)
      }
    }
    
    console.log(`Delta: ${contactsToAdd.length} to add, ${contactsToRemove.length} to remove`)
    
    const errors: any[] = []
    let addedCount = 0
    let removedCount = 0
    
    // Hash and send new contacts to Meta
    if (contactsToAdd.length > 0) {
      const hashedData: any[] = []
      const contactRecords: any[] = []
      
      for (const contact of contactsToAdd) {
        const emailHash = contact.email ? await sha256(normalizeEmail(contact.email)) : null
        const phoneHash = contact.phone ? await sha256(normalizePhone(contact.phone, contact.phone_country_code || '55')) : null
        
        // Skip if no email or phone
        if (!emailHash && !phoneHash) continue
        
        const firstName = contact.first_name || getFirstName(contact.name || '')
        const lastName = contact.last_name || getLastName(contact.name || '')
        const firstNameHash = firstName ? await sha256(normalizeName(firstName)) : null
        const lastNameHash = lastName ? await sha256(normalizeName(lastName)) : null
        
        // Build Meta schema data
        const userData: string[] = []
        if (emailHash) userData.push(emailHash)
        if (phoneHash) userData.push(phoneHash)
        if (firstNameHash) userData.push(firstNameHash)
        if (lastNameHash) userData.push(lastNameHash)
        
        hashedData.push(userData)
        
        contactRecords.push({
          audience_id: audienceId,
          contact_id: contact.id,
          email_hash: emailHash,
          phone_hash: phoneHash,
          first_name_hash: firstNameHash,
          last_name_hash: lastNameHash,
        })
      }
      
      // Send to Meta in batches
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN']
      
      for (let i = 0; i < hashedData.length; i += META_BATCH_SIZE) {
        const batch = hashedData.slice(i, i + META_BATCH_SIZE)
        const batchRecords = contactRecords.slice(i, i + META_BATCH_SIZE)
        
        console.log(`Sending batch ${Math.floor(i / META_BATCH_SIZE) + 1} with ${batch.length} users`)
        
        const addResponse = await fetch(
          `${GRAPH_API_BASE}/${audience.meta_audience_id}/users`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
              payload: {
                schema: schema,
                data: batch,
              },
            }),
          }
        )
        
        const addResult = await addResponse.json()
        
        if (addResult.error) {
          console.error('Error adding users to Meta:', addResult.error)
          errors.push({ type: 'add', batch: i / META_BATCH_SIZE, error: addResult.error })
        } else {
          addedCount += addResult.num_received || batch.length
          
          // Save contact records to database
          await serviceSupabase
            .from('meta_audience_contacts')
            .upsert(batchRecords, { onConflict: 'audience_id,contact_id' })
        }
        
        // Small delay between batches
        if (i + META_BATCH_SIZE < hashedData.length) {
          await delay(500)
        }
      }
    }
    
    // Remove contacts from Meta
    if (contactsToRemove.length > 0) {
      // Get hashes for contacts to remove
      const { data: contactsToRemoveData } = await serviceSupabase
        .from('meta_audience_contacts')
        .select('contact_id, email_hash, phone_hash, first_name_hash, last_name_hash')
        .eq('audience_id', audienceId)
        .in('contact_id', contactsToRemove)
      
      if (contactsToRemoveData && contactsToRemoveData.length > 0) {
        const removeData = contactsToRemoveData.map((c: any) => {
          const userData: string[] = []
          if (c.email_hash) userData.push(c.email_hash)
          if (c.phone_hash) userData.push(c.phone_hash)
          if (c.first_name_hash) userData.push(c.first_name_hash)
          if (c.last_name_hash) userData.push(c.last_name_hash)
          return userData
        })
        
        const schema = ['EMAIL', 'PHONE', 'FN', 'LN']
        
        for (let i = 0; i < removeData.length; i += META_BATCH_SIZE) {
          const batch = removeData.slice(i, i + META_BATCH_SIZE)
          const batchIds = contactsToRemove.slice(i, i + META_BATCH_SIZE)
          
          const removeResponse = await fetch(
            `${GRAPH_API_BASE}/${audience.meta_audience_id}/users`,
            {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: accessToken,
                payload: {
                  schema: schema,
                  data: batch,
                },
              }),
            }
          )
          
          const removeResult = await removeResponse.json()
          
          if (removeResult.error) {
            console.error('Error removing users from Meta:', removeResult.error)
            errors.push({ type: 'remove', batch: i / META_BATCH_SIZE, error: removeResult.error })
          } else {
            removedCount += batch.length
            
            // Mark contacts as removed in database
            await serviceSupabase
              .from('meta_audience_contacts')
              .update({ removed_at: new Date().toISOString() })
              .eq('audience_id', audienceId)
              .in('contact_id', batchIds)
          }
        }
      }
    }
    
    const durationMs = Date.now() - startTime
    const status = errors.length > 0 ? 'partial' : 'success'
    
    // Log sync result
    await serviceSupabase
      .from('meta_audience_sync_logs')
      .insert({
        audience_id: audienceId,
        contacts_added: addedCount,
        contacts_removed: removedCount,
        contacts_total: currentContactIds.size,
        errors: errors,
        status: status,
        duration_ms: durationMs,
      })
    
    // Update audience status and size
    await serviceSupabase
      .from('meta_ad_audiences')
      .update({
        status: errors.length > 0 ? 'error' : 'active',
        estimated_size: currentContactIds.size,
        last_sync_at: new Date().toISOString(),
        error_message: errors.length > 0 ? JSON.stringify(errors[0].error) : null,
      })
      .eq('id', audienceId)
    
    return {
      success: true,
      added: addedCount,
      removed: removedCount,
      total: currentContactIds.size,
      errors: errors.length,
      durationMs,
    }
    
  } catch (error: any) {
    console.error('Sync error:', error)
    
    // Update status to error
    await serviceSupabase
      .from('meta_ad_audiences')
      .update({
        status: 'error',
        error_message: error.message,
      })
      .eq('id', audienceId)
    
    // Log failed sync
    await serviceSupabase
      .from('meta_audience_sync_logs')
      .insert({
        audience_id: audienceId,
        contacts_added: 0,
        contacts_removed: 0,
        contacts_total: 0,
        errors: [{ message: error.message }],
        status: 'failed',
        duration_ms: Date.now() - startTime,
      })
    
    throw error
  }
}

// Delete an audience from Meta and database
async function deleteAudience(
  supabase: any,
  serviceSupabase: any,
  audienceId: string
) {
  console.log('Deleting audience:', audienceId)
  
  // Get audience details
  const { data: audience, error: audienceError } = await supabase
    .from('meta_ad_audiences')
    .select('*')
    .eq('id', audienceId)
    .single()
  
  if (audienceError || !audience) {
    throw new Error('Público não encontrado')
  }
  
  // Get Meta credentials
  const { data: credentials } = await supabase
    .from('meta_credentials')
    .select('access_token')
    .eq('project_id', audience.project_id)
    .maybeSingle()
  
  // Try to delete from Meta (if credentials exist and audience has meta_audience_id)
  if (credentials?.access_token && audience.meta_audience_id) {
    try {
      await fetch(
        `${GRAPH_API_BASE}/${audience.meta_audience_id}?access_token=${credentials.access_token}`,
        { method: 'DELETE' }
      )
    } catch (error) {
      console.error('Error deleting from Meta (continuing anyway):', error)
    }
  }
  
  // Delete from database (cascades to contacts and logs)
  const { error: deleteError } = await serviceSupabase
    .from('meta_ad_audiences')
    .delete()
    .eq('id', audienceId)
  
  if (deleteError) {
    throw new Error('Erro ao deletar público')
  }
  
  return { success: true }
}

// Create a Lookalike Audience
async function createLookalike(
  supabase: any,
  serviceSupabase: any,
  params: {
    sourceAudienceId: string
    name: string
    country: string
    percentage: number
  }
) {
  const { sourceAudienceId, name, country, percentage } = params
  
  console.log('Creating lookalike:', { sourceAudienceId, name, country, percentage })
  
  // Get source audience
  const { data: sourceAudience, error: audienceError } = await supabase
    .from('meta_ad_audiences')
    .select('*')
    .eq('id', sourceAudienceId)
    .single()
  
  if (audienceError || !sourceAudience) {
    throw new Error('Público de origem não encontrado')
  }
  
  if (!sourceAudience.meta_audience_id) {
    throw new Error('Público de origem não está sincronizado com o Meta')
  }
  
  if ((sourceAudience.estimated_size || 0) < 100) {
    throw new Error('Público de origem precisa ter pelo menos 100 contatos para criar um Lookalike')
  }
  
  // Get Meta credentials
  const { data: credentials, error: credError } = await supabase
    .from('meta_credentials')
    .select('access_token, expires_at')
    .eq('project_id', sourceAudience.project_id)
    .maybeSingle()
  
  if (credError || !credentials) {
    throw new Error('Meta não conectado')
  }
  
  if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
    throw new Error('Token Meta expirado. Reconecte sua conta.')
  }
  
  // Create Lookalike on Meta
  const createUrl = `${GRAPH_API_BASE}/act_${sourceAudience.ad_account_id}/customaudiences`
  
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: credentials.access_token,
      name: name,
      subtype: 'LOOKALIKE',
      origin_audience_id: sourceAudience.meta_audience_id,
      lookalike_spec: JSON.stringify({
        type: 'similarity',
        country: country,
        ratio: percentage / 100,
      }),
    }),
  })
  
  const metaResult = await response.json()
  
  if (metaResult.error) {
    console.error('Meta API error:', metaResult.error)
    throw new Error(metaResult.error.message || 'Erro ao criar público semelhante no Meta')
  }
  
  console.log('Lookalike created:', metaResult)
  
  // Save to database
  const { data: lookalike, error: insertError } = await serviceSupabase
    .from('meta_lookalike_audiences')
    .insert({
      source_audience_id: sourceAudienceId,
      meta_lookalike_id: metaResult.id,
      name: name,
      country: country,
      percentage: percentage,
      status: 'active',
    })
    .select()
    .single()
  
  if (insertError) {
    console.error('Error saving lookalike:', insertError)
    throw new Error('Erro ao salvar público semelhante')
  }
  
  return { success: true, lookalike }
}

// Handle scheduled sync (called by pg_cron)
async function handleScheduledSync(
  serviceSupabase: any,
  frequency: '6h' | '24h'
) {
  console.log('Running scheduled sync for frequency:', frequency)
  
  // Get all active audiences with matching frequency
  const { data: audiences, error } = await serviceSupabase
    .from('meta_ad_audiences')
    .select('id, project_id')
    .eq('sync_frequency', frequency)
    .in('status', ['active', 'error']) // Also retry errored ones
  
  if (error) {
    console.error('Error getting audiences for scheduled sync:', error)
    return { success: false, error: error.message }
  }
  
  console.log(`Found ${audiences?.length || 0} audiences to sync`)
  
  const results: any[] = []
  
  for (const audience of audiences || []) {
    try {
      // Get audience with full details
      const { data: fullAudience } = await serviceSupabase
        .from('meta_ad_audiences')
        .select('*')
        .eq('id', audience.id)
        .single()
      
      // Get credentials
      const { data: credentials } = await serviceSupabase
        .from('meta_credentials')
        .select('access_token, expires_at')
        .eq('project_id', audience.project_id)
        .maybeSingle()
      
      if (!credentials || (credentials.expires_at && new Date(credentials.expires_at) < new Date())) {
        console.log(`Skipping audience ${audience.id}: no valid credentials`)
        results.push({ id: audience.id, skipped: true, reason: 'no_credentials' })
        continue
      }
      
      const syncResult = await syncAudienceInternal(serviceSupabase, fullAudience, credentials.access_token)
      results.push({ id: audience.id, ...syncResult })
      
      // Small delay between audiences
      await delay(1000)
      
    } catch (error: any) {
      console.error(`Error syncing audience ${audience.id}:`, error)
      results.push({ id: audience.id, error: error.message })
    }
  }
  
  return { 
    success: true, 
    synced: results.filter(r => r.success).length,
    failed: results.filter(r => r.error).length,
    skipped: results.filter(r => r.skipped).length,
    results 
  }
}
