import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentifyRequest {
  session_id: string;
  contact_data: {
    name?: string;
    email?: string;
    phone?: string;
    instagram?: string;
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

    const { session_id, contact_data } = await req.json() as IdentifyRequest;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contact_data?.email && !contact_data?.phone) {
      return new Response(
        JSON.stringify({ error: 'email ou phone são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-identify] Identificando lead na sessão ${session_id}`);

    // 1. Verificar se a sessão existe e está ativa
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, project_id, status, contact_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('[quiz-identify] Sessão não encontrada:', sessionError);
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
        JSON.stringify({ error: 'Sessão foi abandonada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já tem contato vinculado, apenas atualizar os dados
    if (session.contact_id) {
      await supabase
        .from('crm_contacts')
        .update({
          name: contact_data.name || undefined,
          phone: contact_data.phone || undefined,
          instagram: contact_data.instagram || undefined,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', session.contact_id);

      return new Response(
        JSON.stringify({
          session_id,
          contact_id: session.contact_id,
          message: 'Contato atualizado com sucesso',
          is_new_contact: false,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Buscar ou criar contato
    let contactId: string | null = null;
    let isNewContact = false;

    // Tentar encontrar contato existente por email
    if (contact_data.email) {
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('project_id', session.project_id)
        .eq('email', contact_data.email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Atualizar dados do contato existente
        await supabase
          .from('crm_contacts')
          .update({
            name: contact_data.name || undefined,
            phone: contact_data.phone || undefined,
            instagram: contact_data.instagram || undefined,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', contactId);
      }
    }

    // Se não encontrou por email, tentar por telefone
    if (!contactId && contact_data.phone) {
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('project_id', session.project_id)
        .eq('phone', contact_data.phone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Atualizar dados do contato existente
        await supabase
          .from('crm_contacts')
          .update({
            name: contact_data.name || undefined,
            email: contact_data.email || undefined,
            instagram: contact_data.instagram || undefined,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', contactId);
      }
    }

    // Se não encontrou contato, criar novo
    if (!contactId) {
      const { data: newContact, error: contactError } = await supabase
        .from('crm_contacts')
        .insert({
          project_id: session.project_id,
          name: contact_data.name || null,
          email: contact_data.email || `lead-${session_id.slice(0, 8)}@quiz.local`,
          phone: contact_data.phone || null,
          instagram: contact_data.instagram || null,
          source: 'quiz',
          tags: ['quiz'],
        })
        .select('id')
        .single();

      if (contactError) {
        console.error('[quiz-identify] Erro ao criar contato:', contactError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar dados do contato' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      contactId = newContact.id;
      isNewContact = true;
    }

    // 3. Vincular contato à sessão
    await supabase
      .from('quiz_sessions')
      .update({ contact_id: contactId })
      .eq('id', session_id);

    // 4. Registrar evento quiz_identified
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        contact_id: contactId,
        event_name: 'quiz_identified',
        payload: {
          quiz_id: session.quiz_id,
          is_new_contact: isNewContact,
          has_email: !!contact_data.email,
          has_phone: !!contact_data.phone,
          has_instagram: !!contact_data.instagram,
        },
      });

    console.log(`[quiz-identify] Lead identificado na sessão ${session_id}. Contact: ${contactId}`);

    return new Response(
      JSON.stringify({
        session_id,
        contact_id: contactId,
        message: isNewContact ? 'Novo contato criado com sucesso' : 'Contato vinculado com sucesso',
        is_new_contact: isNewContact,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-identify] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
