/**
 * Survey Webhook Edge Function
 * 
 * Recebe respostas de pesquisas via webhook externo (Typeform, Google Forms, etc.)
 * 
 * ## Endpoint: POST /survey-webhook
 * 
 * ## Headers Obrigatórios:
 * - `x-api-key`: Chave API gerada na configuração do webhook
 * 
 * ## Payload:
 * ```json
 * {
 *   "email": "contato@email.com",
 *   "answers": {
 *     "question_id_ou_texto": "resposta",
 *     "outra_pergunta": "outra resposta"
 *   },
 *   "metadata": { "source": "typeform", ... }
 * }
 * ```
 * 
 * ## Fluxo:
 * 1. Valida API key e obtém configuração do webhook
 * 2. Encontra ou cria contato no CRM
 * 3. Mapeia respostas para perguntas da pesquisa
 * 4. Salva resposta na tabela survey_responses
 * 5. Processa perguntas de identidade (identity_field)
 * 6. Atualiza dados do contato e cria eventos de identidade
 * 
 * ## Resposta de Sucesso:
 * ```json
 * {
 *   "success": true,
 *   "contact_id": "uuid",
 *   "response_id": "uuid",
 *   "identity_fields_updated": 2
 * }
 * ```
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

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required in x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and get webhook config
    const { data: webhookKey, error: keyError } = await supabase
      .from('survey_webhook_keys')
      .select(`
        *,
        surveys (
          id,
          name,
          project_id,
          status,
          survey_questions (*)
        )
      `)
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !webhookKey) {
      console.error('Invalid API key:', keyError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
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

    // Parse payload
    const payload: WebhookPayload = await req.json();
    
    if (!payload.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = payload.email.toLowerCase().trim();
    const projectId = survey.project_id;

    console.log(`Processing webhook for survey ${survey.id}, email: ${email}`);

    // Find or create contact
    let { data: contact, error: contactError } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('project_id', projectId)
      .ilike('email', email)
      .maybeSingle();

    if (!contact) {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('crm_contacts')
        .insert({
          project_id: projectId,
          email,
          source: 'survey_webhook',
          status: 'lead',
          tags: webhookKey.default_tags || [],
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

    // Apply field mappings if any
    const mappings = webhookKey.field_mappings || {};
    const processedAnswers: Record<string, any> = {};
    const questions = survey.survey_questions || [];

    for (const [payloadKey, value] of Object.entries(payload.answers)) {
      // Check if there's a mapping
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
        // Try to match by question text or ID
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
          // Store as unmapped
          processedAnswers[payloadKey] = { value, unmapped: true };
        }
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

          // Only update if value is different
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
      const { error: updateError } = await supabase
        .from('crm_contacts')
        .update({
          ...contactUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);

      if (updateError) {
        console.error('Error updating contact:', updateError);
      }
    }

    // Create identity events
    if (identityEvents.length > 0) {
      const { error: eventsError } = await supabase
        .from('contact_identity_events')
        .insert(identityEvents);

      if (eventsError) {
        console.error('Error creating identity events:', eventsError);
      }
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

    console.log('Webhook processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contact.id,
        response_id: response.id,
        identity_fields_updated: Object.keys(contactUpdates).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
