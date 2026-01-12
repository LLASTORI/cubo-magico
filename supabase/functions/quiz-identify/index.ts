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

interface IdentityFieldConfig {
  enabled: boolean;
  required: boolean;
}

interface IdentitySettings {
  fields: {
    name: IdentityFieldConfig;
    email: IdentityFieldConfig;
    phone: IdentityFieldConfig;
    instagram: IdentityFieldConfig;
  };
  primary_identity_field: 'email' | 'phone';
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

    // Fetch quiz identity settings
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('identity_settings')
      .eq('id', session.quiz_id)
      .single();

    const identitySettings: IdentitySettings = quizData?.identity_settings || {
      fields: {
        name: { enabled: true, required: false },
        email: { enabled: true, required: true },
        phone: { enabled: true, required: false },
        instagram: { enabled: false, required: false },
      },
      primary_identity_field: 'email',
    };

    const primaryField = identitySettings.primary_identity_field;
    console.log(`[quiz-identify] Primary identity field: ${primaryField}`);

    // Validate required fields based on identity settings
    const { fields } = identitySettings;
    if (fields.email.required && !contact_data.email?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (fields.phone.required && !contact_data.phone?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Telefone é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (fields.name.required && !contact_data.name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Nome é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (fields.instagram.required && !contact_data.instagram?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Instagram é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já tem contato vinculado, apenas atualizar os dados
    if (session.contact_id) {
      await supabase
        .from('crm_contacts')
        .update({
          name: contact_data.name || undefined,
          email: contact_data.email || undefined,
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

    // 2. Buscar ou criar contato based on primary identity field
    let contactId: string | null = null;
    let isNewContact = false;

    // Try to find existing contact by PRIMARY field first
    if (primaryField === 'email' && contact_data.email) {
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('project_id', session.project_id)
        .eq('email', contact_data.email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Update existing contact with new data
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
    } else if (primaryField === 'phone' && contact_data.phone) {
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('project_id', session.project_id)
        .eq('phone', contact_data.phone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Update existing contact with new data
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

    // If not found by primary, try secondary field
    if (!contactId) {
      const secondaryField = primaryField === 'email' ? 'phone' : 'email';
      const secondaryValue = secondaryField === 'email' ? contact_data.email : contact_data.phone;
      
      if (secondaryValue) {
        const { data: existingContact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('project_id', session.project_id)
          .eq(secondaryField, secondaryValue)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
          // Update existing contact
          await supabase
            .from('crm_contacts')
            .update({
              name: contact_data.name || undefined,
              email: contact_data.email || undefined,
              phone: contact_data.phone || undefined,
              instagram: contact_data.instagram || undefined,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', contactId);
        }
      }
    }

    // Se não encontrou contato, criar novo
    if (!contactId) {
      // Generate fallback email if not provided and primary is phone
      const emailValue = contact_data.email || 
        (primaryField === 'phone' ? `lead-${session_id.slice(0, 8)}@quiz.local` : null);
      
      const { data: newContact, error: contactError } = await supabase
        .from('crm_contacts')
        .insert({
          project_id: session.project_id,
          name: contact_data.name || null,
          email: emailValue,
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
