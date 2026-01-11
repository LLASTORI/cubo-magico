import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout padrão em minutos
const DEFAULT_TIMEOUT_MINUTES = 30;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const timeoutMinutes = body.timeout_minutes || DEFAULT_TIMEOUT_MINUTES;
    const projectId = body.project_id; // Opcional: filtrar por projeto

    console.log(`[quiz-mark-abandoned] Verificando sessões com timeout de ${timeoutMinutes} minutos`);

    // Calcular data limite
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - timeoutMinutes);

    // Buscar sessões elegíveis para abandono
    // Status: started ou in_progress
    // Última atividade: antes do threshold
    let query = supabase
      .from('quiz_sessions')
      .select('id, quiz_id, project_id, status, contact_id, started_at')
      .in('status', ['started', 'in_progress'])
      .lt('started_at', timeoutThreshold.toISOString());

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: abandonedSessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('[quiz-mark-abandoned] Erro ao buscar sessões:', sessionsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar sessões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!abandonedSessions || abandonedSessions.length === 0) {
      console.log('[quiz-mark-abandoned] Nenhuma sessão para marcar como abandonada');
      return new Response(
        JSON.stringify({ 
          success: true,
          abandoned_count: 0,
          message: 'Nenhuma sessão abandonada encontrada'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar última resposta de cada sessão para determinar abandono real
    const sessionsToAbandon: typeof abandonedSessions = [];

    for (const session of abandonedSessions) {
      // Buscar última resposta da sessão
      const { data: lastAnswer } = await supabase
        .from('quiz_answers')
        .select('created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Se não tem resposta ou última resposta é antes do threshold, marcar como abandonado
      const lastActivity = lastAnswer?.created_at 
        ? new Date(lastAnswer.created_at) 
        : new Date(session.started_at);

      if (lastActivity < timeoutThreshold) {
        sessionsToAbandon.push(session);
      }
    }

    if (sessionsToAbandon.length === 0) {
      console.log('[quiz-mark-abandoned] Nenhuma sessão realmente abandonada');
      return new Response(
        JSON.stringify({ 
          success: true,
          abandoned_count: 0,
          message: 'Sessões ainda ativas'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Marcar sessões como abandonadas
    const sessionIds = sessionsToAbandon.map(s => s.id);
    
    const { error: updateError } = await supabase
      .from('quiz_sessions')
      .update({ status: 'abandoned' })
      .in('id', sessionIds);

    if (updateError) {
      console.error('[quiz-mark-abandoned] Erro ao atualizar sessões:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao marcar sessões como abandonadas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar eventos de abandono
    const abandonEvents = sessionsToAbandon.map(session => ({
      project_id: session.project_id,
      session_id: session.id,
      contact_id: session.contact_id,
      event_name: 'quiz_abandoned',
      payload: {
        quiz_id: session.quiz_id,
        timeout_minutes: timeoutMinutes,
        previous_status: session.status,
      },
    }));

    await supabase
      .from('quiz_events')
      .insert(abandonEvents);

    console.log(`[quiz-mark-abandoned] ${sessionsToAbandon.length} sessões marcadas como abandonadas`);

    return new Response(
      JSON.stringify({
        success: true,
        abandoned_count: sessionsToAbandon.length,
        session_ids: sessionIds,
        message: `${sessionsToAbandon.length} sessões marcadas como abandonadas`,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-mark-abandoned] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
