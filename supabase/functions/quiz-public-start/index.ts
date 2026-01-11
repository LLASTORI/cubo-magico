import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartQuizRequest {
  quiz_id: string;
  utm_data?: Record<string, string>;
  contact_id?: string;
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

    const { quiz_id, utm_data, contact_id } = await req.json() as StartQuizRequest;

    if (!quiz_id) {
      return new Response(
        JSON.stringify({ error: 'quiz_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-start] Iniciando quiz ${quiz_id}`);

    // 1. Verificar se o quiz existe e está ativo
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, project_id, name, is_active, requires_identification, allow_anonymous, start_screen_config, end_screen_config')
      .eq('id', quiz_id)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      console.error('[quiz-public-start] Quiz não encontrado ou inativo:', quizError);
      return new Response(
        JSON.stringify({ error: 'Quiz não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Capturar user-agent e IP hash
    const userAgent = req.headers.get('user-agent') || '';
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Hash do IP para privacidade
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    // 3. Buscar perguntas do quiz (ordenadas)
    const { data: questions, error: questionsError } = await supabase
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
      .eq('quiz_id', quiz_id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('[quiz-public-start] Erro ao buscar perguntas:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sortedQuestions: QuizQuestion[] = (questions || []).map(q => ({
      ...q,
      quiz_options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }));

    const totalQuestions = sortedQuestions.length;

    if (totalQuestions === 0) {
      return new Response(
        JSON.stringify({ error: 'Quiz não possui perguntas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Criar sessão com status = started
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quiz.id,
        project_id: quiz.project_id,
        contact_id: contact_id || null,
        status: 'started',
        user_agent: userAgent,
        ip_hash: ipHash,
        utm_data: utm_data || {},
        started_at: new Date().toISOString(),
      })
      .select('id, status, started_at')
      .single();

    if (sessionError) {
      console.error('[quiz-public-start] Erro ao criar sessão:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao iniciar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Registrar evento quiz_started
    await supabase
      .from('quiz_events')
      .insert({
        project_id: quiz.project_id,
        session_id: session.id,
        contact_id: contact_id || null,
        event_name: 'quiz_started',
        payload: {
          quiz_id: quiz.id,
          quiz_name: quiz.name,
          utm_data: utm_data || {},
          total_questions: totalQuestions,
        },
      });

    console.log(`[quiz-public-start] Sessão ${session.id} criada com ${totalQuestions} perguntas`);

    // 6. Retornar estrutura padronizada
    const firstQuestion = sortedQuestions[0];

    return new Response(
      JSON.stringify({
        session_id: session.id,
        quiz: {
          id: quiz.id,
          name: quiz.name,
          requires_identification: quiz.requires_identification,
          allow_anonymous: quiz.allow_anonymous,
          start_screen_config: quiz.start_screen_config,
          end_screen_config: quiz.end_screen_config,
        },
        current_question: firstQuestion,
        progress: {
          answered_questions: 0,
          total_questions: totalQuestions,
          progress_percentage: 0,
        },
        is_last_question: totalQuestions === 1,
        requires_identification: quiz.requires_identification,
        questions: sortedQuestions, // Todas as perguntas para navegação
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-public-start] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
