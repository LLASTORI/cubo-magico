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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/whatsapp-webhook` : '';

    // Evolution expects specific event enum values (UPPER_SNAKE_CASE)
    const webhookEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'];

    const setWebhookForInstance = async (instanceName: string) => {
      if (!webhookUrl) return;

      // Evolution API v2 expects the config inside a "webhook" property
      const webhookPayload = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
          webhookBase64: true,
          events: webhookEvents,
        },
      };

      const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Evolution API webhook error:', errorText);
        // Non-blocking: some Evolution versions may not support this endpoint
        console.warn('Webhook configuration failed, inbound messages may not work');
        return null;
      }

      try {
        return await response.json();
      } catch {
        return null;
      }
    };

    switch (action) {
      case 'create_instance': {
        const { instanceName } = params;

        const createBody: Record<string, unknown> = {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        };

        if (webhookUrl) {
          // Keep the same format used by /webhook/set for better compatibility
          createBody.webhook = {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: true,
            webhookBase64: true,
            events: webhookEvents,
          };
        }

        // Create instance on Evolution API
        const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify(createBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Evolution API error:', errorText);
          throw new Error(`Erro ao criar instância: ${response.status}`);
        }

        result = await response.json();
        console.log('Instance created:', result);

        // Best-effort: ensure webhook is configured for this instance (critical for inbound messages)
        try {
          await setWebhookForInstance(instanceName);
        } catch (e) {
          console.error('Webhook configuration failed (non-blocking):', e);
        }

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

      case 'configure_webhook': {
        const { instanceName } = params;

        // Never fail the whole call for webhook setup; return a warning instead.
        try {
          const response = await setWebhookForInstance(instanceName);
          result = { configured: Boolean(response), response };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('configure_webhook failed (non-blocking):', msg);
          result = { configured: false, error: msg };
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

        // Clean the phone number - remove @s.whatsapp.net suffix and any non-digits
        let cleanNumber = number.replace(/@.*$/, '').replace(/\D/g, '');
        
        console.log('Sending message to cleaned number:', cleanNumber);

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: cleanNumber,
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

      case 'get_profile_picture': {
        const { instanceName, number } = params;

        // Clean the phone number
        const cleanNumber = number.replace(/@.*$/, '').replace(/\D/g, '');

        try {
          const response = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({ number: cleanNumber }),
          });

          if (!response.ok) {
            console.log('Profile picture not available:', response.status);
            result = { profilePictureUrl: null };
            break;
          }

          const data = await response.json();
          result = { profilePictureUrl: data.profilePictureUrl || data.url || null };
        } catch (e) {
          console.log('Error fetching profile picture:', e);
          result = { profilePictureUrl: null };
        }
        break;
      }

      case 'sync_instance': {
        // Sync instance from Evolution API to database
        const { instanceName, whatsappNumberId } = params;

        // Check if instance exists in Evolution API
        const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (!statusResponse.ok) {
          throw new Error('Instância não encontrada na Evolution API');
        }

        const statusResult = await statusResponse.json();
        const state = statusResult.instance?.state || statusResult.state;
        const isConnected = state === 'open' || state === 'connected';

        if (isConnected) {
          // First check if instance already exists
          const { data: existingInstance } = await supabaseClient
            .from('whatsapp_instances')
            .select('id')
            .eq('whatsapp_number_id', whatsappNumberId)
            .maybeSingle();

          if (existingInstance) {
            // Update existing instance
            const { error: updateError } = await supabaseClient
              .from('whatsapp_instances')
              .update({
                instance_name: instanceName,
                api_url: EVOLUTION_API_URL,
                status: 'connected',
              })
              .eq('id', existingInstance.id);

            if (updateError) {
              console.error('Database update error on sync:', updateError);
              throw new Error('Erro ao atualizar instância no banco');
            }
          } else {
            // Insert new instance
            const { error: insertError } = await supabaseClient
              .from('whatsapp_instances')
              .insert({
                whatsapp_number_id: whatsappNumberId,
                instance_name: instanceName,
                api_url: EVOLUTION_API_URL,
                status: 'connected',
              });

            if (insertError) {
              console.error('Database insert error on sync:', insertError);
              throw new Error('Erro ao inserir instância no banco');
            }
          }

          result = { synced: true, status: 'connected' };
        } else {
          result = { synced: false, status: state };
        }
        
        console.log('Instance sync result:', result);
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
