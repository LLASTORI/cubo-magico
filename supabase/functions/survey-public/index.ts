/**
 * Survey Public Edge Function
 * 
 * Serve pesquisas públicas e recebe respostas via link público.
 * 
 * ## Endpoints:
 * 
 * ### GET /survey-public?slug=minha-pesquisa
 * Retorna a pesquisa e suas perguntas para renderização pública.
 * 
 * ### POST /survey-public
 * Submete uma resposta de pesquisa.
 * 
 * ## Payload POST:
 * ```json
 * {
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
 * 1. Valida slug e status da pesquisa
 * 2. Encontra ou cria contato no CRM
 * 3. Salva resposta na tabela survey_responses
 * 4. Processa perguntas de identidade (identity_field)
 * 5. Atualiza dados do contato e cria eventos de identidade
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
  slug: string;
  email: string;
  answers: Record<string, any>;
  metadata?: Record<string, any>;
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

    // Handle GET - fetch survey by slug
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const slug = url.searchParams.get('slug');

      if (!slug) {
        return new Response(
          JSON.stringify({ error: 'Slug parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: survey, error } = await supabase
        .from('surveys')
        .select(`
          id,
          name,
          description,
          settings,
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
        .eq('status', 'active')
        .single();

      if (error || !survey) {
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

      // Get survey
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_questions (*)
        `)
        .eq('slug', payload.slug)
        .eq('status', 'active')
        .single();

      if (surveyError || !survey) {
        return new Response(
          JSON.stringify({ error: 'Survey not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const projectId = survey.project_id;
      console.log(`Processing public response for survey ${survey.id}, email: ${email}`);

      // Find or create contact
      let { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('project_id', projectId)
        .ilike('email', email)
        .maybeSingle();

      if (!contact) {
        const { data: newContact, error: createError } = await supabase
          .from('crm_contacts')
          .insert({
            project_id: projectId,
            email,
            source: 'survey_public',
            status: 'lead',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating contact:', createError);
          throw createError;
        }
        contact = newContact;
        console.log('Created new contact:', contact.id);
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
            const fieldValue = String(answer.value).trim();
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
