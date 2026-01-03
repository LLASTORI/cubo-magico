/**
 * Survey Public Edge Function
 * 
 * Serve pesquisas públicas e recebe respostas via link público.
 * 
 * ## ARQUITETURA MULTI-TENANT
 * 
 * As pesquisas são identificadas por project_code + slug para garantir
 * isolamento total entre projetos. O project_code é um identificador
 * público único do projeto no formato cm_XXXXXX.
 * 
 * ## Endpoints:
 * 
 * ### GET /survey-public?code=cm_abc123&slug=minha-pesquisa
 * Retorna a pesquisa e suas perguntas para renderização pública.
 * 
 * ### GET /survey-public?slug=minha-pesquisa (LEGADO)
 * Busca por slug apenas. Retorna erro se encontrar múltiplas pesquisas.
 * 
 * ### POST /survey-public
 * Submete uma resposta de pesquisa.
 * 
 * ## Payload POST:
 * ```json
 * {
 *   "code": "cm_abc123",
 *   "slug": "minha-pesquisa",
 *   "email": "contato@email.com",
 *   "answers": {
 *     "question_id": "resposta"
 *   },
 *   "metadata": { "utm_source": "instagram", ... }
 * }
 * ```
 * 
 * ## Fluxo de Submissão:
 * 1. Valida project_code + slug e status da pesquisa
 * 2. Encontra ou cria contato no CRM
 * 3. Aplica tags configuradas na pesquisa + tags automáticas
 * 4. Registra interação com funil (se configurado)
 * 5. Salva resposta na tabela survey_responses
 * 6. Processa perguntas de identidade (identity_field)
 * 7. Atualiza dados do contato e cria eventos de identidade
 * 
 * ## Resposta de Sucesso:
 * ```json
 * {
 *   "success": true,
 *   "contact_id": "uuid",
 *   "response_id": "uuid"
 * }
 * ```
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

interface SurveyResult {
  survey: any;
  projectId: string;
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

    // Handle GET - fetch survey by project_code + slug
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const slug = url.searchParams.get('slug');

      if (!slug) {
        console.log('[survey-public] GET missing slug parameter');
        return new Response(
          JSON.stringify({ error: 'Slug parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let projectId: string | null = null;

      // Fluxo principal: buscar por project_code + slug
      if (code) {
        console.log(`[survey-public] GET with code=${code}, slug=${slug}`);
        
        // Buscar projeto pelo public_code
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('public_code', code)
          .single();

        if (projectError || !project) {
          console.log(`[survey-public] Project not found for code: ${code}`);
          return new Response(
            JSON.stringify({ error: 'Project not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        projectId = project.id;

        // Buscar pesquisa pelo project_id + slug
        const { data: survey, error } = await supabase
          .from('surveys')
          .select(`
            id,
            name,
            description,
            settings,
            project_id,
            survey_questions (
              id,
              question_text,
              description,
              question_type,
              is_required,
              options,
              settings,
              position,
              identity_field_target,
              identity_confidence_weight
            )
          `)
          .eq('project_id', projectId)
          .eq('slug', slug)
          .eq('status', 'active')
          .single();

        if (error || !survey) {
          console.log(`[survey-public] Survey not found for project=${projectId}, slug=${slug}`);
          return new Response(
            JSON.stringify({ error: 'Survey not found or inactive' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sort questions by position
        survey.survey_questions.sort((a: any, b: any) => a.position - b.position);

        return new Response(
          JSON.stringify(survey),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fluxo legado: buscar apenas por slug (compatibilidade com URLs antigas)
      console.log(`[survey-public] LEGACY GET with slug only: ${slug}`);
      
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select(`
          id,
          name,
          description,
          settings,
          project_id,
          survey_questions (
            id,
            question_text,
            description,
            question_type,
            is_required,
            options,
            settings,
            position,
            identity_field_target,
            identity_confidence_weight
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active');

      if (error) {
        console.error('[survey-public] Error fetching surveys by slug:', error);
        return new Response(
          JSON.stringify({ error: 'Error fetching survey' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se não encontrou nenhuma pesquisa
      if (!surveys || surveys.length === 0) {
        console.log(`[survey-public] No survey found for slug: ${slug}`);
        return new Response(
          JSON.stringify({ error: 'Survey not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se encontrou mais de uma pesquisa com o mesmo slug (conflito entre projetos)
      if (surveys.length > 1) {
        console.log(`[survey-public] CONFLICT: Multiple surveys found for slug: ${slug} (count: ${surveys.length})`);
        
        // Buscar os project_codes para ajudar no redirecionamento
        const projectIds = surveys.map(s => s.project_id);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, public_code, name')
          .in('id', projectIds);

        return new Response(
          JSON.stringify({ 
            error: 'Multiple surveys found with this slug',
            code: 'AMBIGUOUS_SLUG',
            message: 'Este link de pesquisa é ambíguo. Por favor, use o link completo com o código do projeto.',
            projects: projects?.map(p => ({
              code: p.public_code,
              name: p.name,
            })),
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Encontrou exatamente uma pesquisa - retornar normalmente
      const survey = surveys[0];

      // Buscar project_code para incluir na resposta (facilita redirecionamento no frontend)
      const { data: project } = await supabase
        .from('projects')
        .select('public_code')
        .eq('id', survey.project_id)
        .single();

      survey.survey_questions.sort((a: any, b: any) => a.position - b.position);

      return new Response(
        JSON.stringify({
          ...survey,
          project_code: project?.public_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST - submit response
    if (req.method === 'POST') {
      const payload: SubmitPayload = await req.json();

      if (!payload.slug || !payload.email) {
        return new Response(
          JSON.stringify({ error: 'Slug and email are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const email = payload.email.toLowerCase().trim();
      let survey: any = null;
      let projectId: string | null = null;

      // Fluxo principal: buscar por project_code + slug
      if (payload.code) {
        console.log(`[survey-public] POST with code=${payload.code}, slug=${payload.slug}, email=${email}`);

        // Buscar projeto pelo public_code
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('public_code', payload.code)
          .single();

        if (projectError || !project) {
          console.log(`[survey-public] Project not found for code: ${payload.code}`);
          return new Response(
            JSON.stringify({ error: 'Project not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        projectId = project.id;

        // Buscar pesquisa com project_id + slug
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select(`
            *,
            survey_questions (*)
          `)
          .eq('project_id', projectId)
          .eq('slug', payload.slug)
          .eq('status', 'active')
          .single();

        if (surveyError || !surveyData) {
          console.log(`[survey-public] Survey not found for project=${projectId}, slug=${payload.slug}`);
          return new Response(
            JSON.stringify({ error: 'Survey not found or inactive' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        survey = surveyData;
      } else {
        // Fluxo legado: buscar apenas por slug
        console.log(`[survey-public] POST LEGACY with slug=${payload.slug}, email=${email}`);

        const { data: surveys, error: surveysError } = await supabase
          .from('surveys')
          .select(`
            *,
            survey_questions (*)
          `)
          .eq('slug', payload.slug)
          .eq('status', 'active');

        if (surveysError || !surveys || surveys.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Survey not found or inactive' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (surveys.length > 1) {
          console.log(`[survey-public] POST CONFLICT: Multiple surveys for slug: ${payload.slug}`);
          return new Response(
            JSON.stringify({ 
              error: 'Multiple surveys found with this slug',
              code: 'AMBIGUOUS_SLUG',
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        survey = surveys[0];
        projectId = survey.project_id;
      }

      console.log(`Processing public response for survey ${survey.id}, email: ${email}`);

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
          console.error('Error creating contact:', createError);
          throw createError;
        }
        contact = newContact;
        console.log('Created new contact:', contact.id);
      } else {
        // Update existing contact - merge tags without duplicates
        const existingTags: string[] = contact.tags || [];
        const newTags = new Set(existingTags);
        
        // Add survey default tags
        surveyDefaultTags.forEach(tag => newTags.add(tag));
        
        // Add auto tag
        newTags.add(autoTag);
        
        // Add funnel tag if configured
        if (funnelTag) newTags.add(funnelTag);
        
        const mergedTags = Array.from(newTags);
        
        // Update contact tags if changed
        if (mergedTags.length !== existingTags.length || !mergedTags.every(t => existingTags.includes(t))) {
          await supabase
            .from('crm_contacts')
            .update({ 
              tags: mergedTags,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
          
          contact.tags = mergedTags;
          console.log('Updated contact tags:', mergedTags);
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
        console.log('Created interaction for funnel:', survey.default_funnel_id);
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

      // Check if contact already responded to this survey (hybrid approach)
      const { data: existingResponse } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', survey.id)
        .eq('contact_id', contact.id)
        .maybeSingle();

      let response;

      if (existingResponse) {
        // Update existing response, preserving history in metadata
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
          console.error('Error updating response:', updateError);
          throw updateError;
        }
        response = updatedResponse;
        console.log(`Updated existing response ${response.id} (version ${previousVersions.length + 1})`);
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
          console.error('Error saving response:', responseError);
          throw responseError;
        }
        response = newResponse;
        console.log('Created new response:', response.id);
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

      console.log('Public response processed successfully');

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
    console.error('Survey public error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
