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

interface QuizQuestion {
  id: string;
  order_index: number;
  type: string;
  title: string;
  subtitle: string | null;
  is_required: boolean;
  config: Record<string, any> | null;
  quiz_options: Array<{
    id: string;
    label: string;
    value: string;
    order_index: number;
  }>;
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
      .select('id, quiz_id, project_id, status, contact_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('[quiz-public-answer] Sessão não encontrada:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar status da sessão
    if (session.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Quiz já foi finalizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'abandoned') {
      return new Response(
        JSON.stringify({ error: 'Sessão foi abandonada. Inicie um novo quiz.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se o quiz ainda está ativo
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, is_active, requires_identification')
      .eq('id', session.quiz_id)
      .single();

    if (quizError || !quiz || !quiz.is_active) {
      return new Response(
        JSON.stringify({ error: 'Quiz não está mais disponível' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar todas as perguntas do quiz para validação e navegação
    const { data: allQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        order_index,
        type,
        title,
        subtitle,
        is_required,
        config,
        quiz_options (
          id,
          label,
          value,
          order_index
        )
      `)
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true });

    if (questionsError || !allQuestions) {
      console.error('[quiz-public-answer] Erro ao buscar perguntas:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sortedQuestions: QuizQuestion[] = allQuestions.map(q => ({
      ...q,
      quiz_options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }));

    // 4. Encontrar a pergunta atual
    const currentQuestionIndex = sortedQuestions.findIndex(q => q.id === question_id);
    if (currentQuestionIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Pergunta não encontrada neste quiz' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentQuestion = sortedQuestions[currentQuestionIndex];

    // 5. Validar ordem linear (MVP)
    const { data: previousAnswers } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .eq('session_id', session_id);

    const answeredQuestionIds = new Set((previousAnswers || []).map((a: any) => a.question_id));
    
    // Verificar se todas as perguntas anteriores foram respondidas (exceto a atual)
    for (let i = 0; i < currentQuestionIndex; i++) {
      if (!answeredQuestionIds.has(sortedQuestions[i].id)) {
        return new Response(
          JSON.stringify({ 
            error: 'Responda as perguntas na ordem',
            expected_question_id: sortedQuestions[i].id 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6. Atualizar status da sessão para in_progress
    if (session.status === 'started') {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'in_progress' })
        .eq('id', session_id);
    }

    // 7. Deletar respostas anteriores para esta pergunta (permite corrigir)
    await supabase
      .from('quiz_answers')
      .delete()
      .eq('session_id', session_id)
      .eq('question_id', question_id);

    // 8. Inserir resposta(s)
    const answersToInsert = [];
    
    if (currentQuestion.type === 'multiple_choice' && option_ids && option_ids.length > 0) {
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

    const { data: savedAnswers, error: answerError } = await supabase
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

    // 9. Calcular progresso
    const totalQuestions = sortedQuestions.length;
    const answeredQuestions = answeredQuestionIds.size + 1; // +1 para a resposta atual
    const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100);

    // 10. Determinar próxima pergunta
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const nextQuestion = isLastQuestion ? null : sortedQuestions[currentQuestionIndex + 1];

    // 11. Registrar evento quiz_progress
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        contact_id: session.contact_id,
        event_name: 'quiz_progress',
        payload: {
          question_id,
          question_index: currentQuestionIndex,
          question_type: currentQuestion.type,
          option_id: option_id || null,
          option_ids: option_ids || null,
          progress_percentage: progressPercentage,
          answered_questions: answeredQuestions,
          total_questions: totalQuestions,
        },
      });

    console.log(`[quiz-public-answer] Resposta salva. Progresso: ${progressPercentage}%`);

    // 12. Retornar estrutura padronizada
    return new Response(
      JSON.stringify({
        session_id,
        current_question: nextQuestion || currentQuestion,
        progress: {
          answered_questions: answeredQuestions,
          total_questions: totalQuestions,
          progress_percentage: progressPercentage,
        },
        is_last_question: isLastQuestion,
        requires_identification: quiz.requires_identification && isLastQuestion,
        answers_saved: savedAnswers?.length || 0,
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
