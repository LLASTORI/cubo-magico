import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('Missing Evolution API configuration');
      throw new Error('Evolution API não configurada');
    }

    // Ensure URL has protocol
    if (!EVOLUTION_API_URL.startsWith('http://') && !EVOLUTION_API_URL.startsWith('https://')) {
      EVOLUTION_API_URL = `https://${EVOLUTION_API_URL}`;
    }

    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { action, ...params } = await req.json();
    console.log(`Evolution API action: ${action}`, params);

    let result;

    switch (action) {
      case 'create_instance': {
        const { instanceName, projectId, phoneNumber } = params;
        
        // Create instance on Evolution API
        const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao criar instância: ${response.status}`);
        }

        result = await response.json();
        console.log('Instance created:', result);

        // Save instance to database
        const { error: dbError } = await supabaseClient
          .from('whatsapp_instances')
          .upsert({
            whatsapp_number_id: params.whatsappNumberId,
            instance_name: instanceName,
            instance_key: result.instance?.instanceId || result.hash?.apikey,
            api_url: EVOLUTION_API_URL,
            status: 'qr_pending',
            qr_code: result.qrcode?.base64 || null,
            qr_expires_at: result.qrcode ? new Date(Date.now() + 60000).toISOString() : null,
          }, {
            onConflict: 'whatsapp_number_id',
          });

        if (dbError) {
          console.error('Database error:', dbError);
        }

        break;
      }

      case 'get_qrcode': {
        const { instanceName } = params;

        const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao obter QR Code: ${response.status}`);
        }

        result = await response.json();
        console.log('QR Code fetched');
        break;
      }

      case 'get_status': {
        const { instanceName } = params;

        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao obter status: ${response.status}`);
        }

        result = await response.json();
        console.log('Status fetched:', result);
        break;
      }

      case 'disconnect': {
        const { instanceName } = params;

        const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao desconectar: ${response.status}`);
        }

        result = await response.json();
        console.log('Instance disconnected');
        break;
      }

      case 'delete_instance': {
        const { instanceName } = params;

        const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao deletar instância: ${response.status}`);
        }

        result = await response.json();
        console.log('Instance deleted');
        break;
      }

      case 'send_message': {
        const { instanceName, number, text } = params;

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number,
            text,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao enviar mensagem: ${response.status}`);
        }

        result = await response.json();
        console.log('Message sent');
        break;
      }

      case 'fetch_instances': {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao buscar instâncias: ${response.status}`);
        }

        result = await response.json();
        console.log('Instances fetched:', result?.length || 0);
        break;
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Evolution API Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
