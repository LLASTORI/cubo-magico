/**
 * Survey Public Edge Function
 * 
 * SEGURANÇA MULTI-TENANT OBRIGATÓRIA:
 * - Projetos são TOTALMENTE ISOLADOS
 * - NUNCA expor lista de projetos
 * - NUNCA permitir inferência de tenants
 * - Falhar com segurança quando houver ambiguidade
 * 
 * ## Endpoints:
 * 
 * ### GET /survey-public?code=cm_abc123&slug=minha-pesquisa
 * Retorna a pesquisa e suas perguntas para renderização pública.
 * Requer code (project_code) + slug para acesso determinístico.
 * 
 * ### GET /survey-public?slug=minha-pesquisa (LEGADO)
 * Busca por slug apenas. Redireciona se encontrar exatamente 1.
 * Retorna erro neutro se ambíguo - NUNCA expõe dados de projetos.
 * 
 * ### POST /survey-public
 * Submete uma resposta de pesquisa.
 * OBRIGATÓRIO: code + slug para isolamento multi-tenant.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitPayload {
  code?: string;
  slug: string;
  email: string;
  answers: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Resolve projeto + pesquisa de forma segura e determinística.
 * Retorna null se não encontrar ou se houver ambiguidade.
 */
async function resolveSurvey(
  supabase: any,
  code: string | null,
  slug: string
): Promise<{ survey: any; projectId: string; projectCode: string } | null> {
  
  // Fluxo principal: buscar por project_code + slug (determinístico)
  if (code) {
    console.log(`[survey-public] Resolving survey: code=${code}, slug=${slug}`);
    
    // Buscar projeto pelo public_code
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, public_code')
      .eq('public_code', code)
      .single();

    if (projectError || !project) {
      console.log(`[survey-public] Project not found for code: ${code}`);
      return null;
    }

    // Buscar pesquisa pelo project_id + slug + status
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        *,
        survey_questions (*)
      `)
      .eq('project_id', project.id)
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (surveyError || !survey) {
      console.log(`[survey-public] Survey not found: project=${project.id}, slug=${slug}`);
      return null;
    }

    return { survey, projectId: project.id, projectCode: project.public_code };
  }

  // Fluxo legado: buscar apenas por slug (apenas para redirecionamento)
  console.log(`[survey-public] LEGACY: Resolving by slug only: ${slug}`);
  
  const { data: surveys, error } = await supabase
    .from('surveys')
    .select(`
      id,
      project_id,
      slug,
      status
    `)
    .eq('slug', slug)
    .eq('status', 'active');

  if (error || !surveys || surveys.length === 0) {
    console.log(`[survey-public] LEGACY: No survey found for slug: ${slug}`);
    return null;
  }

  // Se encontrar mais de uma pesquisa = AMBÍGUO = falhar com segurança
  if (surveys.length > 1) {
    console.log(`[survey-public] LEGACY: AMBIGUOUS - Multiple surveys (${surveys.length}) for slug: ${slug}`);
    return null; // NUNCA expor informações sobre projetos
  }

  // Encontrou exatamente 1 - buscar dados completos + project_code para redirecionamento
  const survey = surveys[0];
  
  const { data: project } = await supabase
    .from('projects')
    .select('public_code')
    .eq('id', survey.project_id)
    .single();

  if (!project?.public_code) {
    console.log(`[survey-public] LEGACY: Project code not found for project: ${survey.project_id}`);
    return null;
  }

  // Buscar dados completos da pesquisa
  const { data: fullSurvey, error: fullError } = await supabase
    .from('surveys')
    .select(`
      *,
      survey_questions (*)
    `)
    .eq('id', survey.id)
    .eq('status', 'active')
    .single();

  if (fullError || !fullSurvey) {
    return null;
  }

  return { survey: fullSurvey, projectId: survey.project_id, projectCode: project.public_code };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========================================
    // GET - Fetch survey
    // ========================================
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const slug = url.searchParams.get('slug');

      if (!slug) {
        console.log('[survey-public] GET: Missing slug parameter');
        return new Response(
          JSON.stringify({ error: 'Slug parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await resolveSurvey(supabase, code, slug);

      if (!result) {
        // Mensagem neutra - NUNCA expor informações sobre projetos ou ambiguidade
        return new Response(
          JSON.stringify({ error: 'Survey not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { survey, projectCode } = result;

      // Sort questions by position
      if (survey.survey_questions) {
        survey.survey_questions.sort((a: any, b: any) => a.position - b.position);
      }

      // Incluir project_code apenas para facilitar redirecionamento no frontend legado
      return new Response(
        JSON.stringify({
          id: survey.id,
          name: survey.name,
          description: survey.description,
          settings: survey.settings,
          survey_questions: survey.survey_questions,
          project_code: projectCode, // Para redirecionamento legado
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // POST - Submit response
    // ========================================
    if (req.method === 'POST') {
      const payload: SubmitPayload = await req.json();

      if (!payload.slug || !payload.email) {
        return new Response(
          JSON.stringify({ error: 'Slug and email are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const email = payload.email.toLowerCase().trim();

      // SEGURANÇA: Resolver survey usando a mesma lógica centralizada
      const result = await resolveSurvey(supabase, payload.code || null, payload.slug);

      if (!result) {
        console.log(`[survey-public] POST: Survey not found or ambiguous`);
        return new Response(
          JSON.stringify({ error: 'Survey not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { survey, projectId } = result;

      console.log(`[survey-public] POST: Processing response for survey=${survey.id}, email=${email}`);

      // Build tags to apply
      const surveyDefaultTags: string[] = survey.default_tags || [];
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
      let { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('project_id', projectId)
        .ilike('email', email)
        .maybeSingle();

      if (!contact) {
        // Build initial tags for new contact
        const initialTags = [...surveyDefaultTags, autoTag];
        if (funnelTag) initialTags.push(funnelTag);
        
        const { data: newContact, error: createError } = await supabase
          .from('crm_contacts')
          .insert({
            project_id: projectId,
            email,
            source: 'survey_public',
            status: 'lead',
            tags: initialTags,
          })
          .select()
          .single();

        if (createError) {
          console.error('[survey-public] Error creating contact:', createError);
          throw createError;
        }
        contact = newContact;
        console.log('[survey-public] Created new contact:', contact.id);
      } else {
        // Update existing contact - merge tags without duplicates
        const existingTags: string[] = contact.tags || [];
        const newTags = new Set(existingTags);
        
        surveyDefaultTags.forEach(tag => newTags.add(tag));
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

      // Create interaction record if funnel is configured
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
            },
            ...(payload.metadata?.utm_source && { utm_source: payload.metadata.utm_source }),
            ...(payload.metadata?.utm_campaign && { utm_campaign: payload.metadata.utm_campaign }),
            ...(payload.metadata?.utm_medium && { utm_medium: payload.metadata.utm_medium }),
          });
      }

      // Process answers
      const questions = survey.survey_questions || [];
      const processedAnswers: Record<string, any> = {};

      for (const [questionId, value] of Object.entries(payload.answers)) {
        const question = questions.find((q: any) => q.id === questionId);
        if (question) {
          processedAnswers[questionId] = {
            value,
            question_text: question.question_text,
            question_type: question.question_type,
          };
        }
      }

      // Check if contact already responded to this survey
      const { data: existingResponse } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', survey.id)
        .eq('contact_id', contact.id)
        .maybeSingle();

      let response;

      if (existingResponse) {
        // Update existing response, preserving history
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
              previous_versions: previousVersions,
              times_responded: previousVersions.length + 1,
            },
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id)
          .select()
          .single();

        if (updateError) {
          console.error('[survey-public] Error updating response:', updateError);
          throw updateError;
        }
        response = updatedResponse;
      } else {
        // Create new response
        const { data: newResponse, error: responseError } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            project_id: projectId,
            contact_id: contact.id,
            email,
            answers: processedAnswers,
            source: 'public_link',
            metadata: {
              ...payload.metadata,
              times_responded: 1,
            },
          })
          .select()
          .single();

        if (responseError) {
          console.error('[survey-public] Error saving response:', responseError);
          throw responseError;
        }
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
            
            // Normalize Instagram: remove @ prefix if present
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

      // Update contact if there are changes
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

      console.log('[survey-public] Response processed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          contact_id: contact.id,
          response_id: response.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[survey-public] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
