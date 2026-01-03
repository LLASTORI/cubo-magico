/**
 * Survey Webhook Edge Function (Multi-Tenant Seguro)
 * 
 * ENDPOINT PRINCIPAL (OBRIGATÓRIO):
 * POST /survey-webhook/:project_code/:survey_slug
 * 
 * Exemplo: POST /survey-webhook/cm_4f8k2d/pesquisa-nps
 * 
 * ENDPOINT LEGADO (DEPRECATED):
 * POST /survey-webhook (requer survey_id no payload)
 * 
 * ## Headers Obrigatórios:
 * - `x-api-key`: Chave API exclusiva da pesquisa
 * 
 * ## Payload:
 * ```json
 * {
 *   "email": "contato@email.com",
 *   "answers": {
 *     "question_id_ou_texto": "resposta"
 *   },
 *   "metadata": { "source": "typeform", ... }
 * }
 * ```
 * 
 * ## Segurança Multi-Tenant:
 * 1. Projeto resolvido EXCLUSIVAMENTE via project_code
 * 2. Pesquisa resolvida via project_id + slug + status=active
 * 3. API key valida o contexto (nunca o substitui)
 * 4. Ambiguidade = erro seguro (sem exposição)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface WebhookPayload {
  email: string;
  answers: Record<string, any>;
  metadata?: Record<string, any>;
  survey_id?: string; // Apenas para endpoint legado
}

// Resolve projeto e pesquisa de forma segura e determinística
async function resolveProjectAndSurvey(
  supabase: any,
  projectCode: string,
  surveySlug: string
): Promise<{ project: any; survey: any } | null> {
  // 1. Resolver projeto via public_code
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, public_code')
    .eq('public_code', projectCode)
    .single();

  if (projectError || !project) {
    console.error(`Project not found for code: ${projectCode}`);
    return null;
  }

  // 2. Resolver pesquisa via project_id + slug + active
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select(`
      id,
      name,
      slug,
      project_id,
      status,
      default_tags,
      default_funnel_id,
      survey_questions (*)
    `)
    .eq('project_id', project.id)
    .eq('slug', surveySlug)
    .eq('status', 'active')
    .single();

  if (surveyError || !survey) {
    console.error(`Survey not found for project ${project.id}, slug: ${surveySlug}`);
    return null;
  }

  return { project, survey };
}

// Valida que a API key pertence ao contexto correto
async function validateApiKey(
  supabase: any,
  apiKey: string,
  surveyId: string,
  projectId: string
): Promise<{ valid: boolean; webhookKey: any }> {
  const { data: webhookKey, error } = await supabase
    .from('survey_webhook_keys')
    .select('*')
    .eq('api_key', apiKey)
    .eq('survey_id', surveyId)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .single();

  if (error || !webhookKey) {
    return { valid: false, webhookKey: null };
  }

  return { valid: true, webhookKey };
}

// Processa o webhook após validação de contexto
async function processWebhook(
  supabase: any,
  project: any,
  survey: any,
  webhookKey: any,
  payload: WebhookPayload
) {
  const email = payload.email.toLowerCase().trim();
  const projectId = project.id;

  console.log(`[WEBHOOK] Processing survey ${survey.id} for email: ${email}`);

  // Build tags to apply
  const surveyDefaultTags: string[] = survey.default_tags || [];
  const webhookDefaultTags: string[] = webhookKey.default_tags || [];
  const autoTag = `pesquisa:${survey.name}`;
  
  // Get funnel name for tag if configured
  let funnelTag: string | null = null;
  let funnelName: string | null = null;
  if (survey.default_funnel_id) {
    const { data: funnel } = await supabase
      .from('funnels')
      .select('name')
      .eq('id', survey.default_funnel_id)
      .single();
    if (funnel) {
      funnelName = funnel.name;
      funnelTag = `funil:${funnel.name}`;
    }
  }

  // Find or create contact
  let { data: contact, error: contactError } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('project_id', projectId)
    .ilike('email', email)
    .maybeSingle();

  if (!contact) {
    const initialTags = [...surveyDefaultTags, ...webhookDefaultTags, autoTag];
    if (funnelTag) initialTags.push(funnelTag);
    
    const { data: newContact, error: createError } = await supabase
      .from('crm_contacts')
      .insert({
        project_id: projectId,
        email,
        source: 'survey_webhook',
        status: 'lead',
        tags: initialTags,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating contact:', createError);
      throw createError;
    }
    contact = newContact;
    console.log('[WEBHOOK] Created new contact:', contact.id);
  } else {
    // Update existing contact - merge tags
    const existingTags: string[] = contact.tags || [];
    const newTags = new Set(existingTags);
    
    surveyDefaultTags.forEach(tag => newTags.add(tag));
    webhookDefaultTags.forEach(tag => newTags.add(tag));
    newTags.add(autoTag);
    if (funnelTag) newTags.add(funnelTag);
    
    const mergedTags = Array.from(newTags);
    
    if (mergedTags.length !== existingTags.length || !mergedTags.every(t => existingTags.includes(t))) {
      await supabase
        .from('crm_contacts')
        .update({ 
          tags: mergedTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);
      
      contact.tags = mergedTags;
    }
  }

  // Create interaction if funnel configured
  if (survey.default_funnel_id) {
    await supabase
      .from('crm_contact_interactions')
      .insert({
        contact_id: contact.id,
        project_id: projectId,
        funnel_id: survey.default_funnel_id,
        interaction_type: 'survey_response',
        page_name: survey.name,
        metadata: {
          survey_id: survey.id,
          survey_name: survey.name,
          funnel_name: funnelName,
          webhook_key_id: webhookKey.id,
          webhook_key_name: webhookKey.name,
        },
        ...(payload.metadata?.utm_source && { utm_source: payload.metadata.utm_source }),
        ...(payload.metadata?.utm_campaign && { utm_campaign: payload.metadata.utm_campaign }),
        ...(payload.metadata?.utm_medium && { utm_medium: payload.metadata.utm_medium }),
      });
  }

  // Process answers
  const mappings = webhookKey.field_mappings || {};
  const processedAnswers: Record<string, any> = {};
  const questions = survey.survey_questions || [];

  for (const [payloadKey, value] of Object.entries(payload.answers)) {
    const mappedQuestionId = mappings[payloadKey];
    if (mappedQuestionId) {
      const question = questions.find((q: any) => q.id === mappedQuestionId);
      if (question) {
        processedAnswers[question.id] = {
          value,
          question_text: question.question_text,
          question_type: question.question_type,
        };
      }
    } else {
      const question = questions.find((q: any) => 
        q.id === payloadKey || 
        q.question_text.toLowerCase() === payloadKey.toLowerCase()
      );
      if (question) {
        processedAnswers[question.id] = {
          value,
          question_text: question.question_text,
          question_type: question.question_type,
        };
      } else {
        processedAnswers[payloadKey] = { value, unmapped: true };
      }
    }
  }

  // Check for existing response
  const { data: existingResponse } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', survey.id)
    .eq('contact_id', contact.id)
    .maybeSingle();

  let response;

  if (existingResponse) {
    const previousVersions = existingResponse.metadata?.previous_versions || [];
    previousVersions.push({
      answers: existingResponse.answers,
      submitted_at: existingResponse.submitted_at,
      updated_at: existingResponse.updated_at,
    });

    const { data: updatedResponse, error: updateError } = await supabase
      .from('survey_responses')
      .update({
        answers: processedAnswers,
        metadata: {
          ...payload.metadata,
          webhook_key_id: webhookKey.id,
          webhook_key_name: webhookKey.name,
          previous_versions: previousVersions,
          times_responded: previousVersions.length + 1,
        },
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingResponse.id)
      .select()
      .single();

    if (updateError) throw updateError;
    response = updatedResponse;
  } else {
    const { data: newResponse, error: responseError } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: survey.id,
        project_id: projectId,
        contact_id: contact.id,
        email,
        answers: processedAnswers,
        source: 'webhook',
        metadata: {
          ...payload.metadata,
          webhook_key_id: webhookKey.id,
          webhook_key_name: webhookKey.name,
          times_responded: 1,
        },
      })
      .select()
      .single();

    if (responseError) throw responseError;
    response = newResponse;
  }

  // Process identity fields
  const contactUpdates: Record<string, any> = {};
  const identityEvents: any[] = [];

  for (const question of questions) {
    if (question.question_type === 'identity_field' && question.identity_field_target) {
      const answer = processedAnswers[question.id];
      if (answer?.value) {
        const fieldName = question.identity_field_target;
        let fieldValue = String(answer.value).trim();
        
        if (fieldName === 'instagram' && fieldValue.startsWith('@')) {
          fieldValue = fieldValue.substring(1);
        }
        
        const previousValue = contact[fieldName];

        if (fieldValue && fieldValue !== previousValue) {
          contactUpdates[fieldName] = fieldValue;

          identityEvents.push({
            contact_id: contact.id,
            project_id: projectId,
            field_name: fieldName,
            field_value: fieldValue,
            previous_value: previousValue,
            source_type: 'survey',
            source_id: survey.id,
            source_name: survey.name,
            confidence_score: question.identity_confidence_weight || 1.0,
            is_declared: true,
            metadata: {
              question_id: question.id,
              question_text: question.question_text,
              response_id: response.id,
            },
          });
        }
      }
    }
  }

  // Update contact if needed
  if (Object.keys(contactUpdates).length > 0) {
    await supabase
      .from('crm_contacts')
      .update({
        ...contactUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id);
  }

  // Create identity events
  if (identityEvents.length > 0) {
    await supabase
      .from('contact_identity_events')
      .insert(identityEvents);
  }

  // Mark response as processed
  await supabase
    .from('survey_responses')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', response.id);

  // Update webhook usage stats
  await supabase
    .from('survey_webhook_keys')
    .update({
      usage_count: (webhookKey.usage_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', webhookKey.id);

  return {
    contact_id: contact.id,
    response_id: response.id,
    identity_fields_updated: Object.keys(contactUpdates).length,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required in x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL path to extract project_code and survey_slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Expected: /survey-webhook/:project_code/:survey_slug
    // pathParts: ['survey-webhook', 'cm_xxx', 'slug']
    
    let projectCode: string | null = null;
    let surveySlug: string | null = null;
    
    if (pathParts.length >= 3) {
      // New format: /survey-webhook/:project_code/:survey_slug
      projectCode = pathParts[1];
      surveySlug = pathParts[2];
    }

    // Parse payload
    const payload: WebhookPayload = await req.json();
    
    if (!payload.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ENDPOINT PRINCIPAL (com namespace) ==========
    if (projectCode && surveySlug) {
      console.log(`[WEBHOOK] New format - project_code: ${projectCode}, slug: ${surveySlug}`);

      // 1. Resolver projeto e pesquisa de forma determinística
      const resolved = await resolveProjectAndSurvey(supabase, projectCode, surveySlug);
      
      if (!resolved) {
        // Erro seguro: não expõe informações
        return new Response(
          JSON.stringify({ error: 'Resource not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { project, survey } = resolved;

      // 2. Validar API key no contexto correto
      const { valid, webhookKey } = await validateApiKey(
        supabase, 
        apiKey, 
        survey.id, 
        project.id
      );

      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key for this context' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Processar webhook
      const result = await processWebhook(supabase, project, survey, webhookKey, payload);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ENDPOINT LEGADO (DEPRECATED) ==========
    console.warn('[WEBHOOK] LEGACY endpoint used - this is deprecated');

    // Endpoint legado EXIGE survey_id no payload
    if (!payload.survey_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Legacy endpoint requires survey_id in payload. Please migrate to new endpoint format: POST /survey-webhook/:project_code/:survey_slug' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar webhook key e validar contexto via survey_id
    const { data: webhookKey, error: keyError } = await supabase
      .from('survey_webhook_keys')
      .select(`
        *,
        surveys (
          id,
          name,
          slug,
          project_id,
          status,
          default_tags,
          default_funnel_id,
          survey_questions (*)
        )
      `)
      .eq('api_key', apiKey)
      .eq('survey_id', payload.survey_id)
      .eq('is_active', true)
      .single();

    if (keyError || !webhookKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key or survey_id mismatch' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const survey = webhookKey.surveys;
    if (!survey || survey.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Survey is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, public_code')
      .eq('id', survey.project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar webhook
    const result = await processWebhook(supabase, project, survey, webhookKey, payload);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        warning: 'This endpoint is deprecated. Please migrate to: POST /survey-webhook/:project_code/:survey_slug'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
