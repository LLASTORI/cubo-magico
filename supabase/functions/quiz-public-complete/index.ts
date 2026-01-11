import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteQuizRequest {
  session_id: string;
  contact_data?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, contact_data } = await req.json() as CompleteQuizRequest;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-complete] Finalizando sessão ${session_id}`);

    // 1. Verificar se a sessão existe
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, project_id, status, contact_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('[quiz-public-complete] Sessão não encontrada:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'completed') {
      // Retornar resultado existente se já completou
      const { data: existingResult } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('session_id', session_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          already_completed: true,
          result: existingResult,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Buscar todas as respostas e calcular scores
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select(`
        id,
        question_id,
        option_id,
        answer_text,
        answer_value,
        quiz_options (
          id,
          weight,
          traits_vector,
          intent_vector
        )
      `)
      .eq('session_id', session_id);

    if (answersError) {
      console.error('[quiz-public-complete] Erro ao buscar respostas:', answersError);
    }

    // 3. Calcular vetores de traits e intent agregados
    const traitsVector: Record<string, number> = {};
    const intentVector: Record<string, number> = {};
    const rawScore: Record<string, any> = {
      total_answers: answers?.length || 0,
      option_weights: [],
    };

    for (const answer of (answers || [])) {
      const option = answer.quiz_options as any;
      if (option) {
        // Acumular peso
        if (option.weight) {
          rawScore.option_weights.push(option.weight);
        }

        // Acumular traits
        if (option.traits_vector && typeof option.traits_vector === 'object') {
          for (const [trait, value] of Object.entries(option.traits_vector)) {
            if (typeof value === 'number') {
              traitsVector[trait] = (traitsVector[trait] || 0) + value;
            }
          }
        }

        // Acumular intents
        if (option.intent_vector && typeof option.intent_vector === 'object') {
          for (const [intent, value] of Object.entries(option.intent_vector)) {
            if (typeof value === 'number') {
              intentVector[intent] = (intentVector[intent] || 0) + value;
            }
          }
        }
      }
    }

    // 4. Normalizar scores (0-1)
    const normalizedScore: Record<string, any> = {
      traits: {},
      intents: {},
    };

    // Normalizar traits
    const maxTrait = Math.max(...Object.values(traitsVector), 1);
    for (const [trait, value] of Object.entries(traitsVector)) {
      normalizedScore.traits[trait] = Math.round((value / maxTrait) * 100) / 100;
    }

    // Normalizar intents
    const maxIntent = Math.max(...Object.values(intentVector), 1);
    for (const [intent, value] of Object.entries(intentVector)) {
      normalizedScore.intents[intent] = Math.round((value / maxIntent) * 100) / 100;
    }

    // 5. Criar/atualizar contato se dados foram fornecidos
    let contactId = session.contact_id;
    
    if (contact_data && (contact_data.email || contact_data.phone)) {
      // Buscar contato existente por email ou criar novo
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('project_id', session.project_id)
        .eq('email', contact_data.email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Atualizar contato com dados do quiz
        await supabase
          .from('crm_contacts')
          .update({
            name: contact_data.name || undefined,
            phone: contact_data.phone || undefined,
          })
          .eq('id', contactId);
      } else {
        // Criar novo contato
        const { data: newContact, error: contactError } = await supabase
          .from('crm_contacts')
          .insert({
            project_id: session.project_id,
            name: contact_data.name || 'Anônimo',
            email: contact_data.email,
            phone: contact_data.phone,
            source: 'quiz',
          })
          .select('id')
          .single();

        if (!contactError && newContact) {
          contactId = newContact.id;
        }
      }

      // Atualizar sessão com contact_id
      if (contactId && contactId !== session.contact_id) {
        await supabase
          .from('quiz_sessions')
          .update({ contact_id: contactId })
          .eq('id', session_id);
      }
    }

    // 6. Criar resultado
    const { data: result, error: resultError } = await supabase
      .from('quiz_results')
      .insert({
        session_id: session_id,
        project_id: session.project_id,
        traits_vector: traitsVector,
        intent_vector: intentVector,
        raw_score: rawScore,
        normalized_score: normalizedScore,
        summary: null, // Será preenchido por IA futuramente
      })
      .select('id, traits_vector, intent_vector, normalized_score')
      .single();

    if (resultError) {
      console.error('[quiz-public-complete] Erro ao criar resultado:', resultError);
      return new Response(
        JSON.stringify({ error: 'Erro ao calcular resultado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Atualizar sessão para completed
    await supabase
      .from('quiz_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        contact_id: contactId,
      })
      .eq('id', session_id);

    // 8. Buscar configuração de tela final
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('end_screen_config')
      .eq('id', session.quiz_id)
      .single();

    // 9. Registrar evento de conclusão
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        contact_id: contactId,
        event_name: 'quiz_completed',
        payload: {
          quiz_id: session.quiz_id,
          total_answers: answers?.length || 0,
          has_contact: !!contactId,
          normalized_score: normalizedScore,
        },
      });

    console.log(`[quiz-public-complete] Sessão ${session_id} finalizada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          id: result.id,
          traits_vector: result.traits_vector,
          intent_vector: result.intent_vector,
          normalized_score: result.normalized_score,
        },
        end_screen_config: quiz?.end_screen_config || {},
        contact_id: contactId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-public-complete] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
