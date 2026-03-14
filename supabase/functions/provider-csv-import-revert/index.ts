// supabase/functions/provider-csv-import-revert/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Extrair user_id do JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { batch_id, project_id } = await req.json();

    if (!batch_id || !project_id) {
      return new Response(JSON.stringify({ error: 'batch_id e project_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que o usuário tem role owner ou manager no projeto
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwnerOrManager = member?.role === 'owner' || member?.role === 'manager';
    const isSuperAdmin = !member && await checkSuperAdmin(supabase, user.id);

    if (!isOwnerOrManager && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Permissão insuficiente. Apenas owner ou manager podem reverter importações.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Executar revert atômico via função SQL SECURITY DEFINER
    const { data, error: revertError } = await supabase.rpc('revert_csv_import_batch', {
      p_batch_id: batch_id,
      p_project_id: project_id,
    });

    if (revertError) {
      if (revertError.message.includes('batch_not_found_or_not_active')) {
        return new Response(JSON.stringify({ error: 'Batch não encontrado ou não está no estado "active".' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw revertError;
    }

    console.log(`[Revert] Batch ${batch_id} revertido:`, data);

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();
  return data?.is_super_admin === true;
}
