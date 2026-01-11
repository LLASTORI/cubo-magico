import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnswerQuizRequest {
  session_id: string;
  question_id: string;
  option_id?: string;
  option_ids?: string[]; // Para múltipla escolha
  answer_text?: string;
  answer_value?: number;
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

    const { 
      session_id, 
      question_id, 
      option_id, 
      option_ids,
      answer_text, 
      answer_value 
    } = await req.json() as AnswerQuizRequest;

    if (!session_id || !question_id) {
      return new Response(
        JSON.stringify({ error: 'session_id e question_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-answer] Resposta para sessão ${session_id}, pergunta ${question_id}`);

    // 1. Verificar se a sessão existe e está ativa
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, project_id, status')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('[quiz-public-answer] Sessão não encontrada:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'completed' || session.status === 'abandoned') {
      return new Response(
        JSON.stringify({ error: 'Sessão já finalizada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se a pergunta pertence ao quiz
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, type')
      .eq('id', question_id)
      .eq('quiz_id', session.quiz_id)
      .single();

    if (questionError || !question) {
      console.error('[quiz-public-answer] Pergunta não encontrada:', questionError);
      return new Response(
        JSON.stringify({ error: 'Pergunta não encontrada neste quiz' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Atualizar status da sessão para in_progress
    if (session.status === 'started') {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'in_progress' })
        .eq('id', session_id);
    }

    // 4. Inserir resposta(s)
    // Deletar respostas anteriores para esta pergunta (permite corrigir)
    await supabase
      .from('quiz_answers')
      .delete()
      .eq('session_id', session_id)
      .eq('question_id', question_id);

    // Para múltipla escolha, inserir uma resposta para cada opção selecionada
    const answersToInsert = [];
    
    if (question.type === 'multiple_choice' && option_ids && option_ids.length > 0) {
      for (const optId of option_ids) {
        answersToInsert.push({
          session_id,
          question_id,
          option_id: optId,
          answer_text: null,
          answer_value: null,
        });
      }
    } else {
      answersToInsert.push({
        session_id,
        question_id,
        option_id: option_id || null,
        answer_text: answer_text || null,
        answer_value: answer_value ?? null,
      });
    }

    const { data: answers, error: answerError } = await supabase
      .from('quiz_answers')
      .insert(answersToInsert)
      .select('id');

    if (answerError) {
      console.error('[quiz-public-answer] Erro ao salvar resposta:', answerError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar resposta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Calcular progresso
    const { count: totalQuestions } = await supabase
      .from('quiz_questions')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', session.quiz_id);

    const { count: answeredQuestions } = await supabase
      .from('quiz_answers')
      .select('question_id', { count: 'exact', head: true })
      .eq('session_id', session_id);

    // Contar perguntas únicas respondidas (pois múltipla escolha pode ter várias respostas)
    const { data: uniqueAnswered } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .eq('session_id', session_id);
    
    const uniqueQuestionIds = new Set((uniqueAnswered || []).map((a: any) => a.question_id));
    const progress = totalQuestions ? (uniqueQuestionIds.size / totalQuestions) * 100 : 0;

    // 6. Registrar evento de resposta
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        event_name: 'question_answered',
        payload: {
          question_id,
          question_type: question.type,
          option_id: option_id || null,
          option_ids: option_ids || null,
          progress: Math.round(progress),
        },
      });

    console.log(`[quiz-public-answer] Resposta salva. Progresso: ${Math.round(progress)}%`);

    return new Response(
      JSON.stringify({
        success: true,
        answers_saved: answers?.length || 0,
        progress: Math.round(progress),
        answered_questions: uniqueQuestionIds.size,
        total_questions: totalQuestions || 0,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-public-answer] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
